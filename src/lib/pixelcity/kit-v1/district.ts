// FROZEN: detail-kit v1 (prototype round 1), kept for before/after comparison. Do not edit.
/**
 * Detail-kit prototype: a district generated with the kit. Nothing here is placed by hand.
 *
 *   grid      road centre lines every P tiles; a central intersection at the origin
 *   blocks    perimeter lots (corners L×L, the edge between them), a courtyard inside
 *   programs  each lot takes the next unit of a page-like list and turns it into a Program
 *             with the same kinds of rules the generator uses (kind, text length, links,
 *             label, grammar style/knobs) — see `programFor`
 *   streets   surfaces, then a furniture pattern along every curb, signals at intersections,
 *             a bus stop, parked and waiting traffic, people
 *
 * The output is an ordinary PixelCity, rendered by the same scene, camera and post.
 */
import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { Semantics } from "../../semantics/analyze";
import { deriveGrammar, type ArchStyle, type CityGrammar, type TimeOfDay } from "../grammar";
import { buildGamePalette, type GamePalette } from "../palette";
import { Surf, type PixelCity } from "../types";
import { building, type BuildingKind, type Program } from "./buildings";
import { Kit, type PeopleMode } from "./core";
import { bench, bin, bollards, busShelter, hydrant, mailbox, meter, newsBoxes, SIDEWALK_H, streetLamp, streetSurfaces, streetTree, trafficSignal, tree, type Grid } from "./street";
import { vehicle, type VehicleType } from "./vehicles";

/** Unit-like records, in reading order — the shape the generator already has for DOM groups. */
interface Unit {
  kind: "tower" | "office" | "shops" | "house" | "rowhouses" | "kiosk";
  label?: string;
  chars: number;
  links?: number;
  cafe?: boolean;
}

const PAGE: Unit[] = [
  { kind: "tower", label: "Skyline", chars: 2600 },
  { kind: "shops", label: "Pizza", chars: 260, links: 7 },
  { kind: "shops", label: "Books", chars: 300, links: 9, cafe: false },
  { kind: "house", chars: 700 },
  { kind: "shops", label: "Cafe", chars: 140, links: 4, cafe: true },
  { kind: "rowhouses", chars: 420 },
  { kind: "office", label: "Daily", chars: 1500 },
  { kind: "shops", label: "Ramen", chars: 220, links: 5 },
  { kind: "house", chars: 900 },
  { kind: "shops", label: "Records", chars: 180, links: 6 },
  { kind: "kiosk", label: "News", chars: 60 },
  { kind: "shops", label: "Bakery", chars: 240, links: 4, cafe: true },
  { kind: "rowhouses", chars: 380 },
  { kind: "shops", label: "Bikes", chars: 200, links: 5 },
  { kind: "house", chars: 600 },
  { kind: "shops", label: "Deli", chars: 160, links: 4 },
  { kind: "shops", label: "Flowers", chars: 150, links: 3, cafe: true },
  { kind: "house", chars: 1100 },
  { kind: "shops", label: "Hotel", chars: 520, links: 8 },
  { kind: "rowhouses", chars: 300 },
  { kind: "shops", label: "Tacos", chars: 140, links: 4 },
  { kind: "shops", label: "Optics", chars: 170, links: 5 },
];

const STREETS = ["MAIN ST", "1ST AVE", "ELM ST", "2ND AVE", "PARK ST"];

/** The mapping a generator would use: unit features + grammar → what the lot hosts. */
function programFor(u: Unit, g: CityGrammar, p: GamePalette, i: number, corner: boolean, kit: Kit): Program {
  const floorsFrom = (min: number, max: number) => Math.max(min, Math.min(max, Math.round(min + Math.log2(1 + u.chars / 200) * 1.2)));
  const styleFor = (pref: ArchStyle[]): ArchStyle => (kit.rand(i, 2) < 0.65 ? pref[0] : pref[Math.floor(kit.rand(i, 3) * pref.length)]);
  const pal = (style: ArchStyle) => kit.pick(p.walls[style], i, 4);
  const accent = p.accents[i % p.accents.length];
  const roofBy = (pref: Program["roof"]): Program["roof"] => (g.industry > 0.5 ? "hvac" : pref);
  const base = { seed: 100 + i * 17, accent };
  let kind: BuildingKind;
  let style: ArchStyle;
  switch (u.kind) {
    case "tower":
      style = "modern";
      return { ...base, kind: "tower", floors: 14, style, wall: pal("modern"), ground: "lobby", roof: "hvac", brand: u.label?.toUpperCase() };
    case "office":
      style = kit.rand(i, 5) < 0.5 ? "modern" : "tech";
      return { ...base, kind: "office", floors: 7, style, wall: pal(style), ground: "lobby", roof: "solar", brand: u.label?.toUpperCase() };
    case "kiosk":
      return { ...base, kind: "kiosk", floors: 0, style: "soft", wall: pal("soft"), ground: "shop", roof: "hvac", label: u.label };
    case "rowhouses":
      return { ...base, kind: "rowhouses", floors: 2, style: "classic", wall: pal("classic"), ground: "homes", roof: "hvac" };
    case "house":
      kind = kit.rand(i, 6) < 0.5 ? "apartments" : "walkup";
      style = kind === "apartments" ? "soft" : styleFor(["classic", "retro", "modern"]);
      return { ...base, kind: corner ? "corner" : kind, floors: floorsFrom(3, 5), style, wall: pal(style), ground: corner ? "shop" : "homes", roof: kind === "apartments" ? "garden" : roofBy("tank") };
    default:
      style = styleFor(["retro", "classic", "soft"]);
      return {
        ...base,
        kind: corner ? "corner" : "walkup",
        floors: floorsFrom(2, 4),
        style,
        wall: pal(style),
        ground: u.cafe ? "cafe" : "shop",
        ground2: "shop",
        label: u.label,
        label2: PAGE[(i + 7) % PAGE.length].label,
        roof: corner ? "terrace" : roofBy(kit.rand(i, 7) < 0.5 ? "tank" : "hvac"),
      };
  }
}

export interface KitOptions {
  time?: TimeOfDay;
  people?: PeopleMode;
  seed?: number;
}

export function generateKitDistrict(fp: SiteFingerprint, o: KitOptions = {}): PixelCity {
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

  // Ground under everything (urban: paving, not grass).
  const ground: PixelCity["scenery"] = [{ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: 3000, h: 0.3, d: 3000, rotY: 0, color: palette.sidewalk.map((v) => v * 0.9) as RGB, surf: Surf.PAVING, lit: 0, delay: 0 }];
  streetSurfaces(kit, grid);

  // ── blocks and lots ──
  const L = 4.6;
  let unit = 0;
  const towerAt = "-1,-1";
  const officeAt = "1,-1";
  for (let i = 0; i < lines.length - 1; i++)
    for (let j = 0; j < lines.length - 1; j++) {
      const bx = (lines[i] + lines[i + 1]) / 2;
      const bz = (lines[j] + lines[j + 1]) / 2;
      const key = `${Math.sign(bx)},${Math.sign(bz)}`;
      const inner = Math.abs(bx) < P && Math.abs(bz) < P;
      kit.frame(
        bx,
        bz,
        0,
        () => {
          // Block land at sidewalk height, a courtyard garden inside.
          kit.span(-B / 2, B / 2, 0, SIDEWALK_H, -B / 2, B / 2, palette.sidewalk.map((v) => v * 0.94) as RGB, Surf.PAVING);
          kit.span(-B / 2 + L, B / 2 - L, SIDEWALK_H, SIDEWALK_H + 0.02, -B / 2 + L, B / 2 - L, palette.grass[1], Surf.GRASS);
          for (let t = 0; t < 3; t++) tree(kit, (kit.rand(i * 9 + j, t) - 0.5) * (B - 2 * L - 1), (kit.rand(i * 9 + j, t + 9) - 0.5) * (B - 2 * L - 1), i * 31 + j * 7 + t, 0.9, SIDEWALK_H);
          const lots: Array<{ x: number; z: number; w: number; d: number; rot: number; corner: boolean; tag: string }> = [];
          const c = B / 2 - L / 2;
          lots.push({ x: c, z: c, w: L, d: L, rot: 0, corner: true, tag: "++" });
          lots.push({ x: -c, z: c, w: L, d: L, rot: -Math.PI / 2, corner: true, tag: "-+" });
          lots.push({ x: -c, z: -c, w: L, d: L, rot: Math.PI, corner: true, tag: "--" });
          lots.push({ x: c, z: -c, w: L, d: L, rot: Math.PI / 2, corner: true, tag: "+-" });
          const mid = B - 2 * L;
          const split = mid > 4 ? 2 : 1;
          for (let k = 0; k < split; k++) {
            const off = -mid / 2 + (mid / split) * (k + 0.5);
            lots.push({ x: off, z: c, w: mid / split, d: L, rot: 0, corner: false, tag: "e+z" });
            lots.push({ x: c, z: -off, w: mid / split, d: L, rot: Math.PI / 2, corner: false, tag: "e+x" });
            lots.push({ x: -off, z: -c, w: mid / split, d: L, rot: Math.PI, corner: false, tag: "e-z" });
            lots.push({ x: -c, z: off, w: mid / split, d: L, rot: -Math.PI / 2, corner: false, tag: "e-x" });
          }
          for (const lot of lots) {
            let P0: Program;
            // The district's two tall buildings stand at the back, where they frame the scene
            // instead of hiding it.
            if (inner && lot.tag === "--" && key === towerAt) P0 = programFor(PAGE[0], grammar, palette, 0, true, kit);
            else if (inner && lot.tag === "+-" && key === officeAt) P0 = programFor(PAGE[6], grammar, palette, 6, true, kit);
            else {
              let u = PAGE[1 + (unit++ % (PAGE.length - 1))];
              if (u.kind === "tower" || u.kind === "office") u = PAGE[1 + (unit++ % (PAGE.length - 1))];
              if (lot.corner && (u.kind === "rowhouses" || u.kind === "kiosk")) u = { kind: "shops", label: "Market", chars: 200, links: 4, cafe: kit.rand(unit, 1) < 0.5 };
              P0 = programFor(u, grammar, palette, unit + i * 5 + j, lot.corner, kit);
            }
            kit.frame(lot.x, lot.z, lot.rot, () => building(kit, lot.w - 0.08, lot.d - 0.08, P0), SIDEWALK_H);
          }
        },
      );
    }

  // ── curbside furniture: one pattern, every block side ──
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
            let n = 0;
            for (let u = -B / 2 + 0.9; u <= B / 2 - 0.9; u += 1.15, n++) {
              if (busHere && Math.abs(u) < 1.3) continue;
              if (n % 3 === 0) streetLamp(kit, u, curbZ);
              else if (n % 3 === 1) streetTree(kit, u, curbZ - 0.05, seed * 5 + n);
              else {
                const r = kit.rand(seed, n);
                if (r < 0.2) hydrant(kit, u, curbZ);
                else if (r < 0.4) meter(kit, u, curbZ);
                else if (r < 0.55) bin(kit, u, curbZ);
                else if (r < 0.75) bench(kit, u, curbZ - 0.15, Math.PI);
              }
              // People on the sidewalk, walking along it.
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

  // ── intersections: signals, street names, people waiting and crossing ──
  for (const [ci, cx] of lines.entries())
    for (const [cj, cz] of lines.entries()) {
      if (Math.abs(cx) > P || Math.abs(cz) > P) continue;
      const o = R / 2 + 0.3;
      const goX = (ci + cj) % 2 === 0;
      kit.frame(cx, cz, 0, () => {
        trafficSignal(kit, o, o, 0, !goX, ci === 2 && cj === 2 ? STREETS[0] : undefined);
        trafficSignal(kit, -o, o, -Math.PI / 2, goX);
        trafficSignal(kit, -o, -o, Math.PI, !goX);
        trafficSignal(kit, o, -o, Math.PI / 2, goX, ci === 2 && cj === 2 ? STREETS[1] : undefined);
      }, SIDEWALK_H);
      if (ci === 2 && cj === 2) {
        // The central crossing: a few people waiting on two corners, a few crossing.
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.45 + k * 0.25, R / 2 + 0.6 - (k % 2) * 0.2, { variant: 20 + k, pose: "stand", flip: k % 2 === 0, y: SIDEWALK_H });
        for (let k = 0; k < 2; k++) kit.person(-R / 2 - 0.5 - k * 0.3, R / 2 + 0.55, { variant: 30 + k, pose: "stand", y: SIDEWALK_H });
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.4, -0.8 + k * 0.6, { variant: 36 + k, pose: k % 2 ? "walkA" : "walkB", flip: k === 1, y: 0.05 });
      }
    }

  // ── traffic: parked along curbs, queued at the central lights, a bus at its stop ──
  const carColors: RGB[] = [palette.accents[0], palette.accents[1], [0.92, 0.92, 0.9], [0.2, 0.22, 0.26], [0.75, 0.2, 0.18], [0.55, 0.6, 0.66]];
  const types: VehicleType[] = ["sedan", "hatch", "sedan", "van", "hatch", "taxi"];
  let vi = 0;
  for (const c of lines)
    for (let k = 0; k < lines.length - 1; k++) {
      const a = lines[k] + R / 2 + 1.6;
      const b = lines[k + 1] - R / 2 - 1.6;
      for (const side of [-1, 1])
        for (let t = a; t < b; t += 1.25) {
          if (kit.rand(vi++, 3) > 0.55) continue;
          // Keep the bus stop clear.
          if (c === P && side > 0 && Math.abs(t + P / 2) < 2) continue;
          const type = kit.pick(types, vi, 4);
          const color = type === "taxi" ? ([0.98, 0.78, 0.18] as RGB) : kit.pick(carColors, vi, 5);
          const lane = c + side * (R / 2 - 0.32);
          // x-roads (cars along x) and z-roads (cars along z), parked facing traffic direction.
          vehicle(kit, t, lane, side > 0 ? 0 : Math.PI, type, color);
          vehicle(kit, lane, t, side > 0 ? -Math.PI / 2 : Math.PI / 2, kit.pick(types, vi, 6), kit.pick(carColors, vi, 7));
        }
    }
  // Queue at the central lights, a car in the box, the bus at the stop, a delivery double-parked.
  vehicle(kit, R / 2 + 1.6, -0.62, Math.PI, "sedan", palette.accents[2]);
  vehicle(kit, R / 2 + 2.8, -0.62, Math.PI, "taxi", [0.98, 0.78, 0.18]);
  vehicle(kit, -0.62, -0.4, -Math.PI / 2, "hatch", [0.2, 0.55, 0.85]);
  vehicle(kit, -P / 2, P + R / 2 - 0.45, 0, "bus", palette.accents[1]);
  vehicle(kit, P / 2 + 1.5, R / 2 - 0.9, 0, "truck", palette.accents[0], "FRESH");
  kit.person(P / 2 + 0.55, R / 2 - 0.35, { variant: 44, pose: "walkA", y: 0.05 });

  let maxHeight = 1;
  for (const q of kit.parts) maxHeight = Math.max(maxHeight, q.y + q.h);
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
    parts: kit.parts,
    roads: [],
    buildings: [],
    images: [],
    signs: kit.signs,
    signAtlas: kit.signAtlas,
    maxHeight,
    smokestacks: [],
    buildDuration: 0,
  };
}

