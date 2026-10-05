"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CityRuntime } from "@/components/experience/runtime";

export function Arcs({ runtime }: { runtime: CityRuntime }) {
  const [version, setVersion] = useState(0);
  useEffect(() => runtime.onChange(() => setVersion((v) => v + 1)), [runtime]);

  const material = useMemo(() => {
    const c = runtime.city.palette.accent;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace),
      emissive: new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace),
      emissiveIntensity: 0.35,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  }, [runtime]);

  const geometry = useMemo(() => {
    void version;
    const parts: THREE.BufferGeometry[] = [];
    for (const arc of runtime.city.arcs) {
      if (!runtime.alive[arc.node] || !runtime.alive[arc.target]) continue;
      const a = new THREE.Vector3(...arc.from);
      const b = new THREE.Vector3(...arc.to);
      const dist = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5);
      mid.y = Math.max(a.y, b.y) + 3 + dist * 0.22;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      parts.push(new THREE.TubeGeometry(curve, 48, 0.07, 4, false));
    }
    return parts.length ? mergeGeometries(parts) : null;
  }, [runtime, version]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame(() => {
    const t = (runtime.clock - runtime.city.buildDuration + 0.5) / 1.5;
    material.opacity = Math.max(0, Math.min(1, t)) * 0.6;
    material.visible = material.opacity > 0.01;
  });
  useEffect(() => () => material.dispose(), [material]);

  if (!geometry) return null;
  return <mesh geometry={geometry} material={material} castShadow />;
}
