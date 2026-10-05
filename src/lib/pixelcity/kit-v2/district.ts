// FROZEN: detail kit after the massing pass + real-page validation (baseline of the semantic allocation pass). Do not edit.
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { Semantics } from "../../semantics/analyze";
import { deriveGrammar, type CityGrammar, type TimeOfDay } from "../grammar";
import { buildGamePalette } from "../palette";
import { Surf, type Part, type PixelCity } from "../types";
import { blockFor, landmarkFamily, programFor, type Brief, type BlockKind } from "./brief";
import { building, type Program } from "./buildings";
import { Kit, type PeopleMode } from "./core";
import { plaza } from "./massing";
import { bench, bin, bollards, busShelter, hydrant, mailbox, meter, newsBoxes, SIDEWALK_H, streetLamp, streetSurfaces, streetTree, trafficSignal, tree, type Grid } from "./street";
import { vehicle, type VehicleType } from "./vehicles";

export type ProfileName = "mixed" | "portal" | "product" | "reference";

export interface Profile {
  identity: Partial<SiteFingerprint>;
  majors: Brief[];
  minors: Brief[];
}

const L = (label: string): Partial<Brief> => ({ label });
const minor = (content: Brief["content"], weight: number, repeat = 0, label?: string): Brief => ({ role: "minor", content, weight, repeat, label });

export const PROFILES: Record<ProfileName, Profile> = {
  mixed: {
    identity: { legacy: 0.6, type: { serif: 0.35, sans: 0.65, mono: 0 } },
    majors: [
      { role: "landmark", content: "text", weight: 0.2, repeat: 0, ...L("Skyline") },
      { role: "major", content: "media", weight: 0.18, repeat: 4, ...L("Daily") },
      { role: "major", content: "links", weight: 0.15, repeat: 12, ...L("Market") },
      { role: "major", content: "text", weight: 0.2, repeat: 0 },
      { role: "major", content: "action", weight: 0.05, repeat: 0, ...L("Cafe") },
    ],
    minors: [minor("links", 0.03, 0, "Pizza"), minor("text", 0.04), minor("links", 0.02, 4, "Books"), minor("media", 0.03, 0, "Cinema"), minor("text", 0.05), minor("action", 0.01, 0, "News"), minor("links", 0.02, 0, "Ramen"), minor("text", 0.03, 3), minor("structured", 0.02)],
  },
  portal: {
    identity: { legacy: 0.9, type: { serif: 0.1, sans: 0.9, mono: 0 }, hues: [{ h: 42, c: 0.16, l: 0.65 }], depth: 0.25, textDensity: 0.3, linkDensity: 0.9 },
    majors: [
      { role: "landmark", content: "links", weight: 0.05, repeat: 0, ...L("Portal") },
      { role: "major", content: "links", weight: 0.4, repeat: 30, ...L("Feed") },
      { role: "major", content: "links", weight: 0.2, repeat: 30, ...L("Jobs") },
      { role: "major", content: "structured", weight: 0.08, repeat: 0, ...L("Data") },
    ],
    minors: [minor("links", 0.02, 6, "Ask"), minor("links", 0.02, 0, "Show"), minor("links", 0.01, 4, "New"), minor("text", 0.02), minor("links", 0.02, 0, "Past"), minor("action", 0.005, 0, "Login"), minor("links", 0.02, 5, "Best")],
  },
  product: {
    identity: { darkness: 0.9, type: { serif: 0, sans: 0.7, mono: 0.32 }, roundness: 0.2, airiness: 0.5, ornament: 0.6, imagery: 0.8, hues: [{ h: 275, c: 0.15, l: 0.6 }], depth: 0.6, size: 0.6 },
    majors: [
      { role: "landmark", content: "media", weight: 0.25, repeat: 0, ...L("Product") },
      { role: "major", content: "media", weight: 0.2, repeat: 6, ...L("Build") },
      { role: "major", content: "action", weight: 0.05, repeat: 0, ...L("Start") },
      { role: "major", content: "structured", weight: 0.12, repeat: 3, ...L("Pricing") },
      { role: "major", content: "media", weight: 0.15, repeat: 8, ...L("Customers") },
    ],
    minors: [minor("media", 0.05, 0, "Demo"), minor("action", 0.01, 0, "Signup"), minor("text", 0.03), minor("media", 0.04, 0, "Docs"), minor("structured", 0.03)],
  },
  reference: {
    identity: { legacy: 0.1, type: { serif: 0.62, sans: 0.38, mono: 0 }, hues: [{ h: 250, c: 0.06, l: 0.5 }], depth: 0.85, size: 0.8, textDensity: 0.95 },
    majors: [
      { role: "landmark", content: "text", weight: 0.1, repeat: 0, ...L("Archive") },
      { role: "major", content: "text", weight: 0.22, repeat: 0 },
      { role: "major", content: "links", weight: 0.08, repeat: 40, ...L("Index") },
      { role: "major", content: "text", weight: 0.2, repeat: 0 },
      { role: "major", content: "structured", weight: 0.1, repeat: 0, ...L("Tables") },
      { role: "major", content: "text", weight: 0.18, repeat: 0 },
    ],
    minors: [minor("text", 0.05), minor("text", 0.04, 3), minor("links", 0.02, 0, "Books"), minor("text", 0.06), minor("structured", 0.02), minor("text", 0.03)],
  },
};

export interface KitOptions {
  profile?: ProfileName | Profile;
  time?: TimeOfDay;
  people?: PeopleMode;
  seed?: number;
  flat?: boolean;
  trace?: KitTrace;
}

export interface KitTrace {
  grammar?: CityGrammar;
  blocks: Array<{ order: number; i: number; j: number; kind: BlockKind; brief: Brief | null; buildings: TraceBuilding[] }>;
  range: [number, number];
}
export interface TraceBuilding {
  brief: Brief | null;
  P: Program;
  w: number;
  d: number;
  parts: [number, number];
}
let rec: KitTrace["blocks"][number] | null = null;

export function generateKitDistrict(base: SiteFingerprint, o: KitOptions = {}): PixelCity {
  const prof = typeof o.profile === "object" ? o.profile : PROFILES[o.profile ?? "mixed"];
  const fp: SiteFingerprint = { ...base, ...prof.identity, type: { ...base.type, ...(prof.identity.type ?? {}) } };
  const g0 = deriveGrammar(fp);
  const grammar: CityGrammar = { ...g0, time: o.time ?? g0.time };
  const palette = buildGamePalette(fp, grammar);
  const kit = new Kit(palette, o.seed ?? 7, o.people ?? "sprite");

  const B = 14;
  const S = 1.1;
  const R = 2.6;
  const P = B + 2 * S + R;
  const lines = [-2, -1, 0, 1, 2].map((k) => k * P);
  const grid: Grid = { lines, road: R, side: S, block: B, ext: 14 };
  const ground: Part[] = [{ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: 3000, h: 0.3, d: 3000, rotY: 0, color: palette.sidewalk.map((v) => v * 0.9) as RGB, surf: Surf.PAVING, lit: 0, delay: 0 }];
  streetSurfaces(kit, grid);
  const blocksFrom = kit.parts.length;

  const blocks: Array<{ x: number; z: number; i: number; j: number }> = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blocks.push({ x: (lines[i] + lines[i + 1]) / 2, z: (lines[j] + lines[j + 1]) / 2, i, j });
  const prio = (b: { x: number; z: number }) => Math.hypot(b.x, b.z) * 10 + (b.z + b.x) * 0.1;
  blocks.sort((a, b) => prio(a) - prio(b));

  let minorIdx = 0;
  const nextMinor = () => prof.minors[minorIdx++ % prof.minors.length];
  blocks.forEach((blk, bi) => {
    const brief = bi < prof.majors.length ? prof.majors[bi] : null;
    const kind: BlockKind = brief ? blockFor(brief, grammar) : "lots";
    kit.frame(blk.x, blk.z, 0, () => {
      kit.span(-B / 2, B / 2, 0, SIDEWALK_H, -B / 2, B / 2, palette.sidewalk.map((v) => v * 0.94) as RGB, Surf.PAVING);
      rec = o.trace ? { order: bi, i: blk.i, j: blk.j, kind, brief, buildings: [] } : null;
      kit.frame(0, 0, 0, () => composeBlock(kit, kind, brief, B, grammar, bi, nextMinor), SIDEWALK_H);
      if (o.trace && rec) o.trace.blocks.push(rec);
      rec = null;
    });
  });
  if (o.trace) {
    o.trace.grammar = grammar;
    o.trace.range = [blocksFrom, kit.parts.length];
  }

  furniture(kit, lines, B, S, palette);
  intersections(kit, lines, R, P);
  traffic(kit, lines, R, P, palette);

  let parts = kit.parts;
  if (o.flat) {
    const grey: RGB = [0.62, 0.62, 0.66];
    parts = parts.filter((q) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow").map((q) => ({ ...q, color: q.y + q.h > SIDEWALK_H + 0.3 ? grey : q.color, surf: Surf.PLAIN, variant: 0, lit: 0 }));
  }
  let maxHeight = 1;
  for (const q of parts) maxHeight = Math.max(maxHeight, q.y + q.h);
  const semantics: Semantics = { siteName: "", regions: [], regionOf: new Int32Array(0), hero: -1, nav: -1, brand: -1, footer: -1, main: -1, districts: [], sidebars: [], ctas: [] };
  const extent = lines[lines.length - 1] * 2 + R;
  return {
    frame: "world",
    scenery: ground,
    worldRoads: [],
    worldExtent: extent,
    fingerprint: fp,
    semantics,
    siteName: "",
    zones: [],
    influences: [],
    rail: null,
    entrance: [0, 0],
    grammar,
    palette,
    size: { w: extent * 0.6, d: extent * 0.6 },
    parts,
    roads: [],
    buildings: [],
    images: [],
    signs: o.flat ? [] : kit.signs,
    signAtlas: kit.signAtlas,
    maxHeight,
    smokestacks: o.flat ? [] : kit.smoke,
    buildDuration: 0,
  };
}

interface Lot {
  x: number;
  z: number;
  w: number;
  d: number;
  rot: number;
  corner: boolean;
}

function perimeterLots(B: number, Ld: number, split: number): Lot[] {
  const c = B / 2 - Ld / 2;
  const lots: Lot[] = [
    { x: c, z: c, w: Ld, d: Ld, rot: 0, corner: true },
    { x: -c, z: c, w: Ld, d: Ld, rot: -Math.PI / 2, corner: true },
    { x: -c, z: -c, w: Ld, d: Ld, rot: Math.PI, corner: true },
    { x: c, z: -c, w: Ld, d: Ld, rot: Math.PI / 2, corner: true },
  ];
  const mid = B - 2 * Ld;
  for (let k = 0; k < split; k++) {
    const off = -mid / 2 + (mid / split) * (k + 0.5);
    const w = mid / split;
    lots.push({ x: off, z: c, w, d: Ld, rot: 0, corner: false }, { x: c, z: -off, w, d: Ld, rot: Math.PI / 2, corner: false }, { x: -off, z: -c, w, d: Ld, rot: Math.PI, corner: false }, { x: -c, z: off, w, d: Ld, rot: -Math.PI / 2, corner: false });
  }
  return lots;
}

function place(kit: Kit, lot: Lot, P: Program, brief: Brief | null = null) {
  kit.frame(lot.x, lot.z, lot.rot, () => build(kit, lot.w - 0.08, lot.d - 0.08, P, brief));
}

function build(kit: Kit, w: number, d: number, P: Program, brief: Brief | null) {
  const from = kit.parts.length;
  const top = building(kit, w, d, P);
  rec?.buildings.push({ brief, P, w, d, parts: [from, kit.parts.length] });
  return top;
}

function courtyardGarden(kit: Kit, B: number, Ld: number, seed: number) {
  kit.span(-B / 2 + Ld, B / 2 - Ld, 0, 0.02, -B / 2 + Ld, B / 2 - Ld, kit.palette.grass[1], Surf.GRASS);
  for (let t = 0; t < 3; t++) tree(kit, (kit.rand(seed, t) - 0.5) * (B - 2 * Ld - 1), (kit.rand(seed, t + 9) - 0.5) * (B - 2 * Ld - 1), seed * 7 + t, 0.9, 0.02);
}

function composeBlock(kit: Kit, kind: BlockKind, brief: Brief | null, B: number, g: CityGrammar, bi: number, nextMinor: () => Brief) {
  const p = kit.palette;
  const seed = 1000 + bi * 37;
  switch (kind) {
    case "lots": {
      const Ld = 4.2 + kit.rand(seed, 1) * 0.8;
      courtyardGarden(kit, B, Ld, seed);
      perimeterLots(B, Ld, kit.rand(seed, 2) < 0.6 ? 2 : 1).forEach((lot, k) => {
        const m = nextMinor();
        place(kit, lot, programFor(m, g, p, kit, bi * 50 + k, lot.corner), m);
      });
      return;
    }
    case "market": {
      courtyardGarden(kit, B, 4.0, seed);
      perimeterLots(B, 4.0, 1).forEach((lot, k) => place(kit, lot, programFor({ role: "minor", content: "links", weight: 0.03, repeat: lot.corner ? 0 : brief?.repeat ?? 6, label: k === 0 ? brief?.label : undefined }, g, p, kit, bi * 50 + k, lot.corner), brief));
      return;
    }
    case "court": {
      const P0 = programFor({ ...(brief as Brief), role: "minor", content: "text", weight: 0.04 }, g, p, kit, bi * 50);
      build(kit, B - 0.2, B - 0.2, { ...P0, family: "courtyard", floors: Math.max(3, P0.floors + 1), corner: g.style === "classic" ? "turret" : undefined, ground: "shop", ground2: "cafe", roof: g.style === "classic" ? "mansard" : P0.roof === "mansard" ? "flat" : P0.roof, topside: g.style === "soft" ? "garden" : P0.topside === "garden" ? "hvac" : P0.topside }, brief);
      return;
    }
    case "towers": {
      const P0 = programFor({ ...(brief as Brief), role: "minor", content: "media", weight: 0.1 }, g, p, kit, bi * 50);
      plaza(kit, -B / 2, B / 2, -B / 2, B / 2, seed, false, [-B / 2, -B / 2 + 8.4, -B / 2, -B / 2 + 8.4]);
      kit.frame(-B / 2 + 4.2, -B / 2 + 4.2, 0, () => build(kit, 8, 8, { ...P0, family: "podiumTower", floors: 9 + Math.round(g.verticality * 8), brand: brief?.label?.toUpperCase(), roof: g.style === "tech" ? "crown" : "flat" }, brief));
      const lot: Lot = { x: B / 2 - 2.6, z: B / 2 - 2.6, w: 5, d: 5, rot: 0, corner: true };
      place(kit, lot, programFor({ role: "minor", content: "media", weight: 0.08, repeat: 0, label: brief?.label }, g, p, kit, bi * 50 + 1, true), brief);
      for (let t = 0; t < 4; t++) tree(kit, -B / 2 + 1 + t * 1.6, B / 2 - 0.9, seed + t, 0.9, 0.02);
      return;
    }
    case "slabs": {
      const P0 = programFor({ ...(brief as Brief), role: "minor", content: "structured", weight: 0.04 }, g, p, kit, bi * 50);
      plaza(kit, -B / 2, B / 2, -B / 2, B / 2, seed, false, [-B / 2, B / 2, B / 2 - 4.4, B / 2]);
      const lotA: Lot = { x: 0, z: B / 2 - 2.2, w: B - 0.4, d: 4.2, rot: 0, corner: false };
      const lotB: Lot = { x: B / 2 - 2.2, z: -1.6, w: B - 3.6, d: 4.2, rot: Math.PI / 2, corner: false };
      place(kit, lotA, { ...P0, family: "slab", floors: 5 + Math.round(g.verticality * 3), ground: g.style === "modern" ? "arcade" : "shop" }, brief);
      place(kit, lotB, { ...P0, family: "slab", floors: 7 + Math.round(g.verticality * 3), ground: "arcade", seed: P0.seed + 3 }, brief);
      for (let t = 0; t < 5; t++) tree(kit, -B / 2 + 1.2 + t * 2, -B / 2 + 1.5 + kit.rand(seed, t) * 4, seed + t, 1, 0.02);
      return;
    }
    case "works": {
      const P0 = programFor({ ...(brief as Brief), role: "minor", content: "structured", weight: 0.1 }, g, p, kit, bi * 50);
      kit.span(-B / 2, B / 2, 0, 0.02, -B / 2, B / 2, mix(p.road, p.sidewalk, 0.5), Surf.PAVING);
      place(kit, { x: -1.5, z: B / 2 - 3.2, w: B - 3.4, d: 6.2, rot: 0, corner: false }, { ...P0, family: "shed", label: brief?.label?.toUpperCase() }, brief);
      place(kit, { x: B / 2 - 2.6, z: -2.4, w: 7.5, d: 5, rot: Math.PI / 2, corner: false }, { ...P0, family: "shed", roof: "gable", seed: P0.seed + 5, label: undefined }, brief);
      const cs: RGB[] = [p.accents[0], p.accents[1], [0.55, 0.3, 0.2], [0.3, 0.45, 0.55]];
      for (let k = 0; k < 6; k++) kit.box(-B / 2 + 1.5 + (k % 3) * 1.6, (k >= 3 ? 0.42 : 0), -B / 2 + 1.6, 1.4, 0.42, 0.55, cs[k % cs.length], Surf.STRIPES);
      return;
    }
    case "plaza": {
      plaza(kit, -B / 2, B / 2, -B / 2, B / 2, seed, true);
      const P0 = programFor({ ...(brief as Brief), role: "minor", content: "action", weight: 0.01 }, g, p, kit, bi * 50);
      for (const [x, z] of [
        [-3.5, 2.5],
        [3.5, -2.5],
      ])
        kit.frame(x, z, 0, () => build(kit, 1.6, 1.1, { ...P0, family: "kiosk" }, brief));
      for (let k = 0; k < 14; k++)
        kit.person((kit.rand(seed, k) - 0.5) * (B - 2), (kit.rand(seed, k + 50) - 0.5) * (B - 2), { variant: Math.floor(kit.rand(seed, k + 99) * 48), pose: kit.rand(seed, k + 70) < 0.5 ? "walkA" : "stand", flip: k % 2 === 0, y: 0.02 });
      for (let k = 0; k < 4; k++) bench(kit, -2 + k * 1.3, -0.2 + (k % 2) * 0.4, k % 2 ? Math.PI : 0);
      return;
    }
    case "civic": {
      const lm = landmarkFamily(g.style);
      plaza(kit, -B / 2, B / 2, -B / 2, B / 2, seed, lm.family !== "narrowTower", [-1.2 - 5, -1.2 + 5, -1.6 - 4.2, -1.6 + 4.2]);
      const P0 = programFor({ ...(brief as Brief), role: "major", content: "text", weight: 0.2 }, g, p, kit, bi * 50);
      const big = lm.family === "civic" || lm.family === "clocktower";
      const w = big ? 9 : 6.5;
      const floors = lm.family === "civic" ? 3 : lm.family === "clocktower" ? 12 : 16 + Math.round(g.verticality * 8);
      kit.frame(-1.2, -1.6, 0, () => build(kit, w, big ? 7 : 6.5, { ...P0, family: lm.family, roof: lm.roof, floors, brand: brief?.label?.toUpperCase(), facade: lm.family === "narrowTower" ? "curtain" : P0.facade, ground: "lobby" }, brief));
      for (let t = 0; t < 4; t++) tree(kit, B / 2 - 1, -B / 2 + 1.5 + t * 3.3, seed + t, 1, 0.02);
      for (let k = 0; k < 8; k++) kit.person(2 + kit.rand(seed, k) * 4, 3 + kit.rand(seed, k + 9) * 3, { variant: Math.floor(kit.rand(seed, k + 19) * 48), pose: k % 3 === 0 ? "walkB" : "stand", flip: k % 2 === 1, y: 0.02 });
      return;
    }
  }
}

function furniture(kit: Kit, lines: number[], B: number, S: number, palette: PixelCity["palette"]) {
  const curbZ = S - 0.32;
  for (let i = 0; i < lines.length - 1; i++)
    for (let j = 0; j < lines.length - 1; j++) {
      const bx = (lines[i] + lines[i + 1]) / 2;
      const bz = (lines[j] + lines[j + 1]) / 2;
      const sides: Array<[number, number, number]> = [
        [bx, bz + B / 2, 0],
        [bx + B / 2, bz, Math.PI / 2],
        [bx, bz - B / 2, Math.PI],
        [bx - B / 2, bz, -Math.PI / 2],
      ];
      sides.forEach(([sx, sz, rot], si) =>
        kit.frame(
          sx,
          sz,
          rot,
          () => {
            const seed = i * 97 + j * 13 + si;
            const busHere = i === 1 && j === 2 && si === 0;
            const step = 1.05 + kit.rand(seed, 1) * 0.35;
            const cadence = 3 + Math.floor(kit.rand(seed, 2) * 2);
            let n = 0;
            for (let u = -B / 2 + 0.9; u <= B / 2 - 0.9; u += step, n++) {
              if (busHere && Math.abs(u) < 1.3) continue;
              if (n % cadence === 0) streetLamp(kit, u, curbZ);
              else if (kit.rand(seed, n + 900) < 0.62) streetTree(kit, u, curbZ - 0.05, seed * 5 + n);
              else {
                const r = kit.rand(seed, n);
                if (r < 0.2) hydrant(kit, u, curbZ);
                else if (r < 0.4) meter(kit, u, curbZ);
                else if (r < 0.55) bin(kit, u, curbZ);
                else if (r < 0.75) bench(kit, u, curbZ - 0.15, Math.PI);
              }
              if (kit.rand(seed, n + 300) < 0.42) {
                const pz = 0.35 + kit.rand(seed, n + 400) * 0.35;
                const pose = kit.rand(seed, n + 500) < 0.5 ? "walkA" : kit.rand(seed, n + 501) < 0.6 ? "walkB" : "stand";
                kit.person(u + 0.4, pz, { variant: Math.floor(kit.rand(seed, n + 600) * 48), pose, flip: kit.rand(seed, n + 700) < 0.5 });
              }
            }
            if (si === 0 && (i + j) % 2 === 0) {
              mailbox(kit, -B / 2 + 0.55, 0.3);
              newsBoxes(kit, B / 2 - 0.9, 0.3);
            }
            if (si === 1 && (i + j) % 2 === 1) bollards(kit, B / 2 - 0.6, curbZ);
            if (busHere) {
              busShelter(kit, 0, 0.62, palette.accents[1], "M5");
              for (let k = 0; k < 3; k++) kit.person(-0.45 + k * 0.32, 0.55 + (k % 2) * 0.12, { variant: 7 + k * 5, pose: k === 1 ? "sit" : "stand", flip: k === 2 });
            }
          },
          SIDEWALK_H,
        ),
      );
    }
}

const STREETS = ["MAIN ST", "1ST AVE"];

function intersections(kit: Kit, lines: number[], R: number, P: number) {
  for (const [ci, cx] of lines.entries())
    for (const [cj, cz] of lines.entries()) {
      if (Math.abs(cx) > P || Math.abs(cz) > P) continue;
      const o = R / 2 + 0.3;
      const goX = (ci + cj) % 2 === 0;
      const centre = ci === 2 && cj === 2;
      kit.frame(
        cx,
        cz,
        0,
        () => {
          trafficSignal(kit, o, o, 0, !goX, centre ? STREETS[0] : undefined);
          trafficSignal(kit, -o, o, -Math.PI / 2, goX);
          trafficSignal(kit, -o, -o, Math.PI, !goX);
          trafficSignal(kit, o, -o, Math.PI / 2, goX, centre ? STREETS[1] : undefined);
        },
        SIDEWALK_H,
      );
      if (centre) {
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.45 + k * 0.25, R / 2 + 0.6 - (k % 2) * 0.2, { variant: 20 + k, pose: "stand", flip: k % 2 === 0, y: SIDEWALK_H });
        for (let k = 0; k < 2; k++) kit.person(-R / 2 - 0.5 - k * 0.3, R / 2 + 0.55, { variant: 30 + k, pose: "stand", y: SIDEWALK_H });
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.4, -0.8 + k * 0.6, { variant: 36 + k, pose: k % 2 ? "walkA" : "walkB", flip: k === 1, y: 0.05 });
      }
    }
}

function traffic(kit: Kit, lines: number[], R: number, P: number, palette: PixelCity["palette"]) {
  const carColors: RGB[] = [palette.accents[0], palette.accents[1], [0.92, 0.92, 0.9], [0.2, 0.22, 0.26], [0.75, 0.2, 0.18], [0.55, 0.6, 0.66]];
  const types: VehicleType[] = ["sedan", "hatch", "sedan", "van", "hatch", "taxi"];
  let vi = 0;
  for (const c of lines)
    for (let k = 0; k < lines.length - 1; k++) {
      const a = lines[k] + R / 2 + 1.6;
      const b = lines[k + 1] - R / 2 - 1.6;
      for (const side of [-1, 1])
        for (let t = a; t < b; t += 1.25) {
          if (kit.rand(vi++, 3) > 0.5) continue;
          if (c === P && side > 0 && Math.abs(t + P / 2) < 2) continue;
          const type = kit.pick(types, vi, 4);
          const color = type === "taxi" ? ([0.98, 0.78, 0.18] as RGB) : kit.pick(carColors, vi, 5);
          const lane = c + side * (R / 2 - 0.32);
          vehicle(kit, t, lane, side > 0 ? 0 : Math.PI, type, color);
          vehicle(kit, lane, t, side > 0 ? -Math.PI / 2 : Math.PI / 2, kit.pick(types, vi, 6), kit.pick(carColors, vi, 7));
        }
    }
  vehicle(kit, R / 2 + 1.6, -0.62, Math.PI, "sedan", palette.accents[2]);
  vehicle(kit, R / 2 + 2.8, -0.62, Math.PI, "taxi", [0.98, 0.78, 0.18]);
  vehicle(kit, -0.62, -0.4, -Math.PI / 2, "hatch", [0.2, 0.55, 0.85]);
  vehicle(kit, -P / 2, P + R / 2 - 0.45, 0, "bus", palette.accents[1]);
  vehicle(kit, P / 2 + 1.5, R / 2 - 0.9, 0, "truck", palette.accents[0], "FRESH");
  kit.person(P / 2 + 0.55, R / 2 - 0.35, { variant: 44, pose: "walkA", y: 0.05 });
}
