/**
 * Item form of a territory (program differentiation pass): what one repeated ITEM of this piece of
 * page looks like — a bare link, a row of two links, a titled entry with metadata, a product card.
 *
 * Purely descriptive: it describes the page, not the city. Nothing reads it yet; weights, keys,
 * order, mix, structure and allocation are decided without it.
 *
 * Items are the territory's dominant REPEATED SIBLING SERIES: for every parent in the territory, its
 * children of one tag form a series when at least 3 of them hold a link or some text (a node the
 * normalizer collapsed into a cluster counts as its `count` siblings). Series with the same
 * (parent tag, item tag) shape are pooled across the territory (the city links of 140 lists are one
 * kind of item). Among the series that cover at least half of the territory's links (or text, when
 * it has few links), a series of TITLED members (most hold one title) is the item kind — entries,
 * whatever repeats inside them, unless their titles are plain headings over a finer series of their
 * own (headed groups of items); otherwise the FINEST series (the most items) is: a list of lists
 * yields its entries, not the lists.
 */
import type { NNode, NormalizedDocument } from "../../model/types";
import { contentImages } from "../../semantics/hygiene";
import { scopeOf, type Structure } from "./structure";

export interface ItemForm {
  source: "series" | "none";
  /** Items found, and the series shape: `${parentTag} > ${itemTag}` and how many parents hold it. */
  count: number;
  shape: string;
  parents: number;
  /** Share of the territory's links (or text) inside the items. */
  coverage: number;
  /** Per item, medians over the items (a collapsed cluster counts as `count` equal items). */
  linksPerItem: number;
  charsPerItem: number;
  mediaPerItem: number;
  controlsPerItem: number;
  /** Items that hold a heading (a titled entry), and the share they make. */
  titled: number;
  titledShare: number;
  /** Titled items whose title is a link (the item's own destination), and their share of all items. */
  linkTitled: number;
  linkTitledShare: number;
  /** Group membership, when the territory's structure observed groups: items per group (median). */
  groups: number;
  itemsPerGroup: number;
  confidence: "high" | "medium" | "none";
  evidence: string[];
}

/** A plan with the descriptor removed: every use then comes from the composition alone, as in kit-v7. */
export function withoutItems<T extends { territories: Array<{ items?: ItemForm }> }>(plan: T): T {
  return {
    ...plan,
    territories: plan.territories.map((t) => {
      const c = { ...t };
      delete c.items;
      return c;
    }),
  };
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

interface Item {
  node: number;
  /** How many items this node stands for (a cluster stands for its count). */
  n: number;
  links: number;
  chars: number;
  media: number;
  controls: number;
  title?: "linked" | "plain";
}

export function itemsOf(doc: NormalizedDocument, roots: number[], excluded: number[], structure?: Structure): ItemForm {
  const nodes = doc.nodes;
  const scope = scopeOf(nodes, roots, excluded);
  const inScope = new Set(scope);
  const own = (i: number, k: "links" | "chars") => Math.max(0, nodes[i][k] - nodes[i].children.reduce((s, c) => s + nodes[c][k], 0));
  const totalLinks = scope.reduce((s, i) => s + own(i, "links"), 0);
  const totalChars = scope.reduce((s, i) => s + own(i, "chars"), 0);
  const byLinks = totalLinks >= 3;
  const none = (why: string): ItemForm => ({ source: "none", count: 0, shape: "", parents: 0, coverage: 0, linksPerItem: 0, charsPerItem: 0, mediaPerItem: 0, controlsPerItem: 0, titled: 0, titledShare: 0, linkTitled: 0, linkTitledShare: 0, groups: structure?.groups.length ?? 0, itemsPerGroup: 0, confidence: "none", evidence: [why] });
  if (!scope.length) return none("empty territory");

  // A titled member holds ONE title: a heading that is itself a link, or sits inside one (an item
  // title, as in the structure pass), or a single plain heading. A block with several plain
  // headings is a container of headed groups (a layout column of lists), not an entry.
  const inLink = (k: number, i: number) => {
    for (let j = k; j >= i && j >= 0; j = nodes[j].parent) if (nodes[j].tag === "a") return true;
    return false;
  };
  const titleOf = (i: number): Item["title"] => {
    let plain = 0;
    let linked = 0;
    for (let k = i; k < nodes[i].end; k++)
      if (inScope.has(k) && nodes[k].heading) {
        if (nodes[k].links === 0 && !inLink(k, i)) plain++;
        else linked++;
      }
    if (linked && plain <= 1) return "linked";
    return plain === 1 && !linked ? "plain" : undefined;
  };
  const item = (c: NNode): Item => {
    const n = c.cluster ? Math.max(1, c.cluster.count) : 1;
    return { node: c.id, n, links: c.links / n, chars: c.chars / n, media: contentImages(c) / n, controls: c.controls / n, title: titleOf(c.id) };
  };
  const qualifies = (c: NNode) => c.links > 0 || c.chars >= 20;

  // Series per parent, pooled by (parent tag, item tag).
  const pools = new Map<string, { items: Item[]; parents: Set<number> }>();
  // Parents: every in-scope node, plus the outside parents of the territory's top nodes (a block of
  // sibling rows, or one collapsed cluster, has its series parent just outside the territory).
  const outside = [...new Set(scope.filter((i) => nodes[i].parent >= 0 && !inScope.has(nodes[i].parent)).map((i) => nodes[i].parent))];
  for (const p of [...scope, ...outside]) {
    const kids = nodes[p].children.filter((c) => inScope.has(c));
    const byTag = new Map<string, NNode[]>();
    for (const c of kids) {
      const tag = nodes[c].cluster?.tag ?? nodes[c].tag;
      byTag.set(tag, [...(byTag.get(tag) ?? []), nodes[c]]);
    }
    for (const [tag, cs] of byTag) {
      const q = cs.filter(qualifies);
      const n = q.reduce((s, c) => s + (c.cluster ? c.cluster.count : 1), 0);
      if (n < 3) continue;
      const key = `${nodes[p].tag} > ${tag}`;
      const pool = pools.get(key) ?? { items: [], parents: new Set<number>() };
      pool.items.push(...q.map(item));
      pool.parents.add(p);
      pools.set(key, pool);
    }
  }
  const cover = (its: Item[]) => (byLinks ? its.reduce((s, x) => s + x.links * x.n, 0) / Math.max(1, totalLinks) : its.reduce((s, x) => s + x.chars * x.n, 0) / Math.max(1, totalChars));
  const candidates = [...pools].map(([shape, p]) => ({ shape, ...p, count: p.items.reduce((s, x) => s + x.n, 0), coverage: cover(p.items) })).filter((c) => c.coverage >= 0.5);
  if (!candidates.length) return none(pools.size ? `repeated siblings exist but none covers half of the ${byLinks ? "links" : "text"}` : "no repeated sibling series of ≥ 3");
  // Titled entries are items even when their parts repeat inside them (an entry's metadata links
  // must not become the items): a series whose members mostly hold a title wins; otherwise the
  // finest series wins. A member titled by a PLAIN heading that holds a finer series of its own is a
  // headed group of items (a shelf of products, a footer column), not an entry: its items win.
  type Cand = (typeof candidates)[number];
  const share = (c: Cand, f: (x: Item) => boolean) => c.items.reduce((s, x) => s + (f(x) ? x.n : 0), 0) / Math.max(1, c.count);
  const holdsFiner = (c: Cand) =>
    candidates.some((d) => d.count > c.count && share(d, (x) => c.items.some((m) => x.node > m.node && x.node < nodes[m.node].end)) >= 0.5);
  const isEntries = (c: Cand) => share(c, (x) => !!x.title) >= 0.5 && !(share(c, (x) => x.title === "plain") >= 0.5 && holdsFiner(c));
  const entries = candidates.filter(isEntries);
  const best = (entries.length ? entries : candidates).sort((a, b) => b.count - a.count || b.coverage - a.coverage)[0];

  // Medians over items, a cluster weighing as its count.
  const expand = (f: (x: Item) => number) => best.items.flatMap((x) => Array(Math.min(x.n, 1000)).fill(f(x)) as number[]);
  const titled = best.items.reduce((s, x) => s + (x.title ? x.n : 0), 0);
  const linkTitled = best.items.reduce((s, x) => s + (x.title === "linked" ? x.n : 0), 0);
  const groups = structure && structure.source !== "none" ? structure.groups.length : 0;
  const lpi = median(expand((x) => x.links));
  const perGroup = groups ? median(structure!.groups.map((g) => (lpi > 0 ? g.items / lpi : 0)).filter((v) => v > 0)) : 0;
  const confidence: ItemForm["confidence"] = best.coverage >= 0.8 && best.count >= 5 ? "high" : "medium";
  return {
    source: "series",
    count: best.count,
    shape: best.shape,
    parents: best.parents.size,
    coverage: Math.min(1, best.coverage),
    linksPerItem: lpi,
    charsPerItem: median(expand((x) => x.chars)),
    mediaPerItem: median(expand((x) => x.media)),
    controlsPerItem: median(expand((x) => x.controls)),
    titled,
    titledShare: titled / Math.max(1, best.count),
    linkTitled,
    linkTitledShare: linkTitled / Math.max(1, best.count),
    groups,
    itemsPerGroup: perGroup,
    confidence,
    evidence: [
      `${best.count} items: ${best.shape} under ${best.parents.size} parent(s), covering ${Math.round(Math.min(1, best.coverage) * 100)}% of the ${byLinks ? "links" : "text"}`,
      ...(candidates.length > 1 ? [`coarser series also cover it: ${candidates.slice(1, 3).map((c) => `${c.count} × ${c.shape}`).join(", ")}`] : []),
    ],
  };
}
