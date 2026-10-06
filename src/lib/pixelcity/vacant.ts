import { oklch } from "../city/palette";
import type { RGB } from "../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { Semantics } from "../semantics/analyze";
import { deriveGrammar } from "./grammar";
import { buildGamePalette, type GamePalette } from "./palette";
import { textWidth } from "./pixel-font";
import { generateKitDistrict, planFromProfile, type Profile } from "./kit/district";
import { addWorld, type PushFn } from "./scenery";
import { Surf, type Part, type PixelCity, type RoadSeg, type SignSpec } from "./types";

export type VacantStyle = "city" | "blueprint";

const SIGN_ATLAS = { w: 512, h: 512 };
const TEXEL = 0.11;
const LOT = { w: 15, d: 18 };

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

const HOME_PROFILE: Profile = {
  identity: { legacy: 0.35, type: { serif: 0.3, sans: 0.7, mono: 0 } },
  majors: [
    { role: "major", content: "links", weight: 0.24, repeat: 12 },
    { role: "major", content: "text", weight: 0.24, repeat: 0 },
    { role: "major", content: "structured", weight: 0.1, repeat: 3 },
    { role: "major", content: "text", weight: 0.18, repeat: 0 },
    { role: "major", content: "links", weight: 0.1, repeat: 8 },
  ],
  minors: [
    { role: "minor", content: "links", weight: 0.04, repeat: 6 },
    { role: "minor", content: "text", weight: 0.05, repeat: 0 },
    { role: "minor", content: "structured", weight: 0.02, repeat: 0 },
    { role: "minor", content: "links", weight: 0.03, repeat: 0 },
    { role: "minor", content: "text", weight: 0.04, repeat: 3 },
  ],
};
function morning(p: GamePalette): GamePalette {
  return {
    ...p,
    sky: { top: oklch(0.6, 0.11, 248), bottom: oklch(0.9, 0.045, 78), stars: false },
    sun: { color: oklch(0.97, 0.055, 78), intensity: 2.7, dir: [-0.62, 0.62, 0.78] },
    ambient: { sky: oklch(0.8, 0.065, 238), ground: oklch(0.66, 0.05, 75), intensity: 0.92 },
  };
}

function homeCity(fp: SiteFingerprint): PixelCity {
  const c = generateKitDistrict(fp, { profile: planFromProfile(HOME_PROFILE, fp), time: "day" });
  return { ...c, parts: c.parts.map((q) => ({ ...q, node: -1 })), palette: morning(c.palette), entrance: [0, 0], atmosphere: { haze: [0.58, 1] } };
}

export function generateVacantWorld(fp: SiteFingerprint, style: VacantStyle): PixelCity {
  if (style === "city") return homeCity(fp);
  const grammar = deriveGrammar(fp);
  const base = buildGamePalette(fp, grammar);
  const palette = blueprintPalette(base);
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

  {
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
  }

  const roads: RoadSeg[] = [
    { x: -1.5, z: back + 2, w: 3, d: D - 2, axis: "z", avenue: true },
    { x: -W / 2, z: front + 0.0, w: W, d: 1, axis: "x", avenue: false },
  ];
  const world = addWorld({ palette, grammar, W, D, front, water: 2, roads, groundSurf: Surf.GRID });
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
