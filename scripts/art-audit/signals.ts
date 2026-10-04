// Art-direction audit (read-only): which page signals the frozen foundation already produces, per page,
// next to what the scene does with them today. npx tsx scripts/art-audit/signals.ts
import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { SIDEWALK_H } from "../../src/lib/pixelcity/kit/street";

const PAGES: Array<[string, string]> = [
  ["shop", "IKEA"], ["oldweb", "Paul Graham"], ["directory", "craigslist"], ["institution", "GOV.UK"],
  ["reference", "Wikipedia"], ["reference-2", "Wikipedia 2"], ["media", "NASA"], ["saas", "Linear"], ["docs", "Python Docs"],
];
const f2 = (v: number) => v.toFixed(2);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const rows: string[] = [];
for (const [id, name] of PAGES) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")));
  const trace = newTrace();
  const city = generateKitDistrict(p.fp, { profile: p.plan, time: "day", trace });
  const g = trace.grammar!;
  const fp = p.fp;
  // Composition shares by land (lots), from the allocation.
  const lots: Record<string, number> = {};
  for (const s of trace.alloc!.segments) lots[s.comp] = (lots[s.comp] ?? 0) + s.count;
  const comp = Object.entries(lots).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v / 256)}`).join(", ");
  // Heights and footprint of buildings (block parts only), open ground.
  const tops: number[] = [];
  let foot = 0;
  for (const b of trace.buildings) {
    let top = 0;
    let minY = Infinity;
    for (let k = b.parts[0]; k < b.parts[1]; k++) { const pt = city.parts[k]; top = Math.max(top, pt.y + pt.h); minY = Math.min(minY, pt.y); }
    tops.push(top - SIDEWALK_H);
    foot += b.w * b.d;
  }
  const blockArea = 16 * 14 * 14;
  const uses: Record<string, number> = {};
  for (const b of trace.buildings) uses[b.program.use] = (uses[b.program.use] ?? 0) + 1;
  const use = Object.entries(uses).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v / trace.buildings.length)}`).join(", ");
  const items = p.plan.territories.filter((t) => t.items?.source === "series").map((t) => `${t.items!.count}×${t.items!.shape}`).slice(0, 3).join(" ");
  const groups = p.plan.territories.reduce((s, t) => s + (t.structure?.groups.length ?? 0), 0);
  rows.push(
    `## ${name} (${id})\n` +
      `fingerprint: size ${f2(fp.size)} depth ${f2(fp.depth)} textDensity ${f2(fp.textDensity)} linkDensity ${f2(fp.linkDensity)} airiness ${f2(fp.airiness)} imagery ${f2(fp.imagery)} interactivity ${f2(fp.interactivity)} regularity ${f2(fp.regularity)} headings ${f2(fp.headings)} darkness ${f2(fp.darkness)}\n` +
      `grammar (computed): style ${g.style}/${g.secondary} time(own) ${p.fp.darkness > 0.5 ? "night" : "day/golden"} verticality ${f2(g.verticality)} coverage ${f2(g.coverage)} parks ${f2(g.parks)} trees ${f2(g.trees)} traffic ${f2(g.traffic)} avenue ${g.avenue} streetLevels ${g.streetLevels} industry ${f2(g.industry)} billboards ${f2(g.billboards)}\n` +
      `plan: ${p.plan.territories.length} territories, hero weight ${f2(p.plan.hero >= 0 ? p.plan.territories[p.plan.hero].weight : 0)}, dominant ${f2(Math.max(...p.plan.territories.map((t) => t.weight)))}, structure groups ${groups}, item series ${items || "-"}\n` +
      `land by composition: ${comp}\n` +
      `buildings ${trace.buildings.length}, height (tiles above sidewalk) median ${f2(q(tops, 0.5))} p90 ${f2(q(tops, 0.9))} max ${f2(Math.max(...tops))} (landmark ${trace.landmark ? trace.landmark.family : "-"}), footprint/blocks ${pct(foot / blockArea)}\n` +
      `uses: ${use}\n`,
  );
}
console.log(rows.join("\n"));

// Dry run of one existing signal (no rendering): the 24 inner street segments of the 4×4 grid, by what
// faces them. "interior" = the same territory on both sides for most of the segment; "frontier" otherwise.
console.log("## inner street segments (24): interior / frontier, and what faces them\n");
import { N } from "../../src/lib/pixelcity/kit/territory";
for (const [id, name] of PAGES) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")));
  const trace = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", trace });
  const a = trace.alloc!;
  const segOf = (X: number, Y: number) => a.owner[X * N + Y];
  let interior = 0;
  const faces: Record<string, number> = {};
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 4; j++)
      for (const axis of ["x", "z"]) {
        let same = 0;
        for (let k = 0; k < 4; k++) {
          const [A, B] = axis === "x" ? [[4 * i + 3, 4 * j + k], [4 * i + 4, 4 * j + k]] : [[4 * j + k, 4 * i + 3], [4 * j + k, 4 * i + 4]];
          const sa = segOf(A[0], A[1]);
          const sb = segOf(B[0], B[1]);
          const ta = sa >= 0 ? a.segments[sa].territory : -1;
          const tb = sb >= 0 ? a.segments[sb].territory : -1;
          if (ta === tb) same++;
          for (const s of [sa, sb]) if (s >= 0) faces[a.segments[s].comp] = (faces[a.segments[s].comp] ?? 0) + 1;
        }
        if (same >= 3) interior++;
      }
  const tot = Object.values(faces).reduce((s, v) => s + v, 0);
  const f = Object.entries(faces).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v / tot)}`).join(", ");
  console.log(`${name.padEnd(12)} interior ${String(interior).padStart(2)}/24  frontier ${String(24 - interior).padStart(2)}/24  facing: ${f}`);
}
