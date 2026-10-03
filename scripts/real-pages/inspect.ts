// Print the facts of frozen pages: npx tsx scripts/real-pages/inspect.ts [id…]
import { readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { analyzeSemantics } from "../../src/lib/semantics/analyze";
import { computeFingerprint } from "../../src/lib/fingerprint/fingerprint";
import { DATASET } from "./dataset";

for (const e of DATASET) {
  if (process.argv.length > 2 && !process.argv.includes(e.id)) continue;
  const snap = JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8"));
  const doc = normalize(snap);
  const sem = analyzeSemantics(doc);
  const fp = computeFingerprint(doc);
  const total = doc.nodes[0].weight;
  const f = (v: number) => v.toFixed(2);
  console.log(`\n■ ${e.id} ${snap.source.finalUrl} — ${doc.nodes.length} nodes`);
  console.log(`  fp size ${f(fp.size)} depth ${f(fp.depth)} breadth ${f(fp.breadth)} regular ${f(fp.regularity)} sections ${f(fp.sections)} text ${f(fp.textDensity)} img ${f(fp.imagery)} links ${f(fp.linkDensity)} head ${f(fp.headings)} inter ${f(fp.interactivity)} forms ${f(fp.forms)} | round ${f(fp.roundness)} airy ${f(fp.airiness)} orn ${f(fp.ornament)} dark ${f(fp.darkness)} legacy ${f(fp.legacy)} type s${f(fp.type.serif)}/a${f(fp.type.sans)}/m${f(fp.type.mono)} hues ${fp.hues.length}`);
  console.log(`  hero ${sem.hero} nav ${sem.nav} brand ${sem.brand} footer ${sem.footer} main ${sem.main} districts [${sem.districts.join(",")}] sidebars [${sem.sidebars.join(",")}] ctas [${sem.ctas.join(",")}]`);
  for (const r of sem.regions) {
    const n = doc.nodes[r.node];
    let depth = 0;
    for (let p = r.parent; p >= 0; p = sem.regions[p].parent) depth++;
    let tables = 0;
    for (let k = r.node; k < n.end; k++) if (doc.nodes[k].role === "table") tables++;
    console.log(`  ${String(r.id).padStart(3)} ${"  ".repeat(depth)}${r.kind.padEnd(12)} ${(r.title ?? "").slice(0, 26).padEnd(26)} share ${(n.weight / total * 100).toFixed(1).padStart(5)}% imp ${f(r.importance)} items ${String(r.items.length).padStart(3)} chars ${String(n.chars).padStart(6)} links ${String(n.links).padStart(4)} img ${String(n.images).padStart(3)} ctl ${String(n.controls).padStart(3)} desc ${String(n.descendants).padStart(5)} tbl ${tables}${sem.districts.includes(r.id) ? "  ◆district" : ""}`);
  }
}
