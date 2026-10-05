// FROZEN: art direction C3, street life (the street-life kit, art direction baseline). Do not edit.
import type { Allocation } from "./territory";
import { N } from "./territory";
import type { Comp, Plan } from "./plan";

export type StreetRole = "primary" | "street" | "lane" | "pedestrian";
export const RANK: Record<StreetRole, number> = { pedestrian: 0, lane: 1, street: 2, primary: 3 };

const OPEN = new Set<Comp>(["media", "interactive", "landmark", "marker"]);
const LINKS = new Set<Comp>(["parcelled", "archive", "navigation", "support"]);
const TIER = ["hero", "content", "chrome", "footer", "rest"];

export interface StreetSegment {
  axis: "x" | "z";
  line: number;
  span: number;
  role: StreetRole;
  votes: StreetRole[];
  why: string;
}

export interface StreetPlan {
  segments: StreetSegment[];
  role(axis: "x" | "z", line: number, span: number): StreetRole;
  crossing(i: number, j: number): StreetRole;
}

export function planStreets(plan: Plan, alloc: Allocation): StreetPlan {
  const lot = (X: number, Y: number) => {
    if (X < 0 || Y < 0 || X >= N || Y >= N) return null;
    const s = alloc.owner[X * N + Y];
    if (s < 0) return null;
    const seg = alloc.segments[s];
    return { territory: seg.territory, comp: seg.comp, tier: plan.territories[seg.territory].tier };
  };
  const segments: StreetSegment[] = [];
  for (const axis of ["x", "z"] as const)
    for (let line = 0; line <= 4; line++)
      for (let span = 0; span < 4; span++) {
        const votes: StreetRole[] = [];
        const notes: string[] = [];
        for (let k = 0; k < 4; k++) {
          const along = 4 * span + k;
          const lo = axis === "x" ? lot(along, 4 * line - 1) : lot(4 * line - 1, along);
          const hi = axis === "x" ? lot(along, 4 * line) : lot(4 * line, along);
          const a = lo ?? hi;
          const b = hi ?? lo;
          if (!a || !b) continue;
          if (a.territory === b.territory) {
            if (LINKS.has(a.comp)) votes.push("lane");
            else if (OPEN.has(a.comp)) votes.push("pedestrian");
            else votes.push("street");
            if (k === 0) notes.push(lo && hi ? `inside t${a.territory} (${a.comp})` : `edge of t${a.territory} (${a.comp})`);
          } else if (a.tier !== b.tier) {
            votes.push("primary");
            if (!notes.length) notes.push(`seam ${TIER[a.tier] ?? a.tier} t${a.territory} | ${TIER[b.tier] ?? b.tier} t${b.territory}`);
          } else if (OPEN.has(a.comp) && OPEN.has(b.comp)) {
            votes.push("pedestrian");
            if (!notes.length) notes.push(`open ground both sides (${a.comp} | ${b.comp})`);
          } else {
            votes.push("street");
            if (!notes.length) notes.push(`seam t${a.territory} | t${b.territory} (same tier)`);
          }
        }
        const count = (r: StreetRole) => votes.filter((v) => v === r).length;
        const best = Math.max(...(Object.keys(RANK) as StreetRole[]).map(count));
        const top = (Object.keys(RANK) as StreetRole[]).filter((r) => count(r) === best);
        const role: StreetRole = votes.length === 0 ? "street" : top.length === 1 ? top[0] : "street";
        const tally = (Object.keys(RANK) as StreetRole[]).filter(count).map((r) => `${r} ${count(r)}`).join(", ");
        segments.push({ axis, line, span, role, votes, why: `${tally}${top.length > 1 ? " → tie: street" : ""} · ${notes[0] ?? "no lots"}` });
      }
  const at = new Map(segments.map((s) => [`${s.axis}${s.line}:${s.span}`, s.role]));
  const role = (axis: "x" | "z", line: number, span: number): StreetRole => {
    const r = at.get(`${axis}${line}:${Math.max(0, Math.min(3, span))}`) ?? "street";
    return (span < 0 || span > 3) && r === "pedestrian" ? "lane" : r;
  };
  const crossing = (i: number, j: number): StreetRole => {
    const meet: StreetRole[] = [role("z", i, j - 1), role("z", i, j), role("x", j, i - 1), role("x", j, i)];
    return meet.reduce((m, r) => (RANK[r] > RANK[m] ? r : m), "pedestrian" as StreetRole);
  };
  return { segments, role, crossing };
}
