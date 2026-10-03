"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO, SMAA, TiltShift2, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import type { CityRuntime } from "@/components/experience/runtime";
import { Arcs } from "./Arcs";
import { CityMeshes } from "./CityMeshes";
import { Controls } from "./Controls";
import { Debris } from "./Debris";
import { Environment } from "./Environment";
import { DistrictLabels, HoverOutline } from "./Overlays";

/**
 * Quality tiers. The look depends on AO and soft light far more than on resolution, so we
 * drop pixels before we drop effects. PerformanceMonitor walks the tiers at runtime.
 */
const TIERS = [
  { dpr: 1, ao: false, tilt: false },
  { dpr: 1, ao: true, tilt: false },
  { dpr: 1.25, ao: true, tilt: true },
  { dpr: 1.5, ao: true, tilt: true },
  { dpr: 2, ao: true, tilt: true },
] as const;

export default function CityScene({ runtime }: { runtime: CityRuntime }) {
  const span = Math.max(runtime.city.size.w, runtime.city.size.d);
  // ?q=0..4 pins a tier (screenshots, benchmarks); otherwise it adapts.
  const [pinned] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("q"));
  const [tier, setTier] = useState(() => {
    if (typeof window === "undefined") return 3;
    const q = new URLSearchParams(window.location.search).get("q");
    return q !== null ? Math.max(0, Math.min(TIERS.length - 1, Number(q))) : 3;
  });
  const t = TIERS[tier];
  const dust = useMemo(() => {
    // Plaster dust: a few shades darker than the haze so it reads against paper buildings.
    const f = runtime.city.palette.fog;
    const g = runtime.city.palette.structure;
    return new THREE.Color().setRGB(f[0] * 0.7 + g[0] * 0.3, f[1] * 0.7 + g[1] * 0.3, f[2] * 0.7 + g[2] * 0.3, THREE.SRGBColorSpace);
  }, [runtime]);

  return (
    <Canvas
      shadows
      dpr={t.dpr}
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      camera={{ fov: 52, near: 0.3, far: span * 12, position: [0, 60, 120] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      {!pinned && (
        <PerformanceMonitor
          bounds={() => [45, 58]}
          flipflops={4}
          onDecline={() => setTier((v) => Math.max(0, v - 1))}
          onIncline={() => setTier((v) => Math.min(TIERS.length - 1, v + 1))}
        />
      )}
      <Suspense fallback={null}>
        <Environment city={runtime.city} />
        <CityMeshes runtime={runtime} />
        <Arcs runtime={runtime} />
        <Debris runtime={runtime} dustColor={dust} />
        <HoverOutline runtime={runtime} />
        <DistrictLabels runtime={runtime} />
        <Controls runtime={runtime} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO
            enabled={t.ao}
            aoRadius={3.2}
            distanceFalloff={1.2}
            intensity={2.6}
            quality="medium"
            halfRes
            color="#2a2620"
          />
          <SMAA />
          <Bloom luminanceThreshold={0.92} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
          {t.tilt ? <TiltShift2 blur={0.08} taper={0.6} samples={6} /> : <></>}
          <Vignette offset={0.28} darkness={0.42} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
