import http from "node:http";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { CaptureError } from "../src/lib/acquisition/errors";
import { launchBrowser } from "../src/lib/acquisition/local-browser";
import { Lru, tokenBuckets } from "../src/lib/acquisition/rate-limit";
import { renderPage, type RenderOptions, type RenderedPage } from "../src/lib/acquisition/render-page";
import {
  clampViewport,
  MAX_ADDRESS_CHARS,
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
  MIN_SECRET_CHARS,
  PROTOCOL,
  SIGNATURE_HEADER,
  TIME_HEADER,
  toWire,
  verifyRequest,
  type RendererFailure,
  type RendererHealth,
  type RenderRequest,
} from "../src/lib/acquisition/renderer-protocol";
import { assertFetchableUrl } from "../src/lib/acquisition/url-policy";
import type { Pause, Usage } from "./usage";

const gzip = promisify(zlib.gzip);

export interface RendererConfig {
  secret: string;
  concurrency?: number;
  queue?: number;
  queueWaitMs?: number;
  perClient?: { capacity: number; refillPerSec: number };
  cacheMs?: number;
  cacheEntries?: number;
  probeEveryMs?: number;
  noSandbox?: boolean;
  platformApi?: boolean;
  render?: (url: URL, opts: RenderOptions) => Promise<RenderedPage>;
  renderOptions?: Pick<RenderOptions, "intercept" | "egress" | "launchArgs" | "deadlineMs">;
  probe?: () => Promise<string>;
  log?: (line: Record<string, unknown>) => void;
  usage?: Usage;
  onPaused?: (why: Pause) => void;
}

export interface Activity {
  lastRender: number;
  lastHealth: number;
  busy: boolean;
}

export interface Renderer {
  server: http.Server;
  activity(): Activity;
  listen(port: number, host?: string): Promise<number>;
  close(): Promise<void>;
}

interface Job {
  result: Promise<Buffer>;
  cancel: AbortController;
  watchers: number;
}

class Refusal extends Error {
  constructor(
    readonly status: number,
    readonly code: RendererFailure,
    readonly extra?: string,
  ) {
    super(code);
  }
}

export function createRenderer(config: RendererConfig): Renderer {
  if (config.secret.length < MIN_SECRET_CHARS) throw new Error(`the renderer secret needs at least ${MIN_SECRET_CHARS} characters`);
  const concurrency = Math.max(1, config.concurrency ?? 2);
  const queue = Math.max(0, config.queue ?? 4);
  const queueWaitMs = config.queueWaitMs ?? 8_000;
  const perClient = config.perClient ?? { capacity: 4, refillPerSec: 1 / 30 };
  const probeEveryMs = config.probeEveryMs ?? 60_000;
  const render = config.render ?? renderPage;
  const log = config.log ?? ((line) => console.log(JSON.stringify(line)));
  const probe =
    config.probe ??
    (async () => {
      const browser = await launchBrowser({ noSandbox: config.noSandbox });
      try {
        return await browser.version();
      } finally {
        await browser.close().catch(() => undefined);
      }
    });

  const takeToken = tokenBuckets();
  const cache = new Lru<Buffer>(config.cacheEntries ?? 12, config.cacheMs ?? 180_000);
  const jobs = new Map<string, Job>();
  const waiting: Array<(ok: boolean) => void> = [];
  let active = 0;
  let closing = false;
  let lastRender = 0;
  let lastHealth = 0;
  const pausedNow = (): Pause | null => config.usage?.paused() ?? null;
  const refusePaused = (why: Pause) => {
    config.onPaused?.(why);
    return new Refusal(503, "paused", why);
  };
  let probed: { at: number; result: Promise<{ ok: boolean; chrome?: string }> } | null = null;

  const health = () => {
    if (!probed || Date.now() - probed.at >= probeEveryMs) {
      const result = probe().then(
        (chrome) => ({ ok: chrome.length > 0, chrome }),
        (err) => {
          log({ event: "probe_failed", error: String(err instanceof Error ? err.message : err).slice(0, 200) });
          return { ok: false };
        },
      );
      const entry = { at: Date.now(), result };
      void result.then((r) => {
        if (!r.ok && probed === entry) entry.at = Date.now() - probeEveryMs + 10_000;
      });
      probed = entry;
    }
    return probed.result;
  };

  const takeSlot = (signal: AbortSignal) =>
    new Promise<boolean>((done) => {
      if (active < concurrency) {
        active++;
        return done(true);
      }
      if (waiting.length >= queue) return done(false);
      const settle = (ok: boolean) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", leave);
        const at = waiting.indexOf(settle);
        if (at >= 0) waiting.splice(at, 1);
        done(ok);
      };
      const leave = () => settle(false);
      const timer = setTimeout(leave, queueWaitMs);
      signal.addEventListener("abort", leave, { once: true });
      waiting.push(settle);
    });

  const freeSlot = () => {
    const next = waiting.shift();
    if (next) next(true);
    else active--;
  };

  const capture = async (url: URL, viewport: { width: number; height: number }, signal: AbortSignal): Promise<Buffer> => {
    if (!(await takeSlot(signal))) throw new Refusal(503, "busy");
    const over = config.usage?.takeCapture();
    if (over) {
      freeSlot();
      throw refusePaused(over);
    }
    const t0 = Date.now();
    const host = url.hostname;
    try {
      const page = await render(url, { ...config.renderOptions, viewport, signal, measure: true, images: "placeholder", noSandbox: config.noSandbox });
      if (page.finalUrl.length > MAX_ADDRESS_CHARS) throw new CaptureError("invalid_url", "the final address is too long");
      const json = JSON.stringify({ v: PROTOCOL, page: toWire(page) });
      if (Buffer.byteLength(json) > MAX_RESPONSE_BYTES - 65_536) throw new CaptureError("too_large");
      const body = await gzip(json);
      log({ event: "render", outcome: "ok", host, ms: Date.now() - t0, settled: page.settled, requests: page.requests, placeholders: page.placeholders, refused: page.refused.length, connections: page.egress.connections, egressRefused: page.egress.refused, egressBytes: page.egress.bytes, html: page.html.length, measured: !!page.layout, gzip: body.length });
      return body;
    } catch (err) {
      const code = err instanceof CaptureError ? err.code : "internal";
      log({ event: "render", outcome: code, host, ms: Date.now() - t0, detail: hostsOnly(err instanceof CaptureError ? err.extra : String(err instanceof Error ? err.message : err).slice(0, 200)) });
      if (code === "renderer_unavailable") {
        probed = null;
        throw new Refusal(503, code);
      }
      if (err instanceof CaptureError && code !== "internal") throw new Refusal(422, code, err.extra);
      throw new Refusal(500, "internal");
    } finally {
      freeSlot();
    }
  };

  const join = (key: string, url: URL, viewport: { width: number; height: number }): Job => {
    let job = jobs.get(key);
    if (!job) {
      const cancel = new AbortController();
      const result = capture(url, viewport, cancel.signal).then((body) => {
        cache.set(key, body);
        return body;
      });
      const started: Job = { result, cancel, watchers: 0 };
      void result
        .catch(() => undefined)
        .finally(() => {
          if (jobs.get(key) === started) jobs.delete(key);
        });
      jobs.set(key, started);
      job = started;
    }
    job.watchers++;
    return job;
  };

  const handle = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const path = new URL(req.url ?? "/", "http://renderer").pathname;
    const method = req.method ?? "GET";
    if (method === "GET" && (path === "/" || path === "/healthz")) return void res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store" }).end("ok");
    if (!(method === "GET" && path === "/health") && !(method === "POST" && path === "/render")) throw new Refusal(404, "not_found");

    const body = await readBody(req);
    if (!verifyRequest(config.secret, { time: req.headers[TIME_HEADER], signature: req.headers[SIGNATURE_HEADER] }, method, path, body)) throw new Refusal(401, "unauthorized");

    if (path === "/health") {
      lastHealth = Date.now();
      const paused = pausedNow();
      if (paused) config.onPaused?.(paused);
      const state = paused ? { ok: false, chrome: undefined } : await health();
      const answer: RendererHealth = { v: PROTOCOL, ok: state.ok && !closing && !paused, chrome: state.chrome, sandbox: !config.noSandbox, active, capacity: concurrency, queued: waiting.length, platformApi: !!config.platformApi, paused: paused ?? undefined, usage: config.usage?.snapshot() };
      return send(res, answer.ok ? 200 : 503, Buffer.from(JSON.stringify(answer)));
    }
    lastRender = Date.now();

    if (closing) throw new Refusal(503, "busy");
    let ask: RenderRequest;
    try {
      ask = JSON.parse(body) as RenderRequest;
    } catch {
      throw new Refusal(400, "bad_request");
    }
    if (!ask || typeof ask !== "object" || typeof ask.url !== "string") throw new Refusal(400, "bad_request");

    let url: URL;
    try {
      if (ask.url.length > MAX_ADDRESS_CHARS) throw new CaptureError("invalid_url", "the address is too long");
      url = new URL(ask.url);
      assertFetchableUrl(url);
      url.hash = "";
    } catch (err) {
      throw err instanceof CaptureError ? new Refusal(422, err.code, err.extra) : new Refusal(422, "invalid_url");
    }
    const viewport = clampViewport(ask.viewport);
    const key = `${viewport.width}x${viewport.height} ${url.toString()}`;

    const paused = pausedNow();
    if (paused) throw refusePaused(paused);

    const hit = cache.get(key);
    if (hit) {
      log({ event: "render", outcome: "cached", host: url.hostname });
      return send(res, 200, hit, req, true);
    }

    const client = typeof ask.client === "string" && ask.client ? ask.client.slice(0, 64) : "anonymous";
    if (!jobs.has(key) && !takeToken(`render:${client}`, perClient.capacity, perClient.refillPerSec)) throw new Refusal(429, "rate_limited");

    const job = join(key, url, viewport);
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      if (--job.watchers > 0) return;
      if (jobs.get(key) === job) jobs.delete(key);
      job.cancel.abort();
    };
    res.on("close", () => {
      if (!res.writableEnded) leave();
    });
    try {
      send(res, 200, await job.result, req, true);
    } finally {
      left = true;
      lastRender = Date.now();
    }
  };

  const server = http.createServer((req, res) => {
    void handle(req, res).catch((err) => {
      const refusal = err instanceof Refusal ? err : new Refusal(500, "internal");
      if (!(err instanceof Refusal)) log({ event: "error", error: String(err instanceof Error ? err.message : err).slice(0, 200) });
      if (res.headersSent || res.destroyed) return void res.destroy();
      const error: { code: RendererFailure; extra?: string } = { code: refusal.code };
      if (refusal.extra && refusal.code !== "internal") error.extra = refusal.extra.slice(0, 120);
      send(res, refusal.status, Buffer.from(JSON.stringify({ v: PROTOCOL, error })), undefined, false, refusal.code === "busy" || refusal.code === "rate_limited" ? { "retry-after": "5" } : refusal.code === "paused" ? { "retry-after": "3600" } : refusal.status === 413 ? { connection: "close" } : undefined);
    });
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 60;

  return {
    server,
    activity: () => ({ lastRender, lastHealth, busy: active > 0 || waiting.length > 0 || jobs.size > 0 }),
    listen: (port, host = "0.0.0.0") =>
      new Promise<number>((ready, failed) => {
        server.once("error", failed);
        server.listen(port, host, () => {
          if (!pausedNow()) void health();
          ready((server.address() as { port: number }).port);
        });
      }),
    close: () =>
      new Promise<void>((done) => {
        closing = true;
        for (const settle of [...waiting]) settle(false);
        for (const job of jobs.values()) job.cancel.abort();
        server.close(() => done());
        server.closeIdleConnections();
        setTimeout(() => server.closeAllConnections(), 4_000).unref();
      }),
  };
}

function hostsOnly(text: string | undefined): string | undefined {
  return text?.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'")<>]+/gi, (address) => {
    try {
      return `${new URL(address).protocol}//${new URL(address).host}/…`;
    } catch {
      return "<address>";
    }
  });
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((done, failed) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total <= MAX_REQUEST_BYTES) return void chunks.push(chunk);
      chunks.length = 0;
      failed(new Refusal(413, "bad_request"));
    });
    req.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => failed(new Refusal(400, "bad_request")));
  });
}

function send(res: http.ServerResponse, status: number, body: Buffer, req?: http.IncomingMessage, zipped = false, extra?: Record<string, string>): void {
  if (res.destroyed || res.writableEnded) return;
  const accepts = /\bgzip\b/.test(String(req?.headers["accept-encoding"] ?? ""));
  const out = zipped && !accepts ? zlib.gunzipSync(body) : body;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": String(out.length),
    ...(zipped && accepts ? { "content-encoding": "gzip" } : {}),
    ...extra,
  });
  res.end(out);
}
