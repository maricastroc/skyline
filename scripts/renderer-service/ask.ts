import { CaptureError } from "../../src/lib/acquisition/errors";
import { localChromePath } from "../../src/lib/acquisition/local-browser";
import { captureRenderedPage, captureWithLocalBrowser, rendererReady } from "../../src/lib/acquisition/rendered-capture";
import { signedHeaders } from "../../src/lib/acquisition/renderer-protocol";
import { normalizeInputUrl } from "../../src/lib/acquisition/url-policy";
import { normalize } from "../../src/lib/model/normalize";
import { buildKitCity } from "../../src/lib/pixelcity/kit-city";
import type { DomSnapshot } from "../../src/lib/snapshot/types";

interface Reading {
  ms: number;
  elements: number;
  boxed: number;
  page: string;
  territories: number;
  structures: number;
  series: string;
}

function read(snapshot: DomSnapshot, ms: number): Reading {
  const doc = normalize(snapshot);
  const kit = buildKitCity(doc);
  const series = kit.plan.territories.flatMap((t) => (t.series ? [`${t.series.kind} ${t.series.perRow}/row ×${t.series.units}`] : []));
  return {
    ms,
    elements: snapshot.stats.elementCount,
    boxed: doc.nodes.filter((n) => n.box).length,
    page: snapshot.layout ? `${snapshot.layout.width}×${snapshot.layout.height}` : "unmeasured",
    territories: kit.plan.territories.length,
    structures: kit.structures,
    series: series.join("; ") || "none",
  };
}

async function attempt(work: () => Promise<DomSnapshot>): Promise<Reading | string> {
  const t0 = Date.now();
  try {
    return read(await work(), Date.now() - t0);
  } catch (err) {
    return err instanceof CaptureError ? `${err.code}${err.extra ? ` (${err.extra})` : ""}` : `failed: ${String(err).slice(0, 100)}`;
  }
}

const line = (who: string, r: Reading | string) => (typeof r === "string" ? `  ${who.padEnd(7)} ${r}` : `  ${who.padEnd(7)} ${String(r.ms).padStart(6)} ms  ${String(r.elements).padStart(5)} elements  ${String(r.boxed).padStart(4)} boxed nodes  page ${r.page.padEnd(11)}  ${String(r.territories).padStart(2)} territories  ${String(r.structures).padStart(3)} structures  series: ${r.series}`);

async function main() {
  const args = process.argv.slice(2);
  const compare = args.includes("--compare");
  const urls = args.filter((a) => !a.startsWith("--"));
  const base = process.env.SKYLINE_RENDERER_URL;
  const secret = process.env.SKYLINE_RENDERER_SECRET;
  if (!base || !secret) {
    console.error("Set SKYLINE_RENDERER_URL and SKYLINE_RENDERER_SECRET, then: npm run renderer:ask -- [--compare] <url>…");
    process.exit(2);
  }

  const health = await fetch(new URL("/health", base), { headers: signedHeaders(secret, "GET", "/health", ""), signal: AbortSignal.timeout(10_000) }).then(
    async (r) => `HTTP ${r.status} ${await r.text()}`,
    (e) => `unreachable: ${String(e).slice(0, 100)}`,
  );
  console.log(`renderer ${new URL(base).host}: ${health}`);
  console.log(`ready, as the application sees it: ${await rendererReady()}`);
  if (compare && !localChromePath()) console.log("no local Chrome to compare with (set CHROME_PATH)");

  let differing = 0;
  for (const input of urls) {
    let url: URL;
    try {
      url = normalizeInputUrl(input);
    } catch (err) {
      console.log(`\n${input}\n  refused before anything is sent: ${err instanceof CaptureError ? err.code : "invalid"}`);
      if (compare) differing++;
      continue;
    }
    console.log(`\n${url}`);
    const there = await attempt(() => captureRenderedPage(url, { client: `ask-${urls.indexOf(input)}-${Date.now()}` }));
    console.log(line("service", there));
    if (!compare || !localChromePath()) continue;
    const here = await attempt(() => captureWithLocalBrowser(url, { noSandbox: !!process.env.CI }));
    console.log(line("here", here));
    const same = typeof here !== "string" && typeof there !== "string" ? here.series === there.series && here.territories === there.territories && here.page.split("×")[0] === there.page.split("×")[0] : here === there;
    if (!same) differing++;
    console.log(`  ${same ? "same reading: page width, territories and series agree" : "DIFFERENT reading"}`);
  }
  if (compare) console.log(`\n${urls.length - differing} of ${urls.length} pages read the same here and through the service`);
}
main();
