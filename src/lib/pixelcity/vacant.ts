import { mix, oklch } from "../city/palette";
import type { RGB } from "../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { Semantics } from "../semantics/analyze";
import { deriveGrammar } from "./grammar";
import { buildGamePalette, type GamePalette } from "./palette";
import { textWidth } from "./pixel-font";
import { blockCentre, generateKitDistrict, newTrace, planFromProfile, type Profile } from "./kit/district";
import { SIDEWALK_H } from "./kit/street";
import { addWorld, type PushFn } from "./scenery";
import { Surf, type Part, type PixelCity, type RoadSeg, type SignSpec } from "./types";

export type VacantStyle = "lot" | "blueprint";

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
const LOT_BLOCK: [number, number] = [2, 2];
export const SITE_CENTRE = blockCentre(LOT_BLOCK[0], LOT_BLOCK[1]);

function siteInCity(fp: SiteFingerprint): PixelCity {
  const plan = planFromProfile(HOME_PROFILE, fp);
  const trace = newTrace();
  const c = generateKitDistrict(fp, { profile: plan, time: "night", trace });
  const palette = c.palette;
  const [bx, bz] = SITE_CENTRE;
  const drop = new Uint8Array(c.parts.length);
  for (const pc of trace.pieces) if (pc.block[0] === LOT_BLOCK[0] && pc.block[1] === LOT_BLOCK[1]) for (let k = pc.parts[0]; k < pc.parts[1]; k++) drop[k] = 1;
  const parts: Part[] = c.parts.filter((_, k) => !drop[k]).map((q) => ({ ...q, node: -1 }));
  const push = (p: Omit<Part, "rotY" | "surf" | "lit" | "delay"> & Partial<Part>) => parts.push({ rotY: 0, surf: Surf.PLAIN, lit: 0, delay: 0, ...p });

  const S = 12.6;
  const y0 = SIDEWALK_H;
  const earth = mix(palette.soil, [0.86, 0.74, 0.55], 0.6);
  push({ mesh: "box", node: -1, x: bx, y: y0, z: bz, w: S, h: 0.03, d: S, color: earth, surf: Surf.SOIL });
  const tape: RGB = oklch(0.8, 0.16, 80);
  const post = palette.walls.tech[1];
  for (let i = 0; i <= 5; i++)
    for (const [x, z] of [
      [bx - S / 2 + (i * S) / 5, bz + S / 2],
      [bx - S / 2 + (i * S) / 5, bz - S / 2],
      [bx + S / 2, bz - S / 2 + (i * S) / 5],
      [bx - S / 2, bz - S / 2 + (i * S) / 5],
    ] as const)
      push({ mesh: "box", node: -1, x, y: y0, z, w: 0.08, h: 0.55, d: 0.08, color: palette.trunk });
  for (const z of [bz + S / 2, bz - S / 2]) push({ mesh: "box", node: -1, x: bx, y: y0 + 0.42, z, w: S, h: 0.05, d: 0.03, color: tape, surf: Surf.STRIPES });
  for (const x of [bx - S / 2, bx + S / 2]) push({ mesh: "box", node: -1, x, y: y0 + 0.42, z: bz, w: 0.03, h: 0.05, d: S, color: tape, surf: Surf.STRIPES });
  for (const [x, z, k] of [
    [bx - S * 0.22, bz - S * 0.24, 1.1],
    [bx - S * 0.3, bz + S * 0.12, 0.8],
  ] as const)
    push({ mesh: "pyramid", node: -1, x, y: y0 + 0.03, z, w: k * 1.6, h: k * 0.7, d: k * 1.6, color: mix(palette.soil, earth, 0.4), rotY: 0.4 });
  for (const [x, z] of [
    [bx - S / 2, bz - S / 2],
    [bx + S / 2, bz - S / 2],
    [bx - S / 2, bz + S / 2],
    [bx + S / 2, bz + S / 2],
  ] as const)
    push({ mesh: "glow", node: -1, x, y: y0 + 0.55, z, w: 0.12, h: 0.12, d: 0.12, color: oklch(0.78, 0.17, 65), lit: 1.6 });

  const ry = Math.PI / 4;
  const [bw, bh, lift] = [6, 2.5, 1.25];
  const ax: [number, number] = [Math.cos(ry), -Math.sin(ry)];
  const nz: [number, number] = [Math.sin(ry), Math.cos(ry)];
  const [sx, sz] = [bx + 2.6, bz + 2.6];
  const bg: RGB = oklch(0.27, 0.035, 262);
  for (const k of [-1, 1]) push({ mesh: "box", node: -1, x: sx + ax[0] * k * (bw / 2 - 0.5) - nz[0] * 0.12, y: y0, z: sz + ax[1] * k * (bw / 2 - 0.5) - nz[1] * 0.12, w: 0.14, h: lift + bh - 0.2, d: 0.14, color: post, rotY: ry });
  push({ mesh: "box", node: -1, x: sx - nz[0] * 0.06, y: y0 + lift - 0.05, z: sz - nz[1] * 0.06, w: bw + 0.12, h: bh + 0.1, d: 0.08, color: bg.map((v) => v * 0.7) as RGB, rotY: ry });
  for (const k of [-1, 0, 1]) {
    const u = k * (bw / 2 - 1);
    push({ mesh: "glow", node: -1, x: sx + ax[0] * u + nz[0] * 0.28, y: y0 + lift - 0.08, z: sz + ax[1] * u + nz[1] * 0.28, w: 0.3, h: 0.09, d: 0.07, color: palette.lamp, lit: 2, rotY: ry });
    push({ mesh: "box", node: -1, x: sx + ax[0] * u + nz[0] * 0.14, y: y0 + lift - 0.06, z: sz + ax[1] * u + nz[1] * 0.14, w: 0.05, h: 0.04, d: 0.28, color: post, rotY: ry });
  }
  const top = c.signs.reduce((m, q) => Math.max(m, q.y + q.h), 0) + 2;
  const spec: SignSpec = { text: "SITE 001\nREADY TO BUILD", bg, fg: oklch(0.97, 0.01, 90), accent: tape, font: "sans", x: 1, y: top, w: 240, h: 100 };
  push({ mesh: "sign", node: -1, x: sx, y: y0 + lift, z: sz, w: bw, h: bh, d: 1, rotY: ry, color: bg, rect: [spec.x, spec.y, spec.w, spec.h], lit: 1 });

  const inLot = ([x, , z]: [number, number, number]) => Math.abs(x - bx) < 7.5 && Math.abs(z - bz) < 7.5;
  return {
    ...c,
    parts,
    signs: [...c.signs, spec],
    signAtlas: { w: Math.max(c.signAtlas.w, 242), h: Math.max(c.signAtlas.h, top + 102) },
    smokestacks: c.smokestacks.filter((p) => !inLot(p)),
    entrance: [0, 0],
  };
}

export function generateVacantWorld(fp: SiteFingerprint, style: VacantStyle): PixelCity {
  if (style === "lot") return siteInCity(fp);
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
