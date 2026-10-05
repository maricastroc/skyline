import https from "node:https";
import type { IncomingMessage } from "node:http";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { CaptureError, toCaptureError } from "./errors";
import { guardedLookup } from "./net-guard";
import { assertFetchableUrl } from "./url-policy";

export const USER_AGENT =
  process.env.SKYLINE_USER_AGENT ??
  "Mozilla/5.0 (compatible; SkylineDOM/0.1; renders public pages as 3D cities)";

export interface SafeFetchOptions {
  accept: string;
  maxBytes: number;
  maxRedirects?: number;
  headersTimeoutMs?: number;
  deadlineMs?: number;
  checkResponse?: (res: SafeResponseHead) => void;
  signal?: AbortSignal;
}

export interface SafeResponseHead {
  url: URL;
  status: number;
  headers: IncomingMessage["headers"];
  contentType: string;
}

export interface SafeResponse extends SafeResponseHead {
  body: Buffer;
  redirects: string[];
  durationMs: number;
}

export async function safeFetch(start: URL, opts: SafeFetchOptions): Promise<SafeResponse> {
  const t0 = Date.now();
  const maxRedirects = opts.maxRedirects ?? 5;
  const deadline = opts.deadlineMs ?? 15_000;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onOuterAbort);
  const timer = setTimeout(() => controller.abort(), deadline);

  const redirects: string[] = [];
  let url = start;
  try {
    // Every redirect hop is re-validated (and re-resolved through the guarded lookup).
    for (let hop = 0; ; hop++) {
      assertFetchableUrl(url);
      const res = await request(url, opts, controller.signal);
      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (hop >= maxRedirects) throw new CaptureError("too_many_redirects");
        let next: URL;
        try {
          next = new URL(res.headers.location, url);
        } catch {
          throw new CaptureError("http_error", "malformed redirect", status);
        }
        next.hash = "";
        redirects.push(next.toString());
        url = next;
        continue;
      }

      const head: SafeResponseHead = {
        url,
        status,
        headers: res.headers,
        contentType: String(res.headers["content-type"] ?? "").toLowerCase(),
      };
      try {
        opts.checkResponse?.(head);
      } catch (e) {
        res.destroy();
        throw e;
      }

      const declared = Number(res.headers["content-length"] ?? 0);
      if (declared && declared > opts.maxBytes * 1.5) {
        res.destroy();
        throw new CaptureError("too_large");
      }

      const body = await readBody(res, opts.maxBytes, controller.signal);
      return { ...head, body, redirects, durationMs: Date.now() - t0 };
    }
  } catch (err) {
    throw toCaptureError(controller.signal.aborted && !(err instanceof CaptureError) ? Object.assign(new Error("aborted"), { name: "AbortError" }) : err);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onOuterAbort);
  }
}

function request(url: URL, opts: SafeFetchOptions, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: opts.accept,
          "accept-language": "en,*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
        },
        timeout: opts.headersTimeoutMs ?? 8_000,
        agent: false,
      },
      resolve,
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("headers timeout"), { code: "ETIMEDOUT" })));
    req.on("error", reject);
    req.end();
  });
}

async function readBody(res: IncomingMessage, maxBytes: number, signal: AbortSignal): Promise<Buffer> {
  const encoding = String(res.headers["content-encoding"] ?? "identity").toLowerCase().trim();
  let stream: Readable = res;
  if (encoding === "gzip" || encoding === "x-gzip") stream = res.pipe(zlib.createGunzip());
  else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
  else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());
  else if (encoding !== "identity" && encoding !== "") {
    res.destroy();
    throw new CaptureError("not_html", `unsupported encoding ${encoding}`);
  }

  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of stream) {
      if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
      total += (chunk as Buffer).length;
      if (total > maxBytes) throw new CaptureError("too_large");
      chunks.push(chunk as Buffer);
    }
  } finally {
    res.destroy();
  }
  return Buffer.concat(chunks);
}

export function decodeHtml(body: Buffer, contentType: string): string {
  let charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (!charset) {
    const head = body.subarray(0, 2048).toString("latin1");
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(charset ?? "utf-8", { fatal: false }).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}
