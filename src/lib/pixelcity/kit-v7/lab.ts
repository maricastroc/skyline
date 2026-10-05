// FROZEN: detail kit after the intra-territory composition pass (baseline of the program differentiation pass). Do not edit.
import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import { deriveGrammar, type ArchStyle, type TimeOfDay } from "../grammar";
import { buildGamePalette, type GamePalette } from "../palette";
import { Surf, type Part, type PixelCity, type SignSpec } from "../types";
import type { Awning, Family, Ground, Program, Signage, Topside } from "./buildings";
import type { RoofFamily } from "./massing";
import type { Anatomy, Use } from "./surface";

export type LabSet = "programs" | "corners" | "roofs" | "styles" | "sizes" | "openings";
export const LAB_SETS: LabSet[] = ["programs", "corners", "roofs", "styles", "sizes", "openings"];
export type LabLight = "default" | "front" | "side" | "shadow";
const SUN: Record<Exclude<LabLight, "default">, [number, number, number]> = {
  front: [0.2, 0.7, 1.0],
  side: [-1.0, 0.55, 0.18],
  shadow: [-0.3, 0.8, -0.7],
};

export interface LabKit {
  Kit: new (palette: GamePalette, seed: number) => { parts: Part[]; signs: SignSpec[]; signAtlas: { w: number; h: number }; frame<T>(x: number, z: number, rot: number, fn: () => T, y?: number): T; span(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: RGB, surf?: number): unknown; sign(text: string, x: number, y: number, z: number, o: { bg: RGB; fg?: RGB; texel?: number; rotY?: number; maxW?: number }): number; anatomies?: Anatomy[]; smoke: Array<[number, number, number]> };
  building: (kit: never, w: number, d: number, P: Program) => number;
}

export const USES: Use[] = ["residential", "commercial", "office", "civic", "institutional", "industrial", "service"];

interface Cell {
  label: string;
  P: Program;
  w: number;
  d: number;
}

const GROUND: Record<Use, Ground> = { residential: "homes", commercial: "shop", office: "lobby", civic: "lobby", institutional: "lobby", industrial: "docks", service: "blank", kiosk: "shop" };
const SIGNAGE: Record<Use, Signage> = { residential: "plaque", commercial: "shop", office: "plaque", civic: "plaque", institutional: "plaque", industrial: "painted", service: "none", kiosk: "shop" };
const AWNING: Record<ArchStyle, Awning> = { classic: "solid", retro: "stripes", modern: "canopy", soft: "solid", tech: "none" };
const TOPSIDE: Record<ArchStyle, Topside> = { classic: "hvac", retro: "tank", modern: "terrace", soft: "garden", tech: "solar" };

export function labProgram(use: Use, style: ArchStyle, p: GamePalette, o: { floors?: number; roof?: RoofFamily; family?: Family; seed: number; corner?: boolean }): Program {
  const facade: Program["facade"] = use === "office" ? (style === "tech" ? "curtain" : style === "modern" ? "bands" : "framed") : use === "institutional" && (style === "modern" || style === "tech") ? "bands" : "framed";
  const roof: RoofFamily = o.roof ?? "flat";
  return {
    family: o.family ?? (o.corner ? "corner" : "walkup"),
    floors: o.floors ?? 5,
    style,
    roof,
    facade,
    rhythm: (style === "retro" ? 1 : 0) + 2 * (use === "commercial" ? 1 : use === "office" || use === "civic" ? 2 : 0) + (style === "classic" ? 8 : 0),
    ground: GROUND[use],
    signage: SIGNAGE[use],
    awning: AWNING[style],
    topside: TOPSIDE[style],
    corner: o.corner ? (style === "classic" ? "turret" : style === "soft" ? "round" : "square") : undefined,
    label: use === "commercial" ? "Market" : use === "civic" ? "Hall" : use === "industrial" ? "Works" : use === "office" ? undefined : undefined,
    brand: use === "office" ? "Office" : use === "civic" ? "Hall" : undefined,
    wall: p.walls[style][o.seed % p.walls[style].length],
    accent: p.accents[o.seed % p.accents.length],
    roofColor: style === "classic" ? p.roofs.classic[0] : p.roofs[style][0],
    seed: 100 + o.seed * 17,
    use,
  };
}

function cells(set: LabSet, p: GamePalette, style: ArchStyle): { cols: number; cells: Cell[] } {
  const out: Cell[] = [];
  switch (set) {
    case "programs":
      for (const st of [style, style === "modern" ? "classic" : "modern"] as ArchStyle[]) USES.forEach((u, i) => out.push({ label: `${u} · ${st}`, P: labProgram(u, st, p, { seed: i }), w: 6, d: 5 }));
      return { cols: 7, cells: out };
    case "corners":
      for (const st of [style, style === "modern" ? "classic" : "modern"] as ArchStyle[]) USES.forEach((u, i) => out.push({ label: `${u} · corner · ${st}`, P: labProgram(u, st, p, { seed: i, corner: true }), w: 5, d: 5 }));
      return { cols: 7, cells: out };
    case "roofs":
      for (const [roof, w, d, floors] of [
        ["flat", 4, 4, 4],
        ["flat", 8, 6, 5],
        ["gable", 6, 5, 4],
      ] as Array<[RoofFamily, number, number, number]>)
        USES.forEach((u, i) => out.push({ label: `${u} · ${roof} ${w}×${d}`, P: labProgram(u, style, p, { seed: i, roof, floors }), w, d }));
      return { cols: 7, cells: out };
    case "styles":
      for (const u of ["residential", "commercial", "office"] as Use[]) (["classic", "retro", "modern", "soft", "tech"] as ArchStyle[]).forEach((st, i) => out.push({ label: `${u} · ${st}`, P: labProgram(u, st, p, { seed: i }), w: 6, d: 5 }));
      return { cols: 5, cells: out };
    case "openings":
      for (const st of ["classic", "retro", "modern", "tech"] as ArchStyle[])
        (["residential", "commercial", "office", "civic", "industrial"] as Use[]).forEach((u, i) => out.push({ label: `${u} · ${st}`, P: labProgram(u, st, p, { seed: i, floors: 4 }), w: 5, d: 4 }));
      return { cols: 5, cells: out };
    case "sizes":
      for (const [w, d, floors] of [
        [3, 4, 3],
        [8, 6, 9],
      ] as Array<[number, number, number]>)
        USES.forEach((u, i) => out.push({ label: `${u} · ${w}×${d} · ${floors}f`, P: labProgram(u, style, p, { seed: i, floors }), w, d }));
      return { cols: 7, cells: out };
  }
}

export interface LabResult {
  city: PixelCity;
  cells: Array<{ label: string; x: number; z: number; anatomy?: Anatomy; parts: [number, number]; footprint: [number, number, number, number]; groundHeight: number; floors: number }>;
}

export function generateSurfaceLab(kitApi: LabKit, base: SiteFingerprint, o: { set: LabSet; style?: ArchStyle; time?: TimeOfDay; flat?: boolean; light?: LabLight }): LabResult {
  const g0 = deriveGrammar(base);
  const grammar = { ...g0, time: o.time ?? "day" };
  const p0 = buildGamePalette(base, grammar);
  const palette = o.light && o.light !== "default" ? { ...p0, sun: { ...p0.sun, dir: SUN[o.light] } } : p0;
  const kit = new kitApi.Kit(palette, 7);
  const { cols, cells: list } = cells(o.set, palette, o.style ?? "classic");
  const pitch = 11;
  const rows = Math.ceil(list.length / cols);
  const out: LabResult["cells"] = [];
  list.forEach((c, i) => {
    const x = (i % cols - (cols - 1) / 2) * pitch;
    const z = (Math.floor(i / cols) - (rows - 1) / 2) * pitch;
    kit.frame(x, z, 0, () => {
      kit.span(-4.5, 4.5, 0, 0.1, -4.5, 4.5, palette.sidewalk.map((v) => v * 0.95) as RGB, Surf.PAVING);
      kit.sign(c.label.toUpperCase(), 0, 0.12, 4.0, { bg: [0.16, 0.16, 0.2], texel: 0.05, maxW: 8 });
      const from = kit.parts.length;
      const an0 = kit.anatomies?.length ?? 0;
      kit.frame(0, -0.4, 0, () => kitApi.building(kit as never, c.w, c.d, c.P), 0.1);
      const g = c.P.ground === "homes" ? 0.62 : c.P.ground === "arcade" ? 0.8 : c.P.ground === "docks" ? 0.9 : 0.74;
      out.push({ label: c.label, x, z, anatomy: kit.anatomies?.[an0], parts: [from, kit.parts.length], footprint: [x - c.w / 2, x + c.w / 2, z - 0.4 - c.d / 2, z - 0.4 + c.d / 2], groundHeight: 0.1 + g, floors: c.P.floors });
    });
  });
  let parts = kit.parts;
  if (o.flat) {
    const grey: RGB = [0.62, 0.62, 0.66];
    parts = parts.filter((q) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow").map((q) => ({ ...q, color: q.y + q.h > 0.4 ? grey : q.color, surf: Surf.PLAIN, variant: 0, lit: 0 }));
  }
  const extent = Math.max(cols, rows) * pitch + 20;
  const ground: Part[] = [{ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: 3000, h: 0.3, d: 3000, rotY: 0, color: palette.sidewalk.map((v) => v * 0.8) as RGB, surf: Surf.PAVING, lit: 0, delay: 0 }];
  let maxHeight = 1;
  for (const q of parts) maxHeight = Math.max(maxHeight, q.y + q.h);
  const city: PixelCity = {
    frame: "world",
    scenery: ground,
    worldRoads: [],
    worldExtent: extent,
    fingerprint: base,
    semantics: { siteName: "", regions: [], regionOf: new Int32Array(0), hero: -1, nav: -1, brand: -1, footer: -1, main: -1, districts: [], sidebars: [], ctas: [] },
    siteName: "",
    zones: [],
    influences: [],
    rail: null,
    entrance: [0, 0],
    grammar,
    palette,
    size: { w: extent, d: extent },
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
  return { city, cells: out };
}
