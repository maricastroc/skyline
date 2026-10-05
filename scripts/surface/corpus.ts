import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit-v4/district";
import { realPage } from "../../src/lib/pixelcity/kit-v4/real-page";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
console.log("# Corpus fingerprint before the surface grammar pass (kit-v4 = hygiene pass)");
console.log("seed 7 · day · 1440×900 @2x · KitView CITY / street (1.75) / close (3.2)");
for (const mode of ["normal", "flat", "night"] as const) {
  console.log(`\n## kit-v4 cities, ${mode}`);
  for (const e of DATASET) {
    const p = realPage(snap(e.id));
    const c = generateKitDistrict(p.fp, { profile: p.plan, time: mode === "night" ? "night" : "day", seed: 7, flat: mode === "flat" });
    console.log(`v4-${mode} ${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))} parts ${c.parts.length}`);
  }
}
console.log("\n## synthetic profiles (kit-v4)");
for (const prof of ["mixed", "portal", "product", "reference"] as const) console.log(`v4 ${prof} ${sha(JSON.stringify(generateKitDistrict(vacantFingerprint(), { profile: prof }).parts))}`);
console.log("\n## previous tables");
for (const f of ["docs/real-pages/tables.md", "docs/semantic-allocation/tables.md", "docs/semantic-hygiene/tables.md"]) console.log(`${f} ${sha(readFileSync(f))}`);
