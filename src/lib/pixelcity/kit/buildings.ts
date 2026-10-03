/**
 * Detail kit — buildings. A building is a *massing family* (how its volumes are composed:
 * footprint, stacking, roof family) dressed with reusable pieces (ground floors, façade
 * extras, rooftop furniture, signage). Families and pieces are chosen by a `Program`, which
 * the brief grammar (brief.ts) derives from what a part of the page is.
 *
 *   families  walkup · corner · rows · apartments · lshape · asymmetric · slab · podiumTower ·
 *             stepped · narrowTower · courtyard · shed · civic · clocktower · kiosk
 *   ground    shop / café (four awning kinds) · lobby · homes (stoops) · arcade · docks · blank
 *   signage   plaque · shop fascia · blade · rooftop billboard · façade screen · painted wall
 *   rooftop   hvac · tank · terrace · garden · solar · bare, plus area-scaled service clutter
 */
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import type { ArchStyle } from "../grammar";
import { Surf } from "../types";
import type { Kit } from "./core";
import { clockFace, colonnade, darkOf, plaza, rhythm, trimOf, turret, volume, type RoofFamily, type Vol } from "./massing";
import { tree } from "./street";

export const FLOOR = 0.5;

export type Family =
  | "walkup"
  | "corner"
  | "rows"
  | "apartments"
  | "lshape"
  | "asymmetric"
  | "slab"
  | "podiumTower"
  | "stepped"
  | "narrowTower"
  | "courtyard"
  | "shed"
  | "civic"
  | "clocktower"
  | "kiosk";
export type Ground = "shop" | "cafe" | "lobby" | "homes" | "arcade" | "docks" | "blank";
export type Signage = "none" | "plaque" | "shop" | "blade" | "billboard" | "screen" | "painted";
export type Topside = "hvac" | "tank" | "terrace" | "garden" | "solar" | "bare";
export type Awning = "stripes" | "solid" | "canopy" | "none";

export interface Program {
  family: Family;
  floors: number;
  style: ArchStyle;
  roof: RoofFamily;
  facade: "framed" | "bands" | "curtain";
  /** FRAMED variant (see massing.rhythm). */
  rhythm: number;
  ground: Ground;
  ground2?: Ground;
  signage: Signage;
  awning: Awning;
  topside: Topside;
  corner?: "square" | "round" | "turret";
  label?: string;
  label2?: string;
  brand?: string;
  wall: RGB;
  accent: RGB;
  roofColor: RGB;
  seed: number;
  /** Units in an attached series (rows). */
  units?: number;
}

type Side = "front" | "right" | "back" | "left";
/** A face of an x0..x1 × z0..z1 footprint as a local frame: u along the face, +z outward. */
function face<T>(kit: Kit, x0: number, x1: number, z0: number, z1: number, side: Side, fn: (span: number) => T): T {
  if (side === "front") return kit.frame(x0, z1, 0, () => fn(x1 - x0));
  if (side === "right") return kit.frame(x1, z1, Math.PI / 2, () => fn(z1 - z0));
  if (side === "back") return kit.frame(x1, z0, Math.PI, () => fn(x1 - x0));
  return kit.frame(x0, z0, -Math.PI / 2, () => fn(z1 - z0));
}

const white: RGB = [0.97, 0.96, 0.92];
const surfOf = (P: Program) => (P.facade === "bands" ? Surf.BANDS : P.facade === "curtain" ? Surf.GLASS : Surf.FRAMED);
const litOf = (kit: Kit, k = 0.5) => (kit.night ? k : 0);

/* ───────────────────────── ground floors ───────────────────────── */

/** Shop or café frontage along u0..u1 of the current face frame, `g` tall. */
export function storefront(kit: Kit, u0: number, u1: number, g: number, P: Program, kind: "shop" | "cafe", label?: string, k = 0) {
  const pil = 0.12;
  const fascia = 0.26;
  const frame = darkOf(P.wall, 0.35);
  const signBg = darkOf(P.accent, 0.35);
  kit.span(u0, u0 + pil, 0, g, -0.02, 0.05, trimOf(P.wall));
  kit.span(u1 - pil, u1, 0, g, -0.02, 0.05, trimOf(P.wall));
  kit.span(u0 + pil, u1 - pil, 0, g - fascia, -0.05, 0.0, frame, Surf.STORE, { lit: litOf(kit, 0.9) });
  const inner = u1 - u0 - 2 * pil;
  const du = u0 + pil + (kit.rand(P.seed + k, 3) < 0.5 ? 0.1 : Math.max(0.1, inner - 0.42));
  kit.span(du - 0.03, du + 0.33, 0, 0.48, -0.03, 0.012, trimOf(P.wall));
  kit.span(du, du + 0.3, 0, 0.44, -0.04, 0.016, darkOf(P.accent, 0.62));
  kit.span(u0 + 0.02, u1 - 0.02, g - fascia, g - 0.02, -0.02, 0.07, signBg);
  if (label && P.signage !== "none" && P.signage !== "plaque") kit.sign(label, (u0 + u1) / 2, g - fascia + 0.035, 0.072, { bg: signBg, fg: white, texel: 0.03, maxW: u1 - u0 - 0.3 });
  // Four awning kinds, so a street of shops isn't one awning repeated.
  const aw = P.awning;
  const width = u1 - u0 - 2 * pil + 0.08;
  if (aw === "stripes" || aw === "solid") {
    const tilt = 0.5;
    const depth = aw === "solid" ? 0.38 : 0.46;
    kit.box((u0 + u1) / 2, g - fascia - 0.02 - (depth / 2) * Math.sin(tilt), 0.02 + (depth / 2) * Math.cos(tilt), width, 0.03, depth, aw === "solid" ? darkOf(P.accent, 0.1) : P.accent, aw === "solid" ? Surf.PLAIN : Surf.STRIPES, { rotX: tilt });
    if (aw === "solid") kit.span(u0 + pil - 0.04, u1 - pil + 0.04, g - fascia - 0.23, g - fascia - 0.19, 0.33, 0.37, mix(P.accent, white, 0.4));
  } else if (aw === "canopy") {
    kit.span(u0 + 0.06, u1 - 0.06, g - fascia - 0.02, g - fascia + 0.02, 0, 0.42, darkOf(P.wall, 0.55));
    for (let u = u0 + 0.4; u < u1 - 0.3; u += 0.5) kit.glow(u, g - fascia - 0.04, 0.3, 0.06, 0.02, 0.06, kit.palette.lamp, kit.night ? 1.6 : 0.2);
  }
  if (kind === "cafe") cafeTerrace(kit, u0 + pil, u1 - pil, P);
  else if (kit.rand(P.seed + k, 9) < 0.6) {
    // Goods outside: crates, a rack or a sandwich board — not every shop.
    const u = du < (u0 + u1) / 2 ? u1 - pil - 0.35 : u0 + pil + 0.35;
    const r = kit.rand(P.seed + k, 10);
    if (r < 0.4) for (let i = 0; i < 3; i++) kit.box(u + (i - 1) * 0.18, 0, 0.2, 0.16, 0.14, 0.18, kit.pick([P.accent, [0.85, 0.7, 0.35], [0.4, 0.6, 0.3]] as RGB[], P.seed + k, i));
    else if (r < 0.7) kit.part({ mesh: "prism", node: kit.node, x: u, y: 0, z: 0.35, w: 0.18, h: 0.3, d: 0.2, color: darkOf(P.accent, 0.2), rotY: Math.PI / 2 });
    else {
      kit.box(u, 0, 0.22, 0.42, 0.03, 0.03, [0.2, 0.2, 0.22]);
      for (let i = 0; i < 4; i++) kit.box(u - 0.15 + i * 0.1, 0.05, 0.22, 0.06, 0.26, 0.05, kit.pick([P.accent, white, [0.3, 0.45, 0.8]] as RGB[], P.seed + k, i + 4));
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
    if (i % 2 === 0) {
      kit.box(u, 0.2, z, 0.035, 0.42, 0.035, [0.3, 0.3, 0.32]);
      kit.part({ mesh: "pyramid", node: kit.node, x: u, y: 0.55, z, w: 0.62, h: 0.16, d: 0.62, color: kit.rand(P.seed, i) < 0.5 ? white : P.accent, rotY: Math.PI / 4 });
    }
    if (kit.rand(P.seed, 40 + i) < 0.75) kit.person(u - 0.22, z + 0.02, { variant: Math.floor(kit.rand(P.seed, 50 + i) * 48), pose: "sit" });
    if (kit.rand(P.seed, 60 + i) < 0.5) kit.person(u + 0.22, z + 0.02, { variant: Math.floor(kit.rand(P.seed, 70 + i) * 48), pose: "sit", flip: true });
  }
}

/** Office / tower lobby along u0..u1. */
export function lobby(kit: Kit, u0: number, u1: number, g: number, P: Program) {
  const trim = trimOf(P.wall);
  kit.span(u0, u0 + 0.14, 0, g, -0.02, 0.05, trim);
  kit.span(u1 - 0.14, u1, 0, g, -0.02, 0.05, trim);
  kit.span(u0 + 0.14, u1 - 0.14, 0, g - 0.06, -0.06, 0.0, darkOf(P.wall, 0.45), Surf.STORE, { lit: litOf(kit, 0.95) });
  const mid = (u0 + u1) / 2;
  kit.cyl(mid, 0, 0.08, 0.42, 0.46, 0.42, mix(kit.palette.glass, white, 0.25));
  kit.box(mid, 0.46, 0.1, 0.5, 0.04, 0.5, trim);
  const cw = Math.min(0.75, (u1 - u0) / 2 - 0.1);
  kit.span(mid - cw, mid + cw, 0.56, 0.62, 0.0, 0.62, trim);
  for (const s of [-1, 1]) kit.box(mid + s * (cw - 0.07), 0, 0.56, 0.04, 0.56, 0.04, darkOf(P.wall, 0.5));
  if (P.brand) kit.sign(P.brand, mid, 0.625, 0.31, { bg: darkOf(P.accent, 0.3), texel: 0.026, maxW: 2 * cw - 0.2 });
  if (u1 - u0 > 2.6) for (const s of [-1, 1]) planter(kit, mid + s * (cw + 0.3), 0.35, P.seed + s);
}

/** Front door, stoop and rails for homes. */
export function stoop(kit: Kit, u: number, P: Program) {
  const trim = trimOf(P.wall);
  kit.span(u - 0.2, u + 0.2, 0.18, 0.66, -0.03, 0.015, trim);
  kit.span(u - 0.15, u + 0.15, 0.18, 0.62, -0.04, 0.02, darkOf(P.accent, 0.55));
  for (let i = 0; i < 3; i++) kit.span(u - 0.22, u + 0.22, 0, 0.18 - i * 0.06, 0, 0.12 + i * 0.12, mix(kit.palette.stone, white, 0.15));
  for (const s of [-1, 1]) kit.span(u + s * 0.23 - 0.015, u + s * 0.23 + 0.015, 0, 0.36, 0.0, 0.36, [0.15, 0.15, 0.17], Surf.RAIL);
  kit.glow(u + 0.27, 0.48, 0.03, 0.05, 0.07, 0.05, kit.palette.lamp, kit.night ? 1.6 : 0.2);
}

/** Loading docks: roll-up doors, bumpers, hazard stripes. */
function docks(kit: Kit, u0: number, u1: number, P: Program) {
  for (let u = u0 + 0.25; u < u1 - 0.7; u += 1.0) {
    kit.span(u, u + 0.7, 0, 0.62, -0.03, 0.01, mix(kit.palette.walls.tech[2], white, 0.2), Surf.GRILLE);
    kit.span(u - 0.04, u + 0.74, 0.62, 0.68, -0.02, 0.04, [0.95, 0.75, 0.15], Surf.STRIPES);
    for (const s of [0.05, 0.6]) kit.box(u + s, 0.1, 0.04, 0.08, 0.1, 0.06, [0.15, 0.15, 0.16]);
  }
  kit.sign(P.label ?? "WORKS", (u0 + u1) / 2, 0.86, 0.01, { bg: darkOf(P.wall, 0.2), fg: white, texel: 0.045, maxW: u1 - u0 - 0.4 });
}

/** Ground floor along a face, by kind. */
function groundRun(kit: Kit, span: number, g: number, P: Program, kind: Ground, label: string | undefined, k = 0) {
  switch (kind) {
    case "shop":
    case "cafe":
      storefront(kit, 0.06, span - 0.06, g, P, kind, label, k);
      break;
    case "lobby":
      lobby(kit, Math.max(0.1, span / 2 - 1.4), Math.min(span - 0.1, span / 2 + 1.4), g, P);
      break;
    case "homes":
      stoop(kit, span * (kit.rand(P.seed + k, 7) < 0.5 ? 0.3 : 0.7), P);
      if (span > 3.2) stoop(kit, span * 0.5 + (kit.rand(P.seed + k, 8) < 0.5 ? 1.0 : -1.0), P);
      break;
    case "arcade":
      colonnade(kit, 0.25, span - 0.25, 0.25, g, P.wall, false);
      kit.span(0.3, span - 0.3, 0, g - 0.08, -0.08, -0.03, darkOf(P.wall, 0.4), Surf.STORE, { lit: litOf(kit, 0.85) });
      break;
    case "docks":
      docks(kit, 0.1, span - 0.1, P);
      break;
    case "blank":
      if (label && P.signage === "painted") kit.sign(label, span / 2, 0.2, 0.01, { bg: darkOf(P.wall, 0.15), fg: white, texel: 0.06, maxW: span - 0.4 });
      break;
  }
}

/* ───────────────────────── façade extras ───────────────────────── */

function balconies(kit: Kit, span: number, y0: number, floors: number, P: Program, every = 2) {
  const bay = 0.5 + 0.25 * (Math.floor(P.rhythm / 2) % 4);
  const bays = Math.max(1, Math.floor((span - 0.16) / bay));
  const m = (span - bays * bay) / 2;
  const rail: RGB = [0.16, 0.16, 0.18];
  for (let f = 1; f < floors; f++)
    for (let b = f % every; b < bays; b += every) {
      const u = m + b * bay + bay / 2;
      const y = y0 + f * FLOOR + 0.02;
      const hw = Math.min(0.42, bay * 0.6);
      kit.span(u - hw, u + hw, y, y + 0.05, 0, 0.3, trimOf(P.wall));
      kit.span(u - hw, u + hw, y + 0.05, y + 0.23, 0.28, 0.3, rail, Surf.RAIL);
      for (const s of [-1, 1]) kit.span(u + s * hw - 0.01, u + s * hw + 0.01, y + 0.05, y + 0.23, 0, 0.3, rail, Surf.RAIL);
      const r = kit.rand(P.seed * 7 + f, b);
      if (r < 0.35) kit.box(u - hw * 0.6, y + 0.05, 0.18, 0.12, 0.12, 0.12, kit.palette.leaves[r < 0.15 ? 0 : 1]);
      if (r > 0.9) kit.person(u + 0.1, 0.15, { variant: Math.floor(kit.rand(P.seed, f * 11 + b) * 48), y: y + 0.05 });
    }
}

function fireEscape(kit: Kit, u: number, y0: number, floors: number) {
  const iron: RGB = [0.3, 0.3, 0.33];
  for (let f = 1; f < floors; f++) {
    const y = y0 + f * FLOOR - 0.03;
    kit.span(u - 0.42, u + 0.42, y, y + 0.022, 0, 0.26, iron);
    kit.span(u - 0.42, u + 0.42, y + 0.022, y + 0.19, 0.245, 0.26, iron, Surf.RAIL);
    if (f < floors - 1) {
      const dir = f % 2 ? 1 : -1;
      kit.box(u, y + 0.02 + FLOOR / 2 - 0.012, 0.09, Math.hypot(0.62, FLOOR), 0.018, 0.13, iron, Surf.PLAIN, { rotZ: dir * Math.atan2(FLOOR, 0.62) });
    }
  }
}

function bladeSign(kit: Kit, u: number, y: number, text: string, bg: RGB) {
  const t = text.replace(/ /g, "").slice(0, 5);
  const texel = 0.032;
  const h = (t.length * 6 + 3) * texel;
  kit.span(u - 0.02, u + 0.02, y + h - 0.04, y + h - 0.01, 0, 0.36, [0.2, 0.2, 0.22]);
  kit.sign(t, u, y, 0.3, { bg, texel, rotY: Math.PI / 2, vertical: true });
}

/** A façade screen or billboard panel on a face (media). */
function screen(kit: Kit, u0: number, u1: number, y0: number, y1: number, text: string | undefined, accent: RGB) {
  kit.span(u0 - 0.05, u1 + 0.05, y0 - 0.05, y1 + 0.05, 0, 0.06, [0.12, 0.12, 0.14]);
  kit.glow((u0 + u1) / 2, y0, 0.065, u1 - u0, y1 - y0, 0.01, mix(accent, white, 0.15), kit.night ? 1.25 : 0.7);
  if (text) kit.sign(text, (u0 + u1) / 2, y0 + (y1 - y0) * 0.35, 0.075, { bg: darkOf(accent, 0.2), texel: Math.min(0.07, (y1 - y0) / 14), maxW: u1 - u0 - 0.2 });
}

/* ───────────────────────── rooftops ───────────────────────── */

export function rooftop(kit: Kit, x0: number, x1: number, z0: number, z1: number, y: number, P: Program, topside = P.topside) {
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const steel = kit.palette.walls.tech[2];
  const r = (k: number) => kit.rand(P.seed * 13, k);
  // Bulkhead (stair/elevator) at a varying back position, on most roofs.
  if (r(1) < 0.7 && w > 1.6 && d > 1.6) {
    const bx = r(2) < 0.5 ? x0 + 0.55 : x1 - 0.55;
    kit.box(bx, y, z0 + 0.55, 0.7, 0.5, 0.6, P.wall);
    kit.box(bx, y + 0.5, z0 + 0.55, 0.78, 0.05, 0.68, trimOf(P.wall));
    kit.span(bx - 0.13, bx + 0.13, y, y + 0.36, z0 + 0.85, z0 + 0.86, darkOf(P.accent, 0.5));
  }
  switch (topside) {
    case "hvac": {
      const n = 1 + Math.floor(r(3) * 3);
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.6 + r(4 + i) * (w - 1.2);
        const z = z0 + 0.6 + r(14 + i) * (d - 1.2);
        const big = r(24 + i) < 0.4;
        kit.box(x, y, z, big ? 0.8 : 0.5, big ? 0.36 : 0.28, big ? 0.55 : 0.38, steel, Surf.GRILLE);
        if (r(34 + i) < 0.5) kit.box(x + 0.45, y + 0.05, z, 0.5, 0.1, 0.1, steel);
      }
      break;
    }
    case "tank":
      waterTank(kit, r(5) < 0.5 ? x1 - 0.65 : x0 + 0.65, y, z0 + 0.75 + r(6) * Math.max(0, d - 1.5));
      break;
    case "solar": {
      const rows = Math.max(1, Math.floor((d - 1.0) / 0.55));
      for (let i = 0; i < rows; i++) {
        const z = z0 + 0.7 + i * 0.55;
        kit.box(cx, y, z, w - 1.0, 0.08, 0.04, steel);
        kit.box(cx, y + 0.1, z, w - 1.0, 0.025, 0.42, [0.2, 0.25, 0.4], Surf.SOLAR, { rotX: -0.38 });
      }
      break;
    }
    case "terrace": {
      kit.span(x0 + 0.2, x1 - 0.2, y, y + 0.03, cz - 0.1, z1 - 0.2, mix([0.62, 0.45, 0.3], kit.palette.sidewalk, 0.3), Surf.SLABS);
      const n = Math.max(1, Math.floor(w / 1.6));
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.8 + (i * (w - 1.6)) / Math.max(1, n - 1);
        const z = (cz + z1) / 2;
        kit.cyl(x, y, z, 0.24, 0.2, 0.24, white);
        kit.box(x, y, z, 0.03, 0.6, 0.03, [0.3, 0.3, 0.32]);
        kit.part({ mesh: "pyramid", node: kit.node, x, y: y + 0.52, z, w: 0.7, h: 0.17, d: 0.7, color: i % 2 ? P.accent : white, rotY: Math.PI / 4 });
        kit.person(x - 0.25, z + 0.05, { variant: Math.floor(r(80 + i) * 48), pose: "sit", y });
        if (r(90 + i) < 0.5) kit.person(x + 0.3, z - 0.1, { variant: Math.floor(r(95 + i) * 48), y, flip: true });
      }
      planter(kit, x1 - 0.45, z1 - 0.45, P.seed + 5, y);
      if (r(7) < 0.6) for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.32) kit.glow(x, y + 0.46, z1 - 0.12, 0.04, 0.04, 0.04, kit.palette.lamp, kit.night ? 1.8 : 0.3);
      break;
    }
    case "garden": {
      kit.span(x0 + 0.25, x1 - 0.25, y, y + 0.04, z0 + 0.25, z1 - 0.25, kit.palette.grass[1], Surf.GRASS);
      const n = 1 + Math.floor(r(8) * 3);
      for (let i = 0; i < n; i++) shrub(kit, x0 + 0.6 + r(40 + i) * (w - 1.2), z0 + 0.6 + r(50 + i) * (d - 1.2), y + 0.04, 0.6 + r(60 + i) * 0.4);
      if (r(9) < 0.5) tree(kit, cx, cz, P.seed, 0.7, y + 0.04);
      break;
    }
    case "bare":
      break;
  }
  roofClutter(kit, x0, x1, z0, z1, y, P, topside === "terrace" || topside === "garden");
}

/** Service clutter scaled by roof area — vents, skylights, hatches, conduit. */
function roofClutter(kit: Kit, x0: number, x1: number, z0: number, z1: number, y: number, P: Program, backOnly: boolean) {
  const steel = kit.palette.walls.tech[2];
  const w = x1 - x0;
  const zb = backOnly ? (z0 + z1) / 2 - 0.3 : z1 - 0.45;
  const area = Math.max(0, (w - 0.9) * (zb - z0 - 0.45));
  const n = Math.round(area / (1.6 + kit.rand(P.seed, 77) * 2.4));
  for (let i = 0; i < n; i++) {
    const r = kit.rand(P.seed * 17 + i, 1);
    const x = x0 + 0.45 + kit.rand(P.seed * 17 + i, 2) * (w - 0.9);
    const z = z0 + 0.45 + kit.rand(P.seed * 17 + i, 3) * (zb - z0 - 0.45);
    if (r < 0.3) kit.cyl(x, y, z, 0.1, 0.18, 0.1, steel);
    else if (r < 0.5) {
      kit.box(x, y, z, 0.42, 0.06, 0.42, mix(kit.palette.glass, white, 0.3));
      kit.part({ mesh: "prism", node: kit.node, x, y: y + 0.06, z, w: 0.42, h: 0.14, d: 0.42, color: mix(kit.palette.glass, white, 0.15) });
    } else if (r < 0.7) kit.box(x, y, z, 0.32, 0.12, 0.32, darkOf(P.wall, 0.3));
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
  kit.part({ mesh: "pyramid", node: kit.node, x, y: y + 0.91, z, w: 0.56, h: 0.2, d: 0.56, color: darkOf(wood, 0.3), rotY: Math.PI / 8 });
}

export function planter(kit: Kit, x: number, z: number, seed: number, y = 0) {
  kit.box(x, y, z, 0.32, 0.18, 0.32, mix(kit.palette.stone, white, 0.25));
  shrub(kit, x, z, y + 0.16, 0.5 + kit.rand(seed, 2) * 0.2);
}

export function shrub(kit: Kit, x: number, z: number, y: number, s: number) {
  kit.box(x, y, z, 0.34 * s, 0.22 * s, 0.34 * s, kit.palette.leaves[1]);
  kit.box(x + 0.04 * s, y + 0.16 * s, z - 0.03 * s, 0.24 * s, 0.14 * s, 0.24 * s, kit.palette.leaves[0]);
}

export function rooftopBillboard(kit: Kit, x: number, z: number, y: number, text: string, accent: RGB, rot = 0) {
  const steel: RGB = [0.22, 0.22, 0.25];
  kit.frame(x, z, rot, () => {
    for (const s of [-1, 1]) kit.box(s * 0.75, y, 0, 0.05, 0.62, 0.05, steel);
    kit.span(-0.95, 0.95, y + 0.55, y + 0.6, -0.03, 0.03, steel);
    kit.span(-0.95, 0.95, y + 0.6, y + 1.08, -0.04, 0, mix(accent, white, 0.15));
    kit.sign(text, 0, y + 0.66, 0.005, { bg: darkOf(accent, 0.2), texel: 0.045, maxW: 1.7 });
    for (const s of [-1, 1]) kit.glow(s * 0.6, y + 1.1, 0.12, 0.08, 0.04, 0.08, kit.palette.lamp, kit.night ? 1.8 : 0.2);
  });
}

/* ───────────────────────── families ───────────────────────── */

const groundH = (g: Ground) => (g === "homes" ? 0.62 : g === "arcade" ? 0.8 : g === "docks" ? 0.9 : 0.74);

/** The common "street building": one volume, ground floor on its fronts, extras, roof. */
function block(kit: Kit, x0: number, x1: number, z0: number, z1: number, floors: number, P: Program, fronts: Side[], opts: { roof?: RoofFamily; wall?: RGB; label?: string; k?: number; cornice?: Vol["cornice"] } = {}) {
  const g = groundH(P.ground);
  const wall = opts.wall ?? P.wall;
  const H = g + floors * FLOOR;
  const roof = opts.roof ?? P.roof;
  const Q = { ...P, wall };
  kit.span(x0, x1, 0, g, z0, z1, darkOf(wall, 0.12), P.ground === "homes" ? Surf.FRAMED : Surf.PLAIN, { variant: P.rhythm & 1, lit: litOf(kit, 0.45) });
  const top = volume(kit, { x0, x1, z0, z1, y0: g, y1: H, wall, surf: surfOf(P), variant: P.rhythm, lit: litOf(kit), roof, roofColor: P.roofColor, cornice: opts.cornice ?? (P.style === "classic" ? "heavy" : P.style === "modern" || P.style === "tech" ? "none" : "light") });
  kit.span(x0 - 0.03, x1 + 0.03, g - 0.03, g + 0.03, z0 - 0.03, z1 + 0.03, trimOf(wall));
  fronts.forEach((side, i) =>
    face(kit, x0, x1, z0, z1, side, (span) => {
      groundRun(kit, span, g, Q, i === 0 ? P.ground : (P.ground2 ?? P.ground), i === 0 ? (opts.label ?? P.label) : P.label2, (opts.k ?? 0) + i);
      if (i === 0) {
        if (P.signage === "blade" && opts.label !== "" && span > 2) bladeSign(kit, span - 0.25, g + 0.12, opts.label ?? P.label ?? "", P.accent);
        if (P.signage === "screen" && floors >= 3) screen(kit, span * 0.18, span * 0.82, g + FLOOR * 0.6, g + FLOOR * Math.min(floors - 0.5, 3.2), P.brand ?? P.label, P.accent);
        if (P.style === "retro" && floors >= 3 && kit.rand(P.seed + (opts.k ?? 0), 11) < 0.2) fireEscape(kit, span * 0.5, g, floors);
      }
    }),
  );
  if (top.deck !== null) rooftop(kit, x0, x1, z0, z1, top.deck, Q);
  if (P.signage === "billboard" && top.deck !== null && kit.rand(P.seed + (opts.k ?? 0), 13) < 0.7 && (P.label || P.brand)) rooftopBillboard(kit, (x0 + x1) / 2, z1 - 0.5, top.deck, (P.label ?? P.brand)!, P.accent);
  return top.top;
}

export function building(kit: Kit, w: number, d: number, P: Program): number {
  const x0 = -w / 2;
  const x1 = w / 2;
  const z0 = -d / 2;
  const z1 = d / 2;
  switch (P.family) {
    case "kiosk":
      return kiosk(kit, w, d, P);
    case "walkup":
      return block(kit, x0, x1, z0, z1, P.floors, P, ["front"]);
    case "corner": {
      const top = block(kit, x0, x1, z0, z1, P.floors, P, ["front", "right"]);
      const g = groundH(P.ground);
      const H = g + P.floors * FLOOR;
      if (P.corner === "turret") turret(kit, x1, z1, g, H + 0.3, P.wall, P.roofColor, 1.0);
      else if (P.corner === "round") kit.cyl(x1 - 0.5, 0, z1 - 0.5, 1.4, H, 1.4, P.wall, { surf: Surf.BANDS, lit: litOf(kit) });
      return Math.max(top, H + 1);
    }
    case "rows": {
      // An attached series: each unit its own width, height, roof and shop.
      const n = Math.max(2, P.units ?? Math.round(w / 1.6));
      let x = x0;
      let top = 0;
      for (let i = 0; i < n; i++) {
        const uw = i === n - 1 ? x1 - x : (w / n) * (0.8 + kit.rand(P.seed, i) * 0.4);
        const floors = Math.max(1, P.floors + Math.round((kit.rand(P.seed, 20 + i) - 0.5) * 3));
        const roof: RoofFamily = P.roof === "gable" ? (kit.rand(P.seed, 30 + i) < 0.7 ? "gable" : "flat") : kit.rand(P.seed, 30 + i) < 0.25 ? "gable" : P.roof;
        const wall = kit.pick(kit.palette.walls[P.style], P.seed, 40 + i);
        const label = i === 0 ? P.label : kit.pick(SHOP_WORDS, P.seed, 50 + i);
        const Q: Program = { ...P, awning: kit.pick(["stripes", "solid", "canopy", "none"] as Awning[], P.seed, 60 + i), seed: P.seed * 7 + i, accent: kit.pick(kit.palette.accents, P.seed, 70 + i) };
        top = Math.max(top, block(kit, x, x + uw - 0.02, z0 + (i % 2 ? 0.12 : 0), z1, floors, Q, ["front"], { roof, wall, label, k: i, cornice: roof === "gable" ? "none" : "light" }));
        x += uw;
      }
      return top;
    }
    case "apartments": {
      const top = block(kit, x0, x1, z0, z1, P.floors, P, ["front"]);
      const g = groundH(P.ground);
      face(kit, x0, x1, z0, z1, "front", (span) => balconies(kit, span, g, P.floors, P, 2));
      if (P.style === "soft") for (const sx of [x0, x1]) kit.cyl(sx, 0, z1 - 0.45, 0.9, g + P.floors * FLOOR, 0.9, P.wall, { surf: Surf.FRAMED, lit: litOf(kit) });
      return top;
    }
    case "lshape": {
      // Street wing along the front, a wing back along one side, a small garden in the angle.
      const fd = d * 0.5;
      const sw = w * 0.42;
      const left = kit.rand(P.seed, 3) < 0.5;
      const t1 = block(kit, x0, x1, z1 - fd, z1, P.floors, P, ["front"]);
      const wx0 = left ? x0 : x1 - sw;
      const t2 = block(kit, wx0, wx0 + sw, z0, z1 - fd, P.floors + 2, { ...P, ground: "homes" }, [left ? "left" : "right"], { roof: P.roof === "flat" ? "terrace" : P.roof });
      const gx0 = left ? x0 + sw : x0;
      kit.span(gx0 + 0.1, gx0 + w - sw - 0.1, 0, 0.03, z0 + 0.1, z1 - fd - 0.1, kit.palette.grass[1], Surf.GRASS);
      tree(kit, gx0 + (w - sw) / 2, z0 + (d - fd) / 2, P.seed, 0.9);
      return Math.max(t1, t2);
    }
    case "asymmetric": {
      const split = x0 + w * (0.4 + kit.rand(P.seed, 2) * 0.2);
      const tallLeft = kit.rand(P.seed, 3) < 0.5;
      const ta = block(kit, x0, split, z0, z1, tallLeft ? P.floors + 3 : P.floors, P, ["front"], { roof: tallLeft ? P.roof : "terrace", k: 0 });
      const tb = block(kit, split, x1, z0, z1, tallLeft ? P.floors : P.floors + 3, { ...P, facade: P.facade === "framed" ? "bands" : "framed" }, ["front"], { roof: tallLeft ? "terrace" : P.roof, k: 1, label: "" });
      return Math.max(ta, tb);
    }
    case "slab": {
      // Long slab lifted on columns (modern) or on a shop base, ribbon windows, a stair core.
      const g = 0.8;
      const H = g + P.floors * FLOOR;
      const sd = Math.min(d, 2.6);
      const sz0 = z1 - sd;
      if (P.ground === "arcade") {
        for (let x = x0 + 0.3; x <= x1 - 0.2; x += 1.2) for (const z of [sz0 + 0.3, z1 - 0.3]) kit.cyl(x, 0, z, 0.18, g, 0.18, trimOf(P.wall));
        kit.span(x0 + 1.5, x0 + 3.2, 0, g, sz0 + 0.4, z1 - 0.6, darkOf(P.wall, 0.35), Surf.STORE, { lit: litOf(kit, 0.9) });
      } else {
        kit.span(x0, x1, 0, g, sz0, z1, darkOf(P.wall, 0.2));
        face(kit, x0, x1, sz0, z1, "front", (span) => {
          for (let u = 0.1, k = 0; u < span - 2; u += 2.6, k++) storefront(kit, u, u + 2.4, g, { ...P, awning: kit.pick(["solid", "canopy", "stripes"] as Awning[], P.seed, k) }, "shop", kit.pick(SHOP_WORDS, P.seed, k), k);
        });
      }
      const top = volume(kit, { x0, x1, z0: sz0, z1, y0: g, y1: H, wall: P.wall, surf: Surf.BANDS, lit: litOf(kit), roof: "flat", roofColor: P.roofColor, cornice: "none" });
      kit.span(x1 - 0.9, x1 - 0.1, 0, H + 0.6, sz0 - 0.3, sz0 + 0.5, darkOf(P.wall, 0.1));
      if (top.deck !== null) rooftop(kit, x0, x1 - 1, sz0, z1, top.deck, P);
      if (z0 < sz0 - 0.5) plaza(kit, x0, x1, z0, sz0 - 0.3, P.seed, false);
      return H + 0.6;
    }
    case "podiumTower": {
      const g = 0.8;
      const pod = g + 2 * FLOOR;
      kit.span(x0, x1, 0, g, z0, z1, darkOf(P.wall, 0.25));
      const pt = volume(kit, { x0, x1, z0, z1, y0: g, y1: pod, wall: P.wall, surf: Surf.BANDS, lit: litOf(kit, 0.6), roof: "terrace", roofColor: P.roofColor, cornice: "light" });
      face(kit, x0, x1, z0, z1, "front", (span) => groundRun(kit, span, g, P, P.ground, P.label));
      if (P.ground2) face(kit, x0, x1, z0, z1, "right", (span) => groundRun(kit, span, g, P, P.ground2!, P.label2, 1));
      // Tower set back and pushed to one side: an asymmetric silhouette, a terrace on the rest.
      const tw = Math.min(w * 0.55, 3.2);
      const td = Math.min(d * 0.6, 3.2);
      const left = kit.rand(P.seed, 4) < 0.5;
      const tx0 = left ? x0 + 0.3 : x1 - 0.3 - tw;
      const tz0 = z0 + 0.3;
      const H1 = pod + Math.round(P.floors * 0.7) * FLOOR;
      const H2 = pod + P.floors * FLOOR;
      volume(kit, { x0: tx0, x1: tx0 + tw, z0: tz0, z1: tz0 + td, y0: pod, y1: H1, wall: darkOf(P.wall, 0.15), surf: Surf.GLASS, lit: litOf(kit), roof: "none", roofColor: P.roofColor });
      for (let u = tx0; u <= tx0 + tw + 0.01; u += 0.8) kit.box(u, pod, tz0 + td + 0.03, 0.05, H1 - pod, 0.06, trimOf(P.wall));
      const ins = 0.35;
      const crown = volume(kit, { x0: tx0 + ins, x1: tx0 + tw - ins, z0: tz0 + ins, z1: tz0 + td - ins, y0: H1, y1: H2, wall: darkOf(P.wall, 0.15), surf: Surf.GLASS, lit: litOf(kit), roof: P.roof === "spire" || P.roof === "crown" || P.roof === "mansard" || P.roof === "terrace" ? P.roof : "flat", roofColor: P.roofColor, cornice: "none" });
      if (crown.deck !== null) rooftop(kit, tx0 + ins, tx0 + tw - ins, tz0 + ins, tz0 + td - ins, crown.deck, { ...P, topside: "hvac" });
      if (P.brand) kit.sign(P.brand, tx0 + tw / 2, H1 - 0.5, tz0 + td + 0.07, { bg: darkOf(P.accent, 0.25), texel: 0.05, maxW: tw - 0.3 });
      if (pt.deck !== null) rooftop(kit, left ? tx0 + tw + 0.1 : x0, left ? x1 : tx0 - 0.1, z0, z1, pt.deck, { ...P, topside: "terrace" });
      return crown.top;
    }
    case "stepped": {
      const g = 0.8;
      kit.span(x0, x1, 0, g, z0, z1, darkOf(P.wall, 0.2));
      face(kit, x0, x1, z0, z1, "front", (span) => groundRun(kit, span, g, P, P.ground, P.label));
      const tiers = 3;
      let y = g;
      let inset = 0;
      let top = 0;
      for (let t = 0; t < tiers; t++) {
        const f = Math.max(2, Math.round((P.floors / tiers) * (t === 0 ? 1.2 : t === 1 ? 1 : 0.8)));
        const last = t === tiers - 1;
        const v = volume(kit, { x0: x0 + inset, x1: x1 - inset, z0: z0 + inset, z1: z1 - inset, y0: y, y1: y + f * FLOOR, wall: P.wall, surf: surfOf(P), variant: P.rhythm, lit: litOf(kit), roof: last ? P.roof : "terrace", roofColor: P.roofColor, cornice: P.style === "classic" ? "heavy" : "light" });
        if (!last && v.deck !== null) for (let x = x0 + inset + 0.3; x < x1 - inset - 0.2; x += 0.7) kit.box(x, v.deck, z1 - inset - 0.25, 0.2, 0.16, 0.2, kit.palette.leaves[(((t + Math.round(x)) % 2) + 2) % 2]);
        y += f * FLOOR + 0.12;
        inset += Math.min(w, d) * 0.14;
        top = v.top;
        if (last && v.deck !== null) rooftop(kit, x0 + inset - 0.3, x1 - inset + 0.3, z0 + inset - 0.3, z1 - inset + 0.3, v.deck, { ...P, topside: "hvac" });
      }
      if (P.brand) kit.sign(P.brand, 0, y - 0.6, z1 - inset + Math.min(w, d) * 0.14 + 0.02, { bg: darkOf(P.accent, 0.25), texel: 0.045, maxW: w - 2 * inset });
      return top;
    }
    case "narrowTower": {
      plaza(kit, x0, x1, z0, z1, P.seed, false);
      for (let i = 0; i < 3; i++) tree(kit, x0 + 0.6 + i * ((w - 1.2) / 2), z1 - 0.6, P.seed + i, 0.9, 0.02);
      const tw = Math.min(2.2, w * 0.5);
      const tx0 = kit.rand(P.seed, 2) < 0.5 ? x0 + 0.4 : x1 - 0.4 - tw;
      const tz0 = z0 + 0.4;
      const H = 0.8 + P.floors * FLOOR;
      kit.span(tx0, tx0 + tw, 0, 0.8, tz0, tz0 + tw, darkOf(P.wall, 0.3), Surf.STORE, { lit: litOf(kit, 0.9) });
      const v = volume(kit, { x0: tx0, x1: tx0 + tw, z0: tz0, z1: tz0 + tw, y0: 0.8, y1: H, wall: P.wall, surf: P.facade === "curtain" ? Surf.GLASS : Surf.BANDS, lit: litOf(kit), roof: P.roof, roofColor: P.roofColor, cornice: "none" });
      for (const [sx, sz] of [
        [tx0, tz0 + tw],
        [tx0 + tw, tz0 + tw],
        [tx0 + tw, tz0],
      ])
        kit.box(sx, 0.8, sz, 0.1, H - 0.8, 0.1, trimOf(P.wall));
      if (v.deck !== null) {
        kit.box(tx0 + tw / 2, v.deck, tz0 + tw / 2, 0.06, 2.2, 0.06, [0.2, 0.2, 0.22]);
        kit.glow(tx0 + tw / 2, v.deck + 2.2, tz0 + tw / 2, 0.1, 0.1, 0.1, [1, 0.2, 0.2], 2);
      }
      if (P.brand) kit.sign(P.brand, tx0 + tw + 0.03, H - 0.9, tz0 + tw / 2, { bg: darkOf(P.accent, 0.25), texel: 0.04, rotY: Math.PI / 2, vertical: true });
      return v.top;
    }
    case "shed": {
      // Industrial: a long hall with a sawtooth (or gable) roof, an office annex, docks, a stack.
      const hallH = 1.3;
      const ad = Math.min(1.6, d * 0.35);
      volume(kit, { x0, x1, z0, z1: z1 - ad, y0: 0, y1: hallH, wall: P.wall, surf: Surf.PLAIN, roof: P.roof === "gable" ? "gable" : "sawtooth", roofColor: P.roofColor, ridge: "x" });
      face(kit, x0, x1, z0, z1 - ad, "right", (span) => kit.sign(P.label ?? "WORKS", span / 2, hallH - 0.5, 0.01, { bg: darkOf(P.wall, 0.15), fg: white, texel: 0.06, maxW: span - 0.6 }));
      const annex = { ...P, ground: "docks" as Ground };
      block(kit, x0, x1, z1 - ad, z1, 1, annex, ["front"], { roof: "flat", cornice: "none", label: P.label });
      const sx = x1 - 0.7;
      const sz = z0 + 0.7;
      kit.cyl(sx, 0, sz, 0.5, hallH + 2.2, 0.5, mix(kit.palette.walls.retro[0], white, 0.1));
      for (const y of [hallH + 0.8, hallH + 1.8]) kit.cyl(sx, y, sz, 0.56, 0.08, 0.56, white);
      kit.smokeAt(sx, hallH + 2.2, sz);
      return hallH + 2.2;
    }
    case "civic": {
      // Hall with a portico and pediment, a drum and dome — the classic landmark.
      const g = 0.0;
      const H = 0.6 + P.floors * FLOOR;
      const hz1 = z1 - 0.9;
      volume(kit, { x0: x0 + 0.3, x1: x1 - 0.3, z0: z0 + 0.3, z1: hz1, y0: g, y1: H, wall: P.wall, surf: Surf.FRAMED, variant: rhythm({ bay: 1, tall: true }), lit: litOf(kit), roof: "flat", roofColor: P.roofColor, cornice: "heavy" });
      face(kit, x0 + 0.3, x1 - 0.3, z0 + 0.3, hz1, "front", (span) => colonnade(kit, span * 0.25, span * 0.75, 0.45, H - 0.02, P.wall, P.style === "classic" || P.style === "retro"));
      const r = Math.min(w, d) * 0.5;
      const drum: RoofFamily = P.roof === "spire" || P.roof === "crown" || P.roof === "flat" || P.roof === "terrace" || P.roof === "gable" ? P.roof : "dome";
      volume(kit, { x0: -r / 2, x1: r / 2, z0: (z0 + hz1) / 2 - r / 2, z1: (z0 + hz1) / 2 + r / 2, y0: H + 0.12, y1: H + 0.9, wall: P.wall, surf: Surf.FRAMED, variant: rhythm({ tall: true }), lit: litOf(kit), roof: drum, roofColor: P.roofColor });
      for (const s of [-1, 1]) {
        kit.box(s * (w / 2 - 0.5), 0, z1 - 0.3, 0.04, 1.6, 0.04, [0.8, 0.8, 0.82]);
        kit.box(s * (w / 2 - 0.5) + 0.17, 1.38, z1 - 0.3, 0.3, 0.2, 0.02, P.accent);
      }
      if (P.brand) kit.sign(P.brand, 0, H + 0.02, hz1 + 0.6, { bg: darkOf(P.wall, 0.4), texel: 0.03, maxW: w * 0.4 });
      return H + 0.9 + Math.min(w, d) * 0.5;
    }
    case "clocktower": {
      // A hall with a gable roof and a tall square tower: clock faces, belfry, spire.
      const H = 0.62 + P.floors * FLOOR;
      const hallW = w * 0.62;
      const hallRoof: RoofFamily = P.roof === "flat" || P.roof === "terrace" || P.roof === "crown" ? (P.roof === "crown" ? "flat" : P.roof) : "gable";
      block(kit, x0, x0 + hallW, z0, z1, Math.max(2, Math.round(P.floors / 3)), { ...P, ground: "arcade" }, ["front"], { roof: hallRoof, label: "" });
      const ts = Math.min(1.8, w - hallW - 0.2);
      const tx = x0 + hallW + ts / 2 + 0.1;
      const tz = z1 - ts / 2 - 0.2;
      kit.span(tx - ts / 2, tx + ts / 2, 0, H, tz - ts / 2, tz + ts / 2, P.wall, Surf.FRAMED, { variant: rhythm({ brick: P.style !== "modern", tall: true }), lit: litOf(kit, 0.3) });
      const yb = H;
      kit.span(tx - ts / 2 - 0.06, tx + ts / 2 + 0.06, yb, yb + 0.1, tz - ts / 2 - 0.06, tz + ts / 2 + 0.06, trimOf(P.wall));
      kit.frame(tx, tz, 0, () => clockFace(kit, 0, yb - 0.75, ts / 2 + 0.01, ts * 0.62));
      kit.frame(tx, tz, Math.PI / 2, () => clockFace(kit, 0, yb - 0.75, ts / 2 + 0.01, ts * 0.62));
      // Belfry: four piers and a lit lantern.
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        kit.box(tx + sx * (ts / 2 - 0.12), yb + 0.1, tz + sz * (ts / 2 - 0.12), 0.2, 0.6, 0.2, P.wall);
      kit.glow(tx, yb + 0.15, tz, ts * 0.4, 0.4, ts * 0.4, kit.palette.lamp, kit.night ? 1.4 : 0.2);
      volume(kit, { x0: tx - ts / 2, x1: tx + ts / 2, z0: tz - ts / 2, z1: tz + ts / 2, y0: yb + 0.7, y1: yb + 0.8, wall: trimOf(P.wall), surf: Surf.PLAIN, roof: P.roof === "flat" || P.roof === "terrace" || P.roof === "crown" ? P.roof : "spire", roofColor: P.roofColor });
      return yb + 0.8 + ts * 1.6;
    }
    case "courtyard":
      return courtyard(kit, w, d, P);
  }
}

/**
 * Perimeter (courtyard) block: four wings around a garden. Corners are pavilions that rise a
 * floor with the style's roof; on non-classic sites the wings split into segments of different
 * heights, so the block reads as a street of buildings closing a court, not one extrusion.
 */
function courtyard(kit: Kit, w: number, d: number, P: Program): number {
  const x0 = -w / 2;
  const x1 = w / 2;
  const z0 = -d / 2;
  const z1 = d / 2;
  const t = Math.min(3.6, w * 0.28);
  const unified = P.style === "classic";
  kit.span(x0 + t, x1 - t, 0, 0.03, z0 + t, z1 - t, kit.palette.grass[1], Surf.GRASS);
  for (let i = 0; i < 4; i++) tree(kit, x0 + t + 0.8 + kit.rand(P.seed, i) * (w - 2 * t - 1.6), z0 + t + 0.8 + kit.rand(P.seed, i + 9) * (d - 2 * t - 1.6), P.seed + i, 0.9, 0.03);
  const pavilionRoof: RoofFamily = P.style === "classic" ? "mansard" : P.style === "retro" ? "gable" : P.style === "soft" ? "terrace" : "flat";
  let top = 0;
  // Corner pavilions.
  const corners: Array<[number, number, Side[]]> = [
    [x1 - t, z1 - t, ["front", "right"]],
    [x0, z1 - t, ["front"]],
    [x1 - t, z0, ["right"]],
    [x0, z0, ["back"]],
  ];
  corners.forEach(([cx, cz, fronts], k) => {
    const extra = P.style === "modern" || P.style === "tech" ? 2 : 1;
    top = Math.max(top, block(kit, cx, cx + t, cz, cz + t, P.floors + extra, { ...P, ground: k === 0 ? P.ground : k === 1 ? (P.ground2 ?? "shop") : "homes", seed: P.seed + k * 3 }, fronts, { roof: pavilionRoof, k: 10 + k, label: k === 0 ? P.label : k === 1 ? P.label2 : "" }));
  });
  if (P.corner === "turret") turret(kit, x1, z1, 0.6, groundH(P.ground) + (P.floors + 1) * FLOOR + 0.6, P.wall, P.roofColor, 1.2);
  // Wings between them, split into segments.
  const wing = (a: number, b: number, side: Side, k0: number) => {
    const n = unified ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const s0 = a + ((b - a) * i) / n;
      const s1 = a + ((b - a) * (i + 1)) / n;
      const floors = unified ? P.floors : Math.max(2, P.floors + Math.round((kit.rand(P.seed + k0, i) - 0.5) * 3));
      const roof: RoofFamily = unified ? P.roof : kit.rand(P.seed + k0, i + 5) < 0.3 ? "gable" : P.roof === "mansard" ? "flat" : P.roof;
      const Q = { ...P, ground: side === "front" || side === "right" ? (i % 2 ? "homes" : "shop") : "homes", seed: P.seed + k0 * 7 + i, wall: unified ? P.wall : kit.pick(kit.palette.walls[P.style], P.seed + k0, i) } as Program;
      const label = Q.ground === "shop" ? kit.pick(SHOP_WORDS, P.seed + k0, i) : "";
      if (side === "front" || side === "back") {
        const zz0 = side === "front" ? z1 - t : z0;
        top = Math.max(top, block(kit, s0, s1, zz0, zz0 + t, floors, Q, [side], { roof, k: k0 + i, label }));
      } else {
        const xx0 = side === "right" ? x1 - t : x0;
        top = Math.max(top, block(kit, xx0, xx0 + t, s0, s1, floors, Q, [side], { roof, k: k0 + i, label }));
      }
    }
  };
  wing(x0 + t, x1 - t, "front", 20);
  wing(z0 + t, z1 - t, "right", 30);
  wing(x0 + t, x1 - t, "back", 40);
  wing(z0 + t, z1 - t, "left", 50);
  return top;
}

function kiosk(kit: Kit, w: number, d: number, P: Program): number {
  const kw = Math.min(w, 1.5);
  const kd = Math.min(d, 1.0);
  kit.span(-kw / 2, kw / 2, 0, 0.55, -kd / 2, kd / 2, P.wall);
  kit.span(-kw / 2 - 0.08, kw / 2 + 0.08, 0.55, 0.62, -kd / 2 - 0.08, kd / 2 + 0.08, trimOf(P.wall));
  face(kit, -kw / 2, kw / 2, -kd / 2, kd / 2, "front", (span) => {
    kit.span(0.1, span - 0.1, 0.12, 0.42, -0.03, 0.02, darkOf(P.wall, 0.4), Surf.STORE, { lit: litOf(kit, 0.9) });
    for (let i = 0; i < 5; i++) kit.span(0.15 + i * 0.25, 0.33 + i * 0.25, 0.12, 0.34, 0.02, 0.05, kit.pick([P.accent, [0.95, 0.85, 0.3], [0.3, 0.55, 0.9], white] as RGB[], P.seed, i));
    kit.box(span / 2, 0.3, 0.18, span + 0.1, 0.025, 0.34, P.accent, Surf.STRIPES, { rotX: 0.5 });
    if (P.label) kit.sign(P.label, span / 2, 0.62, 0.0, { bg: darkOf(P.accent, 0.3), texel: 0.03, maxW: span });
  });
  return 0.62;
}

/** Shop names for attached rows (the generator would use the units' own link labels). */
const SHOP_WORDS = ["Deli", "Books", "Shoes", "Bar", "Tea", "Flowers", "Ramen", "Optics", "Tacos", "Records", "Bikes", "Bakery", "Wine", "Laundry", "Toys", "Barber"];
