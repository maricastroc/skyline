// FROZEN: detail kit after the semantic hygiene pass (baseline of the surface grammar pass). Do not edit.
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import { Surf } from "../types";
import type { Kit } from "./core";

export type RoofFamily = "flat" | "terrace" | "gable" | "mansard" | "sawtooth" | "dome" | "spire" | "crown" | "none";

export interface Vol {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  wall: RGB;
  surf: number;
  variant?: number;
  lit?: number;
  roof: RoofFamily;
  roofColor: RGB;
  ridge?: "x" | "z";
  cornice?: "heavy" | "light" | "none";
}

const white: RGB = [0.97, 0.96, 0.92];
const ink: RGB = [0.12, 0.12, 0.15];
export const trimOf = (wall: RGB) => mix(wall, white, 0.55);
export const darkOf = (c: RGB, k = 0.55) => mix(c, ink, k);

export const rhythm = (o: { brick?: boolean; bay?: number; tall?: boolean }) => (o.brick ? 1 : 0) + 2 * Math.max(0, Math.min(3, o.bay ?? 0)) + (o.tall ? 8 : 0);

export interface VolTop {
  deck: number | null;
  top: number;
}

export function volume(kit: Kit, v: Vol): VolTop {
  const w = v.x1 - v.x0;
  const d = v.z1 - v.z0;
  const cx = (v.x0 + v.x1) / 2;
  const cz = (v.z0 + v.z1) / 2;
  kit.span(v.x0, v.x1, v.y0, v.y1, v.z0, v.z1, v.wall, v.surf, { variant: v.variant ?? 0, lit: v.lit ?? 0 });
  const trim = trimOf(v.wall);
  const roof = v.roofColor;
  switch (v.roof) {
    case "none":
      return { deck: v.y1, top: v.y1 };
    case "flat":
    case "terrace": {
      const deck = mix(roof, [0.58, 0.58, 0.61], 0.78);
      const o = v.cornice === "heavy" ? 0.09 : v.cornice === "none" ? 0 : 0.04;
      let y = v.y1;
      if (v.cornice !== "none") {
        kit.span(v.x0 - o, v.x1 + o, y, y + 0.1, v.z0 - o, v.z1 + o, trim);
        y += 0.1;
      }
      const t = 0.07;
      const ph = v.roof === "terrace" ? 0.05 : 0.15;
      kit.span(v.x0, v.x1, y, y + ph, v.z1 - t, v.z1, v.wall);
      kit.span(v.x0, v.x1, y, y + ph, v.z0, v.z0 + t, v.wall);
      kit.span(v.x0, v.x0 + t, y, y + ph, v.z0, v.z1, v.wall);
      kit.span(v.x1 - t, v.x1, y, y + ph, v.z0, v.z1, v.wall);
      if (v.roof === "terrace") kit.span(v.x0 + 0.02, v.x1 - 0.02, y + ph, y + ph + 0.18, v.z1 - 0.04, v.z1 - 0.02, [0.22, 0.22, 0.25], Surf.RAIL);
      kit.span(v.x0 + t, v.x1 - t, y, y + 0.02, v.z0 + t, v.z1 - t, deck, Surf.ROOF);
      return { deck: y + 0.02, top: y + ph };
    }
    case "gable": {
      const alongX = v.ridge ? v.ridge === "x" : w >= d;
      const span = alongX ? d : w;
      const len = alongX ? w : d;
      const h = Math.min(1.1, span * 0.42);
      const o = 0.1;
      kit.part({ mesh: "prism", node: kit.node, x: cx, y: v.y1, z: cz, w: len, h, d: span, color: v.wall, rotY: alongX ? 0 : Math.PI / 2 });
      const a = Math.atan2(h, span / 2);
      const L = Math.hypot(span / 2 + o, h + o * Math.tan(a));
      for (const s of [-1, 1]) {
        const mid = (s * (span / 2 + o)) / 2;
        const y = v.y1 + h / 2 - (o * Math.tan(a)) / 2;
        if (alongX) kit.box(cx, y, cz + mid, len + 2 * o, 0.05, L, roof, Surf.ROOF, { rotX: s * a });
        else kit.box(cx + mid, y, cz, L, 0.05, len + 2 * o, roof, Surf.ROOF, { rotZ: -s * a });
      }
      kit.box(cx, v.y1 + h - 0.02, cz, alongX ? len + 2 * o : 0.08, 0.05, alongX ? 0.08 : len + 2 * o, darkOf(roof, 0.25));
      return { deck: null, top: v.y1 + h };
    }
    case "mansard": {
      const hm = 0.5;
      const i = 0.24;
      const a = Math.atan2(hm, i);
      const Ls = Math.hypot(hm, i);
      kit.span(v.x0 - 0.05, v.x1 + 0.05, v.y1, v.y1 + 0.07, v.z0 - 0.05, v.z1 + 0.05, trim);
      const y = v.y1 + 0.07;
      kit.box(cx, y + hm / 2 - 0.02, v.z1 - i / 2, w - 0.02, 0.05, Ls, roof, Surf.ROOF, { rotX: a });
      kit.box(cx, y + hm / 2 - 0.02, v.z0 + i / 2, w - 0.02, 0.05, Ls, roof, Surf.ROOF, { rotX: -a });
      kit.box(v.x1 - i / 2, y + hm / 2 - 0.02, cz, Ls, 0.05, d - 0.02, roof, Surf.ROOF, { rotZ: -a });
      kit.box(v.x0 + i / 2, y + hm / 2 - 0.02, cz, Ls, 0.05, d - 0.02, roof, Surf.ROOF, { rotZ: a });
      kit.span(v.x0 + i, v.x1 - i, y, y + hm, v.z0 + i, v.z1 - i, darkOf(roof, 0.15));
      kit.span(v.x0 + i - 0.03, v.x1 - i + 0.03, y + hm, y + hm + 0.05, v.z0 + i - 0.03, v.z1 - i + 0.03, trim);
      for (let x = v.x0 + 0.55; x < v.x1 - 0.4; x += 0.8) dormer(kit, x, y, v.z1 - i * 0.55, 0, v.wall, roof);
      for (let z = v.z1 - 0.55; z > v.z0 + 0.4; z -= 0.8) dormer(kit, v.x1 - i * 0.55, y, z, Math.PI / 2, v.wall, roof);
      return { deck: y + hm + 0.05, top: y + hm + 0.05 };
    }
    case "sawtooth": {
      const t = 1.0;
      const ht = 0.42;
      const glass = mix(kit.palette.glass, white, 0.2);
      const a = Math.atan2(ht, t);
      const L = Math.hypot(ht, t);
      for (let z = v.z0; z < v.z1 - 0.2; z += t) {
        const z1 = Math.min(v.z1, z + t);
        kit.box(cx, v.y1 + ht / 2 - 0.02, (z + z1) / 2, w, 0.05, L * ((z1 - z) / t), roof, Surf.ROOF, { rotX: -a });
        kit.span(v.x0, v.x1, v.y1, v.y1 + ht, z1 - 0.04, z1, glass, Surf.STORE, { lit: kit.night ? 0.7 : 0 });
      }
      return { deck: null, top: v.y1 + ht };
    }
    case "dome": {
      const r = Math.min(w, d) * 0.82;
      kit.cyl(cx, v.y1, cz, r, 0.32, r, trim);
      const copper: RGB = kit.palette.time === "night" ? [0.36, 0.52, 0.5] : [0.45, 0.68, 0.6];
      const tiers = [0.92, 0.78, 0.58, 0.34];
      let y = v.y1 + 0.32;
      tiers.forEach((k, j) => {
        const hh = 0.2 - j * 0.02;
        kit.cyl(cx, y, cz, r * k, hh, r * k, j % 2 ? mix(copper, white, 0.08) : copper);
        y += hh;
      });
      kit.cyl(cx, y, cz, r * 0.16, 0.28, r * 0.16, trim);
      kit.part({ mesh: "pyramid", node: kit.node, x: cx, y: y + 0.28, z: cz, w: r * 0.2, h: 0.3, d: r * 0.2, color: copper, rotY: Math.PI / 4 });
      return { deck: null, top: y + 0.58 };
    }
    case "spire": {
      const s = Math.min(w, d);
      kit.span(v.x0 - 0.05, v.x1 + 0.05, v.y1, v.y1 + 0.08, v.z0 - 0.05, v.z1 + 0.05, trim);
      kit.part({ mesh: "pyramid", node: kit.node, x: cx, y: v.y1 + 0.08, z: cz, w: s * 1.41, h: s * 1.6, d: s * 1.41, color: roof, rotY: Math.PI / 4 });
      return { deck: null, top: v.y1 + s * 1.6 };
    }
    case "crown": {
      let y = v.y1;
      let ww = w;
      let dd = d;
      for (let j = 0; j < 3; j++) {
        kit.box(cx, y, cz, ww + 0.06, 0.06, dd + 0.06, trim);
        ww *= 0.72;
        dd *= 0.72;
        kit.box(cx, y + 0.06, cz, ww, 0.32, dd, j === 2 ? mix(v.wall, white, 0.2) : v.wall, j === 0 ? Surf.BANDS : Surf.PLAIN, { lit: v.lit ?? 0 });
        y += 0.38;
      }
      kit.box(cx, y, cz, 0.05, 1.1, 0.05, [0.2, 0.2, 0.22]);
      kit.glow(cx, y + 1.1, cz, 0.08, 0.08, 0.08, [1, 0.2, 0.2], 2);
      return { deck: null, top: y + 1.2 };
    }
  }
}

function dormer(kit: Kit, x: number, y: number, z: number, rot: number, wall: RGB, roof: RGB) {
  kit.frame(x, z, rot, () => {
    kit.box(0, y, 0, 0.3, 0.3, 0.22, wall, Surf.FRAMED, { variant: 0, lit: kit.night ? 0.6 : 0 });
    kit.part({ mesh: "prism", node: kit.node, x: 0, y: y + 0.3, z: 0, w: 0.22, h: 0.14, d: 0.36, color: roof, rotY: Math.PI / 2 });
  });
}

export function turret(kit: Kit, x: number, z: number, y0: number, y1: number, wall: RGB, roof: RGB, d = 0.9) {
  kit.cyl(x, y0, z, d, y1 - y0, d, wall, { surf: Surf.FRAMED, variant: rhythm({ tall: true }), lit: kit.night ? 0.55 : 0 });
  kit.cyl(x, y1, z, d + 0.1, 0.07, d + 0.1, trimOf(wall));
  kit.part({ mesh: "pyramid", node: kit.node, x, y: y1 + 0.07, z, w: d * 1.18, h: d * 1.05, d: d * 1.18, color: roof, rotY: Math.PI / 8 });
}

export function clockFace(kit: Kit, x: number, y: number, z: number, d: number) {
  kit.cyl(x, y, z, d + 0.08, 0.04, d + 0.08, darkOf(kit.palette.walls.classic[2], 0.3), { rotX: Math.PI / 2 });
  kit.cyl(x, y, z + 0.02, d, 0.04, d, kit.night ? [1, 0.95, 0.75] : white, { rotX: Math.PI / 2 });
  if (kit.night) kit.glow(x, y - d * 0.3, z + 0.05, d * 0.5, d * 0.6, 0.01, [1, 0.92, 0.7], 0.8);
  kit.box(x, y - 0.03, z + 0.065, 0.03, d * 0.34, 0.015, ink);
  kit.box(x + d * 0.12, y - 0.015, z + 0.065, d * 0.26, 0.03, 0.015, ink);
}

export function colonnade(kit: Kit, x0: number, x1: number, z: number, h: number, wall: RGB, pediment: boolean) {
  const trim = trimOf(wall);
  const n = Math.max(2, Math.round((x1 - x0) / 0.5));
  for (let i = 0; i <= n; i++) kit.cyl(x0 + ((x1 - x0) * i) / n, 0.18, z, 0.16, h - 0.18, 0.16, trim);
  kit.span(x0 - 0.12, x1 + 0.12, h, h + 0.14, z - 0.2, z + 0.12, trim);
  for (let i = 0; i < 3; i++) kit.span(x0 - 0.2 - i * 0.12, x1 + 0.2 + i * 0.12, 0, 0.06 * (3 - i), z - 0.2, z + 0.2 + i * 0.14, mix(kit.palette.stone, white, 0.3));
  if (pediment) kit.part({ mesh: "prism", node: kit.node, x: (x0 + x1) / 2, y: h + 0.14, z: z - 0.04, w: x1 - x0 + 0.3, h: 0.42, d: 0.34, color: trim });
}

export function plaza(kit: Kit, x0: number, x1: number, z0: number, z1: number, seed: number, fountain: boolean, keep?: [number, number, number, number]) {
  const p = kit.palette;
  kit.span(x0, x1, 0, 0.02, z0, z1, mix(p.plaza, white, 0.08), Surf.SLABS);
  const clear = (x: number, z: number, m: number) => !keep || x < keep[0] - m || x > keep[1] + m || z < keep[2] - m || z > keep[3] + m;
  const step = 2.4;
  let k = 0;
  for (let x = x0 + 1.0; x < x1 - 0.6; x += step)
    for (let z = z0 + 1.0; z < z1 - 0.6; z += step, k++) {
      if (!clear(x, z, 0.8)) continue;
      if (fountain && Math.hypot(x - (x0 + x1) / 2, z - (z0 + z1) / 2) < 1.6) continue;
      const r = kit.rand(seed, k);
      if (r < 0.5) {
        kit.box(x, 0.02, z, 0.46, 0.012, 0.46, mix(p.soilDark, ink, 0.3));
        kit.box(x, 0.02, z, 0.09, 0.5, 0.09, p.trunk);
        kit.cyl(x, 0.42, z, 0.7, 0.32, 0.7, p.leaves[1]);
        kit.cyl(x + 0.05, 0.66, z - 0.04, 0.46, 0.24, 0.46, p.leaves[0]);
      } else if (r < 0.62) {
        kit.box(x, 0.02, z, 0.06, 1.1, 0.06, [0.2, 0.21, 0.24]);
        kit.glow(x, 1.12, z, 0.12, 0.08, 0.12, p.lamp, kit.night ? 2 : 0.25);
      } else if (r < 0.78) {
        kit.box(x, 0.02, z, 0.6, 0.11, 0.18, [0.2, 0.21, 0.24]);
        kit.box(x, 0.13, z, 0.62, 0.03, 0.2, [0.58, 0.4, 0.26]);
      } else if (r < 0.9) {
        kit.box(x, 0.02, z, 0.5, 0.2, 0.5, mix(p.stone, white, 0.3));
        kit.box(x, 0.22, z, 0.4, 0.16, 0.4, p.leaves[0]);
      }
      if (kit.rand(seed, k + 500) < 0.35) kit.person(x + 0.6, z + 0.3, { variant: Math.floor(kit.rand(seed, k + 600) * 48), pose: kit.rand(seed, k + 700) < 0.6 ? "walkA" : "stand", flip: k % 2 === 0, y: 0.02 });
    }
  if (fountain) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    kit.cyl(cx, 0, cz, 1.3, 0.16, 1.3, mix(p.stone, white, 0.35));
    kit.cyl(cx, 0.1, cz, 1.12, 0.07, 1.12, p.water, { surf: Surf.WATER });
    kit.cyl(cx, 0.1, cz, 0.18, 0.42, 0.18, mix(p.stone, white, 0.35));
    kit.glow(cx, 0.52, cz, 0.12, 0.12, 0.12, mix(p.water, white, 0.6), kit.night ? 1.3 : 0.5);
  }
  return seed;
}
