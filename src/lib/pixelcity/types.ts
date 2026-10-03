import type { RGB } from "../city/types";
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { CityGrammar } from "./grammar";
import type { GamePalette } from "./palette";
import type { Semantics } from "../semantics/analyze";

/** Unit shapes, base at y = 0. */
export type PartMesh = "box" | "prism" | "cyl" | "pyramid" | "glow" | "image" | "sign" | "sprite";

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
  /** Surveyor's grid (the blueprint home): faint lines every tile, strong every five. */
  GRID: 12,
  // Detail kit (prototype). World-anchored like the rest, so they hold still when the camera moves.
  /** Shop glazing: mullions, transom, lit interiors at night. */
  STORE: 13,
  /** Punched windows with frames and sills, centred in bays (variant 1 adds brick courses). */
  FRAMED: 14,
  /** Ribbon windows between spandrels (offices). */
  BANDS: 15,
  /** Zebra crossing. */
  ZEBRA: 16,
  /** See-through railing: bars between rails (the gaps are discarded). */
  RAIL: 17,
  /** Vents: slats on the sides, a fan on top. */
  GRILLE: 18,
  /** Photovoltaic cells. */
  SOLAR: 19,
  /** Sidewalk slabs. */
  SLABS: 20,
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
  /** Optional tilt (radians), applied before rotY: panels, wheels, awnings, signs. */
  rotX?: number;
  rotZ?: number;
  /** Surface variant (shader aMeta.w), e.g. brick courses on FRAMED walls. */
  variant?: number;
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
  /** Country road outside the city (world frame): lighter traffic. */
  rural?: boolean;
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

/** A rectangle of the city that stands for one semantic region. */
export interface Zone {
  region: number;
  role: "entrance" | "avenue" | "district" | "sidebar" | "edge";
  x: number;
  z: number;
  w: number;
  d: number;
  title?: string;
  /** Node range [start, end) of the page this zone stands for — what lights up on hover. */
  nodes: [number, number];
}

/** One of the page elements that shaped the city most, with the effect it had. */
export interface Influence {
  region: number;
  node: number;
  what: string;
  effect: string;
  score: number;
}

/**
 * “island”: the city on a plinth, framed whole (round 3). “world”: no plinth; the city sits in
 * land that runs past the screen, and the camera frames a piece of it.
 */
export type CityFrame = "island" | "world";

export interface PixelCity {
  frame: CityFrame;
  /** World frame only: the land around the city (never DOM, never inspectable). */
  scenery: Part[];
  worldRoads: RoadSeg[];
  /** Half-size of the countryside (world frame), else 0. */
  worldExtent: number;
  fingerprint: SiteFingerprint;
  semantics: Semantics;
  siteName: string;
  zones: Zone[];
  influences: Influence[];
  /** Monorail (table of contents): polyline at track height, and station points. */
  rail: { points: Array<[number, number, number]>; stations: Array<{ x: number; z: number; label: string; region: number }> } | null;
  /** Where Explore view starts (the entrance plaza). */
  entrance: [number, number];
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
