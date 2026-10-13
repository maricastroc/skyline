import { existsSync, readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { analyzeSemantics } from "../../src/lib/semantics/analyze";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH, EXTRA, holdoutFile } from "./dataset";

const [flags = "none", ...ids] = process.argv.slice(2);
const exp = parseExperiments(flags === "none" ? "" : flags);
for (const id of ids) {
  const known = [...BENCH, ...EXTRA].find((b) => b.id === id);
  const file = known?.file ?? (existsSync(holdoutFile(id)) ? holdoutFile(id) : holdoutFile(id, "holdout2"));
  const doc = normalize(JSON.parse(readFileSync(file, "utf8")) as DomSnapshot, exp);
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true, experiments: exp });
  const nodes = doc.nodes;
  const total = nodes[0].weight || 1;
  const sig = (i: number) => `${nodes[i].tag}${/\.[^.#\s]+/.exec(nodes[i].selector)?.[0] ?? ""}`;
  console.log(`\n${id} · ${nodes.length} nodes · ${nodes[0].chars} chars`);
  console.log(`  regions: ${sem.regions.filter((r) => nodes[r.node].weight / total >= 0.04).map((r) => `${r.kind} ${Math.round((nodes[r.node].weight / total) * 100)}% @${r.node}${r.kind !== "section" && r.kind !== "main" ? ` [${r.evidence.join("; ").slice(0, 70)}]` : ""}`).join(" · ")}`);
  for (let i = 0; i < nodes.length; i++) {
    const groups = new Map<string, number[]>();
    for (const c of nodes[i].children) groups.set(sig(c), [...(groups.get(sig(c)) ?? []), c]);
    const items = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    const count = items.reduce((s, c) => s + (nodes[c].cluster?.count ?? 1), 0);
    const held = items.reduce((s, c) => s + nodes[c].weight, 0);
    if (items.length < 6 || held / total < 0.04) continue;
    const per = (k: "chars" | "links") => items.reduce((s, c) => s + nodes[c][k], 0) / count;
    const naive = (k: "chars" | "links") => items.reduce((s, c) => s + nodes[c][k], 0) / items.length;
    console.log(`  @${String(i).padStart(4)} level ${nodes[i].level} ${String(Math.round((nodes[i].weight / total) * 100)).padStart(3)}% of page · ${items.length} nodes = ${count} items × ${sig(items[0]).slice(0, 26).padEnd(26)} hold ${Math.round((held / nodes[i].weight) * 100)}% of it · per item ${Math.round(per("chars"))} chars ${per("links").toFixed(1)} links (uncorrected ${Math.round(naive("chars"))} / ${naive("links").toFixed(1)}) · clusters ${items.filter((c) => nodes[c].cluster).length}`);
  }
}
