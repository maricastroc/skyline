import type { Browser, HTTPRequest, Page } from "puppeteer-core";
import { CaptureError } from "./errors";
import { launchLocalBrowser } from "./local-browser";
import { USER_AGENT } from "./safe-fetch";
import { assertFetchableUrl } from "./url-policy";

export interface RenderOptions {
  viewport?: { width: number; height: number };
  signal?: AbortSignal;
  noSandbox?: boolean;
  images?: "abort" | "placeholder";
  measure?: boolean;
  intercept?: (url: string) => { status?: number; contentType: string; body: string; headers?: Record<string, string> } | undefined;
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
}

const NAVIGATION_MS = 12_000;
const NETWORK_QUIET_MS = 8_000;
const SETTLE_MS = 12_000;
const TOTAL_MS = 22_000;
const DOM_QUIET_MS = 500;
const MAX_REQUESTS = 400;
const MAX_PLACEHOLDERS = 400;
const MAX_HTML_CHARS = 4 * 1024 * 1024;
const MAX_INJECTED_CSS_CHARS = 1024 * 1024;
const MEASURE_MS = 1_500;
const NOT_STRUCTURE = new Set(["image", "media", "font"]);
const BLANK_IMAGE = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function renderPage(url: URL, opts: RenderOptions = {}): Promise<RenderedPage> {
  const t0 = Date.now();
  let browser: Browser | null = null;
  const abort = () => void browser?.process()?.kill("SIGKILL");
  opts.signal?.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(abort, TOTAL_MS);
  try {
    browser = await launchLocalBrowser({ noSandbox: opts.noSandbox });
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    return await capture(page, url, opts, t0);
  } catch (err) {
    if (err instanceof CaptureError) throw err;
    if (opts.signal?.aborted || Date.now() - t0 >= TOTAL_MS) throw new CaptureError("timeout", "rendered capture");
    throw mapBrowserError(err);
  } finally {
    clearTimeout(deadline);
    opts.signal?.removeEventListener("abort", abort);
    if (browser) {
      const closing = browser.close().catch(() => undefined);
      if ((await Promise.race([closing.then(() => "closed"), sleep(3_000).then(() => "stuck")])) === "stuck") abort();
    }
  }
}

async function capture(page: Page, url: URL, opts: RenderOptions, t0: number): Promise<RenderedPage> {
  const refused: string[] = [];
  let requests = 0;
  let placeholders = 0;

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

  const finalUrl = page.url();
  if (!allowed(finalUrl) && !opts.intercept?.(finalUrl)) throw new CaptureError("forbidden_host", "the page navigated away");
  let layout = opts.measure ? ((await page.evaluate(`${MEASURE_BOXES}(${MEASURE_MS})`).catch(() => undefined)) as RenderedPage["layout"]) : undefined;
  let html = await page.content();
  if (opts.measure && (!layout || html.length > MAX_HTML_CHARS)) {
    await page.evaluate(CLEAR_BOXES).catch(() => undefined);
    layout = undefined;
    html = await page.content();
  }
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
    .filter(Boolean);
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

function mapBrowserError(err: unknown): CaptureError {
  const message = err instanceof Error ? err.message : String(err);
  if (/ERR_BLOCKED_BY_CLIENT/.test(message)) return new CaptureError("forbidden_host", "refused by the URL policy");
  if (/ERR_NAME_NOT_RESOLVED/.test(message)) return new CaptureError("dns_failed");
  if (/ERR_CERT|ERR_SSL/.test(message)) return new CaptureError("tls_error");
  if (/ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE|ERR_EMPTY_RESPONSE/.test(message)) return new CaptureError("connect_failed");
  if (/ERR_TOO_MANY_REDIRECTS/.test(message)) return new CaptureError("too_many_redirects");
  if (/timeout|Timeout/.test(message)) return new CaptureError("timeout", "rendered capture");
  return new CaptureError("internal", message.slice(0, 120));
}
