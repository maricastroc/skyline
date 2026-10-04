"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import type { TimeOfDay } from "@/lib/pixelcity/grammar";
import type { PeopleMode } from "@/lib/pixelcity/kit/core";
import { debugColor, generateKitDistrict, newTrace, ROLE_COLOR, type KitTrace, type ProfileName } from "@/lib/pixelcity/kit/district";
import type { Plan } from "@/lib/pixelcity/kit/plan";
import { surfaceTrace } from "@/lib/pixelcity/kit/surface";
import { generateKitDistrict as generateKitDistrictV1 } from "@/lib/pixelcity/kit-v1/district";
import { generateKitDistrict as generateKitDistrictV2, type Profile as ProfileV2, type ProfileName as ProfileNameV2 } from "@/lib/pixelcity/kit-v2/district";
import { generateKitDistrict as generateKitDistrictV3, type ProfileName as ProfileNameV3 } from "@/lib/pixelcity/kit-v3/district";
import type { Plan as PlanV3 } from "@/lib/pixelcity/kit-v3/plan";
import { generateKitDistrict as generateKitDistrictV4, type ProfileName as ProfileNameV4 } from "@/lib/pixelcity/kit-v4/district";
import type { Plan as PlanV4 } from "@/lib/pixelcity/kit-v4/plan";
import { generateKitDistrict as generateKitDistrictV5, type ProfileName as ProfileNameV5 } from "@/lib/pixelcity/kit-v5/district";
import type { Plan as PlanV5 } from "@/lib/pixelcity/kit-v5/plan";
import { generateKitDistrict as generateKitDistrictV6, type ProfileName as ProfileNameV6 } from "@/lib/pixelcity/kit-v6/district";
import type { Plan as PlanV6 } from "@/lib/pixelcity/kit-v6/plan";
import { generateKitDistrict as generateKitDistrictV7, type ProfileName as ProfileNameV7 } from "@/lib/pixelcity/kit-v7/district";
import type { Plan as PlanV7 } from "@/lib/pixelcity/kit-v7/plan";
import { generateKitDistrict as generateKitDistrictV8, type ProfileName as ProfileNameV8 } from "@/lib/pixelcity/kit-v8/district";
import type { Plan as PlanV8 } from "@/lib/pixelcity/kit-v8/plan";
import { generateKitDistrict as generateKitDistrictV9, type ProfileName as ProfileNameV9 } from "@/lib/pixelcity/kit-v9/district";
import type { Plan as PlanV9 } from "@/lib/pixelcity/kit-v9/plan";
import { generateKitDistrict as generateKitDistrictV10, type ProfileName as ProfileNameV10 } from "@/lib/pixelcity/kit-v10/district";
import type { Plan as PlanV10 } from "@/lib/pixelcity/kit-v10/plan";
import { generateKitDistrict as generateKitDistrictV11, type ProfileName as ProfileNameV11 } from "@/lib/pixelcity/kit-v11/district";
import type { Plan as PlanV11 } from "@/lib/pixelcity/kit-v11/plan";
import type { ViewState } from "./PixelScene";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

const CITY: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };

/**
 * Which generator: 1 the first kit, 2 the massing pass with cycled minors, 3 the semantic
 * allocation pass, 4 the semantic hygiene pass, 5 the surface grammar pass, 6 the openings depth
 * pass, 7 the intra-territory composition pass (all frozen), 8 the current one.
 */
export type KitSource = { v: 1 } | { v: 2; profile: ProfileNameV2 | ProfileV2 } | { v: 3; profile: ProfileNameV3 | PlanV3 } | { v: 4; profile: ProfileNameV4 | PlanV4 } | { v: 5; profile: ProfileNameV5 | PlanV5 } | { v: 6; profile: ProfileNameV6 | PlanV6 } | { v: 7; profile: ProfileNameV7 | PlanV7 } | { v: 8; profile: ProfileNameV8 | PlanV8 } | { v: 9; profile: ProfileNameV9 | PlanV9 } | { v: 10; profile: ProfileNameV10 | PlanV10 } | { v: 11; profile: ProfileNameV11 | PlanV11 } | { v: 12; profile: ProfileName | Plan };

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
  /** Surface inspector (current generator only): click a building to read its anatomy and why. */
  inspect?: boolean;
  /** Street-role view (current generator only, art direction C1): streets in their role colours, plus a legend. */
  streets?: boolean;
  /** Street / close views: world point to look at and zoom (defaults: the view's own). */
  focus?: [number, number];
  zoom?: number;
}

/** The prototype district in the regular scene, camera and post — no UI (except the provenance legend). */
export function KitView({ fp, time, people, view, source, flat, seed, provenance, inspect, streets, focus, zoom }: KitViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
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
    if (source.v === 4) return { city: generateKitDistrictV4(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 5) return { city: generateKitDistrictV5(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 6) return { city: generateKitDistrictV6(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 7) return { city: generateKitDistrictV7(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 8) return { city: generateKitDistrictV8(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 9) return { city: generateKitDistrictV9(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 10) return { city: generateKitDistrictV10(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    if (source.v === 11) return { city: generateKitDistrictV11(fp, { time, people, profile: source.profile, flat, seed, provenance }), trace: null };
    const tr: KitTrace = newTrace();
    const c = generateKitDistrict(fp, { time, people, profile: source.profile, flat, seed, provenance, streetRoles: streets, trace: tr });
    if (!inspect || flat || provenance || streets) return { city: c, trace: tr };
    // Inspector: each building's parts answer picking as that building (node = trace index).
    const parts = c.parts.map((q) => ({ ...q, node: -1 }));
    tr.buildings.forEach((b, i) => {
      for (let k = b.parts[0]; k < b.parts[1]; k++) parts[k].node = i;
    });
    return { city: { ...c, parts }, trace: tr };
  }, [fp, time, people, source, flat, seed, provenance, inspect, streets]);
  const sel = inspect && picked !== null ? trace?.buildings[picked] : undefined;
  return (
    <div className="kit-stage" data-ready="1" style={{ position: "absolute", inset: 0 }}>
      <PixelScene city={city} view={CITY} mode={view === "city" ? "city" : "explore"} focus={focus ?? (view === "close" ? [1.2, 3.2] : [0, 0])} exploreZoom={zoom ?? (view === "close" ? 3.2 : 1.75)} interactive onPick={inspect ? setPicked : undefined} highlight={sel ? [picked!, picked! + 1] : null} />
      {provenance && trace?.plan && trace.alloc ? <Legend trace={trace} /> : null}
      {streets && trace?.streets ? <StreetLegend trace={trace} /> : null}
      {inspect ? (
        <div style={{ position: "absolute", right: 12, top: 12, width: 440, maxHeight: "94%", overflow: "auto", background: "rgba(14,14,18,0.88)", color: "#e8e8ea", font: "11px/1.4 ui-monospace, Menlo, monospace", padding: 10, borderRadius: 4 }}>
          {sel ? (
            <>
              <div style={{ color: "#ffcf5a" }}>
                #{picked} {sel.comp} / {sel.piece} · {sel.P.family} {sel.w.toFixed(1)}×{sel.d.toFixed(1)} · {sel.P.floors} floors · {sel.P.style}
              </div>
              {sel.anatomy.length === 0 ? <div>no anatomy (a family outside the street-building grammar)</div> : null}
              {sel.anatomy.map((A, i) => {
                const t = surfaceTrace(A);
                return (
                  <div key={i} style={{ marginTop: 6 }}>
                    {(["program", "groundFloor", "base", "body", "crown", "roof", "cornerCondition", "styleExpression", "openingTreatment"] as const).map((k) => (
                      <div key={k}>
                        <span style={{ color: "#8fb4ff" }}>{k}</span> {String(t[k])}
                      </div>
                    ))}
                    {(["detailFamilies", "pageSignalsUsed", "variation", "absent"] as const).map((k) =>
                      t[k].length ? (
                        <div key={k}>
                          <span style={{ color: "#8fb4ff" }}>{k}</span>
                          {t[k].map((x) => (
                            <div key={x}>· {x}</div>
                          ))}
                        </div>
                      ) : null,
                    )}
                    <div style={{ color: "#8fb4ff" }}>why</div>
                    {A.why.map((x) => (
                      <div key={x}>· {x}</div>
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <div>surface inspector — click a building</div>
          )}
        </div>
      ) : null}
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

/** Street roles: colour, count of the 24 inner segments and of the 16 on the outer ring. */
function StreetLegend({ trace }: { trace: KitTrace }) {
  const segs = trace.streets ?? [];
  const roles = ["primary", "street", "lane", "pedestrian"] as const;
  const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`;
  return (
    <div style={{ position: "absolute", left: 12, top: 12, background: "rgba(14,14,18,0.86)", color: "#e8e8ea", font: "12px/1.5 ui-monospace, Menlo, monospace", padding: "8px 10px", borderRadius: 4 }}>
      <div style={{ color: "#ffcf5a" }}>street roles · inner / outer</div>
      {roles.map((r) => (
        <div key={r}>
          <span style={{ display: "inline-block", width: 10, height: 10, marginRight: 6, background: css(ROLE_COLOR[r]) }} />
          {r.padEnd(10)} {segs.filter((s) => s.role === r && s.line > 0 && s.line < 4).length} / {segs.filter((s) => s.role === r && (s.line === 0 || s.line === 4)).length}
        </div>
      ))}
    </div>
  );
}
