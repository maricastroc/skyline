"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { rgbToCss } from "@/lib/city/palette";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import { blockName, compWords, type KitCity } from "@/lib/pixelcity/kit-city";
import { SIDEWALK_H } from "@/lib/pixelcity/kit/street";
import type { PMBlock } from "@/lib/pixelcity/page-map";
import { generateVacantWorld, SITE_CENTRE } from "@/lib/pixelcity/vacant";
import { Logo } from "./Logo";
import { PageMap, type BlockState } from "./PageMap";
import type { ViewState } from "./PixelScene";
import { makePostcard } from "./postcard";
import { usePixelCity } from "./usePixelCity";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

export type UiType = "grotesk" | "editorial" | "bitmap";
export type HomeKind = "refined" | "vacant" | "blueprint";
export type CityViewKind = "meta" | "minimal" | "bare";
export interface Variants {
  ui: UiType;
  home: HomeKind;
  cv: CityViewKind;
}

const EXAMPLES: Array<[string, string]> = [
  ["Apple", "https://www.apple.com"],
  ["Hacker News", "https://news.ycombinator.com"],
  ["Linear", "https://linear.app"],
  ["The Guardian", "https://www.theguardian.com/international"],
];

/** A quick look at what was typed, before bothering the surveyor. */
function checkAddress(v: string): { title: string; detail: string; hint: string } | null {
  if (/\s/.test(v)) return { title: "That doesn't look like a website", detail: "Addresses don't contain spaces.", hint: "Paste a web address, like apple.com" };
  const host = v.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host)) return { title: "That doesn't look like a website", detail: "It needs a domain.", hint: "Try a full address, like apple.com or https://linear.app" };
  return null;
}

const CITY_VIEW: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };
const HOME_VIEW: Record<HomeKind, ViewState> = {
  refined: { azimuth: 45, zoom: 1.1, pan: [0, 0] },
  vacant: { azimuth: 45, zoom: 1.22, pan: [SITE_CENTRE[0] - 1.6, SITE_CENTRE[1] + 4.8] },
  blueprint: { azimuth: 45, zoom: 0.8, pan: [-4, -4] },
};
const BUILD_ZOOM = 0.62;
const FOCUS_ZOOM = 0.72;
const STREET_ZOOM = 1.75;
const STREET_FROM = 1.25;

const MAP_W = 360;
type MapPlace = "hidden" | "thumb" | "drawer";

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
const pageShare = (w: number) => (w < 0.01 ? "<1%" : `${Math.round(w * 100)}%`);
const lotsLabel = (n: number) => `${n} ${n === 1 ? "lot" : "lots"}`;

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
    if (k.last > k.done) return;
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

  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hoverU, setHoverU] = useState<number | null>(null);
  const [mapT, setMapT] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [cameraT, setCameraT] = useState<number | null>(null);
  const [flyT, setFlyT] = useState<number | null>(null);
  const [zoomedIn, setZoomedIn] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [localError, setLocalError] = useState<{ title: string; detail: string; hint?: string } | null>(null);
  const [hudHidden, setHudHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [atUsed, setAtUsed] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const camera = useRef<THREE.Camera | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const focusInput = useRef(false);
  const chip = useRef<HTMLDivElement>(null);
  const live = useRef({ built, building, whyOpen, pinned });
  useEffect(() => {
    live.current = { built, building, whyOpen, pinned };
  });

  const lotsOf = useCallback((t: number) => kit?.lots[t] ?? 0, [kit]);
  const blockOf = useCallback((t: number | null): PMBlock | null => (t === null || !kit ? null : (kit.map.blocks.find((b) => b.t === t) ?? null)), [kit]);

  const openWhy = useCallback((open: boolean) => {
    setWhyOpen(open);
    setMapT(null);
    setFlyT(null);
    if (!open) setCameraT(null);
  }, []);
  const leave = useCallback(() => {
    setPinned(null);
    setFlyT(null);
    setWhyOpen(false);
    setCameraT(null);
    setUrl(null);
    setDraft("");
    focusInput.current = true;
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("url");
      sp.delete("at");
      const q = sp.toString();
      window.history.replaceState(null, "", q ? `/pixel?${q}` : "/pixel");
    } catch {}
  }, []);
  const skip = useCallback(() => setSkipped(true), []);

  if (built && initialAt && !atUsed && url === initialUrl && kit) {
    setAtUsed(true);
    const t = findTerritory(kit, initialAt);
    if (t !== null) {
      setFlyT(t);
      setPinned(t);
    }
  }

  const onHover = useCallback((node: number | null, _at: [number, number] | null, unit?: number | null) => {
    setHoverT((prev) => (prev === node ? prev : node));
    setHoverU((prev) => (prev === (unit ?? null) ? prev : (unit ?? null)));
  }, []);
  const onPick = useCallback((node: number | null) => {
    if (!live.current.built) return;
    setPinned((prev) => (node !== null && prev === node ? null : node));
  }, []);

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
      if (e.code === "Escape") {
        if (L.whyOpen) openWhy(false);
        else if (L.pinned !== null) setPinned(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openWhy, skip]);

  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const u = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  const groups = kit?.build.groups ?? [];
  let gi = -1;
  if (kit && building) for (let i = 0; i < groups.length; i++) if (groups[i].at <= elapsed) gi = i;
  const group = gi >= 0 ? groups[gi] : null;
  const reading = !!kit && building && gi < 0;

  const phase: "home" | "building" | "city" = !url || error ? "home" : building ? "building" : "city";
  useEffect(() => {
    if (phase !== "home" || !focusInput.current) return;
    focusInput.current = false;
    const id = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(id);
  }, [phase]);
  const drawerOpen = phase === "city" && whyOpen;

  const mapH = Math.max(320, vp.h - 180);
  const thumbScale = 0.2;
  const drawerW = Math.min(372, vp.w - 32);
  const drawerScale = 84 / MAP_W;
  const place: MapPlace = !kit || phase === "home" || hudHidden ? "hidden" : building || drawerOpen ? "drawer" : "thumb";
  const placeOf: Record<Exclude<MapPlace, "hidden">, { x: number; y: number; s: number }> = {
    drawer: { x: Math.round(16 + drawerW - 20 - MAP_W * drawerScale), y: 108, s: drawerScale },
    thumb: { x: 20, y: 66, s: thumbScale },
  };
  const at = placeOf[place === "hidden" ? "thumb" : place];
  const drawerRight = 16 + drawerW;

  const linked = building || phase !== "city" ? null : drawerOpen ? (mapT ?? hoverT) : (hoverT ?? pinned);
  let highlight: [number, number] | null = null;
  let soft: [number, number] | null = null;
  const inCity = phase === "city" && !building && !drawerOpen && linked !== null;
  const vast = inCity && lotsOf(linked!) / 256 >= 0.4;
  const focusUnit = inCity && hoverT !== null ? hoverU : null;
  const focusArea = inCity && !vast ? linked : null;
  if (building && group) highlight = [group.first, group.last + 1];
  else if (linked !== null && !inCity) highlight = [linked, linked + 1];
  if (phase === "city" && pinned !== null && pinned !== linked) soft = [pinned, pinned + 1];
  const lead = group ? (() => {
    let best = group.first;
    for (let t = group.first; t <= group.last; t++) if (lotsOf(t) > lotsOf(best)) best = t;
    return best;
  })() : null;
  const anchorT = drawerOpen ? (mapT ?? hoverT) : null;

  const panelRight = building || drawerOpen ? drawerRight : 0;
  const focusT = drawerOpen && cameraT !== null && kit?.geo[cameraT]?.lots.length ? cameraT : null;
  const flyTo = !building && !drawerOpen && flyT !== null && kit?.geo[flyT]?.lots.length ? flyT : null;
  const zoom = building ? BUILD_ZOOM : focusT !== null ? FOCUS_ZOOM : flyTo !== null ? STREET_ZOOM : CITY_VIEW.zoom;
  const base = Math.hypot(vp.w, vp.h) / 50;
  const dx = panelRight / 2 / (base * zoom);
  const dz = focusT !== null ? 2.5 : 0;
  const goT = focusT ?? flyTo;
  const [fx, fz] = goT !== null && kit ? kit.geo[goT].centre : [0, 0];
  const px = Math.round((fx - 0.707 * dx - 0.707 * dz) * 4) / 4;
  const pz = Math.round((fz + 0.707 * dx - 0.707 * dz) * 4) / 4;
  const cityView = useMemo<ViewState>(() => (px === 0 && pz === 0 && zoom === CITY_VIEW.zoom ? CITY_VIEW : { azimuth: 45, zoom, pan: [px, pz] }), [px, pz, zoom]);

  useEffect(() => {
    if (phase !== "city") return;
    const id = setInterval(() => {
      const cam = camera.current as THREE.OrthographicCamera | null;
      if (!cam) return;
      const z = cam.zoom / base;
      setZoomedIn((prev) => (prev ? z > STREET_FROM - 0.1 : z > STREET_FROM));
    }, 200);
    return () => clearInterval(id);
  }, [phase, base]);
  const titleOff = pinned !== null || zoomedIn;

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
      const el = root.current?.querySelector<HTMLElement>(`.sk-legend [data-pm-t="${anchorT}"]`) ?? st.querySelector<HTMLElement>(`.sk-pagemap [data-pm-t="${anchorT}"]`);
      if (el) {
        const b = el.getBoundingClientRect();
        const n = { x: b.left, y: b.top, w: b.width, h: b.height };
        setBlockRect((o) => (o && Math.abs(o.x - n.x) < 0.5 && Math.abs(o.y - n.y) < 0.5 && Math.abs(o.h - n.h) < 0.5 ? o : n));
      } else setBlockRect(null);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anchorT, kit]);

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
      return null;
    },
    [building, group],
  );
  const onMapHover = useCallback((t: number | null) => setMapT(t), []);

  const cursor = useRef({ x: 0, y: 0 });
  const placeChip = useCallback(() => {
    const el = chip.current;
    if (!el) return;
    const { x, y } = cursor.current;
    const flip = x + 14 + el.offsetWidth > window.innerWidth - 8;
    el.style.transform = `translate(${flip ? x - 10 - el.offsetWidth : x + 14}px, ${y + 16}px)`;
  }, []);
  const hoverBlock = built && hoverT !== null && !drawerOpen && hoverT !== pinned ? blockOf(hoverT) : null;
  const hoverText = hoverBlock ? { k: `${pageShare(hoverBlock.weight)} of the page`, t: short(blockName(hoverBlock), 44) } : null;
  const chipKey = hoverText ? `${hoverText.k}|${hoverText.t}` : "";
  useLayoutEffect(placeChip, [chipKey, placeChip]);

  const finalUrl = kit ? (doc?.source.finalUrl ?? url ?? "") : (url ?? "");
  const host = url ? hostOf(finalUrl) : "";
  const address = url ? addressOf(finalUrl) : "";
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

  const shown = localError ?? error;
  const field = (
    <form
      className="sk-field"
      data-invalid={shown ? "1" : "0"}
      onSubmit={(e) => {
        e.preventDefault();
        const v = draft.trim();
        if (!v) return;
        const bad = checkAddress(v);
        if (bad) return setLocalError(bad);
        setLocalError(null);
        go(v);
      }}
    >
      <input
        ref={input}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setLocalError(null);
        }}
        placeholder="https://"
        spellCheck={false}
        autoComplete="off"
        aria-label="Website address"
        aria-invalid={shown ? true : undefined}
      />
      <button className="sk-primary" type="submit">
        Build <span className="arrow">→</span>
      </button>
    </form>
  );
  const examples = (
    <div className="sk-try">
      <span>
        Explore <span className="arrow">→</span>
      </span>
      {EXAMPLES.map(([label, u], i) => (
        <span key={u} className="ex">
          <button type="button" onClick={() => go(u)}>
            {label}
          </button>
          {i < EXAMPLES.length - 1 ? <i aria-hidden>·</i> : null}
        </span>
      ))}
    </div>
  );
  const errorLine = shown && (
    <div className="sk-error" role="alert">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 4.8v3.6M8 10.9v.1" strokeLinecap="round" />
      </svg>
      <div>
        <b>{shown.title}</b>
        <span>{shown.hint ?? shown.detail}</span>
      </div>
    </div>
  );
  const pb = blockOf(pinned);
  const landed = kit ? kit.map.blocks.filter((b) => b.lots > 0) : [];
  const panel = (mode: "build" | "why") => {
    if (!kit) return null;
    const upto = mode === "build" ? (group ? group.last : -1) : Infinity;
    const done = landed.filter((b) => b.t <= upto);
    const legend = [...landed].sort((a, b) => b.lots - a.lots).slice(0, 4);
    const extra = mode === "build" ? lead : linked;
    if (extra !== null && !legend.some((b) => b.t === extra)) {
      const b = blockOf(extra);
      if (b && b.lots > 0) legend.push(b);
    }
    const stateOfRow = (t: number) => (mode === "why" ? (linked === t ? "on" : "idle") : group && t >= group.first && t <= group.last ? "on" : t <= upto ? "done" : "todo");
    const structures = mode === "build" ? kit.trace.buildings.filter((b) => b.territory <= upto).length : kit.structures;
    return (
      <div className="sk-drawer" data-mode={mode} style={{ width: drawerW }}>
        <header style={{ minHeight: Math.round(mapH * drawerScale) + 38, paddingRight: Math.round(MAP_W * drawerScale) + 36 }}>
          <span className="sk-label">{mode === "why" ? "Why this city" : reading ? "Reading the page" : `Building · ${gi + 1}/${groups.length}`}</span>
          <h2 className="sk-display">{name}</h2>
          <div className="host">{host}</div>
          {mode === "why" ? (
            <button onClick={() => openWhy(false)} aria-label="Close">
              ×
            </button>
          ) : null}
        </header>
        <div className="sk-metrics">
          <div>
            <b>{(doc?.stats.elements ?? 0).toLocaleString("en")}</b>
            <span>elements read</span>
          </div>
          <div>
            <b>{Math.round(done.reduce((a, b) => a + b.weight, 0) * 100)}%</b>
            <span>of the page became land</span>
          </div>
          <div>
            <b>{done.length}</b>
            <span>{done.length === 1 ? "part, one district" : "parts, one district each"}</span>
          </div>
          <div>
            <b>{structures}</b>
            <span>structures on 256 lots</span>
          </div>
        </div>
        <div className="sk-legend" onMouseLeave={mode === "why" ? () => setMapT(null) : undefined}>
          <h4 className="sk-label">Page → City</h4>
          {legend.map((b) => {
            const st = stateOfRow(b.t);
            return (
              <button key={b.t} data-pm-t={b.t} data-on={st === "on" ? "1" : "0"} data-state={st} onMouseEnter={mode === "why" ? () => setMapT(b.t) : undefined} onFocus={mode === "why" ? () => setMapT(b.t) : undefined} tabIndex={mode === "why" ? 0 : -1}>
                <span className="what">
                  {short(blockName(b), 30)}
                  {b.count > 1 ? <i>{b.count} items</i> : null}
                </span>
                <span className="into">{compWords(kit, b.t)}</span>
                <span className="bar">
                  <i style={{ width: st === "todo" ? 0 : `${Math.max(1.5, (b.lots / 256) * 100)}%` }} />
                </span>
                <span className="n">
                  {pageShare(b.weight)} of the page → {lotsLabel(b.lots)}
                </span>
              </button>
            );
          })}
          {landed.length > legend.length ? <div className="more">+ {landed.length - legend.length} smaller parts{mode === "why" ? " — point at them on the page or in the city" : ""}</div> : null}
        </div>
      </div>
    );
  };
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
        mode="city"
        interactive={phase === "city"}
        highlight={highlight}
        soft={soft}
        focusUnit={focusUnit}
        focusArea={focusArea}
        spotlight={phase === "city" && linked !== null && (drawerOpen || !zoomedIn)}
        onHover={onHover}
        onPick={onPick}
        onCanvas={(c) => (canvas.current = c)}
        cameraRef={camera}
      />

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
              <Logo /> Skyline
            </span>
          </div>
          <div className="sk-homescrim" />
          <div className="sk-ask">
            <h1 className="sk-hero sk-display">Every website has a skyline.</h1>
            <p className="sk-sub">Paste a URL. See what yours becomes.</p>
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
              <Logo /> Skyline
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

      <div className="sk-layer" data-on={phase === "building" ? "1" : "0"}>
        {!kit ? <div className="sk-scrim" data-strength="soft" /> : null}
        <div className="sk-top">
          <span className="sk-wordmark">
            <Logo /> Skyline
          </span>
          {kit ? (
            <div className="sk-pill">
              <button className="sk-quiet" onClick={skip} title="Skip the construction (Esc)">
                Skip <span className="sk-kbd">esc</span>
              </button>
            </div>
          ) : null}
        </div>
        {kit ? (
          panel("build")
        ) : (
          <div className="sk-build">
            <div className="sk-hostname sk-display">{host}</div>
            <div className="sk-step" aria-live="polite">
              <span className="dot" />
              <span className="label">Surveying {host}…</span>
            </div>
          </div>
        )}
      </div>

      {city && kit && (
        <div className="sk-layer" data-on={!hudHidden && phase === "city" ? "1" : "0"}>
          {cv === "meta" && !drawerOpen && (!titleOff || pinned !== null) && <div className="sk-scrim" />}
          {cv === "minimal" && !drawerOpen && (!titleOff || pinned !== null) && <div className="sk-scrim" data-strength="soft" />}
          <div className="sk-top">
            <button className="sk-wordmark" onClick={leave} title="Build another site">
              <Logo /> Skyline
            </button>
            <div className="sk-pill">
              <button className={`sk-quiet${cv === "meta" ? "" : " sk-icon"}`} onClick={leave} title="Build another site">
                <IconNew />
                {cv === "meta" && "New city"}
              </button>
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
          {!drawerOpen ? <div className="sk-hint">drag to move · scroll to zoom into the streets · Q/E or shift-drag to turn · click a building to see its page</div> : null}
          {drawerOpen ? (
            panel("why")
          ) : (
            <>
              {cv === "meta" && (
                <div className="sk-identity sk-aside" data-cv="meta" data-off={titleOff ? "1" : "0"}>
                  <h1 className="sk-name sk-display">{name}</h1>
                  <div className="sk-host">{address}</div>
                  <div className="sk-meta">
                    <b>{kit.structures}</b> structures · <b>{territories}</b> territories · {city.palette.time === "golden" ? "golden hour" : city.palette.time}
                  </div>
                </div>
              )}
              {cv === "minimal" && (
                <div className="sk-identity sk-aside" data-cv="minimal" data-off={titleOff ? "1" : "0"}>
                  <div className="sk-hostname sk-display">{host}</div>
                </div>
              )}
              {cv === "bare" && (
                <div className="sk-bare sk-aside" data-off={titleOff ? "1" : "0"}>
                  <span>{host}</span>
                </div>
              )}
              {pb && pinned !== null ? <FromThePage kit={kit} b={pb} t={pinned} onClose={() => setPinned(null)} /> : null}
            </>
          )}
        </div>
      )}

      {kit ? (
        <div
          ref={stage}
          className="sk-mapwrap"
          data-place={place}
          style={{ transform: `translate(${at.x}px, ${at.y}px) scale(${at.s})`, opacity: place === "hidden" || place === "thumb" || (drawerOpen && !building) ? 0 : 1, pointerEvents: place === "thumb" || (drawerOpen && !building) ? "none" : undefined }}
        >
          <PageMap data={kit.map} width={MAP_W} height={mapH} stateOf={stateOf} onHover={drawerOpen ? onMapHover : undefined} tagOf={tagOf} className="sk-pagemap" />
        </div>
      ) : null}

      {anchorT !== null && anchor && ab && drawerOpen ? (
        <>
          <svg className="sk-link" width={vp.w} height={vp.h}>
            {blockRect && place === "drawer" ? (
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
                {pageShare(ab.weight)} of the page → {lotsLabel(lotsOf(anchorT!))}
              </span>
              {short(blockName(ab), 38)}
            </div>
          ) : null}
        </>
      ) : null}

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
const IconNew = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
  </svg>
);
const IconSave = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M8 2.5v7.5M4.8 7l3.2 3.2L11.2 7M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
function FromThePage({ kit, b, t, onClose }: { kit: KitCity; b: PMBlock; t: number; onClose: () => void }) {
  const lots = kit.lots[t] ?? 0;
  const crop = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  const CROP_H = 168;
  useLayoutEffect(() => {
    const el = crop.current?.querySelector<HTMLElement>(`[data-pm-t="${t}"]`);
    if (!el) return;
    // Centre the originating block in the window, with a little of what surrounds it.
    const mid = el.offsetTop + Math.min(el.offsetHeight, CROP_H) / 2;
    setShift(Math.max(0, mid - CROP_H / 2 - (el.offsetHeight < CROP_H ? 0 : 0)));
  }, [t, kit]);
  const site = [kit.map.siteName, kit.map.title.split(/\s[|–—-]\s/)[0]].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ");
  return (
    <aside className="sk-from">
      <button className="x" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="eyebrow">From the page</div>
      <h2>{blockName(b)}</h2>
      <div className="site">{site}</div>
      <div className="stats">
        {b.count > 1 ? `${b.count} items · ` : ""}
        {pageShare(b.weight)} of page · {lots} lots
      </div>
      <div className="into">{compWords(kit, t)}</div>
      <div className="crop" ref={crop} style={{ height: CROP_H }}>
        <div style={{ transform: `translateY(${-shift}px)` }}>
          <PageMap data={kit.map} width={300} height={1700} stateOf={(x) => (x === t ? "active" : "idle")} className="sk-minimap" />
        </div>
      </div>
    </aside>
  );
}
