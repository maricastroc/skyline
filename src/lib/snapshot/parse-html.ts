import { parse, type DefaultTreeAdapterMap } from "parse5";
import {
  collectBackgroundRules,
  collectColors,
  collectPositionRules,
  firstColor,
  matchBackground,
  matchPosition,
  type BackgroundRule,
  type PositionRule,
} from "./css-signals";
import { extractStyleSignals, readUtilityClass, type MarkupSignals } from "./style-signals";
import type { CaptureWarning, DomSnapshot, SnapshotAttr, SnapshotNode } from "./types";

type P5Node = DefaultTreeAdapterMap["node"];
type P5Element = DefaultTreeAdapterMap["element"];
type P5Parent = DefaultTreeAdapterMap["parentNode"];

const MAX_ELEMENTS = 25_000;
const MAX_DEPTH = 160;

/** Never part of the city. */
const SKIP = new Set([
  "script", "style", "noscript", "template", "link", "meta", "title", "head", "base",
  "br", "wbr", "param", "source", "track", "slot", "dialog",
]);
/** Kept, but we don't descend into them. */
const OPAQUE = new Set(["svg", "math", "iframe", "video", "audio", "canvas", "object", "embed", "select", "textarea", "picture"]);
/**
 * Headings animated line-by-line often carry their text twice (a visible copy and an
 * aria/measurement copy): “Plan and buildPlan and build”. Keep one.
 */
export function unrepeat(t: string): string {
  if (t.length < 24) return t;
  const head = t.slice(0, 12);
  const at = t.indexOf(head, 8);
  if (at < 0) return t;
  const first = t.slice(0, at).trim();
  const rest = t.slice(at).trim();
  return rest.length >= 12 && (first.startsWith(rest) || rest.startsWith(first)) ? first : t;
}

/** Elements whose descendant text we sample as a label. */
const LABELLED = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "button", "a", "label", "summary", "legend", "figcaption", "th", "caption", "title"]);

const KEEP_ATTRS: SnapshotAttr[] = [
  "href", "src", "alt", "role", "type", "width", "height", "aria-label", "aria-hidden", "hidden", "name", "title",
];

/** Tailwind/Bootstrap-ish utility classes make poor selectors; push them to the back. */
const UTILITY_RE =
  /[:[\]/!@]|^-?(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|w|h|size|flex|grid|gap|text|bg|border|rounded|shadow|items|justify|content|col|row|space|font|leading|tracking|min|max|overflow|absolute|relative|static|block|inline|hidden|z|top|left|right|bottom|inset|order|self|place|sm|md|lg|xl|2xl|dark|hover|focus|opacity|transition|duration|ease|transform|translate|scale|rotate|cursor|select|pointer|sr|not|line|object|aspect|container|mx-auto|d|align|float|clearfix|visible|invisible|shrink|grow|basis|fill|stroke|ring|outline|divide|decoration|underline|uppercase|lowercase|capitalize|italic|truncate|whitespace|break|list|table|antialiased|js|is|has|css|sc|jsx|svelte|astro|tw|_)(-|$)/i;
const HASHY_RE = /^[a-z]{0,3}[A-Za-z0-9_-]*[0-9][A-Za-z0-9_-]{4,}$|__[A-Za-z0-9]{4,}$/;

export interface ParsedPage {
  doc: DefaultTreeAdapterMap["document"];
  html: P5Element | null;
  head: P5Element | null;
  body: P5Element | null;
  baseHref?: string;
  stylesheets: string[];
  inlineCss: string[];
}

/** Phase 1: parse and find what the acquisition layer may want to fetch (stylesheets). */
export function parsePage(source: string, pageUrl: string): ParsedPage {
  const doc = parse(source);
  const html = findChild(doc, "html");
  const head = html ? findChild(html, "head") : null;
  const body = html ? findChild(html, "body") : null;
  const stylesheets: string[] = [];
  const inlineCss: string[] = [];
  let baseHref: string | undefined;

  if (head) {
    for (const el of elements(head)) {
      if (el.tagName === "base" && !baseHref) baseHref = attr(el, "href");
      if (el.tagName === "link" && /\bstylesheet\b/i.test(attr(el, "rel") ?? "") && !/print/i.test(attr(el, "media") ?? "")) {
        const href = resolveUrl(attr(el, "href"), pageUrl);
        if (href) stylesheets.push(href);
      }
      if (el.tagName === "style") inlineCss.push(textOf(el));
    }
  }
  // <style> in body is common in CMS output.
  if (body) for (const el of descendants(body, 4000)) if (el.tagName === "style") inlineCss.push(textOf(el));

  return { doc, html, head, body, baseHref, stylesheets, inlineCss };
}

export interface SnapshotSource {
  requestedUrl: string;
  finalUrl: string;
  strategy: DomSnapshot["source"]["strategy"];
  status: number;
  bytes: number;
  durationMs: number;
  redirects: string[];
}

/** Phase 2: walk <body> into a DomSnapshot. `externalCss` is whatever stylesheets were fetched. */
export function buildSnapshot(page: ParsedPage, source: SnapshotSource, externalCss: string[] = []): DomSnapshot {
  const base = resolveUrl(page.baseHref, source.finalUrl) ?? source.finalUrl;
  const colors = new Map<string, number>();
  const positionRules: PositionRule[] = [];
  const backgroundRules: BackgroundRule[] = [];
  for (const css of [...page.inlineCss, ...externalCss]) {
    collectColors(css, colors);
    collectPositionRules(css, positionRules);
    collectBackgroundRules(css, backgroundRules);
  }

  const document: DomSnapshot["document"] = { title: "" };
  if (page.html) document.lang = attr(page.html, "lang");
  if (page.head) {
    for (const el of elements(page.head)) {
      if (el.tagName === "title" && !document.title) document.title = collapse(textOf(el)).slice(0, 140);
      if (el.tagName !== "meta") continue;
      const name = (attr(el, "name") ?? attr(el, "property") ?? "").toLowerCase();
      const content = attr(el, "content");
      if (!content) continue;
      if (name === "description" || name === "og:description") document.description ??= content.slice(0, 240);
      if (name === "theme-color") {
        document.themeColor = content;
        collectColors(content, colors, 60);
      }
      if (name === "og:image") document.ogImage = resolveUrl(content, base);
      if ((name === "og:site_name" || name === "application-name") && !document.siteName) document.siteName = content.slice(0, 60);
    }
  }

  let elementCount = 0;
  let maxDepth = 0;
  let truncated = false;
  let noscriptText = 0;
  const markup: MarkupSignals = { legacy: 0, utilityClasses: 0, totalClasses: 0, utilSpacing: [], utilRadius: [], utilFonts: { serif: 0, sans: 0, mono: 0 } };

  const walk = (el: P5Element, depth: number): SnapshotNode | null => {
    const tag = el.tagName.toLowerCase();
    if (tag === "noscript") {
      noscriptText += collapse(textOf(el)).length;
      return null;
    }
    if (SKIP.has(tag)) return null;
    if (elementCount >= MAX_ELEMENTS) {
      truncated = true;
      return null;
    }
    elementCount++;
    maxDepth = Math.max(maxDepth, depth);

    const style = attr(el, "style") ?? "";
    if (attr(el, "hidden") !== undefined || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) return null;
    if (tag === "input" && (attr(el, "type") ?? "").toLowerCase() === "hidden") return null;

    const node: SnapshotNode = { tag, text: 0, children: [] };
    if (tag === "font" || tag === "center" || attr(el, "bgcolor") || attr(el, "valign") || (attr(el, "align") && tag !== "img"))
      markup.legacy++;
    const rawClass = attr(el, "class");
    if (rawClass) {
      for (const c of rawClass.split(/\s+/)) {
        if (!c) continue;
        markup.totalClasses++;
        if (UTILITY_RE.test(c)) {
          markup.utilityClasses++;
          readUtilityClass(c, markup);
        }
      }
    }
    const id = attr(el, "id");
    if (id) node.id = id.slice(0, 48);
    const classes = rankClasses(attr(el, "class"));
    if (classes.length) node.classes = classes;

    for (const name of KEEP_ATTRS) {
      const v = attr(el, name);
      if (v !== undefined) (node.attrs ??= {})[name] = v.slice(0, 300);
    }
    if (node.attrs?.href) {
      const resolved = resolveHref(node.attrs.href, base);
      if (resolved) node.attrs.href = resolved;
      else delete node.attrs.href;
    }

    if (style) {
      collectColors(style, colors, 0.5);
      const pos = /position\s*:\s*(fixed|sticky)/i.exec(style);
      if (pos) node.position = pos[1].toLowerCase() as "fixed" | "sticky";
      const bg = /background(?:-image)?\s*:[^;]*url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(style);
      if (bg) node.image = imageUrl(bg[1], base);
    }
    // Legacy presentational attributes (bgcolor="#ff6600" is half of Hacker News' identity).
    for (const legacy of ["bgcolor", "color"]) {
      const v = attr(el, legacy)?.trim();
      if (v) collectColors(/^#|\(/.test(v) ? v : `#${v}`, colors, 4);
    }
    const bgAttr = attr(el, "bgcolor")?.trim();
    const bgStyle = /background(?:-color)?\s*:\s*([^;]+)/i.exec(style)?.[1];
    const bg =
      (bgStyle && firstColor(bgStyle)) ??
      (bgAttr && firstColor(/^#|\(/.test(bgAttr) ? bgAttr : `#${bgAttr}`)) ??
      (tag !== "body" ? matchBackground(backgroundRules, tag, node.id, node.classes) : undefined);
    if (bg) node.bg = bg;
    node.position ??= matchPosition(positionRules, tag, node.id, node.classes) ?? classPosition(classes);

    if (tag === "img") node.image = pickImgSrc(el, base);
    if (tag === "picture") {
      const img = findChild(el, "img");
      node.image = (img && pickImgSrc(img, base)) ?? pickSourceSrc(el, base);
      if (img) node.attrs = { ...node.attrs, alt: attr(img, "alt")?.slice(0, 200) ?? "" };
    }
    if (tag === "video") {
      const poster = attr(el, "poster");
      if (poster) node.image = imageUrl(poster, base);
    }
    if (LABELLED.has(tag)) {
      const t = unrepeat(collapse(textOf(el)));
      if (t) node.sample = t.slice(0, 90);
    }

    let own = "";
    for (const child of el.childNodes) {
      if (child.nodeName !== "#text") continue;
      const t = collapse((child as DefaultTreeAdapterMap["textNode"]).value);
      node.text += t.length;
      if (t && own.length < 80) own = own ? `${own} ${t}` : t;
    }
    if (own) node.own = own.slice(0, 80);

    if (!OPAQUE.has(tag) && depth < MAX_DEPTH) {
      for (const child of el.childNodes) {
        if (!isElement(child)) continue;
        const c = walk(child, depth + 1);
        if (c) node.children.push(c);
      }
    } else if (depth >= MAX_DEPTH) {
      truncated = true;
    }
    if (tag === "select" || tag === "textarea") node.text = 0;
    return node;
  };

  const root = (page.body && walk(page.body, 0)) ?? { tag: "body", text: 0, children: [] };

  const warnings: CaptureWarning[] = [];
  const totalText = sumText(root);
  if (truncated) warnings.push({ code: "truncated", message: `Only the first ${MAX_ELEMENTS.toLocaleString("en")} elements were read.` });
  if (looksLikeSpaShell(root, elementCount, totalText, noscriptText)) {
    warnings.push({
      code: "spa_shell",
      message:
        "This page assembles itself with JavaScript. The city shows only the scaffolding the server sent; the full page needs rendered capture.",
    });
  } else if (elementCount < 25) {
    warnings.push({ code: "few_elements", message: "A very small page — expect a village, not a metropolis." });
  }

  const signals = extractStyleSignals([...page.inlineCss, ...externalCss], markup, document.themeColor);

  return {
    version: 1,
    source: { ...source, fetchedAt: new Date().toISOString() },
    document,
    styles: {
      signals,
      colors: [...colors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 48)
        .map(([hex, weight]) => ({ hex, weight: Math.round(weight * 10) / 10 })),
    },
    stats: { elementCount, maxDepth, truncated },
    root,
    warnings,
  };
}

/* ───────────── helpers ───────────── */

function isElement(n: P5Node): n is P5Element {
  return (n as P5Element).tagName !== undefined;
}

function findChild(parent: P5Parent, tag: string): P5Element | null {
  for (const c of parent.childNodes) if (isElement(c) && c.tagName === tag) return c;
  return null;
}

function* elements(parent: P5Parent): Generator<P5Element> {
  for (const c of parent.childNodes) if (isElement(c)) yield c;
}

function* descendants(parent: P5Parent, limit: number): Generator<P5Element> {
  const stack: P5Node[] = [...parent.childNodes].reverse();
  let n = 0;
  while (stack.length && n++ < limit) {
    const c = stack.pop()!;
    if (!isElement(c)) continue;
    yield c;
    for (let i = c.childNodes.length - 1; i >= 0; i--) stack.push(c.childNodes[i]);
  }
}

function attr(el: P5Element, name: string): string | undefined {
  for (const a of el.attrs) if (a.name === name) return a.value;
  return undefined;
}

function textOf(el: P5Element): string {
  let out = "";
  const stack: P5Node[] = [el];
  let guard = 0;
  while (stack.length && guard++ < 5000 && out.length < 400_000) {
    const n = stack.pop()!;
    if (n.nodeName === "#text") out += (n as DefaultTreeAdapterMap["textNode"]).value;
    else if (isElement(n)) {
      if (n.tagName === "script" || n.tagName === "template") continue;
      // Line breaks and blocks separate words ("Intake<br>and integrations").
      if (/^(br|p|div|li|h[1-6]|section|article|td|th|tr|dt|dd)$/.test(n.tagName)) out += " ";
      for (let i = n.childNodes.length - 1; i >= 0; i--) stack.push(n.childNodes[i]);
    }
  }
  return out;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function sumText(n: SnapshotNode): number {
  let t = n.text;
  for (const c of n.children) t += sumText(c);
  return t;
}

function rankClasses(raw: string | undefined): string[] {
  if (!raw) return [];
  const all = raw.split(/\s+/).filter(Boolean).slice(0, 24);
  const good = all.filter((c) => !UTILITY_RE.test(c) && !HASHY_RE.test(c));
  const rest = all.filter((c) => !good.includes(c));
  return [...good, ...rest].slice(0, 6).map((c) => c.slice(0, 40));
}

function classPosition(classes: string[]): "fixed" | "sticky" | undefined {
  for (const c of classes) {
    if (c === "fixed" || /(^|-)fixed(-top|-bottom)?$/.test(c) || c === "position-fixed") return "fixed";
    if (c === "sticky" || /(^|-)sticky(-top)?$/.test(c) || c === "is-sticky") return "sticky";
  }
  return undefined;
}

export function resolveUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href.trim(), base).toString();
  } catch {
    return undefined;
  }
}

function resolveHref(href: string, base: string): string | undefined {
  const h = href.trim();
  if (!h || /^(javascript|data|vbscript):/i.test(h)) return undefined;
  if (h.startsWith("#")) return h;
  if (/^(mailto|tel):/i.test(h)) return h.slice(0, 120);
  return resolveUrl(h, base);
}

function imageUrl(raw: string, base: string): string | undefined {
  const v = raw.trim();
  if (!v || v.startsWith("data:") || /\.svg(\?|#|$)/i.test(v)) return undefined;
  const abs = resolveUrl(v, base);
  return abs && abs.startsWith("https://") ? abs : undefined;
}

function pickFromSrcset(srcset: string | undefined, base: string): string | undefined {
  if (!srcset) return undefined;
  const candidates = srcset
    .split(/,\s+(?=\S)/)
    .map((c) => {
      const [url, d] = c.trim().split(/\s+/);
      const w = d?.endsWith("w") ? parseInt(d) : d?.endsWith("x") ? parseFloat(d) * 400 : 400;
      return { url, w: Number.isFinite(w) ? w : 400 };
    })
    .filter((c) => c.url);
  if (!candidates.length) return undefined;
  // Billboards are drawn at ~256-512px; aim for something near 640w.
  candidates.sort((a, b) => Math.abs(a.w - 640) - Math.abs(b.w - 640));
  return imageUrl(candidates[0].url, base);
}

function pickImgSrc(img: P5Element, base: string): string | undefined {
  const w = parseInt(attr(img, "width") ?? "");
  const h = parseInt(attr(img, "height") ?? "");
  if ((w >= 0 && w <= 2) || (h >= 0 && h <= 2)) return undefined; // tracking pixels, spacers
  if (/(^|\/)(s|spacer|pixel|blank|clear|transparent|1x1|dot)\.(gif|png)(\?|$)/i.test(attr(img, "src") ?? "")) return undefined;
  for (const lazy of ["data-src", "data-lazy-src", "data-original", "data-url"]) {
    const v = attr(img, lazy);
    if (v) return imageUrl(v, base);
  }
  // srcset usually carries a sharper candidate than src (thumbnails are often 120px).
  const fromSet = pickFromSrcset(attr(img, "data-srcset") ?? attr(img, "srcset"), base);
  if (fromSet) return fromSet;
  const src = attr(img, "src");
  return src && !src.startsWith("data:") ? imageUrl(src, base) : undefined;
}

function pickSourceSrc(picture: P5Element, base: string): string | undefined {
  for (const c of elements(picture)) {
    if (c.tagName !== "source") continue;
    const type = attr(c, "type") ?? "";
    if (type.includes("svg")) continue;
    const u = pickFromSrcset(attr(c, "srcset") ?? attr(c, "data-srcset"), base);
    if (u) return u;
  }
  return undefined;
}

function looksLikeSpaShell(root: SnapshotNode, elementCount: number, text: number, noscriptText: number): boolean {
  const mountIds = new Set(["root", "app", "__next", "___gatsby", "__nuxt", "svelte", "main-app", "application"]);
  const hasMount = root.children.some((c) => (c.id && mountIds.has(c.id)) || c.tag === "app-root" || c.tag.includes("-"));
  if (text < 120 && elementCount < 60) return true;
  if (hasMount && text < 400 && elementCount < 120) return true;
  return noscriptText > 0 && text < noscriptText * 2 && elementCount < 120;
}
