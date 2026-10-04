// Program (surface use) audit: npx tsx scripts/program/audit.ts [kit] > docs/program/audit-<kit>.md
// kit = "current" (default) or "v7" (the frozen baseline). For every volume the surface grammar
// built: which page origin (territory kind / source), which composition, which use; per page
// and in the corpus, by volume count and by land; seed dependence; which uses never occur.
import { readFileSync } from "node:fs";
import { generateKitDistrict as current, newTrace as newTraceCurrent } from "../../src/lib/pixelcity/kit/district";
import { realPage as realPageCurrent } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as v7, newTrace as newTraceV7 } from "../../src/lib/pixelcity/kit-v7/district";
import { realPage as realPageV7 } from "../../src/lib/pixelcity/kit-v7/real-page";
import { DATASET } from "../real-pages/dataset";

const KIT = process.argv[2] === "v7" ? "v7" : "current";
// The current trace is a superset of kit-v7's (it adds the building's program and reason).
const gen = (KIT === "v7" ? v7 : current) as unknown as typeof v7;
const rp = KIT === "v7" ? realPageV7 : realPageCurrent;
const nt = (KIT === "v7" ? newTraceV7 : newTraceCurrent) as unknown as typeof newTraceV7;
const USES = ["commercial", "residential", "office", "institutional", "service", "kiosk", "civic", "industrial"];
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
type Row = { page: string; origin: string; comp: string; use: string; lots: number };
const rows: Row[] = [];
const pageUse = new Map<string, Record<string, number>>();
const seedStable: string[] = [];
for (const e of DATASET) {
  const p = rp(snap(e.id));
  const runs = [7, 8, 9].map((seed) => {
    const t = nt();
    gen(p.fp, { profile: p.plan, time: "day", seed, trace: t });
    return t;
  });
  const t = runs[0];
  // Land of each building: its piece's lots shared among the piece's buildings.
  const lotsOf = new Map<number, number>();
  t.pieces.forEach((pc, k) => {
    const n = t.buildings.filter((b) => b.parts[0] >= pc.parts[0] && b.parts[1] <= pc.parts[1]).length;
    lotsOf.set(k, n ? pc.piece.lots / n : 0);
  });
  const pieceOf = (b: (typeof t.buildings)[number]) => t.pieces.findIndex((pc) => b.parts[0] >= pc.parts[0] && b.parts[1] <= pc.parts[1]);
  const u: Record<string, number> = {};
  for (const b of t.buildings) {
    const T = p.plan.territories[b.territory];
    const origin = T.kind === "remainder" || T.kind === "observed" ? `${T.kind}` : T.kind;
    const land = lotsOf.get(pieceOf(b)) ?? 0;
    for (const A of b.anatomy) {
      rows.push({ page: e.id, origin, comp: b.comp, use: A.use, lots: land / Math.max(1, b.anatomy.length) });
      u[A.use] = (u[A.use] ?? 0) + 1;
    }
  }
  pageUse.set(e.id, u);
  const sig = (tr: typeof t) => JSON.stringify(tr.buildings.map((b) => b.anatomy.map((A) => A.use)));
  seedStable.push(`${e.id}: ${runs.every((r) => sig(r) === sig(t)) ? "identical uses for seeds 7, 8, 9" : "uses differ by seed"}`);
}
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
const total = rows.length;
console.log(`# Program audit — ${KIT === "v7" ? "kit-v7 (BEFORE)" : "current"}\n`);
console.log(`${total} volumes, 14 pages, seed 7, day.\n`);
console.log("## 1. Corpus distribution\n");
console.log("| use | volumes | share | land (lots) | land share |");
console.log("|---|---|---|---|---|");
const land = rows.reduce((a, r) => a + r.lots, 0);
for (const use of USES) {
  const rs = rows.filter((r) => r.use === use);
  const l = rs.reduce((a, r) => a + r.lots, 0);
  console.log(`| ${use} | ${rs.length} | ${pct(rs.length, total)} | ${l.toFixed(0)} | ${pct(l, land)} |`);
}
console.log("\n## 2. Origin × composition × use (volumes)\n");
const keys = [...new Set(rows.map((r) => `${r.origin}|${r.comp}`))].sort();
console.log(`| origin (territory kind) | composition | ${USES.join(" | ")} |`);
console.log(`|---|---|${USES.map(() => "---").join("|")}|`);
for (const k of keys) {
  const [o, c] = k.split("|");
  const rs = rows.filter((r) => r.origin === o && r.comp === c);
  console.log(`| ${o} | ${c} | ${USES.map((u) => rs.filter((r) => r.use === u).length || "").join(" | ")} |`);
}
console.log("\n## 3. Per page (volumes)\n");
console.log(`| page | ${USES.join(" | ")} | commercial share |`);
console.log(`|---|${USES.map(() => "---").join("|")}|---|`);
for (const [id, u] of pageUse) {
  const n = Object.values(u).reduce((a, b) => a + b, 0);
  console.log(`| ${id} | ${USES.map((x) => u[x] ?? "").join(" | ")} | ${pct(u.commercial ?? 0, n)} |`);
}
console.log("\n## 4. Seed dependence\n");
for (const s of seedStable) console.log(`- ${s}`);
console.log("\n## 5. Uses that never or almost never occur\n");
for (const use of USES) {
  const n = rows.filter((r) => r.use === use).length;
  if (n / total < 0.01) console.log(`- ${use}: ${n} volume(s) (${((100 * n) / total).toFixed(1)}%)`);
}
