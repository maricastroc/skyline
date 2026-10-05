import type { NormalizedDocument } from "../../model/types";
import { hexToRgb, rgbToOklch, type Lch } from "../../city/palette";

export interface SiteFingerprint {
  size: number;
  depth: number;
  breadth: number;
  regularity: number;
  sections: number;

  textDensity: number;
  imagery: number;
  linkDensity: number;
  headings: number;
  interactivity: number;
  forms: number;

  roundness: number;
  airiness: number;
  ornament: number;
  darkness: number;
  legacy: number;
  type: { serif: number; sans: number; mono: number };
  colorfulness: number;

  hues: Lch[];
  background?: Lch;
  seed: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const logScale = (v: number, lo: number, hi: number) => clamp01((Math.log(Math.max(v, 1)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function computeFingerprint(doc: NormalizedDocument): SiteFingerprint {
  const nodes = doc.nodes;
  const root = nodes[0];
  const elements = Math.max(doc.stats.elements, 1);

  let containers = 0;
  let childSum = 0;
  let sections = 0;
  let clustered = 0;
  let buttons = 0;
  let ctaLinks = 0;
  for (const n of nodes) {
    if (n.children.length) {
      containers++;
      childSum += n.childCount;
    }
    if (n.role === "section" || n.role === "article") sections++;
    if (n.role === "cluster") clustered += n.cluster?.count ?? 0;
    if (n.role === "button") buttons++;
    if (n.role === "link" && /\b(btn|button|cta|primary|signup|get-started)\b/i.test(n.selector)) ctaLinks++;
  }

  let repeated = 0;
  for (const n of nodes) {
    if (n.children.length < 4) continue;
    const sig = new Map<string, number>();
    for (const c of n.children) {
      const k = nodes[c].tag + (/\.[^.#\s]+/.exec(nodes[c].selector)?.[0] ?? "");
      sig.set(k, (sig.get(k) ?? 0) + 1);
    }
    for (const v of sig.values()) if (v >= 4) repeated += v;
  }

  const style = doc.style;
  const typeTotal = style ? style.fonts.serif + style.fonts.sans + style.fonts.mono : 0;
  const type = typeTotal
    ? { serif: style!.fonts.serif / typeTotal, sans: style!.fonts.sans / typeTotal, mono: style!.fonts.mono / typeTotal }
    : { serif: 0, sans: 1, mono: 0 };

  const hues: Lch[] = [];
  for (const c of doc.colors) {
    const rgb = hexToRgb(c.hex);
    if (!rgb) continue;
    const lch = rgbToOklch(rgb);
    if (lch.c < 0.04 || lch.l < 0.2 || lch.l > 0.97) continue;
    if (hues.some((h) => Math.min(Math.abs(h.h - lch.h), 360 - Math.abs(h.h - lch.h)) < 18)) continue;
    hues.push(lch);
    if (hues.length >= 6) break;
  }
  if (doc.document.themeColor) {
    const rgb = hexToRgb(doc.document.themeColor);
    const lch = rgb && rgbToOklch(rgb);
    if (lch && lch.c >= 0.04 && !hues.some((h) => Math.abs(h.h - lch.h) < 10)) hues.unshift(lch);
  }

  const bgRgb = style?.pageBg ? hexToRgb(style.pageBg) : null;
  const background = bgRgb ? rgbToOklch(bgRgb) : undefined;
  const darkness = clamp01(background ? (0.62 - background.l) / 0.42 : style?.darkScheme ? 0.7 : 0);

  const textBlocks = nodes.filter((n) => n.role === "text" || n.role === "item").length || 1;

  return {
    size: logScale(elements, 30, 6000),
    depth: clamp01((doc.stats.maxDomDepth - 6) / 24),
    breadth: clamp01((childSum / Math.max(containers, 1) - 1.5) / 6),
    regularity: clamp01((clustered + repeated) / Math.max(nodes.length, 1) / 0.5),
    sections: logScale(sections + 1, 1, 80),
    textDensity: logScale(root.chars / elements, 2, 16),
    imagery: clamp01(doc.stats.images / (textBlocks + doc.stats.images) / 0.5),
    linkDensity: clamp01(doc.stats.links / elements / 0.35),
    headings: clamp01((doc.stats.headings / elements) * 100 / 8),
    interactivity: clamp01((((buttons + ctaLinks * 2 + root.controls) / elements) * 100) / 4),
    forms: doc.stats.forms === 0 ? 0 : doc.stats.forms < 3 ? 0.5 : 1,
    roundness: style ? clamp01(style.radius.median / 14 * 0.7 + Math.min(style.radius.pill, 20) / 20 * 0.3) : 0.2,
    airiness: style ? clamp01((style.spacing.median - 6) / 26 * 0.6 + style.spacing.large * 2.4) : 0.3,
    ornament: style ? clamp01((Math.log1p(style.gradients) + Math.log1p(style.shadows) + Math.log1p(style.animations) * 0.7) / 11) : 0,
    darkness,
    legacy: clamp01((style?.legacy ?? 0) / Math.max(elements * 0.08, 8)),
    type,
    colorfulness: clamp01(hues.length / 5 * 0.5 + (hues[0]?.c ?? 0) / 0.2 * 0.5),
    hues,
    background,
    seed: hashString(doc.source.finalUrl),
  };
}
