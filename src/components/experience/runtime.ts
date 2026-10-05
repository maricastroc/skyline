"use client";

import * as THREE from "three";
import type { CityModel, MeshKind } from "@/lib/city/types";
import type { NormalizedDocument } from "@/lib/model/types";
import { subtreeRange, type InstanceBatch, type RenderModel } from "@/lib/render/render-model";
import { createUniforms, type CityUniforms } from "@/components/scene/materials";

export interface DebrisSink {
  spawn(box: ArrayLike<number>, color: ArrayLike<number>, at: number, impact: THREE.Vector3, power: number, floor: number): void;
  clear(): void;
}

export interface DestroyResult {
  node: number;
  removedWeight: number;
  removedNodes: number;
  spread: number;
}

export class CityRuntime {
  readonly alive: Uint8Array;
  readonly totalWeight: number;
  aliveWeight: number;
  readonly uniforms: CityUniforms;
  readonly meshes: Partial<Record<MeshKind, THREE.InstancedMesh>> = {};
  clock = 0;
  shake = 0;
  debris: DebrisSink | null = null;
  private painted: Array<[number, number]> = [];
  private listeners = new Set<() => void>();

  constructor(
    readonly doc: NormalizedDocument,
    readonly city: CityModel,
    readonly render: RenderModel,
  ) {
    this.alive = new Uint8Array(doc.nodes.length).fill(1);
    this.totalWeight = doc.nodes[0]?.weight ?? 1;
    this.aliveWeight = this.totalWeight;
    this.uniforms = createUniforms(new THREE.Color().setRGB(...city.palette.accent, THREE.SRGBColorSpace));
  }

  get integrity(): number {
    return Math.max(0, this.aliveWeight / this.totalWeight);
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  ancestor(node: number, steps: number): number {
    let n = node;
    for (let i = 0; i < steps && this.doc.nodes[n].parent >= 0; i++) n = this.doc.nodes[n].parent;
    return n;
  }

  pick(raycaster: THREE.Raycaster): { node: number; point: THREE.Vector3; distance: number } | null {
    let best: { node: number; point: THREE.Vector3; distance: number } | null = null;
    const hits: THREE.Intersection[] = [];
    for (const kind of Object.keys(this.meshes) as MeshKind[]) {
      const mesh = this.meshes[kind]!;
      const batch = this.render.batches[kind];
      hits.length = 0;
      mesh.raycast(raycaster, hits);
      for (const h of hits) {
        if (h.instanceId === undefined) continue;
        const node = batch.nodeOf[h.instanceId];
        if (!this.alive[node]) continue;
        if (!best || h.distance < best.distance) best = { node, point: h.point.clone(), distance: h.distance };
      }
    }
    return best;
  }

  setHighlights(selected: number | null, danger: number | null): void {
    for (const [a, b] of this.painted) this.paint(a, b, 0);
    this.painted = [];
    const nodes = this.doc.nodes;
    if (selected !== null && nodes[selected]) {
      this.paint(selected, nodes[selected].end, 1);
      this.painted.push([selected, nodes[selected].end]);
    }
    if (danger !== null && nodes[danger] && this.alive[danger]) {
      this.paint(danger, nodes[danger].end, 2);
      this.painted.push([danger, nodes[danger].end]);
    }
  }

  private paint(a: number, b: number, value: number): void {
    this.forRange(a, b, (batch, attr, s, e) => {
      for (let k = s; k < e; k++) batch.anim[k * 4 + 3] = value;
      attr.addUpdateRange(s * 4, (e - s) * 4);
      attr.needsUpdate = true;
    });
  }

  private forRange(a: number, b: number, fn: (batch: InstanceBatch, attr: THREE.InstancedBufferAttribute, s: number, e: number) => void) {
    for (const kind of Object.keys(this.meshes) as MeshKind[]) {
      const mesh = this.meshes[kind]!;
      const batch = this.render.batches[kind];
      const [s, e] = subtreeRange(batch, a, b);
      if (e <= s) continue;
      fn(batch, mesh.geometry.getAttribute("aAnim") as THREE.InstancedBufferAttribute, s, e);
    }
  }

  destroy(node: number, impact?: THREE.Vector3): DestroyResult | null {
    const nodes = this.doc.nodes;
    const n = nodes[node];
    if (!n || !this.alive[node]) return null;

    let removedWeight = 0;
    let removedNodes = 0;
    for (let i = node; i < n.end; i++) {
      if (!this.alive[i]) continue;
      this.alive[i] = 0;
      removedWeight += nodes[i].selfWeight;
      removedNodes++;
    }
    this.aliveWeight -= removedWeight;

    const a = this.city.anchor[node];
    const center = impact ?? new THREE.Vector3(a[0], a[1], a[2]);
    const floor = this.city.bounds[node].min[1];
    const now = this.clock;
    let spread = 0;

    let instances = 0;
    this.forRange(node, n.end, (_b, _a, s, e) => (instances += e - s));
    const debrisChance = Math.min(1, 260 / Math.max(1, instances));
    const power = Math.min(1, Math.log10(1 + removedWeight) / 3);

    this.forRange(node, n.end, (batch, attr, s, e) => {
      for (let k = s; k < e; k++) {
        if (batch.anim[k * 4 + 1] >= 0) continue;
        const bx = batch.boxes.subarray(k * 6, k * 6 + 6);
        const d = Math.hypot(bx[0] - center.x, bx[1] + bx[4] * 0.5 - center.y, bx[2] - center.z);
        const delay = Math.min(2.2, Math.pow(d, 0.8) * 0.045) + batch.anim[k * 4 + 2] * 0.12;
        batch.anim[k * 4 + 1] = now + delay;
        spread = Math.max(spread, delay);
        if (this.debris && batch.kind !== "billboard" && Math.random() < debrisChance) {
          this.debris.spawn(bx, batch.colors.subarray(k * 3, k * 3 + 3), now + delay, center, power, floor);
        }
      }
      attr.addUpdateRange(s * 4, (e - s) * 4);
      attr.needsUpdate = true;
    });

    this.shake = Math.max(this.shake, 0.18 + power * 1.1);
    for (const fn of this.listeners) fn();
    return { node, removedWeight, removedNodes, spread };
  }

  rebuild(): void {
    this.alive.fill(1);
    this.aliveWeight = this.totalWeight;
    for (const kind of Object.keys(this.meshes) as MeshKind[]) {
      const batch = this.render.batches[kind];
      for (let k = 0; k < batch.count; k++) {
        batch.anim[k * 4 + 1] = -1;
        batch.anim[k * 4 + 3] = 0;
      }
      const attr = this.meshes[kind]!.geometry.getAttribute("aAnim") as THREE.InstancedBufferAttribute;
      attr.clearUpdateRanges();
      attr.needsUpdate = true;
    }
    this.painted = [];
    this.debris?.clear();
    this.clock = 0;
    for (const fn of this.listeners) fn();
  }
}
