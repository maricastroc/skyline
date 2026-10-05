import { srgbToLinear } from "../city/palette";
import type { CityModel, MeshKind } from "../city/types";

export interface InstanceBatch {
  kind: MeshKind;
  count: number;
  matrices: Float32Array;
  colors: Float32Array;
  anim: Float32Array;
  meta: Float32Array;
  nodeOf: Int32Array;
  boxes: Float32Array;
}

export interface RenderModel {
  batches: Record<MeshKind, InstanceBatch>;
}

const KINDS: MeshKind[] = ["solid", "spire", "cylinder", "glow", "billboard"];

export function buildRenderModel(city: CityModel): RenderModel {
  const byKind = new Map<MeshKind, number[]>(KINDS.map((k) => [k, []]));
  city.structures.forEach((s, i) => byKind.get(s.mesh)!.push(i));

  const batches = {} as Record<MeshKind, InstanceBatch>;
  for (const kind of KINDS) {
    const idx = byKind.get(kind)!;
    idx.sort((a, b) => city.structures[a].node - city.structures[b].node || a - b);
    const n = idx.length;
    const b: InstanceBatch = {
      kind,
      count: n,
      matrices: new Float32Array(n * 16),
      colors: new Float32Array(n * 3),
      anim: new Float32Array(n * 4),
      meta: new Float32Array(n * 4),
      nodeOf: new Int32Array(n),
      boxes: new Float32Array(n * 6),
    };
    idx.forEach((si, k) => {
      const s = city.structures[si];
      const c = Math.cos(s.rotY);
      const sn = Math.sin(s.rotY);
      const m = b.matrices;
      const o = k * 16;
      m[o + 0] = c * s.w;
      m[o + 1] = 0;
      m[o + 2] = -sn * s.w;
      m[o + 3] = 0;
      m[o + 4] = 0;
      m[o + 5] = s.h;
      m[o + 6] = 0;
      m[o + 7] = 0;
      m[o + 8] = sn * s.d;
      m[o + 9] = 0;
      m[o + 10] = c * s.d;
      m[o + 11] = 0;
      m[o + 12] = s.x;
      m[o + 13] = s.y;
      m[o + 14] = s.z;
      m[o + 15] = 1;
      const lin = srgbToLinear(s.color);
      b.colors.set(lin, k * 3);
      b.anim.set([s.delay, -1, ((s.node * 9301 + k * 49297) % 233280) / 233280, 0], k * 4);
      b.meta.set([s.facade, s.glow, s.slot, 0], k * 4);
      b.nodeOf[k] = s.node;
      b.boxes.set([s.x, s.y, s.z, s.w, s.h, s.d], k * 6);
    });
    batches[kind] = b;
  }
  return { batches };
}

export function lowerBound(nodeOf: Int32Array, node: number): number {
  let lo = 0;
  let hi = nodeOf.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nodeOf[mid] < node) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function subtreeRange(batch: InstanceBatch, a: number, b: number): [number, number] {
  return [lowerBound(batch.nodeOf, a), lowerBound(batch.nodeOf, b)];
}
