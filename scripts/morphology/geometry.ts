import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { addItems, dropItems, mainList } from "./perturb";
import { fabricOf, pages } from "./stability";

export const READING = "reading";
export const ARMS: Record<string, string> = {
  default: "",
  reading: READING,
  "reading+forum": `${READING},forum`,
  "reading+market": `${READING},market`,
};

export const raster = (parts: Part[]) => {
  const m = new Map<number, number>();
  for (const q of parts) {
    if (q.mesh === "sign" || q.mesh === "sprite" || q.mesh === "glow" || q.y + q.h < 0.3) continue;
    const c = Math.abs(Math.cos(q.rotY));
    const s = Math.abs(Math.sin(q.rotY));
    const hw = (q.w * c + q.d * s) / 2;
    const hd = (q.w * s + q.d * c) / 2;
    for (let x = Math.ceil((q.x - hw) * 4); x <= Math.floor((q.x + hw) * 4); x++)
      for (let z = Math.ceil((q.z - hd) * 4); z <= Math.floor((q.z + hd) * 4); z++) {
        const k = x * 100000 + z;
        m.set(k, Math.max(m.get(k) ?? 0, q.y + q.h));
      }
  }
  return m;
};
export const planChange = (a: Map<number, number>, b: Map<number, number>) => {
  let n = 0;
  let any = 0;
  let foot = 0;
  let tall = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k) ?? 0;
    const y = b.get(k) ?? 0;
    n++;
    if (Math.abs(x - y) > 0.15) any++;
    if (x < 1 !== y < 1) foot++;
    if (Math.abs(x - y) > 1.3) tall++;
  }
  return n ? { any: any / n, foot: foot / n, tall: tall / n } : { any: 0, foot: 0, tall: 0 };
};
const tvd = (x: Record<string, number>, y: Record<string, number>) => {
  let s = 0;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) s += Math.abs((x[k] ?? 0) - (y[k] ?? 0));
  return s / 2;
};

function cityOf(snap: DomSnapshot, flags: string, pt: (typeof PERTURBATIONS)[number] | "none" = "none") {
  const p = realPage(snap, pt, parseExperiments(flags));
  const trace = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, flat: true, trace });
  return { p, trace, r: raster(c.parts), fab: fabricOf(p), pieces: JSON.stringify(trace.pieces.map((x) => [x.block, x.piece.type, x.piece.x, x.piece.z, x.comp])) };
}

function run() {
  const [, , , part = "0/1", armArg] = process.argv;
  const [k, n] = part.split("/").map(Number);
  const arms = armArg ? armArg.split("|") : Object.keys(ARMS);
  const out = `docs/morphology/geometry-${k}.jsonl`;
  writeFileSync(out, "");
  const all = pages()
    .map((b, i) => ({ ...b, half: i % 2 }))
    .filter((_, i) => i % n === k);
  for (const b of all) {
    const list = mainList(b.snap);
    const edits: Array<[string, DomSnapshot | null]> = [
      ["one item removed", dropItems(b.snap, 1)],
      ["two items removed", dropItems(b.snap, 2)],
      ["one item added", addItems(b.snap, 1)],
      ["two items added", addItems(b.snap, 2)],
    ];
    for (const arm of arms) {
      const base = cityOf(b.snap, ARMS[arm]);
      const fab = base.fab;
      const rec = (what: string, c: ReturnType<typeof cityOf>) => {
        const ch = planChange(base.r, c.r);
        appendFileSync(out, `${JSON.stringify({ page: b.id, half: b.half, set: b.set, arm, what, change: ch.any, foot: ch.foot, tall: ch.tall, plan: tvd(base.fab, c.fab), terr: c.p.plan.territories.length - base.p.plan.territories.length, samePieces: c.pieces === base.pieces, items: list?.items.length ?? 0, parcelled: fab.parcelled ?? 0, interactive: fab.interactive ?? 0, grid: fab.grid ?? 0 })}\n`);
      };
      for (const pt of PERTURBATIONS) rec(pt, cityOf(b.snap, ARMS[arm], pt));
      for (const [what, snap] of edits) if (snap) rec(what, cityOf(snap, ARMS[arm]));
    }
  }
}

function report() {
  const rows: Array<{ page: string; half: number; set: string; arm: string; what: string; change: number; foot: number; tall: number; plan: number; terr: number; samePieces: boolean; items: number; parcelled: number; interactive: number; grid: number }> = [];
  for (let k = 0; k < 8; k++) if (existsSync(`docs/morphology/geometry-${k}.jsonl`)) for (const l of readFileSync(`docs/morphology/geometry-${k}.jsonl`, "utf8").split("\n")) if (l) rows.push(JSON.parse(l));
  const q = (xs: number[], f: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(f * xs.length))] ?? 0;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const groups: Record<string, (w: string) => boolean> = {
    "text ±10%": (w) => w.startsWith("text"),
    "one link in ten removed": (w) => w === "links-10",
    "a secondary section removed": (w) => w === "drop-secondary",
    "one item removed or added": (w) => w.startsWith("one item"),
    "two items removed or added": (w) => w.startsWith("two items"),
  };
  const armsSeen = [...new Set(rows.map((r) => r.arm))];
  console.log(`${new Set(rows.map((r) => r.page)).size} pages · share of the ground plan whose height changes (the project's own raster, flat view)`);
  for (const [g, is] of Object.entries(groups)) {
    console.log(`\n${g}`);
    for (const arm of armsSeen) {
      const rs = rows.filter((r) => r.arm === arm && is(r.what));
      const cs = rs.map((r) => r.change);
      const fs = rs.map((r) => r.foot);
      const ts = rs.map((r) => r.tall);
      console.log(`  ${arm.padEnd(13)} ${String(cs.length).padStart(4)} cases · any height change: mean ${(mean(cs) * 100).toFixed(1).padStart(5)}%, over 15% in ${String(cs.filter((v) => v > 0.15).length).padStart(3)} · built ↔ open: mean ${(mean(fs) * 100).toFixed(1).padStart(4)}%, median ${(q(fs, 0.5) * 100).toFixed(1).padStart(4)}%, over 10% in ${String(fs.filter((v) => v > 0.1).length).padStart(3)} · two floors or more: mean ${(mean(ts) * 100).toFixed(1).padStart(4)}%, over 10% in ${String(ts.filter((v) => v > 0.1).length).padStart(3)}`);
    }
  }
  const pair = (a: string, b: string, pick: (r: (typeof rows)[number]) => boolean, label: string) => {
    const key = (r: (typeof rows)[number]) => `${r.page}|${r.what}`;
    const A = new Map(rows.filter((r) => r.arm === a && pick(r)).map((r) => [key(r), r.change]));
    const B = rows.filter((r) => r.arm === b && pick(r));
    if (!B.length) return;
    const d = B.map((r) => r.change - (A.get(key(r)) ?? 0));
    console.log(`  ${label}: ${B.length} cases · ${b} minus ${a}: mean ${(mean(d) * 100).toFixed(1)} points · worse by 10 points or more ${d.filter((v) => v >= 0.1).length} · better by 10 or more ${d.filter((v) => v <= -0.1).length}`);
  };
  const undue = (r: (typeof rows)[number]) => r.what.startsWith("one item") && r.items > 0 && r.foot > 0.1 && r.foot * r.items > 3;
  console.log("\nsingle-item edits by half of the page set (0 guided the fixes, 1 did not):");
  for (const half of [0, 1])
    for (const arm of armsSeen) {
      const rs = rows.filter((r) => r.arm === arm && r.half === half && r.what.startsWith("one item"));
      if (!rs.length) continue;
      console.log(`  half ${half} · ${arm.padEnd(15)} ${String(rs.length).padStart(3)} cases · built ↔ open: mean ${(mean(rs.map((r) => r.foot)) * 100).toFixed(1).padStart(4)}% · over 10% in ${String(rs.filter((r) => r.foot > 0.1).length).padStart(2)} · disproportionate ${String(rs.filter(undue).length).padStart(2)} · territory set changed in ${String(rs.filter((r) => r.terr !== 0).length).padStart(2)} · two floors or more: mean ${(mean(rs.map((r) => r.tall)) * 100).toFixed(1).padStart(4)}%`);
    }
  console.log("\nwhere the default's large changes come from (built ↔ open on more than 10% of the ground plan):");
  for (const [g, is] of Object.entries(groups)) {
    const big = rows.filter((r) => r.arm === "default" && is(r.what) && r.foot > 0.1);
    const samePlan = big.filter((r) => r.plan < 0.02 && r.terr === 0);
    console.log(`  ${g.padEnd(30)} ${String(big.length).padStart(3)} cases · same territories and fabrics, different geometry: ${samePlan.length} (same pieces ${samePlan.filter((r) => r.samePieces).length}) · the plan itself changed: ${big.length - samePlan.length}`);
  }
  console.log("\ncase by case:");
  pair("default", "reading", () => true, "the reading against the default, all pages");
  pair("reading", "reading+forum", (r) => r.interactive >= 0.2, "the forum on pages with 20% or more of interactive land");
  pair("reading", "reading+market", (r) => r.grid >= 0.2, "the market hall on pages with 20% or more of catalogue land");
}

if (process.argv[2] === "run") run();
if (process.argv[2] === "report") report();
