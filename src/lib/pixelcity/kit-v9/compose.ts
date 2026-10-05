// FROZEN: semantic / architectural foundation v1 (final baseline after the narrow-lot institutional pass). Do not edit.
import type { ArchStyle, CityGrammar } from "../grammar";
import type { GamePalette } from "../palette";
import { Surf } from "../types";
import { programFor, type Brief } from "./brief";
import { building, type Family, type Program } from "./buildings";
import type { Kit } from "./core";
import type { Run } from "./frontage";
import { plaza, type RoofFamily } from "./massing";
import { softMix, type Comp, type Plan, type Territory } from "./plan";
import type { Use } from "./surface";
import { bench, tree } from "./street";
import { LOTS, N, type Allocation } from "./territory";

export type PieceType = "full" | "half" | "quad" | "lot";
export interface Piece {
  type: PieceType;
  seg: number;
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  corner: boolean;
  interior: boolean;
  lots: number;
}

const QROT = (sx: number, sz: number) => (sx > 0 && sz > 0 ? 0 : sx < 0 && sz > 0 ? -Math.PI / 2 : sx < 0 && sz < 0 ? Math.PI : Math.PI / 2);
const HALVES: Array<{ q: [[number, number], [number, number]]; x: number; z: number; rot: number }> = [
  { q: [[0, 1], [1, 1]], x: 0, z: 3.5, rot: 0 },
  { q: [[1, 0], [1, 1]], x: 3.5, z: 0, rot: Math.PI / 2 },
  { q: [[0, 0], [1, 0]], x: 0, z: -3.5, rot: Math.PI },
  { q: [[0, 0], [0, 1]], x: -3.5, z: 0, rot: -Math.PI / 2 },
];

export function piecesOfBlock(alloc: Allocation, i: number, j: number): Piece[] {
  const own = (a: number, b: number) => alloc.owner[(i * LOTS + a) * N + (j * LOTS + b)];
  const out: Piece[] = [];
  const first = own(0, 0);
  let all = true;
  for (let a = 0; a < LOTS; a++) for (let b = 0; b < LOTS; b++) if (own(a, b) !== first) all = false;
  if (all) return [{ type: "full", seg: first, x: 0, z: 0, rot: 0, w: 14, d: 14, corner: true, interior: false, lots: 16 }];
  const quadSeg = (qa: number, qb: number) => {
    const s = own(qa * 2, qb * 2);
    return own(qa * 2 + 1, qb * 2) === s && own(qa * 2, qb * 2 + 1) === s && own(qa * 2 + 1, qb * 2 + 1) === s ? s : -1;
  };
  const used = new Set<string>();
  for (const h of HALVES) {
    const [[a1, b1], [a2, b2]] = h.q;
    const s = quadSeg(a1, b1);
    if (s < 0 || quadSeg(a2, b2) !== s || used.has(`${a1}${b1}`) || used.has(`${a2}${b2}`)) continue;
    used.add(`${a1}${b1}`).add(`${a2}${b2}`);
    out.push({ type: "half", seg: s, x: h.x, z: h.z, rot: h.rot, w: 14, d: 7, corner: false, interior: false, lots: 8 });
  }
  for (let qa = 0; qa < 2; qa++)
    for (let qb = 0; qb < 2; qb++) {
      const s = quadSeg(qa, qb);
      if (used.has(`${qa}${qb}`)) continue;
      if (s >= 0) {
        used.add(`${qa}${qb}`);
        const sx = qa ? 1 : -1;
        const sz = qb ? 1 : -1;
        out.push({ type: "quad", seg: s, x: sx * 3.5, z: sz * 3.5, rot: QROT(sx, sz), w: 7, d: 7, corner: true, interior: false, lots: 4 });
        continue;
      }
      for (let a = qa * 2; a < qa * 2 + 2; a++)
        for (let b = qb * 2; b < qb * 2 + 2; b++) {
          const x = -5.25 + 3.5 * a;
          const z = -5.25 + 3.5 * b;
          const ex = a === 0 ? -1 : a === 3 ? 1 : 0;
          const ez = b === 0 ? -1 : b === 3 ? 1 : 0;
          const corner = ex !== 0 && ez !== 0;
          const rot = corner ? QROT(ex, ez) : ex > 0 ? Math.PI / 2 : ex < 0 ? -Math.PI / 2 : ez < 0 ? Math.PI : 0;
          out.push({ type: "lot", seg: own(a, b), x, z, rot, w: 3.5, d: 3.5, corner, interior: ex === 0 && ez === 0, lots: 1 });
        }
    }
  return out;
}

export interface ComposeCtx {
  kit: Kit;
  g: CityGrammar;
  p: GamePalette;
  plan: Plan;
  vf: number;
  record: (P: Program, w: number, d: number, fn: () => number) => number;
  frontage?: Map<Piece, Run[][]>;
}

const COMP_CONTENT: Record<Comp, Brief["content"]> = {
  landmark: "media",
  marker: "text",
  continuous: "text",
  parcelled: "links",
  archive: "links",
  grid: "structured",
  media: "media",
  interactive: "action",
  navigation: "links",
  support: "links",
  structured: "structured",
};

const USE: Record<Comp, { use: Use | undefined; reason: string }> = {
  landmark: { use: undefined, reason: "landmark family" },
  marker: { use: "kiosk", reason: "composition: brand marker" },
  continuous: { use: "residential", reason: "composition: continuous text" },
  parcelled: { use: "commercial", reason: "fallback — no matching architectural program" },
  archive: { use: "institutional", reason: "region kind: index (toc, references, directory)" },
  grid: { use: "commercial", reason: "region kind: pricing / product grid" },
  media: { use: "office", reason: "convention: media showcase" },
  interactive: { use: "kiosk", reason: "composition: forms and calls to action" },
  navigation: { use: "commercial", reason: "convention: navigation arcade" },
  support: { use: "service", reason: "region kind: footer" },
  structured: { use: "office", reason: "composition: tables" },
};

export function simpleIndex(t: Territory): boolean {
  const it = t.items;
  if (!it || it.source !== "series") return false;
  return it.count >= 5 && it.linksPerItem >= 0.5 && it.linksPerItem <= 1 && it.charsPerItem < 200 && it.mediaPerItem < 0.5 && it.controlsPerItem < 0.5 && it.titledShare - it.linkTitledShare < 0.5;
}

export function assignUse(t: Territory, comp: Comp): { use: Use | undefined; reason: string } {
  if ((comp === "parcelled" || comp === "grid") && simpleIndex(t)) return { use: "institutional", reason: "simple-index evidence" };
  return USE[comp];
}

function prog(ctx: ComposeCtx, t: Territory, comp: Comp, salt: number, corner = false): Program {
  const b: Brief = { role: comp === "support" ? "support" : "minor", content: COMP_CONTENT[comp], weight: t.weight, repeat: t.repeat, label: shortLabel(t.label) };
  const u = assignUse(t, comp);
  return { ...programFor(b, ctx.g, ctx.p, ctx.kit, salt, corner), use: u.use, useReason: u.reason };
}

const HALF_PASSAGE = 0.35;

function groupedParcelled(ctx: ComposeCtx, pc: Piece, t: Territory, comp: Comp, salt: number, rows: Run[][], W: number, D: number) {
  const { kit } = ctx;
  const P = prog(ctx, t, comp, salt, pc.corner);
  const units = Math.max(2, Math.min(6, Math.round(2 + t.repeat / 6)));
  const roof = P.style === "modern" || P.style === "tech" ? P.roof : "gable";
  const lay = (x: number, z: number, rot: number, length: number, depth: number, rowUnits: number, seed: number, runs: Run[]) => {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const raw = runs.map((r) => (rowUnits * (r.to - r.from)) / length);
    const n = raw.map((v) => Math.max(1, Math.floor(v)));
    let left = Math.max(rowUnits, runs.length) - n.reduce((a, b) => a + b, 0);
    for (const k of raw.map((v, k) => [v - Math.floor(v), k] as const).sort((p, q) => q[0] - p[0]).map(([, k]) => k)) if (left-- > 0) n[k]++;
    let from = 0;
    runs.forEach((r, k) => {
      const a = r.from + (r.gapStart ? HALF_PASSAGE : 0);
      const b = r.to - (r.gapEnd ? HALF_PASSAGE : 0);
      const o = (a + b) / 2 - length / 2;
      place(ctx, x + o * c, z - o * s, rot, b - a, depth, { ...P, roof, seed, family: "rows", units: n[k], unitFrom: from });
      from += n[k];
    });
  };
  if (pc.type === "full") {
    yard(kit, 0, 0, 5.6, 5.6, salt, 2);
    const edges = [
      [0, 4.9, 0],
      [4.9, 0, Math.PI / 2],
      [0, -4.9, Math.PI],
      [-4.9, 0, -Math.PI / 2],
    ] as const;
    edges.forEach(([x, z, rot], k) => lay(x, z, rot, 5.4, 4.0, units, P.seed + Math.round(rot * 10), rows[k]));
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ])
      place(ctx, sx * 4.9, sz * 4.9, QROT(sx, sz), 4.0, 4.0, { ...prog(ctx, t, comp, salt + 11 + sx * 3 + sz, true), family: "corner" });
  } else if (pc.type === "half" || pc.type === "quad") {
    lay(0, D / 2 - 2.1, 0, W, 4.2, pc.type === "half" ? units : Math.max(2, Math.ceil(units / 2)), P.seed, rows[0]);
    yard(kit, 0, -2.2, W, D - 4.4, salt, 1);
  } else place(ctx, 0, 0, 0, W, D, { ...P, family: pc.corner ? "corner" : "walkup" });
}

const lw = (w: number, k: number) => Math.log2(1 + k * w);
const fl = (ctx: ComposeCtx, f: number, min = 1) => Math.max(min, Math.round(f * ctx.vf));

function place(ctx: ComposeCtx, x: number, z: number, rot: number, w: number, d: number, P: Program) {
  ctx.kit.frame(x, z, rot, () => ctx.record(P, w, d, () => building(ctx.kit, w, d, P)));
}
function yard(kit: Kit, x: number, z: number, w: number, d: number, seed: number, trees = 1) {
  kit.span(x - w / 2 + 0.05, x + w / 2 - 0.05, 0, 0.03, z - d / 2 + 0.05, z + d / 2 - 0.05, kit.palette.grass[1], Surf.GRASS);
  for (let t = 0; t < trees; t++) tree(kit, x + (kit.rand(seed, t) - 0.5) * (w - 1.2), z + (kit.rand(seed, t + 7) - 0.5) * (d - 1.2), seed * 3 + t, 0.85, 0.03);
}

export function composePiece(ctx: ComposeCtx, pc: Piece, t: Territory, comp: Comp, salt: number) {
  const { kit } = ctx;
  const w = t.weight;
  if (pc.interior && comp !== "interactive" && comp !== "landmark") {
    yard(kit, pc.x, pc.z, pc.w, pc.d, salt, 1);
    return;
  }
  kit.frame(pc.x, pc.z, pc.rot, () => {
    const W = pc.w - 0.2;
    const D = pc.d - 0.2;
    switch (comp) {
      case "continuous": {
        const floors = fl(ctx, 3 + lw(w, 20), 3);
        const P = { ...prog(ctx, t, comp, salt, pc.corner), floors };
        if (pc.type === "full") place(ctx, 0, 0, 0, W, D, { ...P, family: "courtyard", ground: "shop", ground2: "cafe", corner: P.style === "classic" ? "turret" : undefined, roof: P.style === "classic" ? "mansard" : P.roof === "mansard" ? "flat" : P.roof });
        else if (pc.type === "half") place(ctx, 0, 0, 0, W, D, { ...P, family: "lshape" });
        else place(ctx, 0, 0, 0, W, D, { ...P, family: pc.corner ? "corner" : "walkup" });
        return;
      }
      case "parcelled": {
        const runs = ctx.frontage?.get(pc);
        if (runs) return groupedParcelled(ctx, pc, t, comp, salt, runs, W, D);
        const P = prog(ctx, t, comp, salt, pc.corner);
        const units = Math.max(2, Math.min(6, Math.round(2 + t.repeat / 6)));
        if (pc.type === "full") {
          yard(kit, 0, 0, 5.6, 5.6, salt, 2);
          for (const [x, z, rot] of [
            [0, 4.9, 0],
            [4.9, 0, Math.PI / 2],
            [0, -4.9, Math.PI],
            [-4.9, 0, -Math.PI / 2],
          ] as const)
            place(ctx, x, z, rot, 5.4, 4.0, { ...P, family: "rows", units, roof: P.style === "modern" || P.style === "tech" ? P.roof : "gable", seed: P.seed + Math.round(rot * 10) });
          for (const [sx, sz] of [
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
          ])
            place(ctx, sx * 4.9, sz * 4.9, QROT(sx, sz), 4.0, 4.0, { ...prog(ctx, t, comp, salt + 11 + sx * 3 + sz, true), family: "corner" });
        } else if (pc.type === "half" || pc.type === "quad") {
          place(ctx, 0, D / 2 - 2.1, 0, W, 4.2, { ...P, family: "rows", units: pc.type === "half" ? units : Math.max(2, Math.ceil(units / 2)), roof: P.style === "modern" || P.style === "tech" ? P.roof : "gable" });
          yard(kit, 0, -2.2, W, D - 4.4, salt, 1);
        } else place(ctx, 0, 0, 0, W, D, { ...P, family: pc.corner ? "corner" : "walkup" });
        return;
      }
      case "archive": {
        const floors = fl(ctx, 2 + 0.5 * lw(w, 10), 2);
        const P: Program = { ...prog(ctx, t, comp, salt), family: "walkup", floors, facade: "bands", ground: "blank", roof: "flat", signage: "plaque", awning: "none" };
        const bars = pc.type === "full" ? [-4.6, 0, 4.6] : pc.type === "lot" ? [0] : [1.7, -1.7];
        const depth = pc.type === "full" ? 2.6 : pc.type === "lot" ? 2.2 : 2.3;
        bars.forEach((z, k) => place(ctx, 0, z, k % 2 && pc.type !== "full" ? Math.PI : 0, W - 0.2, depth, { ...P, seed: P.seed + k }));
        return;
      }
      case "grid": {
        const floors = fl(ctx, 3 + 0.5 * lw(w, 10), 2);
        const P: Program = { ...prog(ctx, t, comp, salt), family: "walkup", floors, ground: "shop", signage: "shop", topside: "hvac" };
        const cells: Array<[number, number, number]> = [];
        if (pc.type === "full") for (const x of [-4.6, 0, 4.6]) for (const z of [-4.6, 0, 4.6]) cells.push([x, z, 3.5]);
        else if (pc.type === "half") for (const x of [-4.6, 0, 4.6]) for (const z of [1.6, -1.9]) cells.push([x, z, 3.0]);
        else if (pc.type === "quad") for (const x of [-1.7, 1.7]) for (const z of [-1.7, 1.7]) cells.push([x, z, 2.9]);
        else cells.push([0, 0, 3.0]);
        for (const [x, z, s] of cells) place(ctx, x, z, 0, s, s, P);
        return;
      }
      case "media": {
        const floors = fl(ctx, 6 + 10 * (1 - Math.exp(-w / 0.08)), 4);
        const P: Program = { ...prog(ctx, t, comp, salt), signage: "screen", facade: "curtain" };
        if (pc.type === "full") {
          plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, false, [-W / 2, -W / 2 + 8.2, -D / 2, -D / 2 + 8.2]);
          place(ctx, -W / 2 + 4.1, -D / 2 + 4.1, 0, 8, 8, { ...P, family: "podiumTower", floors, brand: shortLabel(t.label)?.toUpperCase() });
          place(ctx, W / 2 - 2.6, D / 2 - 2.6, 0, 5, 5, { ...P, family: "asymmetric", floors: Math.max(3, Math.round(floors / 3)), seed: P.seed + 3 });
        } else if (pc.type === "half") {
          place(ctx, -3.5, 0, 0, 6.6, D, { ...P, family: "podiumTower", floors, brand: shortLabel(t.label)?.toUpperCase() });
          place(ctx, 3.5, 0.8, 0, 6.4, D - 1.6, { ...P, family: "asymmetric", floors: Math.max(3, Math.round(floors / 3)), seed: P.seed + 3 });
        } else if (pc.type === "quad") place(ctx, 0, 0, 0, W, D, { ...P, family: "podiumTower", floors: Math.max(4, Math.round(floors * 0.75)) });
        else place(ctx, 0, 0, 0, W, D, { ...P, family: "asymmetric", floors: Math.max(2, Math.round(floors / 4)) });
        return;
      }
      case "interactive": {
        const P: Program = { ...prog(ctx, t, comp, salt), family: "kiosk", label: shortLabel(t.label) };
        plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, pc.type === "full", undefined);
        if (pc.type === "full") {
          for (const [x, z] of [
            [-3.5, 2.5],
            [3.5, -2.5],
          ])
            place(ctx, x, z, 0, 1.6, 1.1, P);
          for (let k = 0; k < 4; k++) bench(kit, -2 + k * 1.3, -0.2 + (k % 2) * 0.4, k % 2 ? Math.PI : 0);
        } else place(ctx, 0, pc.type === "lot" ? 0 : D / 2 - 1.2, 0, 1.6, 1.1, P);
        return;
      }
      case "navigation": {
        const P: Program = { ...prog(ctx, t, comp, salt), family: "slab", floors: fl(ctx, 2, 1), ground: "arcade" };
        if (pc.type === "full") {
          plaza(kit, -4, 4, -4, 4, salt, false);
          for (const [x, z, rot] of [
            [0, 5.4, 0],
            [5.4, 0, Math.PI / 2],
            [0, -5.4, Math.PI],
            [-5.4, 0, -Math.PI / 2],
          ] as const)
            place(ctx, x, z, rot, 10.4, 2.6, { ...P, seed: P.seed + Math.round(rot * 10) });
        } else if (pc.type === "lot") place(ctx, 0, 0, 0, W, D, { ...P, family: "walkup", floors: 1 });
        else place(ctx, 0, 0, 0, W, D, P);
        return;
      }
      case "support": {
        const P: Program = { ...prog(ctx, t, comp, salt), family: "walkup", signage: "none" };
        const low = (k: number) => ({ ...P, floors: 1 + (kit.rand(P.seed, k) < 0.4 ? 1 : 0), seed: P.seed + k });
        if (pc.type === "full") {
          yard(kit, 0, 0, 6, 6, salt, 2);
          for (let k = 0; k < 4; k++) {
            const rot = (k * Math.PI) / 2;
            kit.frame(0, 0, rot, () => {
              place(ctx, -3.5, 5, 0, 6.4, 3.6, low(k * 2));
              place(ctx, 3.5, 5, 0, 6.4, 3.6, low(k * 2 + 1));
            });
          }
        } else if (pc.type === "half") {
          for (let k = 0; k < 3; k++) place(ctx, -W / 2 + W / 6 + (k * W) / 3, D / 2 - 1.9, 0, W / 3 - 0.2, 3.6, low(k));
          yard(kit, 0, -1.9, W, D - 3.8, salt, 1);
        } else if (pc.type === "quad") {
          for (let k = 0; k < 2; k++) place(ctx, -W / 4 + (k * W) / 2, D / 2 - 1.9, 0, W / 2 - 0.2, 3.6, low(k));
          yard(kit, 0, -1.9, W, D - 3.8, salt, 1);
        } else place(ctx, 0, 0, 0, W, D, low(0));
        return;
      }
      case "structured": {
        const floors = fl(ctx, 5 + lw(w, 20), 3);
        const P: Program = { ...prog(ctx, t, comp, salt), family: "slab", floors };
        if (pc.type === "full") {
          plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, false, [-W / 2, W / 2, D / 2 - 4.4, D / 2]);
          place(ctx, 0, D / 2 - 2.2, 0, W - 0.2, 4.2, { ...P, ground: "shop" });
          place(ctx, W / 2 - 2.2, -1.6, Math.PI / 2, D - 3.6, 4.2, { ...P, floors: floors + 2, ground: "arcade", seed: P.seed + 3 });
        } else if (pc.type === "lot") place(ctx, 0, 0, 0, W, D, { ...P, family: "walkup", facade: "bands" });
        else place(ctx, 0, 0, 0, W, D, P);
        return;
      }
      case "marker": {
        plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, false);
        place(ctx, 0, 0, 0, 1.6, 1.1, { ...prog(ctx, t, comp, salt), family: "kiosk", label: shortLabel(t.label) });
        return;
      }
      case "landmark":
        plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, pc.type !== "lot");
        return;
    }
  });
}

export const LANDMARK_ROOF: Record<string, Record<ArchStyle, RoofFamily>> = {
  civic: { classic: "dome", retro: "gable", modern: "flat", soft: "terrace", tech: "crown" },
  clocktower: { classic: "spire", retro: "spire", modern: "flat", soft: "terrace", tech: "crown" },
  podiumTower: { classic: "mansard", retro: "flat", modern: "flat", soft: "terrace", tech: "crown" },
  narrowTower: { classic: "spire", retro: "flat", modern: "flat", soft: "terrace", tech: "crown" },
};

export interface LandmarkInfo {
  family: Family | "square";
  floors: number;
  piece: PieceType;
  role: string;
  x: number;
  z: number;
  block: [number, number];
}

export function landmarkFor(t: Territory): { role: string; family: Family | "square" } {
  const top = [...softMix(t.metrics)].sort((a, b) => b.share - a.share)[0]?.comp ?? "continuous";
  if (top === "media") return { role: "showcase", family: "podiumTower" };
  if (top === "parcelled") return { role: "gateway", family: "clocktower" };
  if (top === "interactive") return { role: "call to act", family: "square" };
  return { role: "statement", family: "civic" };
}

export function composeLandmark(ctx: ComposeCtx, pc: Piece, t: Territory, salt: number): Omit<LandmarkInfo, "x" | "z" | "block"> {
  const { kit } = ctx;
  const lm = landmarkFor(t);
  const w = t.weight;
  const base = prog(ctx, t, "landmark", salt);
  const style = ctx.g.style;
  const W = pc.w - 0.4;
  const D = pc.d - 0.4;
  let family = lm.family;
  let floors = 0;
  kit.frame(pc.x, pc.z, pc.rot, () => {
    if (lm.family === "square") {
      plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, true);
      floors = 1;
      place(ctx, 0, D / 2 - 1.5, 0, Math.min(W, 4), 2.4, { ...base, family: "civic", floors: 1, roof: LANDMARK_ROOF.civic[style], brand: shortLabel(t.label)?.toUpperCase() });
      return;
    }
    if (lm.family === "podiumTower" && pc.type === "lot") family = "narrowTower";
    const fam = family as Family;
    floors = fam === "civic" ? 2 + Math.round(6 * Math.sqrt(w)) : fam === "clocktower" ? fl(ctx, 6 + 40 * Math.pow(w, 0.8), 5) : fl(ctx, 8 + 70 * Math.pow(w, 0.8), 6);
    const fw = pc.type === "full" ? (fam === "civic" ? 11 : fam === "clocktower" ? 10 : 9) : W;
    const fd = pc.type === "full" ? (fam === "civic" ? 9 : fam === "clocktower" ? 8 : 9) : D;
    if (pc.type === "full") plaza(kit, -W / 2, W / 2, -D / 2, D / 2, salt, fam === "civic", [-fw / 2, fw / 2, -fd / 2 - 1.5, fd / 2 - 1.5]);
    place(ctx, 0, pc.type === "full" ? -1.5 : 0, 0, fw, fd, { ...base, family: fam, floors, roof: LANDMARK_ROOF[fam]?.[style] ?? base.roof, brand: shortLabel(t.label)?.toUpperCase(), facade: fam === "podiumTower" || fam === "narrowTower" ? "curtain" : base.facade, ground: "lobby" });
  });
  return { family, floors, piece: pc.type, role: lm.role };
}

export function shortLabel(s?: string) {
  if (!s) return undefined;
  const w = s
    .replace(/[^\p{L}\p{N} &+-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  let out = "";
  for (const x of w) {
    if ((out + " " + x).trim().length > 12) break;
    out = (out + " " + x).trim();
  }
  return out || w[0]?.slice(0, 12);
}
