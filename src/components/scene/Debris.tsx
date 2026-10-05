"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityRuntime, DebrisSink } from "@/components/experience/runtime";

const MAX_DEBRIS = 1400;
const MAX_DUST = 900;

interface Pending {
  at: number;
  box: Float32Array;
  color: Float32Array;
  impact: THREE.Vector3;
  power: number;
  floor: number;
}

export function Debris({ runtime, dustColor }: { runtime: CityRuntime; dustColor: THREE.Color }) {
  const sim = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const mesh = new THREE.InstancedMesh(geo, mat, MAX_DEBRIS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DEBRIS * 3), 3);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;

    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(MAX_DUST * 3);
    const dustData = new Float32Array(MAX_DUST * 2);
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    dustGeo.setAttribute("aData", new THREE.BufferAttribute(dustData, 2).setUsage(THREE.DynamicDrawUsage));
    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: dustColor }, uScale: { value: 600 } },
      vertexShader: `
        attribute vec2 aData;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float age = aData.x;
          vAlpha = age <= 0.0 || age >= 1.0 ? 0.0 : smoothstep(0.0, 0.06, age) * (1.0 - age) * 0.75;
          gl_PointSize = aData.y * (0.6 + age * 1.6) * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;

    return {
      mesh,
      dust,
      pos: new Float32Array(MAX_DEBRIS * 3),
      vel: new Float32Array(MAX_DEBRIS * 3),
      rot: new Float32Array(MAX_DEBRIS * 3),
      spin: new Float32Array(MAX_DEBRIS * 3),
      size: new Float32Array(MAX_DEBRIS),
      floor: new Float32Array(MAX_DEBRIS),
      rest: new Uint8Array(MAX_DEBRIS),
      next: 0,
      used: 0,
      dustPos,
      dustData,
      dustVel: new Float32Array(MAX_DUST * 3),
      dustLife: new Float32Array(MAX_DUST),
      dustNext: 0,
      pending: [] as Pending[],
    };
  }, [dustColor]);

  useEffect(() => {
    const sink: DebrisSink = {
      spawn(box, color, at, impact, power, floor) {
        sim.pending.push({ at, box: Float32Array.from(box), color: Float32Array.from(color), impact: impact.clone(), power, floor });
      },
      clear() {
        sim.pending.length = 0;
        sim.used = 0;
        sim.next = 0;
        sim.mesh.count = 0;
        sim.dustLife.fill(0);
        sim.dustData.fill(0);
      },
    };
    runtime.debris = sink;
    return () => {
      if (runtime.debris === sink) runtime.debris = null;
      sim.mesh.geometry.dispose();
      (sim.mesh.material as THREE.Material).dispose();
      sim.dust.geometry.dispose();
      (sim.dust.material as THREE.Material).dispose();
    };
  }, [runtime, sim]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  const emit = (p: Pending) => {
    const [x, y, z, w, h, d] = p.box;
    const vol = Math.cbrt(Math.max(w * h * d, 0.01));
    const pieces = Math.min(16, Math.max(2, Math.round(vol * 2.4)));
    for (let k = 0; k < pieces; k++) {
      const i = sim.next;
      sim.next = (sim.next + 1) % MAX_DEBRIS;
      sim.used = Math.min(MAX_DEBRIS, Math.max(sim.used, i + 1));
      sim.mesh.count = sim.used;
      const o = i * 3;
      const px = x + (Math.random() - 0.5) * w;
      const py = y + Math.random() * h * 0.7;
      const pz = z + (Math.random() - 0.5) * d;
      sim.pos[o] = px;
      sim.pos[o + 1] = py;
      sim.pos[o + 2] = pz;
      const dx = px - p.impact.x;
      const dz = pz - p.impact.z;
      const len = Math.hypot(dx, dz) || 1;
      const kick = 2 + p.power * 9;
      sim.vel[o] = (dx / len) * kick * Math.random() + (Math.random() - 0.5) * 3;
      sim.vel[o + 1] = 2 + Math.random() * (4 + p.power * 8);
      sim.vel[o + 2] = (dz / len) * kick * Math.random() + (Math.random() - 0.5) * 3;
      sim.spin[o] = (Math.random() - 0.5) * 9;
      sim.spin[o + 1] = (Math.random() - 0.5) * 9;
      sim.spin[o + 2] = (Math.random() - 0.5) * 9;
      sim.size[i] = Math.min(1.1, 0.14 + Math.random() * 0.26 * vol);
      sim.floor[i] = p.floor;
      sim.rest[i] = 0;
      const shade = 0.75 + Math.random() * 0.3;
      sim.mesh.setColorAt(i, new THREE.Color(p.color[0] * shade, p.color[1] * shade, p.color[2] * shade));
    }
    if (sim.mesh.instanceColor) sim.mesh.instanceColor.needsUpdate = true;

    const puffs = Math.min(14, 3 + Math.round(vol * 2));
    for (let k = 0; k < puffs; k++) {
      const i = sim.dustNext;
      sim.dustNext = (sim.dustNext + 1) % MAX_DUST;
      const o = i * 3;
      sim.dustPos[o] = x + (Math.random() - 0.5) * w;
      sim.dustPos[o + 1] = p.floor + Math.random() * Math.min(h, 3);
      sim.dustPos[o + 2] = z + (Math.random() - 0.5) * d;
      const ang = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * (2 + p.power * 4);
      sim.dustVel[o] = Math.cos(ang) * sp;
      sim.dustVel[o + 1] = 0.3 + Math.random() * 1.2;
      sim.dustVel[o + 2] = Math.sin(ang) * sp;
      sim.dustLife[i] = 1.8 + Math.random() * 2.2;
      sim.dustData[i * 2] = 0.0001;
      sim.dustData[i * 2 + 1] = 3 + Math.random() * 4 + vol * 1.2;
    }
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = runtime.clock;

    if (sim.pending.length) {
      const keep: Pending[] = [];
      for (const p of sim.pending) {
        if (p.at > now) keep.push(p);
        else emit(p);
      }
      sim.pending = keep;
    }

    let moving = false;
    for (let i = 0; i < sim.used; i++) {
      if (sim.rest[i]) continue;
      moving = true;
      const o = i * 3;
      sim.vel[o + 1] -= 30 * dt;
      sim.pos[o] += sim.vel[o] * dt;
      sim.pos[o + 1] += sim.vel[o + 1] * dt;
      sim.pos[o + 2] += sim.vel[o + 2] * dt;
      sim.rot[o] += sim.spin[o] * dt;
      sim.rot[o + 1] += sim.spin[o + 1] * dt;
      sim.rot[o + 2] += sim.spin[o + 2] * dt;
      const floor = sim.floor[i] + sim.size[i] * 0.5;
      if (sim.pos[o + 1] < floor) {
        sim.pos[o + 1] = floor;
        sim.vel[o + 1] *= -0.28;
        sim.vel[o] *= 0.55;
        sim.vel[o + 2] *= 0.55;
        sim.spin[o] *= 0.4;
        sim.spin[o + 1] *= 0.4;
        sim.spin[o + 2] *= 0.4;
        if (Math.abs(sim.vel[o + 1]) < 0.8 && Math.hypot(sim.vel[o], sim.vel[o + 2]) < 0.6) sim.rest[i] = 1;
      }
      e.set(sim.rot[o], sim.rot[o + 1], sim.rot[o + 2]);
      q.setFromEuler(e);
      v.set(sim.pos[o], sim.pos[o + 1], sim.pos[o + 2]);
      s.setScalar(sim.size[i]);
      m4.compose(v, q, s);
      sim.mesh.setMatrixAt(i, m4);
    }
    if (moving) sim.mesh.instanceMatrix.needsUpdate = true;

    let dustAlive = false;
    for (let i = 0; i < MAX_DUST; i++) {
      if (sim.dustLife[i] <= 0) continue;
      dustAlive = true;
      const o = i * 3;
      sim.dustData[i * 2] += dt / sim.dustLife[i];
      if (sim.dustData[i * 2] >= 1) {
        sim.dustLife[i] = 0;
        sim.dustData[i * 2] = 0;
        continue;
      }
      sim.dustVel[o] *= 0.985;
      sim.dustVel[o + 2] *= 0.985;
      sim.dustVel[o + 1] = sim.dustVel[o + 1] * 0.98 + 0.4 * dt;
      sim.dustPos[o] += sim.dustVel[o] * dt;
      sim.dustPos[o + 1] += sim.dustVel[o + 1] * dt;
      sim.dustPos[o + 2] += sim.dustVel[o + 2] * dt;
    }
    if (dustAlive) {
      sim.dust.geometry.attributes.position.needsUpdate = true;
      sim.dust.geometry.attributes.aData.needsUpdate = true;
    }
  });

  return (
    <group>
      <primitive object={sim.mesh} />
      <primitive object={sim.dust} />
    </group>
  );
}
