import type { Browser, HTTPRequest, Page } from "puppeteer-core";
import { startEgressProxy, type EgressOptions, type EgressProxy, type EgressRefusal } from "./egress-proxy";
import { CaptureError } from "./errors";
import { killBrowser, launchBrowser } from "./local-browser";
import { USER_AGENT } from "./safe-fetch";
import { assertFetchableUrl } from "./url-policy";

export interface RenderOptions {
  viewport?: { width: number; height: number };
  signal?: AbortSignal;
  noSandbox?: boolean;
  images?: "abort" | "placeholder";
  measure?: boolean;
  intercept?: (url: string) => { status?: number; contentType: string; body: string; headers?: Record<string, string> } | undefined;
  egress?: EgressOptions;
  launchArgs?: string[];
  deadlineMs?: number;
}

export interface RenderedPage {
  html: string;
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  redirects: string[];
  durationMs: number;
  stylesheets: string[];
  injectedCss: string[];
  requests: number;
  refused: string[];
  placeholders: number;
  settled: "quiet" | "deadline";
  layout?: { width: number; height: number; viewport: number };
  egress: { connections: number; refused: number; bytes: number };
}

interface Trace {
  navigating: string;
  navigations: number;
  looped: boolean;
}

const NAVIGATION_MS = 12_000;
const NETWORK_QUIET_MS = 8_000;
const SETTLE_MS = 12_000;
const TOTAL_MS = 22_000;
const DOM_QUIET_MS = 500;
const MAX_REQUESTS = 400;
const MAX_NAVIGATIONS = 10;
const MAX_PLACEHOLDERS = 400;
const MAX_HTML_CHARS = 4 * 1024 * 1024;
const MAX_INJECTED_CSS_CHARS = 1024 * 1024;
const MEASURE_MS = 1_500;
const NOT_STRUCTURE = new Set(["image", "media", "font"]);
const BLANK_IMAGE = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function renderPage(url: URL, opts: RenderOptions = {}): Promise<RenderedPage> {
  const t0 = Date.now();
  const total = Math.min(opts.deadlineMs ?? TOTAL_MS, TOTAL_MS);
  const trace: Trace = { navigating: url.toString(), navigations: 0, looped: false };
  const late = () => new CaptureError("timeout", "rendered capture");
  let browser: Browser | null = null;
  let proxy: EgressProxy | null = null;
  let expired = false;
  let stop: (err: CaptureError) => void = () => undefined;
  const stopped = new Promise<never>((_, reject) => {
    stop = reject;
  });
  const abort = () => {
    expired = true;
    killBrowser(browser);
    stop(late());
  };
  const dispose = async () => {
    const b = browser;
    const p = proxy;
    browser = null;
    proxy = null;
    if (b) {
      const closing = b.close().catch(() => undefined);
      if ((await Promise.race([closing.then(() => "closed"), sleep(3_000).then(() => "stuck")])) === "stuck") killBrowser(b);
    }
    await p?.close();
  };
  const work = async (): Promise<RenderedPage> => {
    const way = await startEgressProxy(opts.egress);
    proxy = way;
    if (!expired && !opts.intercept?.(url.toString())) {
      const refusal = await way.check(url.hostname);
      if (refusal) throw refusalError(refusal);
    }
    if (!expired) browser = await launchBrowser({ noSandbox: opts.noSandbox, proxyPort: way.port, args: opts.launchArgs }).catch((err) => {
      throw expired ? late() : new CaptureError("renderer_unavailable", `the browser did not start: ${String(err instanceof Error ? err.message : err).slice(0, 80)}`);
    });
    if (expired || !browser) {
      killBrowser(browser);
      await dispose();
      throw late();
    }
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    browser.on("targetcreated", (target) => {
      if (target.type() !== "page") return;
      void target
        .page()
        .then((other) => (other && other !== page ? other.close() : undefined))
        .catch(() => undefined);
    });
    const crash = new Promise<never>((_, reject) => {
      page.on("error", () => reject(new CaptureError("too_large", "the page exhausted the browser")));
    });
    const rendered = await Promise.race([capture(page, url, opts, t0, trace), crash]);
    const egress = way.stats();
    return { ...rendered, egress: { connections: egress.connections, refused: egress.refusedCount, bytes: egress.bytes } };
  };

  opts.signal?.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(abort, total);
  try {
    if (opts.signal?.aborted) throw late();
    return await Promise.race([work(), stopped]);
  } catch (err) {
    if (err instanceof CaptureError) throw err;
    if (trace.looped) throw new CaptureError("too_many_redirects");
    if (expired || opts.signal?.aborted || Date.now() - t0 >= total) throw late();
    throw mapBrowserError(err, (proxy as EgressProxy | null)?.refusalFor(hostOf(trace.navigating)));
  } finally {
    clearTimeout(deadline);
    opts.signal?.removeEventListener("abort", abort);
    await dispose();
  }
}

async function capture(page: Page, url: URL, opts: RenderOptions, t0: number, trace: Trace): Promise<Omit<RenderedPage, "egress">> {
  const refused: string[] = [];
  let requests = 0;
  let placeholders = 0;

  await page.evaluateOnNewDocument(NO_PEER_TO_PEER);
  await page.setUserAgent(USER_AGENT);
  await page.setViewport(opts.viewport ?? { width: 1440, height: 900 });
  page.on("dialog", (d) => void d.dismiss().catch(() => undefined));
  const cdp = await page.createCDPSession();
  await cdp.send("Network.setBypassServiceWorker", { bypass: true }).catch(() => undefined);
  await cdp.send("Page.setDownloadBehavior", { behavior: "deny" }).catch(() => undefined);

  await page.setRequestInterception(true);
  page.on("request", (req: HTTPRequest) => {
    if (req.isInterceptResolutionHandled()) return;
    const target = req.url();
    const settle = (p: Promise<void>) => void p.catch(() => undefined);
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      trace.navigating = target;
      if (++trace.navigations > MAX_NAVIGATIONS) {
        trace.looped = true;
        return settle(req.abort("blockedbyclient"));
      }
    }
    const fixture = opts.intercept?.(target);
    if (fixture) return settle(req.respond({ status: fixture.status ?? 200, contentType: fixture.contentType, body: fixture.body, headers: fixture.headers }));
    if (/^(data|blob|about):/i.test(target)) return settle(req.continue());
    const ok = allowed(target);
    if (ok && opts.images !== "abort" && req.resourceType() === "image" && placeholders < MAX_PLACEHOLDERS) {
      placeholders++;
      return settle(req.respond({ status: 200, contentType: "image/gif", headers: { "access-control-allow-origin": "*" }, body: BLANK_IMAGE }));
    }
    requests++;
    if (!ok || requests > MAX_REQUESTS) {
      if (refused.length < 50) refused.push(target.slice(0, 160));
      return settle(req.abort("blockedbyclient"));
    }
    if (NOT_STRUCTURE.has(req.resourceType())) return settle(req.abort("blockedbyclient"));
    settle(req.continue());
  });

  const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: NAVIGATION_MS });
  const settled = await settle(page);
  if (trace.looped) throw new CaptureError("too_many_redirects");

  const finalUrl = page.url();
  if (!allowed(finalUrl) && !opts.intercept?.(finalUrl)) throw new CaptureError("forbidden_host", "the page navigated away");
  let layout = opts.measure ? ((await page.evaluate(`${MEASURE_BOXES}(${MEASURE_MS})`).catch(() => undefined)) as RenderedPage["layout"]) : undefined;
  const size = async () => Number(await page.evaluate(HTML_SIZE));
  if (opts.measure && (!layout || (await size()) > MAX_HTML_CHARS)) {
    await page.evaluate(CLEAR_BOXES).catch(() => undefined);
    layout = undefined;
  }
  if ((await size()) > MAX_HTML_CHARS) throw new CaptureError("too_large");
  const html = await page.content();
  if (html.length > MAX_HTML_CHARS) throw new CaptureError("too_large");
  const css = (await page.evaluate(`${COLLECT_CSS}(${MAX_INJECTED_CSS_CHARS})`)) as { links: string[]; injected: string[] };

  return {
    html,
    finalUrl,
    status: response?.status() ?? 200,
    headers: response?.headers() ?? {},
    redirects: response ? response.request().redirectChain().map((r) => r.url()) : [],
    durationMs: Date.now() - t0,
    stylesheets: css.links,
    injectedCss: css.injected,
    requests,
    refused,
    placeholders,
    settled,
    layout,
  };
}

function allowed(target: string): boolean {
  try {
    assertFetchableUrl(new URL(target));
    return true;
  } catch {
    return false;
  }
}

async function settle(page: Page): Promise<"quiet" | "deadline"> {
  const until = Date.now() + SETTLE_MS;
  await page.waitForNetworkIdle({ idleTime: DOM_QUIET_MS, timeout: NETWORK_QUIET_MS }).catch(() => undefined);
  let last = -1;
  let since = Date.now();
  while (Date.now() < until) {
    const count = ((await page.evaluate(COUNT_ELEMENTS).catch(() => last)) as number) ?? last;
    if (count !== last) {
      last = count;
      since = Date.now();
    } else if (Date.now() - since >= DOM_QUIET_MS) return "quiet";
    await sleep(125);
  }
  return "deadline";
}

const COLLECT_CSS = `((budget) => {
  const links = Array.from(document.querySelectorAll('link[rel~="stylesheet" i]'))
    .filter((l) => !/print/i.test(l.media))
    .map((l) => l.href)
    .filter((href) => href && href.length <= 4096)
    .slice(0, 50);
  const injected = [];
  let left = budget;
  const read = (sheet) => {
    if (left <= 0) return;
    let text = "";
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        text += rule.cssText + "\\n";
        if (text.length > left) break;
      }
    } catch {
      return;
    }
    if (text) {
      injected.push(text.slice(0, left));
      left -= text.length;
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    const owner = sheet.ownerNode;
    if (owner instanceof HTMLStyleElement && !(owner.textContent || "").trim()) read(sheet);
  }
  for (const sheet of Array.from(document.adoptedStyleSheets || [])) read(sheet);
  return { links, injected };
})`;
const COUNT_ELEMENTS = `document.getElementsByTagName("*").length`;
const NO_PEER_TO_PEER = `(() => {
  const names = ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel", "RTCIceTransport", "RTCDtlsTransport", "RTCSctpTransport", "RTCRtpSender", "RTCRtpReceiver", "RTCRtpTransceiver", "WebTransport"];
  const scrub = (w) => {
    try {
      for (const name of names) {
        try {
          delete w[name];
          Object.defineProperty(w, name, { value: undefined, configurable: false, writable: false });
        } catch {}
      }
    } catch {}
  };
  scrub(window);
  try {
    Object.defineProperty(window, "open", { value: () => null, configurable: false, writable: false });
  } catch {}
  for (const [proto, key] of [[HTMLIFrameElement.prototype, "contentWindow"], [HTMLFrameElement.prototype, "contentWindow"], [HTMLObjectElement.prototype, "contentWindow"]]) {
    const get = Object.getOwnPropertyDescriptor(proto, key)?.get;
    if (!get) continue;
    Object.defineProperty(proto, key, { configurable: false, enumerable: true, get() { const w = get.call(this); if (w) scrub(w); return w; } });
  }
})()`;
const HTML_SIZE = `(document.documentElement ? document.documentElement.outerHTML.length : 0) + 64`;
const CLEAR_BOXES = `for (const el of Array.from(document.querySelectorAll("[data-sk-box]"))) el.removeAttribute("data-sk-box")`;

const MEASURE_BOXES = `((budget) => {
  ${CLEAR_BOXES};
  const root = document.documentElement;
  const body = document.body;
  if (!body) return undefined;
  const until = performance.now() + budget;
  const sx = window.scrollX;
  const sy = window.scrollY;
  const W = Math.max(root.scrollWidth, body.scrollWidth);
  const H = Math.max(root.scrollHeight, body.scrollHeight);
  for (const el of Array.from(body.querySelectorAll("*"))) {
    if (performance.now() > until) return undefined;
    if (el.localName === "area" || el.localName === "map") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right + sx <= 0 || r.bottom + sy <= 0 || r.left + sx >= W || r.top + sy >= H) continue;
    if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) continue;
    const x0 = Math.max(0, r.left + sx);
    const y0 = Math.max(0, r.top + sy);
    const x1 = Math.min(W, r.right + sx);
    const y1 = Math.min(H, r.bottom + sy);
    if (x1 - x0 < 1 || y1 - y0 < 1) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
    el.setAttribute("data-sk-box", [x0, y0, x1 - x0, y1 - y0, fs].map((v) => Math.round(v)).join(" "));
  }
  body.setAttribute("data-sk-box", [0, 0, W, H, 0].join(" "));
  return { width: W, height: H, viewport: window.innerWidth };
})`;

function hostOf(target: string): string {
  try {
    return new URL(target).hostname;
  } catch {
    return "";
  }
}

function refusalError(refusal?: EgressRefusal): CaptureError {
  if (refusal === "private_address") return new CaptureError("private_address");
  if (refusal === "dns_failed") return new CaptureError("dns_failed");
  if (refusal === "forbidden_host" || refusal === "port" || refusal === "plain_http") return new CaptureError("forbidden_host", "refused by the URL policy");
  return new CaptureError("connect_failed");
}

function mapBrowserError(err: unknown, refusal?: EgressRefusal): CaptureError {
  const message = err instanceof Error ? err.message : String(err);
  if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY_CONNECTION_FAILED/.test(message)) return refusalError(refusal);
  if (/ERR_BLOCKED_BY_CLIENT/.test(message)) return new CaptureError("forbidden_host", "refused by the URL policy");
  if (/ERR_NAME_NOT_RESOLVED/.test(message)) return new CaptureError("dns_failed");
  if (/ERR_CERT|ERR_SSL/.test(message)) return new CaptureError("tls_error");
  if (/ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE|ERR_EMPTY_RESPONSE/.test(message)) return new CaptureError("connect_failed");
  if (/ERR_TOO_MANY_REDIRECTS/.test(message)) return new CaptureError("too_many_redirects");
  if (/ERR_ABORTED|ERR_INVALID_RESPONSE|ERR_CONTENT_DECODING_FAILED|ERR_HTTP_RESPONSE_CODE_FAILURE/.test(message)) return new CaptureError("not_html", "the address did not open as a page");
  if (/net::ERR_/.test(message)) return new CaptureError("connect_failed");
  if (/timeout|Timeout/.test(message)) return new CaptureError("timeout", "rendered capture");
  return new CaptureError("internal", message.slice(0, 120));
}
