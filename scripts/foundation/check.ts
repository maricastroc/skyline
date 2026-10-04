// Semantic / architectural foundation v1 — freeze check:
//   npm run test:foundation
// 1. The current kit's page model is the frozen baseline's (kit-v9).
// 2. Everything the foundation decides is byte-identical to kit-v9 for every corpus page (day,
//    night, flat): the allocation, every part of every block (lots, pieces, buildings, plazas, yards)
//    and the trace of buildings, pieces, landmark and frontage. Only the scene downstream of the
//    foundation (art direction: street surfaces, signals, traffic) may differ; with the art
//    direction layer switched off (`artDirection: false`) the whole city is kit-v9's, byte for byte.
// 3. kit-v9 itself still reproduces the city hashes recorded at the freeze (kit-v9.sha1.json).
// 4. Every older frozen kit still builds the corpus.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
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
import { generateKitDistrict as g9, newTrace as newTrace9, type KitTrace as KitTrace9 } from "../../src/lib/pixelcity/kit-v9/district";
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

// What the foundation decided, without the part indices (the scene before the blocks may change length).
const decided = (t: KitTrace | KitTrace9) =>
  JSON.stringify({
    alloc: { path: t.alloc!.path, owner: Array.from(t.alloc!.owner), segments: t.alloc!.segments, lots: t.alloc!.lots },
    buildings: t.buildings.map((b) => ({ ...b, parts: b.parts[1] - b.parts[0] })),
    pieces: t.pieces.map((pc) => ({ ...pc, parts: pc.parts[1] - pc.parts[0] })),
    landmark: t.landmark,
    frontage: t.frontage,
  });
const recorded = JSON.parse(readFileSync("scripts/foundation/kit-v9.sha1.json", "utf8")) as Record<string, string>;
// The blocks of a city. The flat view filters signs, people and glows out AFTER generation, so the
// trace's indices (which count them) are mapped onto the filtered list.
const kept = (q: { mesh: string }) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow";
const blocksOf = (parts: Array<{ mesh: string }>, range: [number, number], full: Array<{ mesh: string }> | null) => {
  if (!full) return parts.slice(range[0], range[1]);
  const from = full.slice(0, range[0]).filter(kept).length;
  return parts.slice(from, from + full.slice(range[0], range[1]).filter(kept).length);
};
let same = 0;
let plans = 0;
let reproduced = 0;
let ablated = 0;
const moved: string[] = [];
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const q = r9(snap(e.id));
  if (JSON.stringify(p.plan) === JSON.stringify(q.plan)) plans++;
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const ta = newTrace();
    const tb = newTrace9();
    const a = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat, trace: ta });
    const b = g9(q.fp, { profile: q.plan, time, seed: 7, flat, trace: tb });
    // For the flat view, the same city unfiltered tells which parts the filter removed.
    const fullA = flat ? generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7 }).parts : null;
    const fullB = flat ? g9(q.fp, { profile: q.plan, time, seed: 7 }).parts : null;
    const blocksA = sha(JSON.stringify(blocksOf(a.parts, ta.range, fullA)));
    const blocksB = sha(JSON.stringify(blocksOf(b.parts, tb.range, fullB)));
    if (blocksA === blocksB && decided(ta) === decided(tb)) same++;
    else moved.push(`${e.id}/${time}${flat ? "/flat" : ""}`);
    if (recorded[`${e.id}/${time}${flat ? "/flat" : ""}`] === sha(JSON.stringify([b.parts, b.signs]))) reproduced++;
    const off = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat, artDirection: false });
    if (sha(JSON.stringify([off.parts, off.signs])) === sha(JSON.stringify([b.parts, b.signs]))) ablated++;
  }
}
check("page model (territories, structure, items) identical to the frozen foundation (kit-v9)", plans === DATASET.length, `${plans}/${DATASET.length}`);
check("allocation, blocks (lots, pieces, buildings) and their trace byte-identical to kit-v9 (day, night, flat)", same === DATASET.length * 3, `${same}/${DATASET.length * 3}${moved.length ? `; moved: ${moved.join(", ")}` : ""}`);
check("with the art direction layer off, the whole city is byte-identical to kit-v9 (day, night, flat)", ablated === DATASET.length * 3, `${ablated}/${DATASET.length * 3}`);
check("kit-v9 reproduces the city hashes recorded at the freeze (day, night, flat)", reproduced === DATASET.length * 3, `${reproduced}/${DATASET.length * 3}`);

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
