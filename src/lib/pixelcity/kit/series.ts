import type { NNode, NormalizedDocument } from "../../model/types";
import { scopeOf } from "./structure";

export type Arrangement = "strip" | "grid" | "tiles";
export type UnitKind = "picture" | "card" | "key";

export interface Series {
  kind: UnitKind;
  arrangement: Arrangement;
  units: number;
  width: number;
  height: number;
  perRow: number;
  rows: number;
}

const TILE = 72;
const MIN_UNITS = 4;
const MIN_PICTURE = 24;

const median = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : 0);

const LIKE = 0.35;
const MOST = 0.6;
const HELD = 0.25;
const FILLED = 2 / 3;
const SAME = 0.8;
const WORDS = 10;
const GLYPH = 2;

type UnitRole = "unit" | "part" | "wrapper" | "stacked" | "plain" | "mosaic";

interface UnitGroup {
  members: number[];
  hidden: number;
  lines: number[][];
  perRow: number;
  width: number;
  height: number;
  pictured: number;
  kind: UnitKind | null;
  covered: number;
  role: UnitRole;
}

function unitGroups(doc: NormalizedDocument, scope: { roots: number[]; excluded: number[] }): UnitGroup[] {
  const nodes = doc.nodes;
  const ids = scopeOf(nodes, scope.roots, scope.excluded);
  const inScope = new Set(ids);
  const shown = (i: number) => !!nodes[i].box && !nodes[i].cluster && nodes[i].box![2] >= 12 && nodes[i].box![3] >= 12;
  const area = (i: number) => nodes[i].box![2] * nodes[i].box![3];
  const share = (members: number[], f: (n: NNode) => boolean) => members.filter((i) => f(nodes[i])).length / members.length;

  const parents = new Set<number>();
  for (const i of ids) if (nodes[i].parent >= 0) parents.add(nodes[i].parent);
  const seeds = new Map<string, Array<{ members: number[]; hidden: number; width: number; span: number }>>();
  for (const p of parents) {
    const alike = new Map<string, number[]>();
    for (const c of nodes[p].children) {
      if (!inScope.has(c) || !shown(c)) continue;
      const k = `${nodes[c].role}|${nodes[c].tag}`;
      alike.set(k, [...(alike.get(k) ?? []), c]);
    }
    for (const [k, list] of alike) {
      const width = median(list.map((i) => nodes[i].box![2]));
      const members = list.filter((i) => Math.abs(nodes[i].box![2] - width) <= LIKE * width);
      if (members.length < 2) continue;
      const tag = nodes[members[0]].tag;
      const hidden = nodes[p].children.reduce((sum, c) => sum + (inScope.has(c) && nodes[c].cluster?.tag === tag ? nodes[c].cluster!.count : 0), 0);
      const key = `${k}|${nodes[members[0]].level}|${nodes[p].role}|${nodes[p].tag}`;
      seeds.set(key, [...(seeds.get(key) ?? []), { members, hidden, width, span: nodes[p].box?.[2] ?? 0 }]);
    }
  }

  const groups: UnitGroup[] = [];
  for (const list of seeds.values()) {
    const merged: Array<{ members: number[]; hidden: number; width: number; span: number }> = [];
    for (const seed of list.sort((a, b) => b.members.length - a.members.length)) {
      const into = merged.find((g) => Math.abs(g.width - seed.width) <= LIKE * g.width && Math.abs(g.span - seed.span) <= LIKE * g.span);
      if (into) {
        into.members.push(...seed.members);
        into.hidden += seed.hidden;
      } else merged.push({ members: [...seed.members], hidden: seed.hidden, width: seed.width, span: seed.span });
    }
    for (const g of merged) {
      if (g.members.length < MIN_UNITS) continue;
      const members = g.members.sort((a, b) => nodes[a].box![1] - nodes[b].box![1] || nodes[a].box![0] - nodes[b].box![0]);
      const lines: number[][] = [];
      for (const i of members) {
        const line = lines[lines.length - 1];
        const [, y, , h] = nodes[i].box!;
        const first = line && nodes[line[0]].box!;
        const within = (at: number, top: number, tall: number) => at >= top && at <= top + tall;
        if (first && within(y + h / 2, first[1], first[3]) && within(first[1] + first[3] / 2, y, h)) line.push(i);
        else lines.push([i]);
      }
      const width = median(members.map((i) => nodes[i].box![2]));
      const height = median(members.map((i) => nodes[i].box![3]));
      const chars = median(members.map((i) => nodes[i].chars));
      const pictured = share(members, (n) => n.images > 0);
      const key = share(members, (n) => n.role === "button" || n.role === "control") >= SAME && width <= TILE && height <= TILE && chars <= GLYPH;
      const painted = members.map((i) => {
        let most = 0;
        for (let k = i; k < nodes[i].end; k++) {
          const n = nodes[k];
          if ((n.role === "image" || n.image) && n.box && !n.cluster) most = Math.max(most, n.box[2] * n.box[3]);
        }
        return Math.min(1, most / area(i));
      });
      const picture = painted.some((v) => v > 0) ? median(painted) >= SAME : chars < WORDS;
      const kind: UnitKind | null = key ? "key" : pictured >= 0.5 && width >= MIN_PICTURE && height >= MIN_PICTURE ? (picture ? "picture" : "card") : null;
      const perRow = median(lines.map((l) => l.length));
      groups.push({ members, hidden: g.hidden, lines, perRow, width, height, pictured, kind, covered: members.reduce((sum, i) => sum + area(i), 0), role: !kind ? "plain" : perRow < 2 ? "stacked" : "unit" });
    }
  }

  const overlap = (a: number, b: number) => {
    const [ax, ay, aw, ah] = nodes[a].box!;
    const [bx, by, bw, bh] = nodes[b].box!;
    return Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) * Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  };
  const nested: Array<{ outer: UnitGroup; inner: UnitGroup; fill: number; several: boolean }> = [];
  for (const outer of groups) {
    const hosts = new Set(outer.members);
    for (const inner of groups) {
      if (inner === outer) continue;
      const held = new Map<number, number[]>();
      let inside = 0;
      for (const i of inner.members) {
        let host = -1;
        for (let p = nodes[i].parent; p >= 0 && host < 0; p = nodes[p].parent) if (hosts.has(p)) host = p;
        if (host < 0) continue;
        inside++;
        const apart = held.get(host) ?? [];
        if (apart.every((k) => overlap(i, k) < 0.5 * Math.min(area(i), area(k)))) held.set(host, [...apart, i]);
      }
      if (inside < MOST * inner.members.length || held.size < outer.members.length / 2) continue;
      nested.push({ outer, inner, fill: median([...held].map(([host, list]) => list.reduce((sum, i) => sum + area(i), 0) / area(host))), several: median([...held.values()].map((list) => list.length)) >= 2 });
    }
  }
  const wrappers = new Set<UnitGroup>();
  for (const { outer, inner, fill, several } of nested)
    if (several && fill >= FILLED && inner.kind && inner.perRow >= 2 && (inner.kind === "key" || inner.pictured >= SAME) && share(inner.members, (n) => n.chars > 0 || n.links > 0) >= SAME) wrappers.add(outer);
  const parts = new Set<UnitGroup>();
  for (const { outer, inner, fill } of nested) if (!wrappers.has(outer) && (outer.perRow >= 2 || fill < HELD)) parts.add(inner);
  for (const g of groups) {
    if (wrappers.has(g)) g.role = "wrapper";
    else if (parts.has(g)) g.role = "part";
    else if (g.role === "unit" && g.kind === "picture" && median(g.members.map((i) => nodes[i].links)) === 0) {
      const gaps = g.lines.flatMap((l) => l.slice(1).map((i, k) => nodes[i].box![0] - (nodes[l[k]].box![0] + nodes[l[k]].box![2])));
      const drops = g.lines.slice(1).map((l, k) => nodes[l[0]].box![1] - (nodes[g.lines[k][0]].box![1] + nodes[g.lines[k][0]].box![3]));
      if (gaps.length && drops.length && median(gaps) <= 1 && median(drops) <= 1) g.role = "mosaic";
    }
  }
  return groups;
}

export function unitsOf(doc: NormalizedDocument, scope: { roots: number[]; excluded: number[] }): Series | null {
  const nodes = doc.nodes;
  const best = unitGroups(doc, scope)
    .filter((g) => g.role === "unit")
    .sort((a, b) => b.covered - a.covered)[0];
  if (!best) return null;

  const { members, lines, perRow, width, height } = best;
  const ids = scopeOf(nodes, scope.roots, scope.excluded);
  const headings = ids.filter((i) => nodes[i].heading && nodes[i].box && !nodes[i].cluster && nodes[i].fontSize).map((i) => nodes[i].box![1]);
  const top = (l: number[]) => nodes[l[0]].box![1];
  let sets = 1;
  for (let k = 1; k < lines.length; k++) {
    const above = top(lines[k - 1]) + nodes[lines[k - 1][0]].box![3];
    if (headings.some((y) => y >= above - 4 && y < top(lines[k]))) sets++;
  }
  const units = members.length + best.hidden;
  const rows = Math.max(1, Math.round(Math.ceil(units / perRow) / sets));
  return { kind: best.kind!, arrangement: best.kind === "key" ? "tiles" : rows <= 1 ? "strip" : "grid", units, width, height, perRow, rows };
}
