/**
 * Architectural surface grammar: how a building's massing becomes a legible building.
 *
 * The massing (families, volumes, heights) is decided upstream and is not touched here. This
 * file decides, for one building, an ANATOMY:
 *
 *   GROUND  how it meets the street: frontage kind, units, entrances, transparency, awning,
 *           signage, corner entrance
 *   BASE    0–2 floors above the ground set apart (rusticated / banded / glazed)
 *   BODY    the façade rhythm: bay width, opening pattern (single, paired, vertical, sparse,
 *           ribbon, curtain), brick, tall openings, articulated end bays
 *   CROWN   how it ends against the sky: none / cornice / parapet / attic / emphasized top
 *   ROOF    zones: EDGE (parapet, cornice, railing, eaves), SERVICE (one grouped cluster),
 *           OCCUPIED (terrace, garden), ENERGY (solar), ARCHITECTURAL (the massing's roof family)
 *   CORNER  whether it stands on a corner, and what it does about it
 *
 * Decisions follow USE first (what the building is for), then STYLE only expresses them
 * (which cornice, which awning, which opening pattern, which topside the roof zones show).
 * The RNG only picks between equivalent alternatives (one more shop unit, a neighbouring bay
 * width for homes and shops, which side the first shop door / the service cluster takes, which
 * bay the fire escape is on), seeded by the program and the lot; every pick is in `variation`.
 *
 * USE comes from the composition (compose.ts sets it from the territory's organisation) or,
 * for synthetic programs, from the building's ground and family.
 */
import type { ArchStyle } from "../grammar";
import type { Awning, Family, Ground, Program, Signage } from "./buildings";
import type { RoofFamily } from "./massing";
import { openingFor, type OpeningTreatment } from "./openings";

export type Use = "residential" | "commercial" | "office" | "civic" | "institutional" | "industrial" | "service" | "kiosk";

/**
 * Page signals that reach the surface. All four were dead at every coarser scale (validation
 * round: zero effect on territory, composition or massing), so using them here does not let
 * one variable drive the whole city. Page-level, 0..1.
 */
export interface SurfaceSignals {
  /** Share of repeated sibling runs → strictness of the façade rhythm. */
  regularity: number;
  /** Headings per element → strength of the base / body / crown hierarchy. */
  headings: number;
  /** Controls and calls to action → how active the commercial ground floor is. */
  interactivity: number;
  /** Links per element → how finely a commercial frontage is segmented. */
  linkDensity: number;
}
export const NEUTRAL_SIGNALS: SurfaceSignals = { regularity: 0.5, headings: 0.5, interactivity: 0.5, linkDensity: 0.5 };

export type GroundKind = "storefront" | "domestic" | "lobby" | "arcade" | "civic" | "service" | "loading" | "blank";
export type Pattern = "single" | "paired" | "vertical" | "sparse";

export interface Anatomy {
  use: Use;
  ground: { kind: GroundKind; height: number; units: number; entrance: "per-unit" | "central" | "axial" | "domestic" | "service" | "none"; transparency: number; awning: Awning; signage: Signage; cornerEntrance: boolean };
  base: { floors: number; treatment: "none" | "rusticated" | "banded" | "glazed" };
  body: { surf: "framed" | "bands" | "curtain"; pattern: Pattern; bay: number; tall: boolean; brick: boolean; accentEnds: boolean; litGroups: boolean };
  crown: { kind: "none" | "cornice" | "parapet" | "attic" | "emphasized"; floors: number; cornice: "heavy" | "light" | "none" };
  roof: { edge: "parapet" | "cornice" | "railing" | "eaves" | "none"; service: "hvac" | "tank" | "vents" | "penthouse" | "chimneys" | "bulkhead" | "none"; occupied: "terrace" | "garden" | "none"; energy: "solar" | "none"; architectural: RoofFamily };
  corner: { condition: boolean; treatment: "entrance" | "wrap" | "turret" | "round" | "vertical" | "none" };
  /** Detail families this building is eligible for, each with its reason. */
  details: string[];
  /** Choices the RNG made, each among equivalent options (never a structural decision). */
  variation: string[];
  /** What the building does NOT have, and the rule that left it out ("why no fire escape?"). */
  absent: string[];
  /** Page signals that changed a decision (and how). */
  signals: string[];
  /** What the style expressed. */
  style: string;
  why: string[];
  /** Openings depth pass: how the façade's openings are recessed and framed (openings.ts). */
  opening: OpeningTreatment;
}

const PITCHED = new Set<RoofFamily>(["gable", "mansard", "sawtooth", "dome", "spire", "crown"]);

/** Use, when compose did not set it: from the family, then the ground floor. */
export function programUse(P: Program): Use {
  if (P.use) return P.use;
  const f: Family = P.family;
  if (f === "kiosk") return "kiosk";
  if (f === "shed") return "industrial";
  if (f === "civic" || f === "clocktower") return "civic";
  const g: Ground = P.ground;
  if (g === "shop" || g === "cafe" || g === "arcade") return "commercial";
  if (g === "lobby") return P.facade === "framed" ? "institutional" : "office";
  if (g === "docks") return "industrial";
  if (g === "blank") return P.signage === "none" ? "service" : "industrial";
  return "residential";
}

export interface AnatomyInput {
  /** Width of the main frontage and number of floors above the ground. */
  span: number;
  floors: number;
  groundHeight: number;
  /** The building stands on a corner (two street frontages). */
  corner: boolean;
  /** Roof family of the top volume (massing). */
  roof: RoofFamily;
  signals: SurfaceSignals;
  rand: (k: number) => number;
}

export function anatomyFor(P: Program, a: AnatomyInput): Anatomy {
  const use = programUse(P);
  const st: ArchStyle = P.style;
  const why: string[] = [`use ${use}${P.use ? " (from the composition)" : " (from family / ground)"}`];
  const details: string[] = [];
  const signals: string[] = [];
  const variation: string[] = [];
  const S = a.signals;
  const tallish = a.floors >= 4;

  /* GROUND */
  const awningFor = (): Awning => {
    // Style expresses an awning that the use made eligible; equivalent options only.
    const opts: Awning[] = st === "classic" ? ["solid", "solid", "stripes"] : st === "retro" ? ["stripes", "stripes", "solid"] : st === "soft" ? ["solid", "stripes", "canopy"] : st === "modern" ? ["canopy"] : ["none"];
    return opts[Math.floor(a.rand(1) * opts.length) % opts.length];
  };
  let ground: Anatomy["ground"];
  switch (use) {
    case "commercial": {
      // Frontage segmentation: link-dense pages cut the street front into more, narrower shops.
      const unitW = 3.2 - 1.4 * S.linkDensity;
      // Equivalent subdivisions of the same frontage (one more, narrower shop) — the RNG picks.
      const u = Math.max(1, Math.round(a.span / unitW));
      const units = a.span / (u + 1) >= 1.3 && a.rand(2) < 0.5 ? u + 1 : u;
      variation.push(`shop units ${units} of {${u}${a.span / (u + 1) >= 1.3 ? `, ${u + 1}` : ""}}`);
      if (Math.abs(S.linkDensity - 0.5) > 0.2) signals.push(`linkDensity ${S.linkDensity.toFixed(2)} → shop units ~${unitW.toFixed(1)} tiles wide`);
      const transparency = 0.7 + 0.25 * S.interactivity;
      if (S.interactivity > 0.7) signals.push(`interactivity ${S.interactivity.toFixed(2)} → more glazed, livelier frontage`);
      const kind: GroundKind = P.ground === "arcade" ? "arcade" : "storefront";
      ground = { kind, height: a.groundHeight, units, entrance: "per-unit", transparency, awning: kind === "storefront" ? awningFor() : "none", signage: P.signage === "none" ? "shop" : P.signage, cornerEntrance: a.corner };
      why.push(`ground: ${units} ${kind === "arcade" ? "arcade bays" : "shopfront unit(s)"}, an entrance each — commercial use`);
      if (ground.awning !== "none") details.push(`awnings (${ground.awning}): commercial ground + ${st} style`);
      break;
    }
    case "office":
      ground = { kind: P.ground === "arcade" ? "arcade" : "lobby", height: a.groundHeight, units: 1, entrance: "central", transparency: 0.75, awning: "none", signage: P.brand ? "plaque" : "none", cornerEntrance: a.corner && a.span > 5 };
      why.push("ground: one lobby with a central entrance — office use");
      break;
    case "civic":
      ground = { kind: "civic", height: a.groundHeight, units: 1, entrance: "axial", transparency: 0.3, awning: "none", signage: "plaque", cornerEntrance: false };
      why.push("ground: one axial, ceremonial entrance on a clean frontage — civic use");
      break;
    case "institutional":
      ground = { kind: "civic", height: a.groundHeight, units: 1, entrance: "central", transparency: 0.25, awning: "none", signage: "plaque", cornerEntrance: false };
      why.push("ground: a marked central entrance, mostly closed plinth — institutional use");
      break;
    case "industrial":
      ground = { kind: "loading", height: a.groundHeight, units: Math.max(1, Math.round(a.span / 1.2)), entrance: "service", transparency: 0.05, awning: "none", signage: "painted", cornerEntrance: false };
      why.push("ground: loading doors along a long blank frontage — industrial use");
      break;
    case "service":
      ground = { kind: "service", height: a.groundHeight, units: 1, entrance: "service", transparency: 0.1, awning: "none", signage: "none", cornerEntrance: false };
      why.push("ground: one service door, blank frontage — support use");
      break;
    case "kiosk":
      ground = { kind: "storefront", height: a.groundHeight, units: 1, entrance: "per-unit", transparency: 0.9, awning: "none", signage: "shop", cornerEntrance: false };
      break;
    default: {
      // Residential: the ground floor is homes unless the lot is a corner shop (mixed use).
      const shop = P.ground === "shop" || P.ground === "cafe";
      const units = Math.max(1, Math.round(a.span / 3.4));
      ground = shop
        ? { kind: "storefront", height: a.groundHeight, units: Math.max(1, Math.round(a.span / 3)), entrance: "per-unit", transparency: 0.75, awning: awningFor(), signage: P.signage === "none" ? "shop" : P.signage, cornerEntrance: a.corner }
        : { kind: "domestic", height: a.groundHeight, units, entrance: "domestic", transparency: 0.25, awning: "none", signage: "none", cornerEntrance: false };
      why.push(shop ? "ground: corner shop under homes (mixed use)" : `ground: ${units} front door(s) with stoops — residential use`);
      if (shop && ground.awning !== "none") details.push(`awnings (${ground.awning}): shop ground + ${st} style`);
    }
  }

  /* BASE: a distinct lower zone on taller buildings whose use has one. */
  const hierarchy = S.headings;
  let base: Anatomy["base"] = { floors: 0, treatment: "none" };
  if (use === "civic" || use === "institutional") base = { floors: a.floors >= 3 ? 1 : 0, treatment: "rusticated" };
  else if (use === "office" && a.floors >= 6) base = { floors: a.floors >= 10 ? 2 : 1, treatment: "glazed" };
  else if ((use === "residential" || use === "commercial") && tallish) base = { floors: 1, treatment: st === "modern" || st === "tech" ? "glazed" : "banded" };
  if (base.floors && hierarchy > 0.65 && a.floors >= 7 && base.floors < 2) {
    base = { ...base, floors: 2 };
    signals.push(`headings ${hierarchy.toFixed(2)} → a two-floor base (stronger hierarchy)`);
  }
  if (base.floors) why.push(`base: ${base.floors} floor(s), ${base.treatment}`);

  /* BODY: use picks the opening logic, style its expression. */
  let body: Anatomy["body"];
  // Bay width comes from the program; walk-up homes and shops may take a neighbouring width
  // (neighbouring buildings rarely share one), offices / civic / institutional keep theirs.
  const bay0 = Math.floor(P.rhythm / 2) % 4;
  const free = use === "residential" || use === "commercial";
  const bay = free ? Math.max(0, Math.min(3, bay0 + (a.rand(3) < 0.34 ? -1 : a.rand(3) < 0.67 ? 0 : 1))) : bay0;
  if (free) variation.push(`bay ${0.5 + 0.25 * bay} of {${[bay0 - 1, bay0, bay0 + 1].filter((b) => b >= 0 && b <= 3).map((b) => 0.5 + 0.25 * b).join(", ")}}`);
  const brick = (P.rhythm & 1) === 1;
  const tall = (P.rhythm & 8) === 8;
  // Strict rhythm on very regular pages; articulated end bays where the page is less regular.
  const accentEnds = a.span >= 3.6 && S.regularity < 0.45 && (use === "residential" || use === "civic" || use === "institutional" || use === "commercial");
  if (accentEnds) signals.push(`regularity ${S.regularity.toFixed(2)} → articulated end bays`);
  switch (use) {
    case "office":
      body = { surf: P.facade === "framed" ? "framed" : P.facade, pattern: "vertical", bay, tall: true, brick: false, accentEnds: false, litGroups: true };
      why.push(`body: ${P.facade === "curtain" ? "curtain wall" : P.facade === "bands" ? "ribbon windows" : "vertical piers"}, lit by floor at night`);
      break;
    case "civic":
      body = { surf: "framed", pattern: "vertical", bay: Math.max(bay, 2), tall: true, brick, accentEnds, litGroups: false };
      why.push("body: tall vertical openings in wide bays — civic");
      break;
    case "institutional":
      body = { surf: P.facade === "bands" && (st === "modern" || st === "tech") ? "bands" : "framed", pattern: "sparse", bay, tall, brick, accentEnds, litGroups: true };
      why.push("body: sparse openings (stacks behind) — institutional");
      break;
    case "industrial":
    case "service":
      body = { surf: "framed", pattern: "sparse", bay: 1, tall: false, brick: st === "retro" || st === "classic", accentEnds: false, litGroups: false };
      why.push("body: few, regular openings — utilitarian");
      break;
    case "commercial":
      // Lit by flat above the shops; whole lit floors stay the office signature.
      body = P.facade === "framed" ? { surf: "framed", pattern: st === "modern" || st === "tech" ? "paired" : "single", bay, tall, brick, accentEnds, litGroups: true } : { surf: P.facade, pattern: "single", bay, tall, brick, accentEnds: false, litGroups: false };
      why.push(`body: ${body.surf === "framed" ? `${body.pattern} windows above the shops` : P.facade}`);
      break;
    default:
      body = P.facade === "framed" ? { surf: "framed", pattern: st === "modern" || st === "tech" ? "paired" : "single", bay, tall, brick, accentEnds, litGroups: true } : { surf: P.facade, pattern: "single", bay, tall, brick, accentEnds: false, litGroups: false };
      // Vertical openings stay the civic / office signature; homes keep domestic windows.
      why.push(`body: domestic ${body.pattern} windows, lit by flat at night`);
  }

  /* CROWN: does the building need an ending? (use) — how is it expressed? (style) */
  let crown: Anatomy["crown"] = { kind: "none", floors: 0, cornice: "none" };
  const pitched = PITCHED.has(a.roof);
  if (use === "industrial" || use === "kiosk" || a.floors < 2) crown = { kind: "none", floors: 0, cornice: "none" };
  else if (pitched) crown = { kind: "cornice", floors: 0, cornice: st === "classic" ? "heavy" : "light" };
  else {
    const attic = (use === "residential" || use === "civic" || use === "institutional") && a.floors >= 5 && (st === "classic" || hierarchy > 0.6);
    const emphasized = use === "office" && a.floors >= 6;
    const kind: Anatomy["crown"]["kind"] = attic ? "attic" : emphasized ? "emphasized" : st === "classic" || st === "retro" || use === "civic" ? "cornice" : "parapet";
    crown = { kind, floors: attic || emphasized ? 1 : 0, cornice: st === "classic" || use === "civic" ? "heavy" : kind === "cornice" ? "light" : "none" };
    if (attic && st !== "classic") signals.push(`headings ${hierarchy.toFixed(2)} → attic floor`);
  }
  why.push(`crown: ${crown.kind}${crown.floors ? ` (top floor)` : ""}${crown.cornice !== "none" ? `, ${crown.cornice} cornice` : ""}`);

  /* ROOF zones: the use decides which zones exist; the style's topside (chosen in the brief
     among that style's equivalents) decides how they are expressed. */
  let service: Anatomy["roof"]["service"] = "none";
  let occupied: Anatomy["roof"]["occupied"] = "none";
  let energy: Anatomy["roof"]["energy"] = "none";
  const occupiable = use === "residential" || use === "office" || (use === "commercial" && a.floors <= 5);
  if (pitched) service = use === "residential" && (a.roof === "gable" || a.roof === "mansard") ? "chimneys" : "none";
  else {
    switch (use) {
      case "residential":
        service = st === "retro" || P.topside === "tank" ? "tank" : "bulkhead";
        break;
      case "commercial":
        service = (st === "retro" || P.topside === "tank") && a.floors >= 3 ? "tank" : "hvac";
        break;
      case "office":
        service = a.floors >= 6 ? "penthouse" : "hvac";
        break;
      case "industrial":
      case "service":
        service = "vents";
        break;
      case "institutional":
        service = "hvac";
        break;
      default:
        service = "none"; // civic: a deliberately clean roof
    }
    if (occupiable)
      occupied =
        P.topside === "garden" ? "garden"
        : P.topside === "terrace" ? (a.span >= 3 ? "terrace" : "none")
        : use === "residential" && st === "soft" ? "garden"
        : (use === "residential" && st === "modern" && a.span >= 3) || (use === "office" && st === "modern" && a.floors < 6) ? "terrace"
        : "none";
    if (P.topside === "solar" && use !== "civic" && a.span >= 2.5) energy = "solar";
  }
  const edge: Anatomy["roof"]["edge"] = pitched ? "eaves" : occupied === "terrace" ? "railing" : crown.cornice !== "none" ? "cornice" : "parapet";
  why.push(`roof: ${a.roof}; edge ${edge}; service ${service}; occupied ${occupied}${energy !== "none" ? `; ${energy} array` : ""}`);
  if (service === "tank") details.push(`water tank: ${use} walk-up + ${st === "retro" ? "retro style" : "tank topside"} + flat roof`);
  if (service === "chimneys") details.push("chimneys: residential + pitched roof");
  if (service === "penthouse") details.push("mechanical penthouse: office, 6+ floors");
  if (occupied !== "none") details.push(`roof ${occupied}: ${use} roof is occupiable + ${P.topside === occupied ? `${occupied} topside` : `${st} style`}`);
  if (energy === "solar") details.push("solar array: solar topside (style) in the free roof zone");
  if (use === "civic") details.push(!pitched && a.span >= 3 ? "central skylight lantern, no plant: civic roof kept clean on purpose" : "no roof plant: civic roof kept clean on purpose");

  /* CORNER */
  let corner: Anatomy["corner"] = { condition: a.corner, treatment: "none" };
  if (a.corner) {
    const t: Anatomy["corner"]["treatment"] =
      P.corner === "turret" ? "turret" : P.corner === "round" ? "round" : ground.kind === "storefront" ? "wrap" : use === "office" ? "entrance" : use === "residential" && a.floors >= 3 ? "vertical" : "none";
    corner = { condition: true, treatment: t };
    why.push(`corner: ${t}`);
  }

  /* Details that follow from the anatomy (eligibility, not chance). */
  // Narrow walk-ups (one stair: homes, or shops with flats above) need a second way down.
  const walkup = use === "residential" || use === "commercial";
  if (walkup && st === "retro" && a.floors >= 4 && a.span >= 2.8 && a.span <= 4 && body.surf === "framed") details.push(`fire escape: narrow retro ${use} walk-up (one stair), 4+ floors, punched façade`);
  if (use === "residential" && (st === "modern" || st === "soft") && a.floors >= 4 && body.surf === "framed") details.push("balconies: residential, modern/soft, 4+ floors");
  if (ground.kind === "domestic") details.push("stoops + door lamps: residential ground");
  if (ground.kind === "storefront" && use !== "kiosk") details.push("shop fascia signs: commercial ground");
  if (ground.kind === "loading") details.push("roll-up doors + hazard bands: loading frontage");

  const absent: string[] = [];
  if (!details.some((d) => d.startsWith("fire escape"))) absent.push(`no fire escape: needs a narrow walk-up (residential / commercial, 2.8–4 tiles) + retro + 4+ floors + punched façade (here ${use}, ${st}, ${a.span.toFixed(1)} wide, ${a.floors} floors, ${body.surf})`);
  if (service !== "hvac") absent.push(`no HVAC cluster: ${pitched ? `${a.roof} roof` : `${use} roof plant is ${service === "none" ? "none" : `a ${service}`}`}`);
  if (ground.awning === "none") absent.push(`no awning: ${ground.kind === "storefront" ? `${st} style shows none` : `${ground.kind} ground (awnings belong to shopfronts)`}`);
  if (crown.cornice === "none") absent.push(`no cornice: ${crown.kind === "none" ? (use === "industrial" || use === "kiosk" ? `${use} use` : "under 2 floors") : `${st} ${crown.kind}`}`);
  if (!base.floors) absent.push(`no distinct base: ${use === "office" ? "office under 6 floors" : use === "civic" || use === "institutional" ? "under 3 floors" : "under 4 floors or use without one"}`);
  if (occupied === "none" && !pitched) absent.push(`roof not occupied: ${occupiable ? `${P.topside} topside, ${st} style` : `${use} roof is not occupiable`}`);
  if (ground.awning !== "none" && (st === "classic" || st === "retro" || st === "soft")) variation.push(`awning ${ground.awning} (style's equivalents)`);
  const style = `${st}: ${crown.cornice !== "none" ? `${crown.cornice} cornice` : crown.kind}, ${body.pattern}${body.brick ? " brick" : ""}${ground.awning !== "none" ? `, ${ground.awning} awnings` : ""}`;
  const A: Anatomy = { use, ground, base, body, crown, roof: { edge, service, occupied, energy, architectural: a.roof }, corner, details, signals, variation, absent, style, why, opening: undefined as unknown as OpeningTreatment };
  A.opening = openingFor(A);
  return A;
}

/** FRAMED / BANDS variant bits for a zone (see materials.ts). */
export const PATTERN_BITS: Record<Pattern, number> = { single: 0, paired: 16, vertical: 32, sparse: 48 };
export const ATTIC = 64;
export const RUSTIC = 128;
export const END_BAYS = 256;
export const LIT_GROUPS = 512;
export function bodyVariant(b: Anatomy["body"]): number {
  return (b.brick ? 1 : 0) + 2 * b.bay + (b.tall ? 8 : 0) + PATTERN_BITS[b.pattern] + (b.accentEnds ? END_BAYS : 0) + (b.litGroups ? LIT_GROUPS : 0);
}

/** The per-building surface trace: what each zone became and why (validation, provenance). */
export interface SurfaceTrace {
  program: Use;
  groundFloor: string;
  base: string;
  body: string;
  crown: string;
  roof: string;
  cornerCondition: string;
  detailFamilies: string[];
  variation: string[];
  absent: string[];
  pageSignalsUsed: string[];
  styleExpression: string;
  openingTreatment: string;
}

export function surfaceTrace(A: Anatomy): SurfaceTrace {
  const g = A.ground;
  return {
    program: A.use,
    groundFloor: `${g.kind} ×${g.units}, entrance ${g.entrance}, transparency ${g.transparency.toFixed(2)}${g.awning !== "none" ? `, ${g.awning} awning` : ""}${g.signage !== "none" ? `, ${g.signage} signage` : ""}${g.cornerEntrance ? ", corner entrance" : ""}`,
    base: A.base.floors ? `${A.base.floors} floor(s) ${A.base.treatment}` : "none",
    body: `${A.body.surf} ${A.body.pattern}, bay ${0.5 + 0.25 * A.body.bay}${A.body.tall ? ", tall" : ""}${A.body.accentEnds ? ", end bays" : ""}${A.body.litGroups ? (A.body.surf === "framed" ? ", lit by flat (2 bays)" : ", lit in runs per floor") : ""}`,
    crown: `${A.crown.kind}${A.crown.floors ? " (top floor)" : ""}${A.crown.cornice !== "none" ? `, ${A.crown.cornice} cornice` : ""}`,
    roof: `${A.roof.architectural}; edge ${A.roof.edge}; service ${A.roof.service}; occupied ${A.roof.occupied}${A.roof.energy !== "none" ? `; ${A.roof.energy}` : ""}`,
    cornerCondition: A.corner.condition ? A.corner.treatment : "mid-block",
    detailFamilies: A.details,
    variation: A.variation,
    absent: A.absent,
    pageSignalsUsed: A.signals,
    styleExpression: A.style,
    openingTreatment: `${A.opening.glazing}; depth ${A.opening.depth}; frame ${A.opening.frame}${A.opening.sill ? " + sill" : ""}; ${A.opening.sash} sash — ${A.opening.source.join("; ")}`,
  };
}
