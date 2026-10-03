import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { CityGrammar } from "./grammar";
import type { GamePalette } from "./palette";

/** Unit shapes, base at y = 0. */
export type PartMesh = "box" | "prism" | "cyl" | "pyramid" | "glow" | "image" | "sign";

/** Surface patterns, drawn in the shader at pixel scale. */
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
  /** Normalized DOM node this part belongs to (-1 = scenery). */
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
  /** Windows: chance a window is lit at night. Glow: emissive strength. */
  lit: number;
  delay: number;
  /** image: atlas slot; sign: uv rect in the sign atlas (texels). */
  slot?: number;
  rect?: [number, number, number, number];
}

export interface RoadSeg {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Long axis: cars travel along it. */
  axis: "x" | "z";
  avenue: boolean;
}

export interface SignSpec {
  text: string;
  bg: RGB;
  fg: RGB;
  /** Position and size in the sign atlas, texels. */
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
  /** City plate in tiles, centered on the origin. */
  size: { w: number; d: number };
  parts: Part[];
  roads: RoadSeg[];
  buildings: Building[];
  images: Array<{ node: number; slot: number; src: string }>;
  signs: SignSpec[];
  signAtlas: { w: number; h: number };
  maxHeight: number;
  /** Chimney tops, for smoke. */
  smokestacks: Array<[number, number, number]>;
  /** Seconds until the build-up animation settles. */
  buildDuration: number;
}
