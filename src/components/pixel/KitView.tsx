"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import type { TimeOfDay } from "@/lib/pixelcity/grammar";
import type { PeopleMode } from "@/lib/pixelcity/kit/core";
import { debugColor, generateKitDistrict, newTrace, ROLE_COLOR, type KitTrace, type ProfileName } from "@/lib/pixelcity/kit/district";
import type { Plan } from "@/lib/pixelcity/kit/plan";
import { surfaceTrace } from "@/lib/pixelcity/kit/surface";
import type { ViewState } from "./PixelScene";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

const CITY: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };

export interface KitViewProps {
  fp: SiteFingerprint;
  time?: TimeOfDay;
  people: PeopleMode;
  view: "city" | "street" | "close";
  profile: ProfileName | Plan;
  flat: boolean;
  seed?: number;
  provenance?: boolean;
  inspect?: boolean;
  streets?: boolean;
  focus?: [number, number];
  zoom?: number;
}

export function KitView({ fp, time, people, view, profile, flat, seed, provenance, inspect, streets, focus, zoom }: KitViewProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const { city, trace } = useMemo(() => {
    const tr: KitTrace = newTrace();
    const c = generateKitDistrict(fp, { time, people, profile, flat, seed, provenance, streetRoles: streets, trace: tr });
    if (!inspect || flat || provenance || streets) return { city: c, trace: tr };
    const parts = c.parts.map((q) => ({ ...q, node: -1 }));
    tr.buildings.forEach((b, i) => {
      for (let k = b.parts[0]; k < b.parts[1]; k++) parts[k].node = i;
    });
    return { city: { ...c, parts }, trace: tr };
  }, [fp, time, people, profile, flat, seed, provenance, inspect, streets]);
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
