"use client";

import { Grid } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityModel } from "@/lib/city/types";

const srgb = (c: [number, number, number]) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

export function Environment({ city }: { city: CityModel }) {
  const p = city.palette;
  const span = Math.max(city.size.w, city.size.d);
  const scene = useThree((s) => s.scene);

  const colors = useMemo(
    () => ({
      top: srgb(p.skyTop),
      horizon: srgb(p.skyHorizon),
      fog: srgb(p.fog),
      ground: srgb(p.ground),
      line: srgb(p.groundLine),
      sun: srgb(p.sun),
    }),
    [p],
  );

  useEffect(() => {
    scene.fog = new THREE.Fog(colors.fog, span * 0.9, span * 3.4);
    scene.background = colors.horizon;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, colors, span]);

  const sunDir = useMemo(() => new THREE.Vector3(-0.62, 0.52, 0.58).normalize(), []);
  const sunPos = useMemo(() => sunDir.clone().multiplyScalar(span * 1.1), [sunDir, span]);
  const half = span * 0.75;

  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: colors.top },
          uHorizon: { value: colors.horizon },
          uSun: { value: colors.sun },
          uSunDir: { value: sunDir },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 c = mix(uHorizon, uTop, pow(h, 0.55));
            float s = max(dot(normalize(vDir), uSunDir), 0.0);
            c += uSun * (pow(s, 64.0) * 0.35 + pow(s, 6.0) * 0.08);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [colors, sunDir],
  );

  return (
    <>
      <mesh material={sky} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[span * 6, 32, 16]} />
      </mesh>

      <hemisphereLight args={[colors.top, colors.ground, 1.15]} />
      <ambientLight intensity={0.25} color={colors.horizon} />
      <directionalLight
        position={sunPos}
        color={colors.sun}
        intensity={2.4}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={span * 3}
      />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.92} receiveShadow>
        <planeGeometry args={[span * 12, span * 12]} />
        <meshStandardMaterial color={colors.ground} roughness={1} />
      </mesh>
      <Grid
        position={[0, -0.9, 0]}
        args={[span * 8, span * 8]}
        cellSize={2}
        cellThickness={0.5}
        cellColor={colors.line}
        sectionSize={20}
        sectionThickness={0.9}
        sectionColor={colors.line}
        fadeDistance={span * 2.2}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
      />
    </>
  );
}
