import { readFileSync } from "node:fs";
import type { RGB } from "../../src/lib/city/types";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g10, newTrace as t10 } from "../../src/lib/pixelcity/kit-v10/district";
import { realPage as r10 } from "../../src/lib/pixelcity/kit-v10/real-page";
import type { Part } from "../../src/lib/pixelcity/types";

const NAME: Record<string, string> = { shop: "IKEA", oldweb: "Paul Graham", directory: "craigslist", institution: "GOV.UK", reference: "Wikipedia", "reference-2": "Wikipedia 2", media: "NASA", saas: "Linear", docs: "Python Docs" };
const same = (a: RGB, b: RGB) => a.every((v, k) => Math.abs(v - b[k]) < 1e-9);
const count = (parts: Part[], [a, b]: [number, number], leaf: RGB) => {
  const ps = parts.slice(a, b);
  return { trees: ps.filter((q) => q.mesh !== "glow" && same(q.color, leaf)).length, people: ps.filter((q) => q.mesh === "sprite").length };
};
const vehicles = (parts: Part[], [a, b]: [number, number]) => Math.round(parts.slice(a, b).filter((q) => q.mesh === "glow").length / 4);
const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
const head = "page          movement green │ footfall canopy traffic │ people  trees  cars  bus │ stamp (kit-v10): people trees cars";
const rows: string[] = [head];
const detail: string[] = [];
for (const id of Object.keys(NAME)) {
  const snap = JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
  const p = realPage(snap);
  const t = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
  const q = r10(snap);
  const u = t10();
  const d = g10(q.fp, { profile: q.plan, time: "day", seed: 7, trace: u as never });
  const L = t.life!;
  const leaf = c.palette.leaves[0];
  const now = count(c.parts, [t.scene!.furniture[0], t.scene!.crossings[1]], leaf);
  const was = count(d.parts, [u.scene!.furniture[0], u.scene!.crossings[1]], leaf);
  const f = (v: number, w = 6) => v.toFixed(2).padStart(w);
  rows.push(
    `${NAME[id].padEnd(13)} ${f(L.movement, 8)} ${f(L.green)} │ ${f(mean(L.sides.map((s) => s.footfall)), 8)} ${f(mean(L.sides.map((s) => s.canopy)))} ${f(mean(L.segments.map((s) => s.traffic)), 7)} │ ${String(now.people).padStart(6)} ${String(now.trees).padStart(6)} ${String(vehicles(c.parts, t.scene!.traffic)).padStart(5)} ${String(L.sides.filter((s) => s.busStop).length).padStart(4)} │ ${String(was.people).padStart(22)} ${String(was.trees).padStart(5)} ${String(vehicles(d.parts, u.scene!.traffic)).padStart(4)}`,
  );
  detail.push(`\n## ${NAME[id]} (${id}) · movement ${L.movement.toFixed(2)} (grammar.traffic ← link density) · green ${L.green.toFixed(2)} (grammar.parks ← whitespace, coverage)`);
  for (const s of L.sides) detail.push(`  block ${s.block.join(",")} side ${s.side} → ${s.axis}${s.line}.${s.span}${s.busStop ? " [bus stop]" : ""}  ${s.why}`);
}
console.log(rows.join("\n"));
console.log("\nfootfall, canopy: means over the 64 sidewalks · traffic: mean over the 40 carriageways · people and trees: sidewalks and crossings");
console.log(detail.join("\n"));
