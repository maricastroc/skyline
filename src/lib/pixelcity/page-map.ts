/**
 * The page map: a simplified, recognisable drawing of the ORIGINAL PAGE, built only from what
 * the pipeline already knows — reading order, regions and their territories, headings, link labels, item
 * titles, short snippets, real image URLs, region tints and the page's colours / type.
 * Nothing is invented: a block shows real text when the page model has it, and greeked lines
 * (bars) for text it only counts.
 *
 * The static capture has no layout boxes, so the map is the page in READING ORDER (one
 * column), not a screenshot: each block is one territory of the plan, in document order, its
 * height ∝ the territory's weight (the same weight that buys its land), with a floor so it stays
 * legible small.
 */
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { NNode, NormalizedDocument } from "../model/types";
import type { Semantics } from "../semantics/analyze";
import type { Plan, Territory } from "./kit/plan";

export type PMForm = "bar" | "hero" | "list" | "toc" | "archive" | "text" | "media" | "grid" | "box" | "form" | "footer" | "quotes" | "rest";

export interface PMImage {
  src: string;
  alt?: string;
}

export interface PMBlock {
  /** Territory index in the plan (links the block to its land). */
  t: number;
  kind: string;
  form: PMForm;
  label?: string;
  level?: number;
  weight: number;
  lots: number;
  order: number;
  /** Real short texts: link labels, item titles, toc entries, button labels. */
  lines: string[];
  /** First real sentence of the block's own text. */
  snippet?: string;
  images: PMImage[];
  /** Items the page has (the map shows only some). */
  count: number;
  chars: number;
  links: number;
  controls: number;
  tint?: string;
  /** Composition the territory became (for the explanation). */
  comp: string;
  /** Navigation: its first link when the page title names it (the site's own name). */
  brand?: string;
}

export interface PageMapData {
  host: string;
  title: string;
  /** The site's name as the semantic pass reads it (what the City View card shows). */
  siteName: string;
  theme: { bg: string; fg: string; muted: string; link: string; accent: string; rule: string; serif: boolean; mono: boolean; dark: boolean };
  blocks: PMBlock[];
  totalLots: number;
}

const CHROME = /^\s*(up ?vote|down ?vote|vote|hide|flag|reply|edit|\[ ?edit ?\]|share|more|next|prev(ious)?|menu|close|toggle.*|skip.*|jump.*|navigate.*|open (menu|navigation)|read more|view|go|top|\d+|[^a-z0-9]*)\s*$/i;

const hexRgb = (h: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
};
const lum = (h: string) => {
  const c = hexRgb(h);
  if (!c) return 0.5;
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const chroma = (h: string) => {
  const c = hexRgb(h);
  if (!c) return 0;
  return (Math.max(...c) - Math.min(...c)) / 255;
};
const clean = (s: string | undefined, n = 90) => {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Images go through the capture's signed proxy (`node.image.proxy`); one without it is left out. */
export function buildPageMap(doc: NormalizedDocument, sem: Semantics, fp: SiteFingerprint, plan: Plan, lots: number[]): PageMapData {
  const nodes = doc.nodes;
  const N = nodes.length;

  /* ── theme: the page's own colours and type ── */
  const cols = doc.colors.map((c) => c.hex.toLowerCase()).filter((h) => hexRgb(h));
  const dark = fp.darkness > 0.5;
  const bg =
    doc.style?.pageBg?.toLowerCase() ??
    [...cols.slice(0, 6)].sort((a, b) => (dark ? lum(a) - lum(b) : lum(b) - lum(a)))[0] ??
    (dark ? "#111111" : "#ffffff");
  const neutrals = cols.filter((h) => chroma(h) < 0.12 && h !== bg);
  const fg = [...neutrals].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0] ?? (dark ? "#f2f2f2" : "#111111");
  const muted = neutrals.find((h) => contrast(h, bg) > 2.2 && contrast(h, bg) < contrast(fg, bg) * 0.7) ?? (dark ? "#8a8a8a" : "#777777");
  const rule = neutrals.find((h) => contrast(h, bg) > 1.1 && contrast(h, bg) < 2) ?? (dark ? "#2a2a2a" : "#dddddd");
  const chromatic = cols.filter((h) => chroma(h) >= 0.25);
  const accent = chromatic[0] ?? fg;
  const link = chromatic.find((h) => contrast(h, bg) >= 3) ?? fg;

  /* ── which territory owns each node ── */
  const terrOfRegion = new Map<number, number>();
  plan.territories.forEach((t, i) => {
    if (t.region >= 0 && (t.source === "region" || t.source === "remainder")) terrOfRegion.set(t.region, i);
  });
  const owner = new Int32Array(N).fill(-1);
  const pageRest = plan.territories.findIndex((t) => t.source === "page");
  for (let k = 0; k < N; k++) {
    let r = sem.regionOf[k];
    while (r >= 0 && !terrOfRegion.has(r)) r = sem.regions[r].parent;
    owner[k] = r >= 0 ? terrOfRegion.get(r)! : pageRest;
  }
  const nodesOf = (ti: number) => {
    const out: number[] = [];
    for (let k = 0; k < N; k++) if (owner[k] === ti) out.push(k);
    return out;
  };
  const text = (n: NNode) => n.label ?? n.snippet ?? "";
  const isContentImage = (n: NNode) => !!n.image && !(n.incidentalImages && n.incidentalImages >= n.images) && !/\.svg(\?|$)/i.test(n.image.src);

  /** Title of an item subtree: its first heading, else its longest link label. */
  const itemTitle = (i: number) => {
    const end = nodes[i].end;
    let best = "";
    for (let k = i; k < end; k++) {
      const m = nodes[k];
      if (m.heading) return clean(text(m), 80);
    }
    for (let k = i; k < end; k++) {
      const m = nodes[k];
      const l = m.role === "link" ? (m.label ?? m.snippet ?? "") : "";
      if (l.length > best.length && !CHROME.test(l)) best = l;
      for (const ll of m.linkLabels ?? []) if (ll.length > best.length && !CHROME.test(ll)) best = ll;
    }
    return clean(best || text(nodes[i]), 80);
  };
  const itemImage = (i: number) => {
    for (let k = i; k < nodes[i].end; k++) if (isContentImage(nodes[k])) return nodes[k];
    return null;
  };

  const blocks: PMBlock[] = plan.territories.map((t: Territory, ti) => {
    const r = t.region >= 0 ? sem.regions[t.region] : null;
    const own = nodesOf(ti);
    const ownSet = new Set(own);
    const comp = [...t.mix].sort((a, b) => b.share - a.share)[0]?.comp ?? "continuous";
    // Heading: the territory's label, else its first own heading.
    let label = t.label && t.label !== "page" ? clean(t.label, 70) : undefined;
    let level: number | undefined;
    for (const k of own)
      if (nodes[k].heading) {
        label ??= clean(text(nodes[k]), 70);
        level = nodes[k].heading;
        break;
      }
    if (t.kind === "nav" || t.kind === "footer" || t.kind === "feed" || t.kind === "showcase" || t.kind === "testimonials") label = t.kind === "showcase" || t.kind === "testimonials" ? label : undefined;
    // Link labels, in order (deduped).
    const linkLabels: string[] = [];
    const seen = new Set<string>();
    for (const k of own) {
      const m = nodes[k];
      const ls = m.role === "link" && m.label ? [m.label] : (m.linkLabels ?? []);
      for (const l of ls) {
        const c = clean(l, 40);
        if (!c || CHROME.test(c) || seen.has(c)) continue;
        seen.add(c);
        linkLabels.push(c);
      }
    }
    // Items: the region's repeated items, else the item series found by the plan.
    const items = r ? r.items.filter((k) => ownSet.has(k) || t.source === "region") : [];
    const titles = items.map(itemTitle).filter((s) => s && !CHROME.test(s));
    const images: PMImage[] = [];
    const pushImg = (n: NNode | null) => {
      const src = n?.image?.proxy;
      if (!src || images.some((x) => x.src === src)) return;
      images.push({ src, alt: clean(n.image!.alt, 60) || undefined });
    };
    if (items.length) items.forEach((k) => pushImg(itemImage(k)));
    for (const k of own) if (images.length < 8 && isContentImage(nodes[k])) pushImg(nodes[k]);
    // First own sentence of running text.
    let snippet: string | undefined;
    for (const k of own) {
      const m = nodes[k];
      if (m.role === "text" && m.snippet && m.snippet.length > 60) {
        snippet = clean(m.snippet, 140);
        break;
      }
    }
    // Buttons / controls with a label.
    const buttons: string[] = [];
    for (const k of own) {
      const m = nodes[k];
      if ((m.role === "button" || m.role === "control") && m.label && !CHROME.test(m.label)) buttons.push(clean(m.label, 24));
    }
    const tint = r ? nodes[r.node].tint : undefined;

    let form: PMForm;
    let lines: string[] = [];
    if (t.source === "page") {
      form = "rest";
    } else if (t.kind === "nav" || t.kind === "brand") {
      form = "bar";
      lines = linkLabels.slice(0, 14);
    } else if (t.kind === "footer") {
      form = "footer";
      lines = linkLabels.slice(0, 16);
    } else if (t.kind === "hero") {
      form = "hero";
      lines = buttons.slice(0, 2);
    } else if (t.kind === "toc") {
      form = "toc";
      lines = titles.length ? titles : linkLabels;
    } else if (t.kind === "references" || t.kind === "directory" || comp === "archive") {
      form = "archive";
      const lis: string[] = [];
      for (const k of own) if (nodes[k].tag === "li" && nodes[k].snippet && lis.length < 8) lis.push(clean(nodes[k].snippet, 70));
      lines = lis.length ? lis : linkLabels.slice(0, 8);
    } else if (t.kind === "infobox" || comp === "structured") {
      form = "box";
      lines = linkLabels.slice(0, 6);
    } else if (t.kind === "form" || t.kind === "cta") {
      form = "form";
      lines = buttons.length ? buttons : linkLabels.slice(0, 2);
    } else if (t.kind === "testimonials") {
      form = "quotes";
      lines = titles.length ? titles : [];
    } else if (t.kind === "feed" || comp === "parcelled") {
      form = "list";
      lines = titles.length ? titles : linkLabels;
    } else if (comp === "grid") {
      form = "grid";
      const hs: string[] = [];
      for (const k of own) if (nodes[k].heading && hs.length < 9) hs.push(clean(text(nodes[k]), 70));
      lines = hs.length ? hs : titles.length ? titles : linkLabels.slice(0, 9);
    } else if (comp === "media" || t.kind === "showcase" || t.kind === "gallery" || t.kind === "logos") {
      form = "media";
      const hs: string[] = [];
      for (const k of own) if (nodes[k].heading && hs.length < 8 && nodes[k].heading! >= (level ?? 1)) hs.push(clean(text(nodes[k]), 70));
      lines = titles.length ? titles : hs.slice(label ? 1 : 0);
    } else {
      form = "text";
      const hs: string[] = [];
      for (const k of own) if (nodes[k].heading && hs.length < 6) hs.push(clean(text(nodes[k]), 60));
      lines = hs.slice(1);
    }
    let brand: string | undefined;
    if (form === "bar" && lines[0] && (doc.document.title ?? "").toLowerCase().includes(lines[0].toLowerCase())) {
      brand = lines[0];
      lines = lines.slice(1);
    }
    return {
      brand,
      t: ti,
      kind: t.kind,
      form,
      label,
      level,
      weight: t.weight,
      lots: lots[ti] ?? 0,
      order: t.source === "page" ? N : t.order,
      lines,
      snippet,
      images: images.slice(0, 8),
      count: Math.max(items.length, t.items?.count ?? 0, form === "bar" || form === "footer" ? linkLabels.length : 0),
      chars: t.metrics.chars,
      links: t.metrics.links,
      controls: t.metrics.controls,
      tint,
      comp,
    };
  });
  blocks.sort((a, b) => a.order - b.order);

  let host = "";
  try {
    host = new URL(doc.source.finalUrl).hostname.replace(/^www\./, "");
  } catch {}
  return {
    host,
    title: doc.document.title ?? host,
    siteName: sem.siteName || host,
    theme: { bg, fg, muted, link, accent, rule, serif: fp.type.serif > 0.3, mono: fp.type.mono > 0.3, dark },
    // Territories with no land (a brand mark, say) still belong to the page.
    blocks,
    totalLots: lots.reduce((s, v) => s + v, 0),
  };
}
