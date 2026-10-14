import { createHash } from "node:crypto";
import { CaptureError, isCaptureErrorCode } from "./errors";
import { isLocalRendererEnabled, launchBrowser, localChromePath } from "./local-browser";
import { renderPage, type RenderOptions, type RenderedPage } from "./render-page";
import { fromWire, MAX_RESPONSE_BYTES, MIN_SECRET_CHARS, PROTOCOL, signedHeaders, VIEWPORT, type RendererHealth } from "./renderer-protocol";
import { assertNotChallenge, assertNotLoginRedirect, checkHtmlResponse, fetchStylesheets, looksLikeLoginWall } from "./static-fetch";
import { assertFetchableUrl } from "./url-policy";
import { snapshotFromHtml } from "../snapshot/parse-html";
import type { DomSnapshot } from "../snapshot/types";

export interface RenderedCaptureOptions {
  signal?: AbortSignal;
  viewport?: { width: number; height: number };
  client?: string;
  timeoutMs?: number;
}

interface Remote {
  base: URL;
  secret: string;
}

const READY_FOR_MS = 2 * 60 * 60_000;
const DOWN_FOR_MS = 15_000;
const PAUSED_FOR_MS = 30 * 60_000;
const HEALTH_MS = 10_000;
const RENDER_MS = 40_000;
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

type Readiness = "ready" | "down" | "paused";
let tried: { until: number; setup: string; ready: Promise<boolean>; value?: boolean } | null = null;

function remoteRenderer(): Remote | null {
  const raw = process.env.SKYLINE_RENDERER_URL;
  const secret = process.env.SKYLINE_RENDERER_SECRET ?? "";
  if (!raw || secret.length < MIN_SECRET_CHARS) return null;
  try {
    const base = new URL(raw);
    if (base.username || base.password) return null;
    if (base.protocol !== "https:" && !(base.protocol === "http:" && LOOPBACK.has(base.hostname))) return null;
    return { base, secret };
  } catch {
    return null;
  }
}

const currentSetup = () => `${process.env.SKYLINE_RENDERER_URL ?? ""} ${createHash("sha256").update(process.env.SKYLINE_RENDERER_SECRET ?? "").digest("hex").slice(0, 12)} ${isLocalRendererEnabled()} ${localChromePath() ?? ""}`;

const knownDown = () => !!tried && tried.setup === currentSetup() && tried.value === false && Date.now() < tried.until;

function markDown(forMs = DOWN_FOR_MS): void {
  tried = { until: Date.now() + forMs, setup: currentSetup(), ready: Promise.resolve(false), value: false };
}

export function isRendererAvailable(): boolean {
  return (remoteRenderer() !== null || isLocalRendererEnabled()) && !knownDown();
}

/** Whether a rendered capture can run right now: the renderer is tried, not assumed from the configuration. */
export function rendererReady(): Promise<boolean> {
  const setup = currentSetup();
  const fresh = tried && tried.setup === setup && Date.now() < tried.until;
  if (!fresh) {
    const checking = tryRenderer();
    const attempt: NonNullable<typeof tried> = { until: Date.now() + READY_FOR_MS, setup, ready: checking.then((r) => r === "ready") };
    void checking.then((r) => {
      attempt.value = r === "ready";
      if (r !== "ready") attempt.until = Date.now() + (r === "paused" ? PAUSED_FOR_MS : DOWN_FOR_MS);
    });
    tried = attempt;
  }
  return tried!.ready;
}

async function tryRenderer(): Promise<Readiness> {
  try {
    const remote = remoteRenderer();
    if (remote) {
      const res = await fetch(new URL("/health", remote.base), { headers: signedHeaders(remote.secret, "GET", "/health", ""), signal: AbortSignal.timeout(HEALTH_MS), redirect: "error", cache: "no-store" });
      const health = JSON.parse(await readCapped(res, 8_192)) as RendererHealth;
      if (health.v !== PROTOCOL) return "down";
      if (health.paused) return "paused";
      return res.ok && health.ok === true ? "ready" : "down";
    }
    if (!isLocalRendererEnabled()) return "down";
    const browser = await launchBrowser({ noSandbox: !!process.env.CI });
    try {
      return (await browser.version()).length > 0 ? "ready" : "down";
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return "down";
  }
}

export async function captureRenderedPage(url: URL, opts: RenderedCaptureOptions = {}): Promise<DomSnapshot> {
  const remote = remoteRenderer();
  if (remote) return captureFromRenderer(remote, url, opts);
  if (isLocalRendererEnabled()) return captureWithLocalBrowser(url, opts);
  throw new CaptureError("renderer_unavailable");
}

async function captureFromRenderer(remote: Remote, url: URL, opts: RenderedCaptureOptions): Promise<DomSnapshot> {
  const rendered = await askRenderer(remote, url, opts);
  return snapshotFromRendered(url, rendered, await fetchStylesheets(rendered.stylesheets, opts.signal));
}

async function askRenderer(remote: Remote, url: URL, opts: RenderedCaptureOptions): Promise<RenderedPage> {
  const body = JSON.stringify({ url: url.toString(), viewport: opts.viewport ?? VIEWPORT, client: opts.client });
  const waitMs = Math.min(opts.timeoutMs ?? RENDER_MS, RENDER_MS);
  const unavailable = (why: string, down = true) => {
    console.error(`[renderer] ${why}`);
    if (down) markDown();
    return new CaptureError("renderer_unavailable", why);
  };

  let res: Response;
  let text: string;
  try {
    res = await fetch(new URL("/render", remote.base), {
      method: "POST",
      headers: { "content-type": "application/json", ...signedHeaders(remote.secret, "POST", "/render", body) },
      body,
      signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(waitMs)]) : AbortSignal.timeout(waitMs),
      redirect: "error",
      cache: "no-store",
    });
    text = await readCapped(res, MAX_RESPONSE_BYTES);
  } catch (err) {
    if (opts.signal?.aborted) throw new CaptureError("timeout", "rendered capture");
    if (err instanceof CaptureError) throw err;
    throw unavailable(err instanceof Error && err.name === "TimeoutError" ? "no answer in time" : "unreachable");
  }

  let payload: { v?: unknown; page?: unknown; error?: { code?: unknown; extra?: unknown } };
  try {
    payload = JSON.parse(text);
  } catch {
    throw unavailable(`unreadable answer (HTTP ${res.status})`);
  }
  if (!payload || typeof payload !== "object" || payload.v !== PROTOCOL) throw unavailable(`unexpected answer (HTTP ${res.status})`);

  if (!res.ok) {
    const code = payload.error?.code;
    if (code === "busy") throw new CaptureError("renderer_busy");
    if (code === "paused") {
      console.error("[renderer] paused by its usage limit");
      markDown(PAUSED_FOR_MS);
      throw new CaptureError("renderer_paused");
    }
    if (code === "internal") throw new CaptureError("internal");
    if (code === "bad_request") throw unavailable(`refused this request (HTTP ${res.status})`, false);
    if (!isCaptureErrorCode(code) || code === "renderer_unavailable" || code === "renderer_busy") throw unavailable(`refused (HTTP ${res.status}, ${String(code).slice(0, 40)})`);
    const extra = typeof payload.error?.extra === "string" ? payload.error.extra.replace(/[^\x20-\x7e]/g, "").slice(0, 80) : undefined;
    throw new CaptureError(code, extra || undefined);
  }

  const page = fromWire(payload.page);
  if (!page) throw unavailable("malformed page");
  try {
    assertFetchableUrl(new URL(page.finalUrl));
  } catch {
    throw unavailable("malformed final address");
  }
  return page;
}

async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new CaptureError("too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function captureWithLocalBrowser(url: URL, opts: RenderedCaptureOptions & Pick<RenderOptions, "intercept" | "noSandbox" | "images" | "measure"> = {}): Promise<DomSnapshot> {
  const rendered = await renderPage(url, { ...opts, measure: opts.measure ?? true, images: opts.images ?? (process.env.SKYLINE_RENDER_IMAGES === "abort" ? "abort" : "placeholder") });
  return snapshotFromRendered(url, rendered, await fetchStylesheets(rendered.stylesheets, opts.signal));
}

export function snapshotFromRendered(requested: URL, rendered: RenderedPage, linkedCss: string[] = []): DomSnapshot {
  checkHtmlResponse({ status: rendered.status, headers: rendered.headers, contentType: rendered.headers["content-type"] ?? "" });
  assertNotLoginRedirect(requested, new URL(rendered.finalUrl));
  assertNotChallenge(rendered.html);

  const snapshot = snapshotFromHtml(rendered.html, rendered.finalUrl, "rendered", {
    source: {
      requestedUrl: requested.toString(),
      status: rendered.status,
      bytes: rendered.html.length,
      durationMs: rendered.durationMs,
      redirects: rendered.redirects,
    },
    externalCss: [...linkedCss, ...rendered.injectedCss],
    layout: rendered.layout,
  });
  if (snapshot.stats.elementCount === 0) throw new CaptureError("empty_page");
  if (looksLikeLoginWall(snapshot)) throw new CaptureError("auth_required");
  return snapshot;
}
