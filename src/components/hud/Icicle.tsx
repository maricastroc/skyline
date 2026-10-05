"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CityRuntime } from "@/components/experience/runtime";
import { useSkyline } from "@/components/experience/store";

export function Icicle({ runtime, height = 132 }: { runtime: CityRuntime; height?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const selected = useSkyline((s) => s.selected);
  const hover = useSkyline((s) => s.hover?.node ?? null);
  const version = useSkyline((s) => s.aliveVersion);
  const nodes = runtime.doc.nodes;

  const layout = useMemo(() => {
    const x0 = new Float32Array(nodes.length);
    const x1 = new Float32Array(nodes.length);
    let maxLevel = 0;
    x0[0] = 0;
    x1[0] = 1;
    for (const n of nodes) {
      maxLevel = Math.max(maxLevel, n.level);
      let x = x0[n.id];
      const w = x1[n.id] - x0[n.id];
      const total = n.children.reduce((s, c) => s + nodes[c].weight, 0) + n.selfWeight * 0.15;
      for (const c of n.children) {
        const cw = (nodes[c].weight / total) * w;
        x0[c] = x;
        x1[c] = x + cw;
        x += cw;
      }
    }
    return { x0, x1, levels: Math.min(maxLevel + 1, 24) };
  }, [nodes]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth;
    const H = height;
    c.width = W * dpr;
    c.height = H * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, W, H);
    const rowH = H / layout.levels;
    const accent = getComputedStyle(c).getPropertyValue("--accent").trim() || "#b5532f";

    const path = new Set<number>();
    for (let p = selected ?? -1; p >= 0; p = nodes[p].parent) path.add(p);
    const inSel = (i: number) => selected !== null && i >= selected && i < nodes[selected].end;

    for (const n of nodes) {
      if (n.level >= layout.levels) continue;
      const x = layout.x0[n.id] * W;
      const w = (layout.x1[n.id] - layout.x0[n.id]) * W;
      if (w < 0.35) continue;
      const y = n.level * rowH;
      const alive = runtime.alive[n.id];
      let fill: string;
      if (!alive) fill = "rgba(226,65,43,0.18)";
      else if (inSel(n.id)) fill = accent;
      else if (path.has(n.id)) fill = "rgba(29,27,24,0.55)";
      else fill = `rgba(29,27,24,${0.1 + Math.min(0.22, n.level * 0.012)})`;
      g.fillStyle = fill;
      g.fillRect(x + 0.25, y + 0.5, Math.max(0.4, w - 0.5), rowH - 1);
    }
    if (hover !== null && nodes[hover]) {
      const n = nodes[hover];
      g.strokeStyle = "#1d1b18";
      g.lineWidth = 1;
      const x = layout.x0[n.id] * W;
      const w = (layout.x1[n.id] - layout.x0[n.id]) * W;
      g.strokeRect(x + 0.5, n.level * rowH + 0.5, Math.max(1, w - 1), rowH - 1);
    }
  }, [layout, nodes, runtime, selected, hover, version, height]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const level = Math.floor(((e.clientY - r.top) / r.height) * layout.levels);
    let best: number | null = null;
    for (const n of nodes) {
      if (n.level !== level) continue;
      if (fx >= layout.x0[n.id] && fx < layout.x1[n.id]) {
        best = n.id;
        break;
      }
    }
    useSkyline.getState().set({ selected: best });
  };

  return <canvas ref={canvas} className="icicle" style={{ height }} onClick={onClick} aria-label="DOM tree overview" />;
}
