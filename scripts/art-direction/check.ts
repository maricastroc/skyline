// Art Direction v1 — freeze check: npm run test:art-direction
// 1. The current kit is byte-identical to its frozen baseline (kit-v12) for every corpus page
//    (day, golden, night, flat): the whole city object, environment included.
// 2. kit-v12 itself reproduces the hashes recorded at the freeze (kit-v12.sha1.json).
// 3. The frozen chain still holds inside kit-v12: atmosphere off → kit-v11, street life off →
//    kit-v10, art direction off → kit-v9 (foundation v1).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g9 } from "../../src/lib/pixelcity/kit-v9/district";
import { realPage as r9 } from "../../src/lib/pixelcity/kit-v9/real-page";
import { generateKitDistrict as g10 } from "../../src/lib/pixelcity/kit-v10/district";
import { realPage as r10 } from "../../src/lib/pixelcity/kit-v10/real-page";
import { generateKitDistrict as g11 } from "../../src/lib/pixelcity/kit-v11/district";
import { realPage as r11 } from "../../src/lib/pixelcity/kit-v11/real-page";
import { generateKitDistrict as g12 } from "../../src/lib/pixelcity/kit-v12/district";
import { realPage as r12 } from "../../src/lib/pixelcity/kit-v12/real-page";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const MODES = [["day", false], ["golden", false], ["night", false], ["day", true]] as const;
const recorded = JSON.parse(readFileSync("scripts/art-direction/kit-v12.sha1.json", "utf8")) as Record<string, string>;

let same = 0;
let reproduced = 0;
let chain = 0;
const moved: string[] = [];
for (const e of DATASET) {
  const s = snap(e.id);
  const p = realPage(s);
  const q = r12(s);
  const q11 = r11(s);
  const q10 = r10(s);
  const q9 = r9(s);
  for (const [time, flat] of MODES) {
    const key = `${e.id}/${time}${flat ? "/flat" : ""}`;
    const b = g12(q.fp, { profile: q.plan, time, seed: 7, flat });
    if (sha(generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat })) === sha(b)) same++;
    else moved.push(key);
    if (recorded[key] === sha(b)) reproduced++;
    const o = { profile: q.plan, time, seed: 7, flat } as const;
    if (
      sha(g12(q.fp, { ...o, atmosphere: false })) === sha(g11(q11.fp, { profile: q11.plan, time, seed: 7, flat })) &&
      sha(g12(q.fp, { ...o, streetLife: false })) === sha(g10(q10.fp, { profile: q10.plan, time, seed: 7, flat })) &&
      sha(g12(q.fp, { ...o, artDirection: false })) === sha(g9(q9.fp, { profile: q9.plan, time, seed: 7, flat }))
    )
      chain++;
  }
}
const n = DATASET.length * MODES.length;
check("current kit byte-identical to Art Direction v1 (kit-v12) (day, golden, night, flat)", same === n, `${same}/${n}${moved.length ? `; moved: ${moved.join(", ")}` : ""}`);
check("kit-v12 reproduces the city hashes recorded at the freeze", reproduced === n, `${reproduced}/${n}`);
check("inside kit-v12: atmosphere off → kit-v11, street life off → kit-v10, art direction off → kit-v9", chain === n, `${chain}/${n}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall art direction checks passed");
process.exit(failed ? 1 : 0);
