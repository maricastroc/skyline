import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit-v9/district";
import { realPage } from "../../src/lib/pixelcity/kit-v9/real-page";
import { DATASET } from "../real-pages/dataset";

const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const out: Record<string, string> = {};
for (const e of DATASET) {
  const q = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8")));
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const c = generateKitDistrict(q.fp, { profile: q.plan, time, seed: 7, flat });
    out[`${e.id}/${time}${flat ? "/flat" : ""}`] = sha(JSON.stringify([c.parts, c.signs]));
  }
}
writeFileSync("scripts/foundation/kit-v9.sha1.json", JSON.stringify(out, null, 1) + "\n");
console.log(`recorded ${Object.keys(out).length} kit-v9 city hashes`);
