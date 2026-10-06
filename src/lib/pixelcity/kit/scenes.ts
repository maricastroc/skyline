import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import { Surf, type PixelCity } from "../types";
import type { Kit } from "./core";
import { curbSpace, hits, obstacles, skyline, type Box } from "./curb";
import { laneOffset, SIDEWALK_H } from "./street";
import type { FrontKind, LifeSide, StreetLife } from "./street-life";
import { vehicle } from "./vehicles";

export type SceneKind = "loading" | "bikes" | "works";
export interface Story {
  kind: SceneKind;
  x: number;
  z: number;
}

const WORKERS = [5, 12, 16, 20, 25, 26, 32, 36, 39, 40, 41, 44];
const CARD: RGB = [0.72, 0.56, 0.36];
const STEEL: RGB = [0.25, 0.27, 0.3];

function crate(kit: Kit, x: number, y: number, z: number, s: number, tone: number) {
  if (y === 0) kit.foot(x, z, s + 0.05, s + 0.05);
  kit.box(x, y, z, s, s * 0.85, s, mix(CARD, [0.45, 0.33, 0.2], tone));
  kit.box(x, y + s * 0.85 - 0.004, z, s * 0.25, 0.006, s + 0.002, mix(CARD, [0.95, 0.9, 0.78], 0.5));
}

function handTruck(kit: Kit, x: number, z: number) {
  kit.foot(x, z, 0.2, 0.16);
  kit.box(x - 0.06, 0, z, 0.025, 0.34, 0.025, STEEL);
  kit.box(x + 0.06, 0, z, 0.025, 0.34, 0.025, STEEL);
  kit.box(x, 0, z + 0.05, 0.16, 0.02, 0.1, STEEL);
  kit.box(x, 0.32, z, 0.15, 0.02, 0.02, STEEL);
}

function bike(kit: Kit, x: number, z: number, rot: number, color: RGB) {
  kit.frame(x, z, rot, () => {
    kit.foot(0, 0, 0.42, 0.1);
    for (const u of [-0.15, 0.15]) kit.cyl(u, 0.1, 0, 0.2, 0.02, 0.2, [0.1, 0.1, 0.11], { rotX: Math.PI / 2 });
    kit.box(0, 0.15, 0, 0.3, 0.025, 0.02, color);
    kit.box(-0.05, 0.15, 0, 0.025, 0.09, 0.02, color);
    kit.box(-0.06, 0.24, 0, 0.08, 0.02, 0.04, [0.12, 0.12, 0.13]);
    kit.box(0.12, 0.15, 0, 0.02, 0.12, 0.02, STEEL);
    kit.box(0.12, 0.27, 0, 0.02, 0.02, 0.14, STEEL);
  });
}

function cone(kit: Kit, x: number, z: number) {
  kit.foot(x, z, 0.12, 0.12);
  kit.box(x, 0, z, 0.1, 0.012, 0.1, [0.15, 0.15, 0.16]);
  kit.part({ mesh: "pyramid", node: kit.node, x, y: 0.012, z, w: 0.08, h: 0.15, d: 0.08, color: [0.95, 0.48, 0.12] });
  kit.box(x, 0.07, z, 0.055, 0.02, 0.055, [0.96, 0.95, 0.9]);
}

function barrier(kit: Kit, x: number, z: number, len: number) {
  kit.foot(x, z, len + 0.04, 0.08);
  for (const u of [-len / 2 + 0.04, len / 2 - 0.04]) kit.box(x + u, 0, z, 0.03, 0.2, 0.05, STEEL);
  kit.box(x, 0.13, z, len, 0.08, 0.025, [0.86, 0.22, 0.18], Surf.STRIPES);
}

const worker = (kit: Kit, salt: number, k: number) => WORKERS[Math.floor(kit.rand(salt, 70 + k) * WORKERS.length) % WORKERS.length];

export function lifeScenes(kit: Kit, life: StreetLife, lines: number[], B: number, S: number, palette: PixelCity["palette"]): Story[] {
  const solid = obstacles(kit.parts);
  const { seen } = skyline(kit.parts);
  const stories: Story[] = [];
  const share = (s: LifeSide, kinds: FrontKind[]) => s.front.filter((f) => kinds.includes(f.kind)).length / s.front.length;
  const { frameOf, curbOf, lotU, footprint, segment } = curbSpace(kit, life, lines, B, S);
  const used = new Set<LifeSide>();
  let strict = true;
  const place = (sd: LifeSide, kind: SceneKind, kinds: FrontKind[], half: number, z0: number, z1: number, build: (u: number, zt: number) => void) => {
    const zt = curbOf(sd);
    const [sx, sz, rot] = frameOf(sd);
    const lots = [0, 1, 2, 3].filter((k) => kinds.includes(sd.front[k].kind)).sort((a, b) => sd.front[b].activity - sd.front[a].activity || a - b);
    for (const k of lots)
      for (const d of [0, 0.5, -0.5, 1, -1]) {
        const u = lotU(k) + d;
        if (Math.abs(u) + half > B / 2 - 0.6) continue;
        const fp = footprint(sd, u - half, u + half, z0, Math.min(z1, zt));
        if (hits(solid, fp)) continue;
        const mid = (z0 + Math.min(z1, zt)) / 2;
        const pts = kit.frame(sx, sz, rot, () => [kit.toWorld(u, 0, mid), kit.toWorld(u - half, 0, mid), kit.toWorld(u + half, 0, mid)]);
        if (strict && pts.filter(([x, , z]) => seen(x, z)).length < 2) continue;
        solid.push(fp);
        kit.frame(sx, sz, rot, () => build(u, zt), SIDEWALK_H);
        stories.push({ kind, x: pts[0][0], z: pts[0][2] });
        used.add(sd);
        return true;
      }
    return false;
  };
  const choose = (eligible: LifeSide[], score: (s: LifeSide) => number, n: number, go: (s: LifeSide) => boolean) => {
    let done = 0;
    const order = [...eligible].sort((a, b) => score(b) - score(a));
    for (const pass of [true, false]) {
      strict = pass;
      for (const s of order) {
        if (done >= n) break;
        if (!used.has(s) && go(s)) done++;
      }
    }
    strict = true;
  };

  const SERVICE: FrontKind[] = ["service", "loading"];
  const loading = life.sides.filter((s) => s.role !== "pedestrian" && share(s, SERVICE) > 0);
  const park = (sd: LifeSide, wx: number, wz: number) => {
    const g = segment(sd);
    const side = sd.side === 0 || sd.side === 1 ? -1 : 1;
    const off = g ? laneOffset(g.role, side) : null;
    if (off === null) return;
    const along = sd.axis === "x" ? wx : wz;
    const c = lines[sd.line] + off;
    const vb: Box = sd.axis === "x" ? { x0: along - 0.62, x1: along + 0.62, z0: c - 0.3, z1: c + 0.3 } : { x0: c - 0.3, x1: c + 0.3, z0: along - 0.62, z1: along + 0.62 };
    if (hits(solid, vb)) return;
    solid.push(vb);
    const [x, z] = sd.axis === "x" ? [along, c] : [c, along];
    const rot = sd.axis === "x" ? (side > 0 ? 0 : Math.PI) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
    vehicle(kit, x, z, rot, "van", kit.pick([[0.92, 0.92, 0.9], palette.accents[0], [0.55, 0.6, 0.66]] as RGB[], sd.salt, 60));
    kit.frame(x, z, rot, () => {
      for (const e of [-1, 1]) for (const s2 of [-1, 1]) kit.glow((e * 1.05) / 2 + e * 0.01, 0.42, (s2 * 0.5) / 2.4, 0.02, 0.04, 0.05, [1, 0.62, 0.12], kit.night ? 1.8 : 0.7);
    });
  };
  choose(loading, (s) => share(s, SERVICE) + (segment(s)?.service ?? 0) + kit.rand(s.salt, 50) * 0.2, Math.min(3, Math.round(loading.length * 0.25)), (sd) => {
    const at: Array<[number, number]> = [];
    const ok = place(sd, "loading", SERVICE, 0.62, 0.22, 2, (u, zt) => {
      const mz = (0.3 + zt) / 2;
      crate(kit, u - 0.3, 0, mz - 0.08, 0.2, 0);
      crate(kit, u - 0.08, 0, mz - 0.1, 0.18, 0.3);
      crate(kit, u - 0.2, 0.17, mz - 0.09, 0.16, 0.15);
      handTruck(kit, u + 0.14, mz);
      crate(kit, u + 0.14, 0.02, mz + 0.06, 0.15, 0.2);
      kit.person(u + 0.36, mz - 0.05, { variant: worker(kit, sd.salt, 0), pose: "stand", flip: kit.faces(u + 0.36, mz - 0.05, u, mz) });
      if (sd.footfall > 0.35) kit.person(u - 0.45, zt - 0.1, { variant: worker(kit, sd.salt, 1), pose: "walkA", flip: kit.faces(u - 0.45, zt - 0.1, u, mz) });
      const [wx, , wz] = kit.toWorld(u, 0, 0);
      at.push([wx, wz]);
    });
    if (ok && at.length) park(sd, at[0][0], at[0][1]);
    return ok;
  });

  const BIKES: FrontKind[] = ["lobby", "storefront", "arcade", "civic", "square"];
  const bikes = life.sides.filter((s) => s.role !== "primary" && s.footfall >= 0.4 && share(s, BIKES) > 0);
  const propensity = Math.max(0, 0.5 + life.green - 0.5 * life.movement);
  choose(bikes, (s) => s.footfall + kit.rand(s.salt, 51) * 0.3, Math.min(4, Math.round(bikes.length * 0.08 * propensity)), (sd) =>
    place(sd, "bikes", BIKES, 0.62, 0, 2, (u, zt) => {
      const z = zt - 0.24;
      kit.foot(u, z + 0.02, 0.86, 0.06);
      kit.box(u, 0, z + 0.02, 0.84, 0.03, 0.03, STEEL);
      for (const e of [-0.41, 0.41]) kit.box(u + e, 0, z + 0.02, 0.03, 0.16, 0.03, STEEL);
      const n = 2 + Math.round(2 * Math.min(1, sd.footfall));
      for (let k = 0; k < n; k++) bike(kit, u - 0.3 + k * 0.2, z - 0.05, Math.PI / 2, kit.pick([palette.accents[0], palette.accents[1], [0.2, 0.22, 0.26], [0.85, 0.85, 0.82]] as RGB[], sd.salt, 80 + k));
      if (kit.rand(sd.salt, 90) < sd.footfall) kit.person(u + 0.45, z - 0.25, { variant: Math.floor(kit.rand(sd.salt, 91) * 48), pose: "stand", flip: kit.faces(u + 0.45, z - 0.25, u, z) });
    }),
  );

  const QUIET: FrontKind[] = ["blank", "yard", "service", "loading", "domestic"];
  const works = life.sides.filter((s) => (s.role === "primary" || s.role === "street") && share(s, QUIET) > 0);
  if (life.movement >= 0.25)
    choose(works, (s) => share(s, QUIET) - s.footfall * 0.5 + (segment(s)?.traffic ?? 0) * 0.3 + kit.rand(s.salt, 52) * 0.2, 1, (sd) =>
      place(sd, "works", QUIET, 0.8, 0.2, 2, (u, zt) => {
        const z0 = 0.32;
        const z1 = zt - 0.12;
        const mz = (z0 + z1) / 2;
        kit.box(u - 0.05, 0, mz, 0.62, 0.012, Math.max(0.2, z1 - z0 - 0.16), [0.27, 0.21, 0.16]);
        barrier(kit, u - 0.05, z1, 0.8);
        barrier(kit, u - 0.05, z0, 0.8);
        cone(kit, u - 0.58, z1 - 0.02);
        cone(kit, u - 0.58, z0 + 0.04);
        cone(kit, u + 0.5, z1 - 0.02);
        kit.part({ mesh: "pyramid", node: kit.node, x: u + 0.62, y: 0, z: mz + 0.04, w: 0.26, h: 0.12, d: 0.22, color: [0.83, 0.72, 0.5] });
        kit.foot(u + 0.62, mz - 0.18, 0.26, 0.16);
        kit.box(u + 0.62, 0, mz - 0.18, 0.22, 0.12, 0.13, [0.62, 0.3, 0.22]);
        kit.glow(u - 0.39, 0.25, z1, 0.05, 0.05, 0.05, [1, 0.7, 0.2], kit.night ? 1.8 : 0.5);
        kit.person(u + 0.1, mz, { variant: worker(kit, sd.salt, 2), pose: "stand", flip: kit.faces(u + 0.1, mz, u - 0.3, mz) });
        kit.person(u + 0.42, mz - 0.02, { variant: worker(kit, sd.salt, 3), pose: "stand", flip: kit.faces(u + 0.42, mz - 0.02, u + 0.1, mz) });
      }),
    );
  return stories;
}
