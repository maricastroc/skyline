import { firstColor } from "./css-signals";

export interface StyleSignals {
  cssBytes: number;
  radius: { count: number; median: number; pill: number };
  spacing: { count: number; median: number; large: number };
  shadows: number;
  gradients: number;
  animations: number;
  transitions: number;
  fonts: { serif: number; sans: number; mono: number };
  uppercase: number;
  pageBg?: string;
  darkScheme: boolean;
  legacy: number;
  utility: number;
}

export interface MarkupSignals {
  legacy: number;
  utilityClasses: number;
  totalClasses: number;
  utilSpacing: number[];
  utilRadius: number[];
  utilFonts: { serif: number; sans: number; mono: number };
}

const TW_RADIUS: Record<string, number> = { none: 0, sm: 2, "": 4, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24, full: 9999 };

export function readUtilityClass(c: string, into: MarkupSignals): void {
  const cls = c.replace(/^([a-z0-9]+:)+/, "");
  const sp = /^-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?)$/.exec(cls);
  if (sp) {
    into.utilSpacing.push(parseFloat(sp[1]) * 4);
    return;
  }
  const r = /^rounded(?:-[tblr]{1,2})?(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/.exec(cls);
  if (r) {
    into.utilRadius.push(TW_RADIUS[r[1] ?? ""] ?? 4);
    return;
  }
  if (cls === "font-serif") into.utilFonts.serif++;
  else if (cls === "font-mono") into.utilFonts.mono++;
  else if (cls === "font-sans") into.utilFonts.sans++;
}

const SERIF_RE =
  /\b(serif|georgia|times|libertine|garamond|merriweather|playfair|lora|tiempos|charter|cambria|baskerville|didot|bodoni|caslon|minion|crimson|spectral|newsreader|fraunces|instrument serif|source serif|pt serif|noto serif|ibm plex serif|dm serif|literata)\b/i;
const MONO_RE = /\b(monospace|mono|menlo|monaco|consolas|courier|fira code|jetbrains|inconsolata|ubuntu mono|sf mono|space mono)\b/i;

function toPx(v: string): number | null {
  const m = /^(-?[\d.]+)(px|rem|em|%)?$/.exec(v.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  if (m[2] === "rem" || m[2] === "em") return n * 16;
  if (m[2] === "%") return n >= 50 ? 9999 : n;
  return n;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function varResolver(css: string): (v: string) => string {
  const vars = new Map<string, string>();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!vars.has(m[1])) vars.set(m[1], m[2].trim());
  const resolve = (v: string, depth = 0): string =>
    depth > 4 || !v.includes("var(")
      ? v
      : resolve(
          v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, name: string, fb?: string) => vars.get(name) ?? fb ?? ""),
          depth + 1,
        );
  return resolve;
}

export function extractStyleSignals(css: string[], markup: MarkupSignals, themeColor?: string): StyleSignals {
  const all = css.join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const resolve = varResolver(all);

  const radii: number[] = [];
  let pill = 0;
  for (const m of all.matchAll(/border(?:-[a-z]+)?-radius\s*:\s*([^;}]+)/gi)) {
    const v = toPx(resolve(m[1]).trim().split(/\s+/)[0] ?? "");
    if (v === null) continue;
    if (v >= 999) pill++;
    else radii.push(v);
  }

  const spaces: number[] = [];
  for (const m of all.matchAll(/(?:^|[;{\s])(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|bottom|left|right|block|inline)(?:-(?:start|end))?)?\s*:\s*([^;}]+)/gi)) {
    for (const tok of resolve(m[1]).split(/\s+/)) {
      const v = toPx(tok);
      if (v !== null && v > 0 && v < 400) spaces.push(v);
    }
  }

  for (const v of markup.utilRadius) {
    if (v >= 999) pill++;
    else radii.push(v);
  }
  for (const v of markup.utilSpacing) if (v > 0) spaces.push(v);
  const fonts = { serif: markup.utilFonts.serif * 0.5, sans: markup.utilFonts.sans * 0.5, mono: markup.utilFonts.mono * 0.5 };
  for (const m of all.matchAll(/([^{}]*)\{[^{}]*?font(?:-family)?\s*:\s*([^;}]+)/gi)) {
    const sel = m[1].trim().toLowerCase();
    const decl = resolve(m[2]);
    if (!/[a-z]{3,}/i.test(decl) || /^\s*(inherit|initial|unset|var\()/i.test(decl)) continue;
    const weight = /(^|[\s,])(html|body|:root)\b/.test(sel) ? 10 : /\bh[1-3]\b|title|heading|headline|display/.test(sel) ? 6 : 1;
    const stack = decl.replace(/!important/i, "").trim();
    const generic = /(?:^|,)\s*(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)\s*$/i.exec(stack)?.[1]?.toLowerCase();
    if (generic === "monospace" || generic === "ui-monospace" || MONO_RE.test(stack.split(",")[0])) fonts.mono += weight;
    else if (generic === "serif" || generic === "ui-serif" || (!generic && SERIF_RE.test(stack.split(",")[0]) && !/sans-serif/i.test(stack))) fonts.serif += weight;
    else fonts.sans += weight;
  }

  let pageBg: string | undefined;
  for (const m of all.matchAll(/(^|})\s*((?:html|body|:root)(?:\s*,\s*(?:html|body|:root))*)\s*\{([^{}]*)\}/gi)) {
    const bg = /(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i.exec(m[3]);
    const c = bg && firstColor(resolve(bg[1]));
    if (c) {
      pageBg = c;
      break;
    }
  }
  if (!pageBg && themeColor) pageBg = firstColor(themeColor);
  if (!pageBg) {
    for (const m of all.matchAll(/--[\w-]*(?:bg|background)[\w-]*\s*:\s*([^;}]+)/gi)) {
      const c = firstColor(m[1]);
      if (c) {
        pageBg = c;
        break;
      }
    }
  }

  return {
    cssBytes: all.length,
    radius: { count: radii.length, median: median(radii), pill },
    spacing: { count: spaces.length, median: median(spaces), large: spaces.length ? spaces.filter((v) => v >= 48).length / spaces.length : 0 },
    shadows: (all.match(/box-shadow\s*:\s*(?!none)/gi) ?? []).length,
    gradients: (all.match(/(?:linear|radial|conic)-gradient\(/gi) ?? []).length,
    animations: (all.match(/@keyframes/gi) ?? []).length,
    transitions: (all.match(/transition\s*:/gi) ?? []).length,
    fonts,
    uppercase: (all.match(/text-transform\s*:\s*uppercase/gi) ?? []).length,
    pageBg,
    darkScheme: /color-scheme\s*:\s*dark(?!\s+light)/i.test(all),
    legacy: markup.legacy,
    utility: markup.totalClasses ? markup.utilityClasses / markup.totalClasses : 0,
  };
}
