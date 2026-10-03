/**
 * Detail kit — buildings. A building is a composition of reusable pieces, each a function
 * of a local frame and a few parameters:
 *
 *   massing     ground floor + upper mass (+ podium / setbacks for towers)
 *   façades     framed windows, ribbon windows or curtain wall (shader, world-anchored)
 *   structure   string course, corner pilasters, fins, cornice, parapet
 *   ground      storefront (glazing, pilasters, door, fascia + sign, awning), café terrace,
 *               lobby (glazing, revolving door, canopy, planters), homes (door, stoop, rails)
 *   extras      balconies, bay windows, fire escapes, blade signs, window boxes
 *   rooftop     HVAC, water tank, stair bulkhead, antenna, solar rows, terrace, garden, billboard
 *
 * A `Program` says what a lot hosts. In the prototype it comes from a list of unit-like
 * records; in the generator it would come from a DOM unit (kind, text, links, label, style).
 */
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import type { ArchStyle } from "../grammar";
import { Surf } from "../types";
import type { Kit } from "./core";

export const FLOOR = 0.5;

export type BuildingKind = "tower" | "office" | "walkup" | "corner" | "rowhouses" | "apartments" | "kiosk";
export type Ground = "shop" | "cafe" | "lobby" | "homes";
export type Roof = "hvac" | "tank" | "terrace" | "garden" | "solar";

export interface Program {
  kind: BuildingKind;
  floors: number;
  style: ArchStyle;
  ground: Ground;
  /** Second front (corners): what the side street gets. */
  ground2?: Ground;
  label?: string;
  label2?: string;
  brand?: string;
  roof: Roof;
  wall: RGB;
  accent: RGB;
  seed: number;
}

/** The four faces of a w × d footprint as local frames: u runs along the face, +z is outward. */
type Side = "front" | "right" | "back" | "left";
function face<T>(kit: Kit, w: number, d: number, side: Side, fn: (span: number) => T): T {
  if (side === "front") return kit.frame(-w / 2, d / 2, 0, () => fn(w));
  if (side === "right") return kit.frame(w / 2, d / 2, Math.PI / 2, () => fn(d));
  if (side === "back") return kit.frame(w / 2, -d / 2, Math.PI, () => fn(w));
  return kit.frame(-w / 2, -d / 2, -Math.PI / 2, () => fn(d));
}

const white: RGB = [0.97, 0.96, 0.92];
const ink: RGB = [0.12, 0.12, 0.15];
const trimOf = (wall: RGB) => mix(wall, white, 0.55);
const darkOf = (c: RGB, k = 0.55) => mix(c, ink, k);

/* ───────────────────────── ground floors ───────────────────────── */

/** Shop or café frontage along u0..u1 of the current face frame. Height `g`. */
export function storefront(kit: Kit, u0: number, u1: number, g: number, P: Program, kind: "shop" | "cafe", label?: string) {
  const pil = 0.12;
  const fascia = 0.26;
  const frame = darkOf(P.wall, 0.35);
  const sign = darkOf(P.accent, 0.35);
  const lit = kit.night ? 0.9 : 0;
  // Pilasters and the glazing between them.
  kit.span(u0, u0 + pil, 0, g, -0.02, 0.05, trimOf(P.wall));
  kit.span(u1 - pil, u1, 0, g, -0.02, 0.05, trimOf(P.wall));
  kit.span(u0 + pil, u1 - pil, 0, g - fascia, -0.05, 0.0, frame, Surf.STORE, { lit });
  // Door: recessed, framed.
  const inner = u1 - u0 - 2 * pil;
  const du = u0 + pil + (kit.rand(P.seed, 3) < 0.5 ? 0.1 : Math.max(0.1, inner - 0.42));
  kit.span(du - 0.03, du + 0.33, 0, 0.48, -0.03, 0.012, trimOf(P.wall));
  kit.span(du, du + 0.3, 0, 0.44, -0.04, 0.016, darkOf(P.accent, 0.62));
  // Fascia band with the shop's name.
  kit.span(u0 + 0.02, u1 - 0.02, g - fascia, g - 0.02, -0.02, 0.07, sign);
  if (label) kit.sign(label, (u0 + u1) / 2, g - fascia + 0.035, 0.072, { bg: sign, fg: white, texel: 0.03, maxW: u1 - u0 - 0.3 });
  // Striped awning, hung under the fascia and tilted out over the sidewalk.
  const tilt = 0.5;
  const depth = 0.46;
  kit.box((u0 + u1) / 2, g - fascia - 0.02 - (depth / 2) * Math.sin(tilt), 0.02 + (depth / 2) * Math.cos(tilt), u1 - u0 - 2 * pil + 0.08, 0.03, depth, P.accent, Surf.STRIPES, { rotX: tilt });
  // Shop window display: a few lit goods at night, crates in the day.
  if (kind === "cafe") cafeTerrace(kit, u0 + pil, u1 - pil, P);
  else {
    const n = Math.max(1, Math.floor(inner / 0.9));
    for (let i = 0; i < n; i++) {
      const u = u0 + pil + 0.3 + (i * (inner - 0.6)) / Math.max(1, n - 1 || 1);
      if (Math.abs(u - du - 0.15) < 0.35) continue;
      kit.box(u, 0, 0.18, 0.26, 0.16, 0.2, kit.pick([P.accent, darkOf(P.accent, 0.2), [0.85, 0.7, 0.35] as RGB], P.seed, i));
    }
  }
}

function cafeTerrace(kit: Kit, u0: number, u1: number, P: Program) {
  const n = Math.max(1, Math.floor((u1 - u0) / 1.0));
  for (let i = 0; i < n; i++) {
    const u = u0 + 0.45 + i * ((u1 - u0 - 0.9) / Math.max(1, n - 1));
    const z = 0.62;
    kit.cyl(u, 0, z, 0.06, 0.2, 0.06, [0.25, 0.25, 0.28]);
    kit.cyl(u, 0.2, z, 0.26, 0.03, 0.26, white);
    kit.box(u - 0.22, 0, z, 0.12, 0.12, 0.12, darkOf(P.accent, 0.1));
    kit.box(u + 0.22, 0, z, 0.12, 0.12, 0.12, darkOf(P.accent, 0.1));
    kit.box(u, 0.2, z, 0.035, 0.42, 0.035, [0.3, 0.3, 0.32]);
    kit.part({ mesh: "pyramid", node: kit.node, x: u, y: 0.55, z, w: 0.62, h: 0.16, d: 0.62, color: i % 2 ? white : P.accent, rotY: Math.PI / 4 });
    if (kit.rand(P.seed, 40 + i) < 0.75) kit.person(u - 0.22, z + 0.02, { variant: Math.floor(kit.rand(P.seed, 50 + i) * 48), pose: "sit", y: 0.0 });
    if (kit.rand(P.seed, 60 + i) < 0.5) kit.person(u + 0.22, z + 0.02, { variant: Math.floor(kit.rand(P.seed, 70 + i) * 48), pose: "sit", flip: true });
  }
}

/** Office / tower lobby along u0..u1. */
export function lobby(kit: Kit, u0: number, u1: number, g: number, P: Program) {
  const trim = trimOf(P.wall);
  kit.span(u0, u0 + 0.14, 0, g, -0.02, 0.05, trim);
  kit.span(u1 - 0.14, u1, 0, g, -0.02, 0.05, trim);
  kit.span(u0 + 0.14, u1 - 0.14, 0, g - 0.06, -0.06, 0.0, darkOf(P.wall, 0.45), Surf.STORE, { lit: kit.night ? 0.95 : 0 });
  const mid = (u0 + u1) / 2;
  kit.cyl(mid, 0, 0.08, 0.42, 0.46, 0.42, mix(kit.palette.glass, white, 0.25));
  kit.box(mid, 0.46, 0.1, 0.5, 0.04, 0.5, trim);
  // Canopy on two slim posts, with the name.
  kit.span(mid - 0.75, mid + 0.75, 0.56, 0.62, 0.0, 0.62, trim);
  for (const s of [-1, 1]) kit.box(mid + s * 0.68, 0, 0.56, 0.04, 0.56, 0.04, darkOf(P.wall, 0.5));
  if (P.brand) kit.sign(P.brand, mid, 0.625, 0.31, { bg: darkOf(P.accent, 0.3), texel: 0.026, rotY: 0, maxW: 1.3 });
  for (const s of [-1, 1]) planter(kit, mid + s * 1.0, 0.35, P.seed + s);
}

/** Front door, stoop and rails for homes along u0..u1. */
export function stoop(kit: Kit, u: number, P: Program) {
  const trim = trimOf(P.wall);
  kit.span(u - 0.2, u + 0.2, 0.18, 0.66, -0.03, 0.015, trim);
  kit.span(u - 0.15, u + 0.15, 0.18, 0.62, -0.04, 0.02, darkOf(P.accent, 0.55));
  for (let i = 0; i < 3; i++) kit.span(u - 0.22, u + 0.22, 0, 0.18 - i * 0.06, 0, 0.12 + i * 0.12, mix(kit.palette.stone, white, 0.15));
  for (const s of [-1, 1]) kit.span(u + s * 0.23 - 0.015, u + s * 0.23 + 0.015, 0, 0.36, 0.0, 0.36, [0.15, 0.15, 0.17], Surf.RAIL);
  kit.glow(u + 0.27, 0.48, 0.03, 0.05, 0.07, 0.05, kit.palette.lamp, kit.night ? 1.6 : 0.2);
}

/* ───────────────────────── upper structure ───────────────────────── */

interface Mass {
  w: number;
  d: number;
  y0: number;
  y1: number;
}

/** Cornice + parapet + roof slab on top of a mass; returns the roof deck height. */
export function cornice(kit: Kit, m: Mass, wall: RGB, roofColor: RGB, heavy = true) {
  const trim = trimOf(wall);
  const o = heavy ? 0.09 : 0.04;
  kit.span(-m.w / 2 - o, m.w / 2 + o, m.y1, m.y1 + 0.1, -m.d / 2 - o, m.d / 2 + o, trim);
  const t = 0.08;
  const ph = 0.16;
  const y = m.y1 + 0.1;
  kit.span(-m.w / 2, m.w / 2, y, y + ph, m.d / 2 - t, m.d / 2, wall);
  kit.span(-m.w / 2, m.w / 2, y, y + ph, -m.d / 2, -m.d / 2 + t, wall);
  kit.span(-m.w / 2, -m.w / 2 + t, y, y + ph, -m.d / 2, m.d / 2, wall);
  kit.span(m.w / 2 - t, m.w / 2, y, y + ph, -m.d / 2, m.d / 2, wall);
  kit.span(-m.w / 2 + t, m.w / 2 - t, y, y + 0.02, -m.d / 2 + t, m.d / 2 - t, roofColor, Surf.ROOF);
  return y + 0.02;
}

function stringCourse(kit: Kit, m: Mass, y: number, color: RGB) {
  kit.span(-m.w / 2 - 0.03, m.w / 2 + 0.03, y - 0.03, y + 0.03, -m.d / 2 - 0.03, m.d / 2 + 0.03, color);
}

function cornerPilasters(kit: Kit, m: Mass, color: RGB, sides: Array<[number, number]>) {
  for (const [sx, sz] of sides) kit.box((sx * m.w) / 2, m.y0, (sz * m.d) / 2, 0.12, m.y1 - m.y0, 0.12, color);
}

/** Balconies on a face (current face frame), every other bay from floor `f0`. */
function balconies(kit: Kit, span: number, y0: number, floors: number, P: Program) {
  const bays = Math.max(1, Math.floor((span - 0.16) / 0.5));
  const m = (span - bays * 0.5) / 2;
  const rail: RGB = [0.16, 0.16, 0.18];
  for (let f = 1; f < floors; f++)
    for (let b = (f % 2) * 1; b < bays; b += 2) {
      const u = m + b * 0.5 + 0.25;
      const y = y0 + f * FLOOR + 0.02;
      kit.span(u - 0.32, u + 0.32, y, y + 0.05, 0, 0.3, trimOf(P.wall));
      kit.span(u - 0.32, u + 0.32, y + 0.05, y + 0.23, 0.28, 0.3, rail, Surf.RAIL);
      for (const s of [-1, 1]) kit.span(u + s * 0.32 - 0.01, u + s * 0.32 + 0.01, y + 0.05, y + 0.23, 0, 0.3, rail, Surf.RAIL);
      const r = kit.rand(P.seed * 7 + f, b);
      if (r < 0.45) kit.box(u - 0.2, y + 0.05, 0.18, 0.12, 0.12, 0.12, kit.palette.leaves[r < 0.2 ? 0 : 1]);
      if (r > 0.86) kit.person(u + 0.1, 0.15, { variant: Math.floor(kit.rand(P.seed, f * 11 + b) * 48), y: y + 0.05 });
    }
}

/** Zig-zag fire escape on a face: slim landings with see-through rails, a stair between. */
function fireEscape(kit: Kit, u: number, y0: number, floors: number) {
  const iron: RGB = [0.3, 0.3, 0.33];
  for (let f = 1; f < floors; f++) {
    const y = y0 + f * FLOOR - 0.03;
    kit.span(u - 0.42, u + 0.42, y, y + 0.022, 0, 0.26, iron);
    kit.span(u - 0.42, u + 0.42, y + 0.022, y + 0.19, 0.245, 0.26, iron, Surf.RAIL);
    for (const s of [-1, 1]) kit.span(u + s * 0.42 - 0.008, u + s * 0.42 + 0.008, y + 0.022, y + 0.19, 0, 0.26, iron, Surf.RAIL);
    if (f < floors - 1) {
      const dir = f % 2 ? 1 : -1;
      const run = 0.62;
      // One narrow flight up to the next landing.
      kit.box(u, y + 0.02 + FLOOR / 2 - 0.012, 0.09, Math.hypot(run, FLOOR), 0.018, 0.13, iron, Surf.PLAIN, { rotZ: dir * Math.atan2(FLOOR, run) });
    }
  }
}

/** Projecting vertical sign at u on the current face, its base at y. */
function bladeSign(kit: Kit, u: number, y: number, text: string, bg: RGB) {
  const t = text.replace(/ /g, "").slice(0, 5);
  const texel = 0.032;
  const h = (t.length * 6 + 3) * texel;
  kit.span(u - 0.02, u + 0.02, y + h - 0.04, y + h - 0.01, 0, 0.36, [0.2, 0.2, 0.22]);
  kit.sign(t, u, y, 0.3, { bg, texel, rotY: Math.PI / 2, vertical: true });
}

/** Window boxes with flowers under some windows of a FRAMED face (matches the shader's bays). */
function windowBoxes(kit: Kit, span: number, y0: number, floors: number, P: Program) {
  const bays = Math.max(1, Math.floor((span - 0.16) / 0.5));
  const m = (span - bays * 0.5) / 2;
  for (let f = 0; f < floors; f++)
    for (let b = 0; b < bays; b++) {
      // Flower boxes cluster on a few floors rather than sprinkling every façade.
      if ((f + P.seed) % 3 !== 0 || kit.rand(P.seed * 3 + f, b) > 0.55) continue;
      const u = m + b * 0.5 + 0.25;
      const y = y0 + f * FLOOR + 0.06;
      kit.span(u - 0.15, u + 0.15, y, y + 0.06, 0, 0.07, darkOf(P.wall, 0.4));
      kit.span(u - 0.13, u + 0.13, y + 0.06, y + 0.11, 0.01, 0.06, kit.pick([[0.86, 0.28, 0.35], [0.95, 0.75, 0.2], kit.palette.leaves[0]] as RGB[], P.seed + f, b));
    }
}

/* ───────────────────────── rooftops ───────────────────────── */

export function rooftop(kit: Kit, w: number, d: number, y: number, P: Program, opts: { tank?: boolean; bulkhead?: boolean } = {}) {
  const r = (k: number) => kit.rand(P.seed * 13, k);
  const steel = kit.palette.walls.tech[2];
  const fx = (k: number) => (r(k) - 0.5) * (w - 1.2);
  const fz = (k: number) => (r(k + 50) - 0.5) * (d - 1.2);
  if (opts.bulkhead !== false && w > 1.6 && d > 1.6) {
    const bx = -w / 2 + 0.55;
    const bz = -d / 2 + 0.55;
    kit.box(bx, y, bz, 0.7, 0.5, 0.6, P.wall);
    kit.box(bx, y + 0.5, bz, 0.78, 0.05, 0.68, trimOf(P.wall));
    kit.span(bx - 0.13, bx + 0.13, y, y + 0.36, bz + 0.3, bz + 0.31, darkOf(P.accent, 0.5));
  }
  switch (P.roof) {
    case "hvac": {
      for (let i = 0; i < 2; i++) {
        const x = fx(i);
        const z = fz(i);
        kit.box(x, y, z, 0.6, 0.32, 0.42, steel, Surf.GRILLE);
        kit.box(x + 0.4, y, z, 0.25, 0.1, 0.1, steel);
        kit.cyl(x - 0.36, y, z + 0.1, 0.08, 0.3, 0.08, steel);
      }
      break;
    }
    case "tank":
      waterTank(kit, w / 2 - 0.65, y, -d / 2 + 0.75);
      kit.box(fx(3), y, fz(3), 0.5, 0.28, 0.36, steel, Surf.GRILLE);
      break;
    case "solar": {
      const rows = Math.max(1, Math.floor((d - 1.0) / 0.55));
      const len = w - 1.0;
      for (let i = 0; i < rows; i++) {
        const z = -d / 2 + 0.75 + i * 0.55;
        kit.box(0.1, y, z, len, 0.08, 0.04, steel);
        kit.box(0.1, y + 0.1, z, len, 0.025, 0.42, [0.2, 0.25, 0.4], Surf.SOLAR, { rotX: -0.38 });
      }
      break;
    }
    case "terrace": {
      // A deck on the street half; the back half stays service roof.
      kit.span(-w / 2 + 0.25, w / 2 - 0.25, y, y + 0.03, -0.25, d / 2 - 0.25, mix([0.62, 0.45, 0.3], kit.palette.sidewalk, 0.3), Surf.SLABS);
      kit.span(-w / 2 + 0.25, w / 2 - 0.25, y + 0.03, y + 0.22, -0.27, -0.25, [0.25, 0.25, 0.28], Surf.RAIL);
      const n = Math.max(1, Math.floor(w / 1.4));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.8 + (i * (w - 1.6)) / Math.max(1, n - 1);
        const z = 0.2;
        kit.cyl(x, y, z, 0.24, 0.2, 0.24, white);
        kit.box(x, y, z, 0.03, 0.6, 0.03, [0.3, 0.3, 0.32]);
        kit.part({ mesh: "pyramid", node: kit.node, x, y: y + 0.52, z, w: 0.7, h: 0.17, d: 0.7, color: i % 2 ? P.accent : white, rotY: Math.PI / 4 });
        kit.person(x - 0.25, z + 0.05, { variant: Math.floor(r(80 + i) * 48), pose: "sit", y });
        if (r(90 + i) < 0.6) kit.person(x + 0.3, z - 0.1, { variant: Math.floor(r(95 + i) * 48), y, flip: true });
      }
      for (const s of [-1, 1]) planter(kit, s * (w / 2 - 0.45), d / 2 - 0.45, P.seed + 5, y);
      // String lights along the front parapet.
      for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.32) kit.glow(x, y + 0.48, d / 2 - 0.12, 0.04, 0.04, 0.04, kit.palette.lamp, kit.night ? 1.8 : 0.3);
      break;
    }
    case "garden": {
      kit.span(-w / 2 + 0.25, w / 2 - 0.25, y, y + 0.04, -d / 2 + 0.25, d / 2 - 0.25, kit.palette.grass[1], Surf.GRASS);
      for (let i = 0; i < 3; i++) shrub(kit, fx(20 + i), fz(20 + i), y + 0.04, 0.6 + r(30 + i) * 0.3);
      for (const s of [-1, 1]) planter(kit, s * (w / 2 - 0.45), 0, P.seed + 9, y);
      break;
    }
  }
  if (opts.tank && P.roof !== "tank") waterTank(kit, w / 2 - 0.65, y, -d / 2 + 0.75);
  roofClutter(kit, w, d, y, P);
}

/**
 * Service clutter scaled by roof area — vents, hatches, skylights, conduit — so no roof reads
 * as an empty slab. Kept to the back half when the front half is a terrace or garden.
 */
function roofClutter(kit: Kit, w: number, d: number, y: number, P: Program) {
  const steel = kit.palette.walls.tech[2];
  const back = P.roof === "terrace" || P.roof === "garden";
  const z0 = -d / 2 + 0.45;
  const z1 = back ? -0.45 : d / 2 - 0.45;
  const n = Math.max(2, Math.round(((w - 0.9) * (z1 - z0)) / 2.2));
  for (let i = 0; i < n; i++) {
    const r = kit.rand(P.seed * 17 + i, 1);
    const x = -w / 2 + 0.45 + kit.rand(P.seed * 17 + i, 2) * (w - 0.9);
    const z = z0 + kit.rand(P.seed * 17 + i, 3) * (z1 - z0);
    if (r < 0.3) kit.cyl(x, y, z, 0.1, 0.18, 0.1, steel);
    else if (r < 0.5) {
      kit.box(x, y, z, 0.42, 0.06, 0.42, mix(kit.palette.glass, white, 0.3));
      kit.part({ mesh: "prism", node: kit.node, x, y: y + 0.06, z, w: 0.42, h: 0.14, d: 0.42, color: mix(kit.palette.glass, white, 0.15) });
    } else if (r < 0.65) kit.box(x, y, z, 0.32, 0.12, 0.32, darkOf(P.wall, 0.3));
    else if (r < 0.85) kit.box(x, y, z, 0.38, 0.22, 0.3, steel, Surf.GRILLE);
    else kit.box(x, y, z, Math.min(1.4, w - 1), 0.05, 0.06, steel);
  }
}

export function waterTank(kit: Kit, x: number, y: number, z: number) {
  const wood: RGB = [0.52, 0.36, 0.24];
  for (const [dx, dz] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ])
    kit.box(x + dx, y, z + dz, 0.05, 0.42, 0.05, [0.2, 0.2, 0.22]);
  kit.box(x, y + 0.4, z, 0.5, 0.03, 0.5, [0.2, 0.2, 0.22]);
  kit.cyl(x, y + 0.43, z, 0.52, 0.48, 0.52, wood);
  kit.part({ mesh: "pyramid", node: kit.node, x, y: y + 0.91, z, w: 0.56, h: 0.2, d: 0.56, color: mix(wood, ink, 0.3), rotY: Math.PI / 8 });
}

export function planter(kit: Kit, x: number, z: number, seed: number, y = 0) {
  kit.box(x, y, z, 0.32, 0.18, 0.32, mix(kit.palette.stone, white, 0.25));
  shrub(kit, x, z, y + 0.16, 0.5 + kit.rand(seed, 2) * 0.2);
}

export function shrub(kit: Kit, x: number, z: number, y: number, s: number) {
  kit.box(x, y, z, 0.34 * s, 0.22 * s, 0.34 * s, kit.palette.leaves[1]);
  kit.box(x + 0.04 * s, y + 0.16 * s, z - 0.03 * s, 0.24 * s, 0.14 * s, 0.24 * s, kit.palette.leaves[0]);
}

/* ───────────────────────── recipes ───────────────────────── */

/**
 * Build a program on a lot whose footprint is w × d, centred on the current frame, front
 * facing local +z (corners also front local +x). Returns the roof height.
 */
export function building(kit: Kit, w: number, d: number, P: Program): number {
  switch (P.kind) {
    case "tower":
      return tower(kit, w, d, P);
    case "office":
      return office(kit, w, d, P);
    case "rowhouses":
      return rowhouses(kit, w, d, P);
    case "kiosk":
      return kiosk(kit, w, d, P);
    default:
      return midrise(kit, w, d, P);
  }
}

/** Walk-ups, corner buildings and apartments: one family, different ground floors and extras. */
function midrise(kit: Kit, w: number, d: number, P: Program): number {
  const g = P.ground === "homes" ? 0.62 : 0.74;
  const H = g + P.floors * FLOOR;
  const brick = P.style === "classic" || P.style === "retro";
  const trim = trimOf(P.wall);
  const corner = P.kind === "corner";
  // Ground floor mass and the upper mass.
  kit.span(-w / 2, w / 2, 0, g, -d / 2, d / 2, darkOf(P.wall, 0.12), P.ground === "homes" ? Surf.FRAMED : Surf.PLAIN, { variant: brick ? 1 : 0, lit: kit.night ? 0.45 : 0 });
  kit.span(-w / 2, w / 2, g, H, -d / 2, d / 2, P.wall, Surf.FRAMED, { variant: brick ? 1 : 0, lit: kit.night ? 0.5 : 0 });
  stringCourse(kit, { w, d, y0: 0, y1: H }, g, trim);
  cornerPilasters(kit, { w, d, y0: g, y1: H }, trim, [
    [1, 1],
    [-1, 1],
    ...(corner ? ([[1, -1]] as Array<[number, number]>) : []),
  ]);
  const roofs = kit.palette.roofs;
  const roofY = cornice(kit, { w, d, y0: 0, y1: H }, P.wall, kit.pick([roofs.modern[1], roofs.modern[0], mix(roofs.tech[1], white, 0.3), mix(roofs.retro[0], white, 0.28)], P.seed, 21), P.style !== "soft");

  const ground = (side: Side, kind: Ground, label?: string) =>
    face(kit, w, d, side, (span) => {
      if (kind === "shop" || kind === "cafe") storefront(kit, 0.06, span - 0.06, g, P, kind, label);
      else if (kind === "lobby") lobby(kit, 0.1, span - 0.1, g, P);
      else stoop(kit, span * (kit.rand(P.seed, 7) < 0.5 ? 0.3 : 0.7), P);
    });
  ground("front", P.ground, P.label);
  if (corner) ground("right", P.ground2 ?? "shop", P.label2);

  face(kit, w, d, "front", (span) => {
    if (P.kind === "apartments") balconies(kit, span, g, P.floors, P);
    else if (brick && P.floors >= 3 && kit.rand(P.seed, 11) < 0.3) fireEscape(kit, span * 0.5, g, P.floors);
    else windowBoxes(kit, span, g, P.floors, P);
    if ((P.ground === "shop" || P.ground === "cafe") && P.label && span > 2.2) bladeSign(kit, span - 0.25, g + 0.12, P.label, P.accent);
  });
  if (corner) face(kit, w, d, "right", (span) => windowBoxes(kit, span, g, P.floors, P));
  rooftop(kit, w, d, roofY, P, { tank: brick && kit.rand(P.seed, 12) < 0.5 });
  // Some shop buildings carry a rooftop billboard with their name, facing the street.
  if ((P.ground === "shop" || P.ground === "cafe") && P.label && P.roof !== "terrace" && kit.rand(P.seed, 13) < 0.45) rooftopBillboard(kit, d, roofY, P.label, P.accent);
  return roofY;
}

/** Billboard on legs at the front of a roof, facing local +z. */
export function rooftopBillboard(kit: Kit, d: number, y: number, text: string, accent: RGB) {
  const z = d / 2 - 0.5;
  const steel: RGB = [0.22, 0.22, 0.25];
  for (const s of [-1, 1]) kit.box(s * 0.75, y, z, 0.05, 0.62, 0.05, steel);
  kit.span(-0.95, 0.95, y + 0.55, y + 0.6, z - 0.03, z + 0.03, steel);
  kit.span(-0.95, 0.95, y + 0.6, y + 1.08, z - 0.04, z + 0.0, mix(accent, white, 0.15));
  kit.sign(text, 0, y + 0.66, z + 0.005, { bg: darkOf(accent, 0.2), texel: 0.045, maxW: 1.7 });
  for (const s of [-1, 1]) kit.glow(s * 0.6, y + 1.1, z + 0.12, 0.08, 0.04, 0.08, kit.palette.lamp, kit.night ? 1.8 : 0.2);
}

function tower(kit: Kit, w: number, d: number, P: Program): number {
  const g = 0.8;
  const pod = g + FLOOR;
  const trim = trimOf(P.wall);
  const frameC = darkOf(P.wall, 0.15);
  kit.span(-w / 2, w / 2, 0, g, -d / 2, d / 2, darkOf(P.wall, 0.25));
  kit.span(-w / 2, w / 2, g, pod, -d / 2, d / 2, P.wall, Surf.BANDS, { lit: kit.night ? 0.6 : 0 });
  face(kit, w, d, "front", (span) => lobby(kit, span / 2 - 1.4, span / 2 + 1.4, g, P));
  const inset = 0.4;
  const sw = w - 2 * inset;
  const sd = d - 2 * inset;
  const H1 = pod + Math.round(P.floors * 0.68) * FLOOR;
  const H2 = pod + P.floors * FLOOR;
  kit.span(-w / 2 - 0.04, w / 2 + 0.04, pod, pod + 0.08, -d / 2 - 0.04, d / 2 + 0.04, trim);
  kit.span(-sw / 2, sw / 2, pod + 0.08, H1, -sd / 2, sd / 2, frameC, Surf.GLASS, { lit: kit.night ? 0.5 : 0 });
  // Vertical fins on the two visible faces give the shaft its rhythm.
  for (let u = -sw / 2; u <= sw / 2 + 0.01; u += 0.8) kit.box(u, pod + 0.08, sd / 2 + 0.03, 0.05, H1 - pod - 0.08, 0.06, trim);
  for (let v = -sd / 2; v <= sd / 2 + 0.01; v += 0.8) kit.box(sw / 2 + 0.03, pod + 0.08, v, 0.06, H1 - pod - 0.08, 0.05, trim);
  // Setback crown.
  const cw = sw - 0.8;
  const cd = sd - 0.8;
  kit.span(-sw / 2, sw / 2, H1, H1 + 0.08, -sd / 2, sd / 2, trim);
  kit.span(-cw / 2, cw / 2, H1 + 0.08, H2, -cd / 2, cd / 2, frameC, Surf.GLASS, { lit: kit.night ? 0.55 : 0 });
  const roofY = cornice(kit, { w: cw, d: cd, y0: H1, y1: H2 }, frameC, kit.palette.roofs.modern[0], false);
  kit.box(-0.2, roofY, -0.2, cw * 0.45, 0.45, cd * 0.45, kit.palette.walls.tech[2], Surf.GRILLE);
  kit.box(cw / 2 - 0.35, roofY, -cd / 2 + 0.35, 0.05, 1.4, 0.05, [0.2, 0.2, 0.22]);
  kit.glow(cw / 2 - 0.35, roofY + 1.4, -cd / 2 + 0.35, 0.08, 0.08, 0.08, [1, 0.2, 0.2], 2);
  // Name on the crown, both visible faces.
  if (P.brand) {
    kit.sign(P.brand, 0, H2 - 0.42, cd / 2 + 0.02, { bg: darkOf(P.accent, 0.25), texel: 0.05, maxW: cw - 0.3 });
    kit.sign(P.brand, cw / 2 + 0.02, H2 - 0.42, 0, { bg: darkOf(P.accent, 0.25), texel: 0.05, rotY: Math.PI / 2, maxW: cd - 0.3 });
  }
  return H2;
}

function office(kit: Kit, w: number, d: number, P: Program): number {
  const g = 0.78;
  const H = g + P.floors * FLOOR;
  const trim = trimOf(P.wall);
  kit.span(-w / 2, w / 2, 0, g, -d / 2, d / 2, darkOf(P.wall, 0.2));
  kit.span(-w / 2, w / 2, g, H, -d / 2, d / 2, P.wall, Surf.BANDS, { lit: kit.night ? 0.55 : 0 });
  stringCourse(kit, { w, d, y0: 0, y1: H }, g, trim);
  face(kit, w, d, "front", (span) => lobby(kit, 0.15, span - 0.15, g, P));
  const roofY = cornice(kit, { w, d, y0: 0, y1: H }, P.wall, kit.palette.roofs.modern[1], false);
  rooftop(kit, w, d, roofY, { ...P, roof: "solar" }, { bulkhead: true });
  // Rooftop billboard with the brand.
  if (P.brand) {
    const bz = -d / 2 + 0.4;
    for (const s of [-1, 1]) kit.box(s * 0.9, roofY, bz, 0.06, 0.9, 0.06, [0.2, 0.2, 0.22]);
    kit.span(-1.15, 1.15, roofY + 0.85, roofY + 0.9, bz - 0.04, bz + 0.04, [0.2, 0.2, 0.22]);
    kit.sign(P.brand, 0, roofY + 0.9, bz + 0.05, { bg: P.accent, texel: 0.055, maxW: 2.2 });
  }
  return roofY;
}

function rowhouses(kit: Kit, w: number, d: number, P: Program): number {
  const n = Math.max(1, Math.round(w / 2.1));
  const hw = w / n;
  let top = 0;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + hw * (i + 0.5);
    const wall = kit.pick(kit.palette.walls[P.style], P.seed, i);
    const q: Program = { ...P, wall, seed: P.seed * 7 + i, floors: P.floors + (kit.rand(P.seed, i) < 0.3 ? 1 : 0) };
    top = Math.max(
      top,
      kit.frame(x, 0, 0, () => {
        const g = 0.62;
        const H = g + q.floors * FLOOR;
        const brick = q.style === "classic" || q.style === "retro";
        kit.span(-hw / 2, hw / 2, 0, H, -d / 2, d / 2, wall, Surf.FRAMED, { variant: brick ? 1 : 0, lit: kit.night ? 0.5 : 0 });
        face(kit, hw, d, "front", (span) => {
          stoop(kit, span * 0.28, q);
          if (i % 2 === 0) {
            // Bay window over the parlour floor.
            kit.span(span * 0.58 - 0.38, span * 0.58 + 0.38, g - 0.05, g + 2 * FLOOR, 0, 0.24, wall, Surf.FRAMED, { variant: brick ? 1 : 0, lit: kit.night ? 0.5 : 0 });
            kit.span(span * 0.58 - 0.42, span * 0.58 + 0.42, g + 2 * FLOOR, g + 2 * FLOOR + 0.06, 0, 0.28, trimOf(wall));
          }
          windowBoxes(kit, span, g, q.floors, q);
        });
        const roofY = cornice(kit, { w: hw, d, y0: 0, y1: H }, wall, kit.palette.roofs.classic[1]);
        for (const s of [-1, 1]) kit.box(s * (hw / 2 - 0.25), roofY, -d / 2 + 0.6, 0.22, 0.38, 0.22, mix(wall, ink, 0.2), Surf.STRIPES);
        return roofY;
      }),
    );
  }
  return top;
}

function kiosk(kit: Kit, w: number, d: number, P: Program): number {
  const kw = Math.min(w, 1.5);
  const kd = Math.min(d, 1.0);
  kit.span(-kw / 2, kw / 2, 0, 0.55, -kd / 2, kd / 2, P.wall);
  kit.span(-kw / 2 - 0.08, kw / 2 + 0.08, 0.55, 0.62, -kd / 2 - 0.08, kd / 2 + 0.08, trimOf(P.wall));
  face(kit, kw, kd, "front", (span) => {
    kit.span(0.1, span - 0.1, 0.12, 0.42, -0.03, 0.02, darkOf(P.wall, 0.4), Surf.STORE, { lit: kit.night ? 0.9 : 0 });
    for (let i = 0; i < 5; i++) kit.span(0.15 + i * 0.25, 0.33 + i * 0.25, 0.12, 0.34, 0.02, 0.05, kit.pick([P.accent, [0.95, 0.85, 0.3], [0.3, 0.55, 0.9], white] as RGB[], P.seed, i));
    kit.box(span / 2, 0.42 - 0.12, 0.02 + 0.16, span + 0.1, 0.025, 0.34, P.accent, Surf.STRIPES, { rotX: 0.5 });
    if (P.label) kit.sign(P.label, span / 2, 0.62, 0.0, { bg: darkOf(P.accent, 0.3), texel: 0.03, maxW: span });
  });
  return 0.62;
}
