import type { DomSnapshot, SnapshotNode } from "../snapshot/types";
import { classify, STRUCTURAL } from "./classify";
import { NodeFlag, type NNode, type NodeRole, type NormalizedDocument } from "./types";

/** Budget: past this, low-importance leaves are folded into their parents. */
export const MAX_NODES = 1600;
/** Deeper subtrees are folded into their ancestor at this level. */
export const MAX_LEVEL = 22;
/** Repeated siblings are clustered; small pages keep more of them individually. */
let CLUSTER_MIN = 12;
let CLUSTER_KEEP = 8;
const PROTECTED_IMAGES = 48;
const PROTECTED_BUTTONS = 40;

/** Working node. Mutable while we simplify, then flattened into NNode[]. */
interface W {
  tag: string;
  id?: string;
  classes?: string[];
  role: NodeRole;
  heading?: number;
  label?: string;
  snippet?: string;
  linkLabels?: string[];
  href?: string;
  image?: string;
  imagePriority: number;
  position?: "fixed" | "sticky";
  bg?: string;
  ariaHidden: boolean;
  domDepth: number;

  // Original subtree metrics, frozen after build.
  oChars: number;
  oLinks: number;
  oImages: number;
  oControls: number;
  oChildCount: number;
  oDescendants: number;

  // What this node renders itself (own + absorbed).
  text: number;
  ownLinks: number;
  ownImages: number;
  ownControls: number;
  absorbed: number;
  wrappers: number;

  children: W[];
  cluster?: { tag: string; count: number };
  mergedInto?: W;
  nid?: number;
}

interface Counters {
  images: number;
  headings: number;
  forms: number;
  buttons: number;
  idMap: Map<string, W>;
}

export function normalize(snapshot: DomSnapshot): NormalizedDocument {
  const counters: Counters = { images: 0, headings: 0, forms: 0, buttons: 0, idMap: new Map() };
  const big = snapshot.stats.elementCount > 4000;
  CLUSTER_MIN = big ? 12 : 32;
  CLUSTER_KEEP = big ? 8 : 20;
  const root = build(snapshot.root, 1, false, counters);

  simplify(root);
  capDepth(root, 0);
  const pruned = enforceBudget(root);

  const nodes = flatten(root, snapshot.source.finalUrl, counters.idMap);

  return {
    version: 1,
    source: snapshot.source,
    document: snapshot.document,
    colors: snapshot.styles.colors,
    style: snapshot.styles.signals,
    nodes,
    stats: {
      elements: snapshot.stats.elementCount,
      maxDomDepth: snapshot.stats.maxDepth + 1,
      images: root.oImages,
      links: root.oLinks,
      headings: counters.headings,
      forms: counters.forms,
      buttons: counters.buttons,
      districts: nodes[0]?.children.length ?? 0,
      kept: nodes.length,
      pruned,
    },
    warnings: snapshot.warnings,
  };
}

/* ───────────── 1. build: snapshot → working tree, original metrics ───────────── */

function build(s: SnapshotNode, depth: number, insideContent: boolean, c: Counters): W {
  const role = classify({
    tag: s.tag,
    id: s.id,
    classes: s.classes,
    role: s.attrs?.role,
    type: s.attrs?.type,
    depth,
    insideContent,
  });
  const heading = role === "heading" ? Number(/^h([1-6])$/.exec(s.tag)?.[1] ?? 2) : undefined;
  const isLink = s.tag === "a" && Boolean(s.attrs?.href);
  const isControl = role === "control" || role === "button";

  const w: W = {
    tag: s.tag,
    id: s.id,
    classes: s.classes,
    role,
    heading,
    label: s.sample ?? s.attrs?.["aria-label"] ?? s.attrs?.alt ?? s.attrs?.title,
    snippet: s.own,
    href: s.attrs?.href,
    image: s.image,
    imagePriority: 0,
    position: s.position,
    bg: s.bg,
    ariaHidden: s.attrs?.["aria-hidden"] === "true",
    domDepth: depth,
    oChars: s.text,
    oLinks: isLink ? 1 : 0,
    oImages: s.image || role === "image" ? 1 : 0,
    oControls: isControl ? 1 : 0,
    oChildCount: s.children.length,
    oDescendants: 0,
    text: s.text,
    ownLinks: isLink ? 1 : 0,
    ownImages: 0,
    ownControls: isControl ? 1 : 0,
    absorbed: 0,
    wrappers: 0,
    children: [],
  };

  if (s.image) {
    // Earlier images are usually more prominent (hero, header); alt text and declared size help.
    const area = Number(s.attrs?.width ?? 0) * Number(s.attrs?.height ?? 0);
    w.imagePriority = 1000 - Math.min(c.images * 4, 900) + (s.attrs?.alt ? 20 : 0) + Math.min(60, Math.log2(1 + area) * 3);
    c.images++;
  }
  if (heading) c.headings++;
  if (role === "form") c.forms++;
  if (role === "button") c.buttons++;
  if (s.id && !c.idMap.has(s.id)) c.idMap.set(s.id, w);

  const childInside = insideContent || ["article", "section", "main", "aside", "header", "footer"].includes(role);
  for (const sc of s.children) {
    const cw = build(sc, depth + 1, childInside, c);
    w.children.push(cw);
    w.oChars += cw.oChars;
    w.oLinks += cw.oLinks;
    w.oImages += cw.oImages;
    w.oControls += cw.oControls;
    w.oDescendants += 1 + cw.oDescendants;
  }
  return w;
}

/* ───────────── 2. simplify: absorb inline, cluster repeats, collapse wrappers ───────────── */

function simplify(w: W): void {
  const kids = w.children;
  w.children = [];
  for (const k of kids) {
    simplify(k);
    if (shouldAbsorb(w, k)) absorbLeaf(w, k);
    else w.children.push(k);
  }
  clusterRepeats(w);
  collapseWrappers(w);
}

function isEmpty(w: W): boolean {
  if (w.children.length || w.text > 0 || w.image || w.cluster) return false;
  return !(w.role === "control" || w.role === "button" || w.role === "media" || w.role === "image" || (w.role === "link" && w.href));
}

function shouldAbsorb(parent: W, c: W): boolean {
  if (c.children.length) return false;
  if (c.role === "inline" || c.role === "icon" || isEmpty(c)) return true;
  // A link inside running text is part of the text; a link standing alone is a structure.
  if (c.role === "link" && (parent.text > 0 || parent.role === "text" || parent.role === "heading" || parent.role === "button"))
    return true;
  return false;
}

/** Merge a leaf into its parent. The parent keeps the leaf's content as its own. */
function absorbLeaf(p: W, c: W): void {
  p.text += c.text;
  if (c.role === "link" && c.label && (p.linkLabels?.length ?? 0) < 12) (p.linkLabels ??= []).push(c.label.slice(0, 40));
  if (c.linkLabels) for (const l of c.linkLabels) if ((p.linkLabels?.length ?? 0) < 12) (p.linkLabels ??= []).push(l);
  if (c.snippet && (p.snippet?.length ?? 0) < 70) p.snippet = p.snippet ? `${p.snippet} ${c.snippet}`.slice(0, 90) : c.snippet;
  p.ownLinks += c.ownLinks;
  p.ownImages += c.ownImages + (c.image ? 1 : 0);
  p.ownControls += c.ownControls;
  p.absorbed += 1 + c.absorbed;
  // The parent inherits the first meaningful label it swallows (a story title, a card's link).
  if (!p.label && c.label && (p.role === "heading" || p.role === "button" || p.role === "link" || c.role === "link" || c.role === "heading")) p.label = c.label;
  c.mergedInto = p;
}

/** Fold a whole subtree into `p` (used by the depth cap and budget fallbacks). */
function absorbSubtree(p: W, c: W): void {
  for (const k of c.children) absorbSubtree(c, k);
  c.children = [];
  absorbLeaf(p, c);
}

const isGeneric = (w: W) => w.role === "container" || w.role === "inline" || (w.role === "item" && w.text === 0);

function collapseWrappers(w: W): void {
  for (;;) {
    if (w.children.length !== 1 || w.text > 0 || w.image) return;
    const c = w.children[0];
    if (w.role !== "root" && isGeneric(w)) {
      // The wrapper disappears; its child inherits it as pedestal height.
      // We can't replace `w` in its parent from here, so we turn `w` into `c` in place.
      const self = { ...w };
      Object.assign(w, c, {
        wrappers: c.wrappers + 1 + self.wrappers,
        absorbed: c.absorbed + 1 + self.absorbed,
        position: c.position ?? self.position,
        bg: c.bg ?? self.bg,
      });
      // Pointers that referenced the child (id map, anchors) now resolve to `w`.
      c.mergedInto = w;
      continue;
    }
    if (isGeneric(c) && c.text === 0 && !c.image && c.children.length > 0) {
      w.children = c.children;
      w.wrappers += 1 + c.wrappers;
      w.absorbed += 1 + c.absorbed;
      w.position ??= c.position;
      w.bg ??= c.bg;
      c.mergedInto = w;
      continue;
    }
    return;
  }
}

function signature(w: W): string {
  return `${w.role}|${w.tag}|${w.classes?.[0] ?? ""}`;
}

function represented(w: W): number {
  let n = 1 + w.absorbed;
  for (const c of w.children) n += represented(c);
  return n;
}

function markMerged(w: W, into: W): void {
  w.mergedInto = into;
  for (const c of w.children) markMerged(c, into);
}

function clusterRepeats(w: W): void {
  if (w.children.length <= CLUSTER_MIN) return;
  const counts = new Map<string, number>();
  for (const c of w.children) counts.set(signature(c), (counts.get(signature(c)) ?? 0) + 1);
  const repeated = new Set([...counts].filter(([, n]) => n > CLUSTER_MIN).map(([s]) => s));
  if (!repeated.size) return;

  const seen = new Map<string, number>();
  const clusters = new Map<string, W>();
  const out: W[] = [];
  for (const c of w.children) {
    const sig = signature(c);
    if (!repeated.has(sig)) {
      out.push(c);
      continue;
    }
    const n = (seen.get(sig) ?? 0) + 1;
    seen.set(sig, n);
    if (n <= CLUSTER_KEEP) {
      out.push(c);
      continue;
    }
    let cl = clusters.get(sig);
    if (!cl) {
      cl = {
        ...c,
        id: undefined,
        role: "cluster",
        heading: undefined,
        image: undefined,
        label: undefined,
        cluster: { tag: c.tag, count: 0 },
        oChars: 0, oLinks: 0, oImages: 0, oControls: 0, oChildCount: 0, oDescendants: 0,
        text: 0, ownLinks: 0, ownImages: 0, ownControls: 0, absorbed: -1, wrappers: 0,
        children: [],
        mergedInto: undefined,
      };
      clusters.set(sig, cl);
      out.push(cl);
    }
    cl.cluster!.count++;
    cl.oChars += c.oChars;
    cl.oLinks += c.oLinks;
    cl.oImages += c.oImages;
    cl.oControls += c.oControls;
    cl.oChildCount++;
    cl.oDescendants += 1 + c.oDescendants;
    cl.text += c.oChars;
    cl.ownLinks += c.oLinks;
    cl.ownImages += c.oImages;
    cl.ownControls += c.oControls;
    cl.absorbed += represented(c);
    markMerged(c, cl);
  }
  w.children = out;
}

/* ───────────── 3. depth cap and global budget ───────────── */

function capDepth(w: W, level: number): void {
  if (level >= MAX_LEVEL) {
    for (const c of w.children) absorbSubtree(w, c);
    w.children = [];
    return;
  }
  for (const c of w.children) capDepth(c, level + 1);
}

function importance(w: W): number {
  switch (w.role) {
    case "heading":
      return [0, 2000, 400, 160, 60, 40, 30][w.heading ?? 3];
    case "image":
    case "media":
      return 40 + w.imagePriority / 20;
    case "button":
      return 45;
    case "control":
      return 25;
    case "cluster":
      return 35;
    case "link":
      return 8;
    default:
      return 4 + Math.log2(1 + w.text) * 3 + (w.image ? 30 : 0) + w.ownImages * 4;
  }
}

/** Min-heap keyed by importance. */
class Heap {
  private a: Array<{ k: number; w: W }> = [];
  get size() {
    return this.a.length;
  }
  push(w: W, k: number) {
    const a = this.a;
    a.push({ k, w });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].k <= a[i].k) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): W | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0].w;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function enforceBudget(root: W): number {
  const parents = new Map<W, W>();
  const all: W[] = [];
  const walk = (w: W) => {
    all.push(w);
    for (const c of w.children) {
      parents.set(c, w);
      walk(c);
    }
  };
  walk(root);
  let count = all.length;
  const initial = count;
  if (count <= MAX_NODES) return 0;

  const topImages = new Set(
    all.filter((w) => w.image).sort((a, b) => b.imagePriority - a.imagePriority).slice(0, PROTECTED_IMAGES),
  );
  const topButtons = new Set(all.filter((w) => w.role === "button").slice(0, PROTECTED_BUTTONS));
  const isProtected = (w: W, strict: boolean) =>
    w === root ||
    (strict &&
      (STRUCTURAL.has(w.role) || (w.heading !== undefined && w.heading <= 3) || topImages.has(w) || topButtons.has(w)));

  for (const strict of [true, false]) {
    const heap = new Heap();
    for (const w of all) if (!w.children.length && !w.mergedInto && !isProtected(w, strict)) heap.push(w, importance(w) - w.domDepth * 0.2);
    while (count > MAX_NODES && heap.size) {
      const w = heap.pop()!;
      if (w.mergedInto || w.children.length) continue;
      const p = parents.get(w);
      if (!p) continue;
      p.children.splice(p.children.indexOf(w), 1);
      absorbLeaf(p, w);
      count--;
      if (!p.children.length && !isProtected(p, strict)) heap.push(p, importance(p) - p.domDepth * 0.2);
    }
    if (count <= MAX_NODES) break;
  }
  return initial - count;
}

/* ───────────── 4. flatten into pre-order NNode[] ───────────── */

function selectorOf(w: W): string {
  const id = w.id ? `#${w.id}` : "";
  const cls = w.classes?.[0] ? `.${w.classes[0]}` : "";
  return `${w.tag}${id}${cls}`.slice(0, 72);
}

function resolve(w: W | undefined): W | undefined {
  let cur = w;
  let guard = 0;
  while (cur && cur.nid === undefined && cur.mergedInto && guard++ < 64) cur = cur.mergedInto;
  return cur?.nid !== undefined ? cur : undefined;
}

function flatten(root: W, finalUrl: string, idMap: Map<string, W>): NNode[] {
  const nodes: NNode[] = [];
  let origin = "";
  try {
    origin = new URL(finalUrl).origin;
  } catch {}

  const visit = (w: W, parent: number, level: number): number => {
    const id = nodes.length;
    w.nid = id;
    const ownImages = w.ownImages + (w.image ? 1 : 0);
    const selfWeight = 1 + w.absorbed + w.text / 180 + 3 * ownImages + 2 * w.ownControls + 0.4 * w.ownLinks;

    let flags = 0;
    if (w.position === "fixed") flags |= NodeFlag.FIXED;
    if (w.position === "sticky") flags |= NodeFlag.STICKY;
    if (STRUCTURAL.has(w.role) || (w.heading !== undefined && w.heading <= 2)) flags |= NodeFlag.LANDMARK;
    if (w.children.length && (w.text > 40 || w.image)) flags |= NodeFlag.OWN_CONTENT;
    if (w.ariaHidden) flags |= NodeFlag.ARIA_HIDDEN;

    const n: NNode = {
      id,
      parent,
      end: id + 1,
      level,
      children: [],
      tag: w.tag,
      role: w.role,
      selector: w.cluster ? `${selectorOf(w)} × ${w.cluster.count}` : selectorOf(w),
      label: w.label?.slice(0, 90),
      snippet: w.snippet?.slice(0, 90),
      linkLabels: w.linkLabels,
      names: [w.id, ...(w.classes ?? [])].filter(Boolean).join(" ").toLowerCase().slice(0, 160) || undefined,
      heading: w.heading,
      domDepth: w.domDepth,
      wrappers: w.wrappers,
      absorbed: Math.max(0, w.absorbed),
      chars: w.oChars,
      links: w.oLinks,
      images: w.oImages,
      controls: w.oControls,
      childCount: w.oChildCount,
      descendants: w.oDescendants,
      ownChars: w.text,
      selfWeight: Math.round(selfWeight * 100) / 100,
      weight: 0,
      flags,
    };
    if (w.image) n.image = { src: w.image, alt: w.label, priority: Math.round(w.imagePriority) };
    if (w.bg) n.tint = w.bg;
    if (w.cluster) n.cluster = { ...w.cluster };
    nodes.push(n);

    for (const c of w.children) n.children.push(visit(c, id, level + 1));
    n.end = nodes.length;
    n.weight = n.selfWeight;
    for (const cid of n.children) n.weight += nodes[cid].weight;
    n.weight = Math.round(n.weight * 100) / 100;
    return id;
  };
  visit(root, -1, 0);

  // Links: classify and wire in-page anchors to their (surviving) targets.
  const walk = (w: W) => {
    if (w.nid !== undefined && w.href) {
      const n = nodes[w.nid];
      if (w.href.startsWith("#")) {
        const target = resolve(idMap.get(decodeURIComponent(w.href.slice(1))));
        n.link = { kind: "anchor", target: target && target.nid !== w.nid ? target.nid : undefined };
      } else {
        let internal = false;
        let path: string | undefined;
        try {
          const u = new URL(w.href);
          internal = u.origin === origin;
          if (internal) path = u.pathname.slice(0, 60);
        } catch {}
        n.link = { kind: internal ? "internal" : "external", path };
      }
    }
    for (const c of w.children) walk(c);
  };
  walk(root);
  return nodes;
}
