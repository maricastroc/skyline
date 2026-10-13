import { readFileSync } from "node:fs";
import { apart, type Row } from "./measure";

const [arm, against = "baseline"] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const load = (a: string) => (JSON.parse(readFileSync(`docs/morphology/${a}.json`, "utf8")) as { rows: Row[] }).rows;
const before = new Map(load(against).map((r) => [r.id, r]));
const after = load(arm);
const land = (r: Row) => r.land.map((l) => `${l.lots} ${l.comp} “${l.label}”[${l.kind}]`).join(" · ");
const typed = (r: Row) => r.typed.map((t) => `${t.kind} ${Math.round(t.share * 100)}%`).join(", ") || "-";
const line = (r: Row) => `regions ${r.regions} (sections ${r.sections}, depth ${r.depth}) · territories ${r.territories}, largest ${Math.round(r.dominant * 100)}% · open ${Math.round(r.open * 100)}% · ${r.buildings} buildings, tops ${r.q50.toFixed(1)}/${r.q90.toFixed(1)}/${r.max.toFixed(1)}`;
let changed = 0;
for (const a of after) {
  const b = before.get(a.id);
  if (!b) continue;
  const d = apart(a, b);
  const same = d === 0 && land(a) === land(b) && typed(a) === typed(b) && a.regions === b.regions;
  if (same) continue;
  changed++;
  console.log(`${a.id} (${a.family}) moved ${d.toFixed(3)}`);
  console.log(`  before  ${line(b)}\n          typed: ${typed(b)}\n          land: ${land(b)}`);
  console.log(`  after   ${line(a)}\n          typed: ${typed(a)}\n          land: ${land(a)}`);
}
const pair = (rows: Row[]) => {
  const all = rows.flatMap((x, i) => rows.slice(i + 1).map((y) => apart(x, y)));
  const other = rows.filter((r) => {
    const n = rows.filter((o) => o !== r).sort((x, y) => apart(r, x) - apart(r, y))[0];
    return n.family !== r.family;
  }).length;
  return `mean distance ${(all.reduce((s, v) => s + v, 0) / all.length).toFixed(3)}, closest pair ${Math.min(...all).toFixed(3)}, nearest neighbour in another family ${other}/${rows.length}`;
};
console.log(`\n${changed} of ${after.length} pages changed`);
console.log(`${against.padEnd(12)} ${pair([...before.values()])}`);
console.log(`${arm.padEnd(12)} ${pair(after)}`);
