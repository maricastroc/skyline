// FROZEN: detail kit after the semantic allocation pass (baseline of the semantic hygiene pass). Do not edit.
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import { Surf } from "../types";
import type { Kit } from "./core";

export const SIDEWALK_H = 0.1;
const white: RGB = [0.97, 0.96, 0.92];
const metal: RGB = [0.2, 0.21, 0.24];

export interface Grid {
  lines: number[];
  road: number;
  side: number;
  block: number;
  ext: number;
}

export function streetSurfaces(kit: Kit, g: Grid) {
  const p = kit.palette;
  const R = g.road;
  const L = g.lines;
  const lo = L[0] - R / 2 - g.ext;
  const hi = L[L.length - 1] + R / 2 + g.ext;
  const cuts = [lo, ...L.flatMap((c) => [c - R / 2, c + R / 2]), hi];
  for (const c of L) {
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const a = cuts[i];
      const b = cuts[i + 1];
      kit.span(a, b, 0, 0.04, c - R / 2, c + R / 2, p.road, Surf.ROAD);
      kit.span(c - R / 2, c + R / 2, 0, 0.04, a, b, p.road, Surf.ROAD);
    }
    for (const c2 of L) kit.span(c - R / 2, c + R / 2, 0, 0.04, c2 - R / 2, c2 + R / 2, mix(p.road, white, 0.03));
  }
  const zw = 0.7;
  for (const cx of L)
    for (const cz of L)
      for (const s of [-1, 1]) {
        const ex = cx + s * (R / 2 + zw / 2 + 0.05);
        const ez = cz + s * (R / 2 + zw / 2 + 0.05);
        kit.box(ex, 0, cz, zw, 0.05, R - 0.1, p.road, Surf.ZEBRA);
        kit.box(cx, 0, ez, R - 0.1, 0.05, zw, p.road, Surf.ZEBRA);
        kit.span(cx + s * (R / 2 + zw + 0.12), cx + s * (R / 2 + zw + 0.18), 0, 0.05, cz + (s > 0 ? -R / 2 + 0.06 : 0), cz + (s > 0 ? 0 : R / 2 - 0.06), p.roadMark);
        kit.span(cx + (s > 0 ? 0 : -R / 2 + 0.06), cx + (s > 0 ? R / 2 - 0.06 : 0), 0, 0.05, cz + s * (R / 2 + zw + 0.12), cz + s * (R / 2 + zw + 0.18), p.roadMark);
      }
  const B = g.block;
  const S = g.side;
  const curb = mix(p.stone, white, 0.35);
  for (let i = 0; i < L.length - 1; i++)
    for (let j = 0; j < L.length - 1; j++) {
      const bx = (L[i] + L[i + 1]) / 2;
      const bz = (L[j] + L[j + 1]) / 2;
      const o = B / 2 + S;
      kit.span(bx - o, bx + o, 0, SIDEWALK_H, bz + B / 2, bz + o, p.sidewalk, Surf.SLABS);
      kit.span(bx - o, bx + o, 0, SIDEWALK_H, bz - o, bz - B / 2, p.sidewalk, Surf.SLABS);
      kit.span(bx + B / 2, bx + o, 0, SIDEWALK_H, bz - B / 2, bz + B / 2, p.sidewalk, Surf.SLABS);
      kit.span(bx - o, bx - B / 2, 0, SIDEWALK_H, bz - B / 2, bz + B / 2, p.sidewalk, Surf.SLABS);
      const c = 0.07;
      kit.span(bx - o, bx + o, 0, SIDEWALK_H + 0.01, bz + o - c, bz + o, curb);
      kit.span(bx - o, bx + o, 0, SIDEWALK_H + 0.01, bz - o, bz - o + c, curb);
      kit.span(bx + o - c, bx + o, 0, SIDEWALK_H + 0.01, bz - o, bz + o, curb);
      kit.span(bx - o, bx - o + c, 0, SIDEWALK_H + 0.01, bz - o, bz + o, curb);
    }
}

export function streetLamp(kit: Kit, x: number, z: number) {
  kit.box(x, 0, z, 0.06, 1.25, 0.06, metal);
  kit.box(x, 0, z, 0.12, 0.08, 0.12, metal);
  kit.span(x - 0.02, x + 0.02, 1.2, 1.24, z, z + 0.32, metal);
  kit.box(x, 1.12, z + 0.32, 0.14, 0.1, 0.1, metal);
  kit.glow(x, 1.09, z + 0.32, 0.1, 0.04, 0.07, kit.palette.lamp, kit.night ? 2.2 : 0.25);
}

export function streetTree(kit: Kit, x: number, z: number, seed: number) {
  kit.box(x, 0, z, 0.46, 0.012, 0.46, mix(kit.palette.soilDark, metal, 0.4));
  tree(kit, x, z, seed, 1);
}

export function tree(kit: Kit, x: number, z: number, seed: number, s: number, y = 0) {
  const [l0, l1] = kit.palette.leaves;
  const dark = mix(l1, [0.05, 0.12, 0.1], 0.25);
  kit.box(x, y, z, 0.09 * s, 0.55 * s, 0.09 * s, kit.palette.trunk);
  if (kit.rand(seed, 1) < 0.72) {
    kit.cyl(x, y + 0.42 * s, z, 0.78 * s, 0.34 * s, 0.78 * s, dark);
    kit.cyl(x + 0.05 * s, y + 0.62 * s, z - 0.04 * s, 0.62 * s, 0.3 * s, 0.62 * s, l1);
    kit.cyl(x + 0.08 * s, y + 0.86 * s, z - 0.06 * s, 0.36 * s, 0.2 * s, 0.36 * s, l0);
  } else {
    for (let i = 0; i < 3; i++)
      kit.part({ mesh: "pyramid", node: kit.node, x, y: y + (0.32 + i * 0.26) * s, z, w: (0.72 - i * 0.18) * s, h: 0.42 * s, d: (0.72 - i * 0.18) * s, color: i === 2 ? l0 : i === 1 ? l1 : dark, rotY: Math.PI / 4 });
  }
}

export function hydrant(kit: Kit, x: number, z: number) {
  const red: RGB = [0.82, 0.18, 0.16];
  kit.cyl(x, 0, z, 0.1, 0.16, 0.1, red);
  kit.cyl(x, 0.16, z, 0.07, 0.04, 0.07, mix(red, white, 0.3));
  kit.box(x, 0.08, z, 0.16, 0.035, 0.035, red);
}

export function bin(kit: Kit, x: number, z: number) {
  const c: RGB = [0.18, 0.36, 0.28];
  kit.cyl(x, 0, z, 0.15, 0.22, 0.15, c);
  kit.cyl(x, 0.22, z, 0.17, 0.025, 0.17, mix(c, white, 0.2));
}

export function bench(kit: Kit, x: number, z: number, rot = 0) {
  const wood: RGB = [0.58, 0.4, 0.26];
  kit.frame(x, z, rot, () => {
    kit.box(0, 0, 0, 0.6, 0.11, 0.18, metal);
    kit.box(0, 0.11, 0, 0.62, 0.03, 0.2, wood);
    kit.box(0, 0.14, -0.08, 0.62, 0.14, 0.03, wood);
  });
}

export function meter(kit: Kit, x: number, z: number) {
  kit.box(x, 0, z, 0.03, 0.3, 0.03, metal);
  kit.box(x, 0.3, z, 0.07, 0.09, 0.05, [0.55, 0.57, 0.6]);
}

export function mailbox(kit: Kit, x: number, z: number) {
  const blue: RGB = [0.2, 0.32, 0.62];
  kit.box(x, 0, z, 0.2, 0.28, 0.18, blue);
  kit.cyl(x, 0.24, z, 0.2, 0.08, 0.18, blue);
}

export function newsBoxes(kit: Kit, x: number, z: number) {
  const cs: RGB[] = [
    [0.86, 0.25, 0.2],
    [0.95, 0.8, 0.25],
    [0.25, 0.45, 0.8],
  ];
  cs.forEach((c, i) => kit.box(x + (i - 1) * 0.17, 0, z, 0.15, 0.24, 0.14, c));
}

export function bollards(kit: Kit, x: number, z: number, n = 3) {
  for (let i = 0; i < n; i++) kit.cyl(x + (i - (n - 1) / 2) * 0.3, 0, z, 0.07, 0.16, 0.07, mix(metal, white, 0.2));
}

export function trafficSignal(kit: Kit, x: number, z: number, rot: number, go: boolean, street?: string) {
  kit.frame(x, z, rot, () => {
    kit.box(0, 0, 0, 0.07, 1.45, 0.07, metal);
    kit.span(-0.025, 0.025, 1.4, 1.45, 0, 1.15, metal);
    kit.box(0, 1.04, 1.1, 0.13, 0.36, 0.11, [0.13, 0.13, 0.15]);
    const lights: RGB[] = [
      [1, 0.2, 0.15],
      [1, 0.75, 0.1],
      [0.2, 1, 0.45],
    ];
    lights.forEach((c, i) => {
      const on = go ? i === 2 : i === 0;
      kit.glow(0, 1.32 - i * 0.11, 1.16, 0.08, 0.07, 0.03, on ? c : mix(c, [0.1, 0.1, 0.1], 0.75), on ? 2.2 : 0.2);
    });
    kit.box(0.07, 0.62, 0, 0.1, 0.12, 0.08, [0.13, 0.13, 0.15]);
    kit.glow(0.12, 0.65, 0, 0.02, 0.07, 0.06, go ? [1, 0.55, 0.15] : [0.95, 0.95, 0.9], 1.6);
    if (street) {
      kit.box(0, 1.5, 0, 0.62, 0.1, 0.03, [0.1, 0.45, 0.25]);
      kit.sign(street, 0, 1.51, 0.02, { bg: [0.1, 0.45, 0.25], texel: 0.011, maxW: 0.58 });
    }
  });
}

export function busShelter(kit: Kit, x: number, z: number, accent: RGB, route: string) {
  const glass = mix(kit.palette.glass, white, 0.35);
  kit.frame(x, z, 0, () => {
    for (const sx of [-0.75, 0.75]) kit.box(sx, 0, -0.22, 0.05, 0.78, 0.05, metal);
    kit.span(-0.85, 0.85, 0.78, 0.83, -0.32, 0.22, metal);
    kit.span(-0.75, 0.75, 0.08, 0.72, -0.26, -0.24, glass);
    kit.span(0.7, 0.78, 0.0, 0.72, -0.24, 0.12, accent, Surf.PLAIN);
    kit.glow(0.79, 0.15, -0.05, 0.01, 0.5, 0.3, mix(accent, white, 0.4), kit.night ? 1.4 : 0.3);
    kit.box(-0.2, 0, -0.12, 0.8, 0.12, 0.16, metal);
    kit.box(-0.2, 0.12, -0.12, 0.8, 0.03, 0.18, [0.58, 0.4, 0.26]);
    kit.box(-1.05, 0, 0.12, 0.04, 1.1, 0.04, metal);
    kit.sign(route, -1.05, 0.95, 0.15, { bg: [0.15, 0.35, 0.75], texel: 0.025 });
  });
}
