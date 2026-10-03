/**
 * The world before a city: the same land, roads and river the cities sit in, with an empty
 * lot at the origin where the next city will rise. Its palette is the one an empty page gets
 * (neutral daylight), so the site's own light arrives with the site.
 *
 *   "lot"       — a staked dirt lot with a VACANT LOT sign.
 *   "blueprint" — the same place as a surveyor's plan: dark paper, grid, the lot outlined.
 *
 * It has no DOM: nothing here is inspectable, and it never feeds a city's grammar.
 */
import { mix, oklch } from "../city/palette";
import type { RGB } from "../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { Semantics } from "../semantics/analyze";
import { deriveGrammar } from "./grammar";
import { buildGamePalette, type GamePalette } from "./palette";
import { textWidth } from "./pixel-font";
import { addWorld, type PushFn } from "./scenery";
import { Surf, type Part, type PixelCity, type RoadSeg, type SignSpec } from "./types";

export type VacantStyle = "lot" | "blueprint";

const SIGN_ATLAS = { w: 512, h: 512 };
const TEXEL = 0.11;
const LOT = { w: 15, d: 18 };

/** Unclaimed land is quieter than any city: the same palette, desaturated. */
function mutedPalette(p: GamePalette): GamePalette {
  const mute = (c: RGB, k = 0.42): RGB => {
    const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    return mix(c, [l, l, l], k);
  };
  return {
    ...p,
    grass: [mute(p.grass[0]), mute(p.grass[1])],
    leaves: [mute(p.leaves[0], 0.35), mute(p.leaves[1], 0.35)],
    water: mute(p.water, 0.3),
    soil: mute(p.soil, 0.3),
  };
}

function blueprintPalette(p: GamePalette): GamePalette {
  const paper: RGB = oklch(0.33, 0.085, 258);
  const paper2: RGB = oklch(0.36, 0.09, 256);
  const line: RGB = oklch(0.86, 0.05, 240);
  const pale: RGB = oklch(0.62, 0.07, 245);
  const style = (c: RGB[]) => c.map(() => pale);
  return {
    ...p,
    time: "day",
    sky: { top: oklch(0.24, 0.07, 262), bottom: oklch(0.4, 0.08, 250), stars: false },
    sun: { ...p.sun, color: [1, 1, 1], intensity: p.sun.intensity * 0.85 },
    ambient: { sky: oklch(0.7, 0.05, 250), ground: paper, intensity: p.ambient.intensity * 1.15 },
    grass: [paper, paper2],
    soil: oklch(0.42, 0.08, 252),
    soilDark: paper,
    stone: paper,
    road: oklch(0.45, 0.08, 250),
    roadMark: line,
    sidewalk: oklch(0.5, 0.07, 248),
    plaza: oklch(0.5, 0.07, 248),
    walls: Object.fromEntries(Object.entries(p.walls).map(([k, v]) => [k, style(v)])) as GamePalette["walls"],
    roofs: Object.fromEntries(Object.entries(p.roofs).map(([k, v]) => [k, style(v)])) as GamePalette["roofs"],
    accents: [oklch(0.72, 0.16, 35), line, line, line],
    trunk: pale,
    leaves: [oklch(0.56, 0.07, 245), oklch(0.6, 0.07, 240)],
    water: oklch(0.4, 0.1, 245),
    lamp: line,
    ink: oklch(0.85, 0.05, 240),
  };
}

export function generateVacantWorld(fp: SiteFingerprint, style: VacantStyle): PixelCity {
  const grammar = deriveGrammar(fp);
  const base = buildGamePalette(fp, grammar);
  const palette = style === "blueprint" ? blueprintPalette(base) : mutedPalette(base);
  const parts: Part[] = [];
  const push: PushFn = (p) => {
    const part: Part = { rotY: 0, surf: Surf.PLAIN, lit: 0, delay: 0, ...p };
    parts.push(part);
    return part;
  };
  const signs: SignSpec[] = [];
  let shelf = { x: 1, y: 1, h: 0 };
  const sign = (text: string, x: number, y: number, z: number, bg: RGB, fg: RGB, texel = TEXEL) => {
    const lines = text.toUpperCase().split("\n");
    const w = Math.max(...lines.map((l) => textWidth(l))) + 4;
    const h = lines.length * 6 + 3;
    if (shelf.x + w + 1 > SIGN_ATLAS.w) shelf = { x: 1, y: shelf.y + shelf.h + 1, h: 0 };
    const spec: SignSpec = { text: lines.join("\n"), bg, fg, x: shelf.x, y: shelf.y, w, h };
    shelf.x += w + 1;
    shelf.h = Math.max(shelf.h, h);
    signs.push(spec);
    push({ mesh: "sign", node: -1, x, y, z, w: w * texel, h: h * texel, d: 1, color: bg, rect: [spec.x, spec.y, spec.w, spec.h], lit: 1 });
  };

  const { w: W, d: D } = LOT;
  const front = D / 2;
  const back = -D / 2;
  const post = palette.walls.tech[1];
  const blueprint = style === "blueprint";

  if (blueprint) {
    // The lot, drawn: a pale outline, corner pins, a dimension line along the front.
    const line = palette.roadMark;
    const t = 0.12;
    for (const [x, z, w, d] of [
      [0, front, W, t],
      [0, back, W, t],
      [-W / 2, 0, t, D],
      [W / 2, 0, t, D],
    ] as const)
      push({ mesh: "box", node: -1, x, y: 0, z, w: w + t, h: 0.03, d: d + t, color: line });
    for (const [x, z] of [
      [-W / 2, front],
      [W / 2, front],
      [-W / 2, back],
      [W / 2, back],
    ] as const) {
      push({ mesh: "box", node: -1, x, y: 0, z, w: 0.08, h: 1.1, d: 0.08, color: line });
      push({ mesh: "box", node: -1, x: x + 0.18, y: 0.85, z, w: 0.34, h: 0.22, d: 0.04, color: palette.accents[0] });
    }
    for (let i = 0; i <= W; i += 2) push({ mesh: "box", node: -1, x: -W / 2 + i, y: 0, z: front + 1.1, w: 0.06, h: 0.03, d: i % 6 === 0 ? 0.6 : 0.3, color: line });
    push({ mesh: "box", node: -1, x: 0, y: 0, z: front + 1.1, w: W, h: 0.03, d: 0.06, color: line });
    sign(`PLOT 1   ${W} X ${D}`, 0, 0.05, front + 2.2, palette.grass[0], line, TEXEL * 0.9);
  } else {
    // A cleared lot: packed earth, survey stakes, warning tape, a couple of spoil heaps.
    const earth = mix(palette.soil, palette.grass[0], 0.42);
    push({ mesh: "box", node: -1, x: 0, y: 0, z: 0, w: W, h: 0.04, d: D, color: earth, surf: Surf.SOIL });
    const tape: RGB = oklch(0.78, 0.16, 75);
    for (let i = 0; i <= 6; i++) {
      for (const [x, z] of [
        [-W / 2 + (i * W) / 6, front],
        [-W / 2 + (i * W) / 6, back],
      ] as const)
        push({ mesh: "box", node: -1, x, y: 0, z, w: 0.08, h: 0.55, d: 0.08, color: palette.trunk });
    }
    for (let i = 1; i < 7; i++)
      for (const x of [-W / 2, W / 2]) push({ mesh: "box", node: -1, x, y: 0, z: back + (i * D) / 7, w: 0.08, h: 0.55, d: 0.08, color: palette.trunk });
    for (const z of [front, back]) push({ mesh: "box", node: -1, x: 0, y: 0.42, z, w: W, h: 0.05, d: 0.03, color: tape, surf: Surf.STRIPES });
    for (const x of [-W / 2, W / 2]) push({ mesh: "box", node: -1, x, y: 0.42, z: 0, w: 0.03, h: 0.05, d: D, color: tape, surf: Surf.STRIPES });
    for (const [x, z, s] of [
      [W * 0.28, -D * 0.22, 1.2],
      [W * 0.36, -D * 0.1, 0.8],
      [-W * 0.3, D * 0.18, 0.9],
    ] as const)
      push({ mesh: "pyramid", node: -1, x, y: 0.04, z, w: s * 1.6, h: s * 0.7, d: s * 1.6, color: palette.soil, rotY: 0.4 });
    // VACANT LOT sign on two posts, facing the road in.
    for (const s of [-1, 1]) push({ mesh: "box", node: -1, x: 3 + s * 1.3, y: 0, z: front - 0.4, w: 0.1, h: 1.6, d: 0.1, color: post });
    sign("VACANT LOT", 3, 1.0, front - 0.32, oklch(0.96, 0.01, 90), oklch(0.25, 0.03, 260));
  }

  // The same land the cities sit in: an avenue arriving at the lot, a street behind it.
  const roads: RoadSeg[] = [
    { x: -1.5, z: back + 2, w: 3, d: D - 2, axis: "z", avenue: true },
    { x: -W / 2, z: front + 0.0, w: W, d: 1, axis: "x", avenue: false },
  ];
  const world = addWorld({ palette, grammar, W, D, front, water: 2, roads, groundSurf: blueprint ? Surf.GRID : Surf.GRASS });
  const semantics: Semantics = { siteName: "", regions: [], regionOf: new Int32Array(0), hero: -1, nav: -1, brand: -1, footer: -1, main: -1, districts: [], sidebars: [], ctas: [] };
  return {
    frame: "world",
    scenery: world.parts,
    worldRoads: world.roads,
    worldExtent: world.extent,
    fingerprint: fp,
    semantics,
    siteName: "",
    zones: [],
    influences: [],
    rail: null,
    entrance: [0, front],
    grammar,
    palette,
    size: { w: W + 3, d: D + 3 },
    parts,
    roads: [],
    buildings: [],
    images: [],
    signs,
    signAtlas: SIGN_ATLAS,
    maxHeight: 1.6,
    smokestacks: [],
    buildDuration: 0,
  };
}
