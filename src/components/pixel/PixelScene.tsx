"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BloomEffect, CopyMaterial, EffectComposer, EffectPass, Pass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { RGB } from "@/lib/city/types";
import { srgbToLinear } from "@/lib/city/palette";
import { drawGlyph, GLYPH_H } from "@/lib/pixelcity/pixel-font";
import { drawPeopleAtlas, PEOPLE_ATLAS } from "@/lib/pixelcity/kit/people";
import type { BuildPlan } from "@/lib/pixelcity/construction";
import type { GamePalette } from "@/lib/pixelcity/palette";
import type { Part, PartMesh, PixelCity } from "@/lib/pixelcity/types";
import { useAtlas } from "@/components/scene/atlas";
import {
  createAtlasMaterial,
  createDepthMaterial,
  createGlowMaterial,
  createSpriteMaterial,
  createToonMaterial,
  pixelGeometries,
  toonRamp,
  type PixelUniforms,
} from "./materials";
import { PixelPostEffect } from "./PixelPost";

const srgb = (c: RGB) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
const BILLBOARD_PAPER: RGB = [0.2, 0.2, 0.22];
const BILLBOARD_ATLAS = { pixelate: [64, 40] as [number, number] };

export interface ViewState {
  /** Azimuth in degrees (45 = classic iso from the +x/+z corner). */
  azimuth: number;
  /** Zoom multiplier on top of "fit". */
  zoom: number;
  /** Pan offset in world units. */
  pan: [number, number];
}

/**
 * Two resolutions, decoupled:
 *  - RENDER_LINES: the geometry. The scene is rendered at ~900 lines and enlarged by a whole
 *    number of screen pixels (nearest), so edges, windows and signs get real definition.
 *  - ART_LINES: the pixel language — dither, stars, haze steps, outline weight, glow size —
 *    drawn on a ~600-line grid at screen resolution, independent of the render size.
 * World-anchored patterns (windows, roads, grass, water, sign and image texels) keep their size
 * in the world, so they stay put when the camera moves.
 */
export const RENDER_LINES = 900;
export const ART_LINES = 600;

export interface PixelScales {
  /** Canvas pixel ratio (screen resolution, capped at 2). */
  dpr: number;
  /** Screen pixels per render pixel. */
  renderPx: number;
  /** Screen pixels per art pixel. */
  artPx: number;
}

export interface PixelSceneProps {
  city: PixelCity;
  view?: ViewState;
  interactive?: boolean;
  /** City view: whole diorama, drag rotates. Explore: closer, drag pans. */
  mode?: "city" | "explore";
  /** World x/z the camera should centre on (explore). */
  focus?: [number, number] | null;
  /** Node range [start, end) to highlight strongly (a hovered district, a picked building). */
  highlight?: [number, number] | null;
  /** Node range to tint softly (the region around the picked building). */
  soft?: [number, number] | null;
  /** Dim everything outside `highlight` (City view district hover). */
  spotlight?: boolean;
  /** Hovered node (or null) and the world x/z under the cursor (or null off the city). */
  onHover?: (node: number | null, point: [number, number] | null) => void;
  onPick?: (node: number | null) => void;
  onCanvas?: (canvas: HTMLCanvasElement) => void;
  /** City view only: move the diorama up by this fraction of the viewport (room for a title). */
  lift?: number;
  /** Construction choreography for `city` (re-timed build, lights and traffic switching on). */
  plan?: BuildPlan | null;
  /** The planned city's build clock (seconds), every frame — captions follow the scene, not the wall. */
  onBuildTime?: (seconds: number) => void;
  /** Explore zoom override (the detail-kit prototype looks closer than the default street view). */
  exploreZoom?: number;
}

export default function PixelScene({ onCanvas, ...rest }: PixelSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const scales = usePixelScales(wrap);

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
      {scales && (
        <Canvas
          dpr={scales.dpr}
          shadows="basic"
          flat
          orthographic
          gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          camera={{ near: 1, far: 2000, position: [100, 100, 100], zoom: 10 }}
          style={{ imageRendering: "pixelated" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping;
            onCanvas?.(gl.domElement);
          }}
        >
          <Stage {...rest} scales={scales} />
        </Canvas>
      )}
    </div>
  );
}

/** Screen, render and art pixel sizes for this element: whole numbers, so every pixel is even. */
function usePixelScales(ref: React.RefObject<HTMLDivElement | null>): PixelScales | null {
  const [scales, setScales] = useState<PixelScales | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const lines = (el.clientHeight || 600) * dpr;
      const renderPx = Math.max(1, Math.round(lines / RENDER_LINES));
      const artPx = Math.max(renderPx, Math.round(lines / ART_LINES));
      setScales((s) => (s && s.dpr === dpr && s.renderPx === renderPx && s.artPx === artPx ? s : { dpr, renderPx, artPx }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scales;
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

const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpM = new THREE.Matrix4();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

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
      if (p.rotX || p.rotZ) {
        // Tilted parts: full rotation (Y last), scale in the part's own frame.
        tmpQ.setFromEuler(tmpE.set(p.rotX ?? 0, p.rotY, p.rotZ ?? 0, "YXZ"));
        tmpM.compose(tmpV.set(p.x, p.y, p.z), tmpQ, tmpS.set(p.w, p.h, p.d));
        b.matrices.set(tmpM.elements, k * 16);
      } else {
        const c = Math.cos(p.rotY);
        const s = Math.sin(p.rotY);
        b.matrices.set([c * p.w, 0, -s * p.w, 0, 0, p.h, 0, 0, s * p.d, 0, c * p.d, 0, p.x, p.y, p.z, 1], k * 16);
      }
      b.colors.set(srgbToLinear(p.color), k * 3);
      b.anim.set([p.delay, -1, ((p.node + 7) * 0.6180339 + k * 0.137) % 1, 0], k * 4);
      b.meta.set([p.surf, p.lit, p.slot ?? -1, p.variant ?? 0], k * 4);
      if (p.rect) b.rect.set(p.rect, k * 4);
      b.nodeOf[k] = p.node;
    });
    out.push(b);
  }
  return out;
}

/** The procedural people atlas: one texture for every city (figures are generic). */
let peopleTexture: THREE.CanvasTexture | null = null;
function peopleAtlas(): THREE.CanvasTexture {
  if (peopleTexture) return peopleTexture;
  const c = document.createElement("canvas");
  c.width = PEOPLE_ATLAS.w;
  c.height = PEOPLE_ATLAS.h;
  drawPeopleAtlas(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  peopleTexture = t;
  return t;
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
        // Multi-line, each line centred.
        s.text.split("\n").forEach((line, li) => {
          const lw = line.length * 4 - 1;
          const ox = s.x + Math.floor((s.w - lw) / 2);
          for (let i = 0; i < line.length; i++) drawGlyph(line[i], ox + i * 4, s.y + 2 + li * (GLYPH_H + 1), dot);
        });
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

/* ─────────────────────────── stage ─────────────────────────── */

/**
 * One world on screen at a time — except while one replaces another (the vacant lot becoming
 * a city, a city cleared back to the lot): then the incoming world spreads from the origin in
 * a widening ring over the outgoing one, and the light and sky move from one palette to the
 * other as it goes. No cut, no loading screen.
 */
const REVEAL = { dur: 1.9, radius: 150, screen: 55 };
interface Reveal {
  on: boolean;
  t: number;
  r: number;
  /** 0..1 palette blend (outgoing → incoming). */
  k: number;
}
let layerIds = 0;
const layerId = new WeakMap<PixelCity, number>();
const idOf = (c: PixelCity) => {
  if (!layerId.has(c)) layerId.set(c, ++layerIds);
  return layerId.get(c)!;
};

type StageProps = Omit<PixelSceneProps, "onCanvas"> & { scales: PixelScales };

function Stage({ city, view, interactive = true, mode = "city", focus = null, highlight = null, soft = null, spotlight = false, lift = 0, plan = null, onBuildTime, onHover, onPick, scales, exploreZoom }: StageProps) {
  const [stack, setStack] = useState<PixelCity[]>([city]);
  // Derived during render: a new city pushes the current one out (React's "adjust state on prop change").
  if (stack[stack.length - 1] !== city) setStack([stack[stack.length - 1], city]);
  const reveal = useMemo<Reveal>(() => ({ on: false, t: 0, r: 0, k: 1 }), []);
  useLayoutEffect(() => {
    if (stack.length > 1) Object.assign(reveal, { on: true, t: 0, r: 0, k: 0 });
  }, [stack, reveal]);
  useFrame((_, dt) => {
    if (!reveal.on) return;
    reveal.t += Math.min(dt, 0.05);
    const p = Math.min(1, reveal.t / REVEAL.dur);
    reveal.r = REVEAL.radius * Math.pow(p, 1.5);
    reveal.k = Math.min(1, reveal.r / REVEAL.screen);
    if (p >= 1) {
      Object.assign(reveal, { on: false, k: 1 });
      setStack((st) => st.slice(-1));
    }
  });

  const active = stack[stack.length - 1];
  const outgoing = stack.length > 1 ? stack[0] : null;
  const meshesRef = useRef<THREE.InstancedMesh[]>([]);
  const fog = useMemo<Fog>(() => ({ near: 1e6, far: 1e6 + 1 }), []);
  const onMeshes = useCallback((m: THREE.InstancedMesh[]) => {
    meshesRef.current = m;
  }, []);

  return (
    <>
      <Lights to={active} from={outgoing} reveal={reveal} />
      {stack.map((c) => (
        <Layer
          key={idOf(c)}
          city={c}
          role={c === active ? (outgoing ? "incoming" : "solo") : "outgoing"}
          reveal={reveal}
          plan={c === city ? plan : null}
          highlight={c === active ? highlight : null}
          soft={c === active ? soft : null}
          spotlight={c === active && spotlight}
          onMeshes={c === active ? onMeshes : undefined}
          onBuildTime={c === city ? onBuildTime : undefined}
        />
      ))}
      <Rig city={active} view={view} interactive={interactive} mode={mode} focus={focus} lift={lift} meshes={meshesRef} fog={fog} renderPx={scales.renderPx} exploreZoom={exploreZoom} onHover={onHover} onPick={onPick} />
      <Post to={active} from={outgoing} reveal={reveal} fog={fog} scales={scales} />
    </>
  );
}

function Lights({ to, from, reveal }: { to: PixelCity; from: PixelCity | null; reveal: Reveal }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const world = to.frame === "world";
  // World frame: shadows reach a band of countryside around the city too.
  const half = Math.max(to.size.w, to.size.d) / 2 + (world ? 22 : 0);
  const tmp = useMemo(() => ({ a: new THREE.Color(), b: new THREE.Color(), d: new THREE.Vector3(), e: new THREE.Vector3() }), []);
  useFrame(() => {
    const A = (from ?? to).palette;
    const B = to.palette;
    const k = reveal.on ? reveal.k : 1;
    const h = hemi.current;
    const l = sun.current;
    if (!h || !l) return;
    h.color.copy(tmp.a.copy(srgb(A.ambient.sky))).lerp(tmp.b.copy(srgb(B.ambient.sky)), k);
    h.groundColor.copy(tmp.a.copy(srgb(A.ambient.ground))).lerp(tmp.b.copy(srgb(B.ambient.ground)), k);
    h.intensity = A.ambient.intensity + (B.ambient.intensity - A.ambient.intensity) * k;
    l.color.copy(tmp.a.copy(srgb(A.sun.color))).lerp(tmp.b.copy(srgb(B.sun.color)), k);
    l.intensity = A.sun.intensity + (B.sun.intensity - A.sun.intensity) * k;
    tmp.d.set(...A.sun.dir).normalize().lerp(tmp.e.set(...B.sun.dir).normalize(), k).normalize();
    l.position.copy(tmp.d).multiplyScalar(half * 3);
  });
  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={world ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.0008}
        shadow-camera-left={-half * 1.6}
        shadow-camera-right={half * 1.6}
        shadow-camera-top={half * 1.6}
        shadow-camera-bottom={-half * 1.6}
        shadow-camera-near={1}
        shadow-camera-far={half * 8}
      />
    </>
  );
}

/* ─────────────────────────── layer ─────────────────────────── */

function Layer({
  city,
  role,
  reveal,
  plan: planProp,
  highlight,
  soft,
  spotlight,
  onMeshes,
  onBuildTime,
}: {
  city: PixelCity;
  role: "solo" | "incoming" | "outgoing";
  reveal: Reveal;
  plan: BuildPlan | null;
  highlight: [number, number] | null;
  soft: [number, number] | null;
  spotlight: boolean;
  onMeshes?: (m: THREE.InstancedMesh[]) => void;
  onBuildTime?: (seconds: number) => void;
}) {
  // The choreography is fixed when the layer is born.
  const [plan] = useState(planProp);
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
      uFocus: { value: 0 },
      uReveal: { value: new THREE.Vector2(0, 0) },
      uLights: { value: plan ? 0 : 1 },
    }),
    [p, night, plan],
  );
  // Billboard photos at the art scale: 64×40 texels per slot (≈1 art pixel per texel on a
  // typical billboard in City View), nearest — not smoothed by the finer render.
  const images = useAtlas(city.images, BILLBOARD_PAPER, BILLBOARD_ATLAS);
  const signs = useSignAtlas(city);

  const kit = useMemo(() => {
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
      sprite: createSpriteMaterial(uniforms, peopleAtlas(), [PEOPLE_ATLAS.w, PEOPLE_ATLAS.h]),
    };
    return { geos, mats, depth };
  }, [city.signAtlas, uniforms, images, signs]);
  const toMeshes = (parts: PixelCity["parts"]) => {
    const { geos, mats, depth } = kit;
    return buildBatches(parts).map((b) => {
      const geo = geos[b.mesh].clone();
      geo.setAttribute("aAnim", new THREE.InstancedBufferAttribute(b.anim, 4).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(b.meta, 4));
      geo.setAttribute("aRect", new THREE.InstancedBufferAttribute(b.rect, 4));
      const m = new THREE.InstancedMesh(geo, mats[b.mesh], b.count);
      m.instanceMatrix.array.set(b.matrices);
      m.instanceColor = new THREE.InstancedBufferAttribute(b.colors, 3);
      m.castShadow = b.mesh !== "glow" && b.mesh !== "sign" && b.mesh !== "sprite";
      m.receiveShadow = b.mesh !== "glow" && b.mesh !== "image" && b.mesh !== "sign" && b.mesh !== "sprite";
      m.customDepthMaterial = depth;
      m.frustumCulled = false;
      m.userData.batch = b;
      return m;
    });
  };
  // The city (DOM parts: inspectable, highlightable) and the land around it (scenery: neither).
  // With a construction plan the same parts rise in the plan's order instead.
  const parts = useMemo(() => (plan ? city.parts.map((q, i) => ({ ...q, delay: plan.delays[i] ?? q.delay })) : city.parts), [city, plan]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const meshes = useMemo(() => toMeshes(parts), [parts, kit]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scenery = useMemo(() => toMeshes(city.scenery), [city, kit]);
  useLayoutEffect(() => {
    onMeshes?.(meshes);
  }, [meshes, onMeshes]);
  useEffect(() => () => [...meshes, ...scenery].forEach((m) => m.geometry.dispose()), [meshes, scenery]);

  // Highlight a node range (a region and everything it contains) via aAnim.w.
  const hl0 = highlight?.[0] ?? -1;
  const hl1 = highlight?.[1] ?? -1;
  const sf0 = soft?.[0] ?? -1;
  const sf1 = soft?.[1] ?? -1;
  useEffect(() => {
    for (const m of meshes) {
      const b = m.userData.batch as Batch;
      const attr = m.geometry.getAttribute("aAnim") as THREE.InstancedBufferAttribute;
      let changed = false;
      for (let k = 0; k < b.count; k++) {
        const node = b.nodeOf[k];
        const v = hl0 >= 0 && node >= hl0 && node < hl1 ? 1 : sf0 >= 0 && node >= sf0 && node < sf1 ? 0.45 : 0;
        if (b.anim[k * 4 + 3] !== v) {
          b.anim[k * 4 + 3] = v;
          changed = true;
        }
      }
      if (changed) {
        attr.clearUpdateRanges();
        attr.needsUpdate = true;
      }
    }
  }, [meshes, hl0, hl1, sf0, sf1]);

  const spot = spotlight && hl0 >= 0 ? 1 : 0;
  useFrame((_, dt) => {
    const u = uniforms;
    u.uTime.value += Math.min(dt, 0.05);
    u.uFocus.value += (spot - u.uFocus.value) * (1 - Math.exp(-dt * 12));
    const mode = !reveal.on || role === "solo" ? 0 : role === "incoming" ? 1 : -1;
    u.uReveal.value.set(reveal.r, mode);
    if (plan) {
      u.uLights.value = Math.min(1, Math.max(0, (u.uTime.value - plan.lightsAt) / 0.7));
      onBuildTime?.(u.uTime.value);
    }
  });

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      {scenery.map((m, i) => (
        <primitive key={`s${i}`} object={m} />
      ))}
      {role !== "outgoing" && <Life city={city} uniforms={uniforms} startAt={plan?.lifeAt} />}
    </>
  );
}

/* ─────────────────────────── post ─────────────────────────── */

const inkOf = (p: GamePalette): RGB => p.ink ?? (p.time === "night" ? [0.05, 0.04, 0.12] : [0.12, 0.08, 0.14]);

/**
 * Renders the scene into its own target at the render resolution (with depth), then enlarges
 * it to the screen buffer with nearest sampling. The effects that follow run at screen
 * resolution and read this pass's depth, so they can draw on the art grid.
 */
class RenderScaledPass extends Pass {
  readonly target: THREE.WebGLRenderTarget;
  private readonly copy = new CopyMaterial();
  constructor(
    private readonly world: THREE.Scene,
    private readonly view: THREE.Camera,
    private readonly px: number,
  ) {
    super("RenderScaledPass");
    this.needsSwap = false;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.fullscreenMaterial = this.copy;
  }
  setSize(width: number, height: number) {
    this.target.setSize(Math.max(1, Math.round(width / this.px)), Math.max(1, Math.round(height / this.px)));
  }
  render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget | null) {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.world, this.view);
    this.copy.inputBuffer = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.target.dispose();
    super.dispose();
  }
}

function Post({ to, from, reveal, fog, scales }: { to: PixelCity; from: PixelCity | null; reveal: Reveal; fog: Fog; scales: PixelScales }) {
  const { gl, scene, camera, size } = useThree();
  const { renderPx, artPx } = scales;
  const pipe = useMemo(() => {
    const p = to.palette;
    const post = new PixelPostEffect({ skyTop: srgb(p.sky.top), skyBottom: srgb(p.sky.bottom), ink: srgb(inkOf(p)), stars: p.sky.stars, edge: 0.55 });
    post.uniforms.get("uArt")!.value = artPx;
    // Glow sized in art pixels: the mip chain starts at screen resolution, so it needs about
    // log2(artPx) more levels to reach as far as it did when the frame *was* the art grid.
    const bloom = new BloomEffect({ mipmapBlur: true, levels: 4 + Math.round(Math.log2(artPx)), radius: 0.5, luminanceThreshold: 0.95, intensity: 0.25 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    const render = new RenderScaledPass(scene, camera, renderPx);
    const effects = new EffectPass(camera, post, bloom, tone);
    composer.addPass(render);
    composer.addPass(effects);
    // The effects read the depth of the scene as rendered (render resolution), not the
    // composer's own (empty) screen-size depth.
    if (render.target.depthTexture) effects.setDepthTexture(render.target.depthTexture);
    return { composer, post, bloom, applied: { w: -1, h: -1 } };
    // The pipeline lives as long as the canvas and its pixel sizes; colors follow the palettes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, renderPx, artPx]);
  useEffect(() => () => pipe.composer.dispose(), [pipe]);

  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    const { composer, post, bloom, applied } = pipe;
    const A = (from ?? to).palette;
    const B = to.palette;
    const k = reveal.on ? reveal.k : 1;
    const u = post.uniforms;
    (u.get("uSkyTop")!.value as THREE.Color).copy(srgb(A.sky.top)).lerp(tmp.copy(srgb(B.sky.top)), k);
    (u.get("uSkyBottom")!.value as THREE.Color).copy(srgb(A.sky.bottom)).lerp(tmp.copy(srgb(B.sky.bottom)), k);
    (u.get("uInk")!.value as THREE.Color).copy(srgb(inkOf(A))).lerp(tmp.copy(srgb(inkOf(B))), k);
    u.get("uStars")!.value = (k > 0.5 ? B : A).sky.stars ? 1 : 0;
    u.get("uFogNear")!.value = fog.near;
    u.get("uFogFar")!.value = fog.far;
    const night = B.time !== "day";
    bloom.luminanceMaterial.threshold = night ? 0.75 : 0.95;
    bloom.intensity = night ? 0.9 : 0.25;
    if (size.width !== applied.w || size.height !== applied.h) {
      composer.setSize(size.width, size.height, false);
      applied.w = size.width;
      applied.h = size.height;
    }
    composer.render(dt);
  }, 1);
  return null;
}

/* ─────────────────────────── camera ─────────────────────────── */

/**
 * World frame: the art scale is fixed (world units across the screen diagonal), not fitted to
 * the city — so a big page runs past the edges and a small one sits in open land.
 */
const WORLD_DIAG = 50;
const ZOOM = {
  island: { explore: 2.6, city: [0.8, 1.7], street: [1.4, 6] },
  world: { explore: 1.75, city: [0.7, 1.5], street: [1.2, 4.5] },
} as const;

/** View-space distances where the haze starts and ends (world frame). */
export interface Fog {
  near: number;
  far: number;
}

type Tween = { t: number; dur: number; z0: number; z1: number; p0: THREE.Vector2; p1: THREE.Vector2 | null; a0: number; a1: number };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function Rig({
  city,
  view,
  interactive,
  mode,
  focus,
  lift,
  meshes,
  fog,
  renderPx,
  exploreZoom,
  onHover,
  onPick,
}: {
  city: PixelCity;
  view?: ViewState;
  interactive?: boolean;
  mode: "city" | "explore";
  focus: [number, number] | null;
  lift: number;
  meshes: React.RefObject<THREE.InstancedMesh[]>;
  fog: Fog;
  /** Screen pixels per render pixel: the camera snaps to the render grid. */
  renderPx: number;
  exploreZoom?: number;
  onHover?: PixelSceneProps["onHover"];
  onPick?: PixelSceneProps["onPick"];
}) {
  const { camera, size, gl, viewport } = useThree();
  const world = city.frame === "world";
  const Z = ZOOM[city.frame];
  const az0 = view?.azimuth ?? 45;
  const state = useRef({
    // World frame opens a little higher and turned, then settles: we arrive flying over it.
    az: world ? az0 - 18 : az0,
    azTarget: az0,
    zoom: world ? 0.62 : (view?.zoom ?? 1),
    zoomTarget: view?.zoom ?? 1,
    pan: new THREE.Vector2(...(view?.pan ?? [0, 0])),
    panTarget: new THREE.Vector2(...(view?.pan ?? [0, 0])),
    tween: null as Tween | null,
    started: false,
    drag: null as null | { x: number; y: number; moved: boolean },
    mouse: new THREE.Vector2(),
    inside: false,
    hover: -2,
    hx: NaN,
    hz: NaN,
    lift: mode === "city" ? lift : 0,
    haze: mode === "city" ? 1 : 0,
    mode,
  });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ground = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // A user gesture takes the camera back from any running glide.
  const cancelTween = () => {
    const s = state.current;
    if (!s.tween) return;
    s.zoomTarget = s.zoom;
    s.panTarget.copy(s.pan);
    s.azTarget = s.az;
    s.tween = null;
  };

  useEffect(() => {
    if (view) state.current.azTarget = view.azimuth;
  }, [view]);

  // Mode changes are one continuous camera move: aerial → approach → street, and back. So is a
  // new world arriving: the camera keeps flying and settles on it while it's being built.
  const cityRef = useRef(city);
  useEffect(() => {
    const s = state.current;
    const first = !s.started;
    const newWorld = cityRef.current !== city;
    cityRef.current = city;
    s.started = true;
    s.mode = mode;
    const z1 = mode === "explore" ? (exploreZoom ?? Z.explore) : (view?.zoom ?? 1);
    const p1 = mode === "explore" ? (focus ? new THREE.Vector2(focus[0], focus[1]) : s.pan.clone()) : world ? null : new THREE.Vector2(...(view?.pan ?? [0, 0]));
    if (first && !world) {
      s.zoom = z1;
      if (p1) s.pan.copy(p1);
    }
    s.tween = { t: 0, dur: first && world ? 2.8 : newWorld ? 4.6 : mode === "explore" ? 1.9 : 1.6, z0: s.zoom, z1, p0: s.pan.clone(), p1, a0: s.az, a1: s.azTarget };
  }, [mode, focus, view, world, Z, city, exploreZoom]);

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
      if (Math.hypot(e.clientX - s.drag.x, e.clientY - s.drag.y) > 3) s.drag.moved = true;
      if (!s.drag.moved) return;
      cancelTween();
      if (s.mode === "city") {
        s.azTarget -= e.movementX * 0.3; // orbit
        return;
      }
      const cam = camera as THREE.OrthographicCamera;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
      const k = 1 / cam.zoom;
      s.panTarget.x -= (right.x * e.movementX - fwd.x * e.movementY * 2) * k;
      s.panTarget.y -= (right.z * e.movementX - fwd.z * e.movementY * 2) * k;
      s.pan.copy(s.panTarget);
    };
    const onUp = () => {
      if (s.drag && !s.drag.moved) onPick?.(s.hover >= 0 ? s.hover : null);
      s.drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelTween();
      const [lo, hi] = s.mode === "city" ? Z.city : Z.street;
      s.zoomTarget = Math.max(lo, Math.min(hi, s.zoomTarget * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "KeyQ" || e.code === "KeyE") {
        cancelTween();
        s.azTarget += e.code === "KeyQ" ? -90 : 90;
      }
      if (s.mode !== "explore") return;
      const cam = camera as THREE.OrthographicCamera;
      const step = 40 / cam.zoom;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
      const mv = new THREE.Vector2();
      if (e.code === "KeyW" || e.code === "ArrowUp") mv.set(fwd.x, fwd.z);
      if (e.code === "KeyS" || e.code === "ArrowDown") mv.set(-fwd.x, -fwd.z);
      if (e.code === "KeyD" || e.code === "ArrowRight") mv.set(right.x, right.z);
      if (e.code === "KeyA" || e.code === "ArrowLeft") mv.set(-right.x, -right.z);
      if (mv.lengthSq() === 0) return;
      cancelTween();
      s.panTarget.add(mv.multiplyScalar(step));
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
  }, [gl, camera, interactive, onPick, Z]);

  useFrame((_, dt) => {
    const s = state.current;
    const k = 1 - Math.exp(-dt * 5);
    const el = (30 * Math.PI) / 180; // 2:1 dimetric
    const tw = s.tween;
    let e = 0;
    if (tw) {
      tw.t += Math.min(dt, 0.05);
      const p = clamp01(tw.t / tw.dur);
      e = easeInOut(p);
      s.az = tw.a0 + (tw.a1 - tw.a0) * e;
      // Zoom lags the pan a little: fly toward it, then come down.
      s.zoom = Math.exp(Math.log(tw.z0) + (Math.log(tw.z1) - Math.log(tw.z0)) * easeInOut(clamp01((p - 0.1) / 0.9)));
    } else {
      s.az += (s.azTarget - s.az) * (1 - Math.exp(-dt * 8));
      s.zoom += (s.zoomTarget - s.zoom) * k;
    }
    const az = (s.az * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    // Project the city's footprint onto the camera plane (any rectangle, any azimuth).
    const right2 = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const depthAxis = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
    const hw = city.size.w / 2;
    const hd = city.size.d / 2;
    const corners = [-hw, hw].flatMap((x) => [-hd, hd].map((z) => [x, z] as const));
    const xs = corners.map(([x, z]) => x * right2.x + z * right2.z);
    const ds = corners.map(([x, z]) => x * depthAxis.x + z * depthAxis.z);
    const extX = Math.max(...xs) - Math.min(...xs);
    const extY = (Math.max(...ds) - Math.min(...ds)) * Math.sin(el) + (city.maxHeight + 3.5) * Math.cos(el);
    const base = world ? Math.hypot(size.width, size.height) / WORLD_DIAG : Math.min(size.width / extX, size.height / extY) * 0.97;

    // World City View: centre the city when it fits; when it overflows, slide toward the
    // entrance so the landmark and the first districts own the frame.
    const framing = new THREE.Vector2();
    if (world) {
      const over = Math.max(extX / (size.width / base), extY / (size.height / base));
      const t = Math.min(0.42, Math.max(0, (over - 1) * 0.6));
      framing.set(city.entrance[0] * t + (view?.pan[0] ?? 0), city.entrance[1] * t + (view?.pan[1] ?? 0));
    }
    if (tw) {
      const p1 = tw.p1 ?? framing;
      s.pan.lerpVectors(tw.p0, p1, e);
      if (tw.t >= tw.dur) {
        s.zoomTarget = tw.z1;
        s.panTarget.copy(p1);
        s.azTarget = tw.a1;
        s.tween = null;
      }
    } else {
      if (world && s.mode === "city") s.panTarget.copy(framing);
      if (world && s.mode === "explore") {
        const m = 14;
        s.panTarget.set(Math.max(-hw - m, Math.min(hw + m, s.panTarget.x)), Math.max(-hd - m, Math.min(hd + m, s.panTarget.y)));
      }
      s.pan.lerp(s.panTarget, k);
    }
    s.lift += ((s.mode === "city" && !world ? lift : 0) - s.lift) * k;

    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = base * s.zoom;
    const camUp = new THREE.Vector3(-Math.sin(az) * Math.sin(el), Math.cos(el), -Math.cos(az) * Math.sin(el));
    const target = new THREE.Vector3(s.pan.x, city.maxHeight * 0.18 - 1.2, s.pan.y).addScaledVector(camUp, (-s.lift * size.height) / cam.zoom);
    cam.position.copy(target).addScaledVector(dir, 600);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    // Snap to the render-pixel grid so panning doesn't shimmer: world-anchored patterns move
    // by whole pixels.
    const texel = renderPx / (cam.zoom * viewport.dpr);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const pr = cam.position.dot(right);
    const pu = cam.position.dot(up);
    cam.position.addScaledVector(right, Math.round(pr / texel) * texel - pr).addScaledVector(up, Math.round(pu / texel) * texel - pu);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // Haze, anchored to the frame: in City View the top band of land dissolves into the sky
    // (a horizon an orthographic camera can't otherwise have); tall buildings, being nearer,
    // stand crisp against it. It lifts as the camera comes down into the streets.
    if (world) {
      s.haze += ((s.mode === "city" ? 1 : 0) - s.haze) * (1 - Math.exp(-dt * 2.5));
      const viewH = size.height / cam.zoom;
      // View depth of the ground under the screen row at height v (0 = bottom, 1 = top).
      const groundDepth = (v: number) => 600 + (target.y + Math.cos(el) * (v - 0.5) * viewH) / Math.sin(el);
      const [hn, hf] = city.atmosphere?.haze ?? [0.64, 0.97];
      fog.near = groundDepth(1.6 + (hn - 1.6) * s.haze);
      fog.far = groundDepth(2.1 + (hf - 2.1) * s.haze);
    } else {
      fog.near = 1e6;
      fog.far = 1e6 + 1;
    }

    if (interactive && s.inside && !s.drag?.moved) {
      ray.setFromCamera(s.mouse, cam);
      let best: { node: number; d: number } | null = null;
      let first: THREE.Intersection | null = null;
      const hits: THREE.Intersection[] = [];
      for (const m of meshes.current ?? []) {
        hits.length = 0;
        m.raycast(ray, hits);
        for (const h of hits) {
          if (h.instanceId === undefined) continue;
          if (!first || h.distance < first.distance) first = h;
          const node = (m.userData.batch as Batch).nodeOf[h.instanceId];
          if (node < 0) continue;
          if (!best || h.distance < best.d) best = { node, d: h.distance };
        }
      }
      const node = best?.node ?? -1;
      // Ground point (falls back to the ground plane: the land isn't raycast), quantised to
      // half tiles so hover only fires when it matters.
      const gp = first ? first.point : ray.ray.intersectPlane(ground, new THREE.Vector3());
      const px = gp ? Math.round(gp.x * 2) / 2 : NaN;
      const pz = gp ? Math.round(gp.z * 2) / 2 : NaN;
      if (node !== s.hover || px !== s.hx || pz !== s.hz) {
        s.hover = node;
        s.hx = px;
        s.hz = pz;
        onHover?.(node >= 0 ? node : null, gp ? [px, pz] : null);
      }
    } else if (!s.inside && s.hover !== -1) {
      s.hover = -1;
      s.hx = NaN;
      onHover?.(null, null);
    }
  });
  return null;
}

/* ─────────────────────────── life ─────────────────────────── */

function Life({ city, uniforms, startAt }: { city: PixelCity; uniforms: PixelUniforms; startAt?: number }) {
  const p = city.palette;
  const night = p.time === "night";
  const sim = useMemo(() => {
    const rand = mulberry(city.fingerprint.seed ^ 0x9e3779b9);
    const cars: Array<{ x: number; z: number; axis: "x" | "z"; a: number; b: number; lane: number; dir: number; speed: number; t: number; color: RGB }> = [];
    for (const r of [...city.roads, ...city.worldRoads]) {
      const len = r.axis === "x" ? r.w : r.d;
      if (len < 3) continue;
      const n = Math.floor(len * city.grammar.traffic * (r.rural ? 0.05 : 0.22) * (r.avenue ? 1.6 : 1) + rand() * city.grammar.traffic);
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
    // No clouds at night, nor over a drawing (the blueprint overrides the ink).
    if (!night && !p.ink) {
      const half = Math.max(city.size.w, city.size.d) / 2;
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

  const train = useMemo(() => {
    if (!city.rail) return null;
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshToonMaterial({ gradientMap: toonRamp() }), 3);
    m.castShadow = true;
    m.frustumCulled = false;
    for (let i = 0; i < 3; i++) m.setColorAt(i, srgb(i === 0 ? p.accents[0] : p.walls.modern[0]));
    return m;
  }, [city, p]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const time = uniforms.uTime.value;
    const started = time > (startAt ?? city.buildDuration - 0.6);
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

    const span = Math.max(city.size.w, city.size.d) * 1.6;
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

    if (train && city.rail) {
      const [a, b] = city.rail.points;
      const len = Math.abs(a[2] - b[2]);
      // Back and forth along the line, pausing at the ends.
      const cycle = (time * 2.2) % (len * 2 + 6);
      const t = cycle < len + 3 ? Math.min(cycle, len) : Math.max(0, len * 2 + 3 - cycle);
      for (let i = 0; i < 3; i++) {
        const z = a[2] - Math.min(len, Math.max(0, t - i * 0.95));
        m4.compose(v.set(a[0], a[1], z), q.identity(), sc.set(started ? 0.42 : 0.0001, 0.42, 0.85));
        train.setMatrixAt(i, m4);
      }
      train.instanceMatrix.needsUpdate = true;
    }

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
      {train && <primitive object={train} />}
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
