"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { rgbToCss } from "@/lib/city/palette";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import { planConstruction } from "@/lib/pixelcity/construction";
import { explainNode, explainZone, zoneAt, zoneOfNode, type Explanation } from "@/lib/pixelcity/explain";
import type { CityFrame, PixelCity, Zone } from "@/lib/pixelcity/types";
import { generateVacantWorld } from "@/lib/pixelcity/vacant";
import type { ViewState } from "./PixelScene";
import { makePostcard } from "./postcard";
import { usePixelCity } from "./usePixelCity";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

/** Directions under comparison (round 5). Chosen with ?ui= &home= &cv= — none is “the” answer yet. */
export type UiType = "grotesk" | "editorial" | "bitmap";
export type HomeKind = "refined" | "vacant" | "blueprint";
export type CityViewKind = "meta" | "minimal" | "bare";
export interface Variants {
  ui: UiType;
  home: HomeKind;
  cv: CityViewKind;
}

const EXAMPLES: Array<[string, string]> = [
  ["Wikipedia", "https://en.wikipedia.org/wiki/Brutalist_architecture"],
  ["Hacker News", "https://news.ycombinator.com"],
  ["Linear", "https://linear.app"],
  ["The Guardian", "https://www.theguardian.com/international"],
];

/** City View framing approved in the framing round (world frame, fixed art scale). */
const CITY_VIEW: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };
const HOME_VIEW: Record<HomeKind, ViewState> = {
  refined: { azimuth: 45, zoom: 1.1, pan: [0, 0] },
  // The lot sits up and to the right of the question, which lives bottom-left.
  vacant: { azimuth: 45, zoom: 1.1, pan: [-3, 6] },
  // The plot sits below the drafting label at the top.
  blueprint: { azimuth: 45, zoom: 0.8, pan: [-4, -4] },
};

type Mode = "city" | "explore";
type Subject = { zone: Zone } | { node: number };

function hostOf(u: string) {
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}
function addressOf(u: string) {
  try {
    const x = new URL(/^https?:/.test(u) ? u : `https://${u}`);
    const path = x.pathname === "/" ? "" : decodeURIComponent(x.pathname);
    return x.hostname.replace(/^www\./, "") + path;
  } catch {
    return u;
  }
}

function findZone(city: PixelCity, at: string): Zone | null {
  const q = at.toLowerCase();
  const R = city.semantics.regions;
  return (
    city.zones.find((z) => z.region >= 0 && R[z.region].kind === q) ??
    city.zones.find((z) => z.role === q) ??
    city.zones.find((z) => z.title?.toLowerCase().includes(q)) ??
    null
  );
}

export function PixelApp({
  initialUrl,
  initialAt = null,
  frame = "world",
  vacantFp,
  variants,
}: {
  initialUrl: string | null;
  initialAt?: string | null;
  frame?: CityFrame;
  vacantFp: SiteFingerprint;
  variants: Variants;
}) {
  const { ui, home, cv } = variants;
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [draft, setDraft] = useState(initialUrl ?? "");
  const { city: fetched, doc: fetchedDoc, error, loading } = usePixelCity(url, frame);
  const city = url && fetched && !loading ? fetched : null;
  const doc = city ? fetchedDoc : null;

  const vacant = useMemo(() => generateVacantWorld(vacantFp, home === "blueprint" ? "blueprint" : "lot"), [vacantFp, home]);
  const plan = useMemo(() => (city ? planConstruction(city, doc) : null), [city, doc]);
  // Construction clock = the scene's build time for this city (so captions match what's on screen).
  const [elapsed, setElapsed] = useState(0);
  const [clockOf, setClockOf] = useState(city);
  if (clockOf !== city) {
    setClockOf(city);
    setElapsed(0);
  }
  const tick = useRef({ last: -1, done: Infinity });
  useEffect(() => {
    tick.current = { last: -1, done: plan?.done ?? Infinity };
  }, [plan]);
  const onBuildTime = useCallback((t: number) => {
    const k = tick.current;
    if (k.last > k.done) return; // finished: stop re-rendering
    if (t - k.last > 0.066 || t < k.last) {
      k.last = t;
      setElapsed(t);
    }
  }, []);
  const building = !!url && !error && (!city || !plan || elapsed < plan.done);
  const built = !!city && !building;

  const go = useCallback((u: string) => {
    setUrl(u);
    setDraft(u);
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set("url", u);
      sp.delete("at");
      window.history.replaceState(null, "", `/pixel?${sp.toString()}`);
    } catch {}
  }, []);

  // ── City View / Explore state ──
  const [mode, setMode] = useState<Mode>("city");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [hoverZone, setHoverZone] = useState<Zone | null>(null);
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyHover, setWhyHover] = useState<number | null>(null);
  const [hudHidden, setHudHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [atUsed, setAtUsed] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const live = useRef({ mode, hoverZone, subject, built });
  useEffect(() => {
    live.current = { mode, hoverZone, subject, built };
  });

  const enter = useCallback(
    (zone: Zone | null) => {
      if (!city) return;
      setFocus(zone ? [zone.x + zone.w / 2, zone.z + zone.d / 2] : city.entrance);
      setSubject(zone && zone.nodes[0] >= 0 ? { zone } : null);
      setMode("explore");
      setWhyOpen(false);
    },
    [city],
  );
  const backToCity = useCallback(() => {
    setMode("city");
    setSubject(null);
  }, []);
  const leave = useCallback(() => {
    setMode("city");
    setSubject(null);
    setWhyOpen(false);
    setUrl(null);
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("url");
      sp.delete("at");
      const q = sp.toString();
      window.history.replaceState(null, "", q ? `/pixel?${q}` : "/pixel");
    } catch {}
  }, []);

  // Deep link (?at=…): once built, fly into that district with its inspector open.
  if (built && initialAt && !atUsed && url === initialUrl && city) {
    setAtUsed(true);
    const z = findZone(city, initialAt);
    if (z) {
      setFocus([z.x + z.w / 2, z.z + z.d / 2]);
      setSubject(z.nodes[0] >= 0 ? { zone: z } : null);
      setMode("explore");
    }
  }

  const onHover = useCallback(
    (node: number | null, point: [number, number] | null) => {
      if (!city) return;
      setHoverNode(node);
      const z = (node !== null ? zoneOfNode(city, node) : null) ?? (point ? zoneAt(city, point[0], point[1]) : null);
      setHoverZone((prev) => (prev === z ? prev : z));
    },
    [city],
  );
  const onPick = useCallback(
    (node: number | null) => {
      if (!city) return;
      const { mode, hoverZone } = live.current;
      if (mode === "city") {
        const z = hoverZone ?? (node !== null ? zoneOfNode(city, node) : null);
        if (z) enter(z);
        return;
      }
      setSubject(node !== null ? { node } : null);
    },
    [city, enter],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!live.current.built) return;
      if (e.code === "KeyH") setHudHidden((v) => !v);
      if (e.code === "Enter" && live.current.mode === "city") enter(null);
      if (e.code === "KeyC") {
        if (live.current.mode === "city") enter(null);
        else backToCity();
      }
      if (e.code === "Escape") {
        if (live.current.mode === "city") setWhyOpen(false);
        else if (live.current.subject) setSubject(null);
        else backToCity();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, backToCity]);

  const explanation: Explanation | null = useMemo(() => {
    if (!subject || !city || !doc) return null;
    return "zone" in subject ? explainZone(city, doc, subject.zone) : explainNode(city, doc, subject.node);
  }, [subject, city, doc]);

  // What lights up.
  let highlight: [number, number] | null = null;
  let soft: [number, number] | null = null;
  if (city && doc && built) {
    const nodes = doc.nodes;
    const rangeOf = (n: number): [number, number] => [n, nodes[n].end];
    if (mode === "city") {
      const inf = whyHover !== null ? city.influences[whyHover] : null;
      if (inf && inf.region >= 0) highlight = rangeOf(city.semantics.regions[inf.region].node);
      else if (hoverZone && hoverZone.nodes[0] >= 0) highlight = hoverZone.nodes;
    } else {
      if (explanation) soft = explanation.range;
      if (subject && "node" in subject) {
        highlight = rangeOf(subject.node);
        const r = city.semantics.regionOf[subject.node];
        if (r >= 0) soft = rangeOf(city.semantics.regions[r].node);
      }
      if (hoverNode !== null) highlight = rangeOf(hoverNode);
    }
  }

  // Hover chip follows the cursor without re-rendering the scene.
  const cursor = useRef({ x: 0, y: 0 });
  const placeChip = useCallback(() => {
    const el = chip.current;
    if (!el) return;
    const { x, y } = cursor.current;
    const flip = x + 14 + el.offsetWidth > window.innerWidth - 8;
    el.style.transform = `translate(${flip ? x - 10 - el.offsetWidth : x + 14}px, ${y + 16}px)`;
  }, []);
  const hoverText = (() => {
    if (!city || !doc || !built) return null;
    if (mode === "city") {
      if (!hoverZone) return null;
      const e = explainZone(city, doc, hoverZone);
      return e ? { k: e.kicker, t: e.title ?? e.kind } : null;
    }
    if (hoverNode === null) return null;
    const n = doc.nodes[hoverNode];
    const b = city.buildings.find((x) => x.node === hoverNode);
    const t = n.label ?? b?.label ?? n.snippet ?? n.selector;
    return { k: n.tag, t: t.length > 40 ? `${t.slice(0, 39)}…` : t };
  })();
  const chipKey = hoverText ? `${hoverText.k}|${hoverText.t}` : "";
  useLayoutEffect(placeChip, [chipKey, placeChip]);

  const finalUrl = city ? (doc?.source.finalUrl ?? url ?? "") : (url ?? "");
  const host = url ? hostOf(finalUrl) : "";
  const address = url ? addressOf(finalUrl) : "";
  const name = city?.siteName || doc?.document.title?.split(/\s[|–—-]\s/)[0] || host;
  const accent = rgbToCss((city ?? vacant).palette.accents[0]);

  const savePostcard = async () => {
    if (!canvas.current || saving || !root.current) return;
    setSaving(true);
    try {
      const cs = getComputedStyle(root.current);
      const blob = await makePostcard(canvas.current, {
        name,
        host: address,
        accent,
        display: cs.getPropertyValue("--sk-display"),
        mono: cs.getPropertyValue("--sk-mono"),
        displayWeight: cs.getPropertyValue("--sk-display-weight").trim() || "600",
        upper: cs.getPropertyValue("--sk-display-case").trim() === "uppercase",
      });
      if (blob) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `skyline-${host.replace(/[^a-z0-9.-]/gi, "_")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const phase: "home" | "building" | "city" | "explore" = !url || error ? "home" : building ? "building" : mode === "explore" ? "explore" : "city";
  const stage = plan ? [...plan.stages].reverse().find((s) => s.at <= elapsed && s.key !== "done") : null;
  const stageIndex = plan && stage ? plan.stages.indexOf(stage) + 1 : 0;
  const districts = city ? city.zones.filter((z) => z.role === "district").length : 0;

  const field = (
    <form
      className="sk-field"
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) go(draft.trim());
      }}
    >
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://" spellCheck={false} autoComplete="off" aria-label="Website address" />
      <button className="sk-primary" type="submit">
        Build <span className="arrow">→</span>
      </button>
    </form>
  );
  const examples = (
    <div className="sk-try">
      <span>or try</span>
      {EXAMPLES.map(([label, u]) => (
        <button key={u} type="button" onClick={() => go(u)}>
          {label}
        </button>
      ))}
    </div>
  );
  const errorLine = error && (
    <div className="sk-error">
      {error.title} — {error.detail}
    </div>
  );

  return (
    <div
      ref={root}
      className="sk"
      data-ui={ui}
      data-phase={phase}
      data-time={(city ?? vacant).palette.time}
      style={{ "--sk-accent": accent } as React.CSSProperties}
      onPointerMove={(e) => {
        cursor.current = { x: e.clientX, y: e.clientY };
        placeChip();
      }}
    >
      <PixelScene
        city={city ?? vacant}
        plan={plan}
        onBuildTime={onBuildTime}
        view={phase === "home" ? HOME_VIEW[home] : CITY_VIEW}
        mode={mode}
        focus={focus}
        lift={frame === "island" ? 0.03 : 0}
        interactive={phase === "city" || phase === "explore"}
        highlight={highlight}
        soft={soft}
        spotlight={mode === "city"}
        onHover={onHover}
        onPick={onPick}
        onCanvas={(c) => (canvas.current = c)}
      />

      {/* ── home ── */}
      {home === "refined" && (
        <div className="sk-page" data-on={phase === "home" ? "1" : "0"}>
          <div className="sk-page-inner">
            <h1 className="sk-mark sk-display">Skyline</h1>
            <p className="sk-lede">Any website, rebuilt as a city you can walk into.</p>
            {field}
            {examples}
            {errorLine}
          </div>
        </div>
      )}
      {home === "vacant" && (
        <div className="sk-layer" data-on={phase === "home" ? "1" : "0"}>
          <div className="sk-top">
            <span className="sk-wordmark">
              <i /> Skyline
            </span>
          </div>
          <div className="sk-scrim" data-strength="soft" />
          <div className="sk-ask">
            <h1 className="sk-q sk-display">What should we build here?</h1>
            {field}
            {examples}
            {errorLine}
          </div>
        </div>
      )}
      {home === "blueprint" && (
        <div className="sk-layer" data-on={phase === "home" ? "1" : "0"}>
          <div className="sk-top">
            <span className="sk-wordmark">
              <i /> Skyline
            </span>
          </div>
          <div className="sk-plot">
            <div className="sk-label">Plot 1 · unassigned</div>
            <h1 className="sk-q sk-display">Give this plot an address.</h1>
            {field}
            {examples}
            {errorLine}
          </div>
        </div>
      )}

      {/* ── construction ── */}
      <div className="sk-layer" data-on={phase === "building" ? "1" : "0"}>
        <div className="sk-scrim" data-strength="soft" />
        <div className="sk-build">
          <div className="sk-hostname sk-display">{host}</div>
          <div className="sk-step" aria-live="polite">
            <span className="dot" />
            {stage && plan ? (
              <>
                <span className="n">
                  {stageIndex}/{plan.stages.length - 1}
                </span>
                <span key={stage.key} className="label">
                  {stage.label}
                </span>
                {stage.detail && <span className="detail">“{stage.detail}”</span>}
              </>
            ) : (
              <span className="label">Surveying {host}…</span>
            )}
          </div>
        </div>
      </div>

      {/* ── City View ── */}
      {city && (
        <div className="sk-layer" data-on={!hudHidden && phase === "city" ? "1" : "0"}>
          {cv === "meta" && <div className="sk-scrim" />}
          {cv === "minimal" && <div className="sk-scrim" data-strength="soft" />}
          <div className="sk-top">
            <button className="sk-wordmark" onClick={leave} title="Build another site">
              <i /> Skyline
            </button>
            <div className="sk-pill">
              <button className={`sk-quiet${cv === "meta" ? "" : " sk-icon"}`} aria-pressed={whyOpen} onClick={() => setWhyOpen((v) => !v)} title="Why this city?">
                <IconWhy />
                {cv === "meta" && "Why this city?"}
              </button>
              {cv !== "bare" && (
                <button className={`sk-quiet${cv === "meta" ? "" : " sk-icon"}`} onClick={savePostcard} disabled={saving} title="Save postcard">
                  <IconSave />
                  {cv === "meta" && (saving ? "Saving…" : "Postcard")}
                </button>
              )}
            </div>
          </div>
          {whyOpen && (
            <div className="sk-why">
              <h4 className="sk-label">Why this city</h4>
              <ol>
                {city.influences.slice(0, 5).map((f, i) => (
                  <li
                    key={i}
                    data-go={f.region >= 0 ? "1" : "0"}
                    onMouseEnter={() => setWhyHover(i)}
                    onMouseLeave={() => setWhyHover(null)}
                    onClick={() => {
                      const z = f.region >= 0 ? city.zones.find((z) => z.region === f.region) : undefined;
                      if (z) enter(z);
                    }}
                  >
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="what">{f.what}</span>
                    <span className="eff">{f.effect}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {cv === "meta" && (
            <div className="sk-identity" data-cv="meta">
              <h1 className="sk-name sk-display">{name}</h1>
              <div className="sk-host">{address}</div>
              <div className="sk-meta">
                <b>{city.buildings.length}</b> structures · <b>{districts}</b> districts
                {city.images.length > 0 && (
                  <>
                    {" "}
                    · <b>{city.images.length}</b> real images
                  </>
                )}{" "}
                · {city.palette.time === "golden" ? "golden hour" : city.palette.time}
              </div>
              <button className="sk-primary" onClick={() => enter(null)}>
                Enter city <span className="arrow">→</span>
              </button>
            </div>
          )}
          {cv === "minimal" && (
            <div className="sk-identity" data-cv="minimal">
              <div className="sk-hostname sk-display">{host}</div>
              <button className="sk-primary" onClick={() => enter(null)}>
                Enter <span className="arrow">→</span>
              </button>
            </div>
          )}
          {cv === "bare" && (
            <div className="sk-bare">
              <span>{host}</span>
              <button className="sk-primary" onClick={() => enter(null)}>
                Enter <span className="arrow">↵</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Explore ── */}
      {!hudHidden && phase === "explore" && city && (
        <div className="sk-layer sk-late" data-on="1">
          <div className="sk-top">
            <div className="sk-pill">
              <button className="sk-quiet sk-back" onClick={backToCity}>
                <IconBack /> City
              </button>
              <span className="sk-quiet sk-mono" style={{ cursor: "default" }}>
                {host}
              </span>
            </div>
          </div>
          {explanation && <Inspector e={explanation} onClose={() => setSubject(null)} />}
          <div className="sk-hint">drag to move · scroll to zoom · Q/E rotate · click to inspect · esc back</div>
        </div>
      )}

      <div ref={chip} className="sk-hover" hidden={hudHidden || !hoverText || whyHover !== null}>
        {hoverText && (
          <>
            <span className="k">{hoverText.k}</span>
            {hoverText.t}
          </>
        )}
      </div>
    </div>
  );
}

function Inspector({ e, onClose }: { e: Explanation; onClose: () => void }) {
  const depthOf = (i: number) => (e.path[i].leaf ? e.path.filter((p) => !p.leaf).length : i);
  return (
    <aside className="sk-inspect">
      <header>
        <span className="k sk-label">{e.kicker}</span>
        <span className="kind sk-label">{e.kind}</span>
        <button onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className="sel">{e.selector}</div>
      {e.title && <div className="quote">“{e.title}”</div>}
      <div className="meta">
        depth {e.depth} · {e.descendants.toLocaleString("en")} descendants
      </div>
      <div className="tree">
        {e.path.map((p, i) => (
          <div key={i} className={`row${p.here ? " here" : ""}${p.leaf ? " leaf" : ""}${i === 0 ? " root" : ""}`} style={{ marginLeft: depthOf(i) * 14 }}>
            <span>{p.label}</span>
          </div>
        ))}
      </div>
      {(e.why.length > 0 || e.effect) && (
        <div className="why">
          {e.why.map((w) => (
            <div key={w} className="ev">
              {w}
            </div>
          ))}
          {e.effect && <div className="eff">{e.effect}</div>}
        </div>
      )}
    </aside>
  );
}

const IconWhy = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4" strokeLinecap="round" />
    <circle cx="8" cy="11.6" r=".6" fill="currentColor" stroke="none" />
  </svg>
);
const IconSave = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M8 2.5v7.5M4.8 7l3.2 3.2L11.2 7M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBack = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M9.5 3.5 5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
