import type { RGB } from "../../city/types";
import type { Kit } from "./core";
import type { Pose } from "./people";

export interface Walker {
  variant: number;
  pose: Pose;
  flip: boolean;
}
export interface PlazaAnchor {
  kind: "kiosk" | "bench";
  x: number;
  z: number;
  rot: number;
}
export interface PlazaCell {
  x: number;
  z: number;
  r: number;
}
export interface Slot {
  need: number;
  place: (vs: Walker[]) => void;
}

export function huddle(kit: Kit, cx: number, cz: number, vs: Walker[], y: number, salt: number) {
  const at: Array<[number, number]> = vs.length === 1 ? [[cx, cz]] : vs.length === 2 ? [[cx - 0.16, cz], [cx + 0.16, cz]] : [[cx - 0.2, cz + 0.05], [cx + 0.2, cz + 0.05], [cx + 0.03, cz - 0.17]];
  at.forEach(([x, z], i) => {
    const flip = Math.abs(x - cx) < 0.05 && Math.abs(z - cz) < 0.05 ? kit.rand(salt, 3000 + i) < 0.5 : kit.faces(x, z, cx, cz);
    kit.person(x, z, { variant: vs[i].variant, pose: "stand", flip, y });
  });
}

export function sit(kit: Kit, x: number, z: number, y: number, v: Walker, fx: number, fz: number) {
  const [px, pz] = kit.towardCamera(x, z, 0.15);
  kit.box(x, 0.002, z, 0.17, 0.006, 0.1, kit.palette.road.map((c) => c * 0.55) as RGB);
  kit.person(px, pz, { variant: v.variant, pose: "sit", flip: kit.faces(x, z, fx, fz), y });
}

export function fill(slots: Slot[], actors: Walker[]) {
  let i = 0;
  for (const s of slots) {
    const left = actors.length - i;
    if (left <= 0) break;
    const n = Math.min(s.need, left);
    if (s.need > 1 && n < 2) continue;
    s.place(actors.slice(i, i + n));
    i += n;
  }
  return actors.slice(i);
}

export function plazaCrowd(kit: Kit, crowd: Walker[], cells: PlazaCell[], anchors: PlazaAnchor[], box: [number, number, number, number], fountain: boolean, seed: number, clear: (x: number, z: number, m: number) => boolean) {
  const [x0, x1, z0, z1] = box;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const lamps = cells.filter((c) => c.r >= 0.5 && c.r < 0.62);
  const lit = (x: number, z: number) => lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 2.6);
  const foci: Array<{ x: number; z: number; slots: Slot[] }> = [];
  const total = Math.max(1, Math.min(3, Math.round(crowd.length / 4)));
  if (fountain)
    foci.push({
      x: cx,
      z: cz,
      slots: [
        { need: 1, place: ([v]) => sit(kit, cx + 0.62 * Math.cos(0.35), cz + 0.62 * Math.sin(0.35), 0.08, v, cx, cz) },
        { need: 3, place: (vs) => huddle(kit, cx - 0.95, cz + 0.55, vs, 0.02, seed) },
        { need: 1, place: ([v]) => sit(kit, cx + 0.62 * Math.cos(1.25), cz + 0.62 * Math.sin(1.25), 0.08, v, cx, cz) },
      ],
    });
  const candidates = [
    ...anchors.map((a, i) => ({ ...a, tier: a.kind === "kiosk" ? 0 : 1, i })),
    ...cells.filter((c) => c.r >= 0.62 && c.r < 0.78).map((c, i) => ({ kind: "bench" as const, x: c.x, z: c.z, rot: -1, tier: 2, i: 100 + i })),
  ]
    .map((c) => ({ ...c, key: c.tier + (kit.night && c.kind !== "kiosk" && !lit(c.x, c.z) ? 3 : 0) + kit.rand(seed, 2000 + c.i) * 0.5 }))
    .sort((a, b) => a.key - b.key);
  for (const c of candidates) {
    if (foci.length >= total) break;
    if (foci.some((f) => Math.hypot(f.x - c.x, f.z - c.z) < 3)) continue;
    if (c.kind === "kiosk") {
      foci.push({ x: c.x, z: c.z, slots: [{ need: 3, place: (vs) => huddle(kit, c.x + 0.15, c.z + 0.85, vs, 0.02, seed + c.i) }] });
      continue;
    }
    const along = (d: number): [number, number] => (c.rot < 0 ? [c.x + d, c.z] : [c.x + d * Math.cos(c.rot), c.z - d * Math.sin(c.rot)]);
    const front = (d: number): [number, number] => (c.rot < 0 ? [c.x, c.z + d] : [c.x + d * Math.sin(c.rot), c.z + d * Math.cos(c.rot)]);
    const y = c.rot < 0 ? 0.08 : 0.05;
    const [lx, lz] = along(-0.14);
    const [rx, rz] = along(0.14);
    const [fx, fz] = front(0.45);
    foci.push({
      x: c.x,
      z: c.z,
      slots: [
        { need: 1, place: ([v]) => sit(kit, lx, lz, y, v, c.rot < 0 ? rx : fx, c.rot < 0 ? rz : fz) },
        { need: 1, place: ([v]) => sit(kit, rx, rz, y, v, c.rot < 0 ? lx : fx, c.rot < 0 ? lz : fz) },
        { need: 1, place: ([v]) => kit.person(fx, fz, { variant: v.variant, pose: "stand", flip: kit.faces(fx, fz, c.x, c.z), y: 0.02 }) },
      ],
    });
  }
  const want = Math.min(crowd.length, Math.max(crowd.length >= 2 ? 2 : 0, Math.round(crowd.length * 0.65)));
  const rounds: Slot[] = [];
  for (let k = 0; k < 3; k++) for (const f of foci) if (f.slots[k]) rounds.push(f.slots[k]);
  const rest = [...fill(rounds, crowd.slice(0, want)), ...crowd.slice(want)];
  const cols = Math.max(1, Math.floor((x1 - x0 - 1.6) / 2.4));
  rest.forEach((v, k) => {
    let x = x0 + 1.0 + 1.2 + 2.4 * Math.floor(kit.rand(seed, 2100 + k) * cols);
    let z = z0 + 0.6 + kit.rand(seed, 2200 + k) * Math.max(0.1, z1 - z0 - 1.2);
    if (x > x1 - 0.5) x = (x0 + x1) / 2;
    for (let t = 0; t < 4 && (!clear(x, z, 0.3) || (fountain && Math.hypot(x - cx, z - cz) < 1.7) || foci.some((f) => Math.hypot(f.x - x, f.z - z) < 1)); t++) z = z0 + 0.6 + kit.rand(seed, 2300 + k * 5 + t) * Math.max(0.1, z1 - z0 - 1.2);
    kit.person(x, z, { variant: v.variant, pose: v.pose === "stand" ? (kit.rand(seed, 2400 + k) < 0.5 ? "walkA" : "walkB") : v.pose, flip: v.flip, y: 0.02 });
  });
}
