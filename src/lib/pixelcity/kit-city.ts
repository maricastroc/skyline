/**
 * The product's city: a captured page → the kit city (Foundation v1 + Art Direction v1 + Visual
 * Polish v1, exactly what /pixel/kit draws), plus what the interface needs to tie it back to the
 * page — the page map, where each territory lies, and the construction in a few groups.
 *
 *   doc ─▶ analyzeSemantics ─▶ computeFingerprint ─▶ planFromPage ─▶ generateKitDistrict
 *
 * Same calls as kit/real-page.ts (minus normalize: /api/capture already did it). Every city part
 * is tagged with its territory (`node` = territory index, -1 = streets and scenery) so hover and
 * highlight work per territory. Nothing here changes a decision of the city.
 */
import { computeFingerprint, type SiteFingerprint } from "../fingerprint/fingerprint";
import type { NormalizedDocument } from "../model/types";
import { analyzeSemantics, REGION_LABEL, type RegionKind, type Semantics } from "../semantics/analyze";
import type { BuildPlan } from "./construction";
import { blockCentre, generateKitDistrict, newTrace, type KitTrace } from "./kit/district";
import { planFromPage, type Plan } from "./kit/plan";
import { N } from "./kit/territory";
import { buildPageMap, type PageMapData, type PMBlock } from "./page-map";
import type { Part, PixelCity } from "./types";

export interface TerritoryGeo {
  /** Lot centres (world x, z). */
  lots: Array<[number, number]>;
  /** The lot nearest the centroid (so the anchor sits on the territory even when it bends). */
  centre: [number, number];
  /** Height of its tallest building (capped). */
  top: number;
}

export interface BuildGroup {
  /** Territory indices (consecutive in plan order: a node range for highlighting). */
  first: number;
  last: number;
  lots: number;
  /** Seconds after the city arrives. */
  at: number;
}

export interface KitCity {
  city: PixelCity;
  plan: Plan;
  sem: Semantics;
  fp: SiteFingerprint;
  trace: KitTrace;
  lots: number[];
  geo: TerritoryGeo[];
  map: PageMapData;
  build: { plan: BuildPlan; groups: BuildGroup[]; read: number };
  structures: number;
}

/** What each composition builds, in compose.ts's own words. */
export const COMP_WORDS: Record<string, string> = {
  continuous: "one built mass along the street",
  parcelled: "narrow attached shops",
  archive: "parallel low stacks",
  grid: "identical modules on a grid",
  media: "podium and tower with screens",
  interactive: "an open square with kiosks",
  navigation: "low arcades along the street",
  support: "low plain buildings",
  structured: "tall ribbon slabs",
  landmark: "the landmark",
  marker: "a kiosk with the site name",
};

export function blockName(b: PMBlock) {
  if (b.kind === "remainder") return b.label ?? "Main content";
  if (b.form === "rest") return "Rest of the page";
  if (b.label && b.kind !== "nav" && b.kind !== "footer") return b.label;
  return REGION_LABEL[b.kind as RegionKind] ?? b.kind;
}

export function compWords(k: KitCity, t: number) {
  const mix = k.plan.territories[t]?.mix ?? [];
  return COMP_WORDS[[...mix].sort((a, b) => b.share - a.share)[0]?.comp ?? ""] ?? "";
}

export function buildKitCity(doc: NormalizedDocument): KitCity {
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true });
  const fp = computeFingerprint(doc);
  const plan = planFromPage(doc, sem, fp);
  const trace = newTrace();
  const raw = generateKitDistrict(fp, { profile: plan, trace });
  const owner = new Int32Array(raw.parts.length).fill(-1);
  for (const pc of trace.pieces) for (let k = pc.parts[0]; k < pc.parts[1]; k++) owner[k] = pc.territory;
  const parts: Part[] = raw.parts.map((q, k) => ({ ...q, node: owner[k] }));
  const city: PixelCity = { ...raw, parts, siteName: sem.siteName, semantics: sem };
  const lots = trace.alloc!.lots;
  const geo = territoryGeometry(trace, parts);
  const map = buildPageMap(doc, sem, fp, plan, lots);
  return { city, plan, sem, fp, trace, lots, geo, map, build: planBuild(city, trace, owner, geo, plan), structures: trace.buildings.length };
}

function territoryGeometry(trace: KitTrace, parts: Part[]): TerritoryGeo[] {
  const alloc = trace.alloc!;
  const geo: TerritoryGeo[] = trace.plan!.territories.map(() => ({ lots: [], centre: [0, 0], top: 1 }));
  for (let X = 0; X < N; X++)
    for (let Y = 0; Y < N; Y++) {
      const si = alloc.owner[X * N + Y];
      if (si < 0) continue;
      const [bx, bz] = blockCentre(X >> 2, Y >> 2);
      geo[alloc.segments[si].territory].lots.push([bx - 7 + 3.5 * (X & 3) + 1.75, bz - 7 + 3.5 * (Y & 3) + 1.75]);
    }
  for (const b of trace.buildings) for (let k = b.parts[0]; k < b.parts[1]; k++) geo[b.territory].top = Math.max(geo[b.territory].top, parts[k].y + parts[k].h);
  for (const g of geo) {
    if (!g.lots.length) continue;
    const cx = g.lots.reduce((s, l) => s + l[0], 0) / g.lots.length;
    const cz = g.lots.reduce((s, l) => s + l[1], 0) / g.lots.length;
    let best = g.lots[0];
    for (const l of g.lots) if (Math.hypot(l[0] - cx, l[1] - cz) < Math.hypot(best[0] - cx, best[1] - cz)) best = l;
    g.centre = best;
    g.top = Math.min(g.top, 14);
  }
  return geo;
}

/** Page alone (the grid lays itself under it), then the groups, then street life and lights. */
const READ = 1.3;
const MAX_GROUPS = 6;

/**
 * The construction, in at most MAX_GROUPS steps: the hero alone, then consecutive territories in
 * plan order (the order they were given land, from the centre out) until a group holds a sixth of
 * the land. Presentation only — it re-times the same parts, like construction.ts.
 */
function planBuild(city: PixelCity, trace: KitTrace, owner: Int32Array, geo: TerritoryGeo[], plan: Plan): KitCity["build"] {
  const lots = trace.alloc!.lots;
  const order = plan.territories.map((_, i) => i).filter((i) => lots[i] > 0);
  const target = 256 / MAX_GROUPS;
  const groups: BuildGroup[] = [];
  for (const t of order) {
    const g = groups[groups.length - 1];
    const alone = t === plan.hero;
    if (!g || alone || g.first === plan.hero || g.lots >= target) groups.push({ first: t, last: t, lots: lots[t], at: 0 });
    else {
      g.last = t;
      g.lots += lots[t];
    }
  }
  // A small tail joins the group before it (never leaving the construction a single step).
  if (groups.length > 2 && groups[groups.length - 1].lots < target / 3 && groups[groups.length - 2].first !== plan.hero) {
    const tail = groups.pop()!;
    groups[groups.length - 1].last = tail.last;
    groups[groups.length - 1].lots += tail.lots;
  }
  const DT = Math.min(1.4, Math.max(0.6, 4.2 / Math.max(groups.length, 1)));
  groups.forEach((g, i) => (g.at = READ + i * DT));
  const groupOf = new Int32Array(plan.territories.length).fill(-1);
  groups.forEach((g, gi) => {
    for (let t = g.first; t <= g.last; t++) groupOf[t] = gi;
  });
  const end = READ + groups.length * DT;

  // Inside a group, pieces rise outwards from the group's middle; all parts of a piece together.
  const pieceAt = new Float32Array(city.parts.length).fill(-1);
  const byGroup = new Map<number, Array<{ from: number; to: number; d: number }>>();
  for (const pc of trace.pieces) {
    const gi = groupOf[pc.territory];
    if (gi < 0) continue;
    const g = groups[gi];
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (let t = g.first; t <= g.last; t++)
      for (const [x, z] of geo[t].lots) {
        cx += x;
        cz += z;
        n++;
      }
    const p = city.parts[pc.parts[0]];
    const d = p ? Math.hypot(p.x - cx / Math.max(n, 1), p.z - cz / Math.max(n, 1)) : 0;
    if (!byGroup.has(gi)) byGroup.set(gi, []);
    byGroup.get(gi)!.push({ from: pc.parts[0], to: pc.parts[1], d });
  }
  for (const [gi, list] of byGroup) {
    const far = Math.max(...list.map((x) => x.d), 1);
    const spread = Math.min(DT * 0.85, 0.8);
    for (const x of list) for (let k = x.from; k < x.to; k++) pieceAt[k] = groups[gi].at + spread * (x.d / far);
  }
  const [b0] = trace.range;
  const sc = trace.scene!;
  let far = 1;
  for (const p of city.parts) far = Math.max(far, Math.hypot(p.x, p.z));
  const delays = city.parts.map((p, k) => {
    if (p.mesh === "glow") return end + 0.35;
    if (pieceAt[k] >= 0) return pieceAt[k];
    if (k < b0 || owner[k] < 0) {
      // Streets, sidewalks and block plinths: the grid lays itself out while the page is read.
      if (k < sc.furniture[0]) return 0.15 + 0.8 * (Math.hypot(p.x, p.z) / far);
      // Street life, then traffic, once the blocks stand.
      return k < sc.furniture[1] ? end + 0.1 + 0.3 * (Math.hypot(p.x, p.z) / far) : end + 0.3;
    }
    return end;
  });
  return { plan: { delays, stages: [], lightsAt: end + 0.35, lifeAt: end + 0.5, done: end + 0.9 }, groups, read: READ };
}
