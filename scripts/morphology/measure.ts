import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage, type Perturbation } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments, type Experiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH, type Bench } from "./dataset";

type Dist = Record<string, number>;
const add = (d: Dist, k: string, v = 1) => (d[k] = (d[k] ?? 0) + v);
const norm = (d: Dist): Dist => {
  const s = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v / s]));
};
const bin = (v: number, edges: number[]) => {
  let i = 0;
  while (i < edges.length && v >= edges[i]) i++;
  return `b${i}`;
};

export interface Row {
  id: string;
  family: Bench["family"];
  what: string;
  elements: number;
  regions: number;
  sections: number;
  depth: number;
  typed: Array<{ kind: string; share: number; title: string; evidence: string }>;
  territories: number;
  dominant: number;
  land: Array<{ label: string; kind: string; comp: string; lots: number }>;
  comp: Dist;
  family_: Dist;
  floors: Dist;
  open: number;
  buildings: number;
  q50: number;
  q90: number;
  max: number;
  hero: number;
  landmark: string;
}

export function measure(b: Bench, experiments: Experiments): Row {
  return measureSnapshot(JSON.parse(readFileSync(b.file, "utf8")) as DomSnapshot, b, experiments);
}

export function measureSnapshot(snap: DomSnapshot, b: Pick<Bench, "id" | "family" | "what">, experiments: Experiments, perturbation: Perturbation = "none"): Row {
  const p = realPage(snap, perturbation, experiments);
  const trace = newTrace();
  const city = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace });
  const total = p.doc.nodes[0].weight || 1;
  const depthOf = (r: number) => {
    let d = 0;
    for (let q = p.sem.regions[r].parent; q >= 0; q = p.sem.regions[q].parent) d++;
    return d;
  };
  const a = trace.alloc!;
  const comp: Dist = {};
  for (const s of a.segments) add(comp, s.comp, s.count);
  const lots = a.lots;
  const landed = p.plan.territories.map((t, i) => ({ t, i, lots: lots[i] ?? 0 })).filter((x) => x.lots > 0).sort((x, y) => y.lots - x.lots);
  const fam: Dist = {};
  const floors: Dist = {};
  const tops: number[] = [];
  for (const bd of trace.buildings) {
    add(fam, bd.P.family);
    add(floors, bin(bd.P.floors, [3, 5, 7, 10, 15]));
    let top = 0;
    for (let k = bd.parts[0]; k < bd.parts[1]; k++) top = Math.max(top, city.parts[k].y + city.parts[k].h);
    tops.push(top);
  }
  tops.sort((x, y) => x - y);
  const q = (f: number) => tops[Math.min(tops.length - 1, Math.floor(f * tops.length))] ?? 0;
  let open = 0;
  for (const pc of trace.pieces) if (!trace.buildings.some((bd) => bd.parts[0] >= pc.parts[0] && bd.parts[1] <= pc.parts[1])) open += pc.piece.lots;
  const topComp = (i: number) => [...p.plan.territories[i].mix].sort((x, y) => y.share - x.share)[0]?.comp ?? "-";
  return {
    id: b.id,
    family: b.family,
    what: b.what,
    elements: snap.stats.elementCount,
    regions: p.sem.regions.length,
    sections: p.sem.regions.filter((r) => r.kind === "section").length,
    depth: Math.max(0, ...p.sem.regions.map((r) => depthOf(r.id))),
    typed: p.sem.regions
      .filter((r) => !["main", "section", "page"].includes(r.kind) && p.doc.nodes[r.node].weight / total >= 0.03)
      .map((r) => ({ kind: r.kind, share: p.doc.nodes[r.node].weight / total, title: (r.title ?? "").slice(0, 30), evidence: r.evidence.join("; ").slice(0, 110) }))
      .sort((x, y) => y.share - x.share)
      .slice(0, 6),
    territories: landed.length,
    dominant: landed.length ? landed[0].lots / 256 : 0,
    land: landed.slice(0, 6).map((x) => ({ label: (x.t.label ?? x.t.kind).slice(0, 28), kind: x.t.kind, comp: topComp(x.i), lots: x.lots })),
    comp: norm(comp),
    family_: norm(fam),
    floors: norm(floors),
    open: open / 256,
    buildings: trace.buildings.length,
    q50: q(0.5),
    q90: q(0.9),
    max: q(1),
    hero: p.plan.hero >= 0 ? (lots[p.plan.hero] ?? 0) / 256 : 0,
    landmark: trace.landmark ? `${trace.landmark.family}/${trace.landmark.floors}` : "none",
  };
}

const tvd = (x: Dist, y: Dist) => {
  let s = 0;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) s += Math.abs((x[k] ?? 0) - (y[k] ?? 0));
  return s / 2;
};
export const apart = (x: Row, y: Row) => (tvd(x.comp, y.comp) + tvd(x.family_, y.family_) + tvd(x.floors, y.floors) + Math.min(1, Math.abs(x.open - y.open) / 0.5) + Math.min(1, Math.abs(x.q90 - y.q90) / 10)) / 5;

if (process.argv[1]?.endsWith("measure.ts")) {
  const [arm = "baseline", expArg = "none", ...only] = process.argv.slice(2);
  const experiments = parseExperiments(expArg === "none" ? "" : expArg);
  mkdirSync("docs/morphology", { recursive: true });
  const rows = BENCH.filter((b) => !only.length || only.includes(b.id)).map((b) => measure(b, experiments));
  const pct = (v: number) => `${Math.round(v * 100)}%`.padStart(4);
  const top = (d: Dist, n = 3) => Object.entries(d).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(", ");
  console.log(`arm ${arm}${experiments.size ? ` (experiments: ${[...experiments].join(", ")})` : ""}\n`);
  for (const r of rows) {
    console.log(`${r.id.padEnd(22)} ${r.family.padEnd(9)} el ${String(r.elements).padStart(5)} · regions ${String(r.regions).padStart(2)} (sections ${String(r.sections).padStart(2)}, depth ${r.depth}) · territories ${String(r.territories).padStart(2)}, largest ${pct(r.dominant)} · open ${pct(r.open)} · ${String(r.buildings).padStart(3)} buildings, tops ${r.q50.toFixed(1)}/${r.q90.toFixed(1)}/${r.max.toFixed(1)} · landmark ${r.landmark}`);
    console.log(`${" ".repeat(24)}land: ${r.land.map((l) => `${l.lots} ${l.comp} “${l.label}”[${l.kind}]`).join(" · ")}`);
    console.log(`${" ".repeat(24)}comp: ${top(r.comp, 4)} · families: ${top(r.family_, 4)}`);
    if (r.typed.length) console.log(`${" ".repeat(24)}typed: ${r.typed.map((t) => `${t.kind} ${pct(t.share).trim()}${t.title ? ` “${t.title}”` : ""}`).join(" · ")}`);
  }
  if (rows.length > 3) {
    const near = rows.map((r) => {
      const others = rows.filter((o) => o !== r).map((o) => ({ o, d: apart(r, o) })).sort((x, y) => x.d - y.d);
      return { r, nearest: others[0], mean: others.reduce((s, x) => s + x.d, 0) / others.length };
    });
    const all = rows.flatMap((x, i) => rows.slice(i + 1).map((y) => apart(x, y)));
    console.log(`\nhow far apart the cities are (0 = same land use, buildings, heights and open land): mean ${(all.reduce((s, v) => s + v, 0) / all.length).toFixed(3)}, closest pair ${Math.min(...all).toFixed(3)}`);
    console.log("nearest neighbour of each city:");
    for (const n of near.sort((x, y) => x.nearest.d - y.nearest.d)) console.log(`  ${n.r.id.padEnd(22)} ${n.r.family.padEnd(9)} ↔ ${n.nearest.o.id.padEnd(22)} ${n.nearest.o.family.padEnd(9)} ${n.nearest.d.toFixed(3)}${n.r.family !== n.nearest.o.family ? "  (another family)" : ""}`);
  }
  writeFileSync(`docs/morphology/${arm}.json`, JSON.stringify({ arm, experiments: [...experiments], rows }, null, 1));
  console.log(`\nwrote docs/morphology/${arm}.json`);
}
