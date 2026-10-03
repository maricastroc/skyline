/**
 * Inspector text: why a piece of the city exists, in terms of the page it came from.
 *
 * Pure function of (city, doc, node) so the identity test can print exactly what the
 * inspector shows.
 */
import type { NormalizedDocument } from "../model/types";
import { REGION_LABEL, type Region, type RegionKind } from "../semantics/analyze";
import type { BuildingKind, PixelCity, Zone } from "./types";

/** What each region became, as a city noun (the inspector's kicker). */
export const CITY_FORM: Record<RegionKind, string> = {
  page: "City",
  brand: "Landmark",
  nav: "Avenue",
  hero: "Landmark",
  cta: "Gate",
  main: "District",
  section: "District",
  features: "Ensemble",
  pricing: "Price towers",
  gallery: "Billboards",
  logos: "Billboards",
  testimonials: "Statue park",
  faq: "Houses",
  feed: "Market street",
  directory: "Bazaar",
  showcase: "Screens",
  toc: "Monorail",
  infobox: "Temple",
  references: "Archive",
  sidebar: "Side park",
  form: "Factory",
  footer: "Waterfront",
};

const BUILDING_NOUN: Record<BuildingKind, string> = {
  landmark: "landmark",
  tower: "tower",
  office: "office block",
  house: "house",
  shops: "shopfront",
  rowhouses: "row houses",
  factory: "factory",
  kiosk: "kiosk",
  billboard: "billboard",
  plaza: "plaza",
  ensemble: "ensemble building",
  pricing: "price tower",
  statue: "statue",
  archive: "archive",
  temple: "temple",
  stall: "market stall",
  screen: "screen",
};

const ROLE_FORM: Record<Zone["role"], string> = {
  entrance: "Landmark",
  avenue: "Avenue",
  district: "District",
  sidebar: "Side park",
  edge: "Waterfront",
};

export interface Explanation {
  /** “LANDMARK”, “DISTRICT”, “BUILDING”… */
  kicker: string;
  /** Region kind label, e.g. “Hero”. */
  kind: string;
  selector: string;
  title?: string;
  depth: number;
  descendants: number;
  /** Region path from the page down to the subject; `here` marks the subject. */
  path: Array<{ label: string; here?: boolean; leaf?: boolean }>;
  /** Evidence from the page, then what the city did with it. */
  why: string[];
  effect?: string;
  /** Node range the inspector is about (for the soft highlight). */
  range: [number, number];
}

const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);
const tag = (r: Region) => (r.kind === "section" ? "SECTION" : r.kind === "page" ? "PAGE" : REGION_LABEL[r.kind].toUpperCase());

function regionPath(city: PixelCity, r: Region) {
  const R = city.semantics.regions;
  const chain: Region[] = [];
  for (let cur: Region | undefined = r; cur; cur = cur.parent >= 0 ? R[cur.parent] : undefined) chain.unshift(cur);
  if (chain[0]?.kind !== "page") chain.unshift({ kind: "page" } as Region);
  return chain;
}

function buildingWhy(kind: BuildingKind, n: NormalizedDocument["nodes"][number]): string {
  const c = n.chars.toLocaleString("en");
  switch (kind) {
    case "factory":
      return `${n.controls} form controls → a factory`;
    case "shops":
      return `${n.links} links with little text each → a row of shopfronts`;
    case "billboard":
      return n.images ? `${n.images} image${n.images > 1 ? "s" : ""}, little text → a billboard` : "embedded media → a billboard";
    case "rowhouses":
      return "repeated, same-shaped items → row houses";
    case "kiosk":
      return "a button with almost no text → a kiosk";
    case "tower":
      return "opens with a top-level heading → a tower";
    case "office":
      return `${c} characters of text → an office block`;
    case "house":
      return `${c} characters → a small house`;
    default:
      return `${c} characters · ${n.links} links → ${BUILDING_NOUN[kind]}`;
  }
}

/** Explain a picked node: the region it belongs to and, if it isn't the region itself, the building. */
export function explainNode(city: PixelCity, doc: NormalizedDocument, node: number): Explanation | null {
  const n = doc.nodes[node];
  if (!n) return null;
  const sem = city.semantics;
  const R = sem.regions;
  const r = sem.regionOf[node] >= 0 ? R[sem.regionOf[node]] : null;
  const atRoot = r && r.node === node;
  const building = city.buildings.find((b) => b.node === node);

  if (r && (atRoot || !building)) return explainRegion(city, doc, r);

  // A building inside a region (or outside any region).
  const path: Explanation["path"] = r ? regionPath(city, r).map((x) => ({ label: tag(x) })) : [{ label: "PAGE" }];
  path.push({ label: n.tag.toUpperCase(), here: true, leaf: true });
  const why: string[] = [];
  if (building) why.push(buildingWhy(building.kind, n));
  if (r) why.push(`part of the ${REGION_LABEL[r.kind].toLowerCase()}${r.title ? ` “${clip(r.title, 28)}”` : ""}`);
  return {
    kicker: building ? BUILDING_NOUN[building.kind].toUpperCase() : "STRUCTURE",
    kind: n.tag,
    selector: n.selector,
    title: clip(n.label ?? building?.label ?? n.snippet, 64),
    depth: n.domDepth,
    descendants: n.descendants,
    path,
    why,
    range: [node, n.end],
  };
}

export function explainRegion(city: PixelCity, doc: NormalizedDocument, r: Region): Explanation {
  const n = doc.nodes[r.node];
  const R = city.semantics.regions;
  const influence = city.influences.find((f) => f.region === r.id);
  const path: Explanation["path"] = regionPath(city, r).map((x) => ({ label: tag(x), here: x === r }));
  const kids = r.children.map((c) => R[c]).filter((c) => c.kind !== "section" || c.title);
  for (const c of kids.slice(0, 2)) path.push({ label: tag(c), leaf: true });
  if (kids.length > 2) path.push({ label: `+${kids.length - 2} more`, leaf: true });
  return {
    kicker: CITY_FORM[r.kind].toUpperCase(),
    kind: REGION_LABEL[r.kind],
    selector: n.selector,
    title: clip(r.title ?? n.label ?? n.snippet, 64),
    depth: n.domDepth,
    descendants: n.descendants,
    path,
    why: r.evidence.slice(0, 3),
    effect: influence?.effect,
    range: [r.node, n.end],
  };
}

/** Explain a zone (City view hover/click): the region it stands for, or a plain description. */
export function explainZone(city: PixelCity, doc: NormalizedDocument, z: Zone): Explanation | null {
  if (z.region >= 0) {
    const e = explainRegion(city, doc, city.semantics.regions[z.region]);
    const kind = city.semantics.regions[z.region].kind;
    // A long feed is split into blocks (“1-10”): keep the feed's own title, name the block.
    if (kind === "feed" && z.title) e.kind = `${e.kind} · items ${z.title}`;
    else if (z.title && z.title !== e.title && z.role === "district") e.title = z.title;
    if (z.role !== "district") e.kicker = ROLE_FORM[z.role].toUpperCase();
    e.range = z.nodes;
    return e;
  }
  if (z.nodes[0] < 0) return null;
  const n = doc.nodes[z.nodes[0]];
  return {
    kicker: ROLE_FORM[z.role].toUpperCase(),
    kind: n.tag,
    selector: n.selector,
    title: clip(z.title ?? n.label, 64),
    depth: n.domDepth,
    descendants: n.descendants,
    path: [{ label: "PAGE" }, { label: n.tag.toUpperCase(), here: true }],
    why: [`${Math.round((n.weight / (doc.nodes[0].weight || 1)) * 100)}% of the page’s structural weight, outside any named region`],
    range: z.nodes,
  };
}

/** The zone under a world point, preferring the most specific (smallest) one. */
export function zoneAt(city: PixelCity, x: number, z: number): Zone | null {
  let best: Zone | null = null;
  for (const zone of city.zones) {
    if (x < zone.x || x > zone.x + zone.w || z < zone.z || z > zone.z + zone.d) continue;
    if (!best || zone.w * zone.d < best.w * best.d) best = zone;
  }
  return best;
}

/** The zone a node belongs to (smallest node range that contains it). */
export function zoneOfNode(city: PixelCity, node: number): Zone | null {
  let best: Zone | null = null;
  for (const zone of city.zones) {
    if (node < zone.nodes[0] || node >= zone.nodes[1]) continue;
    if (!best || zone.nodes[1] - zone.nodes[0] < best.nodes[1] - best.nodes[0]) best = zone;
  }
  return best;
}
