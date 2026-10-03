"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import type { TimeOfDay } from "@/lib/pixelcity/grammar";
import type { PeopleMode } from "@/lib/pixelcity/kit/core";
import { debugColor, generateKitDistrict, newTrace, type KitTrace, type ProfileName } from "@/lib/pixelcity/kit/district";
import type { Plan } from "@/lib/pixelcity/kit/plan";
import { generateKitDistrict as generateKitDistrictV1 } from "@/lib/pixelcity/kit-v1/district";
import { generateKitDistrict as generateKitDistrictV2, type Profile as ProfileV2, type ProfileName as ProfileNameV2 } from "@/lib/pixelcity/kit-v2/district";
import { generateKitDistrict as generateKitDistrictV3, type ProfileName as ProfileNameV3 } from "@/lib/pixelcity/kit-v3/district";
import type { Plan as PlanV3 } from "@/lib/pixelcity/kit-v3/plan";
import type { ViewState } from "./PixelScene";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

const CITY: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };

/**
 * Which generator: 1 the first kit, 2 the massing pass with cycled minors, 3 the semantic
 * allocation pass (all frozen), 4 the current one (allocation + semantic hygiene).
 */
export type KitSource = { v: 1 } | { v: 2; profile: ProfileNameV2 | ProfileV2 } | { v: 3; profile: ProfileNameV3 | PlanV3 } | { v: 4; profile: ProfileName | Plan };

export interface KitViewProps {
  fp: SiteFingerprint;
  /** Omitted: the profile's own time of day (from its identity). */
  time?: TimeOfDay;
  people: PeopleMode;
  view: "city" | "street" | "close";
  source: KitSource;
  flat: boolean;
  /** Kit seed (decoration and per-building choices); defaults to the kit's 7. */
  seed?: number;
  /** Provenance view (current generator only): territories in debug colours, plus a legend. */
  provenance?: boolean;
}

/** The prototype district in the regular scene, camera and post — no UI (except the provenance legend). */
export function KitView({ fp, time, people, view, source, flat, seed, provenance }: KitViewProps) {
  const { city, trace } = useMemo(() => {
    if (source.v === 1) {
      const c = generateKitDistrictV1(fp, { time, people });
      if (!flat) return { city: c, trace: null };
      // Same silhouette treatment as v2, for a fair before/after.
      const grey: [number, number, number] = [0.62, 0.62, 0.66];
      return { city: { ...c, signs: [], parts: c.parts.filter((q) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow").map((q) => ({ ...q, color: q.y + q.h > 0.4 ? grey : q.color, surf: 0, variant: 0, lit: 0 })) }, trace: null };
    }
    if (source.v === 2) return { city: generateKitDistrictV2(fp, { time, people, profile: source.profile, flat, seed }), trace: null };
    if (source.v === 3) return { city: generateKitDistrictV3(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    const tr: KitTrace = newTrace();
    return { city: generateKitDistrict(fp, { time, people, profile: source.profile, flat, seed, provenance, trace: tr }), trace: tr };
  }, [fp, time, people, source, flat, seed, provenance]);
  return (
    <div className="kit-stage" data-ready="1" style={{ position: "absolute", inset: 0 }}>
      <PixelScene city={city} view={CITY} mode={view === "city" ? "city" : "explore"} focus={view === "close" ? [1.2, 3.2] : [0, 0]} exploreZoom={view === "close" ? 3.2 : 1.75} interactive />
      {provenance && trace?.plan && trace.alloc ? <Legend trace={trace} /> : null}
    </div>
  );
}

/** Page column (reading order, height ∝ weight) beside a city column (height ∝ lots), same colours. */
function Legend({ trace }: { trace: KitTrace }) {
  const plan = trace.plan!;
  const alloc = trace.alloc!;
  const rows = plan.territories.map((t, i) => ({ i, t, lots: alloc.lots[i], c: debugColor(t.key) }));
  const css = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`;
  const H = 760;
  return (
    <div style={{ position: "absolute", left: 12, top: 12, bottom: 12, display: "flex", gap: 10, font: "11px/1.25 ui-monospace, Menlo, monospace", color: "#e8e8ea", pointerEvents: "none" }}>
      <div style={{ background: "rgba(14,14,18,0.86)", padding: 8, borderRadius: 4, display: "flex", gap: 6 }}>
        {[
          ["PAGE", (r: (typeof rows)[number]) => r.t.weight],
          ["CITY", (r: (typeof rows)[number]) => r.lots / 256],
        ].map(([name, f]) => (
          <div key={name as string} style={{ width: 34, display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>{name as string}</div>
            {rows.map((r) => {
              const h = (f as (r: (typeof rows)[number]) => number)(r) * H;
              return h >= 0.5 ? <div key={r.i} style={{ height: h, background: css(r.c), outline: "1px solid rgba(0,0,0,0.35)", fontSize: 9, textAlign: "center", overflow: "hidden" }}>{h > 10 ? r.i : ""}</div> : null;
            })}
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(14,14,18,0.86)", padding: 8, borderRadius: 4, alignSelf: "flex-start", maxHeight: "100%", overflow: "hidden" }}>
        <div style={{ marginBottom: 4 }}># region · organisation · page % → lots</div>
        {rows
          .filter((r) => r.t.weight >= 0.004 || r.lots > 0)
          .map((r) => (
            <div key={r.i} style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
              <span style={{ width: 10, height: 10, background: css(r.c), display: "inline-block" }} />
              <span style={{ width: 18, textAlign: "right" }}>{r.i}</span>
              <span style={{ width: 230, overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.t.kind === "remainder" ? (r.t.source === "page" ? "page (no region)" : `rest of “${r.t.label ?? ""}”`) : `${r.t.kind} “${(r.t.label ?? "").slice(0, 22)}”`}
              </span>
              <span style={{ width: 150, overflow: "hidden" }}>{r.t.mix.map((m) => `${m.comp}${m.share < 1 ? ` ${Math.round(m.share * 100)}%` : ""}`).join("+")}</span>
              <span style={{ width: 44, textAlign: "right" }}>{(r.t.weight * 100).toFixed(1)}%</span>
              <span style={{ width: 52, textAlign: "right" }}>{r.lots} lots</span>
            </div>
          ))}
        {trace.landmark ? <div style={{ marginTop: 6 }}>landmark: {trace.landmark.family} ({trace.landmark.role}), {trace.landmark.floors} floors, {trace.landmark.piece}</div> : <div style={{ marginTop: 6 }}>no landmark</div>}
      </div>
    </div>
  );
}
