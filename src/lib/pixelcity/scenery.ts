import { mix } from "../city/palette";
import type { CityGrammar, ArchStyle } from "./grammar";
import { h01 } from "./hash";
import type { GamePalette } from "./palette";
import { Surf, type Part, type RoadSeg } from "./types";

export type PushFn = (p: Omit<Part, "rotY" | "surf" | "lit" | "delay"> & Partial<Pick<Part, "rotY" | "surf" | "lit" | "delay">>) => Part;

export function plantTree(push: PushFn, palette: GamePalette, style: ArchStyle, x: number, z: number, y: number, delay: number, scale = 1) {
  const k = Math.round((x * 31 + z * 17) * 10);
  push({ mesh: "box", node: -1, x, y, z, w: 0.14 * scale, h: 0.45 * scale, d: 0.14 * scale, color: palette.trunk, delay });
  const leaf = palette.leaves[h01(k, 1) < 0.5 ? 0 : 1];
  if (style === "retro" && h01(k, 2) < 0.5) {
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
}

export interface WorldInput {
  palette: GamePalette;
  grammar: CityGrammar;
  W: number;
  D: number;
  front: number;
  water: number;
  roads: RoadSeg[];
  groundSurf?: number;
}

export interface World {
  parts: Part[];
  roads: RoadSeg[];
  extent: number;
}

const FAR = 1500;
const CELL = 5;

export function addWorld({ palette, grammar, W, D, front, water, roads, groundSurf = Surf.GRASS }: WorldInput): World {
  const parts: Part[] = [];
  const push: PushFn = (p) => {
    const part: Part = { rotY: 0, surf: Surf.PLAIN, lit: 0, delay: 0, ...p };
    parts.push(part);
    return part;
  };
  const night = palette.time === "night";
  const back = front - D;
  const R = Math.max(W, D) / 2 + 60;
  const out: RoadSeg[] = [];
  type Rect = { x0: number; z0: number; x1: number; z1: number };
  const keepOut: Rect[] = [{ x0: -W / 2 - 1, z0: back - 8, x1: W / 2 + 1, z1: front + 1 }];

  push({ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: FAR * 2, h: 0.3, d: FAR * 2, color: palette.grass[0], surf: groundSurf });

  const RW = 7;
  push({ mesh: "box", node: -1, x: 0, y: -0.05, z: back - RW / 2, w: FAR * 2, h: 0.06, d: RW, color: palette.water, surf: Surf.WATER });
  for (const s of [-1, 1]) push({ mesh: "box", node: -1, x: s * (W / 2 + FAR / 2), y: -0.05, z: back + water / 2, w: FAR, h: 0.06, d: water, color: palette.water, surf: Surf.WATER });
  keepOut.push({ x0: -FAR, z0: back - RW - 0.6, x1: FAR, z1: back + water + 0.6 });

  const L = R + 40;
  const avenue = roads.find((r) => r.axis === "z" && r.avenue);
  if (avenue) out.push({ x: avenue.x, z: front, w: avenue.w, d: L - front, axis: "z", avenue: false, rural: true });
  const cross = roads.filter((r) => r.axis === "x" && r.w > 2).sort((a, b) => b.z - a.z)[0];
  if (cross) {
    out.push({ x: -L, z: cross.z, w: cross.x + L, d: cross.d, axis: "x", avenue: false, rural: true });
    out.push({ x: cross.x + cross.w, z: cross.z, w: L - (cross.x + cross.w), d: cross.d, axis: "x", avenue: false, rural: true });
  }
  const steel = palette.walls.tech[1];
  for (const r of out) {
    push({ mesh: "box", node: -1, x: r.x + r.w / 2, y: 0, z: r.z + r.d / 2, w: r.w, h: 0.04, d: r.d, color: palette.road, surf: Surf.ROAD });
    keepOut.push({ x0: r.x - 0.6, z0: r.z - 0.6, x1: r.x + r.w + 0.6, z1: r.z + r.d + 0.6 });
    const len = r.axis === "x" ? r.w : r.d;
    for (let t = 2; t < len; t += 5) {
      const x = r.axis === "x" ? r.x + t : r.x - 0.15;
      const z = r.axis === "x" ? r.z - 0.15 : r.z + t;
      if (Math.max(Math.abs(x), Math.abs(z)) > R) continue;
      push({ mesh: "box", node: -1, x, y: 0, z, w: 0.06, h: 0.9, d: 0.06, color: steel });
      push({ mesh: "glow", node: -1, x, y: 0.9, z, w: 0.16, h: 0.1, d: 0.16, color: palette.lamp, lit: night ? 1.6 : palette.time === "golden" ? 0.9 : 0.15 });
    }
  }

  const blocked = (a: Rect) => keepOut.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0);
  const tree = (x: number, z: number, scale: number) => plantTree(push, palette, grammar.style, x, z, 0, 0, scale);

  const pWood = 0.14 + grammar.trees * 0.3;
  const pField = 0.16;
  const crop = mix(palette.grass[1], palette.leaves[1], 0.35);
  const rows = mix(palette.grass[1], palette.leaves[0], 0.45);
  const tilled = mix(palette.soil, palette.grass[0], 0.45);
  const n = Math.ceil(R / CELL);
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const cell: Rect = { x0: i * CELL + 0.5, z0: j * CELL + 0.5, x1: (i + 1) * CELL - 0.5, z1: (j + 1) * CELL - 0.5 };
      if (blocked(cell)) continue;
      const w = cell.x1 - cell.x0;
      const d = cell.z1 - cell.z0;
      const h = h01(i * 7919 + 13, j * 104729 + 7);
      if (h < pWood) {
        const count = Math.floor(w * d * (0.12 + grammar.trees * 0.22));
        for (let t = 0; t < count; t++) tree(cell.x0 + h01(i * 31 + t, j * 17 + 1) * w, cell.z0 + h01(i * 13 + t, j * 29 + 2) * d, 0.9 + h01(i + t, j + 3) * 0.45);
      } else if (h < pWood + pField) {
        const plowed = h01(i, j + 5) < 0.3;
        const cx = (cell.x0 + cell.x1) / 2;
        const cz = (cell.z0 + cell.z1) / 2;
        push({ mesh: "box", node: -1, x: cx, y: 0, z: cz, w, h: 0.03, d, color: plowed ? tilled : crop, surf: plowed ? Surf.SOIL : Surf.GRASS });
        const alongX = h01(i, j + 6) < 0.5;
        for (let k = 0; k < 4; k++) {
          const o = -0.375 + k * 0.25;
          push({ mesh: "box", node: -1, x: alongX ? cx : cx + o * w, y: 0.03, z: alongX ? cz + o * d : cz, w: alongX ? w - 0.3 : 0.28, h: 0.08, d: alongX ? 0.28 : d - 0.3, color: rows });
        }
      } else {
        const loose = h01(i, j + 8) < 0.5 ? 1 + Math.floor(h01(i, j + 12) * 2) : 0;
        for (let t = 0; t < loose; t++) tree(cell.x0 + h01(i + t, j + 9) * w, cell.z0 + h01(i + t, j + 10) * d, 1.05);
      }
      if (h01(i, j + 11) < 0.22) push({ mesh: "box", node: -1, x: (cell.x0 + cell.x1) / 2, y: 0, z: cell.z1 + 0.25, w, h: 0.3, d: 0.3, color: palette.leaves[0] });
    }
  }
  return { parts, roads: out, extent: R };
}
