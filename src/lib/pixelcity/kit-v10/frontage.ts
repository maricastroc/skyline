// FROZEN: art direction C1, street roles (the street-role kit). Do not edit.
/**
 * Intra-territory composition: a parcelled territory whose page content is organised in groups
 * (structure.ts) lays its street frontage out group by group, inside the land it already has.
 *
 *   territory frontage   every street-facing row of its parcelled pieces, in path order, cut into
 *                        SLOTS of ~2.7 (half an edge row; a lot is one slot)
 *   clusters             consecutive groups merged into at most ⌈slots / 2⌉ spatial clusters:
 *                        boundaries at equal cumulative shares, snapped to group boundaries, so a
 *                        big group stays one (longer) cluster and many small ones share one
 *   runs                 clusters → slots by cumulative rounding (≥ 1 slot each): a cluster of
 *                        page groups becomes a run of the same attached series (its units are
 *                        still the items); EVERY change of cluster along the frontage opens a
 *                        passage — mid-row, or between a row and its corner building
 *
 * A territory without structure (one sequence, no evidence) is NOT planned: the composition
 * keeps the kit-v6 layout exactly. The plan never changes the territory's land, its pieces or
 * its lots — only how the frontage it already has is divided.
 */
import type { Piece } from "./compose";
import type { Structure } from "./structure";

export const SLOT = 2.7;
/** Row lengths along each piece type's street frontage (local piece frame, see composePiece). */
export const EDGE_ROW = 5.4;

export interface Run {
  /** Along the row, from its start (0 … row length). */
  from: number;
  to: number;
  cluster: number;
  /** Page groups in the cluster. */
  groups: number;
  /** The frontage changes cluster at this run's start / end: leave a passage there. */
  gapStart: boolean;
  gapEnd: boolean;
}

export interface FrontagePlan {
  groups: number;
  clusters: number;
  slots: number;
  /** Passages opened along the frontage (one per change of cluster). */
  passages: number;
  /** Share of the territory's grouped content in each cluster, and its slots. */
  clusterShares: number[];
  clusterSlots: number[];
  /** Runs per piece, per frontage row (full: 4 edge rows; half / quad / lot: 1). */
  rows: Map<Piece, Run[][]>;
  why: string;
}

/** Street-facing rows of a parcelled piece: their lengths and slot counts. */
export function rowsOf(pc: Piece): Array<{ length: number; slots: number }> {
  if (pc.type === "full") return Array.from({ length: 4 }, () => ({ length: EDGE_ROW, slots: 2 }));
  const W = pc.w - 0.2;
  if (pc.type === "lot") return [{ length: W, slots: 1 }];
  return [{ length: W, slots: Math.max(1, Math.round(W / SLOT)) }];
}

/** Consecutive groups → at most k clusters: every group alone if they fit, else cuts at equal cumulative shares snapped to group ends. */
export function clusterGroups(shares: number[], k: number): number[][] {
  // Room for every group: each is its own cluster (merging only happens when frontage is short).
  if (shares.length <= k) return shares.map((_, i) => [i]);
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  // cum[i] = share of groups 0..i-1 (the boundary BEFORE group i), i = 1 … n-1.
  const cum: number[] = [0];
  for (const s of shares) cum.push(cum[cum.length - 1] + s / total);
  const cuts = new Set<number>();
  for (let j = 1; j < k; j++) {
    let best = 1;
    for (let i = 2; i < shares.length; i++) if (Math.abs(cum[i] - j / k) < Math.abs(cum[best] - j / k)) best = i;
    if (shares.length > 1) cuts.add(best);
  }
  const out: number[][] = [];
  let start = 0;
  for (const cut of [...[...cuts].sort((a, b) => a - b), shares.length]) {
    if (cut > start) out.push(Array.from({ length: cut - start }, (_, i) => start + i));
    start = cut;
  }
  return out;
}

export function planFrontage(s: Structure | undefined, pieces: Piece[]): FrontagePlan | null {
  if (!s || s.source === "none" || s.groups.length < 2 || !pieces.length) return null;
  const rows = pieces.map((pc) => rowsOf(pc));
  const slots = rows.flat().reduce((a, r) => a + r.slots, 0);
  if (slots < 2) return null;
  const k = Math.min(s.groups.length, Math.max(2, Math.ceil(slots / 2)));
  const clusters = clusterGroups(
    s.groups.map((g) => g.share),
    k,
  );
  if (clusters.length < 2) return null;
  const shares = clusters.map((cl) => cl.reduce((a, i) => a + s.groups[i].share, 0));
  const tot = shares.reduce((a, b) => a + b, 0) || 1;
  // Cumulative rounding, each cluster at least one slot.
  const ends: number[] = [];
  let acc = 0;
  shares.forEach((sh, j) => {
    acc += sh / tot;
    const min = (ends[j - 1] ?? 0) + 1;
    const max = slots - (clusters.length - 1 - j);
    ends.push(j === clusters.length - 1 ? slots : Math.min(max, Math.max(min, Math.round(acc * slots))));
  });
  const clusterAt = (slot: number) => ends.findIndex((e) => slot < e);
  // Slots → runs per row.
  const out = new Map<Piece, Run[][]>();
  let slot = 0;
  pieces.forEach((pc, p) => {
    const pr: Run[][] = [];
    for (const r of rows[p]) {
      const w = r.length / r.slots;
      const runs: Run[] = [];
      for (let k2 = 0; k2 < r.slots; k2++, slot++) {
        const cl = clusterAt(slot);
        const last = runs[runs.length - 1];
        if (last && last.cluster === cl) last.to = (k2 + 1) * w;
        else runs.push({ from: k2 * w, to: (k2 + 1) * w, cluster: cl, groups: clusters[cl].length, gapStart: slot > 0 && clusterAt(slot - 1) !== cl, gapEnd: false });
        runs[runs.length - 1].gapEnd = slot + 1 < slots && clusterAt(slot + 1) !== cl;
      }
      pr.push(runs);
    }
    out.set(pc, pr);
  });
  const passages = clusters.length - 1;
  return {
    groups: s.groups.length,
    clusters: clusters.length,
    slots,
    passages,
    clusterShares: shares.map((x) => x / tot),
    clusterSlots: ends.map((e, j) => e - (ends[j - 1] ?? 0)),
    rows: out,
    why: `${s.groups.length} ${s.source} groups → ${clusters.length} spatial clusters over ${slots} frontage slots (≤ ⌈slots / 2⌉) → ${passages} passages`,
  };
}
