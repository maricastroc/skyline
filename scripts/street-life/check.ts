import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict, LINES, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { PEOPLE_ATLAS } from "../../src/lib/pixelcity/kit/people";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const build = (id: string, seed = 7) => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, trace: t });
  return { p, t, c };
};
const intensities = (t: KitTrace) => JSON.stringify([t.life!.sides.map((s) => [s.footfall, s.canopy, s.busStop]), t.life!.segments.map((s) => s.traffic)]);
const sprites = (c: { parts: Part[] }, t: KitTrace) => c.parts.slice(t.scene!.furniture[0], t.scene!.traffic[1]).filter((q) => q.mesh === "sprite").length;
const runs = DATASET.map((e) => ({ id: e.id, ...build(e.id) }));

let rolesSame = 0;
let blocksSame = 0;
for (const r of runs) {
  const tb: KitTrace = newTrace();
  const b = generateKitDistrict(r.p.fp, { profile: r.p.plan, time: "day", seed: 7, trace: tb, streetLife: false });
  if (JSON.stringify(r.t.streets) === JSON.stringify(tb.streets)) rolesSame++;
  if (sha(JSON.stringify(r.c.parts.slice(...r.t.range))) === sha(JSON.stringify(b.parts.slice(...tb.range)))) blocksSame++;
}
check("street life on × off: street roles identical", rolesSame === runs.length, `${rolesSame}/${runs.length}`);
check("street life on × off: blocks (lots, pieces, buildings) byte-identical", blocksSame === runs.length, `${blocksSame}/${runs.length}`);

let seedFree = 0;
let moved = 0;
for (const r of runs) {
  const others = [8, 11].map((s) => build(r.id, s));
  if (others.every((o) => intensities(o.t) === intensities(r.t) && sprites(o.c, o.t) === sprites(r.c, r.t))) seedFree++;
  const [f0, f1] = r.t.scene!.furniture;
  const [g0, g1] = others[0].t.scene!.furniture;
  if (JSON.stringify(r.c.parts.slice(f0, f1)) !== JSON.stringify(others[0].c.parts.slice(g0, g1))) moved++;
}
check("intensities and people counts do not depend on the seed (7 / 8 / 11)", seedFree === runs.length, `${seedFree}/${runs.length}`);
check("the seed still moves positions within the counts", moved === runs.length, `${moved}/${runs.length}`);

const src = readFileSync("src/lib/pixelcity/kit/street-life.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const site = /hostname|location\.|\burl\b|siteName|wikipedia|ikea|craigslist|graham|nasa|linear|gov\.uk|python/i;
check("no hostname, URL or site name in the street-life code", !site.test(src), site.exec(src)?.[0] ?? "");

const key = (q: Part) => `${q.mesh}|${q.x.toFixed(3)}|${q.y.toFixed(3)}|${q.z.toFixed(3)}|${q.w.toFixed(3)}|${q.h.toFixed(3)}|${q.d.toFixed(3)}`;
const audit = ["shop", "oldweb", "directory", "institution", "reference", "media", "saas", "docs"].map((id) => runs.find((r) => r.id === id)!);
const sets = audit.map((r) => new Set(r.c.parts.slice(...r.t.scene!.furniture).map(key)));
const common = [...sets[0]].filter((k) => sets.every((s) => s.has(k))).length;
const avg = sets.reduce((s, x) => s + x.size, 0) / sets.length;
check("the sidewalk layer is no longer a stamp (parts identical in all 8 audit pages < 10%)", common / avg < 0.1, `${common} common parts, ${((100 * common) / avg).toFixed(1)}% of a page's`);

const B = 14;
let inside = 0;
let onPromenade = 0;
for (const r of runs) {
  const blocks: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blocks.push([(LINES[i] + LINES[i + 1]) / 2, (LINES[j] + LINES[j + 1]) / 2]);
  for (const q of r.c.parts.slice(r.t.scene!.furniture[0], r.t.scene!.traffic[1])) {
    if (q.mesh === "sprite") continue;
    const turned = Math.abs(Math.sin(q.rotY)) > 0.5;
    const [w, d] = turned ? [q.d, q.w] : [q.w, q.d];
    for (const [bx, bz] of blocks) {
      const ox = Math.min(q.x + w / 2, bx + B / 2) - Math.max(q.x - w / 2, bx - B / 2);
      const oz = Math.min(q.z + d / 2, bz + B / 2) - Math.max(q.z - d / 2, bz - B / 2);
      if (ox > 0.05 && oz > 0.05) inside++;
    }
  }
  const ped = r.t.streets!.filter((s) => s.role === "pedestrian");
  for (const q of r.c.parts.slice(...r.t.scene!.traffic)) {
    if (q.mesh !== "glow") continue;
    for (const s of ped) {
      const c = LINES[s.line];
      const a = LINES[s.span] + 1.3;
      const b = LINES[s.span + 1] - 1.3;
      const [u, v] = s.axis === "x" ? [q.x, q.z] : [q.z, q.x];
      if (u > a && u < b && Math.abs(v - c) < 1.3) onPromenade++;
    }
  }
}
check("no street-life footprint over a block (furniture, crossings, traffic; people are billboards)", inside === 0, `${inside} parts`);
check("no car on a promenade", onPromenade === 0, `${onPromenade} vehicle lights`);

const profile = (t: KitTrace) => {
  const m = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  return [m(t.life!.sides.map((s) => s.footfall)), m(t.life!.sides.map((s) => s.canopy)), m(t.life!.segments.map((s) => s.traffic))];
};
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, k) => v - b[k]));
const pairs: number[] = [];
for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) pairs.push(dist(profile(runs[i].t), profile(runs[j].t)));
pairs.sort((a, b) => a - b);
const median = pairs[Math.floor(pairs.length / 2)];
const by = (id: string) => runs.find((r) => r.id === id)!.t;
const wiki = dist(profile(by("reference")), profile(by("reference-2")));
check("Wikipedia × Wikipedia closer than the median pair (footfall, canopy, traffic)", wiki < median, `${wiki.toFixed(3)} vs median ${median.toFixed(3)}; Wikipedia × Paul Graham ${dist(profile(by("reference")), profile(by("oldweb"))).toFixed(3)}`);

let change = 0;
let n = 0;
for (const r of runs)
  for (const pt of PERTURBATIONS) {
    const p = realPage(snap(r.id), pt);
    const t: KitTrace = newTrace();
    generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
    t.life!.sides.forEach((s, k) => {
      change += Math.abs(s.footfall - r.t.life!.sides[k].footfall) + Math.abs(s.canopy - r.t.life!.sides[k].canopy);
      n += 2;
    });
  }
check("small page edits (text ±10%, links −10%, drop a section) move sidewalk intensities by < 0.05 on average", change / n < 0.05, `mean |Δ| ${(change / n).toFixed(3)}`);

const isShadow = (q: Part) => q.mesh === "box" && q.w === 0.17 && q.h === 0.006 && q.d === 0.1;
const isPerson = (q: Part) => q.mesh === "sprite" || isShadow(q);
const seatedOf = (q: Part) => {
  const [x, y, w] = q.rect!;
  return ((y / PEOPLE_ATLAS.ch) * (PEOPLE_ATLAS.w / PEOPLE_ATLAS.cw) + (w < 0 ? x - PEOPLE_ATLAS.cw : x) / PEOPLE_ATLAS.cw) % 4 === 3;
};
const shapes = (ps: Part[]) => ps.map((q) => JSON.stringify([q.mesh, q.w, q.h, q.d, q.color, q.surf, q.lit, q.rotY])).sort().join("|");
const loose = (c: { parts: Part[] }) => {
  const seats = c.parts.filter((q) => (q.mesh === "box" && q.h === 0.03 && q.w === 0.62) || (q.mesh === "box" && q.w === 0.12 && q.h === 0.12) || (q.mesh === "cyl" && q.w === 1.3 && q.h === 0.16));
  return c.parts.filter((q) => q.mesh === "sprite" && seatedOf(q) && !seats.some((s) => (s.mesh === "cyl" ? Math.abs(Math.hypot(q.x - s.x, q.z - s.z) - 0.65) < 0.2 : Math.hypot(q.x - s.x, q.z - s.z) < 0.35))).length;
};
let layout = 0;
let kept = 0;
let furnished = 0;
let seatedOn = 0;
let seatedMore = 0;
for (const r of runs)
  for (const time of ["day", "night"] as const) {
    const ta: KitTrace = newTrace();
    const tb: KitTrace = newTrace();
    const a = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, trace: ta, scenes: false });
    const b = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, trace: tb, actors: false, scenes: false });
    const cut = (c: Part[], t: KitTrace) => [c.slice(0, t.range[0]), c.slice(...t.range), c.slice(t.range[1], t.scene!.furniture[0]), c.slice(...t.scene!.furniture), c.slice(t.scene!.furniture[1])];
    const A = cut(a.parts, ta);
    const B = cut(b.parts, tb);
    if (a.parts.length === b.parts.length && JSON.stringify([ta.range, ta.scene]) === JSON.stringify([tb.range, tb.scene]) && A.every((x, k) => x.filter((q) => q.mesh === "sprite").length === B[k].filter((q) => q.mesh === "sprite").length)) layout++;
    if ([0, 1, 2, 4].every((k) => JSON.stringify(A[k].filter((q) => !isPerson(q))) === JSON.stringify(B[k].filter((q) => !isPerson(q)))) && JSON.stringify({ ...a, parts: null }) === JSON.stringify({ ...b, parts: null })) kept++;
    if (shapes(A[3].filter((q) => !isPerson(q))) === shapes(B[3].filter((q) => !isPerson(q)))) furnished++;
    if (loose(a) <= loose(b)) seatedOn++;
    if (a.parts.filter((q) => q.mesh === "sprite" && seatedOf(q)).length > b.parts.filter((q) => q.mesh === "sprite" && seatedOf(q)).length) seatedMore++;
  }
const nA = runs.length * 2;
check("actors on × off: same parts, same ranges, same people in blocks, sidewalks and corners (day, night)", layout === nA, `${layout}/${nA}`);
check("actors on × off: everything but people identical outside the sidewalk furniture — plazas keep their trees, benches, planters and fountains", kept === nA, `${kept}/${nA}`);
check("actors on × off: the same sidewalk furniture, only regrouped", furnished === nA, `${furnished}/${nA}`);
check("every person the actors seat sits on a bench, stool or fountain rim", seatedOn === nA, `${seatedOn}/${nA}`);
check("actors seat people where the corpus has seats", seatedMore >= runs.length, `${seatedMore}/${nA} cities with more people seated`);

const solidBox = (q: Part) => {
  if (q.mesh === "glow" || q.mesh === "sign" || q.y + q.h <= 0.125 || q.y > 1.2) return null;
  if (q.mesh === "sprite") return [q.x - 0.1, q.x + 0.1, q.z - 0.1, q.z + 0.1, q.y, q.y + q.h];
  const c = Math.abs(Math.cos(q.rotY));
  const s = Math.abs(Math.sin(q.rotY));
  const hw = (c * q.w + s * q.d) / 2 - 0.01;
  const hd = (s * q.w + c * q.d) / 2 - 0.01;
  return [q.x - hw, q.x + hw, q.z - hd, q.z + hd, q.y, q.y + q.h];
};
let prefix = 0;
let onStreet = 0;
let clear = 0;
let sparse = 0;
let storyCount = 0;
for (const r of runs)
  for (const time of ["day", "night"] as const) {
    const ta: KitTrace = newTrace();
    const a = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, trace: ta });
    const b = generateKitDistrict(r.p.fp, { profile: r.p.plan, time, seed: 7, scenes: false });
    const tail = a.parts.slice(b.parts.length);
    if (JSON.stringify(a.parts.slice(0, b.parts.length)) === JSON.stringify(b.parts) && JSON.stringify({ ...a, parts: null }) === JSON.stringify({ ...b, parts: null }) && JSON.stringify(ta.scene!.stories) === JSON.stringify([b.parts.length, a.parts.length])) prefix++;
    const blocks: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blocks.push([(LINES[i] + LINES[i + 1]) / 2, (LINES[j] + LINES[j + 1]) / 2]);
    if (tail.every((q) => !blocks.some(([bx, bz]) => Math.abs(q.x - bx) < 6.95 && Math.abs(q.z - bz) < 6.95))) onStreet++;
    const before = b.parts.map(solidBox).filter((x): x is number[] => !!x);
    if (tail.every((q) => {
      const t = solidBox(q);
      return !t || !before.some((o) => o[0] < t[1] && o[1] > t[0] && o[2] < t[3] && o[3] > t[2] && o[4] < t[5] && o[5] > t[4]);
    })) clear++;
    const n = (k: string) => ta.stories!.filter((x) => x.kind === k).length;
    if (n("loading") <= 3 && n("bikes") <= 4 && n("works") <= (ta.life!.movement >= 0.25 ? 1 : 0)) sparse++;
    if (time === "day") storyCount += ta.stories!.length;
  }
check("scenes on × off: the city without scenes is the exact start of the city with them (parts, signs, setting)", prefix === nA, `${prefix}/${nA}`);
check("scene parts stand on sidewalks and lanes, never over a block", onStreet === nA, `${onStreet}/${nA}`);
check("scene parts never overlap anything that was already there", clear === nA, `${clear}/${nA}`);
check("scenes stay sparse: ≤ 3 loading, ≤ 4 bike racks, ≤ 1 road works and only in a busy city", sparse === nA, `${sparse}/${nA}, ${storyCount} scenes over ${runs.length} cities`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall street-life checks passed");
process.exit(failed ? 1 : 0);
