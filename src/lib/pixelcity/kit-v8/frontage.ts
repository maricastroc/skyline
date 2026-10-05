// FROZEN: detail kit after the simple-index program experiment (baseline of the narrow-lot institutional pass). Do not edit.
import type { Piece } from "./compose";
import type { Structure } from "./structure";

export const SLOT = 2.7;
export const EDGE_ROW = 5.4;

export interface Run {
  from: number;
  to: number;
  cluster: number;
  groups: number;
  gapStart: boolean;
  gapEnd: boolean;
}

export interface FrontagePlan {
  groups: number;
  clusters: number;
  slots: number;
  passages: number;
  clusterShares: number[];
  clusterSlots: number[];
  rows: Map<Piece, Run[][]>;
  why: string;
}

export function rowsOf(pc: Piece): Array<{ length: number; slots: number }> {
  if (pc.type === "full") return Array.from({ length: 4 }, () => ({ length: EDGE_ROW, slots: 2 }));
  const W = pc.w - 0.2;
  if (pc.type === "lot") return [{ length: W, slots: 1 }];
  return [{ length: W, slots: Math.max(1, Math.round(W / SLOT)) }];
}

export function clusterGroups(shares: number[], k: number): number[][] {
  if (shares.length <= k) return shares.map((_, i) => [i]);
  const total = shares.reduce((a, b) => a + b, 0) || 1;
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
  const ends: number[] = [];
  let acc = 0;
  shares.forEach((sh, j) => {
    acc += sh / tot;
    const min = (ends[j - 1] ?? 0) + 1;
    const max = slots - (clusters.length - 1 - j);
    ends.push(j === clusters.length - 1 ? slots : Math.min(max, Math.max(min, Math.round(acc * slots))));
  });
  const clusterAt = (slot: number) => ends.findIndex((e) => slot < e);
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
