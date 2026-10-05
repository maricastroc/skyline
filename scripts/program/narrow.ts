import { readFileSync } from "node:fs";
import { CEREMONIAL_SPAN } from "../../src/lib/pixelcity/kit/buildings";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import { generateKitDistrict as v8, newTrace as newTraceV8 } from "../../src/lib/pixelcity/kit-v8/district";
import { realPage as realPageV8 } from "../../src/lib/pixelcity/kit-v8/real-page";
import { DATASET } from "../real-pages/dataset";

const NAMES: Record<string, string> = { reference: "Wikipedia", docs: "Python Docs", app: "GitHub", saas: "Linear", shop: "IKEA", news: "Guardian", portfolio: "portfolio", forum: "lobste.rs", institution: "GOV.UK", oldweb: "Paul Graham", media: "NASA", directory: "craigslist", "reference-2": "Wikipedia 2", "saas-2": "Vercel" };
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const key = (q: Part) => JSON.stringify({ ...q, rect: undefined });
const minus = (a: Part[], b: Part[]) => {
  const m = new Map<string, number>();
  for (const q of b) m.set(key(q), (m.get(key(q)) ?? 0) + 1);
  return a.filter((q) => {
    const n = m.get(key(q)) ?? 0;
    if (n) m.set(key(q), n - 1);
    return !n;
  });
};
const outside = (parts: Part[], ranges: Array<[number, number]>) => parts.filter((_, i) => !ranges.some(([a, b]) => i >= a && i < b));
const keep = (q: Part) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow";
const flatIndex = (parts: Part[]) => {
  const m: number[] = [];
  let n = 0;
  for (const q of parts) {
    m.push(n);
    if (keep(q)) n++;
  }
  m.push(n);
  return m;
};
const band = (q: Part) => (q.mesh === "sign" ? "sign" : q.y + q.h <= 1.0 ? "ground floor" : Math.min(q.w, q.d) < 0.1 ? "above the ground floor: sign hardware (blade-sign brackets)" : "above the ground floor: other");
const volume = (q: Part) => keep(q) && q.y + q.h > 1.0 && Math.min(q.w, q.d) >= 0.3;
const geom = (q: Part) => q.mesh !== "sign";

const rows: string[] = [];
const integrity: string[] = [];
const seeds: string[] = [];
const widths: number[] = [];
const bands = new Map<string, number>();
let changedAll = 0;
let totalAll = 0;
let wideInstitutional = 0;
let wideChanged = 0;
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const q = realPageV8(snap(e.id));
  const run = (seed: number, time: "day" | "night", flat: boolean) => {
    const ta = newTrace();
    const tb = newTraceV8();
    const a = generateKitDistrict(p.fp, { profile: p.plan, time, seed, flat, trace: ta });
    const b = v8(q.fp, { profile: q.plan, time, seed, flat, trace: tb });
    return { a, b, ta, tb };
  };
  const changedOf = (r: ReturnType<typeof run>, signs = false) =>
    r.ta.buildings
      .map((B, i) => {
        const A = r.a.parts.slice(...B.parts);
        const C = r.b.parts.slice(...r.tb.buildings[i].parts);
        const g = JSON.stringify(A.filter(geom).map(key)) !== JSON.stringify(C.filter(geom).map(key));
        return (signs ? !g && JSON.stringify(A.map(key)) !== JSON.stringify(C.map(key)) : g) ? i : -1;
      })
      .filter((i) => i >= 0);
  const day = run(7, "day", false);
  const changed = changedOf(day);
  const signOnly = changedOf(day, true);
  totalAll += day.ta.buildings.length;
  changedAll += changed.length;
  day.ta.buildings.forEach((B, i) => {
    const inst = B.anatomy.some((A) => A.use === "institutional");
    const narrow = B.P.family === "rows" && B.anatomy.some((A) => A.ground.entrance === "secondary" || A.why.some((w) => w.includes("institutional row")));
    if (inst && !narrow) {
      wideInstitutional++;
      if (changed.includes(i)) wideChanged++;
    }
    if (inst && B.P.family === "rows") {
      const n = Math.max(B.P.unitFrom === undefined ? 2 : 1, B.P.units ?? Math.round(B.w / 1.6));
      widths.push(B.w / n);
    }
  });
  for (const i of changed) {
    const A = day.a.parts.slice(...day.ta.buildings[i].parts);
    const B = day.b.parts.slice(...day.tb.buildings[i].parts);
    for (const x of [...minus(A, B), ...minus(B, A)]) bands.set(band(x), (bands.get(band(x)) ?? 0) + 1);
  }
  const why = [...new Set(changed.map((i) => `${day.ta.buildings[i].comp} ${day.ta.buildings[i].P.family} ${day.ta.buildings[i].program.use}`))].join(", ");
  const entrances = changed.reduce(
    (s, i) => {
      for (const A of day.ta.buildings[i].anatomy) s[A.ground.entrance === "secondary" ? 1 : 0]++;
      return s;
    },
    [0, 0],
  );
  rows.push(`| ${NAMES[e.id]} | ${changed.length} / ${day.ta.buildings.length} | ${why || "–"} | ${changed.length ? `${entrances[0]} marked · ${entrances[1]} plain` : "–"} | ${signOnly.length || "–"} |`);
  const cells: string[] = [];
  for (const [time, flat] of [["day", false], ["night", false], ["day", true]] as const) {
    const r = time === "day" && !flat ? day : run(7, time, flat);
    const ref = flat ? run(7, "day", false) : r;
    const ch = changedOf(ref);
    let ra = ch.map((i) => ref.ta.buildings[i].parts);
    let rb = ch.map((i) => ref.tb.buildings[i].parts);
    if (flat) {
      const ma = flatIndex(ref.a.parts);
      const mb = flatIndex(ref.b.parts);
      ra = ra.map(([x, y]) => [ma[x], ma[y]]);
      rb = rb.map(([x, y]) => [mb[x], mb[y]]);
    }
    const same = JSON.stringify(outside(r.a.parts, ra).filter(geom).map(key)) === JSON.stringify(outside(r.b.parts, rb).filter(geom).map(key));
    cells.push(same ? "identical" : "**differs**");
  }
  const volumes = changed.every((i) => {
    const A = day.a.parts.slice(...day.ta.buildings[i].parts).filter(volume);
    const B = day.b.parts.slice(...day.tb.buildings[i].parts).filter(volume);
    return !minus(A, B).length && !minus(B, A).length;
  });
  integrity.push(`| ${NAMES[e.id]} | ${cells.join(" | ")} | ${changed.length ? (volumes ? "identical" : "**differ**") : "–"} | ${day.b.signs.length} → ${day.a.signs.length} |`);
  const sets = [7, 8, 9].map((s) => JSON.stringify(changedOf(run(s, "day", false))));
  seeds.push(`| ${NAMES[e.id]} | ${sets.map((s) => JSON.parse(s).length).join(" / ")} | ${sets.every((s) => s === sets[0]) ? "same buildings" : "**differ**"} |`);
}
const bin = (lo: number, hi: number) => widths.filter((w) => w >= lo && w < hi).length;
console.log("# Narrow-lot institutional — kit-v8 (BEFORE) × current (AFTER)\n");
console.log(`Generated by \`scripts/program/narrow.ts\`. Threshold \`CEREMONIAL_SPAN\` = ${CEREMONIAL_SPAN.toFixed(2)} tiles (mean unit width of an attached series). Seed 7 unless stated.\n`);
console.log(`## 1. What changed\n\n${changedAll} of ${totalAll} buildings changed geometry. Wide institutional buildings (not narrow series): ${wideChanged} of ${wideInstitutional} changed geometry.\n`);
console.log("| page | buildings changed (geometry) | composition · family · program | units: marked entrance · plain door | buildings whose signs alone changed (atlas) |");
console.log("|---|---|---|---|---|");
for (const r of rows) console.log(r);
console.log("\nWhere the differing parts of the changed buildings sit (both directions):\n");
for (const [k, n] of bands) console.log(`- ${k}: ${n}`);
console.log("\nInstitutional series by mean unit width (tiles):\n");
console.log(`| < 1.5 | 1.5–2.5 | 2.5–${CEREMONIAL_SPAN.toFixed(1)} | ≥ ${CEREMONIAL_SPAN.toFixed(1)} (unchanged) |`);
console.log("|---|---|---|---|");
console.log(`| ${bin(0, 1.5)} | ${bin(1.5, 2.5)} | ${bin(2.5, CEREMONIAL_SPAN)} | ${bin(CEREMONIAL_SPAN, 99)} |`);
console.log("\n## 2. Nothing else moved\n");
console.log("Geometry outside the changed buildings, in order (signs aside: atlas); the changed buildings' volumes (parts ≥ 0.3 across, top above the ground floor).\n");
console.log("| page | outside, day | outside, night | outside, flat | volumes of changed buildings | signs in the atlas |");
console.log("|---|---|---|---|---|---|");
for (const r of integrity) console.log(r);
console.log("\n## 3. Seed stability (seeds 7 / 8 / 9)\n");
console.log("| page | buildings changed | which |");
console.log("|---|---|---|");
for (const r of seeds) console.log(r);
