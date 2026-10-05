import { CaptureError } from "./errors";
import type { DomSnapshot } from "../snapshot/types";

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

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: url.toString(), viewport: opts.viewport ?? { width: 1440, height: 900 } }),
    signal: opts.signal,
  });
  if (!res.ok) throw new CaptureError("http_error", `renderer ${res.status}`);
  return (await res.json()) as DomSnapshot;
}
