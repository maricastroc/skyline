"use client";

import { useEffect, useState } from "react";
import type { CaptureResponse } from "@/app/api/capture/route";
import type { CaptureErrorPayload } from "@/lib/acquisition/errors";
import type { NormalizedDocument } from "@/lib/model/types";
import { generatePixelCity } from "@/lib/pixelcity/generate";
import type { CityFrame, PixelCity } from "@/lib/pixelcity/types";

export interface PixelCityState {
  loading: boolean;
  error: CaptureErrorPayload | null;
  doc: NormalizedDocument | null;
  city: PixelCity | null;
}

/** Same capture pipeline as the maquette (/api/capture), new generator. */
export function usePixelCity(url: string | null, frame: CityFrame = "island"): PixelCityState {
  const [state, setState] = useState<PixelCityState>({ loading: Boolean(url), error: null, doc: null, city: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ loading: true, error: null, doc: null, city: null });
    fetch("/api/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) })
      .then((r) => r.json() as Promise<CaptureResponse>)
      .then((res) => {
        if (!alive) return;
        if (!res.ok) return setState({ loading: false, error: res.error, doc: null, city: null });
        setState({ loading: false, error: null, doc: res.doc, city: generatePixelCity(res.doc, { frame }) });
      })
      .catch(() => alive && setState({ loading: false, error: { code: "internal", title: "Couldn't reach the surveyor", detail: "The capture service didn't respond." }, doc: null, city: null }));
    return () => {
      alive = false;
    };
  }, [url, frame]);
  return state;
}
