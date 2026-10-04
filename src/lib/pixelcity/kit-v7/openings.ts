// FROZEN: detail kit after the intra-territory composition pass (baseline of the program differentiation pass). Do not edit.
/**
 * Openings depth: a window or a shopfront reads as an OPENING in the wall, not a painted square.
 *
 * The surface grammar (surface.ts) already decided where openings are (bays, patterns, zones);
 * this file only decides how deep they look and how they are framed, and the shader draws it.
 * Nothing here is geometry: one part per façade zone, as before. Anatomy, outside → inside:
 *
 *   WALL     the façade surface (the zone's own colour and pattern)
 *   FRAME    on the wall plane: an architrave ring, a lintel, or nothing (STYLE)
 *   SILL     a ledge under the opening, with its 1-px shadow on the wall (STYLE)
 *   REVEAL   the side and bottom faces of the recess that the camera sees, each lit by its own
 *            orientation to the sun (DEPTH: PROGRAM)
 *   GLAZING  the glass at the back of the recess: sash and mullions on that plane, and the shadow
 *            the lintel and one jamb cast on it (sun direction)
 *
 * The recess is a parallax box solved per fragment: the reveal widths are depth × (view ratio),
 * the cast shadow is depth × (sun ratio), both snapped to whole render pixels, and a recess
 * thinner than one pixel at the current zoom is drawn flush (City View gets no new detail).
 */
import type { Anatomy } from "./surface";

export type OpeningDepth = "flush" | "shallow" | "medium" | "deep";
export type OpeningFrame = "architrave" | "lintel" | "clean" | "minimal";
export type Glazing = "punched" | "ribbon" | "curtain" | "shopfront";

export interface OpeningTreatment {
  glazing: Glazing;
  depth: OpeningDepth;
  frame: OpeningFrame;
  sill: boolean;
  /** Sash / mullion colour on the glass plane. */
  sash: "light" | "dark";
  /** Which decision came from where (inspector / trace). */
  source: string[];
}

/** Recess depth in world units (1 tile = 1; a floor is 0.5). */
export const DEPTH_M: Record<OpeningDepth, number> = { flush: 0, shallow: 0.04, medium: 0.06, deep: 0.085 };
/** The recess never takes more than this share of the opening's half width (narrow windows stay windows). */
export const MAX_DEPTH_OF_HALF_WIDTH = 0.55;
/** Recess drawn only when a render pixel is smaller than this (Street View and closer). */
export const NEAR_PX = 0.024;

/* Variant bits, above everything the frozen kits use (kit-v5's largest variant is 788). */
export const OPENING = 1024;
const FRAME_CODE: Record<OpeningFrame, number> = { architrave: 0, lintel: 1, clean: 2, minimal: 3 };
const DEPTH_CODE: Record<OpeningDepth, number> = { flush: 0, shallow: 1, medium: 2, deep: 3 };
export const FRAME_BIT = 2048; // 2 bits
export const DEPTH_BIT = 8192; // 2 bits
export const SILL_BIT = 32768;
export const DARK_SASH_BIT = 65536;

/** The variant bits for an opening treatment (0 for flush curtain walls: drawn as before). */
export function openingBits(o: OpeningTreatment): number {
  if (o.depth === "flush") return 0;
  return OPENING + FRAME_BIT * FRAME_CODE[o.frame] + DEPTH_BIT * DEPTH_CODE[o.depth] + (o.sill ? SILL_BIT : 0) + (o.sash === "dark" ? DARK_SASH_BIT : 0);
}

/** Decode (for tests and the inspector). */
export function decodeOpening(variant: number): { on: boolean; frame: OpeningFrame; depth: OpeningDepth; sill: boolean; dark: boolean } {
  const v = Math.floor(variant);
  const frames: OpeningFrame[] = ["architrave", "lintel", "clean", "minimal"];
  const depths: OpeningDepth[] = ["flush", "shallow", "medium", "deep"];
  return {
    on: Math.floor(v / OPENING) % 2 === 1,
    frame: frames[Math.floor(v / FRAME_BIT) % 4],
    depth: depths[Math.floor(v / DEPTH_BIT) % 4],
    sill: Math.floor(v / SILL_BIT) % 2 === 1,
    dark: Math.floor(v / DARK_SASH_BIT) % 2 === 1,
  };
}

/**
 * PROGRAM decides the nature of the opening (how deep, whether it is functional); STYLE how it
 * is expressed (frame, sill, sash). Curtain walls stay flush: their glass IS the wall.
 */
export function openingFor(A: Anatomy): OpeningTreatment {
  const st = A.style.split(":")[0];
  const glazing: Glazing = A.body.surf === "bands" ? "ribbon" : A.body.surf === "curtain" ? "curtain" : "punched";
  const source: string[] = [];
  let depth: OpeningDepth;
  if (glazing === "curtain") {
    depth = "flush";
    source.push("depth flush: curtain wall (the glass is the wall)");
  } else if (A.use === "civic" || A.use === "institutional") {
    depth = "deep";
    source.push(`depth deep: ${A.use} — thick, monumental wall`);
  } else if (A.use === "office" || glazing === "ribbon") {
    depth = "shallow";
    source.push(`depth shallow: ${A.use === "office" ? "office" : A.use} ${glazing} glazing, close to the face`);
  } else {
    depth = "medium";
    source.push(`depth medium: ${A.use} punched window`);
  }
  const functional = A.use === "industrial" || A.use === "service";
  let frame: OpeningFrame;
  let sill: boolean;
  let sash: OpeningTreatment["sash"];
  if (functional) {
    frame = "minimal";
    sill = true;
    sash = "dark";
    source.push(`frame minimal + steel sash + sill: ${A.use} — functional opening`);
  } else {
    frame = st === "classic" ? "architrave" : st === "retro" ? "lintel" : st === "tech" ? "minimal" : "clean";
    sill = st === "classic" || st === "retro" || st === "soft";
    sash = st === "modern" || st === "tech" ? "dark" : "light";
    if (glazing === "ribbon") {
      frame = "minimal";
      sill = false;
    }
    source.push(`frame ${frame}${sill ? " + sill" : ""}, ${sash} sash: ${st} style${glazing === "ribbon" ? " (ribbon glazing: no frame)" : ""}`);
  }
  return { glazing, depth, frame, sill, sash, source };
}

/** Shopfronts, lobbies and glazed bases: recessed glazing behind the frame and fascia. */
export const SHOPFRONT: OpeningTreatment = { glazing: "shopfront", depth: "medium", frame: "minimal", sill: false, sash: "dark", source: ["shopfront: recessed glazing behind pilasters and fascia"] };

/**
 * The opening rectangles the shader uses for punched windows, in bay coordinates (x across the
 * bay from its centre, y up the floor from its base; a floor is 0.5). Mirrors materials.ts so
 * tests can check that frame, sill and reveal stay inside the bay and the floor.
 */
export function punchedOpening(bayCode: number, o: { pattern: number; tall: boolean; attic: boolean }) {
  const bay = 0.5 + 0.25 * bayCode;
  let hw = bay > 0.6 ? bay * 0.3 : 0.12;
  let y0 = o.tall ? 0.08 : 0.13;
  let y1 = o.tall ? 0.43 : 0.4;
  let cx = 0;
  if (o.pattern === 1) {
    cx = bay * 0.22;
    hw = Math.max(0.055, bay * 0.12);
  }
  if (o.pattern === 2) {
    hw = Math.max(0.07, bay * 0.17);
    y0 = 0.04;
    y1 = 0.46;
  }
  if (o.attic) {
    hw = Math.min(hw, 0.09);
    y0 = 0.17;
    y1 = 0.33;
  }
  return { bay, cx, hw, y0, y1 };
}

/** Frame and sill extents around an opening (world units), as drawn by the shader. */
export const FRAME_W = 0.035;
export const SILL_H = 0.035;
export const SILL_OVER = 0.06;
export const LINTEL_H = 0.045;

/**
 * TypeScript mirror of the shader's pxRecess (materials.ts), for tests: which layer a point of
 * an opening shows. 0 outside, 1 glass, 3 reveal facing the sun, 4 reveal away from it, 5 sash.
 */
export function recessPart(p: [number, number], r: [number, number, number], d: number, v: [number, number, number], l: [number, number, number], px: [number, number]): { part: number; g: [number, number]; shade: number } {
  const snap = (w: number, q: number) => Math.sign(w) * Math.floor(Math.abs(w) / q + 0.5) * q;
  let g: [number, number] = [p[0], p[1]];
  let shade = 1;
  if (Math.abs(p[0]) > r[0] || p[1] < r[1] || p[1] > r[2]) return { part: 0, g, shade };
  if (d < 0.9 * px[0]) return { part: 1, g, shade };
  const o = [snap((d * v[0]) / Math.max(v[2], 0.08), px[0]), snap((d * v[1]) / Math.max(v[2], 0.08), px[1])];
  g = [p[0] - o[0], p[1] - o[1]];
  const outX = Math.abs(g[0]) > r[0];
  const outY = g[1] < r[1] || g[1] > r[2];
  if (outX || outY) {
    const tx = o[0] > 0 ? (p[0] + r[0]) / o[0] : o[0] < 0 ? (r[0] - p[0]) / -o[0] : 2;
    const ty = o[1] > 0 ? (p[1] - r[1]) / o[1] : o[1] < 0 ? (r[2] - p[1]) / -o[1] : 2;
    const sun = outX && (!outY || tx < ty) ? (o[0] > 0 ? l[0] : -l[0]) : o[1] > 0 ? l[1] : -l[1];
    return { part: sun > 0.12 ? 3 : 4, g, shade };
  }
  if (l[2] > 0.05) {
    const e = [g[0] + snap((d * l[0]) / l[2], px[0]), g[1] + snap((d * l[1]) / l[2], px[1])];
    if (Math.abs(e[0]) > r[0] || e[1] > r[2] || e[1] < r[1]) shade = 0.6;
  } else shade = 0.8;
  if (Math.abs(g[0]) > r[0] - px[0] || g[1] < r[1] + px[1] || g[1] > r[2] - px[1]) return { part: 5, g, shade };
  return { part: 1, g, shade };
}
