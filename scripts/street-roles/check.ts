import { readFileSync } from "node:fs";
import { generateKitDistrict, LINES, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import { planStreets, type StreetRole } from "../../src/lib/pixelcity/kit/street-roles";
import { allocate } from "../../src/lib/pixelcity/kit/territory";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const ROLES: StreetRole[] = ["primary", "street", "lane", "pedestrian"];
const build = (id: string, seed = 7) => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, trace: t });
  return { p, t, c };
};
const key = (t: KitTrace) => JSON.stringify(t.streets!.map((s) => s.role));
const inner = (t: KitTrace) => t.streets!.filter((s) => s.line > 0 && s.line < 4);
const shares = (t: KitTrace) => ROLES.map((r) => inner(t).filter((s) => s.role === r).length / 24);

const runs = DATASET.map((e) => ({ id: e.id, ...build(e.id) }));

let seedFree = 0;
let fromPlan = 0;
for (const r of runs) {
  if (key(build(r.id, 8).t) === key(r.t) && key(build(r.id, 11).t) === key(r.t)) seedFree++;
  if (JSON.stringify(planStreets(r.p.plan, allocate(r.p.plan)).segments) === JSON.stringify(r.t.streets)) fromPlan++;
}
check("street roles do not depend on the seed (7 / 8 / 11)", seedFree === runs.length, `${seedFree}/${runs.length}`);
check("street roles are a function of the plan and its allocation only", fromPlan === runs.length, `${fromPlan}/${runs.length}`);

const src = ["src/lib/pixelcity/kit/street-roles.ts", "src/lib/pixelcity/kit/street.ts"]
  .map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))
  .join("\n");
const site = /hostname|location\.|\burl\b|siteName|wikipedia|ikea|craigslist|graham|nasa|linear|gov\.uk|python/i;
check("no hostname, URL or site name in the street-role code", !site.test(src), site.exec(src)?.[0] ?? "");

const B = 14;
let outside = 0;
let surfaces = 0;
for (const r of runs) {
  const blocks: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blocks.push([(LINES[i] + LINES[i + 1]) / 2, (LINES[j] + LINES[j + 1]) / 2]);
  let bad = 0;
  for (const q of r.c.parts.slice(0, r.t.range[0])) {
    surfaces++;
    for (const [bx, bz] of blocks) {
      const ox = Math.min(q.x + q.w / 2, bx + B / 2) - Math.max(q.x - q.w / 2, bx - B / 2);
      const oz = Math.min(q.z + q.d / 2, bz + B / 2) - Math.max(q.z - q.d / 2, bz - B / 2);
      if (ox > 1e-6 && oz > 1e-6) bad++;
    }
  }
  if (bad === 0) outside++;
}
check("street surfaces stay inside the street corridors (no part over a block)", outside === runs.length, `${outside}/${runs.length} pages, ${surfaces} surface parts`);

const kept = (q: { mesh: string }) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow";
const blocksOf = (parts: Array<{ mesh: string }>, range: [number, number], full: Array<{ mesh: string }> | null) => {
  if (!full) return parts.slice(range[0], range[1]);
  const from = full.slice(0, range[0]).filter(kept).length;
  return parts.slice(from, from + full.slice(range[0], range[1]).filter(kept).length);
};
const decided = (t: KitTrace) =>
  JSON.stringify({
    alloc: { path: t.alloc!.path, owner: Array.from(t.alloc!.owner), segments: t.alloc!.segments, lots: t.alloc!.lots },
    buildings: t.buildings.map((b) => ({ ...b, parts: b.parts[1] - b.parts[0] })),
    pieces: t.pieces.map((pc) => ({ ...pc, parts: pc.parts[1] - pc.parts[0] })),
    landmark: t.landmark,
    frontage: t.frontage,
  });
let furniture = 0;
let blocks = 0;
const moved: string[] = [];
for (const r of runs) {
  const ta: KitTrace = newTrace();
  const tb: KitTrace = newTrace();
  const a = generateKitDistrict(r.p.fp, { profile: r.p.plan, time: "day", seed: 7, trace: ta, streetLife: false });
  const b = generateKitDistrict(r.p.fp, { profile: r.p.plan, time: "day", seed: 7, trace: tb, artDirection: false });
  const [f0, f1] = ta.scene!.furniture;
  if (JSON.stringify(a.parts.slice(f0, f1)) === JSON.stringify(b.parts.slice(tb.range[1], tb.range[1] + (f1 - f0)))) furniture++;
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const on: KitTrace = newTrace();
    const off: KitTrace = newTrace();
    const c = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, flat, trace: on });
    const d = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, flat, trace: off, artDirection: false });
    const fullC = flat ? generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7 }).parts : null;
    const fullD = flat ? generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, artDirection: false }).parts : null;
    if (decided(on) === decided(off) && JSON.stringify(blocksOf(c.parts, on.range, fullC)) === JSON.stringify(blocksOf(d.parts, off.range, fullD))) blocks++;
    else moved.push(`${r.id}/${time}${flat ? "/flat" : ""}`);
  }
}
check("art direction on × off: allocation, blocks (lots, pieces, buildings) and their trace byte-identical (day, night, flat)", blocks === runs.length * 3, `${blocks}/${runs.length * 3}${moved.length ? `; moved: ${moved.join(", ")}` : ""}`);
check("street roles move streets only: with street life off, sidewalk furniture identical to art direction off", furniture === runs.length, `${furniture}/${runs.length}`);

const usedBy = ROLES.map((role) => runs.filter((r) => inner(r.t).some((s) => s.role === role)).length);
check("each of the four roles appears in at least 3 corpus pages", usedBy.every((n) => n >= 3), ROLES.map((r, i) => `${r} ${usedBy[i]}`).join(", "));

const dist = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / 2;
const pairs: number[] = [];
for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) pairs.push(dist(shares(runs[i].t), shares(runs[j].t)));
pairs.sort((a, b) => a - b);
const median = pairs[Math.floor(pairs.length / 2)];
const by = (id: string) => runs.find((r) => r.id === id)!.t;
const wiki = dist(shares(by("reference")), shares(by("reference-2")));
check("Wikipedia × Wikipedia closer than the median pair (role shares, inner streets)", wiki < median, `${wiki.toFixed(2)} vs median ${median.toFixed(2)}; Wikipedia × Paul Graham ${dist(shares(by("reference")), shares(by("oldweb"))).toFixed(2)}`);

let changed = 0;
let total = 0;
for (const r of runs)
  for (const pt of PERTURBATIONS) {
    const p = realPage(snap(r.id), pt);
    const s = planStreets(p.plan, allocate(p.plan)).segments;
    s.forEach((sg, k) => {
      total++;
      if (sg.role !== r.t.streets![k].role) changed++;
    });
  }
check("small page edits (text ±10%, links −10%, drop a section) change at most 15% of street roles", changed / total <= 0.15, `${((changed / total) * 100).toFixed(1)}% of ${total} segment roles`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall street-role checks passed");
process.exit(failed ? 1 : 0);
