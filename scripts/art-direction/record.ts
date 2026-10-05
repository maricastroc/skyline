import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit-v12/district";
import { realPage } from "../../src/lib/pixelcity/kit-v12/real-page";
import { DATASET } from "../real-pages/dataset";

const sha = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex");
export const MODES = [["day", false], ["golden", false], ["night", false], ["day", true]] as const;
const out: Record<string, string> = {};
for (const e of DATASET) {
  const q = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8")));
  for (const [time, flat] of MODES) out[`${e.id}/${time}${flat ? "/flat" : ""}`] = sha(generateKitDistrict(q.fp, { profile: q.plan, time, seed: 7, flat }));
}
writeFileSync("scripts/art-direction/kit-v12.sha1.json", JSON.stringify(out, null, 1) + "\n");
console.log(`recorded ${Object.keys(out).length} kit-v12 city hashes`);
