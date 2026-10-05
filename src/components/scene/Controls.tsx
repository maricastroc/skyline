"use client";

import { advance, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { collapseSound, setMuted, tick, unlockAudio } from "@/audio/sfx";
import type { CityRuntime } from "@/components/experience/runtime";
import { useSkyline } from "@/components/experience/store";

const INTRO_SECONDS = 5.2;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Ctl {
  yaw: number;
  pitch: number;
  vel: THREE.Vector3;
  keys: Set<string>;
  intro: number;
  orbit: boolean;
  orbitAngle: number;
  drag: { x: number; y: number; moved: boolean } | null;
  mouse: THREE.Vector2;
  mouseInside: boolean;
  noLock: boolean;
  wheel: number;
  lastHit: number;
  painted: string;
  focusAt: number;
  quietUntil: number;
  tween: { from: THREE.Vector3; to: THREE.Vector3; look: THREE.Vector3; t: number } | null;
}

export function Controls({ runtime }: { runtime: CityRuntime }) {
  const { camera, gl } = useThree();
  const city = runtime.city;
  const span = Math.max(city.size.w, city.size.d);

  const ctl = useRef<Ctl>({
    yaw: 0,
    pitch: -0.3,
    vel: new THREE.Vector3(),
    keys: new Set(),
    intro: 0,
    orbit: false,
    orbitAngle: 0,
    drag: null,
    mouse: new THREE.Vector2(),
    mouseInside: false,
    noLock: false,
    wheel: 0,
    lastHit: -1,
    painted: "",
    focusAt: 0,
    quietUntil: 0,
    tween: null,
  });
  const raycaster = useRef(new THREE.Raycaster());

  const introPath = useRef(() => {
    const e = city.entrance;
    const end = new THREE.Vector3(...e.position);
    const endLook = new THREE.Vector3(...e.target);
    const start = new THREE.Vector3(end.x - span * 0.65, end.y + span * 0.75, end.z + span * 0.35);
    const mid = new THREE.Vector3(end.x - span * 0.25, end.y + span * 0.3, end.z + span * 0.55);
    const center = new THREE.Vector3(0, city.maxHeight * 0.15, 0);
    return { start, mid, end, endLook, center };
  }).current;

  const lookFromTo = (from: THREE.Vector3, to: THREE.Vector3) => {
    const d = to.clone().sub(from);
    ctl.current.yaw = Math.atan2(-d.x, -d.z);
    ctl.current.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  };

  const finishIntro = () => {
    const c = ctl.current;
    if (c.intro < 0) return;
    const p = introPath();
    camera.position.copy(p.end);
    lookFromTo(p.end, p.endLook);
    c.intro = -1;
    useSkyline.getState().set({ introDone: true });
  };

  const act = () => {
    const st = useSkyline.getState();
    const target = st.hover?.node ?? null;
    if (st.mode === "explore") {
      st.set({ selected: target === st.selected ? null : target });
      tick(target !== null);
      return;
    }
    if (target === null) return;
    const anchor = city.anchor[target];
    const res = runtime.destroy(target, new THREE.Vector3(anchor[0], anchor[1], anchor[2]));
    if (!res) return;
    ctl.current.quietUntil = runtime.clock + 1.2 + res.spread;
    collapseSound(Math.min(1, Math.log10(1 + res.removedWeight) / 3), res.spread);
    const sel = st.selected;
    const n = runtime.doc.nodes[target];
    st.set({
      integrity: runtime.integrity,
      destroyed: st.destroyed + res.removedNodes,
      aliveVersion: st.aliveVersion + 1,
      lastHit: { node: target, weight: res.removedWeight, percent: res.removedWeight / runtime.totalWeight, at: performance.now() },
      demolitions: [
        { at: performance.now(), node: target, percent: res.removedWeight / runtime.totalWeight, nodes: res.removedNodes },
        ...st.demolitions,
      ].slice(0, 4),
      selected: sel !== null && sel >= target && sel < n.end ? null : sel,
      climb: 0,
      hover: null,
    });
  };

  useEffect(() => {
    const el = gl.domElement;
    const c = ctl.current;
    const store = useSkyline;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      unlockAudio();
      if (c.intro >= 0 && !["KeyH"].includes(e.code)) finishIntro();
      c.keys.add(e.code);
      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      const st = store.getState();
      if (e.code === "Digit1") st.setMode("explore");
      if (e.code === "Digit2") st.setMode("destroy");
      if (e.code === "Tab") st.setMode(st.mode === "explore" ? "destroy" : "explore");
      if (e.code === "KeyH") st.set({ hudHidden: !st.hudHidden });
      if (e.code === "KeyM") {
        setMuted(!st.muted);
        st.set({ muted: !st.muted });
      }
      if (e.code === "KeyO") {
        c.orbit = !c.orbit;
        c.orbitAngle = Math.atan2(camera.position.z, camera.position.x);
      }
      if (e.code === "KeyR") {
        runtime.rebuild();
        st.set({ integrity: 1, destroyed: 0, aliveVersion: st.aliveVersion + 1, selected: null, hover: null, lastHit: null, demolitions: [] });
      }
      if (e.code === "Escape" && !document.pointerLockElement) st.set({ selected: null });
      if (e.code === "KeyF") {
        const node = st.selected ?? st.hover?.node;
        if (node !== undefined && node !== null) st.set({ focus: { node, at: performance.now() } });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => c.keys.delete(e.code);
    const onBlur = () => c.keys.clear();

    const locked = () => document.pointerLockElement === el;
    const onLockChange = () => store.getState().set({ locked: locked() });
    const onLockError = () => {
      c.noLock = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      unlockAudio();
      if (c.intro >= 0) {
        finishIntro();
        return;
      }
      if (locked()) {
        act();
        return;
      }
      c.drag = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onPointerMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      c.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      c.mouseInside = e.target === el;
      if (locked()) {
        c.yaw -= e.movementX * 0.0022;
        c.pitch = THREE.MathUtils.clamp(c.pitch - e.movementY * 0.0022, -1.45, 1.45);
        c.orbit = false;
        return;
      }
      if (c.drag) {
        const dx = e.clientX - c.drag.x;
        const dy = e.clientY - c.drag.y;
        if (!c.drag.moved && Math.hypot(dx, dy) > 4) c.drag.moved = true;
        if (c.drag.moved) {
          c.yaw -= e.movementX * 0.003;
          c.pitch = THREE.MathUtils.clamp(c.pitch - e.movementY * 0.003, -1.45, 1.45);
          c.orbit = false;
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !c.drag) return;
      const moved = c.drag.moved;
      c.drag = null;
      if (moved) return;
      if (c.noLock) {
        act();
        return;
      }
      const req = el.requestPointerLock() as unknown as Promise<void> | undefined;
      if (req && typeof req.catch === "function") req.catch(() => (c.noLock = true));
    };
    const onLeave = () => {
      c.mouseInside = false;
      c.drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      c.wheel += e.deltaY;
      if (Math.abs(c.wheel) < 60) return;
      const st = store.getState();
      const hit = st.hover?.hit;
      const maxClimb = hit !== undefined ? runtime.doc.nodes[hit].level : 0;
      const climb = THREE.MathUtils.clamp(st.climb + (c.wheel < 0 ? 1 : -1), 0, maxClimb);
      c.wheel = 0;
      if (climb !== st.climb) {
        st.set({ climb });
        tick(climb > st.climb);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, runtime, camera]);

  useEffect(() => {
    const api = {
      runtime,
      skipIntro: finishIntro,
      setView(pos: [number, number, number], target: [number, number, number]) {
        finishIntro();
        ctl.current.orbit = false;
        camera.position.set(...pos);
        lookFromTo(camera.position, new THREE.Vector3(...target));
      },
      orbit(on = true) {
        finishIntro();
        ctl.current.orbit = on;
      },
      select(node: number | null) {
        useSkyline.getState().set({ selected: node });
      },
      destroy(node: number) {
        useSkyline.getState().set({ hover: { node, hit: node }, mode: "destroy" });
        act();
      },
      hoverAt(x: number, y: number) {
        ctl.current.mouse.set(x, y);
        ctl.current.mouseInside = true;
      },
      bench(frames = 30) {
        const ctx = gl.getContext();
        const px = new Uint8Array(4);
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) {
          advance(performance.now());
          ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        }
        const ms = (performance.now() - t0) / frames;
        return { ms: Math.round(ms * 100) / 100, fps: Math.round(1000 / ms), pixels: gl.domElement.width * gl.domElement.height, calls: gl.info.render.calls, triangles: gl.info.render.triangles };
      },
      project(node: number) {
        const a = runtime.city.anchor[node];
        const v = new THREE.Vector3(a[0], a[1], a[2]).project(camera);
        const r = gl.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
      },
      state: () => useSkyline.getState(),
      find(selector: string) {
        return runtime.doc.nodes.filter((n) => n.selector.includes(selector)).map((n) => n.id);
      },
    };
    (window as unknown as { __skyline: typeof api }).__skyline = api;
    return () => {
      delete (window as unknown as { __skyline?: unknown }).__skyline;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, camera, gl]);

  useEffect(() => {
    const p = introPath();
    camera.position.copy(p.start);
    lookFromTo(p.start, p.center);
    ctl.current.intro = 0;
    useSkyline.getState().set({ introDone: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime]);

  const tmp = useRef({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), want: new THREE.Vector3(), look: new THREE.Vector3(), center: new THREE.Vector2() }).current;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const c = ctl.current;
    const st = useSkyline.getState();

    if (st.focus && st.focus.at !== c.focusAt) {
      c.focusAt = st.focus.at;
      finishIntro();
      c.orbit = false;
      const b = city.bounds[st.focus.node];
      const center = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
      const radius = Math.max(2, Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2);
      const dir = camera.position.clone().sub(center);
      dir.y = Math.max(dir.y, Math.hypot(dir.x, dir.z) * 0.6);
      dir.normalize();
      c.tween = { from: camera.position.clone(), to: center.clone().addScaledVector(dir, radius * 2.1 + 6), look: center, t: 0 };
    }

    if (c.intro >= 0) {
      c.intro += dt;
      const t = ease(Math.min(1, c.intro / INTRO_SECONDS));
      const p = introPath();
      const u = 1 - t;
      camera.position.set(
        u * u * p.start.x + 2 * u * t * p.mid.x + t * t * p.end.x,
        u * u * p.start.y + 2 * u * t * p.mid.y + t * t * p.end.y,
        u * u * p.start.z + 2 * u * t * p.mid.z + t * t * p.end.z,
      );
      tmp.look.copy(p.center).lerp(p.endLook, t);
      lookFromTo(camera.position, tmp.look);
      if (c.intro >= INTRO_SECONDS) finishIntro();
    } else if (c.tween) {
      c.tween.t = Math.min(1, c.tween.t + dt / 1.1);
      const t = ease(c.tween.t);
      camera.position.lerpVectors(c.tween.from, c.tween.to, t);
      lookFromTo(camera.position, c.tween.look);
      if (c.tween.t >= 1) c.tween = null;
    } else if (c.orbit) {
      c.orbitAngle += dt * 0.08;
      const r = span * 0.82;
      camera.position.set(Math.cos(c.orbitAngle) * r, span * 0.38 + 10, Math.sin(c.orbitAngle) * r);
      lookFromTo(camera.position, tmp.look.set(0, city.maxHeight * 0.12, 0));
    } else {
      const k = c.keys;
      const f = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
      const s = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      const v = (k.has("Space") || k.has("KeyE") ? 1 : 0) - (k.has("ShiftLeft") || k.has("ShiftRight") || k.has("KeyQ") ? 1 : 0);
      if (f || s || v) c.orbit = false;
      if (f || s || v) c.tween = null;
      const speed = 9 + Math.max(0, camera.position.y) * 0.6;
      tmp.fwd.set(-Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), -Math.cos(c.yaw) * Math.cos(c.pitch));
      tmp.right.set(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
      tmp.want.set(0, 0, 0).addScaledVector(tmp.fwd, f).addScaledVector(tmp.right, s);
      tmp.want.y += v;
      if (tmp.want.lengthSq() > 1) tmp.want.normalize();
      tmp.want.multiplyScalar(speed);
      c.vel.lerp(tmp.want, 1 - Math.exp(-dt * 7));
      camera.position.addScaledVector(c.vel, dt);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.6, span * 2);
      const lim = span * 2.5;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -lim, lim);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -lim, lim);
    }

    camera.rotation.order = "YXZ";
    camera.rotation.set(c.pitch, c.yaw, 0);

    runtime.shake *= Math.exp(-4.5 * dt);
    if (runtime.shake > 0.002) {
      const a = runtime.shake * 0.45;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
      camera.rotation.z = (Math.random() - 0.5) * a * 0.02;
    }
    camera.updateMatrixWorld();

    let hit: number | null = null;
    if (c.intro < 0 && !c.orbit && (st.locked || c.mouseInside)) {
      raycaster.current.setFromCamera(st.locked ? tmp.center : c.mouse, camera);
      raycaster.current.far = span * 3;
      hit = runtime.pick(raycaster.current)?.node ?? null;
    }
    if (hit === null) {
      if (st.hover) st.set({ hover: null });
      c.lastHit = -1;
    } else {
      let climb = st.climb;
      if (hit !== c.lastHit) {
        const prevTarget = st.hover?.node;
        const keep = prevTarget !== undefined && hit >= prevTarget && hit < runtime.doc.nodes[prevTarget].end;
        if (!keep) climb = 0;
        else climb = runtime.doc.nodes[hit].level - runtime.doc.nodes[prevTarget].level;
        c.lastHit = hit;
      }
      const target = runtime.ancestor(hit, climb);
      if (!st.hover || st.hover.node !== target || st.hover.hit !== hit || climb !== st.climb) st.set({ hover: { node: target, hit }, climb });
    }

    const quiet = runtime.clock < c.quietUntil;
    const danger = st.mode === "destroy" && st.hover && !quiet ? st.hover.node : null;
    const key = `${st.selected}|${danger}|${st.aliveVersion}`;
    if (key !== c.painted) {
      runtime.setHighlights(st.selected, danger);
      c.painted = key;
    }
  });

  return null;
}
