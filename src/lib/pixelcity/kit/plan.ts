import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { NormalizedDocument } from "../../model/types";
import type { Region, RegionKind, Semantics } from "../../semantics/analyze";
import { chromeFactors, chromeOf, contentImages, contentWeight, observedBlocks } from "../../semantics/hygiene";
import type { MediaReport } from "../../snapshot/media";
import type { Content } from "./brief";
import { itemsOf, type ItemForm } from "./items";
import { structureOf, type Structure } from "./structure";

export type Comp = "landmark" | "marker" | "continuous" | "parcelled" | "archive" | "grid" | "media" | "interactive" | "navigation" | "support" | "structured";
export type Source = "region" | "remainder" | "page" | "observed";

export interface Metrics {
  chars: number;
  links: number;
  images: number;
  controls: number;
  descendants: number;
  inTables: number;
  items: number;
}

export interface Territory {
  key: string;
  region: number;
  kind: RegionKind | "remainder" | "observed";
  source: Source;
  label?: string;
  weight: number;
  rawWeight: number;
  repeat: number;
  metrics: Metrics;
  tier: number;
  order: number;
  mix: Array<{ comp: Comp; share: number }>;
  content: Content;
  why: string[];
  structure?: Structure;
  items?: ItemForm;
}

export interface Plan {
  identity: SiteFingerprint;
  territories: Territory[];
  hero: number;
  hygiene?: PlanHygiene;
}

export const MIN_SHARE = 0.15;
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

export interface PlanHygiene {
  media?: MediaReport;
  coverage: number;
  fallback: boolean;
  chrome: { before: number; after: number; regions: number };
  merges: Array<{ key: string; label: string; reason: string; weight: number }>;
}

export const COVERAGE_MIN = 0.5;

export function planFromPage(doc: NormalizedDocument, sem: Semantics, fp: SiteFingerprint): Plan {
  const nodes = doc.nodes;
  const rawTotal = nodes[0]?.weight || 1;
  const total = contentWeight(nodes[0]) || 1;
  const regions = sem.regions;
  const kids = new Map<number, Region[]>();
  for (const r of regions) if (r.parent >= 0) kids.set(r.parent, [...(kids.get(r.parent) ?? []), r]);
  const inside = (node: number, outer: number) => node >= outer && node < nodes[outer].end;
  const heroR = sem.hero >= 0 && regions[sem.hero].kind === "hero" ? regions[sem.hero] : null;
  const mainNode = sem.main >= 0 ? regions[sem.main].node : -1;
  const districtNodes = sem.districts.map((d) => regions[d].node);
  const footerNode = sem.footer >= 0 ? regions[sem.footer].node : -1;

  const metricsOfNode = (i: number, items = 0): Metrics => {
    const n = nodes[i];
    let inTables = 0;
    for (let k = i; k < n.end; k++) if (nodes[k].role === "table") inTables += nodes[k].end - k;
    return { chars: n.chars, links: n.links, images: contentImages(n), controls: n.controls, descendants: n.descendants, inTables, items };
  };
  const metricsOf = (r: Region): Metrics => metricsOfNode(r.node, r.items.length);
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
    if (kind === "remainder" || kind === "observed") return 1;
    return 2;
  };

  const merges: PlanHygiene["merges"] = [];
  const out: Territory[] = [];
  const push = (r: Region | null, source: Source, weight: number, rawWeight: number, m: Metrics, why: string[], keySuffix = "", node = r ? r.node : 0, label?: string) => {
    const kind: Territory["kind"] = source === "region" && r ? r.kind : source === "observed" ? "observed" : "remainder";
    let mix: Territory["mix"];
    if (source === "region" && r && BY_KIND[r.kind] && !(r.kind === "hero" && r !== heroR)) {
      mix = [{ comp: BY_KIND[r.kind]!, share: 1 }];
      why.push(`T3 kind “${r.kind}” → ${BY_KIND[r.kind]}`);
    } else {
      mix = softMix(m);
      why.push(`T3 metrics (${m.chars} chars, ${m.links} links, ${m.images} content images, ${m.controls} controls, ${Math.round((m.inTables / Math.max(m.descendants, 1)) * 100)}% in tables) → ${mix.map((x) => `${x.comp} ${Math.round(x.share * 100)}%`).join(" + ")}`);
    }
    const strongest = [...mix].sort((a, b) => b.share - a.share)[0]?.comp ?? "continuous";
    out.push({
      key: r ? keyOf(r) + keySuffix : source === "observed" ? `observed|${nodes[node].selector}${keySuffix}` : "page|body|",
      region: r ? r.id : -1,
      kind,
      source,
      label: label ?? r?.title ?? (source === "page" ? "page" : undefined),
      weight,
      rawWeight,
      repeat: source === "region" && r ? r.items.length : 0,
      metrics: m,
      tier: source === "page" ? 4 : tierOf(node, kind, r),
      order: node + (source === "remainder" ? 0.5 : 0),
      mix,
      content: COMP_CONTENT[strongest],
      why,
    });
    return out.length - 1;
  };

  const mergeReason = (r: Region, children: Region[], m: Metrics, whole: Metrics): string | null => {
    if (m.chars === 0 && m.images === 0 && m.controls === 0) return "empty wrapper: no own text, content images or controls";
    if (m.images === 0 && m.controls === 0 && m.chars <= (r.title?.length ?? 0) + 24) return `only its own heading${r.title ? ` (“${r.title.slice(0, 30)}”)` : ""}`;
    if (children.length === 1 && m.images === 0 && m.chars < 0.1 * whole.chars) return "single-child wrapper: own text under 10% of the region";
    return null;
  };

  const emit = (r: Region): number[] => {
    const w = contentWeight(nodes[r.node]);
    const raw = nodes[r.node].weight / rawTotal;
    const children = (kids.get(r.id) ?? []).sort((a, b) => a.node - b.node);
    if (OPENABLE.has(r.kind) && children.length && r !== heroR) {
      const produced: number[] = [];
      for (const c of children) produced.push(...emit(c));
      const rest = Math.max(0, w - children.reduce((s, c) => s + contentWeight(nodes[c.node]), 0));
      const restRaw = Math.max(0, raw - children.reduce((s, c) => s + nodes[c.node].weight / rawTotal, 0));
      if (rest <= 0) return produced;
      const whole = metricsOf(r);
      const m = minus(whole, children.map(metricsOf));
      const reason = mergeReason(r, children, m, whole);
      if (reason && produced.length) {
        const pw = produced.reduce((s, i) => s + out[i].weight, 0) || 1;
        for (const i of produced) {
          out[i].weight += (rest * out[i].weight) / pw;
          out[i].why.push(`T1b received ${((rest * out[i].weight) / pw / total * 100).toFixed(2)}% from the ${r.kind} “${r.title ?? ""}” (${reason})`);
        }
        merges.push({ key: keyOf(r) + "#rest", label: `${r.kind} “${(r.title ?? "").slice(0, 30)}”`, reason, weight: rest / total });
        return produced;
      }
      const at = push(r, "remainder", rest, restRaw, m, [`T1 own content of the ${r.kind} “${r.title ?? ""}” outside its ${children.length} child region(s)`], "#rest");
      out[at].structure = structureOf(doc, [r.node], children.map((c) => c.node));
      out[at].items = itemsOf(doc, [r.node], children.map((c) => c.node), out[at].structure);
      produced.push(at);
      return produced;
    }
    const at = push(r, "region", w, raw, metricsOf(r), [`T1 ${r.kind} region, ${((w / total) * 100).toFixed(1)}% of the page's content weight${children.length ? ` (typed: not opened, holds ${children.length} region(s))` : ""}`]);
    out[at].structure = structureOf(doc, [r.node], []);
    out[at].items = itemsOf(doc, [r.node], [], out[at].structure);
    return [at];
  };
  const roots = regions.filter((r) => r.parent < 0).sort((a, b) => a.node - b.node);
  for (const r of roots) emit(r);

  const named = out.filter((t) => t.source === "region").reduce((s, t) => s + t.weight, 0);
  const coverage = named / total;
  const coveredW = roots.reduce((s, r) => s + contentWeight(nodes[r.node]), 0);
  const coveredRaw = roots.reduce((s, r) => s + nodes[r.node].weight / rawTotal, 0);
  const fallback = coverage < COVERAGE_MIN;
  const rootRegion: Region = { id: -1, node: 0, kind: "page", importance: 0, evidence: [], parent: -1, children: [], items: [] };
  if (fallback) {
    const blocks = observedBlocks(
      doc,
      roots.map((r) => r.node),
    );
    const coveredInside = (ids: number[]) => roots.filter((r) => ids.some((i) => r.node > i && r.node < nodes[i].end));
    for (const b of blocks) {
      const inner = coveredInside(b.nodes);
      const m = minus(
        b.nodes.map((i) => metricsOfNode(i)).reduce((a, x) => ({ chars: a.chars + x.chars, links: a.links + x.links, images: a.images + x.images, controls: a.controls + x.controls, descendants: a.descendants + x.descendants + 1, inTables: a.inTables + x.inTables, items: 0 })),
        inner.map(metricsOf),
      );
      const raw = (b.nodes.reduce((s, i) => s + nodes[i].weight, 0) - inner.reduce((s, r) => s + nodes[r.node].weight, 0)) / rawTotal;
      const at = push(null, "observed", b.share * total, Math.max(0, raw), m, [`H3 named regions cover ${(coverage * 100).toFixed(0)}% of the content (< ${COVERAGE_MIN * 100}%): observed block — ${b.label}`], `~${blocks.indexOf(b)}`, b.nodes[0], b.label);
      out[at].structure = structureOf(doc, b.nodes, inner.map((r) => r.node));
      out[at].items = itemsOf(doc, b.nodes, inner.map((r) => r.node), out[at].structure);
    }
  } else if (total - coveredW > 0) {
    const at = push(null, "page", total - coveredW, Math.max(0, 1 - coveredRaw), minus(metricsOf(rootRegion), roots.map(metricsOf)), ["T1 page content outside every detected region"]);
    out[at].structure = structureOf(doc, [0], roots.map((r) => r.node));
    out[at].items = itemsOf(doc, [0], roots.map((r) => r.node), out[at].structure);
  }

  const chrome = chromeOf(doc, sem);
  const chromeNodes = [...chrome.keys()].map((id) => regions[id].node);
  const isChrome = (t: Territory) => t.region >= 0 && (chrome.has(t.region) || chromeNodes.some((c) => inside(regions[t.region].node, c)));
  const sum0 = out.reduce((s, t) => s + t.weight, 0) || 1;
  const S = out.filter(isChrome).reduce((s, t) => s + t.weight, 0) / sum0;
  const f = chromeFactors(S);
  for (const t of out) {
    t.weight /= sum0;
    const c = isChrome(t);
    const before = t.weight;
    t.weight *= c ? f.chrome : f.content;
    t.why.push(
      `weights: raw ${(t.rawWeight * 100).toFixed(1)}% → content ${(before * 100).toFixed(1)}%${c ? ` → chrome ×${f.chrome.toFixed(2)} (${chrome.get(t.region) ?? "inside chrome"}; chrome ${(f.before * 100).toFixed(0)}% → ${(f.after * 100).toFixed(0)}%)` : ` → ×${f.content.toFixed(2)} (chrome compression elsewhere)`} = urban ${(t.weight * 100).toFixed(1)}%`,
    );
  }

  const order = out.map((t, i) => i).sort((a, b) => out[a].tier - out[b].tier || out[a].order - out[b].order);
  const territories = order.map((i) => out[i]);
  for (const t of territories) t.why.unshift(`T2 tier ${t.tier} (${["hero", "main content", "chrome", "footer", "page remainder"][t.tier]})`);
  const sum = territories.reduce((s, t) => s + t.weight, 0) || 1;
  for (const t of territories) t.weight /= sum;
  return {
    identity: fp,
    territories,
    hero: heroR ? territories.findIndex((t) => t.region === heroR.id && t.source === "region") : -1,
    hygiene: { media: doc.media, coverage, fallback, chrome: { before: f.before, after: f.after, regions: out.filter(isChrome).length }, merges },
  };
}
