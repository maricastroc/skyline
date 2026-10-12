import { readFileSync } from "node:fs";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH } from "./dataset";

const experiments = parseExperiments(process.argv[2] === "none" ? "" : process.argv[2]);
let byKind = 0;
let byMetrics = 0;
let byItems = 0;
let pure = 0;
let mixed = 0;
const kinds: Record<string, number> = {};
const pages = BENCH.length;
for (const b of BENCH) {
  const p = realPage(JSON.parse(readFileSync(b.file, "utf8")) as DomSnapshot, "none", experiments);
  for (const t of p.plan.territories) {
    const how = t.why.find((w) => w.startsWith("T3 item anatomy")) ? "items" : t.why.find((w) => w.startsWith("T3 kind")) ? "kind" : "metrics";
    if (how === "kind") byKind += t.weight;
    else if (how === "items") byItems += t.weight;
    else {
      byMetrics += t.weight;
      if (t.mix.length === 1) pure += t.weight;
      else mixed += t.weight;
    }
    kinds[t.kind] = (kinds[t.kind] ?? 0) + t.weight;
  }
}
const pct = (v: number) => `${Math.round((v / pages) * 100)}%`;
console.log(`land decided by the kind table ${pct(byKind)} · by measured content ${pct(byMetrics)} (single fabric ${pct(pure)}, blended ${pct(mixed)}) · by item anatomy ${pct(byItems)}`);
console.log(`land by region kind: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(", ")}`);
