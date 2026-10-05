import { readFileSync } from "node:fs";
import { rgbToOklch } from "../../src/lib/city/palette";
import type { RGB } from "../../src/lib/city/types";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { DATASET } from "../real-pages/dataset";

const NAME: Record<string, string> = { shop: "IKEA", oldweb: "Paul Graham", directory: "craigslist", institution: "GOV.UK", reference: "Wikipedia", "reference-2": "Wikipedia 2", media: "NASA", saas: "Linear", docs: "Python Docs" };
const lch = (c: RGB) => {
  const p = rgbToOklch(c);
  return `L${p.l.toFixed(2)} C${p.c.toFixed(3)} h${Math.round(p.h)}`;
};
const ids = [...Object.keys(NAME), ...DATASET.map((e) => e.id).filter((id) => !(id in NAME))];
const rows = ["page           air   tint(h, strength)   vivid  hard │ haze band     │ day sky top           │ day sun ×int  amb ×int"];
const detail: string[] = [];
for (const id of ids) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")));
  const t = newTrace();
  const d = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
  const n = generateKitDistrict(p.fp, { profile: p.plan, time: "night", seed: 7 });
  const base = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, atmosphere: false }).palette;
  const e = t.environment!;
  rows.push(
    `${(NAME[id] ?? id).padEnd(13)} ${e.air.toFixed(2)}   h${String(Math.round(e.tint.h)).padStart(3)} ${e.tint.strength.toFixed(2)}          ${e.vivid.toFixed(2)}  ${e.hardness.toFixed(2)} │ ${d.atmosphere!.haze.map((v) => v.toFixed(2)).join(" → ")} │ ${lch(d.palette.sky.top).padEnd(21)} │ ${(d.palette.sun.intensity / base.sun.intensity).toFixed(2)}          ${(d.palette.ambient.intensity / base.ambient.intensity).toFixed(2)}`,
  );
  detail.push(`\n## ${NAME[id] ?? id} (${id})`, ...e.why.map((w) => `  ${w}`));
  detail.push(`  day   sky ${lch(d.palette.sky.top)} → ${lch(d.palette.sky.bottom)} · sun ${lch(d.palette.sun.color)} ×${d.palette.sun.intensity.toFixed(2)} · ambient ×${d.palette.ambient.intensity.toFixed(2)}`);
  detail.push(`  night sky ${lch(n.palette.sky.top)} → ${lch(n.palette.sky.bottom)} · moon ${lch(n.palette.sun.color)} ×${n.palette.sun.intensity.toFixed(2)} · ambient ×${n.palette.ambient.intensity.toFixed(2)}`);
  detail.push(`  kit-v11 day sky ${lch(base.sky.top)} → ${lch(base.sky.bottom)} (the same for every page)`);
}
console.log(rows.join("\n"));
console.log(detail.join("\n"));
