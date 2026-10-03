import type { NNode, NormalizedDocument } from "../model/types";

/**
 * Semantic regions: what each part of the page *is for*, inferred from tag + position + size
 * + content + headings + class/ARIA names. Never from tag alone.
 *
 * Every region carries `evidence`: short human sentences that justify the inference. The city
 * turns regions into urban forms; the inspector shows the evidence when a landmark is clicked,
 * so any important structure can answer "why does this exist here?".
 */
export type RegionKind =
  | "page"
  | "brand"
  | "nav"
  | "hero"
  | "cta"
  | "main"
  | "section"
  | "features"
  | "pricing"
  | "gallery"
  | "logos"
  | "testimonials"
  | "faq"
  | "feed"
  | "directory"
  | "showcase"
  | "toc"
  | "infobox"
  | "references"
  | "sidebar"
  | "form"
  | "footer";

export interface Region {
  id: number;
  node: number;
  kind: RegionKind;
  title?: string;
  importance: number;
  evidence: string[];
  parent: number;
  children: number[];
  /** Repeated items (cards, tiers, stories, images, links) as node ids. */
  items: number[];
}

export interface Semantics {
  siteName: string;
  regions: Region[];
  /** Innermost region containing each node. */
  regionOf: Int32Array;
  hero: number;
  nav: number;
  brand: number;
  footer: number;
  main: number;
  /** Major regions laid out along the avenue, in reading order. */
  districts: number[];
  sidebars: number[];
  /** CTA regions in the hero, if any. */
  ctas: number[];
}

const PRICE_RE = /(?:[$€£¥]|R\$|US\$)\s?\d|\d+(?:[.,]\d+)?\s?(?:[$€£]|\/\s?(?:mo|month|mês|user|seat|yr|year)|per (?:month|user|seat|year))|\bfree\b/i;
const CTA_RE = /^(get started|start( (building|now|free|for free|today|your))?|sign ?up|try( it)?( for)?( free)?|download|book( a)? (demo|call)|request( a)? demo|contact( sales| us)?|buy|join|subscribe|create( an)? account|get (the app|a demo|in touch|access)|learn more|see (pricing|plans)|open app|log ?in to|deploy)/i;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const q = (s?: string, n = 42) => (s ? `“${s.length > n ? `${s.slice(0, n - 1)}…` : s}”` : "");

export function analyzeSemantics(doc: NormalizedDocument): Semantics {
  const nodes = doc.nodes;
  const N = nodes.length;
  const total = nodes[0]?.weight || 1;
  const pos = (i: number) => i / Math.max(N - 1, 1);
  const names = (n: NNode) => n.names ?? "";
  const share = (n: NNode) => n.weight / total;
  const text = (n: NNode) => `${n.label ?? ""} ${n.snippet ?? ""}`;
  const inside = (i: number, outer: number) => i >= outer && i < nodes[outer].end;

  const regions: Region[] = [];
  const taken = new Map<number, Region>();
  const add = (node: number, kind: RegionKind, evidence: string[], extra: Partial<Region> = {}): Region => {
    const existing = taken.get(node);
    if (existing) {
      if (kindPriority(kind) > kindPriority(existing.kind)) {
        existing.kind = kind;
        existing.evidence = [...evidence, ...existing.evidence].slice(0, 6);
        Object.assign(existing, extra);
      }
      return existing;
    }
    const r: Region = { id: regions.length, node, kind, evidence, parent: -1, children: [], items: [], importance: 0, ...extra };
    regions.push(r);
    taken.set(node, r);
    return r;
  };

  /* helpers over subtrees */
  const firstHeading = (i: number) => {
    let best: NNode | null = null;
    for (let k = i; k < nodes[i].end; k++) {
      const m = nodes[k];
      if (m.heading && (!best || m.heading < best.heading!)) best = m;
      if (best?.heading === 1) break;
    }
    return best;
  };
  const sigOf = (n: NNode) => `${n.tag}${/\.[^.#\s]+/.exec(n.selector)?.[0] ?? ""}`;
  const repeated = (i: number) => {
    const groups = new Map<string, number[]>();
    for (const c of nodes[i].children) {
      const k = sigOf(nodes[c]);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }
    let best: number[] = [];
    for (const g of groups.values()) if (g.length > best.length) best = g;
    return best;
  };
  const countIn = (i: number, pred: (m: NNode) => boolean) => {
    let c = 0;
    for (let k = i; k < nodes[i].end; k++) if (pred(nodes[k])) c++;
    return c;
  };
  const collectIn = (i: number, pred: (m: NNode) => boolean, max = 8) => {
    const out: NNode[] = [];
    for (let k = i; k < nodes[i].end && out.length < max; k++) if (pred(nodes[k])) out.push(nodes[k]);
    return out;
  };

  /* ── site name ── */
  let host = "";
  try {
    host = new URL(doc.source.finalUrl).hostname.replace(/^www\./, "");
  } catch {}
  const hostRoot = host.split(".").slice(-2, -1)[0] ?? host;
  const siteName = (() => {
    if (doc.document.siteName) return doc.document.siteName;
    const parts = (doc.document.title || "").split(/\s+[|–—\-·:]\s+/).map((s) => s.trim()).filter(Boolean);
    const byHost = parts.find((p) => p.toLowerCase().replace(/\s+/g, "").includes(hostRoot.toLowerCase()));
    if (byHost) return byHost;
    if (parts.length === 1 && parts[0].length <= 28) return parts[0];
    if (parts.length > 1) return [...parts].sort((a, b) => a.length - b.length)[0];
    return hostRoot.charAt(0).toUpperCase() + hostRoot.slice(1);
  })();

  /* ── footer ── */
  let footer: Region | null = null;
  {
    let best: { i: number; score: number; ev: string[] } | null = null;
    for (let i = 1; i < N; i++) {
      const n = nodes[i];
      if (pos(i) < 0.55 || n.level > 5 || share(n) > 0.35) continue;
      const ev: string[] = [];
      let score = 0;
      if (n.role === "footer") {
        score += 4;
        ev.push(n.tag === "footer" ? "a <footer> element" : "role=contentinfo");
      } else if (/(^|[\s_-])(footer|colophon|site-?info)([\s_-]|$)/.test(names(n))) {
        score += 3;
        ev.push(`class/id ${q(names(n).split(" ").find((x) => /footer|colophon|info/.test(x)))}`);
      }
      if (countIn(i, (m) => /©|copyright|all rights reserved/i.test(text(m))) > 0) {
        score += 1.5;
        ev.push("contains a © / copyright line");
      }
      if (pos(i) > 0.85 && n.links >= 4 && n.chars < n.links * 30 && !n.children.some((c) => nodes[c].children.length > 12)) {
        score += 1.5;
        ev.push(`${n.links} short links at the very end of the page`);
      }
      if (score >= 1.5) {
        score += share(n) * 4; // prefer the outermost footer, not its icon strip
        if (!best || score > best.score) best = { i, score, ev };
      }
    }
    if (best) {
      best.ev.push(`sits at the end of the page (last ${pct(1 - pos(best.i))})`);
      footer = add(best.i, "footer", best.ev);
    }
  }

  /* ── nav (and table of contents) ── */
  let nav: Region | null = null;
  const navCandidates: Array<{ i: number; score: number; ev: string[] }> = [];
  for (let i = 1; i < N; i++) {
    const n = nodes[i];
    if (n.links < 3 || share(n) > 0.25) continue;
    if (footer && inside(i, footer.node)) continue;
    const anchors = countIn(i, (m) => m.link?.kind === "anchor");
    const linkNodes = countIn(i, (m) => m.role === "link" || !!m.link);
    const avgLabel = collectIn(i, (m) => !!m.link && !!m.label, 12).reduce((s, m) => s + (m.label?.length ?? 0), 0) / Math.max(1, Math.min(12, linkNodes));
    if (anchors >= 5 && anchors / Math.max(n.links, 1) > 0.55) {
      const tocish = /toc|contents|table-of-contents/.test(names(n)) || /contents/i.test(firstHeading(i)?.label ?? "");
      if (n.role === "nav" || n.role === "list" || tocish) {
        const ev = [`${anchors} of its ${n.links} links jump within the page (#anchors)`];
        if (tocish) ev.push(`named ${q(names(n).split(" ")[0])}`);
        const r = add(i, "toc", ev, { items: collectIn(i, (m) => m.link?.kind === "anchor", 40).map((m) => m.id) });
        r.title = "Contents";
        i = n.end - 1;
        continue;
      }
    }
    let score = 0;
    const ev: string[] = [];
    if (n.role === "nav") {
      score += 3;
      ev.push(n.tag === "nav" ? "a <nav> element" : "role=navigation / nav class");
    }
    if (pos(i) < 0.15) {
      score += 2;
      ev.push(`near the top of the page (first ${pct(pos(i) || 0.01)})`);
    }
    if (avgLabel > 0 && avgLabel < 16 && n.links >= 4) {
      score += 1.5;
      ev.push(`${n.links} short links (avg ${Math.round(avgLabel)} chars)`);
    }
    if (n.chars < n.links * 22) score += 1;
    if (score >= 3.5) navCandidates.push({ i, score: score + Math.min(n.links, 12) / 12, ev });
  }
  navCandidates.sort((a, b) => b.score - a.score);
  if (navCandidates[0]) {
    const c = navCandidates[0];
    nav = add(c.i, "nav", c.ev, {
      items: collectIn(c.i, (m) => !!m.link && !!m.label && m.label.length < 28, 10).map((m) => m.id),
    });
  }

  /* ── brand ── */
  let brand: Region | null = null;
  const mainNode = nodes.find((n) => n.role === "main" && share(n) > 0.15);
  {
    const top = Math.max(8, Math.floor(N * 0.12));
    const sn = siteName.toLowerCase();
    let best: { i: number; score: number; ev: string[] } | null = null;
    for (let i = 1; i < Math.min(top, N); i++) {
      const n = nodes[i];
      if (share(n) > 0.1) continue;
      const nm = names(n);
      const lab = `${n.label ?? ""} ${n.snippet ?? ""}`.toLowerCase();
      const ev: string[] = [];
      let score = 0;
      if (/logo|brand|wordmark|site-?name|site-?title|home-?link|hnname/.test(nm)) {
        score += 2;
        ev.push(`class/id ${q(nm.split(" ").find((x) => /logo|brand|word|name|title|home/.test(x)) ?? nm)}`);
      }
      if (/^\/(home|homepage|index(\.html?)?)?$/.test(n.link?.path ?? "-") || /^(go |navigate )?(to )?home( page)?$/i.test(n.label ?? "")) {
        score += 1.5;
        ev.push(`links to the home page (${q(n.link?.path || "/")})`);
      }
      if (sn && lab.includes(sn)) {
        score += 2;
        ev.push(`its text matches the site name ${q(siteName)}`);
      }
      if (mainNode && inside(i, mainNode.id)) score -= 3; // a product mockup inside the page isn't the brand
      if (score >= 2 && (!best || score > best.score)) best = { i, score, ev };
    }
    if (best) {
      best.ev.push(`in the first ${pct(pos(best.i) || 0.01)} of the page`);
      brand = add(best.i, "brand", best.ev, { title: siteName });
    }
  }

  /* ── main ── */
  let main: Region | null = null;
  {
    const m = nodes.find((n) => n.role === "main" && share(n) > 0.15);
    if (m) main = add(m.id, "main", [m.tag === "main" ? "the <main> element" : "role=main / main content container", `holds ${pct(share(m))} of the page`]);
  }

  /* ── hero ── */
  let hero: Region | null = null;
  const h1 = nodes.find((n) => n.heading === 1);
  {
    const candidates: Array<{ i: number; score: number; ev: string[] }> = [];
    for (let i = 1; i < N; i++) {
      const n = nodes[i];
      if (!n.children.length || share(n) > 0.4 || pos(i) > 0.45) continue;
      const ev: string[] = [];
      let score = 0;
      const hasH1 = h1 && inside(h1.id, i);
      if (hasH1) {
        score += 3;
        ev.push(`contains the page's <h1> ${q(h1!.label)}`);
      }
      if (/(^|[\s_-])(hero|banner|jumbotron|masthead|intro|splash|landing|headline|above-the-fold|page-?header|titlebar|firstheading)([\s_-]|$)/.test(names(n))) {
        score += 3;
        ev.push(`class/id ${q(names(n).split(" ").find((x) => /hero|banner|jumbo|mast|intro|splash|landing|headline|fold|header|titlebar|heading/.test(x)))}`);
      }
      const ctas = collectIn(i, (m) => (m.role === "button" || !!m.link) && CTA_RE.test(m.label ?? ""), 3);
      if (ctas.length) {
        score += 1.5;
        ev.push(`${ctas.length} call-to-action${ctas.length > 1 ? "s" : ""}: ${ctas.map((c) => q(c.label, 22)).join(", ")}`);
      }
      if (n.images > 0) score += 0.5;
      if (score >= 3) {
        ev.push(`starts in the first ${pct(pos(i) || 0.01)} of the page`);
        // Prefer the smallest container that still has the h1 and something else.
        candidates.push({ i, score: score - share(n) * 4 + (n.children.length >= 2 ? 0.5 : 0), ev });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const c = candidates[0];
    if (c) {
      // Grow to the enclosing block when it is the same hero (same h1, still a modest share).
      let i = c.i;
      for (let p = nodes[i].parent; p > 0; p = nodes[p].parent) {
        const pn = nodes[p];
        if (pn.role === "main" || pn.role === "root" || share(pn) > 0.3 || pn.children[0] !== i) break;
        i = p;
      }
      if (i !== c.i) c.ev.push(`together with the block around it (${q(nodes[i].selector, 28)})`);
      hero = add(i, "hero", c.ev, { title: h1?.label ?? firstHeading(i)?.label });
    } else if (brand) {
      hero = brand;
      brand.evidence.unshift("no <h1> on the page: the site name is its monument");
    }
  }

  /* ── CTAs ── */
  const ctas: Region[] = [];
  {
    const scope = hero ? hero.node : 0;
    for (const m of collectIn(scope, (m) => (m.role === "button" || !!m.link) && CTA_RE.test(m.label ?? ""), 2)) {
      ctas.push(add(m.id, "cta", [`a button/link reading ${q(m.label)}`, hero ? "inside the hero" : "a primary action"], { title: m.label }));
    }
  }

  /* ── specialised blocks, anywhere ── */
  const claimed = () => regions.filter((r) => r.kind === "toc" || r.kind === "nav" || r.kind === "footer");
  for (let i = 1; i < N; i++) {
    const n = nodes[i];
    if (taken.has(i) || !n.children.length || share(n) < 0.006 || share(n) > 0.97) continue;
    const owner = claimed().find((r) => inside(i, r.node) && r.node !== i);
    if (owner) {
      i = nodes[owner.node].end - 1;
      continue;
    }
    const containsHero = hero ? inside(hero.node, i) && hero.node !== i : false;
    const nm = names(n);
    const head = firstHeading(i);
    const ht = head?.label ?? "";
    const items = repeated(i);

    // infobox (Wikipedia-style summary box)
    if (/(^|[\s_-])(infobox|vcard|summary-?box|sidebar-?box|factbox)([\s_-]|$)/.test(nm)) {
      add(i, "infobox", [`class ${q(nm.split(" ").find((x) => /infobox|vcard|summary|sidebar|fact/.test(x)))}`, n.images ? `with ${n.images} image${n.images > 1 ? "s" : ""}` : "a summary table"], { title: n.label ?? "Infobox" });
      i = n.end - 1;
      continue;
    }
    // references / notes
    if (/(^|[\s_-])(references|reflist|footnotes|citations|refs|notes)([\s_-]|$)/.test(nm) || (/^(references|notes|sources|bibliography|citations|footnotes)$/i.test(ht) && head && inside(head.id, i) && head.id - i < 4)) {
      add(i, "references", [/references|reflist|footnotes|citations|notes/.test(nm) ? `class ${q(nm.split(" ")[0])}` : `heading ${q(ht)}`, `${n.descendants} elements, ${n.links} links`], { title: ht || "References", items: items.slice(0, 60) });
      i = n.end - 1;
      continue;
    }
    // pricing
    const prices = collectIn(i, (m) => PRICE_RE.test(text(m)), 6);
    if ((prices.length >= 2 && items.length >= 2) || /(^|[\s_-])(pricing|plans|tiers|price-?table)([\s_-]|$)/.test(nm) || /^(pricing|plans|choose your plan)/i.test(ht)) {
      if (prices.length >= 1) {
        add(i, "pricing", [
          prices.length ? `${prices.length} prices: ${prices.slice(0, 3).map((p) => q((PRICE_RE.exec(text(p))?.[0] ?? "").trim(), 10)).join(", ")}` : `heading ${q(ht)}`,
          items.length >= 2 ? `${items.length} sibling plans` : "",
        ].filter(Boolean), { title: ht || "Pricing", items: items.length >= 2 ? items.slice(0, 5) : prices.map((p) => p.id).slice(0, 4) });
        i = n.end - 1;
        continue;
      }
    }
    // gallery (explicit, or an image grid) vs showcase (product sections rich in images)
    if (!containsHero && n.images >= 4 && n.chars / Math.max(n.images, 1) < 140) {
      const logo = /(^|[\s_-])(logos?|customers|clients|partners|brands|trusted|companies|integrations)([\s_-]|$)/.test(nm) || /trusted|customers|used by|companies|integrations/i.test(ht);
      const explicit = /(^|[\s_-])(gallery|carousel|slider|photos|images|media)([\s_-]|$)/.test(nm) || /gallery|photos|images|screenshots/i.test(ht);
      const grid = items.length >= 4 && items.filter((c) => nodes[c].images > 0).length >= items.length * 0.8 && n.chars / n.images < 80;
      const kind: RegionKind = logo ? "logos" : explicit || grid ? "gallery" : "showcase";
      add(i, kind, [`${n.images} images, ${Math.round(n.chars / n.images)} characters of text per image`, ht ? `heading ${q(ht)}` : nm ? `class ${q(nm.split(" ")[0])}` : ""].filter(Boolean), {
        title: ht || (logo ? "Customers" : kind === "gallery" ? "Gallery" : "Showcase"),
        items: collectIn(i, (m) => !!m.image, 16).map((m) => m.id),
      });
      i = n.end - 1;
      continue;
    }
    // testimonials / faq
    if (/(^|[\s_-])(testimonials?|quotes?|reviews?)([\s_-]|$)/.test(nm) || countIn(i, (m) => m.tag === "blockquote") >= 2 || /what .* say|testimonials|reviews|loved by/i.test(ht)) {
      add(i, "testimonials", [countIn(i, (m) => m.tag === "blockquote") >= 2 ? `${countIn(i, (m) => m.tag === "blockquote")} quotes` : `named ${q(nm.split(" ")[0] || ht)}`], { title: ht || "Testimonials", items: items.slice(0, 6) });
      i = n.end - 1;
      continue;
    }
    if (/(^|[\s_-])faq([\s_-]|$)/.test(nm) || /faq|frequently asked|questions/i.test(ht) || countIn(i, (m) => m.tag === "summary") >= 3) {
      add(i, "faq", [ht ? `heading ${q(ht)}` : "question/answer pairs"], { title: ht || "FAQ", items: items.slice(0, 8) });
      i = n.end - 1;
      continue;
    }
    // feed (stories, posts, results) vs link directory (lists of bare links)
    if (items.length >= 6 && !containsHero) {
      const tagsOk = items.every((c) => /^(li|tr|article|div|section)$/.test(nodes[c].tag)) && nodes[items[0]].tag !== "p";
      const linked = items.filter((c) => nodes[c].links > 0).length;
      const avgChars = items.reduce((s2, c) => s2 + nodes[c].chars, 0) / items.length;
      const avgLinks = items.reduce((s2, c) => s2 + nodes[c].links, 0) / items.length;
      if (tagsOk && linked >= items.length * 0.6) {
        if (items.length >= 8 && avgChars >= 18 && avgChars <= 700 && avgLinks <= 5 && (share(n) >= 0.03 || items.length >= 15)) {
          add(i, "feed", [`${items.length} repeated items with the same structure (${q(sigOf(nodes[items[0]]), 24)})`, `each with ~${Math.round(avgChars)} characters and ${avgLinks.toFixed(1)} links`], {
            title: ht || nodes[items[0]].label || "Feed",
            items: items.slice(0, 60),
          });
          i = n.end - 1;
          continue;
        }
        if (n.chars / Math.max(n.links, 1) < 32) {
          add(i, "directory", [`${n.links} links in ${items.length} entries, ${Math.round(n.chars / Math.max(n.links, 1))} characters per link`], {
            title: ht || nodes[items[0]].label || "Links",
            items: items.slice(0, 20),
          });
          i = n.end - 1;
          continue;
        }
      }
    }
    // feature grid: 3–12 similar cards, each with a heading
    // (cards are small and alike — an article's chapters are not a feature grid)
    const itemShares = items.map((c) => share(nodes[c]));
    const alike = itemShares.length ? Math.max(...itemShares) / Math.max(Math.min(...itemShares), 1e-6) < 4 : false;
    if (items.length >= 3 && items.length <= 12 && share(n) <= 0.25 && Math.max(0, ...itemShares) <= 0.08 && alike && items.filter((c) => countIn(c, (m) => !!m.heading) > 0).length >= Math.ceil(items.length * 0.66)) {
      add(i, "features", [`${items.length} sibling cards, each with its own heading`, ht ? `introduced by ${q(ht)}` : ""].filter(Boolean), {
        title: ht || nodes[items[0]].label,
        items,
      });
      i = n.end - 1;
      continue;
    }
    // generic major section (only shallow, sizeable, headed blocks)
    if ((n.role === "section" || n.role === "article" || (head && head.heading! <= 3 && head.id - i < 6)) && share(n) >= 0.02 && n.level <= 8) {
      const lead = !ht && !regions.some((r) => r.kind === "section");
      add(i, "section", [n.role === "section" || n.role === "article" ? `a <${n.tag}>` : "a block opened by a heading", ht ? `heading ${q(ht)}` : lead ? "the first, untitled section: the page's introduction" : "", `${pct(share(n))} of the page`].filter(Boolean), { title: ht || (lead ? "Introduction" : n.label) });
    }
  }

  /* ── sidebars ── */
  const sidebars: Region[] = [];
  for (let i = 1; i < N; i++) {
    const n = nodes[i];
    if (taken.has(i) || share(n) < 0.02 || share(n) > 0.35) continue;
    if (hero && inside(i, hero.node)) continue; // a sidebar drawn inside a product mockup isn't the page's
    if (n.role === "aside" || /(^|[\s_-])(sidebar|side-?bar|aside|vector-column-start|vector-column-end|rail)([\s_-]|$)/.test(names(n))) {
      sidebars.push(add(i, "sidebar", [n.role === "aside" ? "an <aside>" : `class ${q(names(n).split(" ")[0])}`, `${n.links} links beside the main content`], { title: firstHeading(i)?.label ?? "Sidebar" }));
      i = n.end - 1;
    }
  }

  /* ── forms ── */
  for (const n of nodes) {
    if (n.role === "form" && !taken.has(n.id) && share(n) > 0.002) add(n.id, "form", ["a <form>", n.controls ? `${n.controls} inputs` : ""].filter(Boolean), { title: n.label ?? (/search/.test(names(n)) ? "Search" : "Form") });
  }

  /* ── tree, regionOf ── */
  regions.sort((a, b) => a.node - b.node || nodes[b.node].end - nodes[a.node].end);
  regions.forEach((r, k) => (r.id = k));
  const regionOf = new Int32Array(N).fill(-1);
  const stack: Region[] = [];
  let ri = 0;
  for (let i = 0; i < N; i++) {
    while (stack.length && i >= nodes[stack[stack.length - 1].node].end) stack.pop();
    while (ri < regions.length && regions[ri].node === i) {
      const r = regions[ri++];
      r.parent = stack.length ? stack[stack.length - 1].id : -1;
      if (r.parent >= 0) regions[r.parent].children.push(r.id);
      stack.push(r);
    }
    regionOf[i] = stack.length ? stack[stack.length - 1].id : -1;
  }

  /* ── importance ── */
  const prior: Record<RegionKind, number> = {
    page: 1, hero: 1, brand: 0.7, nav: 0.75, pricing: 0.85, features: 0.65, gallery: 0.65, feed: 0.75, main: 0.55, directory: 0.4, showcase: 0.6,
    section: 0.5, toc: 0.55, infobox: 0.6, references: 0.45, testimonials: 0.5, logos: 0.45, faq: 0.4,
    sidebar: 0.4, footer: 0.5, cta: 0.6, form: 0.35,
  };
  for (const r of regions) r.importance = Math.min(1, prior[r.kind] * (0.45 + Math.sqrt(share(nodes[r.node])) * 1.2));

  /* ── districts: major regions in reading order ── */
  const isSpine = (r: Region) => r.kind === "nav" || r.kind === "brand" || r.kind === "cta" || r.kind === "footer" || r.kind === "sidebar" || r.kind === "main" || r.kind === "form" || r === hero;
  // Anything inside the entrance (hero), the avenue (nav), the edge (footer) or a sidebar
  // belongs to those, not to a district of its own.
  const spineNodes = [hero, nav, footer, brand, ...sidebars].filter((r): r is Region => !!r).map((r) => r.node);
  let districts = regions
    .filter((r) => !isSpine(r) && share(nodes[r.node]) >= 0.012 && !spineNodes.some((sn) => inside(r.node, sn)))
    .map((r) => r.id);
  // Keep only outermost districts (a gallery inside a section stays inside it).
  districts = districts.filter((id) => !districts.some((o) => o !== id && inside(regions[id].node, regions[o].node)));

  return {
    siteName,
    regions,
    regionOf,
    hero: hero?.id ?? -1,
    nav: nav?.id ?? -1,
    brand: brand?.id ?? -1,
    footer: footer?.id ?? -1,
    main: main?.id ?? -1,
    districts,
    sidebars: sidebars.map((r) => r.id),
    ctas: ctas.map((r) => r.id),
  };
}

function kindPriority(k: RegionKind): number {
  return ["section", "directory", "form", "sidebar", "main", "cta", "brand", "toc", "nav", "footer", "showcase", "features", "gallery", "logos", "testimonials", "faq", "references", "feed", "infobox", "pricing", "hero"].indexOf(k);
}

export const REGION_LABEL: Record<RegionKind, string> = {
  page: "Page",
  brand: "Brand",
  nav: "Navigation",
  hero: "Hero",
  cta: "Call to action",
  main: "Main",
  section: "Section",
  features: "Feature grid",
  pricing: "Pricing",
  gallery: "Gallery",
  logos: "Logo wall",
  testimonials: "Testimonials",
  faq: "FAQ",
  feed: "Feed",
  directory: "Link directory",
  showcase: "Showcase",
  toc: "Table of contents",
  infobox: "Infobox",
  references: "References",
  sidebar: "Sidebar",
  form: "Form",
  footer: "Footer",
};
