import { CaptureError } from "./errors";
import { fetchStaticPage } from "./static-fetch";
import { captureRenderedPage, isRendererAvailable, type RenderedCaptureOptions } from "./rendered-capture";
import { normalizeInputUrl } from "./url-policy";
import { snapshotFromHtml } from "../snapshot/parse-html";
import type { DomSnapshot } from "../snapshot/types";
import { LUMEN_SAMPLE_HTML } from "../fixtures/lumen";

export type StrategyPreference = "auto" | "static" | "rendered";

export const SAMPLE_URLS: Record<string, string> = {
  "sample:lumen": LUMEN_SAMPLE_HTML,
};

export interface AcquireOptions {
  signal?: AbortSignal;
  client?: string;
}

export interface AcquireSources {
  fetchStatic: (url: URL, signal?: AbortSignal) => Promise<DomSnapshot>;
  captureRendered: (url: URL, opts: RenderedCaptureOptions) => Promise<DomSnapshot>;
  rendererAvailable: () => boolean;
}

const SOURCES: AcquireSources = { fetchStatic: fetchStaticPage, captureRendered: captureRenderedPage, rendererAvailable: isRendererAvailable };

export async function acquire(input: string, prefer: StrategyPreference = "auto", opts: AcquireOptions = {}, sources: AcquireSources = SOURCES): Promise<DomSnapshot> {
  const sample = SAMPLE_URLS[input.trim()];
  if (sample) return snapshotFromHtml(sample, "https://lumen.example/", "sample");

  const url = normalizeInputUrl(input);
  const { signal, client } = opts;

  if (prefer === "rendered") return sources.captureRendered(url, { signal, client });

  let snapshot: DomSnapshot;
  try {
    snapshot = await sources.fetchStatic(url, signal);
  } catch (err) {
    if (prefer === "auto" && err instanceof CaptureError && err.code === "empty_page" && sources.rendererAvailable()) return sources.captureRendered(url, { signal, client });
    throw err;
  }
  if (prefer === "static") return snapshot;

  const isShell = snapshot.warnings.some((w) => w.code === "spa_shell");
  if (isShell && sources.rendererAvailable()) {
    try {
      const rendered = await sources.captureRendered(url, { signal, client });
      if (rendered.stats.elementCount > snapshot.stats.elementCount) return rendered;
    } catch (err) {
      if (!(err instanceof CaptureError)) throw err;
      snapshot.warnings.push({ code: "rendered_unavailable", message: "Rendered capture failed; showing the static scaffold." });
    }
  }
  return snapshot;
}
