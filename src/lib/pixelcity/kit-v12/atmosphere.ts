// FROZEN: art direction v1, final baseline (C1 street roles, C3 street life, C4 atmosphere). Do not edit.
import { oklch, rgbToOklch } from "../../city/palette";
import type { RGB } from "../../city/types";
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { CityGrammar } from "../grammar";
import type { GamePalette } from "../palette";
import type { Comp } from "./plan";
import type { Allocation } from "./territory";

export interface Environment {
  air: number;
  tint: { h: number; strength: number };
  vivid: number;
  hardness: number;
  why: string[];
}

const OPEN = new Set<Comp>(["media", "interactive", "landmark", "marker"]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

export function planEnvironment(fp: SiteFingerprint, grammar: CityGrammar, alloc: Allocation): Environment {
  const open = alloc.segments.filter((s) => OPEN.has(s.comp)).reduce((t, s) => t + s.count, 0) / 256;
  const whitespace = clamp01(fp.airiness / 0.6);
  const air = clamp01(0.45 * whitespace + 0.35 * open + 0.2 * (1 - grammar.coverage));
  const ws = [1, 0.6, 0.4, 0.3, 0.2];
  const all = fp.hues.slice(0, 5).map((h, k) => ({ h: h.h, c: h.c, w: ws[k] }));
  if (fp.background && fp.background.c > 0.015) all.unshift({ h: fp.background.h, c: fp.background.c, w: 1.2 });
  const lead = all[0];
  const near = (x: number) => Math.abs(((((x - (lead?.h ?? 0)) % 360) + 540) % 360) - 180) <= 60;
  const cols = all.filter((c) => near(c.h));
  let a = 0;
  let b = 0;
  let w = 0;
  for (const c of cols) {
    a += c.w * c.c * Math.cos((c.h * Math.PI) / 180);
    b += c.w * c.c * Math.sin((c.h * Math.PI) / 180);
    w += c.w;
  }
  const chroma = w ? Math.hypot(a, b) / w : 0;
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const tint = { h, strength: clamp01(chroma / 0.1) };
  const vivid = clamp01(fp.colorfulness);
  const hardness = clamp01(fp.ornament);
  return {
    air,
    tint,
    vivid,
    hardness,
    why: [
      `air ${air.toFixed(2)} = 0.45·whitespace ${whitespace.toFixed(2)} + 0.35·open ground ${open.toFixed(2)} + 0.2·unbuilt ${(1 - grammar.coverage).toFixed(2)}`,
      `tint h${Math.round(h)} strength ${tint.strength.toFixed(2)} (chroma ${chroma.toFixed(3)} of the dominant ${fp.background && fp.background.c > 0.015 ? "background" : "brand hue"} and ${Math.max(0, cols.length - 1)} near hue(s); ${all.length - cols.length} far hue(s) left out)`,
      `vivid ${vivid.toFixed(2)} (colourfulness)`,
      `hardness ${hardness.toFixed(2)} (ornament: shadows, gradients, animation)`,
    ],
  };
}

const hueDiff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

function colour(base: RGB, env: Environment, lean: number, o: { cross: boolean; cTint: number; dL: number; L: [number, number]; cMax: number }): RGB {
  const p = rgbToOklch(base);
  const k = clamp01(lean * env.tint.strength);
  const d = hueDiff(p.h, env.tint.h);
  let h = p.h;
  let c = p.c;
  if (!o.cross) {
    if (Math.abs(d) <= 60) h = p.h + d * k;
    else c = p.c * (1 - 0.6 * k);
  } else if (Math.abs(d) <= 90) {
    h = p.h + d * k;
    c = p.c + (Math.max(p.c, o.cTint) - p.c) * k;
  } else if (k < 0.5) c = p.c * (1 - 2 * k);
  else {
    h = env.tint.h;
    c = Math.max(p.c, o.cTint) * (2 * k - 1);
  }
  c = Math.min(o.cMax, c * (0.4 + 0.6 * env.vivid));
  return oklch(clamp(p.l + o.dL, o.L[0], o.L[1]), c, (h + 360) % 360);
}

export const BASE_HAZE: [number, number] = [0.64, 0.97];

export function applyEnvironment(p: GamePalette, env: Environment): { palette: GamePalette; haze: [number, number] } {
  const night = p.time === "night";
  const air = env.air - 0.5;
  const skyBand: Record<"day" | "golden" | "night", { top: [number, number]; bottom: [number, number] }> = {
    day: { top: [0.62, 0.78], bottom: [0.86, 0.95] },
    golden: { top: [0.52, 0.66], bottom: [0.78, 0.9] },
    night: { top: [0.12, 0.22], bottom: [0.24, 0.38] },
  };
  const band = skyBand[p.time];
  const sky = {
    ...p.sky,
    top: colour(p.sky.top, env, 0.6, { cross: false, cTint: 0, dL: (night ? 0.03 : 0.08) * air, L: band.top, cMax: 0.14 }),
    bottom: colour(p.sky.bottom, env, night ? 0.45 : 0.9, { cross: true, cTint: 0.08, dL: 0.04 * air, L: band.bottom, cMax: 0.12 }),
  };
  const warmth = env.tint.strength * Math.cos(((env.tint.h - 70) * Math.PI) / 180);
  const warm: RGB = night ? oklch(0.88, 0.06, 80) : oklch(0.95, 0.08, 70);
  const cool: RGB = night ? oklch(0.86, 0.08, 255) : oklch(0.96, 0.04, 235);
  const sunTone = warmth >= 0 ? warm : cool;
  const lean = Math.min(0.6, Math.abs(warmth) * 0.6);
  const sun = {
    ...p.sun,
    color: [0, 1, 2].map((k) => p.sun.color[k] + (sunTone[k] - p.sun.color[k]) * lean) as RGB,
    intensity: p.sun.intensity * (0.85 + 0.3 * env.hardness),
  };
  const ambient = {
    ...p.ambient,
    sky: colour(p.ambient.sky, env, 0.35, { cross: false, cTint: 0, dL: 0, L: [0, 1], cMax: 0.12 }),
    ground: colour(p.ambient.ground, env, 0.2, { cross: false, cTint: 0, dL: 0, L: [0, 1], cMax: 0.1 }),
    intensity: p.ambient.intensity * (1.12 - 0.24 * env.hardness),
  };
  const haze: [number, number] = [clamp(BASE_HAZE[0] + 0.26 * air, 0.53, 0.77), clamp(BASE_HAZE[1] + 0.16 * air, 0.9, 1.05)];
  return { palette: { ...p, sky, sun, ambient }, haze };
}
