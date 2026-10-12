import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const walk = (n: SnapshotNode, fn: (n: SnapshotNode) => void) => {
  fn(n);
  for (const c of n.children) walk(c, fn);
};
const textOf = (n: SnapshotNode): number => n.text + n.children.reduce((s, c) => s + textOf(c), 0);
const sig = (n: SnapshotNode) => `${n.tag}.${n.classes?.[0] ?? ""}`;

export function scaleText(s: DomSnapshot, k: number): DomSnapshot {
  const snap = clone(s);
  walk(snap.root, (n) => (n.text = Math.round(n.text * k)));
  return snap;
}

export function dropEvery(s: DomSnapshot, is: (n: SnapshotNode) => boolean, keep: number): DomSnapshot {
  const snap = clone(s);
  let i = 0;
  walk(snap.root, (n) => {
    n.children = n.children.filter((c) => !is(c) || i++ % 100 < keep * 100);
  });
  return snap;
}
export const dropLinks = (s: DomSnapshot, keep: number) => dropEvery(s, (n) => n.tag === "a", keep);
export const dropImages = (s: DomSnapshot, keep: number) => dropEvery(s, (n) => Boolean(n.image) || n.tag === "img" || n.tag === "picture", keep);

export interface MainList {
  parent: SnapshotNode;
  items: SnapshotNode[];
  share: number;
}

export function mainList(snap: DomSnapshot): MainList | null {
  const total = textOf(snap.root) || 1;
  let best: MainList | null = null;
  walk(snap.root, (n) => {
    const groups = new Map<string, SnapshotNode[]>();
    for (const c of n.children) groups.set(sig(c), [...(groups.get(sig(c)) ?? []), c]);
    for (const items of groups.values()) {
      if (items.length < 6) continue;
      const share = items.reduce((a, c) => a + textOf(c), 0) / total;
      if (!best || share > best.share) best = { parent: n, items, share };
    }
  });
  return best;
}

export function keepItems(s: DomSnapshot, count: number): DomSnapshot | null {
  const snap = clone(s);
  const list = mainList(snap);
  if (!list || list.share < 0.2 || list.items.length < count) return null;
  const drop = new Set(list.items.slice(count));
  list.parent.children = list.parent.children.filter((c) => !drop.has(c));
  return snap;
}

export function thinItems(s: DomSnapshot, keep: number): DomSnapshot | null {
  const snap = clone(s);
  const list = mainList(snap);
  if (!list || list.share < 0.2) return null;
  const drop = new Set(list.items.filter((_, i) => (i * 7) % 10 >= keep * 10));
  list.parent.children = list.parent.children.filter((c) => !drop.has(c));
  return snap;
}

export function shuffleItems(s: DomSnapshot): DomSnapshot | null {
  const snap = clone(s);
  const list = mainList(snap);
  if (!list || list.share < 0.2) return null;
  const slots = list.parent.children.map((c, i) => (list.items.includes(c) ? i : -1)).filter((i) => i >= 0);
  const order = [...list.items].reverse();
  slots.forEach((slot, k) => (list.parent.children[slot] = order[k]));
  return snap;
}

export function dropItems(s: DomSnapshot, n: number): DomSnapshot | null {
  const snap = clone(s);
  const list = mainList(snap);
  if (!list || list.share < 0.2 || list.items.length <= n + 5) return null;
  const drop = new Set(list.items.slice(-n));
  list.parent.children = list.parent.children.filter((c) => !drop.has(c));
  return snap;
}

export function addItems(s: DomSnapshot, n: number): DomSnapshot | null {
  const snap = clone(s);
  const list = mainList(snap);
  if (!list || list.share < 0.2) return null;
  const at = list.parent.children.indexOf(list.items[list.items.length - 1]);
  list.parent.children.splice(at + 1, 0, ...list.items.slice(0, n).map((c) => clone(c)));
  return snap;
}
