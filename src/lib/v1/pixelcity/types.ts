import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { CityGrammar } from "./grammar";
import type { GamePalette } from "./palette";

export type PartMesh = "box" | "prism" | "cyl" | "pyramid" | "glow" | "image" | "sign";

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
} as const;

export interface Part {
  mesh: PartMesh;
  node: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
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

export type BuildingKind = "landmark" | "tower" | "office" | "house" | "shops" | "rowhouses" | "factory" | "kiosk" | "billboard" | "plaza";

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

export interface PixelCity {
  fingerprint: SiteFingerprint;
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
}
