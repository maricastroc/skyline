import { acquire, CaptureError, SAMPLE_URLS, type StrategyPreference } from "@/lib/acquisition";
import { toCaptureError } from "@/lib/acquisition/errors";
import { clientKey, Lru, takeToken } from "@/lib/acquisition/rate-limit";
import { assetProxyPath } from "@/lib/acquisition/signing";
import { normalizeInputUrl } from "@/lib/acquisition/url-policy";
import { normalize } from "@/lib/model/normalize";
import type { NormalizedDocument } from "@/lib/model/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export type CaptureResponse =
  | { ok: true; doc: NormalizedDocument; timings: { acquireMs: number; normalizeMs: number }; cached: boolean }
  | { ok: false; error: ReturnType<CaptureError["toPayload"]> };

const cache = new Lru<NormalizedDocument>(40, 5 * 60_000);

export async function POST(req: Request): Promise<Response> {
  let body: { url?: unknown; strategy?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(new CaptureError("invalid_url"));
  }
  const input = String(body.url ?? "").slice(0, 2100);
  const strategy: StrategyPreference = body.strategy === "static" || body.strategy === "rendered" ? body.strategy : "auto";

  let key: string;
  try {
    key = `${strategy}:${SAMPLE_URLS[input.trim()] ? input.trim() : normalizeInputUrl(input).toString()}`;
  } catch (err) {
    return fail(toCaptureError(err));
  }

  const hit = cache.get(key);
  if (hit) return Response.json({ ok: true, doc: hit, timings: { acquireMs: 0, normalizeMs: 0 }, cached: true } satisfies CaptureResponse);

  if (!takeToken(clientKey(req))) return fail(new CaptureError("rate_limited"));

  try {
    const t0 = Date.now();
    const snapshot = await acquire(input, strategy, req.signal);
    const t1 = Date.now();
    const doc = normalize(snapshot);
    for (const n of doc.nodes) if (n.image) n.image.proxy = assetProxyPath(n.image.src);
    const t2 = Date.now();
    cache.set(key, doc);
    return Response.json({
      ok: true,
      doc,
      timings: { acquireMs: t1 - t0, normalizeMs: t2 - t1 },
      cached: false,
    } satisfies CaptureResponse);
  } catch (err) {
    const ce = toCaptureError(err);
    if (ce.code === "internal") console.error("[capture]", input, err);
    return fail(ce);
  }
}

function fail(err: CaptureError): Response {
  return Response.json({ ok: false, error: err.toPayload() } satisfies CaptureResponse, { status: err.httpStatus });
}
