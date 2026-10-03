import { srgbToLinear } from "../city/palette";
import type { CityModel, MeshKind } from "../city/types";

/**
 * RenderModel — the last intermediate representation: one batch of typed arrays per mesh
 * kind, ready to become InstancedMesh attributes. Still no Three.js import.
 *
 * Instances inside a batch are sorted by node id. Because node ids are pre-order, the
 * instances of any subtree [a, b) form one contiguous range [lower(a), lower(b)).
 */
export interface InstanceBatch {
  kind: MeshKind;
  count: number;
  /** Column-major 4x4 matrices. */
  matrices: Float32Array;
  /** Linear RGB. */
  colors: Float32Array;
  /** x: build delay, y: collapse start (-1 = standing), z: seed, w: highlight. */
  anim: Float32Array;
  /** x: facade, y: glow, z: atlas slot (-1 none), w: unused. */
  meta: Float32Array;
  /** Node id per instance (non-decreasing). */
  nodeOf: Int32Array;
  /** World-space base and height per instance, for debris spawning. */
  boxes: Float32Array; // x, y, z, w, h, d per instance
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
      // Geometry is a unit shape with its base at y = 0; scale then rotate about Y, then translate.
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

/** First instance whose node id is >= `node`. */
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

/** Instance range [start, end) covering the subtree [a, b) of node ids. */
export function subtreeRange(batch: InstanceBatch, a: number, b: number): [number, number] {
  return [lowerBound(batch.nodeOf, a), lowerBound(batch.nodeOf, b)];
}
