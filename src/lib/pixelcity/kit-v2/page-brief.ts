// FROZEN: detail kit after the massing pass + real-page validation (baseline of the semantic allocation pass). Do not edit.
/**
 * Real page → architectural brief. The bridge the four hand-written profiles stood in for.
 *
 * It reads only facts the pipeline already extracts (semantic regions with their kind,
 * evidence and repeated items; subtree metrics of the normalized DOM; the fingerprint) and
 * applies five general rules. Nothing here knows about any particular site.
 *
 *   B1 ROLE      landmark = the hero region (else the brand). Majors = the districts that hold
 *                at least MAJOR_SHARE of the page (at most MAX_MAJORS, the largest), kept in
 *                reading order. A district holding more than CONTAINER_SHARE of the page is a
 *                container: its own child regions are considered instead. Footer = support.
 *                Every other region outside the landmark and the majors is a minor.
 *   B2 CONTENT   from the region's kind when the semantic pass already named what it is for
 *                (feed → links, gallery → media, pricing → structured, form → action …);
 *                generic kinds (section, features, main, sidebar, hero, brand) are classified
 *                by their subtree metrics: table share, images per 1000 characters, links per
 *                100 characters, controls.
 *   B3 WEIGHT    the region's share of the page's structural weight.
 *   B4 REPEAT    the number of repeated items the semantic pass found (cards, rows, stories).
 *   B5 LABEL     the region's title (or the site name for the landmark).
 *
 * The site identity is the fingerprint itself — not a profile.
 */
import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import type { NormalizedDocument } from "../../model/types";
import type { Region, RegionKind, Semantics } from "../../semantics/analyze";
import type { Brief, Content, Role } from "./brief";

export const MAJOR_SHARE = 0.04;
export const MAX_MAJORS = 5;
export const CONTAINER_SHARE = 0.5;

/** Content thresholds for generic regions (B2). */
export const CONTENT_RULES = { tableShare: 0.3, imagesPerK: 2, minImages: 3, linksPer100: 2.5, minControls: 3 };

const BY_KIND: Partial<Record<RegionKind, Content>> = {
  nav: "links",
  feed: "links",
  directory: "links",
  toc: "links",
  references: "links",
  footer: "links",
  gallery: "media",
  showcase: "media",
  logos: "media",
  cta: "action",
  form: "action",
  pricing: "structured",
  infobox: "structured",
  faq: "text",
  testimonials: "text",
};

/** A brief plus where it came from. */
export interface SourcedBrief extends Brief {
  region: number;
  kind: RegionKind;
  selector: string;
  /** The facts and rules that produced it, in words. */
  why: string[];
  metrics: RegionMetrics;
}

export interface RegionMetrics {
  share: number;
  chars: number;
  links: number;
  images: number;
  controls: number;
  descendants: number;
  tableShare: number;
  items: number;
}

export interface PageProfile {
  identity: SiteFingerprint;
  majors: SourcedBrief[];
  minors: SourcedBrief[];
  /** Regions that produced nothing, and why (containers, inside a major, too small …). */
  skipped: Array<{ region: number; kind: RegionKind; title?: string; why: string }>;
  /** Decisions without a page fact behind them (fallbacks). */
  suspicious: string[];
}

export function pageProfile(doc: NormalizedDocument, sem: Semantics, fp: SiteFingerprint): PageProfile {
  const nodes = doc.nodes;
  const total = nodes[0]?.weight || 1;
  const regions = sem.regions;
  const inside = (a: Region, b: Region) => a.node >= b.node && a.node < nodes[b.node].end;
  const share = (r: Region) => nodes[r.node].weight / total;
  const suspicious: string[] = [];
  const skipped: PageProfile["skipped"] = [];

  const metrics = (r: Region): RegionMetrics => {
    const n = nodes[r.node];
    let inTables = 0;
    for (let k = r.node; k < n.end; k++) if (nodes[k].role === "table") inTables += nodes[k].end - k;
    return { share: share(r), chars: n.chars, links: n.links, images: n.images, controls: n.controls, descendants: n.descendants, tableShare: inTables / Math.max(n.end - r.node, 1), items: r.items.length };
  };

  const contentOf = (r: Region, m: RegionMetrics): { content: Content; why: string } => {
    const k = BY_KIND[r.kind];
    if (k) return { content: k, why: `B2 kind "${r.kind}" → ${k}` };
    const C = CONTENT_RULES;
    const imgK = m.images / Math.max(m.chars / 1000, 1);
    const l100 = m.links / Math.max(m.chars / 100, 1);
    if (m.tableShare >= C.tableShare) return { content: "structured", why: `B2 ${Math.round(m.tableShare * 100)}% of its elements in tables → structured` };
    if (m.images >= C.minImages && imgK >= C.imagesPerK) return { content: "media", why: `B2 ${m.images} images, ${imgK.toFixed(1)} per 1000 chars → media` };
    if (l100 >= C.linksPer100) return { content: "links", why: `B2 ${l100.toFixed(1)} links per 100 chars → links` };
    if (m.controls >= C.minControls && m.controls >= m.links) return { content: "action", why: `B2 ${m.controls} controls → action` };
    return { content: "text", why: `B2 ${m.chars} chars, ${l100.toFixed(1)} links/100 chars, ${m.images} images → text` };
  };

  const brief = (r: Region, role: Role, why: string[], label = r.title): SourcedBrief => {
    const m = metrics(r);
    const c = contentOf(r, m);
    return {
      role,
      content: c.content,
      weight: m.share,
      repeat: r.items.length,
      label: label ? shortLabel(label) : undefined,
      region: r.id,
      kind: r.kind,
      selector: nodes[r.node].selector,
      why: [...why, c.why, `B3 weight ${(m.share * 100).toFixed(1)}% of the page`, `B4 ${r.items.length} repeated items`],
      metrics: m,
    };
  };

  /* B1: landmark */
  const lmRegion = sem.hero >= 0 ? regions[sem.hero] : sem.brand >= 0 ? regions[sem.brand] : null;
  const landmark = lmRegion ? brief(lmRegion, "landmark", [sem.hero >= 0 ? `B1 the hero region → landmark (${lmRegion.evidence[0] ?? ""})` : "B1 no hero; the brand region → landmark"], sem.siteName || lmRegion.title) : null;
  if (!lmRegion) suspicious.push("no hero and no brand: the city has no landmark");

  /* B1: majors — districts, opening containers */
  const candidates: Region[] = [];
  const open = (r: Region, path: string[]) => {
    const kids = regions.filter((c) => c.parent === r.id && share(c) >= MAJOR_SHARE);
    if (share(r) > CONTAINER_SHARE && kids.length) {
      skipped.push({ region: r.id, kind: r.kind, title: r.title, why: `B1 container: ${(share(r) * 100).toFixed(0)}% of the page, opened into ${kids.length} child region(s)` });
      for (const c of kids) open(c, [...path, r.title ?? r.kind]);
      return;
    }
    candidates.push(r);
  };
  for (const d of sem.districts) open(regions[d], []);
  const big = candidates.filter((r) => share(r) >= MAJOR_SHARE && r !== lmRegion);
  const chosen = new Set(
    [...big]
      .sort((a, b) => share(b) - share(a))
      .slice(0, MAX_MAJORS)
      .map((r) => r.id),
  );
  for (const r of big) if (!chosen.has(r.id)) skipped.push({ region: r.id, kind: r.kind, title: r.title, why: `B1 ${(share(r) * 100).toFixed(1)}% but beyond the ${MAX_MAJORS} largest districts → minor` });
  const majorRegions = candidates.filter((r) => chosen.has(r.id)).sort((a, b) => a.node - b.node);
  const majors = majorRegions.map((r) => brief(r, "major", [`B1 district with ${(share(r) * 100).toFixed(1)}% of the page (≥ ${MAJOR_SHARE * 100}%) → major`]));

  /* B1: minors — everything else that is not a container of, or inside, the landmark/majors */
  const owners = [...(lmRegion ? [lmRegion] : []), ...majorRegions];
  const minors: SourcedBrief[] = [];
  // Document order, so a region's parent is seen before it.
  for (const r of [...regions].sort((a, b) => a.node - b.node)) {
    if (r.kind === "page" || r.kind === "main" || r === lmRegion || chosen.has(r.id)) continue;
    const owner = owners.find((o) => inside(r, o));
    if (owner) {
      skipped.push({ region: r.id, kind: r.kind, title: r.title, why: `inside ${owner === lmRegion ? "the landmark" : `major “${owner.title ?? owner.kind}”`}` });
      continue;
    }
    if (owners.some((o) => inside(o, r))) {
      skipped.push({ region: r.id, kind: r.kind, title: r.title, why: "contains the landmark or a major (a wrapper)" });
      continue;
    }
    const parent = r.parent >= 0 ? regions[r.parent] : null;
    if (parent && share(r) >= 0.8 * share(parent) && minors.some((m) => m.region === parent.id)) {
      skipped.push({ region: r.id, kind: r.kind, title: r.title, why: "B1 wrapper: ≥ 80% of its parent region, which is already a minor" });
      continue;
    }
    const support = r.kind === "footer";
    minors.push(brief(r, support ? "support" : "minor", [support ? "B1 footer → support" : `B1 region outside the majors (${(share(r) * 100).toFixed(1)}%) → minor`]));
  }
  minors.sort((a, b) => regions[a.region].node - regions[b.region].node);

  if (!minors.length) {
    // Objective bug otherwise: the kit cycles minors to fill lots and has nothing to cycle.
    const root = nodes[0];
    const l100 = root.links / Math.max(root.chars / 100, 1);
    minors.push({
      role: "minor",
      content: l100 >= CONTENT_RULES.linksPer100 ? "links" : "text",
      weight: 0.02,
      repeat: 0,
      region: -1,
      kind: "page",
      selector: root.selector,
      why: ["FALLBACK: no minor region; the page as a whole, weight fixed at 2%", `${l100.toFixed(1)} links per 100 chars`],
      metrics: { share: 1, chars: root.chars, links: root.links, images: root.images, controls: root.controls, descendants: root.descendants, tableShare: 0, items: 0 },
    });
    suspicious.push("no minor regions: every lot uses one fallback brief built from the whole page");
  }

  return { identity: fp, majors: landmark ? [landmark, ...majors] : majors, minors, skipped, suspicious };
}

function shortLabel(s: string) {
  const w = s
    .replace(/[^\p{L}\p{N} &+-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  let out = "";
  for (const x of w) {
    if ((out + " " + x).trim().length > 12) break;
    out = (out + " " + x).trim();
  }
  return out || w[0]?.slice(0, 12);
}
