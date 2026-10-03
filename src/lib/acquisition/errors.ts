/**
 * Every way a capture can fail, with copy the landing can show as-is.
 * Codes are stable API; copy can evolve.
 */
export type CaptureErrorCode =
  | "invalid_url"
  | "unsupported_scheme"
  | "forbidden_host"
  | "private_address"
  | "dns_failed"
  | "connect_failed"
  | "tls_error"
  | "timeout"
  | "too_many_redirects"
  | "too_large"
  | "not_html"
  | "http_error"
  | "blocked"
  | "auth_required"
  | "empty_page"
  | "rate_limited"
  | "renderer_unavailable"
  | "internal";

export interface CaptureErrorPayload {
  code: CaptureErrorCode;
  title: string;
  detail: string;
  hint?: string;
  status?: number;
}

const COPY: Record<CaptureErrorCode, { title: string; detail: string; hint?: string; http: number }> = {
  invalid_url: {
    title: "That doesn't look like an address",
    detail: "We couldn't read a web address in what you typed.",
    hint: "Try something like https://example.com",
    http: 400,
  },
  unsupported_scheme: {
    title: "Only HTTPS pages can be surveyed",
    detail: "The city is built from public pages served over HTTPS.",
    hint: "If the site supports it, use the https:// version.",
    http: 400,
  },
  forbidden_host: {
    title: "That host is off the map",
    detail: "Local, internal and non-standard hosts (localhost, *.local, custom ports, credentials in the URL) can't be captured.",
    hint: "Use a public address on the open web.",
    http: 400,
  },
  private_address: {
    title: "That address points inside a private network",
    detail: "The domain resolves to a private, loopback or reserved IP. We never fetch those.",
    http: 400,
  },
  dns_failed: {
    title: "We couldn't find that domain",
    detail: "The name didn't resolve to any address.",
    hint: "Check for typos in the domain.",
    http: 422,
  },
  connect_failed: {
    title: "The site didn't answer",
    detail: "We reached the address, but the server refused or dropped the connection.",
    http: 502,
  },
  tls_error: {
    title: "The site's certificate didn't check out",
    detail: "The HTTPS handshake failed, so we stopped before reading anything.",
    http: 502,
  },
  timeout: {
    title: "The site took too long",
    detail: "We waited, but the page didn't finish arriving in time.",
    hint: "Slow or overloaded servers sometimes recover — try again in a moment.",
    http: 504,
  },
  too_many_redirects: {
    title: "Too many redirects",
    detail: "The page kept sending us somewhere else.",
    http: 422,
  },
  too_large: {
    title: "This page is too heavy to survey",
    detail: "The HTML is larger than the capture limit.",
    http: 413,
  },
  not_html: {
    title: "That address isn't a web page",
    detail: "It answered with something other than HTML.",
    hint: "Point to a page, not a file or API endpoint.",
    http: 422,
  },
  http_error: {
    title: "The site answered with an error",
    detail: "The server responded, but not with the page.",
    http: 502,
  },
  blocked: {
    title: "This site keeps visitors like us out",
    detail: "It answered with a bot check or a block. We don't try to get around those.",
    hint: "Many sites allow it — try another page or domain.",
    http: 422,
  },
  auth_required: {
    title: "This page is behind a login",
    detail: "We can only build cities from pages anyone can open without signing in.",
    http: 422,
  },
  empty_page: {
    title: "There's nothing here to build",
    detail: "The page arrived, but its body is empty.",
    hint: "Pages rendered entirely in the browser need the rendered capture mode, which isn't enabled yet.",
    http: 422,
  },
  rate_limited: {
    title: "Easy on the surveyor",
    detail: "Too many captures in a short time.",
    hint: "Wait a few seconds and try again.",
    http: 429,
  },
  renderer_unavailable: {
    title: "Rendered capture isn't enabled",
    detail: "This page needs a real browser to assemble itself, and no renderer is configured on this server.",
    http: 501,
  },
  internal: {
    title: "Something broke on our side",
    detail: "The capture failed unexpectedly.",
    http: 500,
  },
};

export class CaptureError extends Error {
  readonly code: CaptureErrorCode;
  readonly upstreamStatus?: number;
  readonly extra?: string;

  constructor(code: CaptureErrorCode, extra?: string, upstreamStatus?: number) {
    super(`${code}${extra ? `: ${extra}` : ""}`);
    this.code = code;
    this.extra = extra;
    this.upstreamStatus = upstreamStatus;
  }

  get httpStatus(): number {
    return COPY[this.code].http;
  }

  toPayload(): CaptureErrorPayload {
    const c = COPY[this.code];
    return {
      code: this.code,
      title: c.title,
      detail: this.extra ? `${c.detail} (${this.extra})` : c.detail,
      hint: c.hint,
      status: this.upstreamStatus,
    };
  }
}

export function toCaptureError(err: unknown): CaptureError {
  if (err instanceof CaptureError) return err;
  const e = err as NodeJS.ErrnoException & { name?: string };
  const code = e?.code ?? "";
  if (e?.name === "AbortError" || code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return new CaptureError("timeout");
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") return new CaptureError("dns_failed");
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EPIPE" || code === "EHOSTUNREACH" || code === "ENETUNREACH")
    return new CaptureError("connect_failed");
  if (typeof code === "string" && (code.startsWith("ERR_TLS") || code.includes("CERT") || code.startsWith("ERR_SSL")))
    return new CaptureError("tls_error");
  if (code === "Z_DATA_ERROR" || code === "ERR__ERROR_FORMAT_PADDING_1") return new CaptureError("connect_failed", "corrupt response");
  return new CaptureError("internal");
}
