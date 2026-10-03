"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { SiteFingerprint } from "@/lib/fingerprint/fingerprint";
import type { TimeOfDay } from "@/lib/pixelcity/grammar";
import type { PeopleMode } from "@/lib/pixelcity/kit/core";
import { generateKitDistrict, type ProfileName } from "@/lib/pixelcity/kit/district";
import { generateKitDistrict as generateKitDistrictV1 } from "@/lib/pixelcity/kit-v1/district";
import type { ViewState } from "./PixelScene";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

const CITY: ViewState = { azimuth: 45, zoom: 0.9, pan: [0, 0] };

export interface KitViewProps {
  fp: SiteFingerprint;
  /** Omitted: the profile's own time of day (from its identity). */
  time?: TimeOfDay;
  people: PeopleMode;
  view: "city" | "street" | "close";
  profile: ProfileName;
  flat: boolean;
  /** 1 = the frozen first kit (before/after comparisons). */
  version: 1 | 2;
}

/** The prototype district in the regular scene, camera and post — no UI. */
export function KitView({ fp, time, people, view, profile, flat, version }: KitViewProps) {
  const city = useMemo(() => {
    if (version === 1) {
      const c = generateKitDistrictV1(fp, { time, people });
      if (!flat) return c;
      // Same silhouette treatment as v2, for a fair before/after.
      const grey: [number, number, number] = [0.62, 0.62, 0.66];
      return { ...c, signs: [], parts: c.parts.filter((q) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow").map((q) => ({ ...q, color: q.y + q.h > 0.4 ? grey : q.color, surf: 0, variant: 0, lit: 0 })) };
    }
    return generateKitDistrict(fp, { time, people, profile, flat });
  }, [fp, time, people, profile, flat, version]);
  return (
    <div className="kit-stage" data-ready="1" style={{ position: "absolute", inset: 0 }}>
      <PixelScene city={city} view={CITY} mode={view === "city" ? "city" : "explore"} focus={view === "close" ? [1.2, 3.2] : [0, 0]} exploreZoom={view === "close" ? 3.2 : 1.75} interactive />
    </div>
  );
}
