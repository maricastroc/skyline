/**
 * Page-model hygiene: corrections to how much each part of a page weighs, and an observable
 * segmentation for pages the semantic pass barely understands. Everything here is a statement
 * about the page (what it contains, how it is organised); nothing knows how the page is drawn.
 *
 *   H1 CONTENT WEIGHT   The structural weight of a subtree counts every element. Incidental
 *                       imagery (snapshot/media.ts: spacers, icons, repeated or interface
 *                       images) is not content, so its contribution is removed: each image
 *                       element weighs 1 (the element) + 3 (the image) in the model, hence
 *                       contentWeight = weight − 4 × incidental images. A subtree with no
 *                       text, links, controls or content media (only incidental imagery and the
 *                       elements wrapping it) has no content weight at all.
 *   H2 CHROME           Navigation, footer, brand, and utility forms / calls to action / sidebars
 *                       outside the main content are the page's chrome: site-wide support that
 *                       repeats on every page. Chrome keeps its share while small and is
 *                       compressed as it grows, so that it can approach but never exceed the
 *                       page's own content: a total chrome share S becomes S / (1 + S), spread
 *                       over the chrome regions in proportion. Monotone (more chrome content →
 *                       more weight), bounded below 1/2.
 *   H3 OBSERVED BLOCKS  When named regions cover little of the page, the uncovered content is
 *                       segmented by what is observable: descend through wrappers that hold most
 *                       of their parent; the children of the first real split are blocks; small
 *                       neighbours are grouped. Blocks are labelled only by structure (list,
 *                       table, links, text, media, headings) — no kind is invented.
 */
import type { NNode, NormalizedDocument } from "../model/types";
import type { Region, Semantics } from "./analyze";

/* ───────────── H1 ───────────── */

export const contentImages = (n: NNode) => n.images - (n.incidentalImages ?? 0);
/** A subtree with no text, links, controls or content media holds no content at all (H1b). */
export const contentWeight = (n: NNode) => (n.chars === 0 && n.links === 0 && n.controls === 0 && contentImages(n) === 0 ? 0 : Math.max(0, n.weight - 4 * (n.incidentalImages ?? 0)));

/* ───────────── H2 ───────────── */

export function chromeOf(doc: NormalizedDocument, sem: Semantics): Map<number, string> {
  const nodes = doc.nodes;
  const inside = (a: number, b: number) => a >= b && a < nodes[b].end;
  const mainNodes = [...(sem.main >= 0 ? [sem.regions[sem.main].node] : []), ...sem.districts.map((d) => sem.regions[d].node)];
  const inContent = (r: Region) => mainNodes.some((m) => inside(r.node, m) || inside(m, r.node));
  const footer = sem.footer >= 0 ? sem.regions[sem.footer].node : -1;
  const out = new Map<number, string>();
  for (const r of sem.regions) {
    if (r.kind === "nav" || r.kind === "footer" || r.kind === "brand") out.set(r.id, `${r.kind}: site-wide chrome`);
    else if (footer >= 0 && inside(r.node, footer)) out.set(r.id, "inside the footer");
    else if ((r.kind === "form" || r.kind === "cta" || r.kind === "sidebar") && !inContent(r)) out.set(r.id, `${r.kind} outside the main content: utility chrome`);
  }
  return out;
}

/** S → S/(1+S): the factor every chrome share is multiplied by, and the one for the rest. */
export function chromeFactors(chromeShare: number) {
  const S = Math.min(Math.max(chromeShare, 0), 0.999);
  const target = S / (1 + S);
  return { chrome: S > 0 ? target / S : 1, content: (1 - target) / (1 - S), before: S, after: target };
}

/* ───────────── H3 ───────────── */

export interface ObservedBlock {
  /** Node ids (a block is one node, or a group of consecutive small siblings). */
  nodes: number[];
  label: string;
  /** Share of the page's content weight. */
  share: number;
}

/**
 * Segment the content outside `covered` (node ids of named regions) into observable blocks.
 * `minShare`: blocks smaller than this share of the page are grouped with their neighbours;
 * `wrapper`: a node whose largest child holds this much of it is a wrapper, not a split.
 */
export function observedBlocks(doc: NormalizedDocument, covered: number[], minShare = 1 / 32, wrapper = 0.8): ObservedBlock[] {
  const nodes = doc.nodes;
  const total = contentWeight(nodes[0]) || 1;
  const isCovered = (i: number) => covered.some((c) => i >= c && i < nodes[c].end);
  const free = (i: number): number => {
    // Content weight of the node minus what covered regions inside it hold.
    if (isCovered(i)) return 0;
    let w = contentWeight(nodes[i]);
    for (const c of covered) if (c > i && c < nodes[i].end && !covered.some((o) => o !== c && c > o && c < nodes[o].end)) w -= contentWeight(nodes[c]);
    return Math.max(0, w);
  };
  const out: ObservedBlock[] = [];
  const emit = (ids: number[]) => {
    const share = ids.reduce((s, i) => s + free(i), 0) / total;
    if (share > 0) out.push({ nodes: ids, label: labelOf(doc, ids), share });
  };
  const split = (i: number, depth: number) => {
    const kids = nodes[i].children.filter((c) => free(c) > 0);
    const here = free(i);
    const own = here - kids.reduce((s, c) => s + free(c), 0);
    if (!kids.length || depth > 8) return emit([i]);
    const big = kids.reduce((a, b) => (free(b) > free(a) ? b : a));
    if (free(big) >= wrapper * here) {
      split(big, depth + 1);
      const rest = kids.filter((c) => c !== big);
      if ((rest.reduce((s, c) => s + free(c), 0) + Math.max(own, 0)) / total >= minShare) emit(rest.length ? rest : [i]);
      return;
    }
    let group: number[] = [];
    const flush = () => {
      if (group.length) emit(group);
      group = [];
    };
    for (const c of kids) {
      if (free(c) / total >= minShare) {
        flush();
        if (nodes[c].children.length && free(c) / total >= 4 * minShare) split(c, depth + 1);
        else emit([c]);
      } else {
        group.push(c);
        if (group.reduce((s, g) => s + free(g), 0) / total >= minShare) flush();
      }
    }
    flush();
  };
  split(0, 0);
  return out;
}

function labelOf(doc: NormalizedDocument, ids: number[]): string {
  const ns = ids.map((i) => doc.nodes[i]);
  const chars = ns.reduce((s, n) => s + n.chars, 0);
  const links = ns.reduce((s, n) => s + n.links, 0);
  const media = ns.reduce((s, n) => s + contentImages(n), 0);
  const cluster = ns.find((n) => n.cluster);
  const table = ns.some((n) => n.role === "table");
  const heading = ns.find((n) => n.heading)?.label ?? ns.map((n) => n.label).find(Boolean);
  const what = cluster ? `list of ${cluster.cluster!.count} ${cluster.cluster!.tag}` : table ? "table" : media >= 3 ? `${media} images` : links / Math.max(chars / 100, 1) >= 2.5 ? `${links} links` : `${chars} chars of text`;
  return `${what}${ids.length > 1 ? ` (${ids.length} blocks)` : ""}${heading ? ` · “${heading.slice(0, 30)}”` : ""}`;
}
