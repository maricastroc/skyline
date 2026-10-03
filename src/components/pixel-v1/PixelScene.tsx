"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { RGB } from "@/lib/city/types";
import { srgbToLinear } from "@/lib/city/palette";
import { drawGlyph, GLYPH_H } from "@/lib/v1/pixelcity/pixel-font";
import type { Part, PartMesh, PixelCity } from "@/lib/v1/pixelcity/types";
import { useAtlas } from "@/components/scene/atlas";
import {
  createAtlasMaterial,
  createDepthMaterial,
  createGlowMaterial,
  createToonMaterial,
  pixelGeometries,
  toonRamp,
  type PixelUniforms,
} from "./materials";
import { PixelPostEffect } from "./PixelPost";

const srgb = (c: RGB) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

export interface ViewState {
  /** Azimuth in degrees (45 = classic iso from the +x/+z corner). */
  azimuth: number;
  /** Zoom multiplier on top of "fit". */
  zoom: number;
  /** Pan offset in world units. */
  pan: [number, number];
}

export interface PixelSceneProps {
  city: PixelCity;
  /** Target internal resolution (lines). The canvas is upscaled with nearest-neighbour. */
  lines?: number;
  view?: ViewState;
  interactive?: boolean;
  onHover?: (node: number | null, screen: { x: number; y: number } | null) => void;
  onPick?: (node: number | null) => void;
}

export default function PixelScene({ city, lines = 360, view, interactive = true, onHover, onPick }: PixelSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const dpr = useArtPixelDpr(wrap, lines);

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
      {dpr > 0 && (
        <Canvas
          dpr={dpr}
          shadows="basic"
          flat
          orthographic
          gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          camera={{ near: 1, far: 2000, position: [100, 100, 100], zoom: 10 }}
          style={{ imageRendering: "pixelated" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping;
          }}
        >
          <World city={city} view={view} interactive={interactive} onHover={onHover} onPick={onPick} />
        </Canvas>
      )}
    </div>
  );
}

/** Integer device pixels per art pixel, so the nearest-neighbour upscale is perfectly even. */
function useArtPixelDpr(ref: React.RefObject<HTMLDivElement | null>, lines: number): number {
  const [dpr, setDpr] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const dev = window.devicePixelRatio || 1;
      const h = el.clientHeight || 600;
      const devPerArt = Math.max(1, Math.round((dev * h) / lines));
      setDpr(dev / devPerArt);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, lines]);
  return dpr;
}

/* ─────────────────────────── world ─────────────────────────── */

interface Batch {
  mesh: PartMesh;
  count: number;
  matrices: Float32Array;
  colors: Float32Array;
  anim: Float32Array;
  meta: Float32Array;
  rect: Float32Array;
  nodeOf: Int32Array;
}

function buildBatches(parts: Part[]): Batch[] {
  const by = new Map<PartMesh, Part[]>();
  for (const p of parts) {
    if (!by.has(p.mesh)) by.set(p.mesh, []);
    by.get(p.mesh)!.push(p);
  }
  const out: Batch[] = [];
  for (const [mesh, list] of by) {
    list.sort((a, b) => a.node - b.node);
    const n = list.length;
    const b: Batch = {
      mesh,
      count: n,
      matrices: new Float32Array(n * 16),
      colors: new Float32Array(n * 3),
      anim: new Float32Array(n * 4),
      meta: new Float32Array(n * 4),
      rect: new Float32Array(n * 4),
      nodeOf: new Int32Array(n),
    };
    list.forEach((p, k) => {
      const c = Math.cos(p.rotY);
      const s = Math.sin(p.rotY);
      b.matrices.set([c * p.w, 0, -s * p.w, 0, 0, p.h, 0, 0, s * p.d, 0, c * p.d, 0, p.x, p.y, p.z, 1], k * 16);
      b.colors.set(srgbToLinear(p.color), k * 3);
      b.anim.set([p.delay, -1, ((p.node + 7) * 0.6180339 + k * 0.137) % 1, 0], k * 4);
      b.meta.set([p.surf, p.lit, p.slot ?? -1, 0], k * 4);
      if (p.rect) b.rect.set(p.rect, k * 4);
      b.nodeOf[k] = p.node;
    });
    out.push(b);
  }
  return out;
}

function useSignAtlas(city: PixelCity): THREE.CanvasTexture {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = city.signAtlas.w;
    c.height = city.signAtlas.h;
    const g = c.getContext("2d")!;
    const css = (rgb: RGB) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;
    for (const s of city.signs) {
      g.fillStyle = css(s.bg);
      g.fillRect(s.x, s.y, s.w, s.h);
      // 1-texel darker frame
      g.fillStyle = css(s.bg.map((v) => v * 0.55) as RGB);
      g.fillRect(s.x, s.y, s.w, 1);
      g.fillRect(s.x, s.y + s.h - 1, s.w, 1);
      g.fillRect(s.x, s.y, 1, s.h);
      g.fillRect(s.x + s.w - 1, s.y, 1, s.h);
      g.fillStyle = css(s.fg);
      const dot = (x: number, y: number) => g.fillRect(x, y, 1, 1);
      if (s.text.startsWith("|")) {
        const t = s.text.slice(1);
        for (let i = 0; i < t.length; i++) drawGlyph(t[i], s.x + 2, s.y + 2 + i * (GLYPH_H + 1), dot);
      } else {
        for (let i = 0; i < s.text.length; i++) drawGlyph(s.text[i], s.x + 2 + i * 4, s.y + 2, dot);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }, [city]);
}

function World({ city, view, interactive, onHover, onPick }: { city: PixelCity } & Omit<PixelSceneProps, "city" | "lines">) {
  const p = city.palette;
  const night = p.time === "night";
  const uniforms = useMemo<PixelUniforms>(
    () => ({
      uTime: { value: 0 },
      uNight: { value: night ? 1 : p.time === "golden" ? 0.45 : 0 },
      uLit: { value: srgb(p.lit) },
      uGlass: { value: srgb(p.glass) },
      uMark: { value: srgb(p.roadMark) },
      uHighlight: { value: srgb(p.accents[0]) },
    }),
    [p, night],
  );
  const images = useAtlas(city.images, [0.2, 0.2, 0.22]);
  const signs = useSignAtlas(city);

  const meshes = useMemo(() => {
    const geos = pixelGeometries();
    const ramp = toonRamp();
    const depth = createDepthMaterial(uniforms);
    const mats: Record<PartMesh, THREE.Material> = {
      box: createToonMaterial(uniforms, ramp, "box"),
      prism: createToonMaterial(uniforms, ramp, "prism"),
      cyl: createToonMaterial(uniforms, ramp, "cyl"),
      pyramid: createToonMaterial(uniforms, ramp, "pyramid"),
      glow: createGlowMaterial(uniforms),
      image: createAtlasMaterial(uniforms, images, "slots", [2048, 2048]),
      sign: createAtlasMaterial(uniforms, signs, "rects", [city.signAtlas.w, city.signAtlas.h]),
    };
    return buildBatches(city.parts).map((b) => {
      const geo = geos[b.mesh].clone();
      geo.setAttribute("aAnim", new THREE.InstancedBufferAttribute(b.anim, 4).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(b.meta, 4));
      geo.setAttribute("aRect", new THREE.InstancedBufferAttribute(b.rect, 4));
      const m = new THREE.InstancedMesh(geo, mats[b.mesh], b.count);
      m.instanceMatrix.array.set(b.matrices);
      m.instanceColor = new THREE.InstancedBufferAttribute(b.colors, 3);
      m.castShadow = b.mesh !== "glow" && b.mesh !== "sign";
      m.receiveShadow = b.mesh !== "glow" && b.mesh !== "image" && b.mesh !== "sign";
      m.customDepthMaterial = depth;
      m.frustumCulled = false;
      m.userData.batch = b;
      return m;
    });
  }, [city, uniforms, images, signs]);

  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt, 0.05);
  });

  const half = city.size.w / 2;
  const sunDir = new THREE.Vector3(...p.sun.dir).normalize();

  return (
    <>
      <hemisphereLight args={[srgb(p.ambient.sky), srgb(p.ambient.ground), p.ambient.intensity]} />
      <directionalLight
        position={sunDir.clone().multiplyScalar(half * 3)}
        color={srgb(p.sun.color)}
        intensity={p.sun.intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-camera-left={-half * 1.6}
        shadow-camera-right={half * 1.6}
        shadow-camera-top={half * 1.6}
        shadow-camera-bottom={-half * 1.6}
        shadow-camera-near={1}
        shadow-camera-far={half * 8}
      />
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <Life city={city} uniforms={uniforms} />
      <Rig city={city} view={view} interactive={interactive} meshes={meshes} onHover={onHover} onPick={onPick} />
      <Post city={city} />
    </>
  );
}

/* ─────────────────────────── post ─────────────────────────── */

const PixelPost = forwardRef<PixelPostEffect, { city: PixelCity }>(function PixelPost({ city }, ref) {
  const p = city.palette;
  const effect = useMemo(
    () =>
      new PixelPostEffect({
        skyTop: srgb(p.sky.top),
        skyBottom: srgb(p.sky.bottom),
        ink: srgb(p.time === "night" ? [0.05, 0.04, 0.12] : [0.12, 0.08, 0.14]),
        stars: p.sky.stars,
        edge: 0.55,
      }),
    [p],
  );
  return <primitive ref={ref} object={effect} dispose={null} />;
});

function Post({ city }: { city: PixelCity }) {
  const night = city.palette.time !== "day";
  return (
    <EffectComposer multisampling={0}>
      <PixelPost city={city} />
      <Bloom luminanceThreshold={night ? 0.75 : 0.95} intensity={night ? 0.9 : 0.25} mipmapBlur levels={4} radius={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}

/* ─────────────────────────── camera ─────────────────────────── */

function Rig({
  city,
  view,
  interactive,
  meshes,
  onHover,
  onPick,
}: {
  city: PixelCity;
  view?: ViewState;
  interactive?: boolean;
  meshes: THREE.InstancedMesh[];
  onHover?: PixelSceneProps["onHover"];
  onPick?: PixelSceneProps["onPick"];
}) {
  const { camera, size, gl, viewport } = useThree();
  const state = useRef({ az: view?.azimuth ?? 45, azTarget: view?.azimuth ?? 45, zoom: view?.zoom ?? 1, pan: new THREE.Vector2(...(view?.pan ?? [0, 0])), drag: null as null | { x: number; y: number; moved: boolean }, mouse: new THREE.Vector2(), inside: false, hover: -2 });
  const ray = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (!view) return;
    state.current.azTarget = view.azimuth;
    state.current.zoom = view.zoom;
    state.current.pan.set(...view.pan);
  }, [view]);

  useEffect(() => {
    if (!interactive) return;
    const el = gl.domElement;
    const s = state.current;
    const onDown = (e: PointerEvent) => (s.drag = { x: e.clientX, y: e.clientY, moved: false });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      s.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      s.inside = e.target === el;
      if (!s.drag) return;
      const dx = e.clientX - s.drag.x;
      const dy = e.clientY - s.drag.y;
      if (Math.hypot(dx, dy) > 3) s.drag.moved = true;
      if (s.drag.moved) {
        const cam = camera as THREE.OrthographicCamera;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
        const k = 1 / cam.zoom;
        s.pan.x -= (right.x * e.movementX - fwd.x * e.movementY * 2) * k;
        s.pan.y -= (right.z * e.movementX - fwd.z * e.movementY * 2) * k;
      }
    };
    const onUp = () => {
      if (s.drag && !s.drag.moved) onPick?.(s.hover >= 0 ? s.hover : null);
      s.drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.zoom = Math.max(0.5, Math.min(6, s.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") s.azTarget -= 90;
      if (e.code === "KeyE") s.azTarget += 90;
      const cam = camera as THREE.OrthographicCamera;
      const step = 40 / cam.zoom;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
      if (e.code === "KeyW" || e.code === "ArrowUp") s.pan.add(new THREE.Vector2(fwd.x, fwd.z).multiplyScalar(step));
      if (e.code === "KeyS" || e.code === "ArrowDown") s.pan.add(new THREE.Vector2(-fwd.x, -fwd.z).multiplyScalar(step));
      if (e.code === "KeyD" || e.code === "ArrowRight") s.pan.add(new THREE.Vector2(right.x, right.z).multiplyScalar(step));
      if (e.code === "KeyA" || e.code === "ArrowLeft") s.pan.add(new THREE.Vector2(-right.x, -right.z).multiplyScalar(step));
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [gl, camera, interactive, onPick]);

  useFrame((_, dt) => {
    const s = state.current;
    s.az += (s.azTarget - s.az) * (1 - Math.exp(-dt * 8));
    const cam = camera as THREE.OrthographicCamera;
    const az = (s.az * Math.PI) / 180;
    const el = (30 * Math.PI) / 180; // 2:1 dimetric
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    // Fit: the plate's projected extent plus the skyline.
    const half = city.size.w / 2;
    const extX = half * 2 * Math.SQRT2;
    const extY = half * 2 * Math.SQRT2 * Math.sin(el) + (city.maxHeight + 3.5) * Math.cos(el);
    const fit = Math.min(size.width / extX, size.height / extY) * 0.97;
    cam.zoom = fit * s.zoom;
    const target = new THREE.Vector3(s.pan.x, city.maxHeight * 0.18 - 1.2, s.pan.y);
    cam.position.copy(target).addScaledVector(dir, 600);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    // Snap to the art-pixel grid so panning doesn't shimmer.
    const texel = 1 / (cam.zoom * viewport.dpr);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const pr = cam.position.dot(right);
    const pu = cam.position.dot(up);
    cam.position.addScaledVector(right, Math.round(pr / texel) * texel - pr).addScaledVector(up, Math.round(pu / texel) * texel - pu);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    if (interactive && s.inside && !s.drag?.moved) {
      ray.setFromCamera(s.mouse, cam);
      let best: { node: number; d: number } | null = null;
      const hits: THREE.Intersection[] = [];
      for (const m of meshes) {
        hits.length = 0;
        m.raycast(ray, hits);
        for (const h of hits) {
          if (h.instanceId === undefined) continue;
          const node = (m.userData.batch as Batch).nodeOf[h.instanceId];
          if (node < 0) continue;
          if (!best || h.distance < best.d) best = { node, d: h.distance };
        }
      }
      const node = best?.node ?? -1;
      if (node !== s.hover) {
        s.hover = node;
        onHover?.(node >= 0 ? node : null, null);
      }
    }
  });
  return null;
}

/* ─────────────────────────── life ─────────────────────────── */

function Life({ city, uniforms }: { city: PixelCity; uniforms: PixelUniforms }) {
  const p = city.palette;
  const night = p.time === "night";
  const sim = useMemo(() => {
    const rand = mulberry(city.fingerprint.seed ^ 0x9e3779b9);
    const cars: Array<{ x: number; z: number; axis: "x" | "z"; a: number; b: number; lane: number; dir: number; speed: number; t: number; color: RGB }> = [];
    for (const r of city.roads) {
      const len = r.axis === "x" ? r.w : r.d;
      if (len < 3) continue;
      const n = Math.floor(len * city.grammar.traffic * 0.22 * (r.avenue ? 1.6 : 1) + rand() * city.grammar.traffic);
      for (let i = 0; i < n; i++) {
        const dir = rand() < 0.5 ? 1 : -1;
        const width = r.axis === "x" ? r.d : r.w;
        cars.push({
          x: r.x,
          z: r.z,
          axis: r.axis,
          a: r.axis === "x" ? r.x : r.z,
          b: r.axis === "x" ? r.x + r.w : r.z + r.d,
          lane: (r.axis === "x" ? r.z : r.x) + width / 2 + dir * Math.min(0.24, width * 0.22),
          dir,
          speed: 1.2 + rand() * 1.6,
          t: rand() * len,
          color: rand() < 0.45 ? p.accents[Math.floor(rand() * p.accents.length)] : ([[0.92, 0.92, 0.9], [0.2, 0.22, 0.26], [0.7, 0.72, 0.75], [0.85, 0.3, 0.25]] as RGB[])[Math.floor(rand() * 4)],
        });
      }
    }
    const clouds: Array<{ x: number; z: number; y: number; s: number; v: number; parts: Array<[number, number, number, number]> }> = [];
    if (!night) {
      const half = city.size.w / 2;
      const nc = 4 + Math.floor(rand() * 4);
      for (let i = 0; i < nc; i++) {
        const parts: Array<[number, number, number, number]> = [];
        const k = 3 + Math.floor(rand() * 4);
        for (let j = 0; j < k; j++) parts.push([(rand() - 0.5) * 3, rand() * 0.5, (rand() - 0.5) * 1.6, 1 + rand() * 1.4]);
        // Keep clouds behind the diorama (screen-top), never over the city's centre.
        const a = rand() * half * 1.6;
        clouds.push({ x: -half * 0.35 - a + (rand() - 0.5) * half, z: -half * 0.35 - (half * 1.6 - a) * 0.8, y: city.maxHeight * 0.7 + 8 + rand() * 6, s: 1 + rand() * 1.2, v: 0.4 + rand() * 0.5, parts });
      }
    }
    return { cars, clouds };
  }, [city, p, night]);

  const carMesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const mat = new THREE.MeshToonMaterial({ gradientMap: toonRamp() });
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, sim.cars.length));
    m.count = sim.cars.length;
    m.castShadow = true;
    m.frustumCulled = false;
    sim.cars.forEach((c, i) => m.setColorAt(i, srgb(c.color)));
    return m;
  }, [sim]);
  const lightMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: srgb(p.lit).multiplyScalar(night ? 2.2 : 1), toneMapped: false }), Math.max(1, sim.cars.length));
    m.count = night ? sim.cars.length : 0;
    m.frustumCulled = false;
    return m;
  }, [sim, p, night]);
  const cloudMesh = useMemo(() => {
    const total = sim.clouds.reduce((s, c) => s + c.parts.length, 0);
    const mat = new THREE.MeshToonMaterial({ gradientMap: toonRamp(), color: srgb(p.cloud) });
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, Math.max(1, total));
    m.count = total;
    m.castShadow = true;
    m.frustumCulled = false;
    return m;
  }, [sim, p]);
  const smoke = useMemo(() => {
    const per = 10;
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ gradientMap: toonRamp(), color: srgb(night ? [0.45, 0.45, 0.55] : [0.86, 0.86, 0.88]) }), Math.max(1, city.smokestacks.length * per));
    m.count = city.smokestacks.length * per;
    m.frustumCulled = false;
    return { mesh: m, per };
  }, [city, night]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const time = uniforms.uTime.value;
    const started = time > city.buildDuration - 0.6;
    sim.cars.forEach((c, i) => {
      const len = c.b - c.a;
      c.t = (c.t + c.dir * c.speed * dt + len) % len;
      const along = c.a + c.t;
      const x = c.axis === "x" ? along : c.lane;
      const z = c.axis === "x" ? c.lane : along;
      q.setFromAxisAngle(yAxis, c.axis === "x" ? 0 : Math.PI / 2);
      sc.set(started ? 0.46 : 0.0001, 0.2, 0.24);
      m4.compose(v.set(x, 0.04, z), q, sc);
      carMesh.setMatrixAt(i, m4);
      if (night) {
        const fx = c.axis === "x" ? x + c.dir * 0.24 : x;
        const fz = c.axis === "x" ? z : z + c.dir * 0.24;
        sc.set(started ? 0.08 : 0.0001, 0.06, 0.18);
        m4.compose(v.set(fx, 0.12, fz), q, sc);
        lightMesh.setMatrixAt(i, m4);
      }
    });
    carMesh.instanceMatrix.needsUpdate = true;
    if (night) lightMesh.instanceMatrix.needsUpdate = true;

    const span = city.size.w * 1.6;
    let k = 0;
    for (const cl of sim.clouds) {
      cl.x += cl.v * dt;
      cl.z -= cl.v * dt;
      if (cl.x > span / 2) {
        cl.x -= span;
        cl.z += span;
      }
      for (const [dx, dy, dz, s] of cl.parts) {
        m4.compose(v.set(cl.x + dx * cl.s, cl.y + dy, cl.z + dz * cl.s), q.identity(), sc.set(s * cl.s, 0.7 * cl.s, s * 0.8 * cl.s));
        cloudMesh.setMatrixAt(k++, m4);
      }
    }
    cloudMesh.instanceMatrix.needsUpdate = true;

    city.smokestacks.forEach(([x, y, z], si) => {
      for (let j = 0; j < smoke.per; j++) {
        const life = (time * 0.35 + j / smoke.per + si * 0.13) % 1;
        const s = (0.2 + life * 0.7) * (1 - life * 0.6) * (started ? 1 : 0.0001);
        m4.compose(v.set(x + life * 1.2 + Math.sin(life * 6 + j) * 0.15, y + life * 3.2, z - life * 0.5), q.identity(), sc.set(s, s, s));
        smoke.mesh.setMatrixAt(si * smoke.per + j, m4);
      }
    });
    if (city.smokestacks.length) smoke.mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={carMesh} />
      <primitive object={lightMesh} />
      <primitive object={cloudMesh} />
      <primitive object={smoke.mesh} />
    </>
  );
}

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
