"use client";

import { useEffect, useState } from "react";
import type { CityRuntime } from "@/components/experience/runtime";
import { useSkyline } from "@/components/experience/store";
import { NodeFlag, type NNode } from "@/lib/model/types";
import { fmt, pct, ROLE_LABEL } from "./format";
import { Icicle } from "./Icicle";

export function Hud({ runtime, onExit }: { runtime: CityRuntime; onExit: () => void }) {
  const hidden = useSkyline((s) => s.hudHidden);
  const introDone = useSkyline((s) => s.introDone);
  return (
    <div
      className={`hud ${hidden ? "hud--hidden" : ""} ${introDone ? "hud--ready" : ""}`}
      style={{ "--accent": runtime.city.palette.css.accent } as React.CSSProperties}
    >
      <Survey runtime={runtime} onExit={onExit} />
      <TopRight runtime={runtime} />
      <Center runtime={runtime} />
      <Inspector runtime={runtime} />
      <Legend />
      <Notes runtime={runtime} />
      <DemolitionLog runtime={runtime} />
    </div>
  );
}

function Survey({ runtime, onExit }: { runtime: CityRuntime; onExit: () => void }) {
  const doc = runtime.doc;
  let host = "";
  let path = "";
  try {
    const u = new URL(doc.source.finalUrl);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname === "/" ? "" : u.pathname;
  } catch {}
  if (doc.source.strategy === "sample") {
    host = "lumen.sample";
    path = "/offline-fixture";
  }
  const rows: Array<[string, string]> = [
    [fmt(doc.stats.elements), "nodes"],
    [fmt(doc.stats.maxDomDepth), "DOM depth"],
    [fmt(doc.stats.images), "images"],
    [fmt(doc.stats.links), "links"],
    [fmt(runtime.city.districts.length), "districts"],
  ];
  return (
    <section className="panel survey">
      <button className="brand" onClick={onExit} title="New city">
        <span className="brand-mark" aria-hidden /> Skyline <span className="brand-sub">DOM survey</span>
      </button>
      <h1 className="host" title={doc.document.title}>
        {host}
      </h1>
      {path && <div className="path">{path.length > 48 ? `${path.slice(0, 47)}…` : path}</div>}
      <table className="survey-table">
        <tbody>
          {rows.map(([v, k]) => (
            <tr key={k}>
              <td className="num">{v}</td>
              <td>{k}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TopRight({ runtime }: { runtime: CityRuntime }) {
  const mode = useSkyline((s) => s.mode);
  const setMode = useSkyline((s) => s.setMode);
  const integrity = useSkyline((s) => s.integrity);
  const ticks = 28;
  const on = Math.round(integrity * ticks);
  void runtime;
  return (
    <section className="panel topright">
      <div className="modes" role="tablist" aria-label="Mode">
        <button role="tab" aria-selected={mode === "explore"} className={mode === "explore" ? "on" : ""} onClick={() => setMode("explore")}>
          Explore <kbd>1</kbd>
        </button>
        <button role="tab" aria-selected={mode === "destroy"} className={mode === "destroy" ? "on danger" : ""} onClick={() => setMode("destroy")}>
          Destroy <kbd>2</kbd>
        </button>
      </div>
      <div className={`integrity ${integrity < 0.5 ? "low" : ""}`} aria-label={`DOM integrity ${pct(integrity)}`}>
        <span className="label">DOM integrity</span>
        <span className="ticks" aria-hidden>
          {Array.from({ length: ticks }, (_, i) => (
            <i key={i} className={i < on ? "on" : ""} />
          ))}
        </span>
        <span className="value num">{pct(integrity, integrity < 1 && integrity > 0.995 ? 1 : 0)}</span>
      </div>
    </section>
  );
}

function metricsOf(n: NNode) {
  return [
    ["depth", fmt(n.domDepth)],
    ["chars", fmt(n.chars)],
    ["links", fmt(n.links)],
    ["children", fmt(n.childCount)],
  ] as const;
}

function Center({ runtime }: { runtime: CityRuntime }) {
  const locked = useSkyline((s) => s.locked);
  const hover = useSkyline((s) => s.hover);
  const mode = useSkyline((s) => s.mode);
  const climb = useSkyline((s) => s.climb);
  const introDone = useSkyline((s) => s.introDone);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const n = hover ? runtime.doc.nodes[hover.node] : null;
  const hit = hover ? runtime.doc.nodes[hover.hit] : null;
  const parent = n && n.parent >= 0 ? runtime.doc.nodes[n.parent] : null;
  const style = locked || !pos ? undefined : { left: pos.x + 18, top: pos.y + 18 };

  return (
    <>
      {locked && <div className={`crosshair ${mode === "destroy" ? "danger" : ""}`} aria-hidden />}
      {!locked && introDone && !hover && (
        <div className="fly-prompt">
          <strong>Click to fly</strong>
          <span>or drag to look around · hover anything to inspect it</span>
        </div>
      )}
      {n && (
        <div className={`hovercard ${locked ? "hovercard--locked" : ""} ${mode === "destroy" ? "danger" : ""}`} style={style}>
          <div className="sel">{n.selector}</div>
          {n.label && n.role !== "root" && <div className="lbl">“{n.label.length > 60 ? `${n.label.slice(0, 59)}…` : n.label}”</div>}
          <dl>
            {metricsOf(n).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
          </dl>
          {mode === "destroy" && (
            <div className="blast">
              collapses <b className="num">{fmt(n.end - n.id)}</b> {n.end - n.id === 1 ? "node" : "nodes"} ·{" "}
              <b className="num">−{pct(n.weight / runtime.totalWeight, 1)}</b>
            </div>
          )}
          <div className="climb">
            {parent ? (
              <>
                <kbd>scroll ↑</kbd> {parent.selector}
              </>
            ) : (
              <span>root of the document</span>
            )}
            {climb > 0 && hit && (
              <>
                {" "}
                · <kbd>↓</kbd> back to {hit.selector}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Inspector({ runtime }: { runtime: CityRuntime }) {
  const selected = useSkyline((s) => s.selected);
  const mode = useSkyline((s) => s.mode);
  const set = useSkyline((s) => s.set);
  useSkyline((s) => s.aliveVersion);
  const nodes = runtime.doc.nodes;
  if (selected === null || !nodes[selected]) {
    return (
      <aside className="panel inspector inspector--idle">
        <div className="eyebrow">DOM tree</div>
        <Icicle runtime={runtime} height={96} />
        <p className="idle-hint">Click a building to inspect it, or pick a node in the tree.</p>
      </aside>
    );
  }
  const n = nodes[selected];
  const crumbs: NNode[] = [];
  for (let p = n.parent; p >= 0; p = nodes[p].parent) crumbs.unshift(nodes[p]);
  const alive = runtime.alive[n.id];
  const flags = [
    n.flags & NodeFlag.FIXED ? "position: fixed" : null,
    n.flags & NodeFlag.STICKY ? "position: sticky" : null,
    n.wrappers ? `${n.wrappers} wrapper${n.wrappers > 1 ? "s" : ""} folded` : null,
    n.absorbed ? `${fmt(n.absorbed)} inline absorbed` : null,
  ].filter(Boolean);

  const metrics: Array<[string, string]> = [
    ["DOM depth", fmt(n.domDepth)],
    ["city level", fmt(n.level)],
    ["characters", fmt(n.chars)],
    ["links", fmt(n.links)],
    ["images", fmt(n.images)],
    ["children", fmt(n.childCount)],
    ["descendants", fmt(n.descendants)],
    ["weight", pct(n.weight / runtime.totalWeight, 1)],
  ];

  return (
    <aside className={`panel inspector ${alive ? "" : "inspector--gone"}`}>
      <div className="eyebrow">
        {ROLE_LABEL[n.role] ?? n.role} · &lt;{n.tag}&gt;
        <button className="close" onClick={() => set({ selected: null })} aria-label="Clear selection">
          ×
        </button>
      </div>
      <h2 className="insp-sel">{n.selector}</h2>
      {n.label && <p className="insp-label">“{n.label}”</p>}
      <nav className="crumbs" aria-label="Ancestors">
        {crumbs.slice(-5).map((c) => (
          <button key={c.id} onClick={() => set({ selected: c.id })}>
            {c.selector.length > 22 ? `${c.selector.slice(0, 21)}…` : c.selector}
          </button>
        ))}
      </nav>
      <dl className="insp-grid">
        {metrics.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
      {flags.length > 0 && <div className="insp-flags">{flags.join(" · ")}</div>}
      <div className="eyebrow eyebrow--tree">Position in the tree</div>
      <Icicle runtime={runtime} />
      <div className="insp-actions">
        <button onClick={() => set({ focus: { node: n.id, at: performance.now() } })}>
          Focus <kbd>F</kbd>
        </button>
        {n.parent >= 0 && <button onClick={() => set({ selected: n.parent })}>Parent</button>}
        {mode === "destroy" && alive ? (
          <button
            className="danger"
            onClick={() => (window as unknown as { __skyline?: { destroy: (n: number) => void } }).__skyline?.destroy(n.id)}
          >
            Demolish subtree
          </button>
        ) : null}
        {!alive && <span className="gone">demolished</span>}
      </div>
    </aside>
  );
}

function Legend() {
  const mode = useSkyline((s) => s.mode);
  const keys: Array<[string, string]> = [
    ["Click", mode === "destroy" ? "fly · demolish" : "fly · inspect"],
    ["WASD", "move"],
    ["Mouse", "look"],
    ["Space / Shift", "up / down"],
    ["Scroll", "target parent"],
    ["1 · 2", "mode"],
    ["Esc", "release cursor"],
    ["O", "orbit"],
    ["R", "rebuild"],
    ["H", "hide HUD"],
  ];
  return (
    <section className="panel legend" aria-label="Controls">
      {keys.map(([k, v]) => (
        <span key={k}>
          <kbd>{k}</kbd> {v}
        </span>
      ))}
    </section>
  );
}

function Notes({ runtime }: { runtime: CityRuntime }) {
  const meta = useSkyline((s) => s.meta);
  const doc = runtime.doc;
  const strategy = doc.source.strategy === "static" ? "static capture" : doc.source.strategy === "rendered" ? "rendered capture" : "offline sample";
  return (
    <section className="panel notes">
      {doc.warnings.map((w) => (
        <p key={w.code} className={`warn warn--${w.code}`}>
          {w.message}
        </p>
      ))}
      <p className="meta">
        {strategy} · {fmt(doc.source.bytes / 1024)} KB · {fmt(doc.nodes.length)} of {fmt(doc.stats.elements)} elements built
        {meta ? ` · ${fmt(meta.acquireMs + meta.normalizeMs + meta.generateMs)} ms` : ""}
      </p>
      <p className="meta palette">
        {runtime.city.palette.source.length ? "palette from site" : "default palette"}
        {[runtime.city.palette.css.accent, runtime.city.palette.css.accent2].map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
      </p>
    </section>
  );
}

function DemolitionLog({ runtime }: { runtime: CityRuntime }) {
  const log = useSkyline((s) => s.demolitions);
  if (!log.length) return null;
  return (
    <section className="demolog" aria-live="polite">
      {log.map((e, i) => (
        <div key={e.at} style={{ opacity: 1 - i * 0.22 }}>
          <b className="num">−{pct(e.percent, 1)}</b> {runtime.doc.nodes[e.node].selector} <em>· {fmt(e.nodes)} nodes</em>
        </div>
      ))}
    </section>
  );
}
