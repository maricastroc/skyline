import { CaptureError } from "./errors";
import { decodeHtml, safeFetch, type SafeResponseHead } from "./safe-fetch";
import { buildSnapshot, parsePage } from "../snapshot/parse-html";
import type { DomSnapshot } from "../snapshot/types";

const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_CSS_BYTES = 700 * 1024;
const MAX_STYLESHEETS = 10;

const CHALLENGE_RE =
  /<title>\s*(just a moment|attention required|access denied|are you a robot|verify you are human|security check|ddos-guard|request blocked|pardon our interruption)/i;
const CHALLENGE_MARKERS = /cf-browser-verification|challenge-platform|_cf_chl_opt|perimeterx|px-captcha|datadome|captcha-delivery|akamai.*bot manager/i;
const LOGIN_PATH_RE = /\/(login|log-in|signin|sign-in|sign_in|auth|sso|account\/login|session\/new|oauth)(\/|\?|$)/i;

/**
 * Strategy 1: fetch the HTML exactly as the server sends it. Fast and cheap, but blind to
 * anything assembled by client-side JavaScript (see captureRenderedPage).
 */
export async function fetchStaticPage(url: URL, signal?: AbortSignal): Promise<DomSnapshot> {
  const res = await safeFetch(url, {
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    maxBytes: MAX_HTML_BYTES,
    deadlineMs: 15_000,
    signal,
    checkResponse: checkHtmlResponse,
  });

  if (LOGIN_PATH_RE.test(res.url.pathname) && !LOGIN_PATH_RE.test(url.pathname))
    throw new CaptureError("auth_required", `redirected to ${res.url.pathname}`);

  const html = decodeHtml(res.body, res.contentType);
  if (CHALLENGE_RE.test(html.slice(0, 4000)) || (html.length < 60_000 && CHALLENGE_MARKERS.test(html)))
    throw new CaptureError("blocked", "bot challenge page");

  const page = parsePage(html, res.url.toString());
  if (!page.body) throw new CaptureError("empty_page");

  const externalCss = await fetchStylesheets(page.stylesheets, signal);

  const snapshot = buildSnapshot(
    page,
    {
      requestedUrl: url.toString(),
      finalUrl: res.url.toString(),
      strategy: "static",
      status: res.status,
      bytes: res.body.length,
      durationMs: res.durationMs,
      redirects: res.redirects,
    },
    externalCss,
  );

  if (snapshot.stats.elementCount === 0) throw new CaptureError("empty_page");
  if (looksLikeLoginWall(snapshot)) throw new CaptureError("auth_required");
  return snapshot;
}

function checkHtmlResponse(head: SafeResponseHead): void {
  const { status, headers, contentType } = head;
  if (status === 401 || status === 407) throw new CaptureError("auth_required", undefined, status);
  if (status === 403 || status === 429 || (status === 503 && headers["cf-mitigated"]) || headers["cf-mitigated"])
    throw new CaptureError("blocked", `HTTP ${status}`, status);
  if (status === 451) throw new CaptureError("blocked", "unavailable for legal reasons", status);
  if (status >= 400) throw new CaptureError("http_error", `HTTP ${status}`, status);
  if (contentType && !/text\/html|application\/xhtml\+xml/.test(contentType))
    throw new CaptureError("not_html", contentType.split(";")[0]);
}

/** Up to a few stylesheets, in parallel, with their own small budget. Failures are ignored. */
async function fetchStylesheets(urls: string[], signal?: AbortSignal): Promise<string[]> {
  const picked = [...new Set(urls)].filter((u) => u.startsWith("https://")).slice(0, MAX_STYLESHEETS);
  const results = await Promise.allSettled(
    picked.map(async (u) => {
      const res = await safeFetch(new URL(u), {
        accept: "text/css,*/*;q=0.1",
        maxBytes: MAX_CSS_BYTES,
        deadlineMs: 5_000,
        maxRedirects: 3,
        signal,
        checkResponse: (h) => {
          if (h.status >= 400) throw new CaptureError("http_error");
        },
      });
      return res.body.toString("utf8");
    }),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

/** A page that is little more than a password form is a login wall. */
function looksLikeLoginWall(s: DomSnapshot): boolean {
  let password = false;
  let text = 0;
  const stack = [s.root];
  while (stack.length) {
    const n = stack.pop()!;
    text += n.text;
    if (n.tag === "input" && n.attrs?.type?.toLowerCase() === "password") password = true;
    stack.push(...n.children);
  }
  return password && text < 1500 && s.stats.elementCount < 400;
}
