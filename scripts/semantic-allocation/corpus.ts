// Corpus fingerprint: npx tsx scripts/semantic-allocation/corpus.ts > docs/semantic-allocation/corpus.txt
// Hashes everything a BEFORE/AFTER comparison depends on, so both sides provably use the same inputs.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict as v2 } from "../../src/lib/pixelcity/kit-v2/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit-v2/real-page";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";

const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
console.log(`# Corpus fingerprint (${new Date().toISOString().slice(0, 10)})`);
console.log(`seeds: 7 (base), 8 9 10 (seed control) · time: day · viewport 1440×900 @2x · camera: KitView CITY (azimuth 45, zoom 0.9)`);
console.log(`perturbations: ${PERTURBATIONS.join(", ")}`);
console.log(`\n## snapshots (sha1 of the frozen file)`);
for (const e of DATASET) console.log(`${e.id.padEnd(12)} ${sha(readFileSync(`docs/real-pages/snapshots/${e.id}.json`))}`);
console.log(`\n## BEFORE cities (kit-v2, seed 7, day): sha1 of parts+signs`);
for (const e of DATASET) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8")));
  const c = v2(p.fp, { profile: p.profile, time: "day", seed: 7 });
  console.log(`${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))}`);
}
console.log(`\n## massing-pass profiles (kit-v2): sha1 of parts+signs+smoke+time`);
const fp = vacantFingerprint();
for (const p of ["mixed", "portal", "product", "reference"] as const)
  for (const flat of [false, true]) {
    const c = v2(fp, { profile: p, flat });
    console.log(`${p} ${flat ? "flat" : "full"} ${sha(JSON.stringify([c.parts, c.signs, c.smokestacks, c.grammar.time]))}`);
  }
console.log(`\n## baseline tables (docs/real-pages/tables.md, report.json)`);
console.log(`tables.md   ${sha(readFileSync("docs/real-pages/tables.md"))}`);
console.log(`report.json ${sha(readFileSync("docs/real-pages/report.json"))}`);
