"use client";

import { create } from "zustand";
import type { CaptureErrorPayload } from "@/lib/acquisition/errors";
import type { CityModel } from "@/lib/city/types";
import type { NormalizedDocument } from "@/lib/model/types";
import type { RenderModel } from "@/lib/render/render-model";

export type Phase = "landing" | "capturing" | "city";
export type Mode = "explore" | "destroy";

export interface CaptureMeta {
  acquireMs: number;
  normalizeMs: number;
  cached: boolean;
  generateMs: number;
}

export interface Hover {
  /** Node the action would apply to (after climbing). */
  node: number;
  /** Node actually under the pointer. */
  hit: number;
}

interface SkylineState {
  phase: Phase;
  input: string;
  error: CaptureErrorPayload | null;
  doc: NormalizedDocument | null;
  city: CityModel | null;
  render: RenderModel | null;
  meta: CaptureMeta | null;

  mode: Mode;
  locked: boolean;
  introDone: boolean;
  hover: Hover | null;
  climb: number;
  selected: number | null;

  integrity: number;
  destroyed: number;
  /** Bumped on every destruction so tree views re-read the runtime's alive flags. */
  aliveVersion: number;
  lastHit: { node: number; weight: number; percent: number; at: number } | null;
  /** Most recent demolitions, newest first. */
  demolitions: Array<{ at: number; node: number; percent: number; nodes: number }>;

  hudHidden: boolean;
  muted: boolean;
  /** A request to fly the camera to a node. */
  focus: { node: number; at: number } | null;

  set: (patch: Partial<SkylineState>) => void;
  setMode: (mode: Mode) => void;
  reset: () => void;
}

export const useSkyline = create<SkylineState>((set) => ({
  phase: "landing",
  input: "",
  error: null,
  doc: null,
  city: null,
  render: null,
  meta: null,

  mode: "explore",
  locked: false,
  introDone: false,
  hover: null,
  climb: 0,
  selected: null,

  integrity: 1,
  destroyed: 0,
  aliveVersion: 0,
  lastHit: null,
  demolitions: [],

  hudHidden: false,
  muted: false,
  focus: null,

  set: (patch) => set(patch),
  setMode: (mode) => set({ mode, climb: 0 }),
  reset: () =>
    set({
      phase: "landing",
      error: null,
      doc: null,
      city: null,
      render: null,
      meta: null,
      hover: null,
      selected: null,
      climb: 0,
      integrity: 1,
      destroyed: 0,
      aliveVersion: 0,
      lastHit: null,
      demolitions: [],
      focus: null,
      introDone: false,
      locked: false,
      mode: "explore",
    }),
}));
