import crypto from "node:crypto";

/**
 * Asset URLs are signed so /api/asset only proxies images we extracted from a capture —
 * it is not an open proxy. Set SKYLINE_ASSET_SECRET in multi-instance deployments; otherwise
 * a per-process secret is used (signatures die with the process, which is fine for dev).
 */
const SECRET = process.env.SKYLINE_ASSET_SECRET ?? crypto.randomBytes(32).toString("hex");

export function signAssetUrl(url: string): string {
  return crypto.createHmac("sha256", SECRET).update(url).digest("base64url").slice(0, 22);
}

export function verifyAssetUrl(url: string, sig: string): boolean {
  const expected = Buffer.from(signAssetUrl(url));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function assetProxyPath(url: string): string {
  return `/api/asset?u=${encodeURIComponent(url)}&s=${signAssetUrl(url)}`;
}
