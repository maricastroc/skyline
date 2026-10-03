import { CaptureError } from "./errors";
import type { DomSnapshot } from "../snapshot/types";

/**
 * Strategy 2: load the page in a real browser and snapshot the live DOM.
 *
 * Contract: returns the same DomSnapshot shape as fetchStaticPage, plus `box` (layout rects)
 * and computed `position` on nodes, so later stages can use real geometry.
 *
 * Not bundled in the MVP: Chromium is ~150MB and must not run inside the web process.
 * The intended deployment is a separate capture worker (Playwright + a browser pool) behind
 * SKYLINE_RENDERER_URL, which must apply the same network policy (block private IPs at the
 * browser level via a proxy or request interception, not just for the top-level URL).
 */
export interface RenderedCaptureOptions {
  signal?: AbortSignal;
  viewport?: { width: number; height: number };
}

export function isRendererAvailable(): boolean {
  return Boolean(process.env.SKYLINE_RENDERER_URL);
}

export async function captureRenderedPage(url: URL, opts: RenderedCaptureOptions = {}): Promise<DomSnapshot> {
  const endpoint = process.env.SKYLINE_RENDERER_URL;
  if (!endpoint) throw new CaptureError("renderer_unavailable");

  // The worker speaks a tiny JSON protocol: { url, viewport } → DomSnapshot.
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: url.toString(), viewport: opts.viewport ?? { width: 1440, height: 900 } }),
    signal: opts.signal,
  });
  if (!res.ok) throw new CaptureError("http_error", `renderer ${res.status}`);
  return (await res.json()) as DomSnapshot;
}
