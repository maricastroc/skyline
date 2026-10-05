"use client";

import { useEffect, useState } from "react";
import type { CaptureResponse } from "@/app/api/capture/route";
import type { CaptureErrorPayload } from "@/lib/acquisition/errors";
import type { NormalizedDocument } from "@/lib/model/types";
import { buildKitCity, type KitCity } from "@/lib/pixelcity/kit-city";

export interface PixelCityState {
  loading: boolean;
  error: CaptureErrorPayload | null;
  doc: NormalizedDocument | null;
  kit: KitCity | null;
}

/** Same capture pipeline as the maquette (/api/capture); the city is the kit's (lib/pixelcity/kit-city.ts). */
export function usePixelCity(url: string | null): PixelCityState {
  const [state, setState] = useState<PixelCityState>({ loading: Boolean(url), error: null, doc: null, kit: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loading: true, error: null, doc: null, kit: null });
    fetch("/api/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) })
      .then((r) => r.json() as Promise<CaptureResponse>)
      .then((res) => {
        if (!alive) return;
        if (!res.ok) return setState({ loading: false, error: res.error, doc: null, kit: null });
        let kit: KitCity;
        try {
          kit = buildKitCity(res.doc);
        } catch {
          return setState({ loading: false, error: { code: "internal", title: "Couldn't build this city", detail: "The page was read, but the city generator failed on it." }, doc: null, kit: null });
        }
        setState({ loading: false, error: null, doc: res.doc, kit });
      })
      .catch(() => alive && setState({ loading: false, error: { code: "internal", title: "Couldn't reach the surveyor", detail: "The capture service didn't respond." }, doc: null, kit: null }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}
