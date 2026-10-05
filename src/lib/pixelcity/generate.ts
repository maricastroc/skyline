import { computeFingerprint } from "../fingerprint/fingerprint";
import { hexToRgb, mix, oklch, rgbToCss, rgbToOklch } from "../city/palette";
import type { RGB } from "../city/types";
import { NodeFlag, type NNode, type NormalizedDocument } from "../model/types";
import { analyzeSemantics, REGION_LABEL, type Region, type RegionKind } from "../semantics/analyze";
import { deriveGrammar, type ArchStyle, type CityGrammar } from "./grammar";
import { buildGamePalette, type GamePalette } from "./palette";
import { h01 } from "./hash";
import { textWidth } from "./pixel-font";
import { addWorld, plantTree } from "./scenery";
import { Surf, type Building, type CityFrame, type BuildingKind, type Influence, type Part, type PixelCity, type RoadSeg, type SignSpec, type Zone } from "./types";

const FLOOR = 0.5;
const SIGN_TEXEL = 0.11;
const SIGN_ATLAS = { w: 512, h: 512 };
const MAX_IMAGES = 48;
const PRICE_RE = /(?:[$€£¥]|R\$|US\$)\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:[$€£])|\bfree\b/i;
const CHROME_LABEL = /^\s*(up ?vote|down ?vote|vote|hide|flag|reply|edit|share|more|next|prev(ious)?|log ?in|sign ?in|sign ?up|menu|close|search|toggle.*|skip.*|jump.*|navigate.*|open (menu|navigation)|read more|view|go|home|top|\d+|[^a-z0-9]*)\s*$/i;

function gameTint(hex: string | undefined): RGB | null {
  if (!hex) return null;
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { l, c, h } = rgbToOklch(rgb);
  if (c < 0.05 || l > 0.95) return null;
  return oklch(Math.min(0.72, Math.max(0.55, l)), Math.min(0.17, Math.max(0.1, c)), h);
}

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Unit {
  node: number;
  kind: BuildingKind;
  weight: number;
  fw: number;
  fd: number;
  label?: string;
  labels: string[];
  imageSlot: number;
  chars: number;
  heading: number;
  repeat: number;
  style: ArchStyle;
  tint: RGB | null;
  rank?: number;
  of?: number;
  price?: string;
  question?: boolean;
}

interface LNode {
  id: number;
  level: number;
  unit?: Unit;
  children: LNode[];
  area: number;
}

const q = (s?: string, n = 36) => (s ? `“${s.length > n ? `${s.slice(0, n - 1)}…` : s}”` : "");

const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "with", "from", "by", "at", "is", "are", "how", "why", "what", "your", "you", "my", "our", "new", "now", "this", "that", "its", "it's", "into", "via"]);
function keywords(label: string | undefined, n: number, maxChars: number): string | undefined {
  if (!label) return undefined;
  const clean = label.replace(/^(show|ask|launch|tell) hn:\s*/i, "").replace(/[“”"'()[\]]/g, " ");
  const words = clean.split(/[\s/–—:,.|]+/).filter(Boolean);
  const good = words.filter((w) => w.length >= 2 && w.length <= maxChars && !STOP.has(w.toLowerCase()));
  if (good.length) return good.slice(0, n).join(" ");
  return words[0]?.slice(0, maxChars);
}

function keyword(label: string | undefined, maxChars = 9): string | undefined {
  if (!label) return undefined;
  const clean = label.replace(/^(show|ask|launch|tell) hn:\s*/i, "").replace(/[“”"'()[\]]/g, " ");
  const words = clean.split(/[\s/–—\-:,.|]+/).filter(Boolean);
  const good = words.find((w) => w.length >= 3 && w.length <= maxChars && !STOP.has(w.toLowerCase()));
  return good ?? words.find((w) => w.length <= maxChars) ?? words[0]?.slice(0, maxChars);
}

export function generatePixelCity(doc: NormalizedDocument, opts: { frame?: CityFrame } = {}): PixelCity {
  const frame = opts.frame ?? "island";
  const fp = computeFingerprint(doc);
  const grammar = deriveGrammar(fp);
  const palette = buildGamePalette(fp, grammar);
  const sem = analyzeSemantics(doc);
  const nodes = doc.nodes;
  const N = nodes.length;
  const R = sem.regions;
  const regionAt = (node: number): Region | null => (node >= 0 && sem.regionOf[node] >= 0 ? R[sem.regionOf[node]] : null);
  const regionRootAt = (node: number): Region | null => R.find((r) => r.node === node) ?? null;
  const inside = (i: number, outer: number) => i >= outer && i < nodes[outer].end;
  const span = (node: number): [number, number] => [node, nodes[node].end];
  const total = nodes[0]?.weight || 1;

  const imageNodes = nodes
    .filter((n) => n.image && (n.image.proxy || n.image.src))
    .map((n) => {
      const r = regionAt(n.id);
      const boost = r && (r.kind === "hero" || r.kind === "gallery" || r.kind === "logos" || r.kind === "infobox") ? 500 : 0;
      return { n, p: n.image!.priority + boost };
    })
    .sort((a, b) => b.p - a.p)
    .slice(0, MAX_IMAGES)
    .map((x) => x.n);
  const slotOf = new Map<number, number>();
  const images = imageNodes.map((n, slot) => {
    slotOf.set(n.id, slot);
    return { node: n.id, slot, src: n.image!.proxy ?? n.image!.src };
  });
  const firstSlotIn = (node: number) => {
    for (let k = node; k < nodes[node].end; k++) if (slotOf.has(k)) return slotOf.get(k)!;
    return -1;
  };

  const tintCache = new Map<number, RGB | null>();
  const tintFor = (id: number): RGB | null => {
    for (let i = id, hops = 0; i >= 0 && hops < 4; i = nodes[i].parent, hops++) {
      if (tintCache.has(i)) return tintCache.get(i)!;
      const t = gameTint(nodes[i].tint);
      if (t) {
        tintCache.set(i, t);
        return t;
      }
    }
    return null;
  };
  const unitWeight = total / grammar.units;
  let kiosks = 0;
  let towersLeft = Math.round(3 + grammar.towers * 9 + grammar.verticality * 6);
  const styleFor = (node: number): ArchStyle => (h01(node, 11) < grammar.secondaryShare ? grammar.secondary : grammar.style);

  const makeUnit = (id: number, forced?: BuildingKind, extra: Partial<Unit> = {}): Unit => {
    const n = nodes[id];
    let minHeading = 7;
    let headingLabel: string | undefined;
    let controls = 0;
    let buttons = 0;
    let media = 0;
    let linkCount = 0;
    let hasForm = n.role === "form";
    const labels: string[] = [];
    const anyLabels: string[] = [];
    for (let i = id; i < n.end; i++) {
      const m = nodes[i];
      if (m.heading && m.heading < minHeading) {
        minHeading = m.heading;
        headingLabel = m.label;
      }
      if (m.role === "form") hasForm = true;
      if (m.role === "control") controls++;
      if (m.role === "button") buttons++;
      if (m.role === "media") media++;
      if (m.role === "link") {
        linkCount++;
        if (m.label && labels.length < 8 && !CHROME_LABEL.test(m.label)) labels.push(m.label);
      }
      if (m.label && anyLabels.length < 8 && m.role !== "image" && !CHROME_LABEL.test(m.label)) anyLabels.push(m.label);
    }
    const imageSlot = firstSlotIn(id);
    const chars = n.chars;
    const links = Math.max(n.links, linkCount);
    const repeat = n.cluster ? Math.min(n.cluster.count, 10) : n.role === "list" || n.role === "table" ? Math.min(n.children.length, 10) : 0;

    let kind: BuildingKind;
    const kioskOk = kiosks < 3 + Math.round(grammar.neon * 8);
    if (forced) kind = forced;
    else if (hasForm || controls >= 2) kind = "factory";
    else if (links >= 3 && chars / Math.max(links, 1) < 28) kind = "shops";
    else if (imageSlot >= 0 && n.images * 260 > chars) kind = "billboard";
    else if (media > 0) kind = "billboard";
    else if (repeat >= 3 && grammar.repetition > 0.25) kind = "rowhouses";
    else if (buttons > 0 && chars < 80 && kioskOk) kind = "kiosk";
    else if (minHeading <= 3 && towersLeft > 0) {
      kind = "tower";
      towersLeft--;
    } else if (chars > 350 || n.weight > unitWeight * 1.5) kind = "office";
    else kind = "house";

    const area = Math.max(1, Math.min(12, Math.round(2.2 * Math.sqrt(n.weight / unitWeight))));
    let fw = Math.max(1, Math.round(Math.sqrt(area)));
    let fd = Math.max(1, Math.ceil(area / fw));
    switch (kind) {
      case "landmark":
        [fw, fd] = [3, 3];
        break;
      case "shops":
        [fw, fd] = [2 * Math.max(1, Math.min(labels.length || anyLabels.length || links, 4)), 1];
        break;
      case "rowhouses":
        [fw, fd] = [Math.max(3, repeat), 1];
        break;
      case "factory":
        [fw, fd] = [3, 2];
        break;
      case "kiosk":
        [fw, fd] = [1, 1];
        kiosks++;
        break;
      case "billboard":
        [fw, fd] = [Math.max(2, fw), Math.max(2, fd)];
        break;
      case "ensemble":
        [fw, fd] = [2, 2];
        break;
      case "pricing":
        [fw, fd] = [2, 2];
        break;
      case "statue":
        [fw, fd] = [1, 1];
        break;
      case "screen":
        [fw, fd] = [2, 1];
        break;
      case "stall":
        [fw, fd] = [1, 1];
        break;
      case "archive":
        [fw, fd] = [4, 1];
        break;
      case "temple":
        [fw, fd] = [3, 3];
        break;
    }
    return {
      node: id,
      kind,
      weight: n.weight,
      fw,
      fd,
      label: headingLabel ?? n.label ?? anyLabels[0],
      labels: labels.length ? labels : anyLabels,
      imageSlot,
      chars,
      heading: minHeading,
      repeat,
      style: kind === "landmark" ? grammar.style : styleFor(id),
      tint: tintFor(id),
      ...extra,
    };
  };

  const labelOf = (i: number): { label?: string } => {
    const found: string[] = [];
    for (let k2 = i; k2 < nodes[i].end && found.length < 6; k2++) {
      for (const l of [nodes[k2].label, ...(nodes[k2].linkLabels ?? [])]) if (l && !CHROME_LABEL.test(l)) found.push(l);
    }
    const best = found.sort((a, b) => b.length - a.length)[0];
    return best ? { label: best } : {};
  };
  const unitNode = (id: number, level: number, forced?: BuildingKind, extra?: Partial<Unit>): LNode => ({ id, level, unit: makeUnit(id, forced, extra), children: [], area: 0 });
  const group = (id: number, level: number, children: LNode[]): LNode => (children.length === 1 ? { ...children[0], level } : { id, level, children, area: 0 });
  const rows = (id: number, level: number, items: LNode[], per: number): LNode => {
    if (items.length <= per) return group(id, level, items);
    const out: LNode[] = [];
    for (let i = 0; i < items.length; i += per) out.push(group(items[i].id, level + 1, items.slice(i, i + per).map((x) => ({ ...x, level: level + 2 }))));
    return group(id, level, out);
  };

  const collectRegion = (r: Region, level: number): LNode => {
    const items = r.items.filter((i) => i >= 0 && i < N);
    switch (r.kind) {
      case "features":
        return rows(r.node, level, items.map((i) => unitNode(i, level + 1, "ensemble")), 4);
      case "pricing": {
        const tiers = items.slice(0, 5);
        return group(
          r.node,
          level,
          tiers.map((i, k) => {
            const n = nodes[i];
            let price: string | undefined;
            for (let j = i; j < n.end && !price; j++) price = PRICE_RE.exec(`${nodes[j].label ?? ""} ${nodes[j].snippet ?? ""}`)?.[0];
            return unitNode(i, level + 1, "pricing", { rank: k, of: tiers.length, price: price?.replace(/\s/g, "") });
          }),
        );
      }
      case "gallery":
      case "logos":
        return rows(r.node, level, items.slice(0, 12).map((i) => unitNode(i, level + 1, "screen")), 4);
      case "testimonials":
        return group(r.node, level, (items.length ? items : [r.node]).slice(0, 8).map((i) => unitNode(i, level + 1, "statue")));
      case "faq":
        return rows(r.node, level, (items.length ? items : [r.node]).slice(0, 10).map((i) => unitNode(i, level + 1, "house", { question: true })), 4);
      case "feed":
        return rows(r.node, level, items.slice(0, 40).map((i, k) => unitNode(i, level + 1, "shops", { rank: k, fw: 3, fd: 1, ...labelOf(i) })), 3);
      case "directory":
        return rows(r.node, level, items.slice(0, 16).map((i) => unitNode(i, level + 1, "stall")), 6);
      case "references": {
        const n = nodes[r.node];
        const stacks = Math.max(3, Math.min(14, Math.round(Math.sqrt(n.descendants) / 2.2)));
        return rows(r.node, level, Array.from({ length: stacks }, () => unitNode(r.node, level + 1, "archive")), 2);
      }
      case "infobox":
        return unitNode(r.node, level, "temple");
      default:
        return collect(r.node, level, true);
    }
  };

  const FORMS = new Set<RegionKind>(["features", "pricing", "gallery", "logos", "testimonials", "faq", "feed", "directory", "references", "infobox"]);
  const collect = (id: number, level: number, self = false): LNode => {
    const n = nodes[id];
    const rr = self ? null : regionRootAt(id);
    if (rr && FORMS.has(rr.kind)) return collectRegion(rr, level);
    if (!n.children.length || n.weight <= unitWeight || level >= 7) return unitNode(id, level);
    const kids: LNode[] = [];
    if (n.flags & NodeFlag.OWN_CONTENT && n.ownChars > 60) kids.push(unitNode(id, level + 1, n.chars > 350 ? "office" : "house"));
    for (const c of n.children) kids.push(collect(c, level + 1));
    return group(id, level, kids);
  };

  const heroR = sem.hero >= 0 ? R[sem.hero] : null;
  const navR = sem.nav >= 0 ? R[sem.nav] : null;
  const footerR = sem.footer >= 0 ? R[sem.footer] : null;
  const brandR = sem.brand >= 0 ? R[sem.brand] : null;
  const tocR = R.find((r) => r.kind === "toc") ?? null;
  const ctaR = sem.ctas.length ? R[sem.ctas[0]] : null;

  const districtRegions = sem.districts.map((i) => R[i]).filter((r) => r.kind !== "toc");
  const covered = (i: number) =>
    [heroR, navR, footerR, brandR, tocR, ...sem.sidebars.map((s) => R[s]), ...districtRegions].some((r) => r && inside(i, r.node));
  const extra: number[] = [];
  {
    const scope = sem.main >= 0 ? R[sem.main].node : 0;
    const scan = (i: number, depth: number) => {
      for (const c of nodes[i].children) {
        if (covered(c)) continue;
        const s = nodes[c].weight / total;
        if (s < 0.025) continue;
        const spine = [heroR, navR, footerR, brandR, tocR, ...sem.sidebars.map((x) => R[x]), ...districtRegions];
        const hasCovered = spine.some((r) => r && inside(r.node, c));
        if (hasCovered && depth < 4) scan(c, depth + 1);
        else if (!hasCovered) extra.push(c);
      }
    };
    scan(scope, 0);
  }
  type DItem = { region: Region | null; node: number; tree: LNode; title?: string; end?: number };
  const feedBlocks = (r: Region): DItem[] => {
    const items = r.items.slice(0, 40);
    const out: DItem[] = [];
    for (let i = 0; i < items.length; i += 10) {
      const chunk = items.slice(i, i + 10);
      const units = chunk.map((it, k) => unitNode(it, 4, "shops", { rank: i + k, fw: 3, fd: 1, ...labelOf(it) }));
      out.push({ region: r, node: chunk[0], end: nodes[chunk[chunk.length - 1]].end, tree: relevel(rows(chunk[0], 2, units, 3), 2), title: `${i + 1}-${i + chunk.length}` });
    }
    return out;
  };
  const dItems: DItem[] = [
    ...districtRegions.flatMap((r) => (r.kind === "feed" && r.items.length > 12 ? feedBlocks(r) : [{ region: r, node: r.node, tree: relevel(collectRegion(r, 2), 2), title: r.title }])),
    ...extra.map((c) => ({ region: null, node: c, tree: relevel(collect(c, 2), 2), title: firstHeadingLabel(c) ?? keyword(nodes[c].label ?? nodes[c].snippet, 12) })),
  ].sort((a, b) => a.node - b.node);

  function relevel(l: LNode, level: number): LNode {
    return { ...l, level, children: l.children.map((c) => relevel(c, level + 1)) };
  }
  function firstHeadingLabel(i: number) {
    for (let k = i; k < Math.min(nodes[i].end, i + 40); k++) if (nodes[k].heading) return nodes[k].label;
    return undefined;
  }

  const gapAt = (level: number): { size: number; road: boolean } => {
    if (level <= 2) return { size: grammar.streetLevels >= 2 ? 1 : grammar.parks > 0.45 ? 1 : 0, road: grammar.streetLevels >= 2 };
    if (level === 3 && grammar.streetLevels >= 3) return { size: 1, road: true };
    return { size: grammar.parks > 0.55 ? 1 : 0, road: false };
  };
  const areaOf = (l: LNode): number => {
    if (l.unit) {
      const fpArea = l.unit.fw * l.unit.fd;
      l.area = Math.max(fpArea + 1, fpArea / grammar.coverage);
      return l.area;
    }
    let s = 0;
    for (const c of l.children) s += areaOf(c);
    s += (l.children.length - 1) * gapAt(l.level).size * Math.sqrt(s) * 0.8;
    l.area = s;
    return s;
  };
  for (const d of dItems) areaOf(d.tree);

  const footerTree = footerR ? relevel(collect(footerR.node, 3), 3) : null;
  const sideTrees = sem.sidebars.map((s) => relevel(collect(R[s].node, 3), 3));
  if (footerTree) areaOf(footerTree);
  for (const t of sideTrees) areaOf(t);

  const A = navR ? 3 : 2;
  const E = 8;
  const WATER = 2;
  const footerArea = footerTree?.area ?? 0;
  const sideArea = sideTrees.reduce((s, t) => s + t.area, 0);
  const dArea = dItems.reduce((s, d) => s + d.tree.area + Math.sqrt(d.tree.area) * 2.2, 0) || 40;
  const S = sideTrees.length ? Math.max(3, Math.min(8, Math.round(Math.sqrt(sideArea) * 0.7))) : 0;
  const sideGap = S ? 1 : 0;
  const F = footerTree ? Math.max(3, Math.min(6, Math.ceil(Math.sqrt(footerArea) * 0.6))) : 2;
  const k = A + S + sideGap - E - F - WATER;
  let Cw = Math.round((-2 * k + Math.sqrt(4 * k * k + 16 * dArea)) / 8);
  Cw = Math.max(dItems.some((d) => d.region?.kind === "feed") ? 10 : 6, Math.min(22, Cw));
  const W = 2 * Cw + A + S + sideGap;

  const colDepth = [0, 0];
  const placed: Array<{ d: DItem; col: 0 | 1; z0: number; depth: number }> = [];
  for (const d of dItems) {
    const depth = Math.max(3, Math.ceil((d.tree.area + Math.sqrt(d.tree.area) * 2) / (Cw - 1)) + 1);
    const col: 0 | 1 = colDepth[0] <= colDepth[1] ? 0 : 1;
    placed.push({ d, col, z0: colDepth[col], depth });
    colDepth[col] += depth + 1;
  }
  const bodyDepth = Math.max(colDepth[0], colDepth[1], 6);
  const D = E + bodyDepth + F + WATER;
  const front = D / 2;
  const left = -W / 2;

  const parts: Part[] = [];
  const roads: RoadSeg[] = [];
  const buildings: Building[] = [];
  const signs: SignSpec[] = [];
  const greens: Rect[] = [];
  const zones: Zone[] = [];
  const smokestacks: Array<[number, number, number]> = [];
  let shelf = { x: 1, y: 1, h: 0 };
  let maxHeight = 0;

  const push = (p: Omit<Part, "rotY" | "surf" | "lit" | "delay"> & Partial<Pick<Part, "rotY" | "surf" | "lit" | "delay">>) => {
    const part: Part = { rotY: 0, surf: Surf.PLAIN, lit: 0, delay: 0, ...p };
    parts.push(part);
    maxHeight = Math.max(maxHeight, part.y + part.h);
    return part;
  };

  const cleanText = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-!?&:/+#$€£\n]/g, "")
      .replace(/[€£]/g, "$")
      .trim();
  const addSign = (text: string, bg: RGB, fg: RGB, vertical = false): SignSpec | null => {
    const clean = cleanText(text);
    if (!clean) return null;
    const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
    const w = vertical ? 7 : Math.max(...lines.map((l) => textWidth(l))) + 4;
    const h = vertical ? clean.replace(/[ \n]/g, "").length * 6 + 3 : lines.length * 6 + 3;
    if (shelf.x + w + 1 > SIGN_ATLAS.w) shelf = { x: 1, y: shelf.y + shelf.h + 1, h: 0 };
    if (shelf.y + h + 1 > SIGN_ATLAS.h) return null;
    const spec: SignSpec = { text: vertical ? `|${clean.replace(/[ \n]/g, "")}` : lines.join("\n"), bg, fg, x: shelf.x, y: shelf.y, w, h };
    shelf.x += w + 1;
    shelf.h = Math.max(shelf.h, h);
    signs.push(spec);
    return spec;
  };
  const fitText = (text: string | undefined, maxW: number, twoLines = false, texel = SIGN_TEXEL) => {
    if (!text) return "";
    const words = cleanText(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const wd of words) {
      const next = cur ? `${cur} ${wd}` : wd;
      if ((textWidth(next) + 4) * texel > maxW) {
        if (!cur) {
          cur = wd.slice(0, Math.max(1, Math.floor((maxW / texel - 4) / 4)));
        }
        lines.push(cur);
        cur = "";
        if (lines.length >= (twoLines ? 2 : 1)) break;
        if ((textWidth(wd) + 4) * texel <= maxW) cur = wd;
        continue;
      }
      cur = next;
    }
    if (cur && lines.length < (twoLines ? 2 : 1)) lines.push(cur);
    return lines.join("\n");
  };
  const signAt = (node: number, text: string, x: number, y: number, z: number, bg: RGB, delay: number, texel = SIGN_TEXEL, fg: RGB = oklch(0.98, 0.01, 90)) => {
    const spec = addSign(text, bg, fg);
    if (!spec) return null;
    return push({ mesh: "sign", node, x, y, z, w: spec.w * texel, h: spec.h * texel, d: 1, color: bg, rect: [spec.x, spec.y, spec.w, spec.h], lit: 1, delay });
  };

  const partition = (items: LNode[], r: Rect, gap: { size: number; road: boolean }, out: (l: LNode, r: Rect) => void) => {
    if (!items.length) return;
    if (items.length === 1) return out(items[0], r);
    const tot = items.reduce((s, it) => s + it.area, 0) || 1;
    let acc = 0;
    let idx = 1;
    let best = Infinity;
    for (let i = 0; i < items.length - 1; i++) {
      acc += items[i].area;
      const diff = Math.abs(acc - tot / 2);
      if (diff < best) {
        best = diff;
        idx = i + 1;
      }
    }
    const L = items.slice(0, idx);
    const Rr = items.slice(idx);
    const f = L.reduce((s, it) => s + it.area, 0) / tot;
    let alongX = r.w >= r.d;
    if ((alongX ? r.w : r.d) < 2) alongX = !alongX;
    const len = alongX ? r.w : r.d;
    if (len < 2) return out(items[0], r);
    let g = gap.size;
    if (len - g < 2) g = 0;
    const avail = len - g;
    const a = Math.max(1, Math.min(avail - 1, Math.round(avail * f)));
    let ra: Rect;
    let rb: Rect;
    if (alongX) {
      ra = { x: r.x, z: r.z, w: a, d: r.d };
      rb = { x: r.x + a + g, z: r.z, w: r.w - a - g, d: r.d };
      if (g && gap.road) roads.push({ x: r.x + a, z: r.z, w: g, d: r.d, axis: "z", avenue: false });
      else if (g) greens.push({ x: r.x + a, z: r.z, w: g, d: r.d });
    } else {
      ra = { x: r.x, z: r.z + r.d - a, w: r.w, d: a };
      rb = { x: r.x, z: r.z, w: r.w, d: r.d - a - g };
      if (g && gap.road) roads.push({ x: r.x, z: r.z + r.d - a - g, w: r.w, d: g, axis: "x", avenue: false });
      else if (g) greens.push({ x: r.x, z: r.z + r.d - a - g, w: r.w, d: g });
    }
    partition(L, ra, gap, out);
    partition(Rr, rb, gap, out);
  };

  let order = 0;
  const unitTotal = (() => {
    let c = 0;
    const walk = (l: LNode) => (l.unit ? c++ : l.children.forEach(walk));
    dItems.forEach((d) => walk(d.tree));
    return c + 10;
  })();
  const place = (l: LNode, r: Rect, y: number) => {
    if (l.unit) return placeUnit(l.unit, r, y);
    partition(l.children, r, gapAt(l.level), (c, cr) => place(c, cr, y));
  };

  const wallOf = (u: Unit) => {
    if (u.tint) return u.tint;
    const ws = palette.walls[u.style];
    return ws[(u.node * 7) % ws.length];
  };
  const roofOf = (u: Unit) => {
    const rs = palette.roofs[u.style];
    return rs[(u.node * 3) % rs.length];
  };
  const accentOf = (u: Unit) => palette.accents[(u.node * 5) % palette.accents.length];
  const night = grammar.time === "night";
  const litChance = night ? 0.62 : grammar.time === "golden" ? 0.22 : 0;
  const steel = palette.walls.tech[1];

  interface Ctx {
    u: Unit;
    cx: number;
    cz: number;
    fw: number;
    fd: number;
    y0: number;
    delay: number;
  }

  const placeUnit = (u: Unit, lot: Rect, y0: number) => {
    const delay = 0.3 + (order++ / unitTotal) * 1.6 + h01(u.node, 3) * 0.15;
    const fw = Math.min(u.fw, Math.max(1, lot.w - (lot.w > u.fw ? 0.35 : 0.2)));
    const fd = Math.min(u.fd, Math.max(1, lot.d - (lot.d > u.fd ? 0.35 : 0.2)));
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d - fd / 2 - 0.15;
    const h = KITS[u.kind]({ u, cx, cz, fw, fd, y0, delay });
    buildings.push({ node: u.node, kind: u.kind, x: cx, z: cz, w: fw, d: fd, h, label: u.label });
    const back = lot.d - fd - 0.15;
    if (back >= 0.8) {
      const gz = lot.z + back / 2;
      const green = h01(u.node, 5) < 0.4 + grammar.parks;
      push({ mesh: "box", node: -1, x: cx, y: y0, z: gz, w: lot.w - 0.2, h: 0.06, d: back - 0.1, color: green ? palette.grass[0] : palette.plaza, surf: green ? Surf.GRASS : Surf.PAVING, delay });
      const trees = Math.floor(lot.w * back * grammar.trees * 0.7 + h01(u.node, 6) * grammar.trees * 1.4);
      for (let t = 0; t < trees; t++) tree(lot.x + 0.4 + h01(u.node, 20 + t) * (lot.w - 0.8), gz + (h01(u.node, 40 + t) - 0.5) * (back - 0.6), y0 + 0.06, delay + 0.2);
    }
  };

  const floorsFor = (u: Unit, base: number, spread: number) =>
    Math.max(1, Math.round((base + spread * Math.log2(1 + u.chars / 160)) * (0.45 + grammar.verticality * 1.1) + h01(u.node, 9) * 1.4));

  const body = (c: Ctx, h: number, color: RGB, surf: number, opts: { w?: number; d?: number; y?: number; x?: number; z?: number; mesh?: Part["mesh"]; lit?: number } = {}) =>
    push({ mesh: opts.mesh ?? "box", node: c.u.node, x: opts.x ?? c.cx, y: opts.y ?? c.y0, z: opts.z ?? c.cz, w: opts.w ?? c.fw, h, d: opts.d ?? c.fd, color, surf, lit: opts.lit ?? litChance, delay: c.delay });

  const roofKit = (c: Ctx, top: number, w: number, d: number, style: ArchStyle) => {
    const roof = roofOf(c.u);
    switch (style) {
      case "classic":
        push({ mesh: "prism", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.12, h: Math.min(1.2, 0.35 + w * 0.25), d: d + 0.12, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1, rotY: w >= d ? 0 : Math.PI / 2 });
        if (h01(c.u.node, 12) < 0.6) push({ mesh: "box", node: c.u.node, x: c.cx + w * 0.28, y: top, z: c.cz - d * 0.15, w: 0.2, h: 0.75, d: 0.2, color: palette.walls.classic[2], surf: Surf.BRICK, delay: c.delay + 0.15 });
        return top + 0.9;
      case "soft":
        if (grammar.roundness > 0.35 && w === d) {
          push({ mesh: "cyl", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.7, h: 0.35, d: d * 0.7, color: roof, delay: c.delay + 0.1 });
          return top + 0.35;
        }
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.1, h: 0.1, d: d + 0.1, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (h01(c.u.node, 13) < 0.5) for (let i = 0; i < 2; i++) tree(c.cx + (h01(c.u.node, 60 + i) - 0.5) * w * 0.6, c.cz + (h01(c.u.node, 70 + i) - 0.5) * d * 0.6, top + 0.1, c.delay + 0.2, 0.6);
        return top + 0.1;
      case "retro":
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w, h: 0.12, d, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (h01(c.u.node, 14) < 0.45) waterTower(c.cx + w * 0.2, c.cz - d * 0.2, top + 0.12, c.delay + 0.2, c.u.node);
        return top + 0.12;
      case "tech":
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.9, h: 0.15, d: d * 0.9, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        push({ mesh: "box", node: c.u.node, x: c.cx - w * 0.25, y: top, z: c.cz, w: 0.06, h: 1.2, d: 0.06, color: steel, delay: c.delay + 0.15 });
        push({ mesh: "glow", node: c.u.node, x: c.cx - w * 0.25, y: top + 1.2, z: c.cz, w: 0.14, h: 0.14, d: 0.14, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.2 });
        return top + 0.15;
      default:
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.06, h: 0.1, d: d + 0.06, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (w * d >= 2 && h01(c.u.node, 15) < 0.7) push({ mesh: "box", node: c.u.node, x: c.cx + (h01(c.u.node, 16) - 0.5) * w * 0.4, y: top + 0.1, z: c.cz + (h01(c.u.node, 17) - 0.5) * d * 0.4, w: 0.4, h: 0.25, d: 0.3, color: palette.walls.modern[1], delay: c.delay + 0.15 });
        return top + 0.1;
    }
  };

  const awning = (c: Ctx, x: number, w: number, color: RGB, y: number) =>
    push({ mesh: "box", node: c.u.node, x, y, z: c.cz + c.fd / 2 + 0.18, w: w * 0.92, h: 0.1, d: 0.36, color, surf: Surf.STRIPES, delay: c.delay + 0.1 });
  const frontSign = (c: Ctx, text: string | undefined, y: number, maxW: number, bg: RGB, x = c.cx) => {
    const t = fitText(text, maxW);
    if (t) signAt(c.u.node, t, x, y, c.cz + c.fd / 2 + 0.02, bg, c.delay + 0.3);
  };
  const imagePanel = (node: number, slot: number, x: number, y: number, z: number, w: number, h: number, color: RGB, delay: number, rotY = 0) => {
    push({ mesh: "box", node, x, y: y - 0.06, z, w: w + 0.12, h: h + 0.12, d: 0.12, color: steel, delay, rotY });
    for (const side of [0, Math.PI]) push({ mesh: "image", node, x: x + Math.sin(rotY + side) * 0.07, y, z: z + Math.cos(rotY + side) * 0.07, w, h, d: 1, rotY: rotY + side, color, slot, delay: delay + 0.1 });
  };
  const billboardOn = (c: Ctx, top: number, size: number) => {
    const w = size;
    const h = size * 0.62;
    const lift = 0.5;
    for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + s * w * 0.3, y: top, z: c.cz, w: 0.08, h: lift + h * 0.5, d: 0.08, color: steel, delay: c.delay + 0.2 });
    imagePanel(c.u.node, c.u.imageSlot, c.cx, top + lift, c.cz, w, h, accentOf(c.u), c.delay + 0.25);
    return top + lift + h;
  };

  const KITS: Record<BuildingKind, (c: Ctx) => number> = {
    house: (c) => {
      const cap = grammar.coverage > 0.65 ? 2 + Math.round(grammar.verticality * 3) : 3;
      const floors = Math.min(cap, floorsFor(c.u, 1 + (grammar.coverage > 0.65 ? 1 : 0), 0.8));
      const h = floors * FLOOR + 0.2;
      body(c, h, wallOf(c.u), c.u.style === "retro" ? Surf.BRICK : Surf.HOUSE);
      if (c.u.question) signAt(c.u.node, "?", c.cx, c.y0 + h - 0.45, c.cz + c.fd / 2 + 0.02, accentOf(c.u), c.delay + 0.3, SIGN_TEXEL * 1.4);
      return roofKit(c, c.y0 + h, c.fw, c.fd, c.u.style);
    },
    office: (c) => {
      const floors = floorsFor(c.u, 3, 2.2);
      const h = floors * FLOOR;
      const glass = c.u.style === "modern" || c.u.style === "tech";
      if (glass && floors > 4) {
        body(c, FLOOR * 1.2, palette.walls.modern[1], Surf.OFFICE);
        body(c, h - FLOOR * 1.2, c.u.style === "tech" ? palette.walls.tech[0] : palette.glass, Surf.GLASS, { y: c.y0 + FLOOR * 1.2, w: c.fw * 0.9, d: c.fd * 0.9 });
      } else if (c.u.style === "soft" && grammar.roundness > 0.35 && c.fw === c.fd) body(c, h, wallOf(c.u), Surf.OFFICE, { mesh: "cyl" });
      else body(c, h, wallOf(c.u), c.u.style === "retro" ? Surf.BRICK : Surf.OFFICE);
      return roofKit(c, c.y0 + h, c.fw, c.fd, c.u.style);
    },
    tower: (c) => {
      const floors = Math.max(6, floorsFor(c.u, 7 - c.u.heading, 2.6) + Math.round(grammar.towers * 6));
      const h = floors * FLOOR;
      const w = Math.min(c.fw, 2);
      const d = Math.min(c.fd, 2);
      const surf = c.u.style === "modern" || c.u.style === "tech" ? Surf.GLASS : c.u.style === "retro" ? Surf.BRICK : Surf.OFFICE;
      const color = c.u.style === "modern" ? palette.glass : c.u.style === "tech" ? palette.walls.tech[0] : wallOf(c.u);
      body(c, h * 0.72, color, surf, { w, d });
      body(c, h * 0.28, color, surf, { y: c.y0 + h * 0.72, w: w * 0.72, d: d * 0.72 });
      const top = c.y0 + h;
      if (c.u.style === "classic") push({ mesh: "pyramid", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.8, h: 1, d: d * 0.8, color: roofOf(c.u), rotY: Math.PI / 4, delay: c.delay + 0.2 });
      else {
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: 0.05, h: 1.1, d: 0.05, color: steel, delay: c.delay + 0.2 });
        push({ mesh: "glow", node: c.u.node, x: c.cx, y: top + 1.1, z: c.cz, w: 0.12, h: 0.12, d: 0.12, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.2 });
      }
      return top + 1.2;
    },
    landmark: (c) => landmarkKit(c),
    shops: (c) => {
      const n = c.u.rank !== undefined ? 1 : Math.max(1, Math.round(c.fw / 2));
      const sw = c.fw / n;
      const floors = c.u.style === "classic" || c.u.style === "retro" ? 2 : 1;
      const featured = c.u.rank === 0;
      for (let i = 0; i < n; i++) {
        const x = c.cx - c.fw / 2 + sw * (i + 0.5);
        const label = c.u.rank !== undefined ? c.u.label : keyword(c.u.labels[i]);
        const color = c.u.tint ? mix(c.u.tint, palette.walls.modern[0], (i % 2) * 0.25) : palette.walls[c.u.style][(c.u.node + i) % palette.walls[c.u.style].length];
        const h = floors * FLOOR + 0.35 + (i % 2) * 0.15 + (featured ? 0.8 : 0);
        body(c, h, color, Surf.HOUSE, { x, w: sw * 0.98 });
        const accent = c.u.tint ?? palette.accents[(c.u.node + i) % palette.accents.length];
        awning(c, x, sw, accent, c.y0 + 0.62);
        const signText = c.u.rank !== undefined ? keywords(label, 2, Math.max(4, Math.floor((sw * 0.95) / SIGN_TEXEL / 4) - 1)) : label;
        const st = fitText(signText, sw * 0.95, c.u.rank !== undefined);
        if (st) signAt(c.u.node, st, x, c.y0 + h - (st.includes("\n") ? 0.75 : 0.42), c.cz + c.fd / 2 + 0.02, night || featured ? accent : mix(accent, palette.walls.modern[2], 0.3), c.delay + 0.3);
        push({ mesh: "box", node: c.u.node, x, y: c.y0 + h, z: c.cz, w: sw, h: 0.08, d: c.fd, color: roofOf(c.u), surf: Surf.ROOF, delay: c.delay + 0.1 });
      }
      return c.y0 + floors * FLOOR + 0.6;
    },
    rowhouses: (c) => {
      const n = Math.max(2, Math.round(c.fw));
      const sw = c.fw / n;
      const color = wallOf(c.u);
      const floors = Math.min(4, floorsFor(c.u, 1.5, 0.5));
      for (let i = 0; i < n; i++) {
        const x = c.cx - c.fw / 2 + sw * (i + 0.5);
        body(c, floors * FLOOR, i % 2 ? mix(color, palette.walls[c.u.style][0], 0.25) : color, c.u.style === "retro" ? Surf.BRICK : Surf.HOUSE, { x, w: sw * 0.96 });
        roofKit({ ...c, cx: x, fw: sw * 0.96 }, c.y0 + floors * FLOOR, sw * 0.96, c.fd, c.u.style);
      }
      return c.y0 + floors * FLOOR + 0.8;
    },
    factory: (c) => {
      const wall = c.u.style === "retro" || c.u.style === "classic" ? palette.walls.retro[0] : palette.walls.modern[1];
      body(c, 1.1, wall, Surf.BRICK);
      const teeth = Math.max(2, Math.round(c.fw));
      for (let i = 0; i < teeth; i++)
        push({ mesh: "prism", node: c.u.node, x: c.cx - c.fw / 2 + (c.fw / teeth) * (i + 0.5), y: c.y0 + 1.1, z: c.cz, w: c.fw / teeth, h: 0.5, d: c.fd, rotY: Math.PI / 2, color: roofOf(c.u), delay: c.delay + 0.1 });
      const chim = push({ mesh: "cyl", node: c.u.node, x: c.cx + c.fw * 0.35, y: c.y0, z: c.cz - c.fd * 0.3, w: 0.45, h: 3.6, d: 0.45, color: oklch(0.62, 0.14, 30), surf: Surf.STRIPES, delay: c.delay + 0.2 });
      push({ mesh: "cyl", node: c.u.node, x: c.cx - c.fw * 0.3, y: c.y0 + 1.1, z: c.cz, w: 0.8, h: 0.9, d: 0.8, color: palette.walls.modern[0], delay: c.delay + 0.25 });
      smokestacks.push([chim.x, chim.y + chim.h, chim.z]);
      return c.y0 + 3.6;
    },
    kiosk: (c) => {
      body(c, 0.7, palette.walls.modern[0], Surf.PLAIN, { w: 0.8, d: 0.7 });
      push({ mesh: "glow", node: c.u.node, x: c.cx, y: c.y0 + 0.7, z: c.cz, w: 0.95, h: 0.35, d: 0.8, color: accentOf(c.u), lit: grammar.neon > 0.3 ? 1.4 : 0.6, delay: c.delay + 0.1 });
      return c.y0 + 1.05;
    },
    billboard: (c) => {
      const floors = Math.min(5, floorsFor(c.u, 2, 1));
      const h = floors * FLOOR;
      body(c, h, wallOf(c.u), c.u.style === "retro" ? Surf.BRICK : Surf.OFFICE);
      roofKit(c, c.y0 + h, c.fw, c.fd, c.u.style === "classic" ? "modern" : c.u.style);
      return billboardOn(c, c.y0 + h + 0.1, Math.min(2.8, Math.max(c.fw, 1.6) * 1.05));
    },
    screen: (c) => {
      const w = Math.min(2.2, c.fw * 0.95);
      const h = w * 0.62;
      const lift = 0.9 + h01(c.u.node, 21) * 0.5;
      for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + s * w * 0.3, y: c.y0, z: c.cz, w: 0.08, h: lift + h * 0.5, d: 0.08, color: steel, delay: c.delay });
      imagePanel(c.u.node, c.u.imageSlot >= 0 ? c.u.imageSlot : firstSlotIn(c.u.node), c.cx, c.y0 + lift, c.cz, w, h, accentOf(c.u), c.delay + 0.1);
      push({ mesh: "box", node: -1, x: c.cx, y: c.y0, z: c.cz, w: c.fw, h: 0.05, d: c.fd, color: palette.plaza, surf: Surf.PAVING, delay: c.delay });
      return c.y0 + lift + h;
    },
    ensemble: (c) => {
      const fam = palette.accents[(R[sem.regionOf[c.u.node]]?.node ?? 0) % palette.accents.length];
      const floors = Math.max(2, Math.min(7, floorsFor(c.u, 2.5, 1.2)));
      const h = floors * FLOOR;
      body(c, h, mix(palette.walls[grammar.style][0], fam, 0.18), grammar.style === "modern" || grammar.style === "tech" ? Surf.GLASS : Surf.OFFICE, { w: c.fw * 0.9, d: c.fd * 0.9 });
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0 + h, z: c.cz, w: c.fw * 0.94, h: 0.18, d: c.fd * 0.94, color: fam, delay: c.delay + 0.1 });
      frontSign(c, keywords(c.u.label, 1, Math.floor((c.fw * 0.9) / SIGN_TEXEL / 4) - 1), c.y0 + h - 0.5, c.fw * 0.9, fam);
      return c.y0 + h + 0.2;
    },
    pricing: (c) => {
      const of = Math.max(1, c.u.of ?? 1);
      const rank = c.u.rank ?? 0;
      const popular = of >= 3 ? rank === Math.floor(of / 2) : rank === of - 1;
      const h = (3 + rank * 2.2) * (0.7 + grammar.verticality * 0.6);
      const color = popular ? palette.accents[0] : mix(palette.walls[grammar.style][0], palette.accents[0], 0.12);
      body(c, h, color, Surf.GLASS, { w: c.fw * 0.75, d: c.fd * 0.75 });
      const price = c.u.price ?? `#${rank + 1}`;
      signAt(c.u.node, price, c.cx, c.y0 + h * 0.62, c.cz + c.fd * 0.375 + 0.02, popular ? oklch(0.3, 0.05, 270) : palette.accents[0], c.delay + 0.3, SIGN_TEXEL * 1.5);
      if (popular) push({ mesh: "glow", node: c.u.node, x: c.cx, y: c.y0 + h, z: c.cz, w: c.fw * 0.5, h: 0.35, d: c.fd * 0.5, color: palette.lit, lit: 1.6, delay: c.delay + 0.3 });
      frontSign(c, c.u.label, c.y0 + 0.3, c.fw * 0.9, oklch(0.3, 0.04, 270));
      return c.y0 + h + 0.4;
    },
    statue: (c) => {
      push({ mesh: "box", node: -1, x: c.cx, y: c.y0, z: c.cz, w: c.fw, h: 0.06, d: c.fd, color: palette.grass[0], surf: Surf.GRASS, delay: c.delay });
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0 + 0.06, z: c.cz, w: 0.55, h: 0.5, d: 0.55, color: palette.stone, delay: c.delay });
      const bronze = oklch(0.55, 0.08, 70);
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0 + 0.56, z: c.cz, w: 0.28, h: 0.5, d: 0.2, color: bronze, delay: c.delay + 0.1 });
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0 + 1.06, z: c.cz, w: 0.18, h: 0.18, d: 0.18, color: bronze, delay: c.delay + 0.15 });
      return c.y0 + 1.25;
    },
    archive: (c) => {
      const color = mix(palette.walls[grammar.style][1] ?? palette.walls.modern[1], palette.stone, 0.3);
      body(c, 1.0, color, Surf.BRICK, { w: c.fw * 0.95, d: c.fd * 0.8 });
      for (let i = 0; i < Math.round(c.fw * 1.5); i++)
        push({ mesh: "box", node: c.u.node, x: c.cx - c.fw * 0.45 + (i + 0.5) * (c.fw * 0.9) / Math.round(c.fw * 1.5), y: c.y0, z: c.cz + c.fd * 0.42, w: 0.1, h: 1.0, d: 0.1, color: palette.walls.classic[0], delay: c.delay + 0.1 });
      push({ mesh: "prism", node: c.u.node, x: c.cx, y: c.y0 + 1.0, z: c.cz, w: c.fw * 0.98, h: 0.35, d: c.fd * 0.85, color: palette.roofs.classic[1], delay: c.delay + 0.15 });
      return c.y0 + 1.35;
    },
    temple: (c) => {
      const st = palette.walls.classic[0];
      body(c, 0.3, palette.stone, Surf.PAVING, { w: 2.6, d: 2.2 });
      for (let i = 0; i < 5; i++) push({ mesh: "cyl", node: c.u.node, x: c.cx - 1.0 + i * 0.5, y: c.y0 + 0.3, z: c.cz + 0.85, w: 0.22, h: 1.5, d: 0.22, color: st, delay: c.delay + 0.1 });
      body(c, 1.5, st, Surf.PLAIN, { y: c.y0 + 0.3, w: 2.2, d: 1.4, z: c.cz - 0.2 });
      body(c, 0.2, st, Surf.PLAIN, { y: c.y0 + 1.8, w: 2.6, d: 2.2 });
      push({ mesh: "prism", node: c.u.node, x: c.cx, y: c.y0 + 2.0, z: c.cz, w: 2.6, h: 0.7, d: 2.2, rotY: 0, color: st, delay: c.delay + 0.2 });
      const slot = firstSlotIn(c.u.node);
      if (slot >= 0) {
        for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + 1.6 + s * 0.35, y: c.y0, z: c.cz + 0.9, w: 0.06, h: 1.1, d: 0.06, color: steel, delay: c.delay + 0.2 });
        imagePanel(c.u.node, slot, c.cx + 1.6, c.y0 + 1.0, c.cz + 0.9, 1.2, 1.2, palette.accents[0], c.delay + 0.25);
      }
      return c.y0 + 2.7;
    },
    stall: (c) => {
      const accent = accentOf(c.u);
      body(c, 0.55, palette.walls[grammar.style][0], Surf.PLAIN, { w: 0.8, d: 0.6 });
      push({ mesh: "prism", node: c.u.node, x: c.cx, y: c.y0 + 0.55, z: c.cz, w: 0.95, h: 0.3, d: 0.8, color: accent, surf: Surf.STRIPES, delay: c.delay + 0.1 });
      return c.y0 + 0.85;
    },
    plaza: (c) => {
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0, z: c.cz, w: c.fw, h: 0.06, d: c.fd, color: palette.plaza, surf: Surf.PAVING, delay: c.delay });
      return c.y0 + 0.06;
    },
  };

  const landmarkKit = (c: Ctx): number => {
    const h = Math.max(9, 8 + grammar.verticality * 16);
    const accent = palette.accents[0];
    push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0, z: c.cz, w: c.fw + 0.6, h: 0.08, d: c.fd + 0.6, color: palette.plaza, surf: Surf.PAVING, delay: c.delay });
    const y = c.y0 + 0.08;
    const titleSign = (yy: number, maxW: number) => {
      const t = fitText(keywords(c.u.label, 3, Math.floor(maxW / SIGN_TEXEL / 4) - 1), maxW, true);
      if (t) signAt(c.u.node, t, c.cx, yy, c.cz + c.fd / 2 + 0.35, accent, c.delay + 0.35);
    };
    switch (c.u.style) {
      case "classic": {
        const sh = Math.min(h * 0.7, 12);
        body(c, 1.4, palette.walls.classic[3], Surf.BRICK, { y, w: 2.6, d: 2.6 });
        body(c, sh, palette.walls.classic[1], Surf.BRICK, { y: y + 1.4, w: 1.7, d: 1.7, lit: litChance * 0.4 });
        body(c, 0.3, palette.walls.classic[0], Surf.PLAIN, { y: y + 1.4 + sh - 2.2, w: 1.9, d: 1.9 });
        for (const [dx, dz] of [[0, 0.86], [0.86, 0]])
          push({ mesh: "glow", node: c.u.node, x: c.cx + dx, y: y + 1.4 + sh - 1.6, z: c.cz + dz, w: dz ? 0.9 : 0.04, h: 0.9, d: dz ? 0.04 : 0.9, color: palette.lit, lit: 1.0, delay: c.delay + 0.2 });
        body(c, 0.35, palette.walls.classic[0], Surf.PLAIN, { y: y + 1.4 + sh, w: 2.0, d: 2.0 });
        push({ mesh: "pyramid", node: c.u.node, x: c.cx, y: y + 1.75 + sh, z: c.cz, w: 2.1, h: 3.2, d: 2.1, color: roofOf(c.u), rotY: Math.PI / 4, delay: c.delay + 0.3 });
        push({ mesh: "box", node: c.u.node, x: c.cx, y: y + 4.9 + sh, z: c.cz, w: 0.05, h: 0.9, d: 0.05, color: steel, delay: c.delay + 0.35 });
        push({ mesh: "box", node: c.u.node, x: c.cx + 0.22, y: y + 5.45 + sh, z: c.cz, w: 0.42, h: 0.26, d: 0.03, color: accent, delay: c.delay + 0.35 });
        titleSign(y + 0.1, 4.4);
        return y + 5.8 + sh;
      }
      case "soft": {
        body(c, h * 0.8, wallOf(c.u), Surf.OFFICE, { y, w: 1.8, d: 1.8, mesh: "cyl" });
        body(c, 0.45, accent, Surf.PLAIN, { y: y + h * 0.8, w: 2.6, d: 2.6, mesh: "cyl" });
        body(c, h * 0.2, wallOf(c.u), Surf.OFFICE, { y: y + h * 0.8 + 0.45, w: 1.2, d: 1.2, mesh: "cyl" });
        push({ mesh: "cyl", node: c.u.node, x: c.cx, y: y + h + 0.45, z: c.cz, w: 1.3, h: 0.9, d: 1.3, color: palette.roofs.soft[0], delay: c.delay + 0.3 });
        titleSign(y + 0.1, 4.4);
        return y + h + 1.4;
      }
      case "retro": {
        body(c, h * 0.55, c.u.tint ?? palette.walls.retro[0], Surf.BRICK, { y, w: 2.6, d: 2.4 });
        const top = y + h * 0.55;
        for (let i = 0; i < 4; i++) push({ mesh: "box", node: c.u.node, x: c.cx - 0.5 + (i / 4) * 0.2, y: top, z: c.cz, w: 0.08, h: h * 0.6 * (1 - (i / 4) * 0.2), d: 0.08, color: steel, delay: c.delay + 0.2 });
        push({ mesh: "glow", node: c.u.node, x: c.cx - 0.4, y: top + h * 0.6, z: c.cz, w: 0.18, h: 0.18, d: 0.18, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.3 });
        const t = fitText(keywords(c.u.label, 2, 8), 4.0, true);
        if (t) {
          for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + 0.3 + s * 0.6, y: top, z: c.cz + 0.6, w: 0.08, h: 0.6, d: 0.08, color: steel, delay: c.delay + 0.2 });
          signAt(c.u.node, t, c.cx + 0.3, top + 0.6, c.cz + 0.62, accent, c.delay + 0.35);
        }
        return top + h * 0.6;
      }
      case "tech": {
        body(c, h * 1.1, palette.walls.tech[1], Surf.GLASS, { y, w: 1.6, d: 1.6 });
        for (const s of [-1, 1]) push({ mesh: "glow", node: c.u.node, x: c.cx + s * 0.81, y, z: c.cz + 0.81, w: 0.06, h: h * 1.1, d: 0.06, color: accent, lit: 1.4, delay: c.delay + 0.2 });
        push({ mesh: "box", node: c.u.node, x: c.cx, y: y + h * 1.1, z: c.cz, w: 0.08, h: 2.2, d: 0.08, color: palette.walls.tech[2], delay: c.delay + 0.2 });
        push({ mesh: "glow", node: c.u.node, x: c.cx, y: y + h * 1.1 + 2.2, z: c.cz, w: 0.2, h: 0.2, d: 0.2, color: oklch(0.66, 0.2, 25), lit: 1.8, delay: c.delay + 0.3 });
        titleSign(y + 0.1, 4.4);
        return y + h * 1.1 + 2.4;
      }
      default: {
        body(c, 1.4, palette.walls.modern[0], Surf.OFFICE, { y, w: 2.6, d: 2.6 });
        body(c, h, palette.glass, Surf.GLASS, { y: y + 1.4, w: 1.8, d: 1.8 });
        body(c, h * 0.3, palette.glass, Surf.GLASS, { y: y + 1.4 + h, w: 1.2, d: 1.2 });
        const top = y + 1.4 + h * 1.3;
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: 0.06, h: 2.4, d: 0.06, color: palette.walls.modern[2], delay: c.delay + 0.2 });
        push({ mesh: "glow", node: c.u.node, x: c.cx, y: top + 2.4, z: c.cz, w: 0.16, h: 0.16, d: 0.16, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.3 });
        titleSign(y + 0.1, 4.4);
        return top + 2.5;
      }
    }
  };

  const tree = (x: number, z: number, y: number, delay: number, scale = 1) => plantTree(push, palette, grammar.style, x, z, y, delay, scale);
  const waterTower = (x: number, z: number, y: number, delay: number, node: number) => {
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) push({ mesh: "box", node, x: x + dx, y, z: z + dz, w: 0.05, h: 0.45, d: 0.05, color: palette.trunk, delay });
    push({ mesh: "cyl", node, x, y: y + 0.45, z, w: 0.6, h: 0.55, d: 0.6, color: oklch(0.55, 0.06, 55), delay });
    push({ mesh: "pyramid", node, x, y: y + 1.0, z, w: 0.62, h: 0.25, d: 0.62, color: oklch(0.4, 0.04, 50), delay, rotY: Math.PI / 8 });
  };

  const influences: Influence[] = [];
  const zArea = (z: Zone) => z.w * z.d;

  const eZ = front - E;
  const eRect: Rect = { x: left, z: eZ, w: W, d: E };
  push({ mesh: "box", node: heroR?.node ?? -1, x: 0, y: 0, z: eZ + E / 2, w: W, h: 0.08, d: E, color: palette.plaza, surf: Surf.PAVING, delay: 0.1 });
  const spot = heroR ?? brandR;
  zones.push({ region: spot?.id ?? -1, role: "entrance", ...eRect, title: heroR?.title ?? sem.siteName, nodes: spot ? span(spot.node) : [-1, -1] });

  const landmarkNode = heroR ? heroR.node : brandR ? brandR.node : nodes.reduce((b, n) => (n.level === 2 && n.weight > nodes[b].weight ? n.id : b), 1);
  const landmarkUnit = makeUnit(landmarkNode, "landmark", { label: heroR?.title ?? sem.siteName });
  const lmLot: Rect = { x: A / 2 + 1, z: eZ + 1, w: Math.min(5, W / 2 - A / 2 - 1.5), d: E - 2 };
  placeUnit(landmarkUnit, lmLot, 0.08);
  const landmarkHeight = buildings[buildings.length - 1].h;
  if (heroR)
    influences.push({ region: heroR.id, node: heroR.node, what: `${REGION_LABEL[heroR.kind]} ${q(heroR.title)}`, effect: `the landmark at the city gate, ${Math.round(landmarkHeight)} tiles tall`, score: 1.2 });
  else if (brandR)
    influences.push({ region: brandR.id, node: brandR.node, what: `the site name ${q(sem.siteName)} (no <h1>)`, effect: "the landmark at the city gate", score: 1.1 });

  {
    const leftW = W / 2 - A / 2 - 1.5;
    const texel = Math.min(SIGN_TEXEL * 2.2, leftW / (textWidth(cleanText(sem.siteName)) + 4));
    const node = brandR?.node ?? landmarkNode;
    const sx = left + (W / 2 - A / 2) / 2;
    const sz = eZ + E - 1.4;
    for (const s of [-1, 1]) push({ mesh: "box", node, x: sx + s * leftW * 0.35, y: 0.08, z: sz - 0.1, w: 0.12, h: 1.6, d: 0.12, color: steel, delay: 0.5 });
    signAt(node, sem.siteName, sx, 1.0, sz, palette.accents[1] ?? palette.accents[0], 0.55, texel);
    if (brandR) influences.push({ region: brandR.id, node: brandR.node, what: `the brand ${q(sem.siteName)}`, effect: "the city-name sign at the entrance", score: 0.35 });
    const heroSlots: number[] = [];
    if (heroR) for (let k2 = heroR.node; k2 < nodes[heroR.node].end && heroSlots.length < 2; k2++) if (slotOf.has(k2)) heroSlots.push(slotOf.get(k2)!);
    heroSlots.forEach((slot, i) => {
      const w = Math.min(3.2, leftW * 0.45);
      const x = sx - leftW * 0.25 + i * leftW * 0.5;
      for (const s of [-1, 1]) push({ mesh: "box", node: heroR!.node, x: x + s * w * 0.3, y: 0.08, z: eZ + 2.2, w: 0.1, h: 2.6, d: 0.1, color: steel, delay: 0.6 });
      imagePanel(heroR!.node, slot, x, 2.4, eZ + 2.2, w, w * 0.62, palette.accents[0], 0.65);
    });
    if (grammar.ornament > 0.3) {
      const fx = sx;
      const fz = eZ + E * 0.45;
      push({ mesh: "cyl", node: -1, x: fx, y: 0.08, z: fz, w: 1.6, h: 0.25, d: 1.6, color: palette.stone, delay: 0.5 });
      push({ mesh: "cyl", node: -1, x: fx, y: 0.2, z: fz, w: 1.35, h: 0.1, d: 1.35, color: palette.water, surf: Surf.WATER, delay: 0.55 });
      push({ mesh: "cyl", node: -1, x: fx, y: 0.3, z: fz, w: 0.2, h: 0.6, d: 0.2, color: palette.water, delay: 0.6 });
    }
  }

  {
    const gz = front - 0.6;
    const node = ctaR?.node ?? heroR?.node ?? landmarkNode;
    for (const s of [-1, 1]) push({ mesh: "box", node, x: s * (A / 2 + 0.25), y: 0.08, z: gz, w: 0.35, h: 3.0, d: 0.35, color: palette.walls[grammar.style][0], delay: 0.4 });
    push({ mesh: "box", node, x: 0, y: 3.08, z: gz, w: A + 0.9, h: 0.35, d: 0.4, color: palette.accents[0], delay: 0.45 });
    const raw = ctaR?.title ?? sem.siteName;
    const word = raw && (textWidth(cleanText(raw)) + 4) * 0.07 <= A + 0.4 ? cleanText(raw) : keyword(raw, 8);
    const texel = word ? Math.min(SIGN_TEXEL, (A + 0.4) / (textWidth(word) + 4)) : SIGN_TEXEL;
    const t = fitText(word, A + 0.4, false, texel);
    if (t) signAt(node, t, 0, 2.35, gz + 0.22, ctaR ? palette.accents[0] : oklch(0.3, 0.04, 270), 0.5, texel);
    if (ctaR) influences.push({ region: ctaR.id, node: ctaR.node, what: `call to action ${q(ctaR.title)}`, effect: "the gate over the main avenue", score: 0.45 });
  }

  const avTop = eZ;
  const avBottom = front - D + WATER + F;
  roads.push({ x: -A / 2, z: avBottom, w: A, d: avTop - avBottom, axis: "z", avenue: true });
  zones.push({ region: navR?.id ?? -1, role: "avenue", x: -A / 2, z: avBottom, w: A, d: avTop - avBottom, title: navR ? "Navigation" : undefined, nodes: navR ? span(navR.node) : [-1, -1] });
  if (navR) {
    let labels = navR.items.map((i) => nodes[i].label).filter((l): l is string => !!l && !CHROME_LABEL.test(l));
    if (labels.length < 3) {
      const more: string[] = [];
      for (let k2 = navR.node; k2 < nodes[navR.node].end; k2++) more.push(...(nodes[k2].linkLabels ?? []));
      if (more.length > labels.length) labels = more;
    }
    labels = labels.filter((l) => !CHROME_LABEL.test(l) && l.toLowerCase() !== sem.siteName.toLowerCase()).slice(0, 7);
    const len = avTop - avBottom;
    labels.forEach((label, i) => {
      const z = avTop - ((i + 1) * len) / (labels.length + 1);
      const bw = A + 1.8;
      for (const s of [-1, 1]) push({ mesh: "box", node: navR.node, x: s * (bw / 2), y: 0, z, w: 0.1, h: 2.5, d: 0.1, color: steel, delay: 0.7 });
      push({ mesh: "box", node: navR.node, x: 0, y: 2.45, z, w: bw + 0.1, h: 0.08, d: 0.08, color: steel, delay: 0.7 });
      const t = fitText(keyword(label, 9) ?? label, bw - 0.4);
      if (t) signAt(navR.items[i] ?? navR.node, t, 0, 1.75, z + 0.05, palette.accents[i % palette.accents.length], 0.75);
    });
    influences.push({ region: navR.id, node: navR.node, what: `navigation (${labels.slice(0, 4).map((l) => q(l, 12)).join(", ")}…)`, effect: `the main avenue, with ${labels.length} street banners`, score: 0.75 });
  }
  roads.push({ x: left + S + sideGap, z: eZ - 1, w: W - S - sideGap, d: 1, axis: "x", avenue: false });

  const colX = [left + S + sideGap, A / 2];
  const districtZones: Array<{ z: Zone; d: DItem }> = [];
  for (const p of placed) {
    const x = colX[p.col];
    const z1 = eZ - 1 - p.z0;
    const rect: Rect = { x, z: z1 - p.depth, w: Cw, d: p.depth };
    const region = p.d.region;
    const isPark = region?.kind === "testimonials";
    push({ mesh: "box", node: p.d.node, x: rect.x + rect.w / 2, y: 0, z: rect.z + rect.d / 2, w: rect.w, h: 0.12, d: rect.d, color: isPark ? palette.grass[1] : palette.sidewalk, surf: isPark ? Surf.GRASS : Surf.PAVING, delay: 0.15 });
    const inner: Rect = { x: rect.x + 0.5, z: rect.z + 0.5, w: rect.w - 1, d: rect.d - 1.2 };
    place(p.d.tree, inner, 0.12);
    const title = p.d.title ?? (region ? REGION_LABEL[region.kind] : undefined);
    const signW = Math.min(Cw - 1.5, 5);
    const sx = p.col === 0 ? rect.x + rect.w - signW / 2 - 0.6 : rect.x + signW / 2 + 0.6;
    const t = fitText(keywords(title, 3, Math.floor(signW / SIGN_TEXEL / 4) - 1), signW, true);
    if (t) {
      for (const s of [-1, 1]) push({ mesh: "box", node: p.d.node, x: sx + s * (signW / 2 - 0.3), y: 0.12, z: rect.z + rect.d - 0.25, w: 0.08, h: 1.0, d: 0.08, color: steel, delay: 0.6 });
      signAt(p.d.node, t, sx, 0.7, rect.z + rect.d - 0.2, region && region.kind !== "section" ? palette.accents[0] : oklch(0.32, 0.04, 270), 0.65);
    }
    roads.push({ x, z: rect.z - 1, w: Cw, d: 1, axis: "x", avenue: false });
    const zone: Zone = { region: region?.id ?? -1, role: "district", ...rect, title, nodes: [p.d.node, p.d.end ?? nodes[p.d.node].end] };
    zones.push(zone);
    districtZones.push({ z: zone, d: p.d });
  }
  for (const col of [0, 1] as const) {
    const used = colDepth[col];
    const rest = bodyDepth - used;
    if (rest >= 2) {
      const z1 = eZ - 1 - used;
      greens.push({ x: colX[col], z: z1 - rest, w: Cw, d: rest });
    }
  }

  if (sideTrees.length) {
    const sx = left;
    const z1 = eZ - 1;
    const per = bodyDepth / sideTrees.length;
    sideTrees.forEach((t, i) => {
      const rect: Rect = { x: sx, z: z1 - (i + 1) * per, w: S, d: per - 0.5 };
      push({ mesh: "box", node: t.id, x: rect.x + rect.w / 2, y: 0, z: rect.z + rect.d / 2, w: rect.w, h: 0.12, d: rect.d, color: palette.grass[1], surf: Surf.GRASS, delay: 0.15 });
      place(t, { x: rect.x + 0.4, z: rect.z + 0.4, w: rect.w - 0.8, d: rect.d - 0.8 }, 0.12);
      zones.push({ region: sem.sidebars[i], role: "sidebar", ...rect, title: R[sem.sidebars[i]].title, nodes: span(R[sem.sidebars[i]].node) });
    });
    roads.push({ x: left + S, z: avBottom, w: 1, d: eZ - avBottom - 1, axis: "z", avenue: false });
  }

  const fZ = front - D + WATER;
  if (footerTree) {
    const rect: Rect = { x: left, z: fZ, w: W, d: F };
    push({ mesh: "box", node: footerR!.node, x: 0, y: 0, z: fZ + F / 2, w: W, h: 0.1, d: F, color: palette.grass[1], surf: Surf.GRASS, delay: 0.2 });
    place(footerTree, { x: rect.x + 0.6, z: rect.z + 0.4, w: rect.w - 1.2, d: rect.d - 0.8 }, 0.1);
    zones.push({ region: footerR!.id, role: "edge", ...rect, title: "Footer", nodes: span(footerR!.node) });
    influences.push({ region: footerR!.id, node: footerR!.node, what: `the footer (${nodes[footerR!.node].links} links)`, effect: "the waterfront at the back edge of the city", score: 0.3 });
  }
  push({ mesh: "box", node: footerR?.node ?? -1, x: 0, y: -0.05, z: front - D + WATER / 2, w: W, h: 0.06, d: WATER, color: palette.water, surf: Surf.WATER, delay: 0.1 });

  let rail: PixelCity["rail"] = null;
  if (tocR) {
    const targets = new Map<number, string>();
    for (const i of tocR.items) {
      const t = nodes[i].link?.target;
      if (t !== undefined) {
        const dz = districtZones.find((dz2) => inside(t, dz2.d.node));
        if (dz && !targets.has(dz.d.node)) targets.set(dz.d.node, nodes[i].label ?? "");
      }
    }
    const stations = districtZones
      .filter((dz) => targets.has(dz.d.node))
      .map((dz) => ({ x: 0, z: dz.z.z + dz.z.d - 1.5, label: targets.get(dz.d.node)!, region: dz.z.region }));
    if (stations.length >= 2) {
      const H = 3.4;
      const zTop = eZ - 0.5;
      const zEnd = Math.min(...stations.map((s) => s.z)) - 1;
      push({ mesh: "box", node: tocR.node, x: 0, y: H, z: (zTop + zEnd) / 2, w: 0.3, h: 0.16, d: zTop - zEnd, color: palette.walls.modern[1], delay: 0.8 });
      for (let z = zTop; z > zEnd; z -= 3.5) push({ mesh: "box", node: tocR.node, x: 0, y: 0, z, w: 0.18, h: H, d: 0.18, color: steel, delay: 0.75 });
      for (const st of stations) {
        push({ mesh: "box", node: tocR.node, x: 0.75, y: H - 0.05, z: st.z, w: 1.0, h: 0.12, d: 1.6, color: palette.walls[grammar.style][0], delay: 0.85 });
        push({ mesh: "box", node: tocR.node, x: 1.1, y: H + 0.07, z: st.z, w: 0.08, h: 0.8, d: 1.4, color: palette.glass, delay: 0.85 });
        const t = fitText(keyword(st.label, 8) ?? st.label, 1.9);
        if (t) signAt(tocR.node, t, 0.75, H + 0.95, st.z + 0.8, palette.accents[2] ?? palette.accents[0], 0.9);
      }
      rail = { points: [[0, H + 0.16, zTop], [0, H + 0.16, zEnd]], stations };
      influences.push({ region: tocR.id, node: tocR.node, what: `the table of contents (${tocR.items.length} links)`, effect: `a monorail with ${stations.length} stations at the sections it links to`, score: 0.6 });
    }
  }

  const cityArea = W * D;
  for (const { z, d } of districtZones) {
    const r = d.region;
    const share = zArea(z) / cityArea;
    let what = r ? `${REGION_LABEL[r.kind]} ${q(r.title ?? d.title)}` : `block ${q(d.title ?? nodes[d.node].selector)}`;
    let effect = `a district, ${Math.round(share * 100)}% of the city`;
    let bonus = 0;
    if (r) {
      const n = nodes[r.node];
      switch (r.kind) {
        case "feed":
          what = `a list of ${r.items.length} repeated items (${q(nodes[r.items[0]]?.selector ?? "", 18)})`;
          effect = `${Math.min(r.items.length, 40)} shops in rank order, the first one taller`;
          bonus = 0.4;
          break;
        case "references":
          what = `References (${n.descendants.toLocaleString("en")} elements)`;
          effect = `the archive district, ${Math.round(share * 100)}% of the city`;
          bonus = 0.2;
          break;
        case "features":
          effect = `an ensemble of ${r.items.length} matching buildings`;
          bonus = 0.25;
          break;
        case "pricing":
          effect = `${Math.min(r.items.length, 5)} towers rising with the price`;
          bonus = 0.4;
          break;
        case "gallery":
        case "logos":
          effect = `a billboard plaza with ${Math.min(r.items.length, 12)} real images`;
          bonus = 0.35;
          break;
        case "showcase":
          effect = `a district of screens (${n.images} images)`;
          bonus = 0.2;
          break;
        case "testimonials":
          effect = `a park of ${Math.min(r.items.length || 1, 8)} statues`;
          bonus = 0.15;
          break;
        case "directory":
          effect = `a market of ${Math.min(r.items.length, 16)} stalls`;
          break;
      }
    }
    const prev = r ? influences.find((f) => f.region === r.id) : undefined;
    if (prev) prev.score += share * 3;
    else influences.push({ region: r?.id ?? -1, node: r?.node ?? d.node, what, effect, score: share * 3 + bonus });
  }
  if (fp.darkness > 0.5) influences.push({ region: -1, node: 0, what: `page background ${fp.background ? rgbToCss(oklch(fp.background.l, fp.background.c, fp.background.h)) : "dark"}`, effect: "night: lit windows, stars, neon", score: 0.9 });
  else if (grammar.time === "golden") influences.push({ region: -1, node: 0, what: `brand color hue ${Math.round(fp.hues[0]?.h ?? 0)}° (warm)`, effect: "golden-hour light", score: 0.55 });
  if (fp.legacy > 0.5) influences.push({ region: -1, node: 0, what: "table layout and bgcolor attributes", effect: "retro architecture: brick, water towers, palms", score: 0.7 });
  if (fp.type.serif > 0.3) influences.push({ region: -1, node: 0, what: `serif headings (${Math.round(fp.type.serif * 100)}% of type rules)`, effect: "classic architecture: pitched roofs, chimneys, a clock tower", score: 0.65 });
  influences.sort((a, b) => b.score - a.score);

  const margin = 1.5;
  const plateW = W + margin * 2;
  const plateD = D + margin * 2;
  if (frame === "island") {
    push({ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: plateW, h: 0.3, d: plateD, color: palette.grass[0], surf: Surf.GRASS, delay: 0 });
    push({ mesh: "box", node: -1, x: 0, y: -1.7, z: 0, w: plateW - 0.02, h: 1.4, d: plateD - 0.02, color: palette.soil, surf: Surf.SOIL, delay: 0 });
    push({ mesh: "box", node: -1, x: 0, y: -3.2, z: 0, w: plateW - 0.04, h: 1.5, d: plateD - 0.04, color: palette.stone, surf: Surf.SOIL, delay: 0 });
  }
  for (const r of roads) push({ mesh: "box", node: r.avenue ? navR?.node ?? -1 : -1, x: r.x + r.w / 2, y: 0, z: r.z + r.d / 2, w: r.w, h: 0.04, d: r.d, color: palette.road, surf: Surf.ROAD, lit: r.avenue ? 1 : 0, delay: 0.05 });
  for (const r of greens) {
    push({ mesh: "box", node: -1, x: r.x + r.w / 2, y: 0, z: r.z + r.d / 2, w: r.w, h: 0.05, d: r.d, color: palette.grass[1], surf: Surf.GRASS, delay: 0.05 });
    const n = Math.floor(r.w * r.d * (grammar.trees * 0.25 + 0.05));
    for (let i = 0; i < n; i++) tree(r.x + 0.3 + h01(i, 81) * (r.w - 0.6), r.z + 0.3 + h01(i, 82) * (r.d - 0.6), 0.05, 0.4);
  }
  const lampEvery = night ? 3 : 4;
  for (const r of roads) {
    const len = r.axis === "x" ? r.w : r.d;
    for (let t = 1; t < len - 0.5; t += lampEvery) {
      const x = r.axis === "x" ? r.x + t : r.x - 0.12;
      const z = r.axis === "x" ? r.z - 0.12 : r.z + t;
      push({ mesh: "box", node: -1, x, y: 0, z, w: 0.06, h: 0.9, d: 0.06, color: steel, delay: 0.5 });
      push({ mesh: "glow", node: -1, x, y: 0.9, z, w: 0.16, h: 0.1, d: 0.16, color: palette.lamp, lit: night ? 1.6 : grammar.time === "golden" ? 0.9 : 0.15, delay: 0.55 });
    }
  }
  if (frame === "island") {
    const rim = Math.round((W + D) * (0.4 + grammar.trees * 0.6));
    for (let i = 0; i < rim; i++) {
      const t = h01(i, 91) * 4;
      const e = h01(i, 92);
      const offX = plateW / 2 - margin * 0.5;
      const offZ = plateD / 2 - margin * 0.5;
      const [x, z] = t < 1 ? [e * plateW - plateW / 2, offZ] : t < 2 ? [e * plateW - plateW / 2, -offZ] : t < 3 ? [offX, e * plateD - plateD / 2] : [-offX, e * plateD - plateD / 2];
      if (h01(i, 93) < 0.5 + grammar.trees) tree(x, z, 0, 0.3, 0.9 + h01(i, 94) * 0.3);
    }
  }
  const world = frame === "world" ? addWorld({ palette, grammar, W, D, front, water: WATER, roads }) : null;

  let buildDuration = 0;
  for (const p of parts) buildDuration = Math.max(buildDuration, p.delay);

  return {
    frame,
    scenery: world?.parts ?? [],
    worldRoads: world?.roads ?? [],
    worldExtent: world?.extent ?? 0,
    fingerprint: fp,
    semantics: sem,
    siteName: sem.siteName,
    zones,
    influences: influences.slice(0, 8),
    rail,
    entrance: [0, eZ + E / 2],
    grammar,
    palette,
    size: { w: plateW, d: plateD },
    parts,
    roads,
    buildings,
    images,
    signs,
    signAtlas: SIGN_ATLAS,
    maxHeight,
    buildDuration: buildDuration + 1,
    smokestacks,
  };
}

export type { GamePalette, CityGrammar, NNode, RegionKind };
