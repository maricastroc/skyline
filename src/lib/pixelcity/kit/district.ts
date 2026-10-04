/**
 * Detail-kit district, semantic allocation: a page (or a synthetic profile) → territories →
 * land in proportion to weight → organisations by region type → buildings.
 *
 *   plan.ts       page → ordered territories with weights and composition mixes
 *   territory.ts  territories → contiguous runs of a 256-lot path (land ∝ weight)
 *   compose.ts    each territory's pieces → buildings; the hero's largest piece → landmark
 *   here          grid, streets, furniture, traffic, the trace and the provenance view
 *
 * The four synthetic profiles of the massing pass still render here (their briefs become
 * territories); the cycle-based generator they were designed for is frozen in kit-v2.
 */
import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { RegionKind, Semantics } from "../../semantics/analyze";
import { deriveGrammar, type CityGrammar, type TimeOfDay } from "../grammar";
import { buildGamePalette } from "../palette";
import { Surf, type Part, type PixelCity } from "../types";
import type { Brief } from "./brief";
import type { Program } from "./buildings";
import type { Anatomy } from "./surface";
import { composeLandmark, composePiece, piecesOfBlock, type LandmarkInfo, type Piece, type PieceType } from "./compose";
import { planFrontage, type FrontagePlan, type Run } from "./frontage";
import { Kit, type PeopleMode } from "./core";
import type { Comp, Plan, Territory } from "./plan";
import { bench, bin, bollards, busShelter, hydrant, mailbox, meter, newsBoxes, SIDEWALK_H, streetLamp, streetSurfaces, streetTree, trafficSignal, type Grid } from "./street";
import { allocate, BLOCKS, LOTS, N, type Allocation } from "./territory";
import { vehicle, type VehicleType } from "./vehicles";

export type ProfileName = "mixed" | "portal" | "product" | "reference";

export interface Profile {
  /** Site identity: what the page's CSS/markup would give the fingerprint. */
  identity: Partial<SiteFingerprint>;
  /** Landmark + majors in reading order (each takes a block). */
  majors: Brief[];
  /** Minor briefs, cycled to fill the lots. */
  minors: Brief[];
}

const L = (label: string): Partial<Brief> => ({ label });
const minor = (content: Brief["content"], weight: number, repeat = 0, label?: string): Brief => ({ role: "minor", content, weight, repeat, label });

export const PROFILES: Record<ProfileName, Profile> = {
  // A general site: some of everything (the prototype's previous mix).
  mixed: {
    identity: { legacy: 0.6, type: { serif: 0.35, sans: 0.65, mono: 0 } },
    majors: [
      { role: "landmark", content: "text", weight: 0.2, repeat: 0, ...L("Skyline") },
      { role: "major", content: "media", weight: 0.18, repeat: 4, ...L("Daily") },
      { role: "major", content: "links", weight: 0.15, repeat: 12, ...L("Market") },
      { role: "major", content: "text", weight: 0.2, repeat: 0 },
      { role: "major", content: "action", weight: 0.05, repeat: 0, ...L("Cafe") },
    ],
    minors: [minor("links", 0.03, 0, "Pizza"), minor("text", 0.04), minor("links", 0.02, 4, "Books"), minor("media", 0.03, 0, "Cinema"), minor("text", 0.05), minor("action", 0.01, 0, "News"), minor("links", 0.02, 0, "Ramen"), minor("text", 0.03, 3), minor("structured", 0.02)],
  },
  // A link portal / news aggregator: a feed of many short items, little media, legacy markup.
  portal: {
    identity: { legacy: 0.9, type: { serif: 0.1, sans: 0.9, mono: 0 }, hues: [{ h: 42, c: 0.16, l: 0.65 }], depth: 0.25, textDensity: 0.3, linkDensity: 0.9 },
    majors: [
      { role: "landmark", content: "links", weight: 0.05, repeat: 0, ...L("Portal") },
      { role: "major", content: "links", weight: 0.4, repeat: 30, ...L("Feed") },
      { role: "major", content: "links", weight: 0.2, repeat: 30, ...L("Jobs") },
      { role: "major", content: "structured", weight: 0.08, repeat: 0, ...L("Data") },
    ],
    minors: [minor("links", 0.02, 6, "Ask"), minor("links", 0.02, 0, "Show"), minor("links", 0.01, 4, "New"), minor("text", 0.02), minor("links", 0.02, 0, "Past"), minor("action", 0.005, 0, "Login"), minor("links", 0.02, 5, "Best")],
  },
  // A product landing page: few big sections, heavy media, calls to action, dark modern CSS.
  product: {
    identity: { darkness: 0.9, type: { serif: 0, sans: 0.7, mono: 0.32 }, roundness: 0.2, airiness: 0.5, ornament: 0.6, imagery: 0.8, hues: [{ h: 275, c: 0.15, l: 0.6 }], depth: 0.6, size: 0.6 },
    majors: [
      { role: "landmark", content: "media", weight: 0.25, repeat: 0, ...L("Product") },
      { role: "major", content: "media", weight: 0.2, repeat: 6, ...L("Build") },
      { role: "major", content: "action", weight: 0.05, repeat: 0, ...L("Start") },
      { role: "major", content: "structured", weight: 0.12, repeat: 3, ...L("Pricing") },
      { role: "major", content: "media", weight: 0.15, repeat: 8, ...L("Customers") },
    ],
    minors: [minor("media", 0.05, 0, "Demo"), minor("action", 0.01, 0, "Signup"), minor("text", 0.03), minor("media", 0.04, 0, "Docs"), minor("structured", 0.03)],
  },
  // A reference article: long hierarchical text, tables, a table of contents, serif type.
  reference: {
    identity: { legacy: 0.1, type: { serif: 0.62, sans: 0.38, mono: 0 }, hues: [{ h: 250, c: 0.06, l: 0.5 }], depth: 0.85, size: 0.8, textDensity: 0.95 },
    majors: [
      { role: "landmark", content: "text", weight: 0.1, repeat: 0, ...L("Archive") },
      { role: "major", content: "text", weight: 0.22, repeat: 0 },
      { role: "major", content: "links", weight: 0.08, repeat: 40, ...L("Index") },
      { role: "major", content: "text", weight: 0.2, repeat: 0 },
      { role: "major", content: "structured", weight: 0.1, repeat: 0, ...L("Tables") },
      { role: "major", content: "text", weight: 0.18, repeat: 0 },
    ],
    minors: [minor("text", 0.05), minor("text", 0.04, 3), minor("links", 0.02, 0, "Books"), minor("text", 0.06), minor("structured", 0.02), minor("text", 0.03)],
  },
};

export interface KitOptions {
  /** A named synthetic profile, or a plan built from a real page (plan.planFromPage). */
  profile?: ProfileName | Plan;
  time?: TimeOfDay;
  people?: PeopleMode;
  seed?: number;
  /** Silhouette test: every building the same colour, no surface patterns, no signs or people. */
  flat?: boolean;
  /** Provenance view: every territory in its own debug colour, labelled (dev only). */
  provenance?: boolean;
  /** Validation: filled with every allocation and building decision (no effect on the output). */
  trace?: KitTrace;
}

export interface TraceBuilding {
  territory: number;
  comp: Comp;
  piece: PieceType;
  block: [number, number];
  P: Program;
  w: number;
  d: number;
  /** Index range of this building's parts in the city's part list. */
  parts: [number, number];
  /** Surface grammar: the anatomy of every volume the building put up (usually one). */
  anatomy: Anatomy[];
}
export interface TracePiece {
  territory: number;
  comp: Comp;
  piece: Piece;
  block: [number, number];
  /** Part index range of everything the piece produced (buildings, plazas, yards). */
  parts: [number, number];
}
export interface KitTrace {
  grammar?: CityGrammar;
  plan?: Plan;
  alloc?: Allocation;
  pieces: TracePiece[];
  buildings: TraceBuilding[];
  landmark: LandmarkInfo | null;
  /** Grouped frontages (intra-territory composition): territory → groups, clusters, passages. */
  frontage: Array<{ territory: number } & Omit<FrontagePlan, "rows">>;
  /** Part index range covered by the blocks (street surfaces, furniture and traffic excluded). */
  range: [number, number];
}

export const newTrace = (): KitTrace => ({ pieces: [], buildings: [], landmark: null, frontage: [], range: [0, 0] });

/** Synthetic profile → plan: each brief once, weights normalised, landmark first. */
export function planFromProfile(prof: Profile, base: SiteFingerprint): Plan {
  const fp: SiteFingerprint = { ...base, ...prof.identity, type: { ...base.type, ...(prof.identity.type ?? {}) } };
  const KIND: Record<Brief["content"], RegionKind> = { text: "section", links: "feed", media: "showcase", action: "form", structured: "pricing" };
  const COMP: Record<Brief["content"], Comp> = { text: "continuous", links: "parcelled", media: "media", action: "interactive", structured: "structured" };
  const all = [...prof.majors, ...prof.minors];
  const sum = all.reduce((s, b) => s + b.weight, 0) || 1;
  const territories: Territory[] = all.map((b, i) => {
    const hero = b.role === "landmark";
    return {
      key: `${b.content}|profile-${i}|${b.label ?? ""}`,
      region: i,
      kind: hero ? "hero" : KIND[b.content],
      source: "region",
      label: b.label,
      weight: b.weight / sum,
      rawWeight: b.weight / sum,
      repeat: b.repeat,
      metrics: { chars: hero ? 400 : 0, links: 0, images: 0, controls: 0, descendants: 0, inTables: 0, items: b.repeat },
      tier: hero ? 0 : b.role === "support" ? 3 : 1,
      order: i,
      mix: [{ comp: hero ? "landmark" : COMP[b.content], share: 1 }],
      content: b.content,
      why: ["synthetic profile brief"],
    };
  });
  return { identity: fp, territories, hero: territories.findIndex((t) => t.kind === "hero") };
}

/** Stable debug colour per territory identity (hash of its key). */
export function debugColor(key: string): RGB {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h >>>= 0;
  const hue = (h % 360) / 360;
  const sat = 0.55 + ((h >> 9) % 4) * 0.1;
  const lit = 0.42 + ((h >> 13) % 3) * 0.1;
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    const a = sat * Math.min(lit, 1 - lit);
    return lit - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

const B = 14;
const S = 1.1;
const R = 2.6;
const P_ = B + 2 * S + R;
export const LINES = [-2, -1, 0, 1, 2].map((k) => k * P_);
export const blockCentre = (i: number, j: number): [number, number] => [(LINES[i] + LINES[i + 1]) / 2, (LINES[j] + LINES[j + 1]) / 2];

export function generateKitDistrict(base: SiteFingerprint, o: KitOptions = {}): PixelCity {
  const plan = typeof o.profile === "object" ? o.profile : planFromProfile(PROFILES[o.profile ?? "mixed"], base);
  const fp = plan.identity;
  const g0 = deriveGrammar(fp);
  const grammar: CityGrammar = { ...g0, time: o.time ?? g0.time };
  const palette = buildGamePalette(fp, grammar);
  const kit = new Kit(palette, o.seed ?? 7, o.people ?? "sprite");
  // Page signals the surface grammar may spend (unused at territory, composition and massing).
  kit.surface = { regularity: fp.regularity, headings: fp.headings, interactivity: fp.interactivity, linkDensity: fp.linkDensity };
  const trace = o.trace ?? (o.provenance ? newTrace() : undefined);

  const grid: Grid = { lines: LINES, road: R, side: S, block: B, ext: 14 };
  const ground: Part[] = [{ mesh: "box", node: -1, x: 0, y: -0.3, z: 0, w: 3000, h: 0.3, d: 3000, rotY: 0, color: palette.sidewalk.map((v) => v * 0.9) as RGB, surf: Surf.PAVING, lit: 0, delay: 0 }];
  streetSurfaces(kit, grid);
  const blocksFrom = kit.parts.length;

  const alloc = allocate(plan);
  // The hero's landmark goes on its largest piece (earliest along the path on ties).
  const pieceRank: Record<PieceType, number> = { full: 3, half: 2, quad: 1, lot: 0 };
  const pathIndex = new Map(alloc.path.map(([x, y], k) => [x * N + y, k]));
  let lmPiece: { i: number; j: number; k: number } | null = null;
  const blockPieces: Piece[][][] = [];
  for (let i = 0; i < BLOCKS; i++) {
    blockPieces.push([]);
    for (let j = 0; j < BLOCKS; j++) {
      const ps = piecesOfBlock(alloc, i, j);
      blockPieces[i].push(ps);
      ps.forEach((pc, k) => {
        if (pc.seg < 0 || alloc.segments[pc.seg].territory !== plan.hero || alloc.segments[pc.seg].comp !== "landmark" || pc.interior) return;
        const at = pathIndex.get((i * LOTS + Math.floor((pc.x + 7) / 3.5)) * N + (j * LOTS + Math.floor((pc.z + 7) / 3.5))) ?? 0;
        if (!lmPiece) return void (lmPiece = { i, j, k });
        const cur = blockPieces[lmPiece.i]?.[lmPiece.j]?.[lmPiece.k] ?? ps[k];
        const curAt = pathIndex.get((lmPiece.i * LOTS + Math.floor((cur.x + 7) / 3.5)) * N + (lmPiece.j * LOTS + Math.floor((cur.z + 7) / 3.5))) ?? 0;
        if (pieceRank[pc.type] > pieceRank[cur.type] || (pieceRank[pc.type] === pieceRank[cur.type] && at < curAt)) lmPiece = { i, j, k };
      });
    }
  }

  let current: { territory: number; comp: Comp; piece: PieceType; block: [number, number] } | null = null;
  const record = (P: Program, w: number, d: number, fn: () => number) => {
    const from = kit.parts.length;
    const an = kit.anatomies.length;
    const top = fn();
    if (trace && current) trace.buildings.push({ ...current, P, w, d, parts: [from, kit.parts.length], anatomy: kit.anatomies.slice(an) });
    return top;
  };
  // Intra-territory composition: parcelled territories with internal structure lay out their
  // frontage group by group (pieces in path order). Without structure nothing is planned.
  const frontage = new Map<Piece, Run[][]>();
  const parcelledPieces = new Map<number, Array<{ pc: Piece; at: number }>>();
  for (let i = 0; i < BLOCKS; i++)
    for (let j = 0; j < BLOCKS; j++)
      blockPieces[i][j].forEach((pc) => {
        if (pc.seg < 0 || pc.interior || alloc.segments[pc.seg].comp !== "parcelled") return;
        const at = pathIndex.get((i * LOTS + Math.floor((pc.x + 7) / 3.5)) * N + (j * LOTS + Math.floor((pc.z + 7) / 3.5))) ?? 0;
        const ti = alloc.segments[pc.seg].territory;
        parcelledPieces.set(ti, [...(parcelledPieces.get(ti) ?? []), { pc, at }]);
      });
  for (const [ti, list] of [...parcelledPieces].sort((a, b) => a[0] - b[0])) {
    const fp = planFrontage(
      plan.territories[ti].structure,
      list.sort((a, b) => a.at - b.at).map((x) => x.pc),
    );
    if (!fp) continue;
    for (const [pc, runs] of fp.rows) frontage.set(pc, runs);
    if (trace) {
      const { groups, clusters, slots, passages, clusterShares, clusterSlots, why } = fp;
      trace.frontage.push({ territory: ti, groups, clusters, slots, passages, clusterShares, clusterSlots, why });
    }
  }
  const ctx = { kit, g: grammar, p: palette, plan, vf: 0.7 + 0.6 * grammar.verticality, record, frontage };

  for (let i = 0; i < BLOCKS; i++)
    for (let j = 0; j < BLOCKS; j++) {
      const [bx, bz] = blockCentre(i, j);
      kit.frame(bx, bz, 0, () => {
        kit.span(-B / 2, B / 2, 0, SIDEWALK_H, -B / 2, B / 2, palette.sidewalk.map((v) => v * 0.94) as RGB, Surf.PAVING);
        kit.frame(
          0,
          0,
          0,
          () =>
            blockPieces[i][j].forEach((pc, k) => {
              if (pc.seg < 0) return;
              const seg = alloc.segments[pc.seg];
              const t = plan.territories[seg.territory];
              const from = kit.parts.length;
              current = { territory: seg.territory, comp: seg.comp, piece: pc.type, block: [i, j] };
              const salt = 1000 + seg.territory * 131 + (i * 4 + j) * 17 + k;
              const isLm = lmPiece && lmPiece.i === i && lmPiece.j === j && lmPiece.k === k;
              if (isLm) {
                const info = composeLandmark(ctx, pc, t, salt);
                if (trace) trace.landmark = { ...info, x: bx + pc.x, z: bz + pc.z, block: [i, j] };
              } else composePiece(ctx, pc, t, seg.comp, salt);
              current = null;
              trace?.pieces.push({ territory: seg.territory, comp: seg.comp, piece: pc, block: [i, j], parts: [from, kit.parts.length] });
            }),
          SIDEWALK_H,
        );
      });
    }
  if (trace) {
    trace.grammar = grammar;
    trace.plan = plan;
    trace.alloc = alloc;
    trace.range = [blocksFrom, kit.parts.length];
  }

  furniture(kit, LINES, B, S, palette);
  intersections(kit, LINES, R, P_);
  traffic(kit, LINES, R, P_, palette);

  let parts = kit.parts;
  let signs = kit.signs;
  if (o.provenance && trace) {
    const r = provenance(kit, plan, alloc, trace);
    parts = r.parts;
    signs = r.signs;
  } else if (o.flat) {
    const grey: RGB = [0.62, 0.62, 0.66];
    parts = parts.filter((q) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow").map((q) => ({ ...q, color: q.y + q.h > SIDEWALK_H + 0.3 ? grey : q.color, surf: Surf.PLAIN, variant: 0, lit: 0 }));
    signs = [];
  }
  let maxHeight = 1;
  for (const q of parts) maxHeight = Math.max(maxHeight, q.y + q.h);
  const semantics: Semantics = { siteName: "", regions: [], regionOf: new Int32Array(0), hero: -1, nav: -1, brand: -1, footer: -1, main: -1, districts: [], sidebars: [], ctas: [] };
  const extent = LINES[LINES.length - 1] * 2 + R;
  return {
    frame: "world",
    scenery: ground,
    worldRoads: [],
    worldExtent: extent,
    fingerprint: fp,
    semantics,
    siteName: "",
    zones: [],
    influences: [],
    rail: null,
    entrance: [0, 0],
    grammar,
    palette,
    size: { w: extent * 0.6, d: extent * 0.6 },
    parts,
    roads: [],
    buildings: [],
    images: [],
    signs,
    signAtlas: kit.signAtlas,
    maxHeight,
    smokestacks: o.flat || o.provenance ? [] : kit.smoke,
    buildDuration: 0,
  };
}

/**
 * Provenance view: territory parts in the territory's debug colour (no textures, no light),
 * a tint on every lot it owns (so plazas and yards show their owner too), a label over each
 * territory with at least 4 lots; streets, cars and furniture greyed out, people hidden.
 */
function provenance(kit: Kit, plan: Plan, alloc: Allocation, trace: KitTrace) {
  const owner = new Int32Array(kit.parts.length).fill(-1);
  for (const pc of trace.pieces) for (let k = pc.parts[0]; k < pc.parts[1]; k++) owner[k] = pc.territory;
  const cols = plan.territories.map((t) => debugColor(t.key));
  const grey: RGB = [0.5, 0.5, 0.53];
  const parts: Part[] = [];
  kit.parts.forEach((q, k) => {
    if (q.mesh === "sprite" || q.mesh === "glow" || q.mesh === "sign") return;
    const t = owner[k];
    const c = t >= 0 ? cols[t] : grey;
    const shade = t >= 0 && q.y + q.h <= SIDEWALK_H + 0.12 ? 0.75 : 1;
    parts.push({ ...q, color: c.map((v) => v * shade) as RGB, surf: Surf.PLAIN, variant: 0, lit: 0 });
  });
  // Lot tints.
  for (let X = 0; X < N; X++)
    for (let Y = 0; Y < N; Y++) {
      const si = alloc.owner[X * N + Y];
      if (si < 0) continue;
      const t = alloc.segments[si].territory;
      const [bx, bz] = blockCentre(X >> 2, Y >> 2);
      const x = bx - 7 + 3.5 * (X & 3) + 1.75;
      const z = bz - 7 + 3.5 * (Y & 3) + 1.75;
      parts.push({ mesh: "box", node: -1, x, y: SIDEWALK_H + 0.005, z, w: 3.42, h: 0.03, d: 3.42, rotY: 0, color: cols[t].map((v) => v * 0.6) as RGB, surf: Surf.PLAIN, lit: 0, delay: 0 });
    }
  // Labels: index and kind over the centroid of each territory's lots.
  const signKit = new Kit(kit.palette, kit.seed);
  plan.territories.forEach((t, ti) => {
    if (alloc.lots[ti] < 4) return;
    let sx = 0;
    let sz = 0;
    let n = 0;
    let top = 1;
    for (const s of alloc.segments) {
      if (s.territory !== ti) continue;
      for (let k = s.from; k < s.from + s.count; k++) {
        const [X, Y] = alloc.path[k];
        const [bx, bz] = blockCentre(X >> 2, Y >> 2);
        sx += bx - 7 + 3.5 * (X & 3) + 1.75;
        sz += bz - 7 + 3.5 * (Y & 3) + 1.75;
        n++;
      }
    }
    for (const b of trace.buildings) if (b.territory === ti) for (let k = b.parts[0]; k < b.parts[1]; k++) top = Math.max(top, kit.parts[k].y + kit.parts[k].h);
    const kind = t.kind === "remainder" ? (t.source === "page" ? "PAGE" : "REST") : t.kind.toUpperCase();
    signKit.sign(`${ti} ${kind}`, sx / n, Math.min(top, 14) + 0.6, sz / n, { bg: cols[ti].map((v) => v * 0.55) as RGB, texel: 0.16, rotY: Math.PI / 4 });
  });
  return { parts: [...parts, ...signKit.parts], signs: signKit.signs };
}

/* ───────────────────────── streets: furniture, signals, traffic ───────────────────────── */

function furniture(kit: Kit, lines: number[], B: number, S: number, palette: PixelCity["palette"]) {
  const curbZ = S - 0.32;
  for (let i = 0; i < lines.length - 1; i++)
    for (let j = 0; j < lines.length - 1; j++) {
      const bx = (lines[i] + lines[i + 1]) / 2;
      const bz = (lines[j] + lines[j + 1]) / 2;
      const sides: Array<[number, number, number]> = [
        [bx, bz + B / 2, 0],
        [bx + B / 2, bz, Math.PI / 2],
        [bx, bz - B / 2, Math.PI],
        [bx - B / 2, bz, -Math.PI / 2],
      ];
      sides.forEach(([sx, sz, rot], si) =>
        kit.frame(
          sx,
          sz,
          rot,
          () => {
            const seed = i * 97 + j * 13 + si;
            const busHere = i === 1 && j === 2 && si === 0;
            // Spacing and the lamp/tree cadence vary per side: no single rhythm across the city.
            const step = 1.05 + kit.rand(seed, 1) * 0.35;
            const cadence = 3 + Math.floor(kit.rand(seed, 2) * 2);
            let n = 0;
            for (let u = -B / 2 + 0.9; u <= B / 2 - 0.9; u += step, n++) {
              if (busHere && Math.abs(u) < 1.3) continue;
              if (n % cadence === 0) streetLamp(kit, u, curbZ);
              else if (kit.rand(seed, n + 900) < 0.62) streetTree(kit, u, curbZ - 0.05, seed * 5 + n);
              else {
                const r = kit.rand(seed, n);
                if (r < 0.2) hydrant(kit, u, curbZ);
                else if (r < 0.4) meter(kit, u, curbZ);
                else if (r < 0.55) bin(kit, u, curbZ);
                else if (r < 0.75) bench(kit, u, curbZ - 0.15, Math.PI);
              }
              if (kit.rand(seed, n + 300) < 0.42) {
                const pz = 0.35 + kit.rand(seed, n + 400) * 0.35;
                const pose = kit.rand(seed, n + 500) < 0.5 ? "walkA" : kit.rand(seed, n + 501) < 0.6 ? "walkB" : "stand";
                kit.person(u + 0.4, pz, { variant: Math.floor(kit.rand(seed, n + 600) * 48), pose, flip: kit.rand(seed, n + 700) < 0.5 });
              }
            }
            if (si === 0 && (i + j) % 2 === 0) {
              mailbox(kit, -B / 2 + 0.55, 0.3);
              newsBoxes(kit, B / 2 - 0.9, 0.3);
            }
            if (si === 1 && (i + j) % 2 === 1) bollards(kit, B / 2 - 0.6, curbZ);
            if (busHere) {
              busShelter(kit, 0, 0.62, palette.accents[1], "M5");
              for (let k = 0; k < 3; k++) kit.person(-0.45 + k * 0.32, 0.55 + (k % 2) * 0.12, { variant: 7 + k * 5, pose: k === 1 ? "sit" : "stand", flip: k === 2 });
            }
          },
          SIDEWALK_H,
        ),
      );
    }
}

const STREETS = ["MAIN ST", "1ST AVE"];

function intersections(kit: Kit, lines: number[], R: number, P: number) {
  for (const [ci, cx] of lines.entries())
    for (const [cj, cz] of lines.entries()) {
      if (Math.abs(cx) > P || Math.abs(cz) > P) continue;
      const o = R / 2 + 0.3;
      const goX = (ci + cj) % 2 === 0;
      const centre = ci === 2 && cj === 2;
      kit.frame(
        cx,
        cz,
        0,
        () => {
          trafficSignal(kit, o, o, 0, !goX, centre ? STREETS[0] : undefined);
          trafficSignal(kit, -o, o, -Math.PI / 2, goX);
          trafficSignal(kit, -o, -o, Math.PI, !goX);
          trafficSignal(kit, o, -o, Math.PI / 2, goX, centre ? STREETS[1] : undefined);
        },
        SIDEWALK_H,
      );
      if (centre) {
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.45 + k * 0.25, R / 2 + 0.6 - (k % 2) * 0.2, { variant: 20 + k, pose: "stand", flip: k % 2 === 0, y: SIDEWALK_H });
        for (let k = 0; k < 2; k++) kit.person(-R / 2 - 0.5 - k * 0.3, R / 2 + 0.55, { variant: 30 + k, pose: "stand", y: SIDEWALK_H });
        for (let k = 0; k < 3; k++) kit.person(R / 2 + 0.4, -0.8 + k * 0.6, { variant: 36 + k, pose: k % 2 ? "walkA" : "walkB", flip: k === 1, y: 0.05 });
      }
    }
}

function traffic(kit: Kit, lines: number[], R: number, P: number, palette: PixelCity["palette"]) {
  const carColors: RGB[] = [palette.accents[0], palette.accents[1], [0.92, 0.92, 0.9], [0.2, 0.22, 0.26], [0.75, 0.2, 0.18], [0.55, 0.6, 0.66]];
  const types: VehicleType[] = ["sedan", "hatch", "sedan", "van", "hatch", "taxi"];
  let vi = 0;
  for (const c of lines)
    for (let k = 0; k < lines.length - 1; k++) {
      const a = lines[k] + R / 2 + 1.6;
      const b = lines[k + 1] - R / 2 - 1.6;
      for (const side of [-1, 1])
        for (let t = a; t < b; t += 1.25) {
          if (kit.rand(vi++, 3) > 0.5) continue;
          if (c === P && side > 0 && Math.abs(t + P / 2) < 2) continue;
          const type = kit.pick(types, vi, 4);
          const color = type === "taxi" ? ([0.98, 0.78, 0.18] as RGB) : kit.pick(carColors, vi, 5);
          const lane = c + side * (R / 2 - 0.32);
          vehicle(kit, t, lane, side > 0 ? 0 : Math.PI, type, color);
          vehicle(kit, lane, t, side > 0 ? -Math.PI / 2 : Math.PI / 2, kit.pick(types, vi, 6), kit.pick(carColors, vi, 7));
        }
    }
  vehicle(kit, R / 2 + 1.6, -0.62, Math.PI, "sedan", palette.accents[2]);
  vehicle(kit, R / 2 + 2.8, -0.62, Math.PI, "taxi", [0.98, 0.78, 0.18]);
  vehicle(kit, -0.62, -0.4, -Math.PI / 2, "hatch", [0.2, 0.55, 0.85]);
  vehicle(kit, -P / 2, P + R / 2 - 0.45, 0, "bus", palette.accents[1]);
  vehicle(kit, P / 2 + 1.5, R / 2 - 0.9, 0, "truck", palette.accents[0], "FRESH");
  kit.person(P / 2 + 0.55, R / 2 - 0.35, { variant: 44, pose: "walkA", y: 0.05 });
}
