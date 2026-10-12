import { CaptureError } from "./errors";
import { isLocalRendererEnabled, launchLocalBrowser, localChromePath } from "./local-browser";
import { renderPage, type RenderOptions, type RenderedPage } from "./render-page";
import { assertNotChallenge, assertNotLoginRedirect, checkHtmlResponse, fetchStylesheets, looksLikeLoginWall } from "./static-fetch";
import { snapshotFromHtml } from "../snapshot/parse-html";
import type { DomSnapshot } from "../snapshot/types";

export interface RenderedCaptureOptions {
  signal?: AbortSignal;
  viewport?: { width: number; height: number };
}

export function isRendererAvailable(): boolean {
  return Boolean(process.env.SKYLINE_RENDERER_URL) || isLocalRendererEnabled();
}

const READY_FOR_MS = 60_000;
let tried: { at: number; setup: string; ready: Promise<boolean> } | null = null;

/** Whether a rendered capture can run right now: the renderer is tried, not assumed from the configuration. */
export function rendererReady(): Promise<boolean> {
  const setup = `${process.env.SKYLINE_RENDERER_URL ?? ""} ${isLocalRendererEnabled()} ${localChromePath() ?? ""}`;
  if (!tried || tried.setup !== setup || Date.now() - tried.at >= READY_FOR_MS) tried = { at: Date.now(), setup, ready: tryRenderer() };
  return tried.ready;
}

async function tryRenderer(): Promise<boolean> {
  try {
    const endpoint = process.env.SKYLINE_RENDERER_URL;
    if (endpoint) {
      await fetch(endpoint, { method: "HEAD", signal: AbortSignal.timeout(2_500) });
      return true;
    }
    if (!isLocalRendererEnabled()) return false;
    const browser = await launchLocalBrowser({ noSandbox: !!process.env.CI });
    try {
      return (await browser.version()).length > 0;
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return false;
  }
}

export async function captureRenderedPage(url: URL, opts: RenderedCaptureOptions = {}): Promise<DomSnapshot> {
  const endpoint = process.env.SKYLINE_RENDERER_URL;
  if (endpoint) return captureFromRenderer(endpoint, url, opts);
  if (isLocalRendererEnabled()) return captureWithLocalBrowser(url, opts);
  throw new CaptureError("renderer_unavailable");
}

async function captureFromRenderer(endpoint: string, url: URL, opts: RenderedCaptureOptions): Promise<DomSnapshot> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: url.toString(), viewport: opts.viewport ?? { width: 1440, height: 900 } }),
    signal: opts.signal,
  });
  if (!res.ok) throw new CaptureError("http_error", `renderer ${res.status}`);
  return (await res.json()) as DomSnapshot;
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
