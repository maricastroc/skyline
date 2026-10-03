import type { SiteFingerprint } from "../fingerprint/fingerprint";
import { mix, oklch, rgbToCss } from "../../city/palette";
import type { RGB } from "../../city/types";
import type { ArchStyle, CityGrammar, TimeOfDay } from "./grammar";

/**
 * Game palette: a limited set of ramps, art-directed per time of day and architecture, with
 * the site's hues injected only where a pixel artist would put brand color — roofs, awnings,
 * signs, neon. Any site, however garish or grey, lands inside the same visual language.
 */
export interface GamePalette {
  time: TimeOfDay;
  sky: { top: RGB; bottom: RGB; stars: boolean };
  sun: { color: RGB; intensity: number; dir: [number, number, number] };
  ambient: { sky: RGB; ground: RGB; intensity: number };
  grass: [RGB, RGB];
  soil: RGB;
  soilDark: RGB;
  stone: RGB;
  road: RGB;
  roadMark: RGB;
  sidewalk: RGB;
  plaza: RGB;
  walls: Record<ArchStyle, RGB[]>;
  roofs: Record<ArchStyle, RGB[]>;
  /** Vivid site colors for awnings, signs, neon, cars. */
  accents: RGB[];
  glass: RGB;
  lit: RGB;
  trunk: RGB;
  leaves: [RGB, RGB];
  water: RGB;
  cloud: RGB;
  lamp: RGB;
  css: { ink: string; paper: string; accent: string };
}

const DEFAULT_HUES = [28, 200, 330, 150];

export function buildGamePalette(fp: SiteFingerprint, g: CityGrammar): GamePalette {
  const hues = fp.hues.length ? fp.hues.map((h) => h.h) : DEFAULT_HUES;
  const h1 = hues[0];
  const h2 = hues[1] ?? (h1 + 150) % 360;
  const h3 = hues[2] ?? (h1 + 60) % 360;

  const accents = [h1, h2, h3, (h1 + 180) % 360].map((h, i) => oklch(i === 0 ? 0.66 : 0.72, 0.17, h));

  const night = g.time === "night";
  const golden = g.time === "golden";

  const walls: Record<ArchStyle, RGB[]> = {
    classic: [oklch(0.9, 0.04, 85), oklch(0.83, 0.06, 70), oklch(0.62, 0.12, 38), oklch(0.76, 0.03, 75)],
    modern: [oklch(0.95, 0.005, 250), oklch(0.82, 0.012, 250), oklch(0.66, 0.02, 245), oklch(0.9, 0.02, h1)],
    soft: [oklch(0.9, 0.06, h1), oklch(0.91, 0.05, h2), oklch(0.88, 0.07, 350), oklch(0.91, 0.06, 165), oklch(0.89, 0.05, 290)],
    retro: [oklch(0.6, 0.15, 32), oklch(0.86, 0.07, 85), oklch(0.68, 0.11, 175), oklch(0.74, 0.12, 60), oklch(0.62, 0.12, 250)],
    tech: [oklch(0.42, 0.015, 250), oklch(0.32, 0.02, 262), oklch(0.56, 0.02, 240)],
  };
  const roofs: Record<ArchStyle, RGB[]> = {
    classic: [oklch(0.52, 0.13, 32), oklch(0.44, 0.04, 250), oklch(0.55, 0.12, h1)],
    modern: [oklch(0.72, 0.01, 250), oklch(0.6, 0.015, 250), oklch(0.62, 0.12, h1)],
    soft: [oklch(0.74, 0.11, h1), oklch(0.78, 0.09, h2), oklch(0.8, 0.08, 20)],
    retro: [oklch(0.4, 0.03, 50), oklch(0.5, 0.12, 30), oklch(0.62, 0.17, h1)],
    tech: [oklch(0.26, 0.02, 260), oklch(0.36, 0.03, 250), oklch(0.62, 0.15, h1)],
  };

  const bgHue = fp.background && fp.background.c > 0.015 ? fp.background.h : 275;
  const sky = night
    ? { top: oklch(0.17, 0.05, bgHue), bottom: oklch(0.32, 0.08, (bgHue + 15) % 360), stars: true }
    : golden
      ? { top: oklch(0.58, 0.12, 305), bottom: oklch(0.84, 0.12, 60), stars: false }
      : { top: oklch(0.7, 0.11, 240), bottom: oklch(0.92, 0.05, 210), stars: false };

  const sun = night
    ? { color: oklch(0.86, 0.07, 255), intensity: 1.25, dir: [-0.3, 0.8, 0.6] as [number, number, number] }
    : golden
      ? { color: oklch(0.88, 0.1, 60), intensity: 2.6, dir: [-0.55, 0.45, 0.7] as [number, number, number] }
      : { color: oklch(0.99, 0.02, 90), intensity: 2.4, dir: [-0.35, 0.9, 0.62] as [number, number, number] };

  const ambient = night
    ? { sky: oklch(0.5, 0.1, 270), ground: oklch(0.26, 0.05, 250), intensity: 1.25 }
    : golden
      ? { sky: oklch(0.72, 0.08, 320), ground: oklch(0.55, 0.08, 60), intensity: 1.1 }
      : { sky: oklch(0.85, 0.06, 230), ground: oklch(0.6, 0.06, 130), intensity: 1.0 };

  const grass: [RGB, RGB] = night
    ? [oklch(0.42, 0.08, 165), oklch(0.38, 0.08, 170)]
    : golden
      ? [oklch(0.7, 0.15, 136), oklch(0.65, 0.15, 142)]
      : [oklch(0.72, 0.16, 138), oklch(0.67, 0.16, 142)];

  const dim = (c: RGB) => (night ? mix(c, oklch(0.3, 0.05, 270), 0.25) : c);

  return {
    time: g.time,
    sky,
    sun,
    ambient,
    grass,
    soil: oklch(0.5, 0.08, 55),
    soilDark: oklch(0.4, 0.07, 50),
    stone: oklch(0.58, 0.02, 60),
    road: dim(oklch(0.46, 0.015, 260)),
    roadMark: night ? oklch(0.85, 0.12, 90) : oklch(0.95, 0.02, 90),
    sidewalk: dim(oklch(0.82, 0.015, 80)),
    plaza: dim(golden ? oklch(0.86, 0.04, 85) : oklch(0.86, 0.03, 75)),
    walls,
    roofs,
    accents,
    glass: night ? oklch(0.3, 0.05, 250) : oklch(0.55, 0.07, 228),
    lit: oklch(0.92, 0.12, 85),
    trunk: oklch(0.45, 0.07, 50),
    leaves: night ? [oklch(0.45, 0.1, 160), oklch(0.38, 0.09, 165)] : golden ? [oklch(0.62, 0.15, 115), oklch(0.55, 0.14, 125)] : [oklch(0.62, 0.17, 140), oklch(0.54, 0.15, 148)],
    water: night ? oklch(0.38, 0.09, 250) : oklch(0.68, 0.11, 225),
    cloud: golden ? oklch(0.93, 0.05, 30) : oklch(0.98, 0.01, 240),
    lamp: oklch(0.9, 0.14, 85),
    css: { ink: rgbToCss(oklch(0.2, 0.03, 270)), paper: rgbToCss(oklch(0.97, 0.01, 90)), accent: rgbToCss(accents[0]) },
  };
}
