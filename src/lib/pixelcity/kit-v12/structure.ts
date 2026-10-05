// FROZEN: art direction v1, final baseline (C1 street roles, C3 street life, C4 atmosphere). Do not edit.
import type { NNode, NormalizedDocument } from "../../model/types";

export interface StructureGroup {
  share: number;
  items: number;
  chars: number;
  level?: number;
  section: number;
}

export interface Structure {
  source: "explicit" | "inferred" | "none";
  groups: StructureGroup[];
  sections: number;
  items: number;
  evidence: string[];
}

const LISTS = new Set(["ul", "ol", "table", "menu"]);
const MIN_INFERRED_SHARE = 0.1;
const MIN_GROUP_CHARS = 20;
const COVERAGE = 0.6;

export function scopeOf(nodes: NNode[], roots: number[], excluded: number[]): number[] {
  const out: number[] = [];
  const ex = [...excluded].sort((a, b) => a - b);
  for (const r of [...roots].sort((a, b) => a - b)) {
    for (let i = r; i < nodes[r].end; i++) {
      const e = ex.find((x) => x === i);
      if (e !== undefined && e !== r) {
        i = nodes[e].end - 1;
        continue;
      }
      out.push(i);
    }
  }
  return out;
}

const ownLinks = (nodes: NNode[], i: number) => Math.max(0, nodes[i].links - nodes[i].children.reduce((s, c) => s + nodes[c].links, 0));
const ownChars = (nodes: NNode[], i: number) => Math.max(0, nodes[i].chars - nodes[i].children.reduce((s, c) => s + nodes[c].chars, 0));

export function structureOf(doc: NormalizedDocument, roots: number[], excluded: number[]): Structure {
  const nodes = doc.nodes;
  const scope = scopeOf(nodes, roots, excluded);
  const inScope = new Set(scope);
  const totalW = scope.reduce((s, i) => s + nodes[i].selfWeight, 0) || 1;
  const totalItems = scope.reduce((s, i) => s + ownLinks(nodes, i), 0);
  const none = (why: string): Structure => ({ source: "none", groups: [], sections: 0, items: totalItems, evidence: [why] });
  if (!scope.length) return none("empty territory");

  const isLabel = (i: number) => !!nodes[i].heading && nodes[i].links === 0;
  const titles = scope.filter((i) => nodes[i].heading && nodes[i].links > 0).length;
  const levels = [...new Set(scope.filter(isLabel).map((i) => nodes[i].heading!))].sort((a, b) => a - b);
  const partition = (L: number) => {
    const groups: Array<{ w: number; items: number; chars: number; level: number; start: number }> = [];
    let lead = 0;
    for (const i of scope) {
      const n = nodes[i];
      if (isLabel(i) && n.heading! <= L) {
        groups.push({ w: 0, items: 0, chars: 0, level: n.heading!, start: i });
        continue;
      }
      const g = groups[groups.length - 1];
      if (!g) {
        lead += n.selfWeight;
        continue;
      }
      g.w += n.selfWeight;
      g.items += ownLinks(nodes, i);
      g.chars += n.heading ? 0 : ownChars(nodes, i);
    }
    const full = groups.filter((g) => g.items > 0 || g.chars >= MIN_GROUP_CHARS);
    const covered = full.reduce((s, g) => s + g.w, 0) / totalW;
    return { full, covered, lead: lead / totalW };
  };
  const valid = levels.map((L) => ({ L, ...partition(L) })).filter((p) => p.full.length >= 2 && p.covered >= COVERAGE);
  if (valid.length) {
    const leaf = valid[valid.length - 1];
    const upper = valid.length > 1 ? valid[0] : null;
    const sectionOf = (start: number) => {
      if (!upper) return 0;
      let s = 0;
      upper.full.forEach((u, k) => {
        if (u.start <= start) s = k;
      });
      return s;
    };
    return {
      source: "explicit",
      groups: leaf.full.map((g) => ({ share: g.w / totalW, items: g.items, chars: g.chars, level: g.level, section: sectionOf(g.start) })),
      sections: upper ? upper.full.length : 0,
      items: totalItems,
      evidence: [
        `${leaf.full.length} groups opened by label headings h${[...new Set(leaf.full.map((g) => g.level))].sort().join("/h")} (${Math.round(leaf.covered * 100)}% of the content)`,
        ...(upper ? [`inside ${upper.full.length} sections opened by h${upper.L} headings`] : []),
      ],
    };
  }

  const maximalLists = scope.filter((i) => LISTS.has(nodes[i].tag) && !scope.some((o) => o !== i && LISTS.has(nodes[o].tag) && i > o && i < nodes[o].end));
  const byParent = new Map<number, number[]>();
  for (const i of maximalLists) byParent.set(nodes[i].parent, [...(byParent.get(nodes[i].parent) ?? []), i]);
  let best: { parent: number; lists: number[]; items: number } | null = null;
  for (const [parent, lists] of byParent) {
    const sizes = lists.map((i) => scope.filter((k) => k >= i && k < nodes[i].end && inScope.has(k)).reduce((s, k) => s + ownLinks(nodes, k), 0));
    const keep = lists.filter((_, k) => sizes[k] >= 3 && sizes[k] >= MIN_INFERRED_SHARE * totalItems);
    const items = keep.reduce((s, i) => s + sizes[lists.indexOf(i)], 0);
    if (keep.length >= 2 && items >= COVERAGE * totalItems && (!best || items > best.items)) best = { parent, lists: keep, items };
  }
  if (best) {
    const groups = best.lists.map((i) => {
      const sub = scope.filter((k) => k >= i && k < nodes[i].end);
      return { share: sub.reduce((s, k) => s + nodes[k].selfWeight, 0) / totalW, items: sub.reduce((s, k) => s + ownLinks(nodes, k), 0), chars: sub.reduce((s, k) => s + ownChars(nodes, k), 0), section: 0 };
    });
    return { source: "inferred", groups, sections: 0, items: totalItems, evidence: [`${groups.length} sibling <${[...new Set(best.lists.map((i) => nodes[i].tag))].join("/")}> lists under one parent, each ≥ 3 items and ≥ ${MIN_INFERRED_SHARE * 100}% of the items (${Math.round((best.items / Math.max(1, totalItems)) * 100)}% of them)`] };
  }
  const why = titles && !levels.length ? `${titles} heading(s) are item titles (links), not group labels` : levels.length ? `label headings h${levels.join("/h")} present but no level partitions ≥ ${COVERAGE * 100}% of the content into ≥ 2 groups` : maximalLists.length ? `${maximalLists.length} list container(s), but no series of ≥ 2 sibling lists of comparable size` : "no headings, no list series";
  return none(`one sequence: ${why}`);
}

export function withoutStructure<T extends { territories: Array<{ structure?: Structure }> }>(plan: T): T {
  return {
    ...plan,
    territories: plan.territories.map((t) => {
      const c = { ...t };
      delete c.structure;
      return c;
    }),
  };
}
