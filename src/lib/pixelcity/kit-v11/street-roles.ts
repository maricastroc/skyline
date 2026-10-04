// FROZEN: art direction C3, street life (the street-life kit, art direction baseline). Do not edit.
/**
 * Art Direction Layer, C1 — street roles. Downstream of the frozen foundation: it only READS the
 * plan and the allocation (who owns each lot) and decides, for every street segment of the
 * 4×4 grid, the role the street plays. The scene then expresses that role inside the corridor
 * the grid already reserves (road + both sidewalks); no lot, building or territory moves.
 *
 * A segment is the stretch of one grid line between two crossings. Its two sides are the four
 * lots of each block that face it (one side only on the outer lines: the other is the void).
 * Every facing pair of lots votes:
 *
 *   same territory on both sides (the street runs INSIDE a region of the page)
 *     link content (lists, indexes, menus, link footers) ............... lane
 *     open ground on both sides (media, calls to action, the hero) ...... pedestrian
 *     anything else (text, grids, tables) ............................... street
 *   two territories (the street is a SEAM between two regions)
 *     regions of different tiers (hero / content / chrome / footer / rest) primary
 *     open ground on both sides ........................................ pedestrian
 *     otherwise ......................................................... street
 *
 * The segment takes the plurality of its votes (a tie is a street). Nothing here reads the
 * seed, the URL or the site: the same plan always gives the same streets.
 */
import type { Allocation } from "./territory";
import { N } from "./territory";
import type { Comp, Plan } from "./plan";

export type StreetRole = "primary" | "street" | "lane" | "pedestrian";
/** Traffic rank: which role wins a crossing, and which carries cars. */
export const RANK: Record<StreetRole, number> = { pedestrian: 0, lane: 1, street: 2, primary: 3 };

/** Compositions whose lots are open ground (a plaza around the building, or the square itself). */
const OPEN = new Set<Comp>(["media", "interactive", "landmark", "marker"]);
/** Compositions whose content is links (the plan's own content mapping). */
const LINKS = new Set<Comp>(["parcelled", "archive", "navigation", "support"]);
const TIER = ["hero", "content", "chrome", "footer", "rest"];

export interface StreetSegment {
  /** "x": the street runs along x (on the line z = LINES[line]); "z": along z (x = LINES[line]). */
  axis: "x" | "z";
  /** Grid line 0..4 (0 and 4 are the outer ring). */
  line: number;
  /** Span 0..3 between crossings along the street. */
  span: number;
  role: StreetRole;
  /** The votes of the facing lot pairs, and why the role won. */
  votes: StreetRole[];
  why: string;
}

export interface StreetPlan {
  segments: StreetSegment[];
  /** Role of a segment; spans −1 and 4 are the stretches that run out into the void. */
  role(axis: "x" | "z", line: number, span: number): StreetRole;
  /** Highest-ranked role meeting at a crossing (line i on x, line j on z). */
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
          // Lots on the low and high side of the line (outer lines have one side only).
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
    // A stretch into the void continues the segment it extends; a promenade does not run into
    // nothing, so it continues as a lane.
    const r = at.get(`${axis}${line}:${Math.max(0, Math.min(3, span))}`) ?? "street";
    return (span < 0 || span > 3) && r === "pedestrian" ? "lane" : r;
  };
  const crossing = (i: number, j: number): StreetRole => {
    // Line i on x is the street along z at x = LINES[i]; it meets the streets along x on line j.
    const meet: StreetRole[] = [role("z", i, j - 1), role("z", i, j), role("x", j, i - 1), role("x", j, i)];
    return meet.reduce((m, r) => (RANK[r] > RANK[m] ? r : m), "pedestrian" as StreetRole);
  };
  return { segments, role, crossing };
}
