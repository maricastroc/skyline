/**
 * Cheap, regex-level signals from CSS. We don't compute styles (that is the rendered
 * capture's job); we only want two hints: the site's palette and which simple selectors
 * are position: fixed/sticky.
 */

export interface PositionRule {
  tag?: string;
  id?: string;
  cls?: string;
  position: "fixed" | "sticky";
}

const HEX_RE = /#([0-9a-f]{3,8})\b/gi;
const FN_RE = /\b(rgba?|hsla?)\(\s*([^)]+)\)/gi;

export function collectColors(css: string, into: Map<string, number>, weight = 1): void {
  for (const m of css.matchAll(HEX_RE)) {
    const hex = expandHex(m[1]);
    if (hex) into.set(hex, (into.get(hex) ?? 0) + weight);
  }
  for (const m of css.matchAll(FN_RE)) {
    const hex = fnToHex(m[1].toLowerCase(), m[2]);
    if (hex) into.set(hex, (into.get(hex) ?? 0) + weight);
  }
}

function expandHex(h: string): string | null {
  if (h.length === 3 || h.length === 4) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6)}`.toLowerCase();
  return null;
}

function fnToHex(fn: string, args: string): string | null {
  const parts = args.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const alpha = parts[3] !== undefined ? parseFloat(parts[3]) * (parts[3].endsWith("%") ? 0.01 : 1) : 1;
  if (alpha < 0.5) return null;
  let r: number, g: number, b: number;
  if (fn.startsWith("rgb")) {
    const ch = (s: string) => (s.endsWith("%") ? (parseFloat(s) / 100) * 255 : parseFloat(s));
    [r, g, b] = [ch(parts[0]), ch(parts[1]), ch(parts[2])];
  } else {
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    [r, g, b] = [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  if (![r, g, b].every((v) => Number.isFinite(v))) return null;
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
const POS_RE = /position\s*:\s*(fixed|sticky|-webkit-sticky)/i;
const SIMPLE_RE = /^([a-z][a-z0-9-]*)?(?:#([\w-]+))?(?:\.([\w-]+))?$/i;

export function collectPositionRules(css: string, into: PositionRule[], max = 200): void {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(RULE_RE)) {
    if (into.length >= max) return;
    const pos = POS_RE.exec(m[2]);
    if (!pos) continue;
    const position = pos[1].toLowerCase() === "fixed" ? "fixed" : "sticky";
    for (const raw of m[1].split(",")) {
      const last = raw.trim().split(/[\s>+~]+/).pop() ?? "";
      const compound = last.replace(/:{1,2}[\w-]+(\([^)]*\))?/g, "").replace(/\[[^\]]*\]/g, "");
      const s = SIMPLE_RE.exec(compound);
      if (!s || (!s[1] && !s[2] && !s[3])) continue;
      if (s[1] && !s[2] && !s[3] && !["header", "nav", "aside", "footer"].includes(s[1].toLowerCase())) continue;
      into.push({ tag: s[1]?.toLowerCase(), id: s[2], cls: s[3], position });
    }
  }
}

export function matchPosition(
  rules: PositionRule[],
  tag: string,
  id: string | undefined,
  classes: string[] | undefined,
): "fixed" | "sticky" | undefined {
  for (const r of rules) {
    if (r.tag && r.tag !== tag) continue;
    if (r.id && r.id !== id) continue;
    if (r.cls && !classes?.includes(r.cls)) continue;
    return r.position;
  }
  return undefined;
}

export interface BackgroundRule {
  tag?: string;
  id?: string;
  cls?: string;
  hex: string;
}

const BG_RE = /background(?:-color)?\s*:\s*([^;!}]+)/i;

/** First solid color in a background declaration (gradients contribute their first stop). */
export function firstColor(value: string): string | undefined {
  const tmp = new Map<string, number>();
  const hex = /#([0-9a-f]{3,8})\b/i.exec(value);
  const fn = /\b(rgba?|hsla?)\([^)]+\)/i.exec(value);
  const first = hex && (!fn || hex.index < fn.index) ? hex[0] : fn?.[0];
  if (!first) return undefined;
  collectColors(first, tmp);
  return tmp.keys().next().value;
}

export function collectBackgroundRules(css: string, into: BackgroundRule[], max = 400): void {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(RULE_RE)) {
    if (into.length >= max) return;
    const bg = BG_RE.exec(m[2]);
    if (!bg) continue;
    const hex = firstColor(bg[1]);
    if (!hex) continue;
    for (const raw of m[1].split(",")) {
      const sel = raw.trim();
      // Only selectors that target an element by itself; descendant/state selectors are too fuzzy.
      if (/[\s>+~:[]/.test(sel)) continue;
      const s = SIMPLE_RE.exec(sel);
      if (!s || (!s[2] && !s[3])) continue;
      into.push({ tag: s[1]?.toLowerCase(), id: s[2], cls: s[3], hex });
    }
  }
}

export function matchBackground(rules: BackgroundRule[], tag: string, id: string | undefined, classes: string[] | undefined): string | undefined {
  let found: string | undefined;
  for (const r of rules) {
    if (r.tag && r.tag !== tag) continue;
    if (r.id && r.id !== id) continue;
    if (r.cls && !classes?.includes(r.cls)) continue;
    found = r.hex; // later rules win, as in the cascade
  }
  return found;
}
