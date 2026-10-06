import type { RGB } from "../../city/types";
import type { CityGrammar } from "../grammar";
import type { Part, PixelCity } from "../types";
import { fill, huddle, sit, type Slot } from "./actors";
import type { Kit } from "./core";
import type { Pose } from "./people";
import type { Comp, Plan } from "./plan";
import { bench, bin, bollards, busShelter, CARRIAGEWAY, hydrant, laneOffset, mailbox, meter, newsBoxes, SIDEWALK_H, streetLamp, streetTree } from "./street";
import type { StreetPlan, StreetRole } from "./street-roles";
import type { Anatomy, GroundKind, Use } from "./surface";
import type { Allocation } from "./territory";
import { N } from "./territory";
import { vehicle, type VehicleType } from "./vehicles";

export type FrontKind = GroundKind | "square" | "yard";
export interface Front {
  kind: FrontKind;
  activity: number;
  plantable: number;
}

export interface LifeSide {
  block: [number, number];
  side: number;
  axis: "x" | "z";
  line: number;
  span: number;
  role: StreetRole;
  front: Front[];
  footfall: number;
  canopy: number;
  busStop: boolean;
  salt: number;
  why: string;
}
export interface LifeSegment {
  axis: "x" | "z";
  line: number;
  span: number;
  role: StreetRole;
  traffic: number;
  service: number;
  salt: number;
}
export interface StreetLife {
  movement: number;
  green: number;
  sides: LifeSide[];
  segments: LifeSegment[];
}

export const CAPACITY: Record<StreetRole, number> = { primary: 1, street: 0.65, lane: 0.3, pedestrian: 0 };
export const WALK: Record<StreetRole, number> = { primary: 0.85, street: 1, lane: 1.15, pedestrian: 1.3 };
export const ROOM: Record<StreetRole, number> = { primary: 1, street: 0.6, lane: 0, pedestrian: 0.8 };
const LAMP: Record<StreetRole, number> = { primary: 3.4, street: 4.4, lane: 5.6, pedestrian: 3.4 };
const GROUP: Partial<Record<FrontKind, number>> = { lobby: 3, civic: 3, storefront: 2, arcade: 2, domestic: 2, square: 2 };
const GROUP_Z: Partial<Record<FrontKind, number>> = { lobby: 0.45, civic: 0.4, storefront: 0.34, arcade: 0.34, domestic: 0.4, square: 0.55 };

const PLANTABLE: Record<FrontKind, number> = { domestic: 1, civic: 0.8, lobby: 0.5, blank: 0.4, storefront: 0.3, arcade: 0.2, service: 0.1, loading: 0, square: 0.8, yard: 1 };
const USE_ACTIVITY: Record<Use, number> = { commercial: 0.8, kiosk: 0.9, office: 0.6, residential: 0.25, civic: 0.3, institutional: 0.3, service: 0.1, industrial: 0.05 };
const USE_GROUND: Record<Use, GroundKind> = { commercial: "storefront", kiosk: "storefront", office: "lobby", residential: "domestic", civic: "civic", institutional: "civic", service: "service", industrial: "loading" };
const OPEN = new Set<Comp>(["media", "interactive", "landmark", "marker"]);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const hash = (str: string) => {
  let h = 2166136261;
  for (let k = 0; k < str.length; k++) h = Math.imul(h ^ str.charCodeAt(k), 16777619);
  return (h >>> 0) % 1000003;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface Built {
  parts: [number, number];
  anatomy: Anatomy[];
  use: Use;
}

export const facing = (i: number, j: number, si: number): { axis: "x" | "z"; line: number; span: number } =>
  si === 0 ? { axis: "x", line: j + 1, span: i } : si === 2 ? { axis: "x", line: j, span: i } : si === 1 ? { axis: "z", line: i + 1, span: j } : { axis: "z", line: i, span: j };

const sideLots = (i: number, j: number, si: number): Array<[number, number]> =>
  [0, 1, 2, 3].map((k) =>
    si === 0 ? [4 * i + k, 4 * j + 3] : si === 1 ? [4 * i + 3, 4 * j + 3 - k] : si === 2 ? [4 * i + 3 - k, 4 * j] : [4 * i, 4 * j + k],
  );

export function planStreetLife(o: {
  plan: Plan;
  alloc: Allocation;
  roles: StreetPlan;
  grammar: CityGrammar;
  built: Built[];
  parts: Part[];
  lines: number[];
  block: number;
}): StreetLife {
  const { plan, alloc, roles, grammar, built, parts, lines, block: B } = o;
  const keyOf = (X: number, Y: number) => {
    const sg = alloc.owner[X * N + Y];
    return sg >= 0 ? plan.territories[alloc.segments[sg].territory].key : "";
  };
  const boxes = built.map((b) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (let k = b.parts[0]; k < b.parts[1]; k++) {
      const q = parts[k];
      if (q.mesh === "sign" || q.mesh === "sprite" || q.mesh === "glow") continue;
      if (q.y > SIDEWALK_H + 0.6) continue;
      const r = Math.max(q.w, q.d) / 2;
      x0 = Math.min(x0, q.x - r);
      x1 = Math.max(x1, q.x + r);
      z0 = Math.min(z0, q.z - r);
      z1 = Math.max(z1, q.z + r);
    }
    return { x0, x1, z0, z1, b };
  });
  const blockCentre = (i: number, j: number) => [(lines[i] + lines[i + 1]) / 2, (lines[j] + lines[j + 1]) / 2];
  const frontOf = (X: number, Y: number, si: number): Front => {
    const [bx, bz] = blockCentre(X >> 2, Y >> 2);
    let x = bx - B / 2 + 3.5 * (X & 3) + 1.75;
    let z = bz - B / 2 + 3.5 * (Y & 3) + 1.75;
    const inset = 1.75 - 0.9;
    if (si === 0) z += inset;
    else if (si === 2) z -= inset;
    else if (si === 1) x += inset;
    else x -= inset;
    const hit = boxes.find((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    if (hit) {
      const g = hit.b.anatomy[0]?.ground;
      const kind: FrontKind = g ? g.kind : USE_GROUND[hit.b.use];
      return { kind, activity: g ? g.transparency : USE_ACTIVITY[hit.b.use], plantable: PLANTABLE[kind] };
    }
    const s = alloc.owner[X * N + Y];
    const open = s >= 0 && OPEN.has(alloc.segments[s].comp);
    return open ? { kind: "square", activity: 0.8, plantable: PLANTABLE.square } : { kind: "yard", activity: 0.15, plantable: PLANTABLE.yard };
  };

  const sides: LifeSide[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let si = 0; si < 4; si++) {
        const f = facing(i, j, si);
        const role = roles.role(f.axis, f.line, f.span);
        const lots = sideLots(i, j, si);
        const front = lots.map(([X, Y]) => frontOf(X, Y, si));
        const act = mean(front.map((x) => x.activity));
        const plant = mean(front.map((x) => x.plantable));
        const footfall = clamp01(act * WALK[role]);
        const canopy = clamp01(ROOM[role] * (0.5 * grammar.parks + 0.5 * plant));
        const kinds = [...new Set(front.map((x) => x.kind))].join("/");
        sides.push({
          block: [i, j],
          side: si,
          ...f,
          role,
          front,
          footfall,
          canopy,
          busStop: false,
          salt: hash(`${lots.map(([X, Y]) => keyOf(X, Y)).join("|")}#${i},${j},${si}`),
          why: `${role}: front ${kinds} (activity ${act.toFixed(2)}, plantable ${plant.toFixed(2)}) → footfall ${act.toFixed(2)}×${WALK[role]} = ${footfall.toFixed(2)}, canopy ${ROOM[role]}×(½·${grammar.parks.toFixed(2)} + ½·${plant.toFixed(2)}) = ${canopy.toFixed(2)}`,
        });
      }
  for (const axis of ["x", "z"] as const)
    for (let line = 1; line < lines.length - 1; line++)
      for (let span = 0; span < lines.length - 1; span++) {
        if (roles.role(axis, line, span) !== "primary") continue;
        const pair = sides.filter((s) => s.axis === axis && s.line === line && s.span === span);
        const best = pair.reduce((m, s) => (s.footfall > m.footfall ? s : m), pair[0]);
        if (best && best.footfall >= 0.45) best.busStop = true;
      }
  const segments: LifeSegment[] = [];
  for (const axis of ["x", "z"] as const)
    for (let line = 0; line < lines.length; line++)
      for (let span = 0; span < lines.length - 1; span++) {
        const role = roles.role(axis, line, span);
        const along = sides.filter((s) => s.axis === axis && s.line === line && s.span === span);
        const service = mean(along.flatMap((s) => s.front.map((x) => (x.kind === "service" || x.kind === "loading" ? 1 : 0))));
        segments.push({ axis, line, span, role, traffic: CAPACITY[role] * (0.25 + 0.75 * grammar.traffic), service, salt: hash(`${along.map((s) => s.salt).join("|")}#${axis}${line}.${span}`) });
      }
  return { movement: grammar.traffic, green: grammar.parks, sides, segments };
}

const spread = (n: number, a: number, b: number) => (n <= 0 ? [] : n === 1 ? [(a + b) / 2] : Array.from({ length: n }, (_, k) => a + ((b - a) * k) / (n - 1)));

export function lifeSidewalks(kit: Kit, life: StreetLife, lines: number[], B: number, S: number, palette: PixelCity["palette"]) {
  const H = 1.3;
  for (const sd of life.sides) {
    const [i, j] = sd.block;
    const bx = (lines[i] + lines[i + 1]) / 2;
    const bz = (lines[j] + lines[j + 1]) / 2;
    const at: Array<[number, number, number]> = [
      [bx, bz + B / 2, 0],
      [bx + B / 2, bz, Math.PI / 2],
      [bx, bz - B / 2, Math.PI],
      [bx - B / 2, bz, -Math.PI / 2],
    ];
    const [sx, sz, rot] = at[sd.side];
    const seed = sd.salt;
    const ped = sd.role === "pedestrian";
    const zt = ped ? S + 0.75 : S + (H - CARRIAGEWAY[sd.role]) - 0.32;
    const lotAt = (u: number) => sd.front[Math.max(0, Math.min(3, Math.floor((u + B / 2) / 3.5)))];
    kit.frame(
      sx,
      sz,
      rot,
      () => {
        const lim = B / 2 - 0.9;
        const phase = (kit.rand(seed, 1) - 0.5) * Math.min(1.2, LAMP[sd.role] / 3);
        const lamps = spread(Math.max(2, Math.round((2 * lim) / LAMP[sd.role]) + 1), -lim, lim).map((u) => Math.max(-lim, Math.min(lim, u + phase)));
        for (const u of lamps) streetLamp(kit, u, zt);
        const taken = [...lamps];
        const free = (u: number, gap = 0.5) => taken.every((t) => Math.abs(t - u) >= gap);
        const nTrees = Math.round(13 * sd.canopy);
        const trees: number[] = [];
        for (const [k, u0] of spread(nTrees, -lim + 0.3, lim - 0.3).entries()) {
          let u = sd.role === "primary" ? u0 : u0 + (kit.rand(seed, 900 + k) - 0.5) * 0.6;
          if (!free(u)) u += u > 0 ? -0.5 : 0.5;
          if (!free(u, 0.4)) continue;
          taken.push(u);
          trees.push(u);
          streetTree(kit, u, zt - 0.05, seed * 5 + k);
        }
        const nFurn = Math.round(5 * sd.footfall);
        const traffic = sd.role === "primary" || sd.role === "street";
        const furnish = (k: number, u: number, kind = lotAt(u).kind) => {
          const r = kit.rand(seed, 330 + k);
          const seat = () => {
            bench(kit, u, zt - 0.15, Math.PI);
            return true;
          };
          if (kind === "storefront" || kind === "arcade") {
            if (r < 0.3) newsBoxes(kit, u, 0.3);
            else if (r < 0.55) bin(kit, u, zt);
            else if (r < 0.8 || !traffic) return seat();
            else meter(kit, u, zt);
          } else if (kind === "lobby") {
            if (r < 0.4) return seat();
            else if (r < 0.7) bin(kit, u, zt);
            else bollards(kit, u, zt);
          } else if (kind === "domestic" || kind === "yard") {
            if (r < 0.45) hydrant(kit, u, zt);
            else if (r < 0.7) mailbox(kit, u, 0.3);
            else bin(kit, u, zt);
          } else if (kind === "civic") {
            if (r < 0.55) bollards(kit, u, zt);
            else return seat();
          } else if (kind === "square") {
            if (r < 0.65) return seat();
            else bin(kit, u, zt);
          } else hydrant(kit, u, zt);
          return false;
        };
        const scattered: Array<[number, number]> = [];
        const sim = [...taken];
        const open = (u: number) => sim.every((t) => Math.abs(t - u) >= 0.45);
        for (let k = 0; k < nFurn; k++) {
          let u = -lim + kit.rand(seed, 300 + k) * 2 * lim;
          for (let t = 0; t < 6 && !open(u); t++) u = -lim + kit.rand(seed, 310 + k * 7 + t) * 2 * lim;
          if (!open(u)) continue;
          sim.push(u);
          scattered.push([k, u]);
        }
        const spots: Array<{ u: number; kind: FrontKind; benches: number[] }> = [];
        if (!kit.actors)
          for (const [k, u] of scattered) {
            taken.push(u);
            furnish(k, u);
          }
        else if (scattered.length) {
          const lotU = (k: number) => -B / 2 + 1.75 + 3.5 * k;
          const nearest = (list: number[], u: number, d: number) => list.filter((t) => Math.abs(t - u) < d).sort((a, b) => Math.abs(a - u) - Math.abs(b - u))[0];
          const score = (k: number) => sd.front[k].activity + (kit.night && nearest(lamps, lotU(k), 1.6) !== undefined ? 0.5 : 0) + kit.rand(seed, 1100 + k) * 0.05;
          const groups = new Map<FrontKind, Array<[number, number]>>();
          for (const [k, u] of scattered) groups.set(lotAt(u).kind, [...(groups.get(lotAt(u).kind) ?? []), [k, u]]);
          for (const [kind, items] of groups) {
            const c = lotU([0, 1, 2, 3].filter((k) => sd.front[k].kind === kind).sort((a, b) => score(b) - score(a))[0]);
            const ref = (kit.night ? nearest(lamps, c, 1.6) : undefined) ?? nearest(trees, c, 1.4);
            const sp = { u: Math.max(-lim, Math.min(lim, ref === undefined ? c : ref + (ref < c ? 0.5 : -0.5))), kind, benches: [] as number[] };
            spots.push(sp);
            for (const [k, u0] of items) {
              const tries = [...Array.from({ length: 40 }, (_, t) => sp.u + (t === 0 ? 0 : (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.5)), u0];
              const u = tries.find((x) => Math.abs(x) <= lim && free(x, 0.45));
              if (u === undefined) continue;
              taken.push(u);
              if (furnish(k, u, kind)) sp.benches.push(u);
            }
          }
        }
        const zone: Array<[number, number, number]> = [[0.3, Math.max(0.45, zt - 0.2), Math.round(9 * sd.footfall)]];
        if (ped) zone.push([S + 0.2, S + H - 0.1, Math.round(6 * sd.footfall)]);
        const crowd = zone.flatMap(([z0, z1, n], zi) =>
          Array.from({ length: n }, (_, k) => {
            const pr = kit.rand(seed, 620 + zi * 50 + k);
            const pose: Pose = pr < 0.4 ? "walkA" : pr < 0.75 ? "walkB" : "stand";
            return { zi, u: -B / 2 + 0.4 + kit.rand(seed, 500 + zi * 50 + k) * (B - 0.8), z: z0 + kit.rand(seed, 560 + zi * 50 + k) * (z1 - z0), variant: Math.floor(kit.rand(seed, 680 + zi * 50 + k) * 48), pose, flip: kit.rand(seed, 740 + zi * 50 + k) < 0.5 };
          }),
        );
        const walk = (c: (typeof crowd)[number]) => kit.person(c.u, c.z, { variant: c.variant, pose: c.pose, flip: c.flip });
        if (!kit.actors) crowd.forEach(walk);
        else {
          const side = crowd.filter((c) => c.zi === 0);
          const order = [...side.filter((c) => c.pose === "stand"), ...side.filter((c) => c.pose !== "stand")];
          const want = Math.round(side.length * 0.5);
          const slots: Slot[] = [];
          spots.forEach((sp, si) => {
            sp.benches.forEach((b, bi) => {
              slots.push({ need: 1, place: ([v]) => sit(kit, b - 0.14, zt - 0.15, 0.05, v, b, zt - 1.2) });
              if (kit.rand(seed, 1200 + si * 10 + bi) < sd.footfall) slots.push({ need: 1, place: ([v]) => sit(kit, b + 0.14, zt - 0.15, 0.05, v, b, zt - 1.2) });
            });
            const g = GROUP[sp.kind] ?? 0;
            if (g) slots.push({ need: g, place: (vs) => huddle(kit, sp.u + 0.3, GROUP_Z[sp.kind] ?? 0.45, vs, 0, seed + si) });
          });
          const flow = new Set([...order.slice(want), ...fill(slots, order.slice(0, want))]);
          crowd.filter((c) => c.zi !== 0 || flow.has(c)).forEach(walk);
        }
        if (sd.busStop) {
          busShelter(kit, 0, 0.62, palette.accents[1], "M5");
          for (let k = 0; k < 1 + Math.round(2 * sd.footfall); k++) kit.person(-0.45 + k * 0.32, 0.55 + (k % 2) * 0.12, { variant: 7 + k * 5, pose: k === 1 ? "sit" : "stand", flip: k === 2 });
        }
      },
      SIDEWALK_H,
    );
  }
}

export function lifeCrossings(kit: Kit, life: StreetLife, roles: StreetPlan, lines: number[]) {
  const H = 1.3;
  const side = (i: number, j: number, si: number) => life.sides.find((s) => s.block[0] === i && s.block[1] === j && s.side === si);
  for (const [ci, cx] of lines.entries())
    for (const [cj, cz] of lines.entries())
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const bi = sx > 0 ? ci : ci - 1;
          const bj = sz > 0 ? cj : cj - 1;
          if (bi < 0 || bj < 0 || bi > 3 || bj > 3) continue;
          const a = side(bi, bj, sz > 0 ? 2 : 0);
          const b = side(bi, bj, sx > 0 ? 3 : 1);
          const f = (a ? a.footfall : 0) / 2 + (b ? b.footfall : 0) / 2;
          const seed = ((a ? a.salt : 7) * 31 + (b ? b.salt : 11) + (sx + 1) * 3 + (sz + 1)) % 1000003;
          const n = Math.round(3 * f);
          for (let k = 0; k < n; k++) {
            const variant = Math.floor(kit.rand(seed, k + 20) * 48);
            if (!kit.actors) {
              kit.person(cx + sx * (H + 0.35 + kit.rand(seed, k) * 0.5), cz + sz * (H + 0.35 + kit.rand(seed, k + 10) * 0.5), { variant, pose: "stand", flip: kit.rand(seed, k + 30) < 0.5, y: SIDEWALK_H });
              continue;
            }
            const along = H + 0.5 + 0.26 * Math.floor(k / 2);
            const [x, z] = k % 2 === 0 ? [cx + sx * (H + 0.38), cz + sz * along] : [cx + sx * along, cz + sz * (H + 0.38)];
            kit.person(x, z, { variant, pose: "stand", flip: k % 2 === 0 ? kit.faces(x, z, cx, z) : kit.faces(x, z, x, cz), y: SIDEWALK_H });
          }
          const r = roles.role("x", cj, sx > 0 ? ci : ci - 1);
          if (f >= 0.5 && (r === "street" || r === "primary"))
            kit.person(cx + sx * (H + 0.4), cz + sz * 0.35, { variant: Math.floor(kit.rand(seed, 40) * 48), pose: kit.rand(seed, 41) < 0.5 ? "walkA" : "walkB", flip: sz < 0, y: 0.05 });
        }
}

const nearLane = (sd: LifeSide, lines: number[]) => ({
  side: sd.side === 0 || sd.side === 1 ? -1 : 1,
  t: sd.axis === "x" ? (lines[sd.block[0]] + lines[sd.block[0] + 1]) / 2 : (lines[sd.block[1]] + lines[sd.block[1] + 1]) / 2,
});

export function lifeTraffic(kit: Kit, life: StreetLife, lines: number[], R: number, palette: PixelCity["palette"]) {
  const carColors: RGB[] = [palette.accents[0], palette.accents[1], [0.92, 0.92, 0.9], [0.2, 0.22, 0.26], [0.75, 0.2, 0.18], [0.55, 0.6, 0.66]];
  const types: VehicleType[] = ["sedan", "hatch", "sedan", "van", "hatch", "taxi"];
  for (const sg of life.segments) {
    const c = lines[sg.line];
    const a = lines[sg.span] + R / 2 + 1.6;
    const b = lines[sg.span + 1] - R / 2 - 1.6;
    const base = sg.salt;
    const stops = life.sides.filter((s) => s.busStop && s.axis === sg.axis && s.line === sg.line && s.span === sg.span).map((s) => nearLane(s, lines));
    for (const side of [-1, 1]) {
      const off = laneOffset(sg.role, side);
      if (off === null) continue;
      const stop = stops.find((x) => x.side === side);
      if (stop) {
        if (sg.axis === "x") vehicle(kit, stop.t, c + off, side > 0 ? 0 : Math.PI, "bus", palette.accents[1]);
        else vehicle(kit, c + off, stop.t, side > 0 ? -Math.PI / 2 : Math.PI / 2, "bus", palette.accents[1]);
      }
      const slots: number[] = [];
      for (let t = a; t < b; t += 1.25) if (!stop || Math.abs(t - stop.t) > 1.9) slots.push(t);
      const n = Math.round(slots.length * 0.85 * sg.traffic);
      const order = slots.map((t, k) => ({ t, k, r: kit.rand(base + (side + 1) * 7, k) })).sort((x, y) => x.r - y.r).slice(0, n);
      for (const { t, k } of order) {
        const v = base + (side + 1) * 7 + k;
        let type = kit.pick(types, v, 4);
        if (kit.rand(v, 8) < sg.service) type = kit.rand(v, 9) < 0.6 ? "van" : "truck";
        const color = type === "taxi" ? ([0.98, 0.78, 0.18] as RGB) : kit.pick(carColors, v, 5);
        if (sg.axis === "x") vehicle(kit, t, c + off, side > 0 ? 0 : Math.PI, type, color);
        else vehicle(kit, c + off, t, side > 0 ? -Math.PI / 2 : Math.PI / 2, type, color);
      }
    }
  }
}
