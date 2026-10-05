import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { CEREMONIAL_SPAN } from "../../src/lib/pixelcity/kit/buildings";
import { simpleIndex } from "../../src/lib/pixelcity/kit/compose";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { itemsOf, withoutItems, type ItemForm } from "../../src/lib/pixelcity/kit/items";
import type { Plan, Territory } from "../../src/lib/pixelcity/kit/plan";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { allocate } from "../../src/lib/pixelcity/kit/territory";
import { generateKitDistrict as v7, newTrace as newTraceV7 } from "../../src/lib/pixelcity/kit-v7/district";
import { realPage as realPageV7 } from "../../src/lib/pixelcity/kit-v7/real-page";
import { generateKitDistrict as v8, newTrace as newTraceV8 } from "../../src/lib/pixelcity/kit-v8/district";
import { realPage as realPageV8 } from "../../src/lib/pixelcity/kit-v8/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import { allocate as allocateV7 } from "../../src/lib/pixelcity/kit-v7/territory";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const pages = new Map(DATASET.map((e) => [e.id, realPage(snap(e.id))] as const));
const main = (id: string) => {
  const p = pages.get(id)!;
  const lots = allocate(p.plan).lots;
  return p.plan.territories.reduce((best, t, i) => (lots[i] > lots[p.plan.territories.indexOf(best)] ? t : best), p.plan.territories[0]);
};

console.log("# Territory.items — synthetic forms (same 60 links, only the item shape changes)");
const el = (tag: string, o: Partial<SnapshotNode> = {}, children: SnapshotNode[] = []): SnapshotNode => ({ tag, text: 0, ...o, children });
let n = 0;
const a = (chars = 12) => el("a", { text: chars, sample: `l${n}`, own: `l${n}`, attrs: { href: `/x/${n++}` } });
const page = (body: SnapshotNode[]): DomSnapshot => {
  const root = el("body", {}, [el("main", {}, body)]);
  const count = (x: SnapshotNode): number => 1 + x.children.reduce((s, c) => s + count(c), 0);
  return { version: 1, source: { requestedUrl: "https://example.test/", finalUrl: "https://example.test/", strategy: "static", fetchedAt: "", status: 200, bytes: 0, durationMs: 0, redirects: [] }, document: { title: "T" }, styles: { colors: [] }, stats: { elementCount: count(root), maxDepth: 8, truncated: false }, root, warnings: [] };
};
const items = (body: SnapshotNode[]) => itemsOf(normalize(page(body)), [0], []);
{
  const simple = items([el("ul", {}, Array.from({ length: 60 }, () => el("li", {}, [a()])))]);
  check("60 bare links: 60 items, 1 link each, untitled", simple.count === 60 && simple.linksPerItem === 1 && simple.titledShare === 0, `${simple.count} × ${simple.shape}, ${simple.linksPerItem} links/item`);
  const rows = items([el("table", {}, [el("tbody", {}, Array.from({ length: 30 }, () => el("tr", {}, [el("td", {}, [a()]), el("td", {}, [a(30)])])))])]);
  check("30 rows of 2 links: 30 items, 2 links each", rows.count === 30 && rows.linksPerItem === 2, `${rows.count} × ${rows.shape}, ${rows.linksPerItem} links/item`);
  const entries = items([el("ol", {}, Array.from({ length: 12 }, () => el("li", {}, [el("h2", {}, [a(40)]), el("div", {}, [a(), a(), a(), a()])])))]);
  check("12 titled entries with 5 links each: 12 items, titled, 5 links", entries.count === 12 && entries.linksPerItem === 5 && entries.titledShare === 1, `${entries.count} × ${entries.shape}, ${entries.linksPerItem} links/item, titled ${entries.titledShare}`);
  const cards = items([el("div", {}, Array.from({ length: 10 }, (_, i) => el("div", {}, [el("img", { image: `https://example.test/p${i}.jpg`, attrs: { src: `https://example.test/p${i}.jpg`, width: "400", height: "300", alt: `Product ${i}` } }), a(30), el("button", { text: 3, sample: "Buy" })])))]);
  check("10 cards with image, link and button: media and controls per item", cards.count === 10 && cards.mediaPerItem >= 1 && cards.controlsPerItem >= 1, `media ${cards.mediaPerItem}, controls ${cards.controlsPerItem}`);
  const shelves = items([el("div", {}, Array.from({ length: 4 }, () => el("section", {}, [el("h2", { text: 20 }), el("div", {}, Array.from({ length: 6 }, (_, i) => el("div", {}, [el("img", { image: `https://example.test/s${n}${i}.jpg`, attrs: { src: `https://example.test/s${n}${i}.jpg`, width: "300", height: "300", alt: "p" } }), a(20)])))])))]);
  check("4 headed shelves of 6 cards: the 24 cards are the items, not the shelves", shelves.count === 24 && shelves.mediaPerItem >= 1, `${shelves.count} × ${shelves.shape}`);
  const columns = items([el("footer", {}, Array.from({ length: 4 }, () => el("div", {}, [el("h3", { text: 10 }), el("ul", {}, Array.from({ length: 5 }, () => el("li", {}, [a()])))])))]);
  check("4 headed footer columns of 5 links: the 20 links are the items", columns.count === 20 && columns.linksPerItem === 1 && columns.titledShare === 0, `${columns.count} × ${columns.shape}`);
  const prose = items([el("section", {}, [el("p", { text: 400 }), el("p", { text: 300 })])]);
  check("two paragraphs: no item series", prose.source === "none", prose.evidence[0]);
}

console.log("\n# golden pages");
{
  const pg = main("oldweb").items!;
  check("Paul Graham: 215 simple items, ~1 link each, untitled", pg.count === 215 && pg.linksPerItem === 1 && pg.titledShare === 0 && pg.confidence === "high", `${pg.count} × ${pg.shape}, ${pg.linksPerItem} links/item`);
  const lb = main("forum").items!;
  check("lobste.rs: titled composite entries with several links/metadata each", lb.count === 25 && lb.titledShare === 1 && lb.linksPerItem >= 5, `${lb.count} × ${lb.shape}, ${lb.linksPerItem} links/item, titled ${Math.round(lb.titledShare * 100)}%`);
  const cl = main("directory").items!;
  check("craigslist: simple items inside titled groups", cl.linksPerItem === 1 && cl.titledShare === 0 && cl.groups >= 10, `${cl.count} items, ${cl.linksPerItem} link/item, ${cl.groups} groups (~${cl.itemsPerGroup} items/group)`);
  const gh = pages.get("app")!.plan.territories.find((t) => t.kind === "feed")!.items!;
  check("GitHub: compound rows, ~2 links each", gh.linksPerItem === 2 && gh.count >= 20 && gh.titledShare === 0, `${gh.count} × ${gh.shape}, ${gh.linksPerItem} links/item`);
  const gov = pages.get("institution")!.plan.territories.find((t) => t.kind === "feed")!.items!;
  check("GOV.UK: titled items with text", gov.titledShare === 1 && gov.charsPerItem >= 40, `${gov.count} items, titled ${Math.round(gov.titledShare * 100)}%, ${gov.charsPerItem} chars/item`);
}

console.log("\n# controls (no invented forms)");
{
  const ikea = pages.get("shop")!.plan.territories.find((t) => t.kind === "pricing")!.items!;
  check("IKEA product grid: cards with media", ikea.mediaPerItem >= 1, `${ikea.count} × ${ikea.shape}, media ${ikea.mediaPerItem}/item, links ${ikea.linksPerItem}, controls ${ikea.controlsPerItem}`);
  const refs = pages.get("reference")!.plan.territories.filter((t) => t.kind === "references").map((t) => t.items!).find((i) => i.count > 10)!;
  check("Wikipedia references: annotated list items (several links, citation text)", refs.linksPerItem >= 2 && refs.charsPerItem >= 80, `${refs.count} × ${refs.shape}, ${refs.linksPerItem} links, ${refs.charsPerItem} chars/item`);
  const docs = pages.get("docs")!.plan.territories.reduce((a, b) => (b.weight > a.weight ? b : a)).items!;
  check("Python Docs main section: entries of prose (no link-list form)", docs.charsPerItem >= 200, `${docs.count} × ${docs.shape}, ${docs.charsPerItem} chars/item`);
  const nasa = pages.get("media")!.plan.territories.filter((t) => t.kind === "gallery").map((t) => t.items!).find((i) => i.source !== "none")!;
  check("NASA gallery: media cards", nasa.mediaPerItem >= 1, `${nasa.count} × ${nasa.shape}, media ${nasa.mediaPerItem}`);
  const linear = pages.get("saas")!.plan.territories.filter((t) => t.items!.source !== "none");
  check("Linear: no link-list form (its items are text blocks or cards, ≤ 1 link)", linear.every((t) => t.items!.linksPerItem <= 1), `${linear.length} territories with items, max ${Math.max(...linear.map((t) => t.items!.linksPerItem))} links/item`);
}

console.log("\n# additive only: everything kit-v7 decides is identical");
{
  let plans = 0;
  let alloc = 0;
  let cities = 0;
  for (const e of DATASET) {
    const p = pages.get(e.id)!;
    const q = realPageV7(snap(e.id));
    const strip = (pl: Plan) => JSON.stringify(pl.territories.map((t) => {
      const c = { ...t };
      delete c.items;
      return c;
    }));
    if (strip(p.plan) === JSON.stringify(q.plan.territories)) plans++;
    const x = allocate(p.plan);
    const y = allocateV7(q.plan);
    if (JSON.stringify({ path: x.path, owner: [...x.owner], segments: x.segments, lots: x.lots }) === JSON.stringify({ path: y.path, owner: [...y.owner], segments: y.segments, lots: y.lots })) alloc++;
    for (const flat of [false, true]) {
      const c = generateKitDistrict(p.fp, { polishAssets: false, profile: withoutItems(p.plan), time: "day", seed: 7, flat, artDirection: false });
      const d = v7(q.fp, { profile: q.plan, time: "day", seed: 7, flat });
      if (sha(JSON.stringify([c.parts, c.signs])) === sha(JSON.stringify([d.parts, d.signs]))) cities++;
    }
  }
  check("territories (weights, keys, order, mix, metrics, structure…) identical to kit-v7 apart from items", plans === DATASET.length, `${plans}/${DATASET.length}`);
  check("allocation, segments and lots identical to kit-v7", alloc === DATASET.length, `${alloc}/${DATASET.length}`);
  check("without items, the city (normal and flat) is byte-identical to kit-v7 — the program rule is the only reader", cities === DATASET.length * 2, `${cities}/${DATASET.length * 2}`);
  const t = newTrace();
  generateKitDistrict(pages.get("forum")!.fp, { polishAssets: false, profile: pages.get("forum")!.plan, time: "day", seed: 7, trace: t });
  check("items and their evidence are in the trace", t.plan!.territories.every((x) => x.items && x.items.evidence.length > 0));
  const again = realPage(snap("forum"));
  check("deterministic", JSON.stringify(again.plan.territories.map((x) => x.items)) === JSON.stringify(pages.get("forum")!.plan.territories.map((x) => x.items)));
  const src = readFileSync("src/lib/pixelcity/kit/items.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  check("the descriptor never reads a URL, host, site name or words", !/hostname|finalUrl|requestedUrl|siteName|snippet|label|sample/.test(src));
}

console.log("\n# experiment: simple index → institutional");
{
  const idx = (it: ItemForm) => simpleIndex({ items: it } as Territory);
  n = 0;
  check("synthetic: 60 bare links → simple index", idx(items([el("ul", {}, Array.from({ length: 60 }, () => el("li", {}, [a()])))])));
  check("synthetic: 12 entries titled by their link → simple index", idx(items([el("ul", {}, Array.from({ length: 12 }, () => el("li", {}, [el("h3", {}, [a(30)]), el("p", { text: 60 })])))])));
  check("synthetic: 12 entries with a plain title and a link → not (a title besides the link)", !idx(items([el("ul", {}, Array.from({ length: 12 }, () => el("li", {}, [el("h3", { text: 30 }), el("p", { text: 60 }), a(8)])))])));
  check("synthetic: 30 rows of 2 links → not (destination + metadata)", !idx(items([el("table", {}, [el("tbody", {}, Array.from({ length: 30 }, () => el("tr", {}, [el("td", {}, [a()]), el("td", {}, [a(30)])])))])])));
  check("synthetic: 4 bare links → not (fewer than 5 items)", !idx(items([el("ul", {}, Array.from({ length: 4 }, () => el("li", {}, [a()])))])));
  check("synthetic: 10 cards with image, link and button → not", !idx(items([el("div", {}, Array.from({ length: 10 }, (_, i) => el("div", {}, [el("img", { image: `https://example.test/q${i}.jpg`, attrs: { src: `https://example.test/q${i}.jpg`, width: "400", height: "300", alt: "q" } }), a(30), el("button", { text: 3, sample: "Buy" })])))])));

  const uses = (id: string) => {
    const p = pages.get(id)!;
    const t = newTrace();
    generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed: 7, trace: t });
    return { p, t };
  };
  const reasonOf = (id: string, kind: string) => {
    const { p, t } = uses(id);
    return [...new Set(t.buildings.filter((b) => p.plan.territories[b.territory].kind === kind && (b.comp === "parcelled" || b.comp === "grid")).map((b) => `${b.program.use}: ${b.program.reason}`))].join(" | ");
  };
  const SI = "institutional: simple-index evidence";
  const FB = "commercial: fallback — no matching architectural program";
  check("Paul Graham: the 215-essay index → institutional, simple-index evidence", reasonOf("oldweb", "observed") === SI, reasonOf("oldweb", "observed"));
  check("craigslist: every parcelled city list → institutional, simple-index evidence", reasonOf("directory", "remainder") === SI && reasonOf("directory", "features").split(" | ").filter((r) => r !== SI).every((r) => r === FB), `${reasonOf("directory", "remainder")} / ${reasonOf("directory", "features")}`);
  check("GOV.UK: the services list (titled by its links) → institutional", reasonOf("institution", "feed") === SI, reasonOf("institution", "feed"));
  check("GitHub: the file table (2 links/row) stays commercial, as a declared fallback", reasonOf("app", "feed") === FB, reasonOf("app", "feed"));
  check("lobste.rs: the stories (10 links each) stay commercial, as a declared fallback", reasonOf("forum", "faq") === FB, reasonOf("forum", "faq"));
  check("IKEA: the product grid keeps its use and reason", reasonOf("shop", "pricing") === "commercial: region kind: pricing / product grid", reasonOf("shop", "pricing"));

  let wrong = 0;
  let changed = 0;
  let seedsSame = 0;
  for (const e of DATASET) {
    const p = pages.get(e.id)!;
    const q = realPageV7(snap(e.id));
    const sets: string[] = [];
    for (const seed of [7, 8, 9]) {
      const ta = newTrace();
      const tb = newTraceV7();
      generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed, trace: ta });
      v7(q.fp, { profile: q.plan, time: "day", seed, trace: tb });
      const ch: number[] = [];
      ta.buildings.forEach((b, i) => {
        const before = tb.buildings[i].anatomy.map((x) => x.use).join();
        const after = b.anatomy.map((x) => x.use).join();
        const strip = (P: object) => JSON.stringify({ ...P, use: undefined, useReason: undefined });
        if (before !== after) {
          ch.push(i);
          if (b.program.reason !== "simple-index evidence" || !(b.comp === "parcelled" || b.comp === "grid") || after.split(",").some((u) => u !== "institutional") || strip(b.P) !== strip(tb.buildings[i].P)) wrong++;
        } else if (b.program.reason === "simple-index evidence" && after.split(",").some((u) => u !== "institutional")) wrong++;
      });
      if (seed === 7) changed += ch.length;
      sets.push(JSON.stringify(ch));
    }
    if (sets.every((x) => x === sets[0])) seedsSame++;
  }
  check("every changed building: parcelled / grid, simple-index evidence, institutional, same program otherwise", wrong === 0, `${changed} buildings changed, ${wrong} wrong`);
  check("seeds 7, 8, 9 change the same buildings", seedsSame === DATASET.length, `${seedsSame}/${DATASET.length}`);
  const src = readFileSync("src/lib/pixelcity/kit/compose.ts", "utf8");
  check("the rule reads no URL, host, site name or words", !/\.(label|snippet|sample)\b|hostname|finalUrl|requestedUrl|siteName/.test(src.slice(src.indexOf("export function simpleIndex"), src.indexOf("function prog("))));
}

console.log("\n# narrow lots: one marked entrance per narrow institutional series");
{
  check("threshold: the full-size portal with its steps (0.9 + 0.7) takes at most half the frontage → 3.2 tiles", Math.abs(CEREMONIAL_SPAN - 3.2) < 1e-9, `CEREMONIAL_SPAN = ${CEREMONIAL_SPAN}`);
  const key = (q: Part) => JSON.stringify({ ...q, rect: undefined });
  const geom = (ps: Part[]) => JSON.stringify(ps.filter((q) => q.mesh !== "sign").map(key));
  const volumes = (ps: Part[]) => JSON.stringify(ps.filter((q) => q.mesh !== "sign" && q.mesh !== "glow" && q.mesh !== "sprite" && q.y + q.h > 1.0 && Math.min(q.w, q.d) >= 0.3).map(key).sort());
  let wide = 0;
  let wideChanged = 0;
  let notNarrow = 0;
  let volumeDiff = 0;
  let outsideDiff = 0;
  let series = 0;
  let oneMarked = 0;
  let secondarySigns = 0;
  let seedsSame = 0;
  for (const e of DATASET) {
    const p = pages.get(e.id)!;
    const q = realPageV8(snap(e.id));
    const sets: string[] = [];
    for (const seed of [7, 8, 9]) {
      for (const flat of seed === 7 ? [false, true] : [false]) {
        const ta = newTrace();
        const tb = newTraceV8();
        const a = generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed, flat, trace: ta, artDirection: false });
        const b = v8(q.fp, { profile: q.plan, time: "day", seed, flat, trace: tb });
        if (flat) {
          if (volumes(a.parts) !== volumes(b.parts)) volumeDiff++;
          continue;
        }
        const changed: number[] = [];
        ta.buildings.forEach((B, i) => {
          if (geom(a.parts.slice(...B.parts)) !== geom(b.parts.slice(...tb.buildings[i].parts))) changed.push(i);
        });
        sets.push(JSON.stringify(changed));
        if (seed !== 7) continue;
        const inRanges = (ps: Part[], t: typeof ta) => ps.filter((_, k) => !changed.some((i) => k >= t.buildings[i].parts[0] && k < t.buildings[i].parts[1]));
        if (geom(inRanges(a.parts, ta)) !== geom(inRanges(b.parts, tb as unknown as typeof ta))) outsideDiff++;
        ta.buildings.forEach((B, i) => {
          const inst = B.anatomy.some((A) => A.use === "institutional");
          const isSeries = B.P.family === "rows" && B.anatomy.some((A) => A.why.some((w) => w.includes("institutional row")));
          if (inst && !isSeries) {
            wide++;
            if (changed.includes(i)) wideChanged++;
          }
          if (changed.includes(i) && !isSeries) notNarrow++;
          if (changed.includes(i) && volumes(a.parts.slice(...B.parts)) !== volumes(b.parts.slice(...tb.buildings[i].parts))) volumeDiff++;
          if (isSeries) {
            series++;
            if (B.anatomy.filter((A) => A.ground.entrance === "central").length === 1) oneMarked++;
          }
        });
        for (const B of ta.buildings.filter((x) => x.anatomy.some((A) => A.ground.entrance === "secondary"))) {
          const marked = B.anatomy.filter((A) => A.ground.entrance === "central").length;
          const signs = a.parts.slice(...B.parts).filter((x) => x.mesh === "sign").length;
          if (marked !== 1 || signs > 1 + (B.P.signage === "blade" || B.P.signage === "screen" || B.P.signage === "billboard" ? 1 : 0)) secondarySigns++;
        }
      }
    }
    if (sets.every((x) => x === sets[0])) seedsSame++;
  }
  check("wide institutional (not a narrow series) keeps kit-v8's geometry", wideChanged === 0, `${wideChanged} of ${wide} changed`);
  check("only narrow institutional series change", notNarrow === 0, `${notNarrow} other building(s) changed`);
  check("every narrow series has exactly one marked entrance", series > 0 && oneMarked === series, `${oneMarked}/${series}`);
  check("signs only at the series' entrance (no plaque, blade, screen or billboard on a secondary unit)", secondarySigns === 0, `${secondarySigns} series with extra signs`);
  check("volumes (floors, base, crown, roof plant) untouched — normal and flat", volumeDiff === 0, `${volumeDiff} difference(s)`);
  check("geometry outside the changed buildings identical to kit-v8", outsideDiff === 0, `${outsideDiff} page(s) differ`);
  check("seeds 7, 8, 9 change the same buildings", seedsSame === DATASET.length, `${seedsSame}/${DATASET.length}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall program checks passed");
process.exit(failed ? 1 : 0);
