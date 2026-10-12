import { readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH } from "./dataset";

const only = process.argv.slice(2);
for (const b of BENCH.filter((x) => !only.length || only.includes(x.id))) {
  const doc = normalize(JSON.parse(readFileSync(b.file, "utf8")) as DomSnapshot);
  const nodes = doc.nodes;
  const total = nodes[0].weight || 1;
  const sig = (i: number) => `${nodes[i].tag}${/\.[^.#\s]+/.exec(nodes[i].selector)?.[0] ?? ""}`;
  const out: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const groups = new Map<string, number[]>();
    for (const c of nodes[i].children) groups.set(sig(c), [...(groups.get(sig(c)) ?? []), c]);
    const items = [...groups.values()].sort((x, y) => y.length - x.length)[0] ?? [];
    if (items.length < 6) continue;
    const covered = items.reduce((s, c) => s + nodes[c].weight, 0) / total;
    if (covered < 0.03) continue;
    const avg = (f: (c: number) => number) => items.reduce((s, c) => s + f(c), 0) / items.length;
    const img = (c: number) => { let k = 0; for (let j = c; j < nodes[c].end; j++) if (nodes[j].image) k++; return k; };
    out.push(`  node ${String(i).padStart(5)} level ${nodes[i].level} · ${String(items.length).padStart(3)} × ${sig(items[0]).slice(0, 34).padEnd(34)} ${Math.round(covered * 100)}% of page · per item: ${Math.round(avg((c) => nodes[c].chars))} chars, ${avg((c) => nodes[c].links).toFixed(1)} links, ${avg(img).toFixed(1)} images, ${Math.round(avg((c) => nodes[c].descendants))} nodes · with link ${Math.round((items.filter((c) => nodes[c].links > 0).length / items.length) * 100)}%`);
  }
  console.log(`${b.id} (${b.family})\n${out.join("\n") || "  no list of 6+ alike siblings covering 3% of the page"}`);
}
