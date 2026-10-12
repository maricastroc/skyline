import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { renderPage } from "../../src/lib/acquisition/render-page";
import { snapshotFromRendered } from "../../src/lib/acquisition/rendered-capture";
import { fetchStaticPage, fetchStylesheets } from "../../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../../src/lib/acquisition/url-policy";
import { normalize } from "../../src/lib/model/normalize";
import { blockName, buildKitCity } from "../../src/lib/pixelcity/kit-city";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { DATASET, type Entry } from "./dataset";

const DIR = "docs/rendered-capture";
mkdirSync(`${DIR}/snapshots`, { recursive: true });

const textOf = (n: SnapshotNode): number => n.text + n.children.reduce((s, c) => s + textOf(c), 0);

export interface Measure {
  elements: number;
  depth: number;
  text: number;
  kb: number;
  nodes: number;
  links: number;
  images: number;
  headings: number;
  controls: number;
  regions: number;
  kinds: Record<string, number>;
  territories: number;
  compositions: string[];
  largestShare: number;
  structures: number;
  parts: number;
  land: Array<{ name: string; kind: string; comp: string; lots: number }>;
  warnings: string[];
  ms: number;
  time: string;
}

function measure(snap: DomSnapshot): Measure {
  const doc = normalize(snap);
  const kit = buildKitCity(doc);
  const kinds: Record<string, number> = {};
  for (const r of kit.sem.regions) if (r.kind !== "page") kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  const landed = kit.map.blocks.filter((b) => b.lots > 0).sort((a, b) => b.lots - a.lots);
  const topComp = (t: number) => [...(kit.plan.territories[t]?.mix ?? [])].sort((a, b) => b.share - a.share)[0]?.comp ?? "-";
  return {
    elements: snap.stats.elementCount,
    depth: snap.stats.maxDepth,
    text: textOf(snap.root),
    kb: Math.round(snap.source.bytes / 1024),
    nodes: doc.nodes.length,
    links: doc.stats.links,
    images: doc.stats.images,
    headings: doc.stats.headings,
    controls: doc.stats.buttons + doc.stats.forms,
    regions: Object.values(kinds).reduce((a, b) => a + b, 0),
    kinds,
    territories: landed.length,
    compositions: [...new Set(landed.map((b) => topComp(b.t)))],
    largestShare: landed.length ? landed[0].lots / 256 : 0,
    structures: kit.structures,
    parts: kit.city.parts.length,
    land: landed.slice(0, 8).map((b) => ({ name: blockName(b).slice(0, 40), kind: b.kind, comp: topComp(b.t), lots: b.lots })),
    warnings: snap.warnings.map((w) => w.code),
    ms: snap.source.durationMs,
    time: kit.city.palette.time,
  };
}

type Side = { ok: true; m: Measure } | { ok: false; error: string };

const reuse = process.argv.includes("--reuse");

async function side(e: Entry, how: "static" | "rendered"): Promise<Side> {
  const file = `${DIR}/snapshots/${e.id}-${how}.json`;
  const refusal = `${DIR}/snapshots/${e.id}-${how}.error.txt`;
  if (reuse && existsSync(file)) return { ok: true, m: measure(JSON.parse(readFileSync(file, "utf8")) as DomSnapshot) };
  if (reuse && existsSync(refusal)) return { ok: false, error: readFileSync(refusal, "utf8") };
  try {
    const url = normalizeInputUrl(e.url);
    let snap: DomSnapshot;
    if (how === "static") snap = await fetchStaticPage(url);
    else {
      const rendered = await renderPage(url);
      snap = snapshotFromRendered(url, rendered, await fetchStylesheets(rendered.stylesheets));
      writeFileSync(`${DIR}/snapshots/${e.id}-rendered.visit.json`, JSON.stringify({ settled: rendered.settled, ms: rendered.durationMs, requests: rendered.requests, refused: rendered.refused.length, status: rendered.status, redirects: rendered.redirects.length }));
    }
    writeFileSync(file, JSON.stringify(snap));
    return { ok: true, m: measure(snap) };
  } catch (err) {
    const error = err instanceof CaptureError ? `${err.code}${err.extra ? ` (${err.extra})` : ""}` : `crash: ${String(err).slice(0, 120)}`;
    writeFileSync(refusal, error);
    return { ok: false, error };
  }
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const entries = DATASET.filter((e) => !only.length || only.includes(e.id) || only.includes(e.group));
  const rows: Array<{ entry: Entry; static: Side; rendered: Side }> = [];
  for (const entry of entries) {
    const st = await side(entry, "static");
    const re = await side(entry, "rendered");
    rows.push({ entry, static: st, rendered: re });
    const s = st.ok ? `${st.m.elements} el, ${st.m.text} chars, ${st.m.regions} regions, ${st.m.territories} territories${st.m.warnings.length ? ` [${st.m.warnings}]` : ""}` : `✗ ${st.error}`;
    const r = re.ok ? `${re.m.elements} el, ${re.m.text} chars, ${re.m.regions} regions, ${re.m.territories} territories, ${re.m.ms} ms${re.m.warnings.length ? ` [${re.m.warnings}]` : ""}` : `✗ ${re.error}`;
    console.log(`${entry.id.padEnd(13)} ${entry.group.padEnd(8)} static: ${s}\n${" ".repeat(22)} rendered: ${r}`);
  }
  const file = `${DIR}/compare${only.length ? `-${only.join("-")}` : ""}.json`;
  writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), rows }, null, 1));
  console.log(`\nwrote ${file}`);
}
main();
