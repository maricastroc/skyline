import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as v6 } from "../../src/lib/pixelcity/kit-v6/district";
import { realPage as realPageV6 } from "../../src/lib/pixelcity/kit-v6/real-page";
import { DATASET } from "../real-pages/dataset";
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
console.log("# Corpus fingerprint at the start of the end-to-end differentiation validation (kit-v6 = openings depth)");
console.log("seed 7 · 1440×900 @2x · KitView CITY / street (1.75) / close (3.2)");
let same = 0;
for (const mode of ["normal", "flat", "night"] as const) {
  console.log(`\n## kit-v6 cities, ${mode}`);
  for (const e of DATASET) {
    const opt = { time: (mode === "night" ? "night" : "day") as "night" | "day", seed: 7, flat: mode === "flat" };
    const p = realPageV6(snap(e.id));
    const c = v6(p.fp, { profile: p.plan, ...opt });
    const h = sha(JSON.stringify([c.parts, c.signs]));
    const q = realPage(snap(e.id));
    const d = generateKitDistrict(q.fp, { profile: q.plan, ...opt });
    if (sha(JSON.stringify([d.parts, d.signs])) === h) same++;
    console.log(`v6-${mode} ${e.id.padEnd(12)} ${h} parts ${c.parts.length}`);
  }
}
console.log(`\ncurrent kit identical to kit-v6: ${same}/${DATASET.length * 3}`);
console.log("\n## previous tables");
for (const f of ["docs/openings/tables.md", "docs/surface/tables.md", "docs/semantic-hygiene/tables.md"]) console.log(`${f} ${sha(readFileSync(f))}`);
