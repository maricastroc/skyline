import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import { generateKitDistrict as v7, newTrace as newTraceV7, type KitTrace as KitTraceV7 } from "../../src/lib/pixelcity/kit-v7/district";
import { realPage as realPageV7 } from "../../src/lib/pixelcity/kit-v7/real-page";
import { DATASET } from "../real-pages/dataset";

const NAMES: Record<string, string> = { reference: "Wikipedia", docs: "Python Docs", app: "GitHub", saas: "Linear", shop: "IKEA", news: "Guardian", portfolio: "portfolio", forum: "lobste.rs", institution: "GOV.UK", oldweb: "Paul Graham", media: "NASA", directory: "craigslist", "reference-2": "Wikipedia 2", "saas-2": "Vercel" };
const USES = ["commercial", "residential", "office", "institutional", "service", "civic"];
const FALLBACK = "fallback — no matching architectural program";
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const pct = (a: number, b: number) => `${((100 * a) / Math.max(1, b)).toFixed(1)}%`;

type Vol = { page: string; use: string; reason: string; land: number };
const before: Vol[] = [];
const after: Vol[] = [];
const perPage: string[] = [];
const integrity: string[] = [];
const seeds: string[] = [];
let changedBuildings = 0;
let changedVolumes = 0;
let totalBuildings = 0;
const changedTerritories: string[] = [];

function landOf(t: KitTrace | KitTraceV7) {
  const out = new Map<number, number>();
  t.pieces.forEach((pc) => {
    const bs = t.buildings.map((b, i) => [b, i] as const).filter(([b]) => b.parts[0] >= pc.parts[0] && b.parts[1] <= pc.parts[1]);
    for (const [, i] of bs) out.set(i, pc.piece.lots / bs.length);
  });
  return out;
}
const outside = (parts: Part[], ranges: Array<[number, number]>) => parts.filter((_, i) => !ranges.some(([a, b]) => i >= a && i < b));
const bbox = (parts: Part[]) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y1 = -Infinity;
  for (const p of parts) {
    const c = Math.abs(Math.cos(p.rotY ?? 0));
    const s = Math.abs(Math.sin(p.rotY ?? 0));
    const hx = (c * p.w + s * p.d) / 2;
    const hz = (s * p.w + c * p.d) / 2;
    x0 = Math.min(x0, p.x - hx);
    x1 = Math.max(x1, p.x + hx);
    z0 = Math.min(z0, p.z - hz);
    z1 = Math.max(z1, p.z + hz);
    y1 = Math.max(y1, p.y + p.h);
  }
  return { x0, x1, z0, z1, y1 };
};

for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const q = realPageV7(snap(e.id));
  const run = (seed: number, flat = false) => {
    const ta = newTrace();
    const a = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, flat, trace: ta });
    const tb = newTraceV7();
    const b = v7(q.fp, { profile: q.plan, time: "day", seed, flat, trace: tb });
    return { a, ta, b, tb };
  };
  const { a, ta, b, tb } = run(7);
  if (ta.buildings.length !== tb.buildings.length) throw new Error(`${e.id}: building count differs`);
  totalBuildings += ta.buildings.length;
  const la = landOf(ta);
  const lb = landOf(tb);
  const changed: number[] = [];
  ta.buildings.forEach((B, i) => {
    const A0 = tb.buildings[i];
    if (B.territory !== A0.territory || B.comp !== A0.comp || B.piece !== A0.piece || B.block.join() !== A0.block.join()) throw new Error(`${e.id}: building ${i} moved`);
    const ua = B.anatomy.map((x) => x.use);
    const ub = A0.anatomy.map((x) => x.use);
    if (ua.join() !== ub.join()) changed.push(i);
    for (const x of B.anatomy) after.push({ page: e.id, use: x.use, reason: B.program.reason, land: (la.get(i) ?? 0) / Math.max(1, B.anatomy.length) });
    for (const x of A0.anatomy) before.push({ page: e.id, use: x.use, reason: A0.comp === "parcelled" && x.use === "commercial" ? FALLBACK : "other", land: (lb.get(i) ?? 0) / Math.max(1, A0.anatomy.length) });
  });
  changedBuildings += changed.length;
  changedVolumes += changed.reduce((s, i) => s + ta.buildings[i].anatomy.length, 0);
  const terr = [...new Set(changed.map((i) => ta.buildings[i].territory))];
  for (const ti of terr) {
    const T = p.plan.territories[ti];
    const bs = changed.filter((i) => ta.buildings[i].territory === ti);
    const it = T.items!;
    changedTerritories.push(`| ${NAMES[e.id]} | ${T.kind} | ${[...new Set(bs.map((i) => ta.buildings[i].comp))].join("+")} | ${it.count} × \`${it.shape}\`, ${it.linksPerItem} link, ${Math.round(it.charsPerItem)} chars, titled ${Math.round(it.titledShare * 100)}% (link ${Math.round(it.linkTitledShare * 100)}%) | ${bs.length} | ${[...new Set(bs.map((i) => ta.buildings[i].P.family))].join(", ")} | ${(bs.reduce((s, i) => s + ta.buildings[i].w, 0) / bs.length).toFixed(1)} |`);
  }
  const strip = (P: object) => {
    const c = { ...(P as Record<string, unknown>) };
    delete c.use;
    delete c.useReason;
    return JSON.stringify(c);
  };
  const programs = changed.every((i) => strip(ta.buildings[i].P) === strip(tb.buildings[i].P));
  const noRect = (ps: Part[]) => JSON.stringify(ps.filter((q) => q.mesh !== "sign"));
  const ra = changed.map((i) => ta.buildings[i].parts);
  const rb = changed.map((i) => tb.buildings[i].parts);
  const sameNormal = noRect(outside(a.parts, ra)) === noRect(outside(b.parts, rb));
  const keep = (q: Part) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow";
  const fa = run(7, true);
  const geom = (ps: Part[]) => JSON.stringify(ps.map((q) => [q.mesh, q.x, q.y, q.z, q.w, q.h, q.d, q.rotY]));
  const aligned = geom(a.parts.filter(keep)) === geom(fa.a.parts) && geom(b.parts.filter(keep)) === geom(fa.b.parts);
  const index = (ps: Part[]) => {
    const m: number[] = [];
    let n = 0;
    for (const q of ps) {
      m.push(n);
      if (keep(q)) n++;
    }
    m.push(n);
    return m;
  };
  const ma = index(a.parts);
  const mb = index(b.parts);
  const fra = ra.map(([x, y]) => [ma[x], ma[y]] as [number, number]);
  const frb = rb.map(([x, y]) => [mb[x], mb[y]] as [number, number]);
  const sameFlat = aligned && JSON.stringify(outside(fa.a.parts, fra)) === JSON.stringify(outside(fa.b.parts, frb));
  const inChanged = (n: number, rs: Array<[number, number]>) => pct(rs.reduce((s, [x, y]) => s + y - x, 0), n);
  const foot = changed.length ? Math.max(...changed.map((_, k) => {
    const A = bbox(a.parts.slice(...ra[k]).filter(keep));
    const B = bbox(b.parts.slice(...rb[k]).filter(keep));
    return Math.max(Math.abs(A.x0 - B.x0), Math.abs(A.x1 - B.x1), Math.abs(A.z0 - B.z0), Math.abs(A.z1 - B.z1));
  })) : 0;
  const heights = changed.map((_, k) => bbox(a.parts.slice(...ra[k]).filter(keep)).y1 - bbox(b.parts.slice(...rb[k]).filter(keep)).y1);
  integrity.push(`| ${NAMES[e.id]} | ${changed.length ? (programs ? "identical" : "**differ**") : "–"} | ${sameNormal ? "identical" : "**differs**"} | ${sameFlat ? "identical" : "**differs**"} | ${changed.length ? `${inChanged(b.parts.length, rb)} → ${inChanged(a.parts.length, ra)}` : "–"} | ${b.parts.length} → ${a.parts.length} | ${fa.b.parts.length} → ${fa.a.parts.length} | ${b.signs.length} → ${a.signs.length} | ${changed.length ? foot.toFixed(2) : "–"} | ${changed.length ? `${Math.min(...heights).toFixed(2)} … ${Math.max(...heights).toFixed(2)}` : "–"} |`);
  const sig = (t: KitTrace | KitTraceV7) => JSON.stringify(t.buildings.map((x) => x.anatomy.map((y) => y.use)));
  const sets = [7, 8, 9].map((s) => {
    const r = run(s);
    const ch = r.ta.buildings.map((x, i) => (x.anatomy.map((y) => y.use).join() !== r.tb.buildings[i].anatomy.map((y) => y.use).join() ? i : -1)).filter((i) => i >= 0);
    return { a: sig(r.ta), b: sig(r.tb), ch: JSON.stringify(ch), n: ch.length, reasons: JSON.stringify(r.ta.buildings.map((x) => x.program.reason)) };
  });
  const stable = (k: "a" | "b") => (sets.every((s) => s[k] === sets[0][k]) ? "identical" : "differ");
  seeds.push(`| ${NAMES[e.id]} | ${sets.map((s) => s.n).join(" / ")} | ${sets.every((s) => s.ch === sets[0].ch) ? "same buildings" : "**differ**"} | ${stable("b")} | ${stable("a")} | ${sets.every((s) => s.reasons === sets[0].reasons) ? "identical" : "differ"} |`);
  const share = (vs: Vol[], u: string) => pct(vs.filter((v) => v.page === e.id && v.use === u).length, vs.filter((v) => v.page === e.id).length);
  const fb = (vs: Vol[]) => pct(vs.filter((v) => v.page === e.id && v.reason === FALLBACK).length, vs.filter((v) => v.page === e.id).length);
  perPage.push(`| ${NAMES[e.id]} | ${share(before, "commercial")} → ${share(after, "commercial")} | ${share(before, "institutional")} → ${share(after, "institutional")} | ${fb(before)} → ${fb(after)} | ${changed.length} / ${ta.buildings.length} |`);
}

console.log("# Simple-index experiment — kit-v7 (BEFORE) × current (AFTER)\n");
console.log(`Generated by \`scripts/program/experiment.ts\`. ${after.length} volumes, ${totalBuildings} buildings, 14 pages, seed 7, day.\n`);
console.log("## 1. Corpus distribution (volumes · land)\n");
console.log("| use | BEFORE volumes | AFTER volumes | BEFORE land | AFTER land |");
console.log("|---|---|---|---|---|");
const land = (vs: Vol[]) => vs.reduce((s, v) => s + v.land, 0);
for (const u of USES) {
  const B = before.filter((v) => v.use === u);
  const A = after.filter((v) => v.use === u);
  console.log(`| ${u} | ${B.length} (${pct(B.length, before.length)}) | ${A.length} (${pct(A.length, after.length)}) | ${pct(land(B), land(before))} | ${pct(land(A), land(after))} |`);
}
const fbB = before.filter((v) => v.reason === FALLBACK);
const fbA = after.filter((v) => v.reason === FALLBACK);
console.log(`\n**Fallback share** (commercial with reason \`${FALLBACK}\`): ${fbB.length} (${pct(fbB.length, before.length)}) → ${fbA.length} (${pct(fbA.length, after.length)}) of volumes; ${pct(land(fbB), land(before))} → ${pct(land(fbA), land(after))} of land.\n`);
console.log("## 2. Program and reason (AFTER, volumes)\n");
console.log("| program | reason | volumes |");
console.log("|---|---|---|");
const keys = [...new Set(after.map((v) => `${v.use}|${v.reason}`))].sort();
for (const k of keys) {
  const [u, r] = k.split("|");
  console.log(`| ${u} | ${r} | ${after.filter((v) => v.use === u && v.reason === r).length} |`);
}
console.log("\n## 3. Per page\n");
console.log("| page | commercial | institutional | fallback | buildings changed |");
console.log("|---|---|---|---|---|");
for (const r of perPage) console.log(r);
console.log(`\n## 4. What changed\n\n${changedBuildings} of ${totalBuildings} buildings (${changedVolumes} volumes), in ${changedTerritories.length} territories:\n`);
console.log("| page | territory | composition | items | buildings | families | mean width |");
console.log("|---|---|---|---|---|---|---|");
for (const r of changedTerritories) console.log(r);
console.log("\n## 5. Nothing else moved (seed 7)\n");
console.log("Parts outside the changed buildings, compared in order (normal and flat); the changed buildings' programs, footprints (bounding box in plan, signs and glows excluded) and heights (top of the highest part: roof plant included).\n");
console.log("| page | changed buildings' programs (family, floors, roof, units, seed… minus use) | geometry outside changed buildings, normal (signs aside: atlas) | same, flat | parts in changed buildings (share of the city) | parts | flat parts | signs | footprint change, max (tiles) | height change, min … max (tiles) |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const r of integrity) console.log(r);
console.log("\n## 6. Seed stability (seeds 7 / 8 / 9)\n");
console.log("Uses per building differ by seed only where a seed changes how many volumes a building has (the wings of a courtyard), the same in kit-v7.\n");
console.log("| page | buildings changed | which | uses per building, BEFORE | uses per building, AFTER | reasons per building, AFTER |");
console.log("|---|---|---|---|---|---|");
for (const r of seeds) console.log(r);
