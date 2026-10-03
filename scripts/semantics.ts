// Print the semantic regions of pages: npx tsx scripts/semantics.ts <url…>
import { fetchStaticPage } from "../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../src/lib/acquisition/url-policy";
import { normalize } from "../src/lib/model/normalize";
import { analyzeSemantics, REGION_LABEL } from "../src/lib/semantics/analyze";

async function main() {
  for (const u of process.argv.slice(2)) {
    const doc = normalize(await fetchStaticPage(normalizeInputUrl(u)));
    const t0 = performance.now();
    const s = analyzeSemantics(doc);
    console.log(`\n■ ${u} — site "${s.siteName}" (${(performance.now() - t0).toFixed(1)} ms, ${s.regions.length} regions)`);
    const pick = (i: number) => (i >= 0 ? `${REGION_LABEL[s.regions[i].kind]} ${doc.nodes[s.regions[i].node].selector}` : "-");
    console.log(`  hero: ${pick(s.hero)} | nav: ${pick(s.nav)} | brand: ${pick(s.brand)} | footer: ${pick(s.footer)} | main: ${pick(s.main)}`);
    console.log(`  districts: ${s.districts.map((d) => `${s.regions[d].kind}:${(s.regions[d].title ?? "").slice(0, 18)}`).join(" · ")}`);
    if (process.env.ALL)
      for (const r of s.regions) {
        let depth = 0;
        for (let p = r.parent; p >= 0; p = s.regions[p].parent) depth++;
        console.log(`  ${"  ".repeat(depth)}${r.kind.padEnd(12)} ${doc.nodes[r.node].selector.slice(0, 36).padEnd(36)} ${(r.title ?? "").slice(0, 30).padEnd(30)} imp=${r.importance.toFixed(2)} items=${r.items.length}  · ${r.evidence.join(" · ").slice(0, 120)}`);
      }
  }
}
main();
