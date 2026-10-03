/**
 * The vacant world's fingerprint: the one an empty page gets, computed with the real
 * pipeline (parse → normalize → fingerprint). Server-side only; the client gets plain data.
 */
import { computeFingerprint, type SiteFingerprint } from "../fingerprint/fingerprint";
import { normalize } from "../model/normalize";
import { buildSnapshot, parsePage } from "../snapshot/parse-html";

let cached: SiteFingerprint | null = null;

export function vacantFingerprint(): SiteFingerprint {
  if (cached) return cached;
  const html = "<!doctype html><html><head><title>Vacant lot</title></head><body><main></main></body></html>";
  const url = "https://vacant.lot/";
  const snapshot = buildSnapshot(parsePage(html, url), { requestedUrl: url, finalUrl: url, strategy: "static", status: 200, bytes: html.length, durationMs: 0, redirects: [] });
  cached = computeFingerprint(normalize(snapshot));
  return cached;
}
