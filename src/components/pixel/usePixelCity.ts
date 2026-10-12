"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { CaptureResponse } from "@/app/api/capture/route";
import type { CaptureErrorPayload } from "@/lib/acquisition/errors";
import type { NormalizedDocument } from "@/lib/model/types";
import { cityStep, idle, type CaptureMode, type CityEvent, type CityRequest } from "@/lib/pixelcity/capture-mode";
import { buildKitCity, type KitCity } from "@/lib/pixelcity/kit-city";

interface Built {
  doc: NormalizedDocument;
  kit: KitCity;
}
type State = CityRequest<Built, CaptureErrorPayload>;
type Event = CityEvent<Built, CaptureErrorPayload>;

export interface PixelCityState {
  loading: boolean;
  error: CaptureErrorPayload | null;
  failedMode: CaptureMode | null;
  doc: NormalizedDocument | null;
  kit: KitCity | null;
  mode: CaptureMode;
  switching: CaptureMode | null;
  switchError: { mode: CaptureMode; error: CaptureErrorPayload } | null;
  dismiss: () => void;
}

const inFlight = new Map<string, Promise<CaptureResponse>>();
function capture(url: string, mode: CaptureMode): Promise<CaptureResponse> {
  const key = `${mode} ${url}`;
  let p = inFlight.get(key);
  if (!p) {
    p = fetch("/api/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "detailed" ? { url, strategy: "rendered" } : { url }) })
      .then((r) => r.json() as Promise<CaptureResponse>)
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p);
  }
  return p;
}

export function usePixelCity(url: string | null, mode: CaptureMode = "auto"): PixelCityState {
  const [state, dispatch] = useReducer(cityStep as (s: State, e: Event) => State, url, (u) => idle<Built, CaptureErrorPayload>(Boolean(u)));
  const shown = useRef(state.shown);
  useEffect(() => {
    shown.current = state.shown;
  });
  useEffect(() => {
    if (!url) return dispatch({ type: "clear" });
    dispatch({ type: "ask", url, mode });
    if (shown.current?.url === url && shown.current.mode === mode) return;
    let alive = true;
    const failed = (error: CaptureErrorPayload) => alive && dispatch({ type: "failed", url, mode, error });
    capture(url, mode)
      .then((res) => {
        if (!alive) return;
        if (!res.ok) return failed(res.error);
        let kit: KitCity;
        try {
          kit = buildKitCity(res.doc);
        } catch {
          return failed({ code: "internal", title: "Couldn't build this city", detail: "The page was read, but the city generator failed on it." });
        }
        dispatch({ type: "built", url, mode, city: { doc: res.doc, kit } });
      })
      .catch(() => failed({ code: "internal", title: "Couldn't reach the surveyor", detail: "The capture service didn't respond." }));
    return () => {
      alive = false;
    };
  }, [url, mode]);
  const dismiss = useCallback(() => dispatch({ type: "dismiss" }), []);
  return {
    loading: state.loading,
    error: state.error,
    failedMode: state.failedMode,
    doc: state.shown?.city.doc ?? null,
    kit: state.shown?.city.kit ?? null,
    mode: state.shown?.mode ?? mode,
    switching: state.switching,
    switchError: state.switchError,
    dismiss,
  };
}
