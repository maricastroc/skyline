import { CaptureError, toCaptureError } from "@/lib/acquisition/errors";
import { clientKey, takeToken } from "@/lib/acquisition/rate-limit";
import { safeFetch } from "@/lib/acquisition/safe-fetch";
import { verifyAssetUrl } from "@/lib/acquisition/signing";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const u = params.get("u");
  const s = params.get("s");
  if (!u || !s || !verifyAssetUrl(u, s)) return new Response(null, { status: 403 });
  if (!takeToken(`asset:${clientKey(req)}`, 160, 4)) return new Response(null, { status: 429 });

  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    const res = await safeFetch(url, {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1",
      maxBytes: MAX_IMAGE_BYTES,
      deadlineMs: 10_000,
      maxRedirects: 4,
      signal: req.signal,
      checkResponse: (h) => {
        if (h.status >= 400) throw new CaptureError("http_error", undefined, h.status);
        if (/text\/|svg|xml|json|javascript/.test(h.contentType)) throw new CaptureError("not_html", h.contentType);
      },
    });
    const type = sniffImage(res.body);
    if (!type) return new Response(null, { status: 415 });
    return new Response(new Uint8Array(res.body), {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, immutable",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  } catch (err) {
    return new Response(null, { status: toCaptureError(err).httpStatus });
  }
}

function sniffImage(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const brand = b.subarray(4, 12).toString("ascii");
  if (brand === "ftypavif" || brand === "ftypavis") return "image/avif";
  return null;
}
