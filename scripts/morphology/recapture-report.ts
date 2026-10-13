import { existsSync, readFileSync } from "node:fs";
import { listAnatomy } from "../../src/lib/pixelcity/kit/plan";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { READING } from "./geometry";
import { VISUAL } from "./recapture";

const ROOT = "docs/morphology/recapture";
const addresses = (n: SnapshotNode): number => (n.image ? 1 : 0) + n.children.reduce((s, c) => s + addresses(c), 0);
const read = (file: string, flags: string) => {
  const snap = JSON.parse(readFileSync(file, "utf8")) as DomSnapshot;
  const p = realPage(snap, "none", parseExperiments(flags));
  const fabric: Record<string, number> = {};
  for (const t of p.plan.territories) for (const m of t.mix) fabric[m.comp] = (fabric[m.comp] ?? 0) + t.weight * m.share;
  const kinds: Record<string, number> = {};
  for (const t of p.plan.territories) kinds[t.kind] = (kinds[t.kind] ?? 0) + t.weight;
  const lists = p.plan.territories.filter((t) => t.region >= 0 && p.sem.regions[t.region].items.length >= 5 && t.weight >= 0.08);
  const pictured = lists.length ? lists.reduce((s, t) => s + listAnatomy(p.doc, p.sem.regions[t.region].items).pictured * t.weight, 0) / lists.reduce((s, t) => s + t.weight, 0) : 0;
  const top = (d: Record<string, number>) => Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(" + ");
  return { strategy: snap.source.strategy, elements: snap.stats.elementCount, addresses: addresses(snap.root), content: p.doc.media?.content ?? 0, pictured, fabric: top(fabric), kinds: top(kinds) };
};

let gained = 0;
let rendered = 0;
let changed = 0;
for (const arm of [
  ["default rules", ""],
  ["reading experiment", READING],
] as const) {
  console.log(`\n${arm[0]}`);
  console.log(`${"page".padEnd(15)} ${"".padEnd(6)} capture   images with an address · content images · lists pictured · land by fabric · by kind`);
  for (const [id, , origin] of VISUAL) {
    const a = `${ROOT}/abort/${id}.json`;
    const b = `${ROOT}/placeholder/${id}.json`;
    if (!existsSync(a) || !existsSync(b)) continue;
    const x = read(a, arm[1]);
    const y = read(b, arm[1]);
    if (arm[1] === "") {
      if (y.strategy === "rendered") rendered++;
      if (y.content > x.content * 1.5 + 2) gained++;
    } else if (x.fabric !== y.fabric) changed++;
    const row = (label: string, r: typeof x) => `${label.padEnd(11)} ${r.strategy.padEnd(8)} ${String(r.addresses).padStart(4)} · ${String(r.content).padStart(4)} · ${`${Math.round(r.pictured * 100)}%`.padStart(4)} · ${r.fabric.padEnd(30)} · ${r.kinds}`;
    console.log(`${id.padEnd(15)} ${origin.padEnd(6)} ${row("refused", x)}`);
    console.log(`${"".padEnd(22)} ${row("from memory", y)}`);
  }
}
console.log(`\npages read in a browser: ${rendered} · of which gain content images (more than half as many again): ${gained} · under the reading experiment, pages whose two main fabrics change: ${changed}`);
