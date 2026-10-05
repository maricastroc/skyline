import { computeFingerprint } from "../fingerprint/fingerprint";
import { hexToRgb, mix, oklch, rgbToOklch } from "../../city/palette";
import type { RGB } from "../../city/types";
import { NodeFlag, type NNode, type NormalizedDocument } from "../../model/types";
import { deriveGrammar, type ArchStyle, type CityGrammar } from "./grammar";
import { buildGamePalette, type GamePalette } from "./palette";
import { textWidth } from "./pixel-font";
import { Surf, type Building, type BuildingKind, type Part, type PixelCity, type RoadSeg, type SignSpec } from "./types";

const FLOOR = 0.5;
const SIGN_TEXEL = 0.11;
const SIGN_ATLAS = { w: 512, h: 256 };
const MAX_IMAGES = 40;
const CHROME_LABEL = /^\s*(up ?vote|down ?vote|vote|hide|flag|reply|edit|share|more|next|prev(ious)?|log ?in|sign ?in|sign ?up|menu|close|search|toggle.*|skip.*|jump.*|read more|view|go|home|top|\d+|[^a-z0-9]*)\s*$/i;

function gameTint(hex: string | undefined): RGB | null {
  if (!hex) return null;
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { l, c, h } = rgbToOklch(rgb);
  if (c < 0.05 || l > 0.95) return null;
  return oklch(Math.min(0.72, Math.max(0.55, l)), Math.min(0.17, Math.max(0.1, c)), h);
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Unit {
  node: number;
  own: boolean;
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
}

interface LNode {
  id: number;
  level: number;
  unit?: Unit;
  children: LNode[];
  area: number;
}

export function generatePixelCity(doc: NormalizedDocument): PixelCity {
  const fp = computeFingerprint(doc);
  const grammar = deriveGrammar(fp);
  const palette = buildGamePalette(fp, grammar);
  const nodes = doc.nodes;
  const N = nodes.length;
  const rand = mulberry32(fp.seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length) % xs.length];

  const imageNodes = nodes
    .filter((n) => n.image && (n.image.proxy || n.image.src))
    .sort((a, b) => b.image!.priority - a.image!.priority)
    .slice(0, MAX_IMAGES);
  const slotOf = new Map<number, number>();
  const images = imageNodes.map((n, slot) => {
    slotOf.set(n.id, slot);
    return { node: n.id, slot, src: n.image!.proxy ?? n.image!.src };
  });

  const inNav = new Uint8Array(N);
  for (let i = 1; i < N; i++) inNav[i] = nodes[i].role === "nav" || inNav[nodes[i].parent] ? 1 : 0;

  const districtRoots: number[] = [];
  {
    let cur = 0;
    for (let guard = 0; guard < 8; guard++) {
      const kids = nodes[cur].children;
      const heavy = kids.find((c) => nodes[c].weight > nodes[cur].weight * 0.6 && nodes[c].children.length > 1);
      for (const c of kids) if (c !== heavy) districtRoots.push(c);
      if (heavy === undefined) break;
      cur = heavy;
    }
    districtRoots.sort((a, b) => a - b);
  }

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
  const unitWeight = nodes[0].weight / grammar.units;
  let kiosks = 0;
  let towersLeft = Math.round(3 + grammar.towers * 9 + grammar.verticality * 6);
  let firstH1 = nodes.find((n) => n.heading === 1)?.id ?? -1;

  const styleFor = (node: number): ArchStyle => {
    const r = ((node * 2654435761) >>> 0) / 4294967296;
    return r < grammar.secondaryShare ? grammar.secondary : grammar.style;
  };

  const makeUnit = (id: number, own: boolean): Unit => {
    const n = nodes[id];
    const end = own ? id + 1 : n.end;
    let minHeading = 7;
    let headingLabel: string | undefined;
    let hasH1 = false;
    let imageSlot = -1;
    let hasForm = n.role === "form";
    let controls = 0;
    let buttons = 0;
    let media = 0;
    let linkCount = 0;
    const labels: string[] = [];
    const anyLabels: string[] = [];
    for (let i = id; i < end; i++) {
      const m = nodes[i];
      if (m.heading && m.heading < minHeading) {
        minHeading = m.heading;
        headingLabel = m.label;
      }
      if (i === firstH1) hasH1 = true;
      if (imageSlot < 0 && slotOf.has(i)) imageSlot = slotOf.get(i)!;
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
    const chars = own ? n.ownChars : n.chars;
    const links = own ? n.ownChars > 0 ? 1 : 0 : Math.max(n.links, linkCount);
    const images = own ? (n.image ? 1 : 0) : n.images;
    const repeat = n.cluster ? Math.min(n.cluster.count, 10) : n.role === "list" || n.role === "table" ? Math.min(n.children.length, 10) : 0;

    let kind: BuildingKind;
    const kioskOk = kiosks < 3 + Math.round(grammar.neon * 8);
    if (hasH1) kind = "landmark";
    else if (hasForm || controls >= 2) kind = "factory";
    else if ((inNav[id] || n.role === "nav") && links >= 2) kind = "shops";
    else if (links >= 3 && chars / Math.max(links, 1) < 28) kind = "shops";
    else if (imageSlot >= 0 && images * 260 > chars) kind = "billboard";
    else if (media > 0) kind = "billboard";
    else if (repeat >= 3 && grammar.repetition > 0.25) kind = "rowhouses";
    else if (buttons > 0 && chars < 80 && kioskOk) kind = "kiosk";
    else if (minHeading <= 3 && towersLeft > 0 && rand() < grammar.towers + 0.2) {
      kind = "tower";
      towersLeft--;
    }
    else if (chars > 350 || n.weight > unitWeight * 1.5) kind = "office";
    else kind = "house";

    const w = own ? n.selfWeight : n.weight;
    const area = Math.max(1, Math.min(12, Math.round(2.2 * Math.sqrt(w / unitWeight))));
    let fw = Math.max(1, Math.round(Math.sqrt(area)));
    let fd = Math.max(1, Math.ceil(area / fw));
    if (kind === "landmark") [fw, fd] = [3, 3];
    else if (kind === "shops") [fw, fd] = [2 * Math.max(1, Math.min(labels.length || anyLabels.length || links, 4)), 1];
    else if (kind === "rowhouses") [fw, fd] = [Math.max(3, repeat), 1];
    else if (kind === "factory") [fw, fd] = [3, 2];
    else if (kind === "kiosk") [fw, fd] = [1, 1];
    if (kind === "kiosk") kiosks++;
    else if (kind === "billboard") [fw, fd] = [Math.max(2, fw), Math.max(2, fd)];

    return {
      node: id,
      own,
      kind,
      weight: w,
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
    };
  };

  const relevel = (l: LNode, level: number): LNode => ({ ...l, level, children: l.children.map((c) => relevel(c, level + 1)) });

  const collect = (id: number, level: number): LNode => {
    const n = nodes[id];
    if (!n.children.length || n.weight <= unitWeight || level >= 6) {
      const u = makeUnit(id, false);
      return { id, level, unit: u, children: [], area: 0 };
    }
    const kids: LNode[] = [];
    if (n.flags & NodeFlag.OWN_CONTENT && n.ownChars > 60) kids.push({ id, level: level + 1, unit: makeUnit(id, true), children: [], area: 0 });
    for (const c of n.children) kids.push(collect(c, level + 1));
    if (kids.length === 1) return { ...kids[0], level };
    return { id, level, children: kids, area: 0 };
  };

  let districts = districtRoots.map((d) => collect(d, 2));
  if (districts.length > 8) {
    const per = Math.ceil(districts.length / Math.min(6, Math.ceil(Math.sqrt(districts.length))));
    const chunks: LNode[] = [];
    for (let i = 0; i < districts.length; i += per) chunks.push({ id: districts[i].id, level: 1, children: districts.slice(i, i + per), area: 0 });
    districts = chunks;
  } else districts = districts.map((d) => relevel(d, 1));
  const root: LNode = { id: 0, level: 0, children: districts, area: 0 };
  if (!root.children.length) root.children.push({ id: 0, level: 1, unit: makeUnit(0, false), children: [], area: 0 });
  if (firstH1 < 0) {
    let best: Unit | null = null;
    const walk = (l: LNode) => {
      if (l.unit && (!best || l.unit.weight > best.weight)) best = l.unit;
      l.children.forEach(walk);
    };
    walk(root);
    if (best) {
      (best as Unit).kind = "landmark";
      (best as Unit).fw = 3;
      (best as Unit).fd = 3;
      firstH1 = (best as Unit).node;
    }
  }

  const gapAt = (level: number): { size: number; road: boolean } => {
    if (level === 0) return { size: grammar.avenue, road: true };
    if (level <= grammar.streetLevels) return { size: 1, road: true };
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
    const g = gapAt(l.level).size;
    s += (l.children.length - 1) * g * Math.sqrt(s) * 0.8;
    if (l.level >= 1 && l.level <= grammar.streetLevels + 1) s = (Math.sqrt(s) + 1) ** 2;
    l.area = s;
    return s;
  };
  const total = areaOf(root);
  const side = Math.max(14, Math.min(52, Math.ceil(Math.sqrt(total * 1.08))));
  const half = side / 2;

  const parts: Part[] = [];
  const roads: RoadSeg[] = [];
  const buildings: Building[] = [];
  const signs: SignSpec[] = [];
  let shelf = { x: 1, y: 1, h: 0 };
  let maxHeight = 0;

  const push = (p: Omit<Part, "rotY" | "surf" | "lit" | "delay"> & Partial<Pick<Part, "rotY" | "surf" | "lit" | "delay">>) => {
    const part: Part = { rotY: 0, surf: Surf.PLAIN, lit: 0, delay: 0, ...p };
    parts.push(part);
    maxHeight = Math.max(maxHeight, part.y + part.h);
    return part;
  };

  const addSign = (text: string, bg: RGB, fg: RGB, vertical = false): SignSpec | null => {
    const clean = text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-!?&:/+#]/g, "")
      .trim();
    if (!clean) return null;
    const w = vertical ? 7 : textWidth(clean) + 4;
    const h = vertical ? clean.replace(/ /g, "").length * 6 + 3 : 9;
    if (shelf.x + w + 1 > SIGN_ATLAS.w) shelf = { x: 1, y: shelf.y + shelf.h + 1, h: 0 };
    if (shelf.y + h + 1 > SIGN_ATLAS.h) return null;
    const spec: SignSpec = { text: vertical ? `|${clean.replace(/ /g, "")}` : clean, bg, fg, x: shelf.x, y: shelf.y, w, h };
    shelf.x += w + 1;
    shelf.h = Math.max(shelf.h, h);
    signs.push(spec);
    return spec;
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
    const R = items.slice(idx);
    const f = L.reduce((s, it) => s + it.area, 0) / tot;
    let alongX = r.w > r.d || (r.w === r.d && rand() < 0.5);
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
      if (g && gap.road) roads.push({ x: r.x + a, z: r.z, w: g, d: r.d, axis: "z", avenue: g > 1 });
      else if (g) greens.push({ x: r.x + a, z: r.z, w: g, d: r.d });
    } else {
      ra = { x: r.x, z: r.z + r.d - a, w: r.w, d: a };
      rb = { x: r.x, z: r.z, w: r.w, d: r.d - a - g };
      if (g && gap.road) roads.push({ x: r.x, z: r.z + r.d - a - g, w: r.w, d: g, axis: "x", avenue: g > 1 });
      else if (g) greens.push({ x: r.x, z: r.z + r.d - a - g, w: r.w, d: g });
    }
    partition(L, ra, gap, out);
    partition(R, rb, gap, out);
  };

  const greens: Rect[] = [];
  let order = 0;
  const totalUnits = (() => {
    let c = 0;
    const walk = (l: LNode) => (l.unit ? c++ : l.children.forEach(walk));
    walk(root);
    return c;
  })();

  const place = (l: LNode, r: Rect, plateY: number) => {
    if (l.unit) return placeUnit(l.unit, r, plateY);
    let y = plateY;
    let inner = r;
    if (l.level >= 1 && l.level <= grammar.streetLevels + 1 && r.w >= 3 && r.d >= 3) {
      const isPark = nodes[l.id].role === "footer" || nodes[l.id].role === "aside";
      push({ mesh: "box", node: l.id, x: r.x + r.w / 2, y: plateY, z: r.z + r.d / 2, w: r.w, h: 0.12, d: r.d, color: isPark ? palette.grass[1] : palette.sidewalk, surf: isPark ? Surf.GRASS : Surf.PAVING, delay: 0.1 });
      y = plateY + 0.12;
      inner = { x: r.x + 0.5, z: r.z + 0.5, w: r.w - 1, d: r.d - 1 };
      if (inner.w < 1 || inner.d < 1) inner = r;
    }
    const gap = gapAt(l.level);
    partition(l.children, inner, gap, (c, cr) => place(c, cr, y));
  };

  const wallOf = (u: Unit) => {
    if (u.tint) return u.tint;
    const ws = palette.walls[u.style];
    return ws[(u.node * 7 + (u.repeat ? 0 : u.node)) % ws.length];
  };
  const roofOf = (u: Unit) => {
    const rs = palette.roofs[u.style];
    return rs[(u.node * 3) % rs.length];
  };
  const accentOf = (u: Unit) => palette.accents[(u.node * 5) % palette.accents.length];
  const night = grammar.time === "night";
  const litChance = night ? 0.62 : grammar.time === "golden" ? 0.22 : 0;

  const placeUnit = (u: Unit, lot: Rect, y0: number) => {
    const delay = 0.25 + (order++ / Math.max(totalUnits, 1)) * 1.6 + rand() * 0.15;
    const fw = Math.min(u.fw, Math.max(1, lot.w - (lot.w > u.fw ? 0.35 : 0.2)));
    const fd = Math.min(u.fd, Math.max(1, lot.d - (lot.d > u.fd ? 0.35 : 0.2)));
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d - fd / 2 - 0.15;
    const ctx: Ctx = { u, cx, cz, fw, fd, y0, delay };
    const h = KITS[u.kind](ctx);
    buildings.push({ node: u.node, kind: u.kind, x: cx, z: cz, w: fw, d: fd, h, label: u.label });

    const back = lot.d - fd - 0.15;
    if (back >= 0.8) {
      const gz = lot.z + back / 2;
      const green = rand() < 0.4 + grammar.parks;
      push({ mesh: "box", node: -1, x: cx, y: y0, z: gz, w: lot.w - 0.2, h: 0.06, d: back - 0.1, color: green ? palette.grass[0] : palette.plaza, surf: green ? Surf.GRASS : Surf.PAVING, delay });
      const trees = Math.floor(lot.w * back * grammar.trees * 0.7 + rand() * grammar.trees * 1.4);
      for (let t = 0; t < trees; t++) tree(lot.x + 0.4 + rand() * (lot.w - 0.8), gz + (rand() - 0.5) * (back - 0.6), y0 + 0.06, delay + 0.2);
    }
    if (lot.w - fw >= 1.6) {
      const sx = lot.x + (lot.w - fw) / 4;
      if (rand() < grammar.trees + 0.15) tree(sx, cz, y0, delay + 0.2);
    }
  };

  interface Ctx {
    u: Unit;
    cx: number;
    cz: number;
    fw: number;
    fd: number;
    y0: number;
    delay: number;
  }

  const floorsFor = (u: Unit, base: number, spread: number) =>
    Math.max(1, Math.round((base + spread * Math.log2(1 + u.chars / 160)) * (0.45 + grammar.verticality * 1.1) + rand() * 1.5));

  const body = (c: Ctx, h: number, color: RGB, surf: number, opts: { w?: number; d?: number; y?: number; x?: number; z?: number; mesh?: Part["mesh"]; lit?: number } = {}) =>
    push({
      mesh: opts.mesh ?? "box",
      node: c.u.node,
      x: opts.x ?? c.cx,
      y: opts.y ?? c.y0,
      z: opts.z ?? c.cz,
      w: opts.w ?? c.fw,
      h,
      d: opts.d ?? c.fd,
      color,
      surf,
      lit: opts.lit ?? litChance,
      delay: c.delay,
    });

  const roofKit = (c: Ctx, top: number, w: number, d: number, style: ArchStyle) => {
    const roof = roofOf(c.u);
    switch (style) {
      case "classic":
        push({ mesh: "prism", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.12, h: Math.min(1.2, 0.35 + w * 0.25), d: d + 0.12, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1, rotY: w >= d ? 0 : Math.PI / 2 });
        if (rand() < 0.6) push({ mesh: "box", node: c.u.node, x: c.cx + w * 0.28, y: top, z: c.cz - d * 0.15, w: 0.2, h: 0.75, d: 0.2, color: palette.walls.classic[2], surf: Surf.BRICK, delay: c.delay + 0.15 });
        return top + 0.9;
      case "soft":
        if (grammar.roundness > 0.35 && w === d) {
          push({ mesh: "cyl", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.7, h: 0.35, d: d * 0.7, color: roof, delay: c.delay + 0.1 });
          return top + 0.35;
        }
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.1, h: 0.1, d: d + 0.1, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (rand() < 0.5) for (let i = 0; i < 2; i++) tree(c.cx + (rand() - 0.5) * w * 0.6, c.cz + (rand() - 0.5) * d * 0.6, top + 0.1, c.delay + 0.2, 0.6);
        return top + 0.1;
      case "retro":
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w, h: 0.12, d, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (rand() < 0.45) waterTower(c.cx + w * 0.2, c.cz - d * 0.2, top + 0.12, c.delay + 0.2, c.u.node);
        return top + 0.12;
      case "tech":
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.9, h: 0.15, d: d * 0.9, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        push({ mesh: "box", node: c.u.node, x: c.cx - w * 0.25, y: top, z: c.cz, w: 0.06, h: 1.2, d: 0.06, color: palette.walls.tech[1], delay: c.delay + 0.15 });
        push({ mesh: "glow", node: c.u.node, x: c.cx - w * 0.25, y: top + 1.2, z: c.cz, w: 0.14, h: 0.14, d: 0.14, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.2 });
        return top + 0.15;
      default:
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w + 0.06, h: 0.1, d: d + 0.06, color: roof, surf: Surf.ROOF, delay: c.delay + 0.1 });
        if (w * d >= 2 && rand() < 0.7) push({ mesh: "box", node: c.u.node, x: c.cx + (rand() - 0.5) * w * 0.4, y: top + 0.1, z: c.cz + (rand() - 0.5) * d * 0.4, w: 0.4, h: 0.25, d: 0.3, color: palette.walls.modern[1], delay: c.delay + 0.15 });
        return top + 0.1;
    }
  };

  const awning = (c: Ctx, x: number, w: number, color: RGB, y: number) =>
    push({ mesh: "box", node: c.u.node, x, y, z: c.cz + c.fd / 2 + 0.18, w: w * 0.92, h: 0.1, d: 0.36, color, surf: Surf.STRIPES, delay: c.delay + 0.1 });

  const frontSign = (c: Ctx, text: string | undefined, y: number, maxW: number, bg: RGB, x = c.cx, vertical = false) => {
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    let t = "";
    for (const wd of words) {
      const next = t ? `${t} ${wd}` : wd;
      if (textWidth(next.toUpperCase()) * SIGN_TEXEL > maxW) break;
      t = next;
    }
    if (!t) t = words[0]?.slice(0, Math.max(1, Math.floor(maxW / SIGN_TEXEL / 4))) ?? "";
    const spec = addSign(t, bg, oklch(0.98, 0.01, 90), vertical);
    if (!spec) return;
    push({
      mesh: "sign",
      node: c.u.node,
      x,
      y,
      z: c.cz + c.fd / 2 + 0.02,
      w: spec.w * SIGN_TEXEL,
      h: spec.h * SIGN_TEXEL,
      d: 1,
      color: bg,
      rect: [spec.x, spec.y, spec.w, spec.h],
      lit: 1,
      delay: c.delay + 0.3,
    });
  };

  const billboardOn = (c: Ctx, top: number, size: number) => {
    const w = size;
    const h = size * 0.62;
    const lift = 0.5;
    for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + s * w * 0.3, y: top, z: c.cz, w: 0.08, h: lift + h * 0.5, d: 0.08, color: palette.walls.tech[1], delay: c.delay + 0.2 });
    push({ mesh: "box", node: c.u.node, x: c.cx, y: top + lift - 0.06, z: c.cz, w: w + 0.12, h: h + 0.12, d: 0.12, color: palette.walls.tech[1], delay: c.delay + 0.25 });
    for (const side of [0, Math.PI]) {
      push({ mesh: "image", node: c.u.node, x: c.cx + Math.sin(side) * 0.07, y: top + lift, z: c.cz + Math.cos(side) * 0.07, w, h, d: 1, rotY: side, color: accentOfUnit(c.u), slot: c.u.imageSlot, delay: c.delay + 0.3 });
    }
    return top + lift + h;
  };
  const accentOfUnit = (u: Unit) => accentOf(u);

  const KITS: Record<BuildingKind, (c: Ctx) => number> = {
    house: (c) => {
      const cap = grammar.coverage > 0.65 ? 2 + Math.round(grammar.verticality * 3) : 3;
      const floors = Math.min(cap, floorsFor(c.u, 1 + (grammar.coverage > 0.65 ? 1 : 0), 0.8));
      const h = floors * FLOOR + 0.2;
      body(c, h, wallOf(c.u), c.u.style === "classic" ? Surf.HOUSE : c.u.style === "retro" ? Surf.BRICK : Surf.HOUSE);
      return roofKit(c, c.y0 + h, c.fw, c.fd, c.u.style);
    },
    office: (c) => {
      const floors = floorsFor(c.u, 3, 2.2);
      const h = floors * FLOOR;
      const glass = c.u.style === "modern" || c.u.style === "tech";
      if (glass && floors > 4) {
        body(c, FLOOR * 1.2, palette.walls.modern[1], Surf.OFFICE);
        body(c, h - FLOOR * 1.2, c.u.style === "tech" ? palette.walls.tech[0] : palette.glass, Surf.GLASS, { y: c.y0 + FLOOR * 1.2, w: c.fw * 0.9, d: c.fd * 0.9 });
      } else if (c.u.style === "soft" && grammar.roundness > 0.35 && c.fw === c.fd) {
        body(c, h, wallOf(c.u), Surf.OFFICE, { mesh: "cyl" });
      } else body(c, h, wallOf(c.u), c.u.style === "retro" ? Surf.BRICK : Surf.OFFICE);
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
      if (rand() < 0.5) frontSign(c, c.u.label, c.y0 + h * 0.62, w * 0.95, accentOf(c.u));
      if (c.u.style === "classic") push({ mesh: "pyramid", node: c.u.node, x: c.cx, y: top, z: c.cz, w: w * 0.8, h: 1, d: d * 0.8, color: roofOf(c.u), rotY: Math.PI / 4, delay: c.delay + 0.2 });
      else {
        push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: 0.05, h: 1.1, d: 0.05, color: palette.walls.tech[1], delay: c.delay + 0.2 });
        push({ mesh: "glow", node: c.u.node, x: c.cx, y: top + 1.1, z: c.cz, w: 0.12, h: 0.12, d: 0.12, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.2 });
      }
      return top + 1.2;
    },
    landmark: (c) => {
      const h = Math.max(9, (8 + grammar.verticality * 16)) ;
      const accent = palette.accents[0];
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0, z: c.cz, w: c.fw, h: 0.08, d: c.fd, color: palette.plaza, surf: Surf.PAVING, delay: c.delay });
      const y = c.y0 + 0.08;
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
          push({ mesh: "box", node: c.u.node, x: c.cx, y: y + 4.9 + sh, z: c.cz, w: 0.05, h: 0.9, d: 0.05, color: palette.walls.tech[1], delay: c.delay + 0.35 });
          push({ mesh: "box", node: c.u.node, x: c.cx + 0.22, y: y + 5.45 + sh, z: c.cz, w: 0.42, h: 0.26, d: 0.03, color: palette.accents[0], delay: c.delay + 0.35 });
          frontSign(c, c.u.label, y + 0.35, 2.4, accent);
          return y + 5.8 + sh;
        }
        case "soft": {
          body(c, h * 0.8, wallOf(c.u), Surf.OFFICE, { y, w: 1.8, d: 1.8, mesh: "cyl" });
          body(c, 0.45, accent, Surf.PLAIN, { y: y + h * 0.8, w: 2.6, d: 2.6, mesh: "cyl" });
          body(c, h * 0.2, wallOf(c.u), Surf.OFFICE, { y: y + h * 0.8 + 0.45, w: 1.2, d: 1.2, mesh: "cyl" });
          push({ mesh: "cyl", node: c.u.node, x: c.cx, y: y + h + 0.45, z: c.cz, w: 1.3, h: 0.9, d: 1.3, color: palette.roofs.soft[0], delay: c.delay + 0.3 });
          frontSign(c, c.u.label, y + 0.4, 2.6, accent);
          return y + h + 1.4;
        }
        case "retro": {
          body(c, h * 0.55, palette.walls.retro[0], Surf.BRICK, { y, w: 2.6, d: 2.4 });
          const top = y + h * 0.55;
          for (let i = 0; i < 4; i++) {
            const t = i / 4;
            push({ mesh: "box", node: c.u.node, x: c.cx - 0.5 + t * 0.2, y: top, z: c.cz, w: 0.08, h: h * 0.6 * (1 - t * 0.2), d: 0.08, color: palette.walls.tech[1], delay: c.delay + 0.2 });
          }
          push({ mesh: "glow", node: c.u.node, x: c.cx - 0.4, y: top + h * 0.6, z: c.cz, w: 0.18, h: 0.18, d: 0.18, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.3 });
          const spec = c.u.label ? addSign(c.u.label.split(/\s+/).slice(0, 2).join(" ").slice(0, 14), accent, oklch(0.98, 0.02, 90)) : null;
          if (spec) {
            for (const s of [-1, 1]) push({ mesh: "box", node: c.u.node, x: c.cx + 0.3 + s * 0.6, y: top, z: c.cz + 0.6, w: 0.08, h: 0.6, d: 0.08, color: palette.walls.tech[1], delay: c.delay + 0.2 });
            push({ mesh: "sign", node: c.u.node, x: c.cx + 0.3, y: top + 0.6, z: c.cz + 0.62, w: spec.w * SIGN_TEXEL, h: spec.h * SIGN_TEXEL, d: 1, color: accent, rect: [spec.x, spec.y, spec.w, spec.h], lit: 1, delay: c.delay + 0.35 });
          }
          return top + h * 0.6;
        }
        case "tech": {
          body(c, h * 1.1, palette.walls.tech[1], Surf.GLASS, { y, w: 1.6, d: 1.6 });
          for (const s of [-1, 1]) push({ mesh: "glow", node: c.u.node, x: c.cx + s * 0.81, y, z: c.cz + 0.81, w: 0.06, h: h * 1.1, d: 0.06, color: accent, lit: 1.4, delay: c.delay + 0.2 });
          push({ mesh: "box", node: c.u.node, x: c.cx, y: y + h * 1.1, z: c.cz, w: 0.08, h: 2.2, d: 0.08, color: palette.walls.tech[2], delay: c.delay + 0.2 });
          push({ mesh: "glow", node: c.u.node, x: c.cx, y: y + h * 1.1 + 2.2, z: c.cz, w: 0.2, h: 0.2, d: 0.2, color: oklch(0.66, 0.2, 25), lit: 1.8, delay: c.delay + 0.3 });
          frontSign(c, c.u.label, y + 0.5, 1.5, accent);
          return y + h * 1.1 + 2.4;
        }
        default: {
          body(c, 1.4, palette.walls.modern[0], Surf.OFFICE, { y, w: 2.6, d: 2.6 });
          body(c, h, palette.glass, Surf.GLASS, { y: y + 1.4, w: 1.8, d: 1.8 });
          body(c, h * 0.3, palette.glass, Surf.GLASS, { y: y + 1.4 + h, w: 1.2, d: 1.2 });
          const top = y + 1.4 + h * 1.3;
          push({ mesh: "box", node: c.u.node, x: c.cx, y: top, z: c.cz, w: 0.06, h: 2.4, d: 0.06, color: palette.walls.modern[2], delay: c.delay + 0.2 });
          push({ mesh: "glow", node: c.u.node, x: c.cx, y: top + 2.4, z: c.cz, w: 0.16, h: 0.16, d: 0.16, color: oklch(0.66, 0.2, 25), lit: 1.6, delay: c.delay + 0.3 });
          frontSign(c, c.u.label, y + 0.45, 2.5, accent);
          return top + 2.5;
        }
      }
    },
    shops: (c) => {
      const n = Math.max(1, Math.round(c.fw / 2));
      const sw = c.fw / n;
      const floors = c.u.style === "classic" || c.u.style === "retro" ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const x = c.cx - c.fw / 2 + sw * (i + 0.5);
        const label = c.u.labels[i];
        const color = c.u.tint ? mix(c.u.tint, palette.walls.modern[0], (i % 2) * 0.25) : palette.walls[c.u.style][(c.u.node + i) % palette.walls[c.u.style].length];
        const h = floors * FLOOR + 0.35 + (i % 2) * 0.15;
        body(c, h, color, Surf.HOUSE, { x, w: sw * 0.98 });
        const accent = c.u.tint ?? palette.accents[(c.u.node + i) % palette.accents.length];
        awning(c, x, sw, accent, c.y0 + 0.62);
        frontSign(c, label, c.y0 + h - 0.42, sw * 0.95, night ? accent : mix(accent, palette.walls.modern[2], 0.3), x);
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
        const cc = { ...c, cx: x, fw: sw * 0.96 };
        roofKit(cc, c.y0 + floors * FLOOR, sw * 0.96, c.fd, c.u.style);
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
      const accent = accentOf(c.u);
      body(c, 0.7, palette.walls.modern[0], Surf.PLAIN, { w: 0.8, d: 0.7 });
      push({ mesh: "glow", node: c.u.node, x: c.cx, y: c.y0 + 0.7, z: c.cz, w: 0.95, h: 0.35, d: 0.8, color: accent, lit: grammar.neon > 0.3 ? 1.4 : 0.6, delay: c.delay + 0.1 });
      return c.y0 + 1.05;
    },
    billboard: (c) => {
      const floors = Math.min(5, floorsFor(c.u, 2, 1));
      const h = floors * FLOOR;
      body(c, h, wallOf(c.u), c.u.style === "retro" ? Surf.BRICK : Surf.OFFICE);
      roofKit(c, c.y0 + h, c.fw, c.fd, c.u.style === "classic" ? "modern" : c.u.style);
      return billboardOn(c, c.y0 + h + 0.1, Math.min(2.8, Math.max(c.fw, 1.6) * 1.05));
    },
    plaza: (c) => {
      push({ mesh: "box", node: c.u.node, x: c.cx, y: c.y0, z: c.cz, w: c.fw, h: 0.06, d: c.fd, color: palette.plaza, surf: Surf.PAVING, delay: c.delay });
      return c.y0 + 0.06;
    },
  };

  const smokestacks: Array<[number, number, number]> = [];

  const tree = (x: number, z: number, y: number, delay: number, scale = 1) => {
    const style = grammar.style;
    push({ mesh: "box", node: -1, x, y, z, w: 0.14 * scale, h: 0.45 * scale, d: 0.14 * scale, color: palette.trunk, delay });
    const leaf = pick(palette.leaves);
    if (style === "retro" && rand() < 0.5) {
      push({ mesh: "box", node: -1, x, y: y + 0.45 * scale, z, w: 0.1 * scale, h: 0.6 * scale, d: 0.1 * scale, color: palette.trunk, delay });
      push({ mesh: "box", node: -1, x, y: y + 1.0 * scale, z, w: 0.8 * scale, h: 0.14 * scale, d: 0.22 * scale, color: leaf, delay: delay + 0.05 });
      push({ mesh: "box", node: -1, x, y: y + 1.0 * scale, z, w: 0.22 * scale, h: 0.14 * scale, d: 0.8 * scale, color: leaf, delay: delay + 0.05 });
      return;
    }
    if (style === "modern" || style === "tech") {
      push({ mesh: "box", node: -1, x, y: y + 0.4 * scale, z, w: 0.5 * scale, h: 0.55 * scale, d: 0.5 * scale, color: leaf, delay: delay + 0.05 });
      return;
    }
    if (style === "soft") {
      push({ mesh: "cyl", node: -1, x, y: y + 0.35 * scale, z, w: 0.62 * scale, h: 0.55 * scale, d: 0.62 * scale, color: leaf, delay: delay + 0.05 });
      return;
    }
    push({ mesh: "box", node: -1, x, y: y + 0.35 * scale, z, w: 0.62 * scale, h: 0.42 * scale, d: 0.62 * scale, color: leaf, delay: delay + 0.05 });
    push({ mesh: "box", node: -1, x, y: y + 0.77 * scale, z, w: 0.38 * scale, h: 0.3 * scale, d: 0.38 * scale, color: palette.leaves[0], delay: delay + 0.08 });
  };

  const waterTower = (x: number, z: number, y: number, delay: number, node: number) => {
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) push({ mesh: "box", node, x: x + dx, y, z: z + dz, w: 0.05, h: 0.45, d: 0.05, color: palette.trunk, delay });
    push({ mesh: "cyl", node, x, y: y + 0.45, z, w: 0.6, h: 0.55, d: 0.6, color: oklch(0.55, 0.06, 55), delay });
    push({ mesh: "pyramid", node, x, y: y + 1.0, z, w: 0.62, h: 0.25, d: 0.62, color: oklch(0.4, 0.04, 50), delay, rotY: Math.PI / 8 });
  };

  const cityRect: Rect = { x: -half, z: -half, w: side, d: side };
  partition(root.children, cityRect, gapAt(0), (l, r) => place(l, r, 0));

  const margin = 1.5;
  const plateW = side + margin * 2;
  push({ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: plateW, h: 0.3, d: plateW, color: palette.grass[0], surf: Surf.GRASS, delay: 0 });
  push({ mesh: "box", node: -1, x: 0, y: -1.7, z: 0, w: plateW - 0.02, h: 1.4, d: plateW - 0.02, color: palette.soil, surf: Surf.SOIL, delay: 0 });
  push({ mesh: "box", node: -1, x: 0, y: -3.2, z: 0, w: plateW - 0.04, h: 1.5, d: plateW - 0.04, color: palette.stone, surf: Surf.SOIL, delay: 0 });

  for (const r of roads) {
    push({ mesh: "box", node: -1, x: r.x + r.w / 2, y: 0, z: r.z + r.d / 2, w: r.w, h: 0.04, d: r.d, color: palette.road, surf: Surf.ROAD, lit: r.avenue ? 1 : 0, rotY: 0, delay: 0.05 });
  }
  for (const r of greens) {
    push({ mesh: "box", node: -1, x: r.x + r.w / 2, y: 0, z: r.z + r.d / 2, w: r.w, h: 0.05, d: r.d, color: palette.grass[1], surf: Surf.GRASS, delay: 0.05 });
    const n = Math.floor(r.w * r.d * grammar.trees * 0.25);
    for (let i = 0; i < n; i++) tree(r.x + 0.3 + rand() * (r.w - 0.6), r.z + 0.3 + rand() * (r.d - 0.6), 0.05, 0.4);
  }
  const lampEvery = night ? 3 : 4;
  for (const r of roads) {
    const len = r.axis === "x" ? r.w : r.d;
    for (let t = 1; t < len - 0.5; t += lampEvery) {
      const x = r.axis === "x" ? r.x + t : r.x - 0.12;
      const z = r.axis === "x" ? r.z - 0.12 : r.z + t;
      push({ mesh: "box", node: -1, x, y: 0, z, w: 0.06, h: 0.9, d: 0.06, color: palette.walls.tech[1], delay: 0.5 });
      push({ mesh: "glow", node: -1, x, y: 0.9, z, w: 0.16, h: 0.1, d: 0.16, color: palette.lamp, lit: night ? 1.6 : grammar.time === "golden" ? 0.9 : 0.15, delay: 0.55 });
    }
  }
  const rim = Math.round(side * (0.6 + grammar.trees));
  for (let i = 0; i < rim; i++) {
    const t = rand() * 4;
    const e = rand() * plateW - plateW / 2;
    const off = half + margin * 0.5;
    const [x, z] = t < 1 ? [e, off] : t < 2 ? [e, -off] : t < 3 ? [off, e] : [-off, e];
    if (rand() < 0.5 + grammar.trees) tree(x, z, 0, 0.3, 0.9 + rand() * 0.3);
  }

  let buildDuration = 0;
  for (const p of parts) buildDuration = Math.max(buildDuration, p.delay);

  return {
    fingerprint: fp,
    grammar,
    palette,
    size: { w: plateW, d: plateW },
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

export type { GamePalette, CityGrammar, NNode };
