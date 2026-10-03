"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import type { MeshKind } from "@/lib/city/types";
import type { CityRuntime } from "@/components/experience/runtime";
import { useAtlas } from "./atlas";
import {
  createBillboardMaterial,
  createDepthMaterial,
  createGeometries,
  createGlowMaterial,
  createSolidMaterial,
} from "./materials";

/** One InstancedMesh per mesh kind: the whole city in five draw calls. */
export function CityMeshes({ runtime }: { runtime: CityRuntime }) {
  const atlas = useAtlas(runtime.city.images, runtime.city.palette.building);

  const meshes = useMemo(() => {
    const geos = createGeometries();
    const u = runtime.uniforms;
    const materials: Record<MeshKind, THREE.Material> = {
      solid: createSolidMaterial(u),
      spire: createSolidMaterial(u, false),
      cylinder: createSolidMaterial(u, false),
      glow: createGlowMaterial(u),
      billboard: createBillboardMaterial(u, atlas),
    };
    const depth = createDepthMaterial(u);

    const out: THREE.InstancedMesh[] = [];
    for (const kind of Object.keys(materials) as MeshKind[]) {
      const batch = runtime.render.batches[kind];
      if (!batch.count) continue;
      const geo = geos[kind].clone();
      geo.setAttribute("aAnim", new THREE.InstancedBufferAttribute(batch.anim, 4).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(batch.meta, 4));
      const mesh = new THREE.InstancedMesh(geo, materials[kind], batch.count);
      mesh.instanceMatrix.array.set(batch.matrices);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(batch.colors, 3);
      mesh.castShadow = kind !== "glow";
      mesh.receiveShadow = true;
      mesh.customDepthMaterial = depth;
      mesh.frustumCulled = false;
      mesh.name = `city-${kind}`;
      mesh.userData.kind = kind;
      mesh.computeBoundingSphere();
      out.push(mesh);
    }
    return out;
  }, [runtime, atlas]);

  // Register the meshes React actually renders. (Doing this inside useMemo is a trap: in
  // StrictMode the factory runs twice and the runtime would drive orphaned copies.)
  useLayoutEffect(() => {
    for (const m of meshes) runtime.meshes[m.userData.kind as MeshKind] = m;
    return () => {
      for (const m of meshes) if (runtime.meshes[m.userData.kind as MeshKind] === m) delete runtime.meshes[m.userData.kind as MeshKind];
    };
  }, [meshes, runtime]);

  useEffect(
    () => () => {
      for (const m of meshes) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
    [meshes],
  );

  useFrame((_, dt) => {
    runtime.clock += Math.min(dt, 0.05);
    runtime.uniforms.uTime.value = runtime.clock;
  });

  return (
    <group>
      {meshes.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}
