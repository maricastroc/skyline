import type { Piece, PieceType } from "./compose";
import type { Comp, Plan, Territory } from "./plan";
import type { Allocation } from "./territory";

export interface LayoutGroup {
  id: string;
  kind: "items" | "controls";
  count: number;
  share: number;
  level: number;
}

export interface TerritoryModel {
  index: number;
  key: string;
  kind: Territory["kind"];
  importance: { weight: number; tier: number };
  lots: number;
  fabrics: Array<{ comp: Comp; share: number }>;
  counts: { items: number; controls: number };
  groups: LayoutGroup[];
  dominants: number;
}

export interface Ensemble {
  id: string;
  territory: number;
  group: number;
  groups: number;
  pieces: number[];
  lots: number;
  anchor: number;
  units: number;
}

export interface PieceBrief {
  territory: number;
  ensemble: number;
  ordinal: number;
  first: boolean;
  dominants: number;
  units: number;
}

export interface Room {
  dominants: number;
  units: number;
}
export type RoomOf = (comp: Comp, type: PieceType) => Room | null;

export interface PlacedPiece {
  piece: Piece;
  at: number;
  territory: number;
  comp: Comp;
}

export interface Layout {
  territories: TerritoryModel[];
  ensembles: Ensemble[];
  pieces: PlacedPiece[];
  briefs: Map<Piece, PieceBrief>;
}

export function modelsOf(plan: Plan, alloc: Allocation): TerritoryModel[] {
  return plan.territories.map((t, index) => {
    const c = t.census;
    const s = t.structure && t.structure.source !== "none" && t.structure.groups.length >= 2 ? t.structure : null;
    const groups: LayoutGroup[] = s
      ? s.groups.map((g, k) => ({ id: `${t.key}#${k}`, kind: "items", count: g.items, share: g.share, level: g.level ?? 0 }))
      : c && c.controlGroups.length >= 1 && [...t.mix].sort((a, b) => b.share - a.share)[0]?.comp === "interactive"
        ? c.controlGroups.map((g) => ({ id: `${t.key}#${g.key}`, kind: "controls", count: g.count, share: g.count / Math.max(c.controls, 1), level: 0 }))
        : c && c.items >= 5
          ? [{ id: `${t.key}#items`, kind: "items", count: c.items, share: 1, level: 0 }]
          : [];
    return {
      index,
      key: t.key,
      kind: t.kind,
      importance: { weight: t.weight, tier: t.tier },
      lots: alloc.lots[index] ?? 0,
      fabrics: t.mix,
      counts: { items: c?.items ?? (s ? s.items : t.repeat), controls: c?.controls ?? t.metrics.controls },
      groups,
      dominants: groups.length,
    };
  });
}

function shareOut(total: number, weights: number[], caps: number[]): number[] {
  const all = weights.reduce((a, b) => a + b, 0) || 1;
  const out: number[] = [];
  let cum = 0;
  let placed = 0;
  for (let k = 0; k < weights.length; k++) {
    cum += weights[k];
    const n = Math.max(0, Math.min(caps[k], Math.round((total * cum) / all) - placed));
    out.push(n);
    placed += n;
  }
  return out;
}

export function layoutOf(plan: Plan, alloc: Allocation, placed: PlacedPiece[], roomOf: RoomOf): Layout {
  const territories = modelsOf(plan, alloc);
  const pieces = [...placed].sort((a, b) => a.territory - b.territory || a.at - b.at);
  const ensembles: Ensemble[] = [];
  const briefs = new Map<Piece, PieceBrief>();
  for (const m of territories) {
    const mine = pieces.map((p, k) => ({ p, k })).filter((x) => x.p.territory === m.index);
    if (!mine.length) continue;
    const lots = mine.map((x) => x.p.piece.lots);
    const total = lots.reduce((a, b) => a + b, 0) || 1;
    const room = mine.map((x) => roomOf(x.p.comp, x.p.piece.type));
    const units = m.groups[0]?.kind === "controls" ? m.counts.controls : m.counts.items;
    const fits = (cap: (r: Room | null) => number) => lots.map((l, k) => (cap(room[k]) > 0 ? l : 0));
    const dominants = shareOut(m.dominants, fits((r) => r?.dominants ?? 0), room.map((r) => r?.dominants ?? 0));
    const perPiece = room.some(Boolean) ? shareOut(units, fits((r) => r?.units ?? 0), room.map((r) => r?.units ?? 0)) : shareOut(units, lots, lots.map(() => Number.MAX_SAFE_INTEGER));

    const bounds: number[] = [];
    let acc = 0;
    for (const g of m.groups) bounds.push((acc += g.share));
    const scale = acc || 1;
    const groupOf = (mid: number) => {
      if (!m.groups.length) return -1;
      const g = bounds.findIndex((b) => mid < b / scale);
      return g < 0 ? m.groups.length - 1 : g;
    };
    let cum = 0;
    let current: Ensemble | null = null;
    mine.forEach((x, ordinal) => {
      const g = groupOf((cum + lots[ordinal] / 2) / total);
      cum += lots[ordinal];
      const opens = !current || current.group !== g;
      if (opens) {
        current = { id: g >= 0 ? m.groups[g].id : `${m.key}#all`, territory: m.index, group: g, groups: 0, pieces: [], lots: 0, anchor: -1, units: 0 };
        ensembles.push(current);
      }
      const e = current!;
      e.pieces.push(x.k);
      e.lots += lots[ordinal];
      e.units += perPiece[ordinal];
      if (e.anchor < 0 && dominants[ordinal] > 0) e.anchor = x.k;
      briefs.set(x.p.piece, { territory: m.index, ensemble: ensembles.length - 1, ordinal, first: opens, dominants: dominants[ordinal], units: perPiece[ordinal] });
    });
    const own = ensembles.filter((e) => e.territory === m.index);
    for (let g = 0; g < m.groups.length; g++) {
      const home = own.find((e) => e.group === g) ?? [...own].reverse().find((e) => e.group < g) ?? own[0];
      home.groups++;
    }
  }
  return { territories, ensembles, pieces, briefs };
}
