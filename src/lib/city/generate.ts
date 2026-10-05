import { NodeFlag, type NNode, type NormalizedDocument } from "../model/types";
import { buildingTint, buildPalette, elementTint, mix, plinthColor } from "./palette";
import { Facade, type Arc, type BillboardImage, type Bounds, type CityModel, type RGB, type Structure } from "./types";

export const MAX_BILLBOARD_IMAGES = 48;

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

type ItemKind = "node" | "own" | "tank";
interface Item {
  kind: ItemKind;
  node: number;
  weight: number;
}

const gapFor = (level: number) => (level <= 1 ? 5.5 : level === 2 ? 2.8 : level === 3 ? 1.7 : level < 7 ? 1.05 : 0.7);
const padFor = (level: number) => (level === 0 ? 4 : level === 1 ? 1.6 : level === 2 ? 1.0 : level < 7 ? 0.6 : 0.4);

function hash(i: number, salt: number): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function textArea(chars: number): number {
  return 12 + 9 * Math.log2(1 + chars / 60);
}

function leafArea(n: NNode, topImage: boolean): number {
  switch (n.role) {
    case "heading":
      return [0, 70, 40, 26, 18, 16, 16][n.heading ?? 3];
    case "image":
      return topImage ? 50 : 34;
    case "media":
      return 40;
    case "button":
      return 9;
    case "control":
      return 7;
    case "link":
      return n.ownChars > 40 ? textArea(n.ownChars) : 6;
    case "cluster":
      return 8 * Math.min(n.cluster?.count ?? 1, 64) ** 0.8;
    case "form":
      return 22;
    default:
      return textArea(n.ownChars) + (n.image ? 30 : 0);
  }
}

export function generateCity(doc: NormalizedDocument): CityModel {
  const nodes = doc.nodes;
  const N = nodes.length;
  const palette = buildPalette(doc.colors, doc.document.themeColor);
  const seed = Math.floor(hash(N, doc.source.finalUrl.length) * 1e6);

  const imageNodes = nodes
    .filter((n) => n.image && (n.image.proxy || n.image.src))
    .sort((a, b) => b.image!.priority - a.image!.priority)
    .slice(0, MAX_BILLBOARD_IMAGES);
  const slotOf = new Map<number, number>();
  const images: BillboardImage[] = imageNodes.map((n, slot) => {
    slotOf.set(n.id, slot);
    return { node: n.id, slot, src: n.image!.proxy ?? n.image!.src };
  });

  const req = new Float64Array(N);
  for (let i = N - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.children.length) {
      req[i] = leafArea(n, slotOf.has(n.id) && slotOf.get(n.id)! < 6);
      continue;
    }
    let s = 0;
    for (const c of n.children) s += req[c];
    let k = n.children.length;
    if (n.flags & NodeFlag.OWN_CONTENT) {
      s += textArea(n.ownChars) + (n.image ? 30 : 0);
      k++;
    }
    if (n.role === "form") {
      s += 14;
      k++;
    }
    s += (k - 1) * gapFor(n.level + 1) * Math.sqrt(s) * 0.9;
    s = (Math.sqrt(s) + 2 * padFor(n.level)) ** 2;
    req[i] = s;
  }

  const area = req[0] || 100;
  const W = Math.sqrt(area / 1.2);
  const D = area / W;
  const span = Math.max(W, D);
  const front = D / 2;

  const structures: Structure[] = [];
  const anchor: Array<[number, number, number]> = new Array(N);
  const top = new Float64Array(N);
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
  const district = new Int32Array(N).fill(-1);
  const stockOfKind = new Map<string, number>();
  for (const d of districtRoots) {
    const kind = `${nodes[d].tag}${/\.[^.#\s]+/.exec(nodes[d].selector)?.[0] ?? ""}`;
    if (!stockOfKind.has(kind)) stockOfKind.set(kind, stockOfKind.size);
    const stock = stockOfKind.get(kind)!;
    for (let i = d; i < nodes[d].end; i++) district[i] = stock;
  }
  const tintOf = nodes.map((n) => elementTint(n.tint));
  const linkSiblings = new Int32Array(N);
  for (const n of nodes) {
    let links = 0;
    for (const c of n.children) if (nodes[c].role === "link") links++;
    for (const c of n.children) linkSiblings[c] = links;
  }

  const delayAt = (z: number, level: number, i: number) =>
    0.1 + ((front - z) / Math.max(D, 1)) * 1.9 + level * 0.07 + hash(i, 3) * 0.18;

  const districtOf = (i: number): number | null => (district[i] < 0 ? null : district[i]);
  const buildingColor = (i: number, variance = 0.035, node = i): RGB => {
    const tinted = buildingTint(palette, districtOf(node));
    const v = 1 - hash(i, 7) * variance;
    return [tinted[0] * v, tinted[1] * v, tinted[2] * v];
  };

  const push = (s: Omit<Structure, "glow" | "slot" | "facade"> & Partial<Pick<Structure, "glow" | "slot" | "facade">>) => {
    structures.push({ glow: 0, slot: -1, facade: Facade.NONE, ...s });
  };

  const placeLeaf = (i: number, kind: ItemKind, r: Rect, baseY: number) => {
    const n = nodes[i];
    const cx = r.x + r.w / 2;
    const cz = r.z + r.d / 2;
    const setback = Math.min(0.45, 0.13 * Math.min(r.w, r.d));
    const fw = Math.max(0.5, r.w - 2 * setback);
    const fd = Math.max(0.5, r.d - 2 * setback);
    const delay = delayAt(cz, n.level + 1, i);
    const level = n.level;

    if (kind === "tank") {
      const dia = Math.min(fw, fd) * 0.82;
      const h = 2.2 + Math.min(4, dia * 0.5);
      push({ mesh: "cylinder", node: i, x: cx, y: baseY, z: cz, w: dia, h, d: dia, rotY: 0, color: palette.accent2, delay });
      push({ mesh: "glow", node: i, x: cx, y: baseY + h, z: cz, w: dia * 0.45, h: 0.25, d: dia * 0.45, rotY: 0, color: palette.glow, glow: 1.2, delay: delay + 0.2 });
      anchor[i] ??= [cx, baseY + h, cz];
      return;
    }

    const role = kind === "own" ? (n.image ? "image" : "text") : n.role;
    const isImage = (role === "image" || (role === "media" && n.image)) && n.image;

    if (isImage) {
      const big = (slotOf.get(i) ?? 99) < 3;
      const along = fw >= fd;
      const width = Math.min(big ? 26 : 16, Math.max(2.6, (along ? fw : fd) * 0.95));
      const height = width / 1.6;
      const lift = 1.4 + width * 0.16 + Math.min(level, 10) * 0.12;
      const rotY = along ? 0 : cx > 0 ? -Math.PI / 2 : Math.PI / 2;
      const ax = along ? 1 : 0;
      const az = along ? 0 : 1;
      const poleOff = width * 0.32;
      for (const sgn of [-1, 1]) {
        push({ mesh: "solid", node: i, x: cx + sgn * poleOff * ax, y: baseY, z: cz + sgn * poleOff * az, w: 0.28, h: lift + height * 0.5, d: 0.28, rotY: 0, color: palette.structure, delay });
      }
      push({ mesh: "solid", node: i, x: cx, y: baseY + lift - 0.18, z: cz, w: width + 0.36, h: height + 0.36, d: 0.3, rotY, color: palette.structure, delay: delay + 0.05 });
      const off = 0.17;
      for (const side of [0, Math.PI]) {
        const r = rotY + side;
        push({ mesh: "billboard", node: i, x: cx + Math.sin(r) * off, y: baseY + lift, z: cz + Math.cos(r) * off, w: width, h: height, d: 1, rotY: r, color: mix(palette.accent2, palette.building, 0.35), delay: delay + 0.1, slot: slotOf.get(i) ?? -1 });
      }
      anchor[i] ??= [cx, baseY + lift + height, cz];
      return;
    }

    switch (role) {
      case "heading": {
        const lvl = n.heading ?? 3;
        const scale = [0, 1, 0.72, 0.58, 0.5, 0.45, 0.45][lvl];
        const side = Math.max(1.2, Math.min(fw, fd) * scale);
        const h1 = 20 + span * 0.11;
        const h = lvl === 1 ? h1 : lvl === 2 ? 12 + span * 0.045 : lvl === 3 ? 7.5 + span * 0.018 : 5 + Math.log2(1 + n.ownChars / 20);
        const color = lvl === 1 ? palette.accent : lvl === 2 ? mix(palette.accent, palette.building, 0.35) : mix(palette.accent, palette.building, 0.7);
        if (lvl === 1) {
          push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: side * 1.25, h: 1.6, d: side * 1.25, rotY: 0, color: buildingColor(i), delay, facade: Facade.GRID });
          push({ mesh: "solid", node: i, x: cx, y: baseY + 1.6, z: cz, w: side, h: h * 0.62, d: side, rotY: 0, color, delay: delay + 0.1, facade: Facade.TOWER, glow: 0.4 });
          push({ mesh: "spire", node: i, x: cx, y: baseY + 1.6 + h * 0.62, z: cz, w: side * 0.92, h: h * 0.38, d: side * 0.92, rotY: Math.PI / 4, color, delay: delay + 0.25 });
          anchor[i] ??= [cx, baseY + 1.6 + h, cz];
        } else if (lvl === 2) {
          push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: side, h: h * 0.74, d: side, rotY: 0, color, delay, facade: Facade.TOWER, glow: 0.25 });
          push({ mesh: "solid", node: i, x: cx, y: baseY + h * 0.74, z: cz, w: side * 0.66, h: h * 0.26, d: side * 0.66, rotY: 0, color, delay: delay + 0.15, facade: Facade.TOWER });
          anchor[i] ??= [cx, baseY + h, cz];
        } else {
          push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: side, h, d: side, rotY: 0, color, delay, facade: Facade.TOWER });
          anchor[i] ??= [cx, baseY + h, cz];
        }
        return;
      }
      case "button": {
        const s = Math.max(0.7, Math.min(fw, fd, 2.2) * 0.75);
        const h = 1.1 + Math.min(1.6, Math.log2(1 + n.ownChars / 6) * 0.35);
        push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: s * 1.3, h: 0.3, d: s * 1.3, rotY: 0, color: palette.structure, delay });
        push({ mesh: "glow", node: i, x: cx, y: baseY + 0.3, z: cz, w: s, h, d: s, rotY: 0, color: palette.glow, glow: 1.6, delay: delay + 0.1 });
        anchor[i] ??= [cx, baseY + 0.3 + h, cz];
        return;
      }
      case "control": {
        const s = Math.max(0.5, Math.min(fw, fd, 1.4) * 0.6);
        push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: s, h: 1.7, d: s, rotY: 0, color: palette.accent2, delay, facade: Facade.GRID });
        push({ mesh: "glow", node: i, x: cx, y: baseY + 1.7, z: cz, w: s * 0.9, h: 0.16, d: s * 0.9, rotY: 0, color: palette.accent2, glow: 0.9, delay: delay + 0.1 });
        anchor[i] ??= [cx, baseY + 1.9, cz];
        return;
      }
      case "link": {
        if (n.ownChars > 40) break;
        const laneColor = n.link?.kind === "external" ? palette.accent2 : palette.glow;
        if (linkSiblings[i] > 2) {
          const along = fw >= fd;
          push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: fw, h: 0.16, d: fd, rotY: 0, color: palette.paving, delay, facade: Facade.NONE });
          push({ mesh: "glow", node: i, x: cx, y: baseY + 0.16, z: cz, w: along ? fw * 0.86 : 0.14, h: 0.04, d: along ? 0.14 : fd * 0.86, rotY: 0, color: laneColor, glow: 0.8, delay: delay + 0.1 });
          anchor[i] ??= [cx, baseY + 0.2, cz];
          return;
        }
        const h = 1.9 + hash(i, 11) * 0.6;
        push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: 0.16, h, d: 0.16, rotY: 0, color: palette.structure, delay });
        push({ mesh: "glow", node: i, x: cx, y: baseY + h, z: cz, w: 0.42, h: 0.3, d: 0.42, rotY: 0, color: laneColor, glow: 1.1, delay: delay + 0.1 });
        anchor[i] ??= [cx, baseY + h + 0.3, cz];
        return;
      }
      case "media": {
        const width = Math.min(14, Math.max(2.4, Math.max(fw, fd) * 0.9));
        const height = width / 1.7;
        const along = fw >= fd;
        const rotY = along ? 0 : Math.PI / 2;
        push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: along ? width * 0.3 : 0.5, h: 1.2, d: along ? 0.5 : width * 0.3, rotY: 0, color: palette.structure, delay });
        push({ mesh: "glow", node: i, x: cx, y: baseY + 1.2, z: cz, w: width, h: height, d: 0.3, rotY, color: mix(palette.accent2, [0.08, 0.1, 0.14], 0.65), glow: 0.5, delay: delay + 0.1 });
        anchor[i] ??= [cx, baseY + 1.2 + height, cz];
        return;
      }
      case "cluster": {
        const count = Math.min(n.cluster?.count ?? 1, 64);
        const cols = Math.max(1, Math.round(Math.sqrt((count * fw) / fd)));
        const rows = Math.ceil(count / cols);
        const cw = fw / cols;
        const cd = fd / rows;
        for (let k = 0; k < count; k++) {
          const c = k % cols;
          const rr = Math.floor(k / cols);
          const ux = r.x + setback + cw * (c + 0.5);
          const uz = r.z + r.d - setback - cd * (rr + 0.5);
          const h = 0.9 + hash(i * 97 + k, 5) * 1.8;
          push({ mesh: "solid", node: i, x: ux, y: baseY, z: uz, w: cw * 0.72, h, d: cd * 0.72, rotY: 0, color: buildingColor(i * 13 + k, 0.08, i), delay: delay + k * 0.012, facade: Facade.GRID });
        }
        anchor[i] ??= [cx, baseY + 2.4, cz];
        return;
      }
    }

    const chars = n.ownChars;
    const isItem = role === "item";
    let h = (1.1 + 2.5 * Math.log2(1 + chars / 50)) * (isItem ? 0.8 : 1);
    if (n.role === "form") h = Math.max(h, 2.5);
    h = Math.min(h, 18) * (0.92 + hash(i, 13) * 0.16);
    const own = kind === "node" ? tintOf[i] : null;
    const color = own ? mix(buildingColor(i), own, 0.7) : n.role === "form" ? palette.accent2 : buildingColor(i);
    push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: fw, h, d: fd, rotY: 0, color, delay, facade: chars > 0 ? Facade.TEXT : Facade.GRID, glow: chars > 400 ? 0.35 : 0.15 });
    if (n.links > 2 && n.role !== "link") {
      const lights = Math.min(4, Math.floor(n.links / 3));
      for (let k = 0; k < lights; k++) {
        const t = (k + 0.5) / lights;
        const along = fw >= fd;
        push({ mesh: "glow", node: i, x: along ? r.x + setback + fw * t : cx, y: baseY + h, z: along ? cz : r.z + setback + fd * t, w: 0.3, h: 0.25, d: 0.3, rotY: 0, color: palette.glow, glow: 1, delay: delay + 0.2 });
      }
    }
    anchor[i] ??= [cx, baseY + h, cz];
  };

  const layoutContainer = (i: number, cell: Rect, parentTop: number) => {
    const n = nodes[i];
    const level = n.level;
    let baseY = parentTop;
    let r = cell;

    let lift = 0;
    let columns = false;
    if (n.flags & NodeFlag.FIXED) lift = 9;
    else if (n.flags & NodeFlag.STICKY) {
      lift = 6;
      columns = true;
    } else if (n.role === "header" && level === 1) {
      lift = 4.5;
      columns = true;
    }
    if (level === 0) lift = 0;
    if (n.role === "header" && level === 1 && !(n.flags & NodeFlag.FIXED)) {
      r = { x: r.x + r.w * 0.14, z: r.z, w: r.w * 0.72, d: r.d };
    }
    const cx = r.x + r.w / 2;
    const cz = r.z + r.d / 2;
    const delay = delayAt(cz, level, i);

    if (lift > 0) {
      baseY += lift;
      if (columns) {
        const stepX = Math.max(1, Math.ceil(r.w / 9));
        const stepZ = Math.max(1, Math.ceil(r.d / 9));
        for (let a = 0; a <= stepX; a++) {
          for (let b = 0; b <= stepZ; b++) {
            if (a !== 0 && a !== stepX && b !== 0 && b !== stepZ) continue;
            const px = r.x + 0.5 + ((r.w - 1) * a) / stepX;
            const pz = r.z + 0.5 + ((r.d - 1) * b) / stepZ;
            push({ mesh: "solid", node: i, x: px, y: parentTop, z: pz, w: 0.4, h: lift, d: 0.4, rotY: 0, color: palette.structure, delay: delay - 0.05 });
          }
        }
      }
    }

    let thick: number;
    if (level === 0) {
      push({ mesh: "solid", node: i, x: cx, y: -0.9, z: cz, w: r.w + 26, h: 0.9, d: r.d + 26, rotY: 0, color: mix(palette.structure, palette.base, 0.55), delay: 0 });
      push({ mesh: "solid", node: i, x: cx, y: 0, z: cz, w: r.w + 8, h: 1.2, d: r.d + 8, rotY: 0, color: palette.base, delay: 0, facade: Facade.PLINTH });
      thick = 1.2;
    } else {
      thick = (level === 1 ? 0.8 : 0.42) + 0.45 * Math.min(n.wrappers, 6);
      const own = tintOf[i];
      const color = own
        ? own
        : n.role === "form"
          ? mix(plinthColor(palette, level, null), palette.accent2, 0.45)
          : plinthColor(palette, level, districtOf(i));
      push({ mesh: "solid", node: i, x: cx, y: baseY, z: cz, w: r.w, h: thick, d: r.d, rotY: 0, color, delay, facade: Facade.PLINTH });
    }
    const topY = baseY + thick;
    top[i] = topY;
    anchor[i] = [cx, topY, cz];

    const pad = Math.min(padFor(level), Math.min(r.w, r.d) * 0.12);
    const inner: Rect = { x: r.x + pad, z: r.z + pad, w: Math.max(0.6, r.w - 2 * pad), d: Math.max(0.6, r.d - 2 * pad) };

    const items: Item[] = [];
    if (n.flags & NodeFlag.OWN_CONTENT) items.push({ kind: "own", node: i, weight: textArea(n.ownChars) + (n.image ? 30 : 0) });
    for (const c of n.children) items.push({ kind: "node", node: c, weight: req[c] });
    if (n.role === "form") items.push({ kind: "tank", node: i, weight: 14 });

    partition(items, inner, gapFor(level + 1), level === 0, (item, cell) => {
      if (item.kind !== "node") placeLeaf(item.node, item.kind, cell, topY);
      else if (nodes[item.node].children.length) layoutContainer(item.node, cell, topY);
      else placeLeaf(item.node, "node", cell, topY);
    });
  };

  layoutContainer(0, { x: -W / 2, z: -D / 2, w: W, d: D }, 0);

  const bounds: Bounds[] = Array.from({ length: N }, () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
  let maxHeight = 0;
  for (const s of structures) {
    const b = bounds[s.node];
    const hw = Math.abs(Math.cos(s.rotY)) * s.w * 0.5 + Math.abs(Math.sin(s.rotY)) * s.d * 0.5;
    const hd = Math.abs(Math.sin(s.rotY)) * s.w * 0.5 + Math.abs(Math.cos(s.rotY)) * s.d * 0.5;
    const ext = [s.x - hw, s.y, s.z - hd, s.x + hw, s.y + s.h, s.z + hd];
    b.min[0] = Math.min(b.min[0], ext[0]);
    b.min[1] = Math.min(b.min[1], ext[1]);
    b.min[2] = Math.min(b.min[2], ext[2]);
    b.max[0] = Math.max(b.max[0], ext[3]);
    b.max[1] = Math.max(b.max[1], ext[4]);
    b.max[2] = Math.max(b.max[2], ext[5]);
    maxHeight = Math.max(maxHeight, s.y + s.h);
  }
  for (let i = N - 1; i >= 1; i--) {
    const b = bounds[i];
    const p = bounds[nodes[i].parent];
    for (let k = 0; k < 3; k++) {
      p.min[k] = Math.min(p.min[k], b.min[k]);
      p.max[k] = Math.max(p.max[k], b.max[k]);
    }
  }
  for (let i = 0; i < N; i++) anchor[i] ??= [(bounds[i].min[0] + bounds[i].max[0]) / 2, bounds[i].max[1], (bounds[i].min[2] + bounds[i].max[2]) / 2];

  const arcs: Arc[] = [];
  for (const n of nodes) {
    if (arcs.length >= 24) break;
    const t = n.link?.target;
    if (t === undefined || !anchor[n.id] || !anchor[t]) continue;
    const a = anchor[n.id];
    const b = anchor[t];
    if (Math.hypot(a[0] - b[0], a[2] - b[2]) < 4) continue;
    arcs.push({ from: a, to: b, node: n.id, target: t });
  }

  let buildDuration = 0;
  for (const s of structures) buildDuration = Math.max(buildDuration, s.delay);
  buildDuration += 1;

  return {
    seed,
    size: { w: W, d: D },
    districts: districtRoots,
    structures,
    arcs,
    images,
    bounds,
    anchor,
    palette,
    maxHeight,
    buildDuration,
    entrance: {
      position: [0, Math.min(16 + span * 0.2, 95), front + 12 + span * 0.26],
      target: [0, 0, front - D * 0.42],
    },
  };
}

function partition(items: Item[], r: Rect, gap: number, bands: boolean, out: (item: Item, r: Rect) => void): void {
  if (!items.length) return;
  if (items.length === 1) {
    out(items[0], r);
    return;
  }
  const total = items.reduce((s, it) => s + it.weight, 0) || 1;
  let acc = 0;
  let idx = 1;
  let best = Infinity;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].weight;
    const diff = Math.abs(acc - total / 2);
    if (diff < best) {
      best = diff;
      idx = i + 1;
    }
  }
  const L = items.slice(0, idx);
  const R = items.slice(idx);
  const f = L.reduce((s, it) => s + it.weight, 0) / total;

  const splitX = (): [Rect, Rect] => {
    const g = Math.min(gap, r.w * 0.2);
    const wl = (r.w - g) * f;
    return [
      { x: r.x, z: r.z, w: wl, d: r.d },
      { x: r.x + wl + g, z: r.z, w: r.w - wl - g, d: r.d },
    ];
  };
  const splitZ = (): [Rect, Rect] => {
    const g = Math.min(gap, r.d * 0.2);
    const dl = (r.d - g) * f;
    return [
      { x: r.x, z: r.z + r.d - dl, w: r.w, d: dl },
      { x: r.x, z: r.z, w: r.w, d: r.d - dl - g },
    ];
  };
  const aspect = (q: Rect) => Math.max(q.w / Math.max(q.d, 1e-3), q.d / Math.max(q.w, 1e-3));
  const penalty = ([a, b]: [Rect, Rect]) =>
    (L.length === 1 ? aspect(a) : Math.sqrt(aspect(a))) + (R.length === 1 ? aspect(b) : Math.sqrt(aspect(b)));

  let halves: [Rect, Rect];
  if (bands) halves = splitZ();
  else {
    const hx = splitX();
    const hz = splitZ();
    const px = penalty(hx);
    const pz = penalty(hz);
    halves = Math.abs(px - pz) < 0.05 ? (r.w >= r.d ? hx : hz) : px < pz ? hx : hz;
  }
  partition(L, halves[0], gap, bands, out);
  partition(R, halves[1], gap, bands, out);
}
