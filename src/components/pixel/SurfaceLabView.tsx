"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import type { ArchStyle, TimeOfDay } from "@/lib/pixelcity/grammar";
import { building, type Program } from "@/lib/pixelcity/kit/buildings";
import { Kit } from "@/lib/pixelcity/kit/core";
import { generateSurfaceLab, type LabKit, type LabLight, type LabSet } from "@/lib/pixelcity/kit/lab";
import { building as buildingV4 } from "@/lib/pixelcity/kit-v4/buildings";
import { Kit as KitV4 } from "@/lib/pixelcity/kit-v4/core";
import { building as buildingV5 } from "@/lib/pixelcity/kit-v5/buildings";
import { Kit as KitV5 } from "@/lib/pixelcity/kit-v5/core";
import type { ViewState } from "./PixelScene";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });
const VIEW: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };

export interface SurfaceLabProps {
  fp: SiteFingerprint;
  set: LabSet;
  style: ArchStyle;
  /** 4 = frozen kit before the surface grammar; 5 = frozen surface grammar; 6 = current. */
  version: 4 | 5 | 6;
  light: LabLight;
  time: TimeOfDay;
  flat: boolean;
  focus?: [number, number];
  zoom?: number;
  legend: boolean;
}

const KITS: Record<4 | 5 | 6, LabKit> = {
  4: { Kit: KitV4 as unknown as LabKit["Kit"], building: buildingV4 as unknown as LabKit["building"] },
  5: { Kit: KitV5 as unknown as LabKit["Kit"], building: buildingV5 as unknown as LabKit["building"] },
  6: { Kit: Kit as unknown as LabKit["Kit"], building: building as unknown as (kit: never, w: number, d: number, P: Program) => number },
};

/** Buildings in isolation on a controlled grid (see lib/pixelcity/kit/lab.ts). */
export function SurfaceLabView({ fp, set, style, version, time, flat, light, focus, zoom, legend }: SurfaceLabProps) {
  const lab = useMemo(() => generateSurfaceLab(KITS[version], fp, { set, style, time, flat, light }), [fp, set, style, version, time, flat, light]);
  return (
    <div className="kit-stage" data-ready="1" style={{ position: "absolute", inset: 0 }}>
      <PixelScene city={lab.city} view={VIEW} mode="explore" focus={focus ?? [0, 0]} exploreZoom={zoom ?? 1.1} interactive />
      {legend && version === 6 ? (
        <div style={{ position: "absolute", right: 12, top: 12, maxHeight: "96%", overflow: "hidden", background: "rgba(14,14,18,0.86)", color: "#e8e8ea", font: "10px/1.3 ui-monospace, Menlo, monospace", padding: 8, borderRadius: 4, width: 420, pointerEvents: "none" }}>
          {lab.cells.map((c) => (
            <div key={c.label} style={{ marginBottom: 4 }}>
              <b>{c.label}</b>
              {c.anatomy ? (
                <div>
                  ground {c.anatomy.ground.kind}×{c.anatomy.ground.units} · base {c.anatomy.base.floors ? `${c.anatomy.base.floors} ${c.anatomy.base.treatment}` : "—"} · body {c.anatomy.body.surf}/{c.anatomy.body.pattern} · crown {c.anatomy.crown.kind} · roof {c.anatomy.roof.edge}/{c.anatomy.roof.service}/{c.anatomy.roof.occupied}
                  {c.anatomy.corner.condition ? ` · corner ${c.anatomy.corner.treatment}` : ""}
                  {` · opening ${c.anatomy.opening.glazing}/${c.anatomy.opening.depth}/${c.anatomy.opening.frame}${c.anatomy.opening.sill ? "+sill" : ""}`}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
