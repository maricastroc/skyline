import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict, LINES, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g10, newTrace as newTrace10 } from "../../src/lib/pixelcity/kit-v10/district";
import { realPage as r10 } from "../../src/lib/pixelcity/kit-v10/real-page";
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
  const c = generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed, trace: t });
  return { p, t, c };
};
const intensities = (t: KitTrace) => JSON.stringify([t.life!.sides.map((s) => [s.footfall, s.canopy, s.busStop]), t.life!.segments.map((s) => s.traffic)]);
const sprites = (c: { parts: Part[] }, t: KitTrace) => c.parts.slice(t.scene!.furniture[0], t.scene!.traffic[1]).filter((q) => q.mesh === "sprite").length;
const runs = DATASET.map((e) => ({ id: e.id, ...build(e.id) }));

let ablated = 0;
let rolesSame = 0;
let blocksSame = 0;
for (const r of runs) {
  const q = r10(snap(r.id));
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const a = generateKitDistrict(r.p.fp, { polishAssets: false, profile: r.p.plan, time, seed: 7, flat, streetLife: false });
    const b = g10(q.fp, { profile: q.plan, time, seed: 7, flat });
    if (sha(JSON.stringify([a.parts, a.signs])) === sha(JSON.stringify([b.parts, b.signs]))) ablated++;
  }
  const tb = newTrace10();
  const b = g10(q.fp, { profile: q.plan, time: "day", seed: 7, trace: tb });
  if (JSON.stringify(r.t.streets) === JSON.stringify(tb.streets)) rolesSame++;
  if (sha(JSON.stringify(r.c.parts.slice(...r.t.range))) === sha(JSON.stringify(b.parts.slice(...tb.range)))) blocksSame++;
}
check("with street life off, the whole city is byte-identical to kit-v10 (C1) (day, night, flat)", ablated === runs.length * 3, `${ablated}/${runs.length * 3}`);
check("C1 street roles unchanged (identical to kit-v10)", rolesSame === runs.length, `${rolesSame}/${runs.length}`);
check("blocks (lots, pieces, buildings) byte-identical to kit-v10", blocksSame === runs.length, `${blocksSame}/${runs.length}`);

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
check("the sidewalk layer is no longer a stamp (parts identical in all 8 audit pages < 10%)", common / avg < 0.1, `${common} common parts, ${((100 * common) / avg).toFixed(1)}% of a page's (kit-v10: 100%)`);

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
    generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed: 7, trace: t });
    t.life!.sides.forEach((s, k) => {
      change += Math.abs(s.footfall - r.t.life!.sides[k].footfall) + Math.abs(s.canopy - r.t.life!.sides[k].canopy);
      n += 2;
    });
  }
check("small page edits (text ±10%, links −10%, drop a section) move sidewalk intensities by < 0.05 on average", change / n < 0.05, `mean |Δ| ${(change / n).toFixed(3)}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall street-life checks passed");
process.exit(failed ? 1 : 0);
