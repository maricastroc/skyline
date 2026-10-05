import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit-v3/district";
import { realPage } from "../../src/lib/pixelcity/kit-v3/real-page";
import { generateKitDistrict as v2 } from "../../src/lib/pixelcity/kit-v2/district";
import { realPage as realPageV2 } from "../../src/lib/pixelcity/kit-v2/real-page";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";

const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
console.log("# Corpus fingerprint before the semantic hygiene pass");
console.log("seeds 7 (8 9 10 control) · day · 1440×900 @2x · KitView CITY · perturbations text-10 text+10 links-10 drop-secondary");
console.log("\n## snapshots");
for (const e of DATASET) console.log(`${e.id.padEnd(12)} ${sha(readFileSync(`docs/real-pages/snapshots/${e.id}.json`))}`);
console.log("\n## allocation pass (kit-v3) cities, seed 7 day: parts+signs");
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7 });
  console.log(`v3 ${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))}`);
}
console.log("\n## allocation pass (kit-v3) provenance view, seed 7 day");
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, provenance: true });
  console.log(`v3p ${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))}`);
}
console.log("\n## kit-v2 cities, seed 7 day");
for (const e of DATASET) {
  const p = realPageV2(snap(e.id));
  const c = v2(p.fp, { profile: p.profile, time: "day", seed: 7 });
  console.log(`v2 ${e.id.padEnd(12)} ${sha(JSON.stringify([c.parts, c.signs]))}`);
}
console.log("\n## synthetic profiles under the allocation pass (kit-v3)");
for (const prof of ["mixed", "portal", "product", "reference"] as const) console.log(`v3 ${prof} ${sha(JSON.stringify(generateKitDistrict(vacantFingerprint(), { profile: prof }).parts))}`);
console.log("\n## previous tables");
for (const f of ["docs/real-pages/tables.md", "docs/semantic-allocation/tables.md", "docs/semantic-allocation/report.json"]) console.log(`${f} ${sha(readFileSync(f))}`);
