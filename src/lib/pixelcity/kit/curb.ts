import type { Part } from "../types";
import type { Kit } from "./core";
import { CARRIAGEWAY, SIDEWALK_H } from "./street";
import type { LifeSide, StreetLife } from "./street-life";

export interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const H = 1.3;
const VIEW = [Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6)];

const extent = (q: Part): Box => {
  const c = Math.abs(Math.cos(q.rotY));
  const s = Math.abs(Math.sin(q.rotY));
  const hw = (c * q.w + s * q.d) / 2;
  const hd = (s * q.w + c * q.d) / 2;
  return { x0: q.x - hw, x1: q.x + hw, z0: q.z - hd, z1: q.z + hd };
};

export function obstacles(parts: Part[], people = true): Box[] {
  const out: Box[] = [];
  for (const q of parts) {
    if (q.mesh === "glow" || q.mesh === "sign" || q.y + q.h <= SIDEWALK_H + 0.025 || q.y > 1.2) continue;
    if (q.mesh === "sprite") {
      if (people) out.push({ x0: q.x - 0.12, x1: q.x + 0.12, z0: q.z - 0.12, z1: q.z + 0.12 });
      continue;
    }
    out.push(extent(q));
  }
  return out;
}

export const hits = (all: Box[], b: Box) => all.some((o) => o.x0 < b.x1 && o.x1 > b.x0 && o.z0 < b.z1 && o.z1 > b.z0);

export function skyline(parts: Part[]) {
  const G = 0.25;
  const O = -48;
  const N = 384;
  const top = new Float32Array(N * N);
  const cell = (v: number) => Math.max(0, Math.min(N - 1, Math.floor((v - O) / G)));
  for (const q of parts) {
    if (q.mesh === "glow" || q.mesh === "sign" || q.mesh === "sprite" || Math.min(q.w, q.d) < 0.3 || q.y + q.h < 0.6) continue;
    const b = extent(q);
    for (let i = cell(b.x0); i <= cell(b.x1); i++) for (let j = cell(b.z0); j <= cell(b.z1); j++) top[i * N + j] = Math.max(top[i * N + j], q.y + q.h);
  }
  const height = (x: number, z: number) => top[cell(x) * N + cell(z)];
  const seen = (x: number, z: number) => {
    for (let t = 0.2; t < 60; t += 0.2) {
      const y = 0.35 + t * VIEW[1];
      if (y > 30) return true;
      if (height(x + t * VIEW[0], z + t * VIEW[2]) > y) return false;
    }
    return true;
  };
  return { seen, height };
}

export function curbSpace(kit: Kit, life: StreetLife, lines: number[], B: number, S: number) {
  const frameOf = (sd: LifeSide): [number, number, number] => {
    const [i, j] = sd.block;
    const bx = (lines[i] + lines[i + 1]) / 2;
    const bz = (lines[j] + lines[j + 1]) / 2;
    return ([[bx, bz + B / 2, 0], [bx + B / 2, bz, Math.PI / 2], [bx, bz - B / 2, Math.PI], [bx - B / 2, bz, -Math.PI / 2]] as Array<[number, number, number]>)[sd.side];
  };
  const curbOf = (sd: LifeSide) => (sd.role === "pedestrian" ? S + 0.75 : S + (H - CARRIAGEWAY[sd.role]) - 0.32);
  const lotU = (k: number) => -B / 2 + 1.75 + 3.5 * k;
  const at = <T,>(sd: LifeSide, fn: () => T, y = 0) => {
    const [sx, sz, rot] = frameOf(sd);
    return kit.frame(sx, sz, rot, fn, y);
  };
  const footprint = (sd: LifeSide, u0: number, u1: number, z0: number, z1: number): Box =>
    at(sd, () => {
      const cs = [kit.toWorld(u0, 0, z0), kit.toWorld(u1, 0, z0), kit.toWorld(u0, 0, z1), kit.toWorld(u1, 0, z1)];
      return { x0: Math.min(...cs.map((c) => c[0])), x1: Math.max(...cs.map((c) => c[0])), z0: Math.min(...cs.map((c) => c[2])), z1: Math.max(...cs.map((c) => c[2])) };
    });
  const segment = (sd: LifeSide) => life.segments.find((g) => g.axis === sd.axis && g.line === sd.line && g.span === sd.span);
  const curbSide = (sd: LifeSide) => (sd.side === 0 || sd.side === 1 ? -1 : 1);
  return { frameOf, curbOf, lotU, at, footprint, segment, curbSide };
}
