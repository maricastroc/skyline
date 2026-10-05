import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit-v5/district";
import { building } from "../../src/lib/pixelcity/kit-v5/buildings";
import { Kit } from "../../src/lib/pixelcity/kit-v5/core";
import { generateSurfaceLab, LAB_SETS, type LabKit } from "../../src/lib/pixelcity/kit/lab";
import { realPage } from "../../src/lib/pixelcity/kit-v5/real-page";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
console.log("# Corpus fingerprint before the openings depth pass (kit-v5 = surface grammar pass)");
console.log("seed 7 · 1440×900 @2x · KitView CITY / street (1.75) / close (3.2)");
let maxVariant = 0;
for (const mode of ["normal", "flat", "night"] as const) {
  console.log(`\n## kit-v5 cities, ${mode}`);
  for (const e of DATASET) {
    const p = realPage(snap(e.id));
    const c = generateKitDistrict(p.fp, { profile: p.plan, time: mode === "night" ? "night" : "day", seed: 7, flat: mode === "flat" });
    for (const q of c.parts) maxVariant = Math.max(maxVariant, q.variant ?? 0);
    console.log(`v5-${mode} ${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))} parts ${c.parts.length}`);
  }
}
console.log("\n## Surface Lab with the kit-v5 buildings (style classic, day)");
const api: LabKit = { Kit: Kit as unknown as LabKit["Kit"], building: building as unknown as LabKit["building"] };
for (const set of LAB_SETS) console.log(`v5-lab ${set.padEnd(9)} ${sha(JSON.stringify(generateSurfaceLab(api, vacantFingerprint(), { set }).city.parts))}`);
console.log(`\nmax part variant in kit-v5 cities: ${maxVariant} (the openings depth bits start at 1024)`);
console.log("\n## previous tables");
for (const f of ["docs/surface/tables.md", "docs/semantic-hygiene/tables.md"]) console.log(`${f} ${sha(readFileSync(f))}`);
