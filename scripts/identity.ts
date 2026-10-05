import { fetchStaticPage } from "../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../src/lib/acquisition/url-policy";
import { normalize } from "../src/lib/model/normalize";
import { explainZone } from "../src/lib/pixelcity/explain";
import { generatePixelCity } from "../src/lib/pixelcity/generate";

const DEFAULTS = ["https://en.wikipedia.org/wiki/Brutalist_architecture", "https://news.ycombinator.com", "https://linear.app"];

async function main() {
  const urls = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
  for (const u of urls) {
    const doc = normalize(await fetchStaticPage(normalizeInputUrl(u)));
    const city = generatePixelCity(doc);
    const R = city.semantics.regions;
    console.log(`\n■ ${u}`);
    console.log(`  ${city.grammar.time} · ${city.grammar.style} · plate ${city.size.w.toFixed(0)}×${city.size.d.toFixed(0)} · ${city.buildings.length} buildings · ${city.signs.length} signs · ${city.images.length} real images`);
    console.log("  top 5:");
    city.influences.slice(0, 5).forEach((f, i) => console.log(`    ${i + 1}. ${f.what}\n       → ${f.effect}`));
    console.log("  zones:", city.zones.map((z) => `${z.role}${z.region >= 0 ? `/${R[z.region].kind}` : ""}:${(z.title ?? "").slice(0, 18)}`).join(" | "));
    const landmark = city.zones.find((z) => z.role === "entrance");
    const e = landmark && explainZone(city, doc, landmark);
    if (e) {
      console.log("  landmark inspector:");
      console.log(`    ${e.kicker} · ${e.kind}\n    ${e.selector}\n    “${e.title}”\n    depth ${e.depth} · ${e.descendants} descendants`);
      console.log(`    ${e.path.map((p) => (p.here ? `[${p.label}]` : p.label)).join(" > ")}`);
      e.why.forEach((w) => console.log(`    · ${w}`));
      if (e.effect) console.log(`    → ${e.effect}`);
    }
  }
}
main();
