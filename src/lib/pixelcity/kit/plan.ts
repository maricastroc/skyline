/**
 * Semantic allocation, step 1: a page → an ordered list of TERRITORIES that partition it.
 *
 * Every territory is a piece of the page with a weight (its share of the page's structural
 * weight) and a COMPOSITION MIX (what urban organisation it becomes). Weights sum to 1, so
 * the city can hand out land in proportion to them (territory.ts).
 *
 *   T1 PARTITION   The semantic regions form a tree. Generic containers (main, section,
 *                  sidebar) that have child regions are opened: each child becomes a territory
 *                  and the container keeps a REMAINDER territory for its own content. Typed
 *                  regions (feed, gallery, pricing, hero …) are never opened: they are one
 *                  organisation. Content outside every region is the PAGE remainder.
 *   T2 ORDER       Territories follow the page's reading order inside four tiers: the hero,
 *                  then the main content (inside <main> or a semantic district), then the
 *                  chrome (navigation, forms, brand, sidebars), then the footer; the page
 *                  remainder last. Order decides placement along the city's path (centre
 *                  first), never size.
 *   T3 COMPOSITION Structural kinds map to one organisation:
 *                    hero → landmark · brand → marker · feed → parcelled · toc / references /
 *                    directory → archive · nav → navigation · footer → support ·
 *                    pricing → grid · infobox → structured · form / cta → interactive
 *                  Generic regions, remainders AND the kinds the semantic pass itself decides
 *                  by a content ratio (gallery / showcase / logos: < 140 chars per image;
 *                  faq / testimonials: the fall-through when that ratio fails) are classified
 *                  by their metrics with SOFT gates (logistic around the validation-round
 *                  thresholds): a region close to a threshold becomes a mixture, and a ±10%
 *                  change moves the mix a little instead of flipping the whole territory (or
 *                  the whole city, when the region is most of the page). Shares under
 *                  MIN_SHARE are dropped.
 *
 * Nothing here knows any particular site.
 */
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { NormalizedDocument } from "../../model/types";
import type { Region, RegionKind, Semantics } from "../../semantics/analyze";
import type { Content } from "./brief";

export type Comp = "landmark" | "marker" | "continuous" | "parcelled" | "archive" | "grid" | "media" | "interactive" | "navigation" | "support" | "structured";
export type Source = "region" | "remainder" | "page";

export interface Metrics {
  chars: number;
  links: number;
  images: number;
  controls: number;
  descendants: number;
  /** Elements inside tables (absolute count, so remainders can subtract). */
  inTables: number;
  items: number;
}

export interface Territory {
  /** Stable identity across runs and perturbations: selector + title (+ "~n" repeat). */
  key: string;
  region: number;
  kind: RegionKind | "remainder";
  source: Source;
  label?: string;
  /** Share of the page (all territories sum to 1). */
  weight: number;
  repeat: number;
  metrics: Metrics;
  tier: number;
  /** Document order (node index of the region). */
  order: number;
  mix: Array<{ comp: Comp; share: number }>;
  /** The content class used for styling (programFor): the strongest of the mix. */
  content: Content;
  why: string[];
}

export interface Plan {
  identity: SiteFingerprint;
  territories: Territory[];
  /** Index (in `territories`) of the hero, if the page has a real hero (with an <h1>). */
  hero: number;
}

export const MIN_SHARE = 0.15;
/** Soft-gate width in log space: ±16% around a threshold ≈ 26/74 split. */
const TAU = 0.15;
const OPENABLE = new Set<RegionKind>(["main", "section", "sidebar", "page"]);
const BY_KIND: Partial<Record<RegionKind, Comp>> = {
  hero: "landmark",
  brand: "marker",
  feed: "parcelled",
  toc: "archive",
  references: "archive",
  directory: "archive",
  nav: "navigation",
  footer: "support",
  pricing: "grid",
  infobox: "structured",
  form: "interactive",
  cta: "interactive",
};
const COMP_CONTENT: Record<Comp, Content> = {
  landmark: "media",
  marker: "text",
  continuous: "text",
  parcelled: "links",
  archive: "links",
  grid: "structured",
  media: "media",
  interactive: "action",
  navigation: "links",
  support: "links",
  structured: "structured",
};

const sig = (v: number) => 1 / (1 + Math.exp(-v));
const lg = (v: number) => Math.log(Math.max(v, 1e-6));

/**
 * Soft content mix of a generic piece of page, from its metrics. Sequential gates in the same
 * order and at the same thresholds as the validation round's B2 rule (tables 30%, ≥ 3 images
 * and ≥ 2 per 1000 chars, ≥ 2.5 links per 100 chars, ≥ 3 controls), but logistic instead of
 * step, so the boundary is a gradient.
 */
export function softMix(m: Metrics): Array<{ comp: Comp; share: number }> {
  const tableShare = m.inTables / Math.max(m.descendants, 1);
  const imgK = m.images / Math.max(m.chars / 1000, 1);
  const l100 = m.links / Math.max(m.chars / 100, 1);
  const s = sig((tableShare - 0.3) / 0.05);
  const md = sig((lg(imgK) - lg(2)) / TAU) * sig((m.images - 2.5) / 0.5);
  const l = sig((lg(l100) - lg(2.5)) / TAU);
  const a = sig((m.controls - 2.5) / 0.5) * sig((m.controls - m.links) / 1);
  const raw: Array<{ comp: Comp; share: number }> = [
    { comp: "structured", share: s },
    { comp: "media", share: (1 - s) * md },
    { comp: "parcelled", share: (1 - s) * (1 - md) * l },
    { comp: "interactive", share: (1 - s) * (1 - md) * (1 - l) * a },
    { comp: "continuous", share: (1 - s) * (1 - md) * (1 - l) * (1 - a) },
  ];
  const kept = raw.filter((x) => x.share >= MIN_SHARE);
  const t = kept.reduce((v, x) => v + x.share, 0) || 1;
  return kept.map((x) => ({ comp: x.comp, share: x.share / t }));
}

/**
 * Stable identity of every region: selector + title, with "~n" for the n-th repeat in document
 * order (nested wrappers often share both). The kind is NOT part of it: a region the semantic
 * pass re-labels (showcase → faq) is still the same piece of the page, with the same colour.
 */
export function regionKeys(doc: NormalizedDocument, sem: Semantics): Map<number, string> {
  const seen = new Map<string, number>();
  const out = new Map<number, string>();
  for (const r of [...sem.regions].sort((a, b) => a.node - b.node)) {
    const base = `${doc.nodes[r.node].selector}|${(r.title ?? "").slice(0, 40)}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.set(r.id, n ? `${base}~${n}` : base);
  }
  return out;
}

export function planFromPage(doc: NormalizedDocument, sem: Semantics, fp: SiteFingerprint): Plan {
  const nodes = doc.nodes;
  const total = nodes[0]?.weight || 1;
  const regions = sem.regions;
  const kids = new Map<number, Region[]>();
  for (const r of regions) if (r.parent >= 0) kids.set(r.parent, [...(kids.get(r.parent) ?? []), r]);
  const inside = (node: number, outer: number) => node >= outer && node < nodes[outer].end;
  const heroR = sem.hero >= 0 && regions[sem.hero].kind === "hero" ? regions[sem.hero] : null;
  const mainNode = sem.main >= 0 ? regions[sem.main].node : -1;
  const districtNodes = sem.districts.map((d) => regions[d].node);
  const footerNode = sem.footer >= 0 ? regions[sem.footer].node : -1;

  const metricsOf = (r: Region): Metrics => {
    const n = nodes[r.node];
    let inTables = 0;
    for (let k = r.node; k < n.end; k++) if (nodes[k].role === "table") inTables += nodes[k].end - k;
    return { chars: n.chars, links: n.links, images: n.images, controls: n.controls, descendants: n.descendants, inTables, items: r.items.length };
  };
  const minus = (a: Metrics, bs: Metrics[]): Metrics => ({
    chars: Math.max(0, a.chars - bs.reduce((s, b) => s + b.chars, 0)),
    links: Math.max(0, a.links - bs.reduce((s, b) => s + b.links, 0)),
    images: Math.max(0, a.images - bs.reduce((s, b) => s + b.images, 0)),
    controls: Math.max(0, a.controls - bs.reduce((s, b) => s + b.controls, 0)),
    descendants: Math.max(0, a.descendants - bs.reduce((s, b) => s + b.descendants + 1, 0)),
    inTables: Math.max(0, a.inTables - bs.reduce((s, b) => s + b.inTables, 0)),
    items: 0,
  });
  const keys = regionKeys(doc, sem);
  const keyOf = (r: Region) => keys.get(r.id)!;
  const tierOf = (node: number, kind: Territory["kind"], region: Region | null) => {
    if (region && region === heroR) return 0;
    if (footerNode >= 0 && inside(node, footerNode)) return 3;
    if (mainNode >= 0 && inside(node, mainNode)) return 1;
    if (districtNodes.some((d) => inside(node, d) || inside(d, node))) return 1;
    if (kind === "remainder") return 1;
    return 2;
  };

  const out: Territory[] = [];
  const push = (r: Region | null, source: Source, weight: number, m: Metrics, why: string[], keySuffix = "") => {
    const kind: Territory["kind"] = source === "region" && r ? r.kind : "remainder";
    let mix: Territory["mix"];
    if (source === "region" && r && BY_KIND[r.kind] && !(r.kind === "hero" && r !== heroR)) {
      mix = [{ comp: BY_KIND[r.kind]!, share: 1 }];
      why.push(`T3 kind “${r.kind}” → ${BY_KIND[r.kind]}`);
    } else {
      mix = softMix(m);
      why.push(`T3 metrics (${m.chars} chars, ${m.links} links, ${m.images} images, ${m.controls} controls, ${Math.round((m.inTables / Math.max(m.descendants, 1)) * 100)}% in tables) → ${mix.map((x) => `${x.comp} ${Math.round(x.share * 100)}%`).join(" + ")}`);
    }
    const strongest = [...mix].sort((a, b) => b.share - a.share)[0]?.comp ?? "continuous";
    const node = r ? r.node : 0;
    out.push({
      key: r ? keyOf(r) + keySuffix : "page|body|",
      region: r ? r.id : -1,
      kind,
      source,
      label: r?.title ?? (source === "page" ? "page" : undefined),
      weight,
      repeat: source === "region" && r ? r.items.length : 0,
      metrics: m,
      tier: source === "page" ? 4 : tierOf(node, kind, r),
      order: node + (source === "remainder" ? 0.5 : 0),
      mix,
      content: COMP_CONTENT[strongest],
      why,
    });
  };

  const emit = (r: Region) => {
    const w = nodes[r.node].weight / total;
    const children = (kids.get(r.id) ?? []).sort((a, b) => a.node - b.node);
    if (OPENABLE.has(r.kind) && children.length && r !== heroR) {
      for (const c of children) emit(c);
      const rest = Math.max(0, w - children.reduce((s, c) => s + nodes[c.node].weight / total, 0));
      if (rest > 0) push(r, "remainder", rest, minus(metricsOf(r), children.map(metricsOf)), [`T1 own content of the ${r.kind} “${r.title ?? ""}” outside its ${children.length} child region(s)`], "#rest");
      return;
    }
    push(r, "region", w, metricsOf(r), [`T1 ${r.kind} region, ${(w * 100).toFixed(1)}% of the page${children.length ? ` (typed: not opened, holds ${children.length} region(s))` : ""}`]);
  };
  const roots = regions.filter((r) => r.parent < 0).sort((a, b) => a.node - b.node);
  for (const r of roots) emit(r);
  const covered = roots.reduce((s, r) => s + nodes[r.node].weight / total, 0);
  if (1 - covered > 0) {
    const root: Region = { id: -1, node: 0, kind: "page", importance: 0, evidence: [], parent: -1, children: [], items: [] };
    push(null, "page", 1 - covered, minus(metricsOf(root), roots.map(metricsOf)), ["T1 page content outside every detected region"]);
  }

  // T2: tiers, then reading order.
  const order = out.map((t, i) => i).sort((a, b) => out[a].tier - out[b].tier || out[a].order - out[b].order);
  const territories = order.map((i) => out[i]);
  for (const t of territories) t.why.unshift(`T2 tier ${t.tier} (${["hero", "main content", "chrome", "footer", "page remainder"][t.tier]})`);
  const sum = territories.reduce((s, t) => s + t.weight, 0) || 1;
  for (const t of territories) t.weight /= sum;
  return { identity: fp, territories, hero: heroR ? territories.findIndex((t) => t.region === heroR.id && t.source === "region") : -1 };
}
