/**
 * CityModel — the third intermediate representation.
 *
 * Pure geometry and art-directed color, still independent of Three.js. Every structure
 * belongs to exactly one normalized node; a node can own several structures (a billboard is
 * two poles + a frame + a panel). Changing the aesthetic means changing this stage only.
 */

export type MeshKind = "solid" | "spire" | "cylinder" | "glow" | "billboard";

export const Facade = {
  NONE: 0,
  /** Rows of "text lines" — paragraphs read as lines of type on the facade. */
  TEXT: 1,
  /** Vertical mullions — towers. */
  TOWER: 2,
  /** Small window grid — list items, units. */
  GRID: 3,
  /** Plinth top: crisp paper edge. */
  PLINTH: 4,
} as const;

export type RGB = [number, number, number];

export interface Structure {
  mesh: MeshKind;
  node: number;
  /** Base center (y is the bottom). */
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
  /** sRGB 0..1 */
  color: RGB;
  facade: number;
  /** Emissive strength for glow meshes, or window glow for solids. */
  glow: number;
  /** Seconds after the build starts. */
  delay: number;
  /** Billboard atlas slot, -1 if none. */
  slot: number;
}

export interface Arc {
  from: [number, number, number];
  to: [number, number, number];
  node: number;
  target: number;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CityPalette {
  skyTop: RGB;
  skyHorizon: RGB;
  fog: RGB;
  ground: RGB;
  groundLine: RGB;
  base: RGB;
  building: RGB;
  structure: RGB;
  /** Streets made of links. */
  paving: RGB;
  accent: RGB;
  accent2: RGB;
  glow: RGB;
  sun: RGB;
  /** CSS colors for the HUD, derived from the same palette. */
  css: { accent: string; accent2: string; ink: string; paper: string; glow: string };
  /** Hues used for district tints (degrees). */
  districtHues: number[];
  source: string[];
}

export interface BillboardImage {
  node: number;
  slot: number;
  src: string;
}

export interface CityModel {
  seed: number;
  size: { w: number; d: number };
  /** Node ids of district roots, in document order. */
  districts: number[];
  structures: Structure[];
  arcs: Arc[];
  images: BillboardImage[];
  /** Per node: bounds of its whole subtree (for outlines and camera focus). */
  bounds: Bounds[];
  /** Per node: a representative point on top of its main structure. */
  anchor: Array<[number, number, number]>;
  palette: CityPalette;
  maxHeight: number;
  /** Seconds until the build-up animation finishes. */
  buildDuration: number;
  /** Where the camera should arrive after the intro. */
  entrance: { position: [number, number, number]; target: [number, number, number] };
}
