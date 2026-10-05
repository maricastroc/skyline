import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as v7 } from "../../src/lib/pixelcity/kit-v7/district";
import { realPage as realPageV7 } from "../../src/lib/pixelcity/kit-v7/real-page";
import { DATASET } from "../real-pages/dataset";
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
console.log("# Corpus fingerprint before the program differentiation pass (kit-v7 = intra-territory composition)");
let same = 0;
for (const mode of ["normal", "flat", "night"] as const) {
  console.log(`\n## kit-v7 cities, ${mode}`);
  for (const e of DATASET) {
    const opt = { time: (mode === "night" ? "night" : "day") as "night" | "day", seed: 7, flat: mode === "flat" };
    const p = realPageV7(snap(e.id));
    const c = v7(p.fp, { profile: p.plan, ...opt });
    const h = sha(JSON.stringify([c.parts, c.signs]));
    const q = realPage(snap(e.id));
    const d = generateKitDistrict(q.fp, { profile: q.plan, ...opt });
    if (sha(JSON.stringify([d.parts, d.signs])) === h) same++;
    console.log(`v7-${mode} ${e.id.padEnd(12)} ${h} parts ${c.parts.length}`);
  }
}
console.log(`\ncurrent kit identical to kit-v7: ${same}/${DATASET.length * 3}`);
