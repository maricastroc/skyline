"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { rgbToCss } from "@/lib/city/palette";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import { blockName, compWords, type KitCity } from "@/lib/pixelcity/kit-city";
import { SIDEWALK_H } from "@/lib/pixelcity/kit/street";
import type { PMBlock } from "@/lib/pixelcity/page-map";
import { generateVacantWorld } from "@/lib/pixelcity/vacant";
import { PageMap, type BlockState } from "./PageMap";
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
/** Construction: wider, so the district can grow from the centre out in view. */
const BUILD_ZOOM = 0.62;
/** A territory pointed at from the page: the camera comes to it, a little closer. */
const FOCUS_ZOOM = 0.72;

/** The page map: one element, laid out at MAP_W, moved and scaled between its places. */
const MAP_W = 360;
type MapPlace = "hidden" | "center" | "dock" | "thumb" | "drawer";

type Mode = "city" | "explore";

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
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** A territory's share of the page (the same weight that bought its land). */
const pageShare = (w: number) => (w < 0.01 ? "<1%" : `${Math.round(w * 100)}%`);

/** ?at=: the territory whose kind or name matches. */
function findTerritory(kit: KitCity, at: string): number | null {
  const q = at.toLowerCase();
  const withLand = kit.map.blocks.filter((b) => b.lots > 0);
  const b = withLand.find((b) => b.kind === q) ?? withLand.find((b) => blockName(b).toLowerCase().includes(q));
  return b ? b.t : null;
}

export function PixelApp({
  initialUrl,
  initialAt = null,
  vacantFp,
  variants,
}: {
  initialUrl: string | null;
  initialAt?: string | null;
  vacantFp: SiteFingerprint;
  variants: Variants;
}) {
  const { ui, home, cv } = variants;
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [draft, setDraft] = useState(initialUrl ?? "");
  const { kit: fetched, doc: fetchedDoc, error, loading } = usePixelCity(url);
  const kit = url && fetched && !loading ? fetched : null;
  const city = kit?.city ?? null;
  const doc = kit ? fetchedDoc : null;

  const vacant = useMemo(() => generateVacantWorld(vacantFp, home === "blueprint" ? "blueprint" : "lot"), [vacantFp, home]);
  const plan = kit?.build.plan ?? null;
  // Construction clock = the scene's build time for this city (so the page map follows what's on screen).
  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [clockOf, setClockOf] = useState(kit);
  if (clockOf !== kit) {
    setClockOf(kit);
    setElapsed(0);
    setSkipped(false);
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
  const building = !!url && !error && (!kit || !plan || elapsed < plan.done);
  const built = !!kit && !building;

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
  /** Territory under the cursor in the city, one pointed at on the page map, one picked in Explore. */
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [mapT, setMapT] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  /** The territory the camera went to from the page (it stays there until the drawer closes). */
  const [cameraT, setCameraT] = useState<number | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [atUsed, setAtUsed] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const camera = useRef<THREE.Camera | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const live = useRef({ mode, built, building, whyOpen, pinned });
  useEffect(() => {
    live.current = { mode, built, building, whyOpen, pinned };
  });

  const lotsOf = useCallback((t: number) => kit?.lots[t] ?? 0, [kit]);
  const blockOf = useCallback((t: number | null): PMBlock | null => (t === null || !kit ? null : (kit.map.blocks.find((b) => b.t === t) ?? null)), [kit]);

  const enter = useCallback(
    (t: number | null) => {
      if (!kit) return;
      const hero = kit.plan.hero >= 0 && kit.lots[kit.plan.hero] > 0 ? kit.plan.hero : null;
      const at = t ?? hero;
      setFocus(at !== null ? kit.geo[at].centre : [0, 0]);
      setPinned(t);
      setMode("explore");
      setWhyOpen(false);
    },
    [kit],
  );
  const backToCity = useCallback(() => {
    setMode("city");
    setPinned(null);
  }, []);
  const openWhy = useCallback((open: boolean) => {
    setWhyOpen(open);
    setMapT(null);
    if (!open) setCameraT(null);
  }, []);
  const leave = useCallback(() => {
    setMode("city");
    setPinned(null);
    setWhyOpen(false);
    setCameraT(null);
    setUrl(null);
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("url");
      sp.delete("at");
      const q = sp.toString();
      window.history.replaceState(null, "", q ? `/pixel?${q}` : "/pixel");
    } catch {}
  }, []);
  const skip = useCallback(() => setSkipped(true), []);

  // Deep link (?at=…): once built, fly into that territory with it picked.
  if (built && initialAt && !atUsed && url === initialUrl && kit) {
    setAtUsed(true);
    const t = findTerritory(kit, initialAt);
    if (t !== null) {
      setFocus(kit.geo[t].centre);
      setPinned(t);
      setMode("explore");
    }
  }

  const onHover = useCallback((node: number | null) => setHoverT((prev) => (prev === node ? prev : node)), []);
  const onPick = useCallback(
    (node: number | null) => {
      const { mode, built } = live.current;
      if (!built) return;
      if (mode === "city") {
        if (node !== null) enter(node);
        return;
      }
      setPinned(node);
    },
    [enter],
  );

  // A territory pointed at on the page: after a beat, the camera goes there (and stays).
  useEffect(() => {
    if (mapT === null) return;
    const id = setTimeout(() => setCameraT(mapT), 140);
    return () => clearTimeout(id);
  }, [mapT]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const L = live.current;
      if (L.building) {
        if (e.code === "Escape" || e.code === "Space" || e.code === "Enter") skip();
        return;
      }
      if (!L.built) return;
      if (e.code === "KeyH") setHudHidden((v) => !v);
      if (e.code === "Enter" && L.mode === "city") enter(null);
      if (e.code === "KeyC") {
        if (L.mode === "city") enter(null);
        else backToCity();
      }
      if (e.code === "Escape") {
        if (L.mode === "city") openWhy(false);
        else if (L.pinned !== null) setPinned(null);
        else backToCity();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter, backToCity, openWhy, skip]);

  // ── viewport ──
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const u = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  // ── construction steps ──
  const groups = kit?.build.groups ?? [];
  let gi = -1;
  if (kit && building) for (let i = 0; i < groups.length; i++) if (groups[i].at <= elapsed) gi = i;
  const group = gi >= 0 ? groups[gi] : null;
  const reading = !!kit && building && gi < 0;

  const phase: "home" | "building" | "city" | "explore" = !url || error ? "home" : building ? "building" : mode === "explore" ? "explore" : "city";
  const drawerOpen = phase === "city" && whyOpen;

  // ── the page map's place ──
  const mapH = Math.max(320, vp.h - 180);
  const dockScale = Math.min(0.78, (vp.w * 0.3) / MAP_W);
  const thumbScale = 0.2;
  const drawerW = Math.min(MAP_W + 40, vp.w - 32);
  const drawerScale = Math.min(1, (vp.h - 166) / mapH, (drawerW - 40) / MAP_W);
  const place: MapPlace = !kit || phase === "home" || phase === "explore" || hudHidden ? "hidden" : building ? (reading ? "center" : "dock") : drawerOpen ? "drawer" : "thumb";
  const placeOf: Record<Exclude<MapPlace, "hidden">, { x: number; y: number; s: number }> = {
    center: { x: Math.round(vp.w / 2 - MAP_W / 2), y: 90, s: 1 },
    dock: { x: 28, y: 76, s: dockScale },
    drawer: { x: Math.round(16 + (drawerW - MAP_W * drawerScale) / 2), y: 150, s: drawerScale },
    thumb: { x: 20, y: 66, s: thumbScale },
  };
  const at = placeOf[place === "hidden" ? "thumb" : place];
  const dockRight = 28 + MAP_W * dockScale;
  const drawerRight = 16 + drawerW;

  // ── what is linked: page block ↔ territory ──
  const linked = building ? null : phase === "city" ? (drawerOpen ? (mapT ?? hoverT) : hoverT) : (hoverT ?? pinned);
  let highlight: [number, number] | null = null;
  let soft: [number, number] | null = null;
  if (building && group) highlight = [group.first, group.last + 1];
  else if (linked !== null) highlight = [linked, linked + 1];
  if (phase === "explore" && pinned !== null && pinned !== linked) soft = [pinned, pinned + 1];
  // The group's largest territory carries the link during construction.
  const lead = group ? (() => {
    let best = group.first;
    for (let t = group.first; t <= group.last; t++) if (lotsOf(t) > lotsOf(best)) best = t;
    return best;
  })() : null;
  const anchorT = building ? lead : drawerOpen ? (mapT ?? hoverT) : null;

  // ── camera ──
  const panelRight = building ? dockRight : drawerOpen ? drawerRight : 0;
  const focusT = drawerOpen && cameraT !== null && kit?.geo[cameraT]?.lots.length ? cameraT : null;
  const zoom = building ? BUILD_ZOOM : focusT !== null ? FOCUS_ZOOM : CITY_VIEW.zoom;
  const base = Math.hypot(vp.w, vp.h) / 50;
  const dx = panelRight / 2 / (base * zoom);
  const dz = focusT !== null ? 2.5 : 0;
  const [fx, fz] = focusT !== null && kit ? kit.geo[focusT].centre : [0, 0];
  const px = Math.round((fx - 0.707 * dx - 0.707 * dz) * 4) / 4;
  const pz = Math.round((fz + 0.707 * dx - 0.707 * dz) * 4) / 4;
  const cityView = useMemo<ViewState>(() => (px === 0 && pz === 0 && zoom === CITY_VIEW.zoom ? CITY_VIEW : { azimuth: 45, zoom, pan: [px, pz] }), [px, pz, zoom]);

  // ── marks over the city: the territory's anchor, and the curve from its page block ──
  const stage = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [blockRect, setBlockRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    if (anchorT === null || !kit) return;
    let raf = 0;
    const g = kit.geo[anchorT];
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = camera.current;
      const cv = canvas.current;
      const st = stage.current;
      if (!cam || !cv || !st || !g?.lots.length) return;
      const v = new THREE.Vector3(g.centre[0], Math.max(SIDEWALK_H, g.top * 0.72), g.centre[1]).project(cam);
      const r = cv.getBoundingClientRect();
      const a = { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      setAnchor((o) => (o && Math.abs(o.x - a.x) < 0.5 && Math.abs(o.y - a.y) < 0.5 ? o : a));
      const el = st.querySelector<HTMLElement>(`.sk-pagemap [data-pm-t="${anchorT}"]`);
      if (el) {
        const b = el.getBoundingClientRect();
        const n = { x: b.left, y: b.top, w: b.width, h: b.height };
        setBlockRect((o) => (o && Math.abs(o.x - n.x) < 0.5 && Math.abs(o.y - n.y) < 0.5 && Math.abs(o.h - n.h) < 0.5 ? o : n));
      } else setBlockRect(null);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anchorT, kit]);

  // ── page map states ──
  const stateOf = useCallback(
    (t: number): BlockState => {
      if (building) {
        if (reading || !group) return "idle";
        if (t >= group.first && t <= group.last) return "active";
        if (t < group.first) return "read";
        return lotsOf(t) > 0 ? "unread" : "read";
      }
      if (!drawerOpen || linked === null) return "idle";
      return t === linked ? "active" : "dim";
    },
    [building, reading, group, drawerOpen, linked, lotsOf],
  );
  const tagOf = useCallback(
    (b: PMBlock) => {
      if (building && group && b.t >= group.first && b.t <= group.last && b.lots > 0) return `→ ${b.lots} lots`;
      if (drawerOpen && b.t === linked) return `→ ${b.lots} lots`;
      return null;
    },
    [building, group, drawerOpen, linked],
  );
  const onMapHover = useCallback((t: number | null) => setMapT(t), []);

  // Hover chip follows the cursor without re-rendering the scene.
  const cursor = useRef({ x: 0, y: 0 });
  const placeChip = useCallback(() => {
    const el = chip.current;
    if (!el) return;
    const { x, y } = cursor.current;
    const flip = x + 14 + el.offsetWidth > window.innerWidth - 8;
    el.style.transform = `translate(${flip ? x - 10 - el.offsetWidth : x + 14}px, ${y + 16}px)`;
  }, []);
  // (Not over the building already open in Explore: the card says it.)
  const hoverBlock = built && hoverT !== null && !(drawerOpen && mapT !== null) && !(phase === "explore" && hoverT === pinned) ? blockOf(hoverT) : null;
  const hoverText = hoverBlock ? { k: `${pageShare(hoverBlock.weight)} of the page`, t: short(blockName(hoverBlock), 44) } : null;
  const chipKey = hoverText ? `${hoverText.k}|${hoverText.t}` : "";
  useLayoutEffect(placeChip, [chipKey, placeChip]);

  const finalUrl = kit ? (doc?.source.finalUrl ?? url ?? "") : (url ?? "");
  const host = url ? hostOf(finalUrl) : "";
  const address = url ? addressOf(finalUrl) : "";
  // A “site name” that is really a whole headline (no short name on the page) reads better as the host.
  const name = [kit?.sem.siteName, doc?.document.title?.split(/\s[|–—-]\s/)[0]].find((n) => n && n.length <= 32) || host;
  const accent = rgbToCss((city ?? vacant).palette.accents[0]);
  const territories = kit ? kit.lots.filter((l) => l > 0).length : 0;

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

  // Construction caption: the page first, then what is rising and how much land it took.
  const step = (() => {
    if (!kit) return null;
    if (!building) return { n: null, label: `${kit.structures} structures`, detail: `${territories} territories` };
    if (reading) return { n: null, label: `Reading ${host}`, detail: `${kit.map.blocks.filter((b) => b.form !== "rest").length} parts of the page` };
    if (!group || lead === null) return null;
    const lb = blockOf(lead);
    let more = -1;
    for (let t = group.first; t <= group.last; t++) if (lotsOf(t) > 0) more++;
    return {
      n: `${gi + 1}/${groups.length}`,
      label: `${short(lb ? blockName(lb) : "", 34)}${more > 0 ? ` + ${more} more` : ""} → ${group.lots} lots`,
      detail: more > 0 ? null : compWords(kit, lead),
    };
  })();

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
  const pb = blockOf(pinned);
  const ab = blockOf(anchorT);

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
        skip={skipped}
        view={phase === "home" ? HOME_VIEW[home] : cityView}
        mode={mode}
        focus={focus}
        interactive={phase === "city" || phase === "explore"}
        highlight={highlight}
        soft={soft}
        spotlight={phase === "city" && linked !== null}
        onHover={onHover}
        onPick={onPick}
        onCanvas={(c) => (canvas.current = c)}
        cameraRef={camera}
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
        {reading ? <div className="sk-readscrim" /> : null}
        <div className="sk-top">
          <span className="sk-wordmark">
            <i /> Skyline
          </span>
          {kit ? (
            <div className="sk-pill">
              <button className="sk-quiet" onClick={skip} title="Skip the construction (Esc)">
                Skip <span className="sk-kbd">esc</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="sk-build">
          <div className="sk-hostname sk-display">{host}</div>
          <div className="sk-step" aria-live="polite">
            <span className="dot" />
            {step ? (
              <>
                {step.n ? <span className="n">{step.n}</span> : null}
                <span key={step.label} className="label">
                  {step.label}
                </span>
                {step.detail && <span className="detail">{step.detail}</span>}
              </>
            ) : (
              <span className="label">Surveying {host}…</span>
            )}
          </div>
        </div>
      </div>

      {/* ── City View ── */}
      {city && kit && (
        <div className="sk-layer" data-on={!hudHidden && phase === "city" ? "1" : "0"}>
          {cv === "meta" && !drawerOpen && <div className="sk-scrim" />}
          {cv === "minimal" && !drawerOpen && <div className="sk-scrim" data-strength="soft" />}
          <div className="sk-top">
            <button className="sk-wordmark" onClick={leave} title="Build another site">
              <i /> Skyline
            </button>
            <div className="sk-pill">
              <button className={`sk-quiet${cv === "meta" ? "" : " sk-icon"}`} aria-pressed={whyOpen} onClick={() => openWhy(!whyOpen)} title="Why this city?">
                <IconPage />
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
          {drawerOpen ? (
            <div className="sk-drawer" style={{ width: drawerW }}>
              <header>
                <span className="sk-label">Why this city</span>
                <button onClick={() => openWhy(false)} aria-label="Close">
                  ×
                </button>
                <p>Every part of {host} became a part of the city. Point at the page or at the city.</p>
              </header>
            </div>
          ) : (
            <>
              <button className="sk-thumbhit" style={{ width: Math.round(MAP_W * thumbScale) + 12, height: Math.round(mapH * thumbScale) + 30 }} onClick={() => openWhy(true)} title="Why this city?" aria-label="Why this city? Show the page">
                <span>the page</span>
              </button>
              {cv === "meta" && (
                <div className="sk-identity" data-cv="meta">
                  <h1 className="sk-name sk-display">{name}</h1>
                  <div className="sk-host">{address}</div>
                  <div className="sk-meta">
                    <b>{kit.structures}</b> structures · <b>{territories}</b> territories · {city.palette.time === "golden" ? "golden hour" : city.palette.time}
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
            </>
          )}
        </div>
      )}

      {/* ── the page map: centre (reading) → dock (rising) → thumbnail (“Why this city?”) ⇄ drawer ── */}
      {kit ? (
        <div
          ref={stage}
          className="sk-mapwrap"
          data-place={place}
          style={{ transform: `translate(${at.x}px, ${at.y}px) scale(${at.s})`, opacity: place === "hidden" ? 0 : 1 }}
          onClick={place === "thumb" ? () => openWhy(true) : undefined}
        >
          <PageMap data={kit.map} width={MAP_W} height={mapH} stateOf={stateOf} onHover={drawerOpen ? onMapHover : undefined} tagOf={tagOf} className="sk-pagemap" />
        </div>
      ) : null}

      {/* the link: page block → territory */}
      {anchorT !== null && anchor && ab && (building || drawerOpen) ? (
        <>
          <svg className="sk-link" width={vp.w} height={vp.h}>
            {blockRect && (place === "dock" || place === "drawer") ? (
              <path
                d={(() => {
                  const x0 = blockRect.x + blockRect.w;
                  const y0 = blockRect.y + Math.min(blockRect.h / 2, 30);
                  const k = Math.max(60, (anchor.x - x0) * 0.45);
                  return `M${x0},${y0} C${x0 + k},${y0} ${anchor.x - k},${anchor.y} ${anchor.x},${anchor.y}`;
                })()}
              />
            ) : null}
            <circle cx={anchor.x} cy={anchor.y} r={4.5} />
          </svg>
          {drawerOpen ? (
            <div className="sk-anchorchip" style={{ left: Math.min(anchor.x + 12, vp.w - 300), top: Math.max(76, anchor.y - 34) }}>
              <span className="k">
                {pageShare(ab.weight)} of the page → {lotsOf(anchorT!)} lots
              </span>
              {short(blockName(ab), 38)}
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── Explore ── */}
      {!hudHidden && phase === "explore" && kit && (
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
          {pb && pinned !== null ? (
            <aside className="sk-inspect sk-from">
              <header>
                <span className="k sk-label">From the page</span>
                <span className="kind sk-label">{pb.kind === "remainder" ? "content" : pb.kind}</span>
                <button onClick={() => setPinned(null)} aria-label="Close">
                  ×
                </button>
              </header>
              <div className="quote">{blockName(pb)}</div>
              <div className="meta">
                {pb.count > 1 ? `${pb.count} items · ` : ""}
                {pageShare(pb.weight)} of the page → {lotsOf(pinned)}/256 lots
                <br />
                {compWords(kit, pinned)}
              </div>
              {lotsOf(pinned) >= 128 ? <div className="note">Most of the page is this part, so most of the city is too.</div> : null}
              <PageMap data={kit.map} width={272} height={300} stateOf={(t) => (t === pinned ? "active" : "dim")} className="sk-minimap" />
            </aside>
          ) : null}
          <div className="sk-hint">drag to move · scroll to zoom · Q/E rotate · click a building to see its page · esc back</div>
        </div>
      )}

      <div ref={chip} className="sk-hover" hidden={hudHidden || !hoverText || building}>
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

const IconPage = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <rect x="3" y="1.75" width="10" height="12.5" rx="1.5" />
    <path d="M5.5 5h5M5.5 7.5h5M5.5 10h3" strokeLinecap="round" />
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
