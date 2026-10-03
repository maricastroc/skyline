// Dev probe for the pixel city: npx tsx scripts/pixelprobe.ts <url…>
import { fetchStaticPage } from "../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../src/lib/acquisition/url-policy";
import { normalize } from "../src/lib/model/normalize";
import { generatePixelCity } from "../src/lib/pixelcity/generate";

async function main() {
  for (const u of process.argv.slice(2)) {
    const doc = normalize(await fetchStaticPage(normalizeInputUrl(u)));
    const t0 = performance.now();
    const city = generatePixelCity(doc);
    const kinds: Record<string, number> = {};
    for (const b of city.buildings) kinds[b.kind] = (kinds[b.kind] ?? 0) + 1;
    console.log(`\n■ ${u}  (${(performance.now() - t0).toFixed(0)} ms) — "${city.siteName}"`);
    console.log("  grammar:", city.grammar.time, city.grammar.style, `units=${city.grammar.units}`);
    console.log("  plate:", city.size.w.toFixed(0), "×", city.size.d.toFixed(0), "· maxH", city.maxHeight.toFixed(1), "· parts", city.parts.length, "· signs", city.signs.length, "· images", city.images.length, "· rail", city.rail?.stations.length ?? 0);
    console.log("  buildings:", city.buildings.length, JSON.stringify(kinds));
    console.log("  zones:", city.zones.map((z) => `${z.role}:${(z.title ?? "").slice(0, 14)}`).join(" | "));
    console.log("  signs:", city.signs.slice(0, 16).map((s) => s.text.replace("\n", "/")).join(" | "));
    city.influences.slice(0, 5).forEach((f, i) => console.log(`  ${i + 1}. ${f.what}  →  ${f.effect}   (${f.score.toFixed(2)})`));
  }
}
main();
