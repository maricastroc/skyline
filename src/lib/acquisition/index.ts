import "server-only";
import { CaptureError } from "./errors";
import { fetchStaticPage } from "./static-fetch";
import { captureRenderedPage, isRendererAvailable } from "./rendered-capture";
import { normalizeInputUrl } from "./url-policy";
import { buildSnapshot, parsePage } from "../snapshot/parse-html";
import type { DomSnapshot } from "../snapshot/types";
import { LUMEN_SAMPLE_HTML } from "../fixtures/lumen";

export type StrategyPreference = "auto" | "static" | "rendered";

export const SAMPLE_URLS: Record<string, string> = {
  "sample:lumen": LUMEN_SAMPLE_HTML,
};

export async function acquire(input: string, prefer: StrategyPreference = "auto", signal?: AbortSignal): Promise<DomSnapshot> {
  const sample = SAMPLE_URLS[input.trim()];
  if (sample) return snapshotFromHtml(sample, "https://lumen.example/", "sample");

  const url = normalizeInputUrl(input);

  if (prefer === "rendered") return captureRenderedPage(url, { signal });

  const snapshot = await fetchStaticPage(url, signal);
  if (prefer === "static") return snapshot;

  const isShell = snapshot.warnings.some((w) => w.code === "spa_shell");
  if (isShell && isRendererAvailable()) {
    try {
      return await captureRenderedPage(url, { signal });
    } catch (err) {
      if (!(err instanceof CaptureError)) throw err;
      snapshot.warnings.push({ code: "rendered_unavailable", message: "Rendered capture failed; showing the static scaffold." });
    }
  }
  return snapshot;
}

export function snapshotFromHtml(html: string, url: string, strategy: DomSnapshot["source"]["strategy"]): DomSnapshot {
  const page = parsePage(html, url);
  return buildSnapshot(page, {
    requestedUrl: url,
    finalUrl: url,
    strategy,
    status: 200,
    bytes: html.length,
    durationMs: 0,
    redirects: [],
  });
}

export { CaptureError } from "./errors";
