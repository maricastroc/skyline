import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PERTURBATIONS, realPage, type RealPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH, EXTRA, holdoutFile, type Bench } from "./dataset";
import { HOLDOUT, HOLDOUT_B } from "./holdout-set";
import { dropImages, dropLinks, keepItems, scaleText, shuffleItems, thinItems } from "./perturb";

export const ARMS: Record<string, string> = {
  default: "",
  reading: "reading",
};

type Dist = Record<string, number>;
const tvd = (x: Dist, y: Dist) => {
  let s = 0;
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) s += Math.abs((x[k] ?? 0) - (y[k] ?? 0));
  return s / 2;
};
export const fabricOf = (p: RealPage): Dist => {
  const d: Dist = {};
  for (const t of p.plan.territories) for (const m of t.mix) d[m.comp] = (d[m.comp] ?? 0) + t.weight * m.share;
  return d;
};
export const kindOf = (p: RealPage): Dist => {
  const d: Dist = {};
  for (const t of p.plan.territories) d[t.kind] = (d[t.kind] ?? 0) + t.weight;
  return d;
};
const top = (d: Dist) => Object.entries(d).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
const largest = (p: RealPage) => [...p.plan.territories].sort((a, b) => b.weight - a.weight)[0];

export function pages(): Array<Bench & { snap: DomSnapshot }> {
  const held: Bench[] = [
    ...HOLDOUT.filter((h) => existsSync(holdoutFile(h.id))).map((h) => ({ id: h.id, file: holdoutFile(h.id), what: h.url })),
    ...HOLDOUT_B.filter((h) => existsSync(holdoutFile(h.id, "holdout2"))).map((h) => ({ id: h.id, file: holdoutFile(h.id, "holdout2"), what: h.url })),
  ].map((h) => ({ ...h, set: "holdout" as const, family: "feed" as const }));
  return [...BENCH, ...EXTRA, ...held]
    .map((b) => ({ ...b, snap: JSON.parse(readFileSync(b.file, "utf8")) as DomSnapshot }))
    .filter((b) => b.snap.stats.elementCount >= 60 && b.snap.stats.elementCount <= 12000);
}

interface Case {
  page: string;
  set: string;
  arm: string;
  what: string;
  fabric: number;
  kind: number;
  regions: number;
  flip: string;
}

const q = (xs: number[], f: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(f * xs.length))] ?? 0;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

function run() {
  const quick = process.argv.includes("quick");
  const pick = process.argv.find((a) => a.startsWith("arms="))?.slice(5).split("|");
  if (pick) for (const k of Object.keys(ARMS)) if (!pick.includes(k)) delete ARMS[k];
  for (const extra of process.argv.filter((a) => a.startsWith("arm:"))) ARMS[extra.slice(4).split("=")[0]] = extra.slice(4).split("=")[1];
  const all = pages();
  const cases: Case[] = [];
  const variants = (snap: DomSnapshot): Array<[string, DomSnapshot | null]> => [
    ["text ×0.5", scaleText(snap, 0.5)],
    ["text ×0.67", scaleText(snap, 0.67)],
    ["text ×0.8", scaleText(snap, 0.8)],
    ["text ×1.25", scaleText(snap, 1.25)],
    ["text ×1.5", scaleText(snap, 1.5)],
    ["text ×2", scaleText(snap, 2)],
    ["links keep 70%", dropLinks(snap, 0.7)],
    ["links keep 50%", dropLinks(snap, 0.5)],
    ["images keep 50%", dropImages(snap, 0.5)],
    ["images keep 0%", dropImages(snap, 0)],
    ["items keep 90%", thinItems(snap, 0.9)],
    ["items keep 70%", thinItems(snap, 0.7)],
    ["items keep 50%", thinItems(snap, 0.5)],
    ["items reversed", shuffleItems(snap)],
    ["items first 12", keepItems(snap, 12)],
    ["items first 9", keepItems(snap, 9)],
    ["items first 8", keepItems(snap, 8)],
    ["items first 7", keepItems(snap, 7)],
    ["items first 6", keepItems(snap, 6)],
  ];
  for (const b of all) {
    const extra = quick ? [] : variants(b.snap);
    for (const [arm, flags] of Object.entries(ARMS)) {
      const exp = parseExperiments(flags);
      const base = realPage(b.snap, "none", exp);
      const record = (what: string, p: RealPage) => {
        const a = largest(base);
        const z = largest(p);
        const flip = a && z && (a.kind !== z.kind || top(fabricOf(base)) !== top(fabricOf(p))) ? `${a.kind}/${top(fabricOf(base))} → ${z.kind}/${top(fabricOf(p))}` : "";
        cases.push({ page: b.id, set: b.set, arm, what, fabric: tvd(fabricOf(base), fabricOf(p)), kind: tvd(kindOf(base), kindOf(p)), regions: p.sem.regions.length - base.sem.regions.length, flip });
      };
      for (const pt of PERTURBATIONS) record(pt, realPage(b.snap, pt, exp));
      for (const [what, snap] of extra) if (snap) record(what, realPage(snap, "none", exp));
    }
  }
  if (!quick) writeFileSync("docs/morphology/stability.json", JSON.stringify({ pages: all.map((b) => ({ id: b.id, set: b.set })), cases }));

  const standard = new Set<string>(PERTURBATIONS);
  const section = (title: string, pick: (c: Case) => boolean) => {
    console.log(`\n${title}`);
    console.log(`${"arm".padEnd(18)} cases  land that changes fabric: mean   p90    max   ≥10%  ≥25% · land that changes kind: mean  ≥25% · dominant flips`);
    for (const arm of Object.keys(ARMS)) {
      const cs = cases.filter((c) => c.arm === arm && pick(c));
      const f = cs.map((c) => c.fabric);
      const k = cs.map((c) => c.kind);
      console.log(`${arm.padEnd(18)} ${String(cs.length).padStart(5)}  ${" ".repeat(26)}${(mean(f) * 100).toFixed(1).padStart(5)}% ${(q(f, 0.9) * 100).toFixed(0).padStart(4)}% ${(Math.max(0, ...f) * 100).toFixed(0).padStart(5)}% ${String(f.filter((v) => v >= 0.1).length).padStart(5)} ${String(f.filter((v) => v >= 0.25).length).padStart(5)} · ${" ".repeat(22)}${(mean(k) * 100).toFixed(1).padStart(5)}% ${String(k.filter((v) => v >= 0.25).length).padStart(5)} · ${String(cs.filter((c) => c.flip).length).padStart(5)}`);
    }
  };
  section(`the project's four perturbations (text ±10%, links −10%, one secondary section removed), ${all.length} pages`, (c) => standard.has(c.what));
  for (const set of ["corpus", "pairs", "holdout"]) if (all.some((b) => b.set === set)) section(`  … of which the ${set} pages`, (c) => standard.has(c.what) && c.set === set);
  if (quick) return;
  section("larger edits to the text (×0.5 to ×2)", (c) => c.what.startsWith("text ×"));
  section("links and images removed", (c) => c.what.startsWith("links keep") || c.what.startsWith("images keep"));
  section("items of the main list removed (90%, 70%, 50% kept) or reversed", (c) => c.what.startsWith("items keep") || c.what === "items reversed");
  section("the main list cut to its first 12, 9, 8, 7, 6 items", (c) => c.what.startsWith("items first"));

  console.log("\nreading against default, case by case (same page, same edit):");
  const key = (c: Case) => `${c.page}|${c.what}`;
  const base = new Map(cases.filter((c) => c.arm === "default").map((c) => [key(c), c]));
  const cand = cases.filter((c) => c.arm === "reading");
  const worse = cand.filter((c) => c.fabric - (base.get(key(c))?.fabric ?? 0) >= 0.1);
  const better = cand.filter((c) => (base.get(key(c))?.fabric ?? 0) - c.fabric >= 0.1);
  console.log(`  ${cand.length} cases · final moves at least 10 points more: ${worse.length} · at least 10 points less: ${better.length}`);
  const show = (cs: Case[], n: number) => {
    for (const c of cs.sort((x, y) => y.fabric - (base.get(key(y))?.fabric ?? 0) - (x.fabric - (base.get(key(x))?.fabric ?? 0))).slice(0, n))
      console.log(`    ${c.page.padEnd(22)} ${c.what.padEnd(18)} default ${(100 * (base.get(key(c))?.fabric ?? 0)).toFixed(0).padStart(3)}% · reading ${(100 * c.fabric).toFixed(0).padStart(3)}%  ${c.flip}`);
  };
  console.log("  where final is less stable:");
  show(worse, 25);
  console.log("  where final is more stable:");
  show(better.reverse(), 25);
}

if (process.argv[1]?.endsWith("stability.ts")) run();
