import type { CityPalette, RGB } from "./types";

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function srgbToLinear(rgb: RGB): RGB {
  return [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
}

export interface Lch {
  l: number;
  c: number;
  h: number;
}

export function rgbToOklch([r8, g8, b8]: RGB): Lch {
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: (h + 360) % 360 };
}

export function oklch(l: number, c: number, h: number): RGB {
  const hr = (h * Math.PI) / 180;
  for (let cc = c; cc >= 0; cc -= 0.005) {
    const A = cc * Math.cos(hr);
    const B = cc * Math.sin(hr);
    const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
    const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
    const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
    if (r >= -0.0005 && r <= 1.0005 && g >= -0.0005 && g <= 1.0005 && b >= -0.0005 && b <= 1.0005) {
      const clamp = (v: number) => Math.min(1, Math.max(0, toSrgb(Math.min(1, Math.max(0, v)))));
      return [clamp(r), clamp(g), clamp(b)];
    }
  }
  const v = Math.min(1, Math.max(0, toSrgb(l ** 3)));
  return [v, v, v];
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToCss([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const DEFAULT_ACCENT_HUE = 38;
const DEFAULT_ACCENT2_HUE = 200;
const PAPER_HUE = 78;

export const CARD_STOCKS: Array<{ h: number; c: number; name: string }> = [
  { h: 78, c: 0.022, name: "oat" },
  { h: 145, c: 0.028, name: "sage" },
  { h: 235, c: 0.024, name: "slate" },
  { h: 45, c: 0.034, name: "clay" },
  { h: 95, c: 0.036, name: "sand" },
  { h: 195, c: 0.022, name: "mist" },
  { h: 20, c: 0.026, name: "rose clay" },
  { h: 120, c: 0.02, name: "lichen" },
];

export function buildPalette(colors: Array<{ hex: string; weight: number }>, themeColor?: string): CityPalette {
  const chromatic: Array<{ lch: Lch; weight: number; hex: string }> = [];
  const candidates = themeColor ? [{ hex: themeColor, weight: 999 }, ...colors] : colors;
  for (const { hex, weight } of candidates) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const lch = rgbToOklch(rgb);
    if (lch.c < 0.045 || lch.l < 0.22 || lch.l > 0.96) continue;
    chromatic.push({ lch, weight: weight * (0.5 + lch.c * 4), hex });
  }
  chromatic.sort((a, b) => b.weight - a.weight);

  const primary = chromatic[0];
  const secondary = primary ? chromatic.find((c) => hueDist(c.lch.h, primary.lch.h) > 45) : undefined;
  const h1 = primary?.lch.h ?? DEFAULT_ACCENT_HUE;
  const h2 = secondary?.lch.h ?? (primary ? (h1 + 155) % 360 : DEFAULT_ACCENT2_HUE);

  const accent = oklch(0.62, Math.min(0.15, Math.max(0.1, primary?.lch.c ?? 0.12)), h1);
  const accent2 = oklch(0.7, Math.min(0.11, Math.max(0.07, secondary?.lch.c ?? 0.08)), h2);

  const tint = primary ? 0.16 : 0;
  const neutral = (l: number, c = 0.014): RGB => mix(oklch(l, c, PAPER_HUE), oklch(l, 0.03, h1), tint);

  return {
    skyTop: oklch(0.83, 0.03, 232),
    skyHorizon: neutral(0.945, 0.02),
    fog: neutral(0.925, 0.02),
    ground: neutral(0.865, 0.016),
    groundLine: neutral(0.79, 0.018),
    base: neutral(0.82, 0.02),
    building: neutral(0.968, 0.008),
    structure: neutral(0.4, 0.012),
    paving: neutral(0.7, 0.01),
    accent,
    accent2,
    glow: oklch(0.86, 0.13, 72),
    sun: oklch(0.97, 0.035, 75),
    css: {
      accent: rgbToCss(oklch(0.55, 0.14, h1)),
      accent2: rgbToCss(oklch(0.55, 0.1, h2)),
      ink: rgbToCss(oklch(0.25, 0.015, PAPER_HUE)),
      paper: rgbToCss(neutral(0.96, 0.012)),
      glow: rgbToCss(oklch(0.8, 0.14, 70)),
    },
    districtHues: CARD_STOCKS.map((s) => s.h),
    source: [primary?.hex, secondary?.hex].filter(Boolean) as string[],
  };
}

export function plinthColor(p: CityPalette, level: number, district: number | null): RGB {
  const base = rgbToOklch(p.base);
  const l = Math.min(0.95, base.l + 0.032 * level);
  const neutral = oklch(l, 0.012, PAPER_HUE);
  if (district === null) return neutral;
  const stock = CARD_STOCKS[district % CARD_STOCKS.length];
  return oklch(l, stock.c, stock.h);
}

export function buildingTint(p: CityPalette, district: number | null): RGB {
  if (district === null) return p.building;
  const stock = CARD_STOCKS[district % CARD_STOCKS.length];
  return mix(p.building, oklch(0.94, stock.c * 0.8, stock.h), 0.35);
}

export function elementTint(hex: string | undefined): RGB | null {
  if (!hex) return null;
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { l, c, h } = rgbToOklch(rgb);
  if (l < 0.34) return oklch(0.4, 0.012, PAPER_HUE);
  if (c < 0.045 || l > 0.95) return null;
  return oklch(Math.min(0.76, Math.max(0.58, l)), Math.min(0.13, Math.max(0.06, c)), h);
}
