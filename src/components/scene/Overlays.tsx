"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CityRuntime } from "@/components/experience/runtime";
import { useSkyline } from "@/components/experience/store";
import { ROLE_LABEL } from "@/components/hud/format";

export function HoverOutline({ runtime }: { runtime: CityRuntime }) {
  const hover = useSkyline((s) => s.hover);
  const mode = useSkyline((s) => s.mode);
  const selected = useSkyline((s) => s.selected);

  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  const hoverMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9, depthTest: false }), []);
  const selMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.75, depthTest: false }), []);
  const hoverRef = useRef<THREE.LineSegments>(null);

  useEffect(() => {
    hoverMat.color.set(mode === "destroy" ? "#e2412b" : "#1d1b18");
    const c = runtime.city.palette.accent;
    selMat.color.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
  }, [mode, hoverMat, selMat, runtime]);

  useFrame(({ clock }) => {
    if (hoverRef.current) hoverMat.opacity = mode === "destroy" ? 0.65 + 0.35 * Math.sin(clock.elapsedTime * 7) : 0.9;
  });

  const box = (node: number | null | undefined) => {
    if (node === null || node === undefined) return null;
    const b = runtime.city.bounds[node];
    if (!b || !Number.isFinite(b.min[0])) return null;
    const pad = 0.12;
    return {
      position: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] as const,
      scale: [b.max[0] - b.min[0] + pad, b.max[1] - b.min[1] + pad, b.max[2] - b.min[2] + pad] as const,
    };
  };
  const h = box(hover?.node);
  const s = selected !== null && selected !== hover?.node && runtime.alive[selected] ? box(selected) : null;

  return (
    <>
      {h && <lineSegments ref={hoverRef} geometry={geo} material={hoverMat} position={h.position} scale={h.scale} renderOrder={10} />}
      {s && <lineSegments geometry={geo} material={selMat} position={s.position} scale={s.scale} renderOrder={10} />}
    </>
  );
}

export function DistrictLabels({ runtime }: { runtime: CityRuntime }) {
  const [, force] = useState(0);
  useEffect(() => runtime.onChange(() => force((v) => v + 1)), [runtime]);
  const introDone = useSkyline((s) => s.introDone);
  const hidden = useSkyline((s) => s.hudHidden);
  const nodes = runtime.doc.nodes;

  const labels = useMemo(() => {
    const out: Array<{ id: number; text: string; sub: string; pos: [number, number, number] }> = [];
    const span = Math.max(runtime.city.size.w, runtime.city.size.d);
    for (const id of runtime.city.districts) {
      const n = nodes[id];
      const b = runtime.city.bounds[id];
      if (!b || !Number.isFinite(b.min[0])) continue;
      if ((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]) < span * span * 0.035) continue;
      const pos: [number, number, number] = [b.min[0] + 0.4, runtime.city.anchor[id][1] + 0.2, b.max[2] - 0.6];
      if (out.some((o) => Math.hypot(o.pos[0] - pos[0], o.pos[2] - pos[2]) < span * 0.16)) continue;
      const name = n.role === "container" ? "district" : (ROLE_LABEL[n.role] ?? n.role);
      out.push({ id, text: name, sub: `${n.selector} · ${n.descendants.toLocaleString("en")} nodes`, pos });
    }
    return out.slice(0, 7);
  }, [nodes, runtime]);

  if (!introDone || hidden) return null;
  return (
    <>
      {labels
        .filter((l) => runtime.alive[l.id])
        .map((l) => (
          <Html key={l.id} position={l.pos} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
            <div className="district-label">
              <span>{l.text}</span>
              <em>{l.sub}</em>
            </div>
          </Html>
        ))}
    </>
  );
}
