export type MeshKind = "solid" | "spire" | "cylinder" | "glow" | "billboard";

export const Facade = {
  NONE: 0,
  TEXT: 1,
  TOWER: 2,
  GRID: 3,
  PLINTH: 4,
} as const;

export type RGB = [number, number, number];

export interface Structure {
  mesh: MeshKind;
  node: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
  color: RGB;
  facade: number;
  glow: number;
  delay: number;
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
  paving: RGB;
  accent: RGB;
  accent2: RGB;
  glow: RGB;
  sun: RGB;
  css: { accent: string; accent2: string; ink: string; paper: string; glow: string };
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
  districts: number[];
  structures: Structure[];
  arcs: Arc[];
  images: BillboardImage[];
  bounds: Bounds[];
  anchor: Array<[number, number, number]>;
  palette: CityPalette;
  maxHeight: number;
  buildDuration: number;
  entrance: { position: [number, number, number]; target: [number, number, number] };
}
