// FROZEN: detail kit after the surface grammar pass (baseline of the openings depth pass). Do not edit.
import type { Comp, Plan } from "./plan";

export const LOTS = 4;
export const BLOCKS = 4;
export const N = LOTS * BLOCKS;
export const LOT_TOTAL = N * N;

export interface Segment {
  territory: number;
  comp: Comp;
  from: number;
  count: number;
}

export interface Allocation {
  path: Array<[number, number]>;
  owner: Int32Array;
  segments: Segment[];
  lots: number[];
}

type Side = "-x" | "+x" | "-z" | "+z";
const OPP: Record<Side, Side> = { "-x": "+x", "+x": "-x", "-z": "+z", "+z": "-z" };

export const SPIRAL: Array<[number, number]> = [
  [1, 1], [2, 1], [2, 2], [1, 2],
  [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0],
  [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3],
];

const sideBetween = (a: [number, number], b: [number, number]): Side => (b[0] > a[0] ? "+x" : b[0] < a[0] ? "-x" : b[1] > a[1] ? "+z" : "-z");
const touches = (u: number, v: number, s: Side) => (s === "-x" ? u === 0 : s === "+x" ? u === 1 : s === "-z" ? v === 0 : v === 1);
const CYCLE: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function walk(out: Array<[number, number]>, x0: number, y0: number, size: number, entry: Side | null, exit: Side | null, hint: [number, number]) {
  if (size === 1) {
    out.push([x0, y0]);
    return;
  }
  const h = size / 2;
  const cellOf = (p: [number, number]): [number, number] => [Math.min(1, Math.max(0, Math.floor((p[0] - x0) / h))), Math.min(1, Math.max(0, Math.floor((p[1] - y0) / h)))];
  const want = cellOf(hint);
  let best: Array<[number, number]> | null = null;
  let bestScore = -1;
  for (let s = 0; s < 4; s++)
    for (const d of [1, -1]) {
      const seq = [0, 1, 2, 3].map((k) => CYCLE[(((s + d * k) % 4) + 4) % 4]);
      if (entry && !touches(seq[0][0], seq[0][1], entry)) continue;
      if (exit && !touches(seq[3][0], seq[3][1], exit)) continue;
      const score = (seq[0][0] === want[0] && seq[0][1] === want[1] ? 2 : 0) + (d === 1 ? 0.5 : 0) - s * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = seq;
      }
    }
  const seq = best!;
  for (let k = 0; k < 4; k++) {
    const [u, v] = seq[k];
    const e = k === 0 ? entry : OPP[sideBetween(seq[k - 1], seq[k])];
    const x = k === 3 ? exit : sideBetween(seq[k], seq[k + 1]);
    const last = out.length ? out[out.length - 1] : hint;
    walk(out, x0 + u * h, y0 + v * h, h, e, x, k === 0 ? hint : last);
  }
}

let cachedPath: Array<[number, number]> | null = null;
export function lotPath(): Array<[number, number]> {
  if (cachedPath) return cachedPath;
  const out: Array<[number, number]> = [];
  SPIRAL.forEach((b, k) => {
    const entry = k === 0 ? null : OPP[sideBetween(SPIRAL[k - 1], b)];
    const exit = k === SPIRAL.length - 1 ? null : sideBetween(b, SPIRAL[k + 1]);
    let hint: [number, number];
    if (k === 0) hint = [b[0] * LOTS + LOTS - 1, b[1] * LOTS + LOTS - 1];
    else {
      const [px, py] = out[out.length - 1];
      hint = entry === "-x" ? [b[0] * LOTS, py] : entry === "+x" ? [b[0] * LOTS + LOTS - 1, py] : entry === "-z" ? [px, b[1] * LOTS] : [px, b[1] * LOTS + LOTS - 1];
    }
    walk(out, b[0] * LOTS, b[1] * LOTS, LOTS, entry, exit, hint);
  });
  cachedPath = out;
  return out;
}

export function allocate(plan: Plan): Allocation {
  const path = lotPath();
  const segs: Array<{ territory: number; comp: Comp; w: number }> = [];
  plan.territories.forEach((t, i) => t.mix.forEach((m) => segs.push({ territory: i, comp: m.comp, w: t.weight * m.share })));
  const total = segs.reduce((s, x) => s + x.w, 0) || 1;
  const segments: Segment[] = [];
  let acc = 0;
  let prev = 0;
  for (const s of segs) {
    acc += s.w / total;
    const b = Math.round(acc * LOT_TOTAL);
    segments.push({ territory: s.territory, comp: s.comp, from: prev, count: b - prev });
    prev = b;
  }
  const owner = new Int32Array(LOT_TOTAL).fill(-1);
  segments.forEach((s, si) => {
    for (let k = s.from; k < s.from + s.count; k++) {
      const [x, y] = path[k];
      owner[x * N + y] = si;
    }
  });
  const lots = plan.territories.map(() => 0);
  for (const s of segments) lots[s.territory] += s.count;
  return { path, owner, segments, lots };
}
