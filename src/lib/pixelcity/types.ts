import type { RGB } from "../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { CityGrammar } from "./grammar";
import type { GamePalette } from "./palette";
import type { Semantics } from "../semantics/analyze";

export type PartMesh = "box" | "prism" | "cyl" | "pyramid" | "glow" | "image" | "sign" | "sprite";

export const Surf = {
  PLAIN: 0,
  OFFICE: 1,
  HOUSE: 2,
  GLASS: 3,
  ROAD: 4,
  GRASS: 5,
  PAVING: 6,
  BRICK: 7,
  WATER: 8,
  ROOF: 9,
  SOIL: 10,
  STRIPES: 11,
  GRID: 12,
  STORE: 13,
  FRAMED: 14,
  BANDS: 15,
  ZEBRA: 16,
  RAIL: 17,
  GRILLE: 18,
  SOLAR: 19,
  SLABS: 20,
} as const;

export interface Part {
  mesh: PartMesh;
  node: number;
  unit?: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
  rotX?: number;
  rotZ?: number;
  variant?: number;
  color: RGB;
  surf: number;
  lit: number;
  delay: number;
  slot?: number;
  rect?: [number, number, number, number];
}

export interface RoadSeg {
  x: number;
  z: number;
  w: number;
  d: number;
  axis: "x" | "z";
  avenue: boolean;
  rural?: boolean;
}

export interface SignSpec {
  text: string;
  bg: RGB;
  fg: RGB;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BuildingKind =
  | "landmark"
  | "tower"
  | "office"
  | "house"
  | "shops"
  | "rowhouses"
  | "factory"
  | "kiosk"
  | "billboard"
  | "plaza"
  | "ensemble"
  | "pricing"
  | "statue"
  | "archive"
  | "temple"
  | "stall"
  | "screen";

export interface Building {
  node: number;
  kind: BuildingKind;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  label?: string;
}

export interface Zone {
  region: number;
  role: "entrance" | "avenue" | "district" | "sidebar" | "edge";
  x: number;
  z: number;
  w: number;
  d: number;
  title?: string;
  nodes: [number, number];
}

export interface Influence {
  region: number;
  node: number;
  what: string;
  effect: string;
  score: number;
}

export type CityFrame = "island" | "world";

export interface PixelCity {
  frame: CityFrame;
  scenery: Part[];
  worldRoads: RoadSeg[];
  worldExtent: number;
  fingerprint: SiteFingerprint;
  semantics: Semantics;
  siteName: string;
  zones: Zone[];
  influences: Influence[];
  rail: { points: Array<[number, number, number]>; stations: Array<{ x: number; z: number; label: string; region: number }> } | null;
  entrance: [number, number];
  grammar: CityGrammar;
  palette: GamePalette;
  size: { w: number; d: number };
  parts: Part[];
  roads: RoadSeg[];
  buildings: Building[];
  images: Array<{ node: number; slot: number; src: string }>;
  signs: SignSpec[];
  signAtlas: { w: number; h: number };
  maxHeight: number;
  smokestacks: Array<[number, number, number]>;
  buildDuration: number;
  atmosphere?: { haze: [number, number] };
}
