// Semantic / architectural foundation v1 — freeze check:
//   npm run test:foundation
// The current kit is byte-identical to its frozen baseline (kit-v9) for every corpus page (day,
// night, flat), its page model is the baseline's, and every older frozen kit still builds the corpus.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g2 } from "../../src/lib/pixelcity/kit-v2/district";
import { realPage as r2 } from "../../src/lib/pixelcity/kit-v2/real-page";
import { generateKitDistrict as g3 } from "../../src/lib/pixelcity/kit-v3/district";
import { realPage as r3 } from "../../src/lib/pixelcity/kit-v3/real-page";
import { generateKitDistrict as g4 } from "../../src/lib/pixelcity/kit-v4/district";
import { realPage as r4 } from "../../src/lib/pixelcity/kit-v4/real-page";
import { generateKitDistrict as g5 } from "../../src/lib/pixelcity/kit-v5/district";
import { realPage as r5 } from "../../src/lib/pixelcity/kit-v5/real-page";
import { generateKitDistrict as g6 } from "../../src/lib/pixelcity/kit-v6/district";
import { realPage as r6 } from "../../src/lib/pixelcity/kit-v6/real-page";
import { generateKitDistrict as g7 } from "../../src/lib/pixelcity/kit-v7/district";
import { realPage as r7 } from "../../src/lib/pixelcity/kit-v7/real-page";
import { generateKitDistrict as g8 } from "../../src/lib/pixelcity/kit-v8/district";
import { realPage as r8 } from "../../src/lib/pixelcity/kit-v8/real-page";
import { generateKitDistrict as g9 } from "../../src/lib/pixelcity/kit-v9/district";
import { realPage as r9 } from "../../src/lib/pixelcity/kit-v9/real-page";
import { generateKitDistrict as g1 } from "../../src/lib/pixelcity/kit-v1/district";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;

let same = 0;
let plans = 0;
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const q = r9(snap(e.id));
  if (JSON.stringify(p.plan) === JSON.stringify(q.plan)) plans++;
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const a = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat });
    const b = g9(q.fp, { profile: q.plan, time, seed: 7, flat });
    if (sha(JSON.stringify([a.parts, a.signs])) === sha(JSON.stringify([b.parts, b.signs]))) same++;
  }
}
check("page model (territories, structure, items) identical to the frozen foundation (kit-v9)", plans === DATASET.length, `${plans}/${DATASET.length}`);
check("city (day, night, flat) byte-identical to the frozen foundation (kit-v9)", same === DATASET.length * 3, `${same}/${DATASET.length * 3}`);

// Older frozen kits: each still builds every corpus page (v1 has no page input: its one district).
const kits: Array<[string, (s: DomSnapshot) => number]> = [
  ["v2", (s) => { const p = r2(s); return g2(p.fp, { profile: p.profile, seed: 7 }).parts.length; }],
  ["v3", (s) => { const p = r3(s); return g3(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
  ["v4", (s) => { const p = r4(s); return g4(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
  ["v5", (s) => { const p = r5(s); return g5(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
  ["v6", (s) => { const p = r6(s); return g6(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
  ["v7", (s) => { const p = r7(s); return g7(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
  ["v8", (s) => { const p = r8(s); return g8(p.fp, { profile: p.plan, seed: 7 }).parts.length; }],
];
let built = 0;
const broken: string[] = [];
for (const [v, build] of kits)
  for (const e of DATASET) {
    try {
      if (build(snap(e.id)) > 0) built++;
      else broken.push(`${v}/${e.id}`);
    } catch {
      broken.push(`${v}/${e.id}`);
    }
  }
const v1 = r2(snap(DATASET[0].id)).fp;
check("every older frozen kit (v1–v8) still builds", built === kits.length * DATASET.length && g1(v1, {}).parts.length > 0, `${built}/${kits.length * DATASET.length} page builds${broken.length ? `; broken: ${broken.join(", ")}` : ""}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall foundation checks passed");
process.exit(failed ? 1 : 0);
