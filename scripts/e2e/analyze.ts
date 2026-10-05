import { readFileSync, writeFileSync } from "node:fs";
import { forceStyle, STYLES } from "../../src/lib/pixelcity/diagnostics";
import { deriveGrammar, type ArchStyle } from "../../src/lib/pixelcity/grammar";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage, type RealPage } from "../../src/lib/pixelcity/kit/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import { DATASET } from "../real-pages/dataset";

type Dist = Record<string, number>;
interface FP {
  dists: Record<string, Dist>;
  scalars: Record<string, number>;
}
const LAYERS = ["semantics", "territory", "composition", "massing", "surface", "expression"] as const;
type Layer = (typeof LAYERS)[number];

const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const norm = (d: Dist): Dist => {
  const s = Object.values(d).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v / s]));
};
const add = (d: Dist, k: string, v = 1) => (d[k] = (d[k] ?? 0) + v);
const entropy = (xs: number[]) => {
  const s = xs.reduce((a, b) => a + b, 0) || 1;
  const h = -xs.filter((x) => x > 0).reduce((a, x) => a + (x / s) * Math.log(x / s), 0);
  return xs.length > 1 ? h / Math.log(xs.length) : 0;
};
const bin = (v: number, edges: number[]) => {
  let i = 0;
  while (i < edges.length && v >= edges[i]) i++;
  return `b${i}`;
};

const KIND_GROUP: Record<string, string> = {
  hero: "hero",
  nav: "chrome", brand: "chrome", footer: "chrome", form: "chrome", cta: "chrome", sidebar: "chrome",
  main: "text", section: "text", page: "text", infobox: "text", faq: "text", remainder: "text", observed: "text",
  feed: "list", directory: "list", toc: "list", references: "list",
  gallery: "media", showcase: "media", logos: "media",
  features: "product", pricing: "product", testimonials: "product",
};

function semanticsFP(p: RealPage): FP {
  const kind: Dist = {};
  const content: Dist = {};
  for (const t of p.plan.territories) {
    add(kind, KIND_GROUP[t.kind] ?? "text", t.weight);
    const m = t.metrics;
    const tot = m.chars / 200 + m.links + m.images * 3 + m.controls * 2 || 1;
    add(content, "text", (t.weight * m.chars) / 200 / tot);
    add(content, "links", (t.weight * m.links) / tot);
    add(content, "media", (t.weight * m.images * 3) / tot);
    add(content, "controls", (t.weight * m.controls * 2) / tot);
  }
  const f = p.fp;
  const w = p.plan.territories.map((t) => t.weight);
  return {
    dists: { kind: norm(kind), content: norm(content) },
    scalars: {
      size: f.size, depth: f.depth, breadth: f.breadth, regularity: f.regularity, sections: f.sections,
      textDensity: f.textDensity, imagery: f.imagery, linkDensity: f.linkDensity, headings: f.headings,
      interactivity: f.interactivity, forms: f.forms,
      regions: Math.log(1 + w.length), dominance: Math.max(...w), weightEntropy: entropy(w),
      hero: p.plan.hero >= 0 ? p.plan.territories[p.plan.hero].weight : 0,
    },
  };
}

function territoryFP(t: KitTrace): FP {
  const a = t.alloc!;
  const comp: Dist = {};
  for (const s of a.segments) add(comp, s.comp, s.count);
  const lots = a.lots.filter((n) => n > 0).sort((x, y) => y - x);
  const total = lots.reduce((x, y) => x + y, 0) || 1;
  const rank: Dist = {};
  lots.forEach((n, i) => add(rank, `r${Math.min(i, 7)}`, n / total));
  const N = 16;
  const terr = (X: number, Y: number) => {
    const s = a.owner[X * N + Y];
    return s < 0 ? -1 : a.segments[s].territory;
  };
  let pairs = 0;
  let cuts = 0;
  for (let X = 0; X < N; X++)
    for (let Y = 0; Y < N; Y++) {
      if (X + 1 < N) { pairs++; if (terr(X, Y) !== terr(X + 1, Y)) cuts++; }
      if (Y + 1 < N) { pairs++; if (terr(X, Y) !== terr(X, Y + 1)) cuts++; }
    }
  const dom = a.lots.indexOf(Math.max(...a.lots));
  let cd = 0;
  let cn = 0;
  for (let X = 0; X < N; X++) for (let Y = 0; Y < N; Y++) if (terr(X, Y) === dom) { cd += Math.hypot(X - 7.5, Y - 7.5); cn++; }
  const segsPerTerr = a.segments.length / Math.max(1, lots.length);
  return {
    dists: { comp: norm(comp), rank: norm(rank) },
    scalars: { territories: Math.log(1 + lots.length), dominant: lots[0] / total, entropy: entropy(lots), fragmentation: segsPerTerr, boundary: cuts / pairs, centrality: cn ? cd / cn / 10.6 : 0 },
  };
}

function compositionFP(t: KitTrace): FP {
  const piece: Dist = {};
  const compPieces: Dist = {};
  let corner = 0;
  let interior = 0;
  let open = 0;
  const blockSig = new Map<string, string[]>();
  for (const pc of t.pieces) {
    add(piece, pc.piece.type, pc.piece.lots);
    add(compPieces, pc.comp);
    if (pc.piece.corner) corner++;
    if (pc.piece.interior) interior++;
    const nb = t.buildings.filter((b) => b.parts[0] >= pc.parts[0] && b.parts[1] <= pc.parts[1]).length;
    if (nb === 0) open += pc.piece.lots;
    const k = `${pc.block[0]},${pc.block[1]}`;
    if (!blockSig.has(k)) blockSig.set(k, []);
    blockSig.get(k)!.push(`${pc.comp}:${pc.piece.type}`);
  }
  const sigs = [...blockSig.values()].map((s) => s.sort().join("|"));
  const repeated = sigs.filter((s, i) => sigs.indexOf(s) !== i || sigs.lastIndexOf(s) !== i).length / Math.max(1, sigs.length);
  const n = Math.max(1, t.pieces.length);
  return {
    dists: { piece: norm(piece), compPieces: norm(compPieces) },
    scalars: { buildingsPerLot: t.buildings.length / 256, corner: corner / n, interior: interior / n, open: open / 256, repeatedBlocks: repeated, pieces: Math.log(1 + t.pieces.length) },
  };
}

function massingFP(t: KitTrace, parts: Part[]): FP {
  const family: Dist = {};
  const roof: Dist = {};
  const floors: Dist = {};
  const foot: Dist = {};
  const heights: number[] = [];
  let area = 0;
  for (const b of t.buildings) {
    add(family, b.P.family);
    add(roof, b.P.roof);
    add(floors, bin(b.P.floors, [3, 5, 7, 10, 15]));
    add(foot, bin(b.w * b.d, [4, 9, 16, 36]));
    let top = 0;
    for (let k = b.parts[0]; k < b.parts[1]; k++) top = Math.max(top, parts[k].y + parts[k].h);
    heights.push(top);
    area += b.w * b.d;
  }
  heights.sort((a, b) => a - b);
  const q = (f: number) => heights[Math.min(heights.length - 1, Math.floor(f * heights.length))] ?? 0;
  const lm: Dist = { [t.landmark ? t.landmark.family : "none"]: 1 };
  return {
    dists: { family: norm(family), roof: norm(roof), floors: norm(floors), footprint: norm(foot), landmark: lm },
    scalars: { medianTop: q(0.5) / 10, p90Top: q(0.9) / 15, maxTop: q(1) / 25, coverage: area / (4 * 4 * 14 * 14), landmarkFloors: (t.landmark?.floors ?? 0) / 20 },
  };
}

function surfaceFP(t: KitTrace): { surface: FP; expression: FP } {
  const d: Record<string, Dist> = { use: {}, ground: {}, base: {}, body: {}, crown: {}, roof: {}, occupied: {}, corner: {} };
  const e: Record<string, Dist> = { style: {}, opening: {}, frame: {}, awning: {} };
  for (const b of t.buildings)
    for (const A of b.anatomy) {
      add(d.use, A.use);
      add(d.ground, A.ground.kind);
      add(d.base, A.base.floors ? `${A.base.floors}${A.base.treatment}` : "none");
      add(d.body, `${A.body.surf}/${A.body.pattern}`);
      add(d.crown, A.crown.kind);
      add(d.roof, A.roof.service);
      add(d.occupied, A.roof.occupied + (A.roof.energy !== "none" ? "+solar" : ""));
      add(d.corner, A.corner.condition ? A.corner.treatment : "mid");
      add(e.style, A.style.split(":")[0]);
      add(e.opening, `${A.opening.glazing}/${A.opening.depth}`);
      add(e.frame, `${A.opening.frame}${A.opening.sill ? "+sill" : ""}/${A.opening.sash}`);
      add(e.awning, A.ground.awning);
    }
  const n = (x: Record<string, Dist>) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, norm(v)]));
  return { surface: { dists: n(d), scalars: {} }, expression: { dists: n(e), scalars: {} } };
}

const tvd = (a: Dist, b: Dist) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let s = 0;
  for (const k of keys) s += Math.abs((a[k] ?? 0) - (b[k] ?? 0));
  return s / 2;
};
type Scales = Record<string, number>;
function distance(a: FP, b: FP, scales: Scales): number {
  const parts: number[] = [];
  for (const k of Object.keys(a.dists)) parts.push(tvd(a.dists[k], b.dists[k] ?? {}));
  for (const k of Object.keys(a.scalars)) parts.push(Math.min(1, Math.abs(a.scalars[k] - b.scalars[k]) / (scales[k] || 1)));
  return parts.reduce((x, y) => x + y, 0) / Math.max(1, parts.length);
}
function scalesOf(fps: FP[]): Scales {
  const s: Scales = {};
  for (const k of Object.keys(fps[0].scalars)) {
    const v = fps.map((f) => f.scalars[k]);
    s[k] = Math.max(...v) - Math.min(...v) || 1;
  }
  return s;
}
function breakdown(a: FP, b: FP, scales: Scales): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of Object.keys(a.dists)) o[k] = tvd(a.dists[k], b.dists[k] ?? {});
  for (const k of Object.keys(a.scalars)) o[k] = Math.min(1, Math.abs(a.scalars[k] - b.scalars[k]) / (scales[k] || 1));
  return o;
}

const ids = DATASET.map((e) => e.id);
const pages = new Map(ids.map((id) => [id, realPage(snap(id))] as const));
function cityFPs(p: RealPage, o: { seed?: number; style?: ArchStyle }) {
  const t = newTrace();
  const fp = o.style ? forceStyle(p.fp, o.style) : p.fp;
  const plan = o.style ? { ...p.plan, identity: forceStyle(p.plan.identity, o.style) } : p.plan;
  const c = generateKitDistrict(fp, { profile: plan, time: "day", seed: o.seed ?? 7, trace: t });
  const s = surfaceFP(t);
  return { trace: t, city: c, fp: { semantics: semanticsFP(p), territory: territoryFP(t), composition: compositionFP(t), massing: massingFP(t, c.parts), surface: s.surface, expression: s.expression } as Record<Layer, FP> };
}
const base = new Map(ids.map((id) => [id, cityFPs(pages.get(id)!, {})] as const));
const scales = Object.fromEntries(LAYERS.map((L) => [L, scalesOf(ids.map((id) => base.get(id)!.fp[L]))])) as Record<Layer, Scales>;

const matrix: Record<Layer, number[][]> = {} as Record<Layer, number[][]>;
for (const L of LAYERS) matrix[L] = ids.map((a) => ids.map((b) => distance(base.get(a)!.fp[L], base.get(b)!.fp[L], scales[L])));

const SEEDS = [8, 9, 10, 11];
const seedNoise: Record<Layer, number[]> = {} as Record<Layer, number[]>;
for (const L of LAYERS) seedNoise[L] = [];
for (const id of ids)
  for (const s of SEEDS) {
    const r = cityFPs(pages.get(id)!, { seed: s });
    for (const L of LAYERS) seedNoise[L].push(distance(base.get(id)!.fp[L], r.fp[L], scales[L]));
  }
const styleNoise: Record<Layer, number[]> = {} as Record<Layer, number[]>;
for (const L of LAYERS) styleNoise[L] = [];
const styleRuns = new Map<string, Record<Layer, FP>>();
for (const id of ids)
  for (const st of STYLES) {
    const r = cityFPs(pages.get(id)!, { style: st });
    styleRuns.set(`${id}/${st}`, r.fp);
    for (const L of LAYERS) styleNoise[L].push(distance(base.get(id)!.fp[L], r.fp[L], scales[L]));
  }
const sameStyle: Record<Layer, number[][]> = {} as Record<Layer, number[][]>;
for (const L of LAYERS) sameStyle[L] = ids.map((a) => ids.map((b) => distance(styleRuns.get(`${a}/classic`)![L], styleRuns.get(`${b}/classic`)![L], scales[L])));

const offDiag = (m: number[][]) => m.flatMap((r, i) => r.filter((_, j) => j > i));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const ranks = (xs: number[]) => {
  const o = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length).fill(0);
  o.forEach(([, i], k) => (r[i] = k));
  return r;
};
const spearman = (a: number[], b: number[]) => {
  const ra = ranks(a);
  const rb = ranks(b);
  const ma = mean(ra);
  const mb = mean(rb);
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    n += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return n / Math.sqrt(da * db || 1);
};
const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const));

const summary = Object.fromEntries(
  LAYERS.map((L) => {
    const page = offDiag(matrix[L]);
    return [L, { pageMean: mean(page), pageMin: Math.min(...page), seedMean: mean(seedNoise[L]), seedMax: Math.max(...seedNoise[L]), styleMean: mean(styleNoise[L]), pageOverSeed: mean(page) / (mean(seedNoise[L]) || 1e-9), pageOverStyle: mean(page) / (mean(styleNoise[L]) || 1e-9), pairsBelowSeedMax: page.filter((d) => d <= Math.max(...seedNoise[L])).length, sameStyleMean: mean(offDiag(sameStyle[L])), rhoSemantics: spearman(offDiag(matrix.semantics), page) }];
  }),
);
const consecutive = LAYERS.slice(1).map((L, i) => ({ from: LAYERS[i], to: L, rho: spearman(offDiag(matrix[LAYERS[i]]), offDiag(matrix[L])) }));

const pct = (m: number[][]) => {
  const v = offDiag(m);
  const r = ranks(v);
  return r.map((x) => x / (v.length - 1));
};
const movement = pairs.map(([a, b], k) => ({
  pair: `${a}~${b}`,
  pct: Object.fromEntries(LAYERS.map((L) => [L, pct(matrix[L])[k]])),
  raw: Object.fromEntries(LAYERS.map((L) => [L, offDiag(matrix[L])[k]])),
}));

const sig = (f: (id: string) => number) => ids.map(f);
const T = (id: string) => base.get(id)!.trace;
const lotsOf = (id: string, comps: string[]) => T(id).alloc!.segments.filter((s) => comps.includes(s.comp)).reduce((a, s) => a + s.count, 0) / 256;
const anat = (id: string) => T(id).buildings.flatMap((b) => b.anatomy);
const share = (id: string, pred: (A: ReturnType<typeof anat>[number]) => boolean) => {
  const a = anat(id);
  return a.filter(pred).length / Math.max(1, a.length);
};
const fam = (id: string, fs: string[]) => T(id).buildings.filter((b) => fs.includes(b.P.family)).length / Math.max(1, T(id).buildings.length);
const terrW = (id: string, kinds: string[]) => pages.get(id)!.plan.territories.filter((t) => kinds.includes(KIND_GROUP[t.kind] ?? "text")).reduce((a, t) => a + t.weight, 0);
const SIGNALS: Array<{ name: string; page: (id: string) => number; stages: Array<{ layer: string; what: string; f: (id: string) => number }> }> = [
  { name: "hero dominance", page: (id) => base.get(id)!.fp.semantics.scalars.hero, stages: [
    { layer: "territory", what: "landmark lots", f: (id) => lotsOf(id, ["landmark"]) },
    { layer: "massing", what: "landmark floors", f: (id) => T(id).landmark?.floors ?? 0 },
    { layer: "massing", what: "tallest building", f: (id) => base.get(id)!.fp.massing.scalars.maxTop } ] },
  { name: "media density (content media territories)", page: (id) => terrW(id, ["media"]), stages: [
    { layer: "territory", what: "media comp lots", f: (id) => lotsOf(id, ["media"]) },
    { layer: "massing", what: "towers/podiums/asymmetric", f: (id) => fam(id, ["podiumTower", "asymmetric", "narrowTower"]) },
    { layer: "surface", what: "office use", f: (id) => share(id, (A) => A.use === "office") } ] },
  { name: "link density", page: (id) => pages.get(id)!.fp.linkDensity, stages: [
    { layer: "territory", what: "parcelled+archive+navigation lots", f: (id) => lotsOf(id, ["parcelled", "archive", "navigation"]) },
    { layer: "massing", what: "rows (attached shop series)", f: (id) => fam(id, ["rows"]) },
    { layer: "surface", what: "shop units per storefront", f: (id) => mean(anat(id).filter((A) => A.ground.kind === "storefront").map((A) => A.ground.units)) } ] },
  { name: "interactivity", page: (id) => pages.get(id)!.fp.interactivity, stages: [
    { layer: "territory", what: "interactive comp lots", f: (id) => lotsOf(id, ["interactive"]) },
    { layer: "massing", what: "kiosks", f: (id) => fam(id, ["kiosk"]) },
    { layer: "surface", what: "storefront transparency", f: (id) => mean(anat(id).filter((A) => A.ground.kind === "storefront").map((A) => A.ground.transparency)) } ] },
  { name: "long-form text", page: (id) => terrW(id, ["text"]) * pages.get(id)!.fp.textDensity, stages: [
    { layer: "territory", what: "continuous lots", f: (id) => lotsOf(id, ["continuous"]) },
    { layer: "massing", what: "courtyards + L-blocks", f: (id) => fam(id, ["courtyard", "lshape"]) },
    { layer: "surface", what: "residential use", f: (id) => share(id, (A) => A.use === "residential") } ] },
  { name: "list / document structure", page: (id) => terrW(id, ["list"]), stages: [
    { layer: "territory", what: "archive lots", f: (id) => lotsOf(id, ["archive"]) },
    { layer: "surface", what: "institutional use", f: (id) => share(id, (A) => A.use === "institutional") } ] },
  { name: "repeated product grid", page: (id) => pages.get(id)!.plan.territories.reduce((a, t) => a + t.weight * (t.mix.find((m) => m.comp === "grid")?.share ?? 0), 0), stages: [
    { layer: "territory", what: "grid lots", f: (id) => lotsOf(id, ["grid"]) },
    { layer: "composition", what: "identical square modules", f: (id) => T(id).buildings.filter((b) => b.comp === "grid").length / Math.max(1, T(id).buildings.length) },
    { layer: "surface", what: "commercial use", f: (id) => share(id, (A) => A.use === "commercial") } ] },
  { name: "chrome / footer", page: (id) => terrW(id, ["chrome"]), stages: [
    { layer: "territory", what: "support+navigation lots", f: (id) => lotsOf(id, ["support", "navigation"]) },
    { layer: "surface", what: "service use", f: (id) => share(id, (A) => A.use === "service") } ] },
  { name: "heading hierarchy", page: (id) => pages.get(id)!.fp.headings, stages: [
    { layer: "surface", what: "2-floor base or attic", f: (id) => share(id, (A) => A.base.floors >= 2 || A.crown.kind === "attic") } ] },
  { name: "regularity", page: (id) => pages.get(id)!.fp.regularity, stages: [
    { layer: "surface", what: "articulated end bays (inverse)", f: (id) => -share(id, (A) => A.body.accentEnds) } ] },
  { name: "page size / depth (verticality)", page: (id) => base.get(id)!.trace.grammar!.verticality, stages: [
    { layer: "massing", what: "median height", f: (id) => base.get(id)!.fp.massing.scalars.medianTop } ] },
  { name: "darkness", page: (id) => pages.get(id)!.fp.darkness, stages: [
    { layer: "palette", what: "night palette (own time of day)", f: (id) => (deriveGrammar(pages.get(id)!.fp).time === "night" ? 1 : 0) } ] },
];
const signals = SIGNALS.map((s) => {
  const pv = sig(s.page);
  return { name: s.name, values: Object.fromEntries(ids.map((id, i) => [id, pv[i]])), stages: s.stages.map((st) => { const v = sig(st.f); return { layer: st.layer, what: st.what, rho: spearman(pv, v), values: Object.fromEntries(ids.map((id, i) => [id, v[i]])) }; }) };
});

const out = { ids, layers: LAYERS, matrix, seedNoise, styleNoise, sameStyle, summary, consecutive, movement, signals, breakdown: Object.fromEntries(pairs.map(([a, b]) => [`${a}~${b}`, Object.fromEntries(LAYERS.map((L) => [L, breakdown(base.get(a)!.fp[L], base.get(b)!.fp[L], scales[L])]))])), fingerprints: Object.fromEntries(ids.map((id) => [id, base.get(id)!.fp])), styleOf: Object.fromEntries(ids.map((id) => [id, base.get(id)!.trace.grammar!.style])) };
writeFileSync(process.env.E2E_METRICS ?? "docs/e2e/metrics.json", JSON.stringify(out, null, 1));
for (const L of LAYERS) {
  const s = summary[L];
  console.log(`${L.padEnd(12)} page ${s.pageMean.toFixed(3)} (min ${s.pageMin.toFixed(3)}) · seed ${s.seedMean.toFixed(3)} (max ${s.seedMax.toFixed(3)}) · style ${s.styleMean.toFixed(3)} · page/seed ${s.pageOverSeed.toFixed(1)} · page/style ${s.pageOverStyle.toFixed(1)} · pairs ≤ seed max ${s.pairsBelowSeedMax}/91 · same-style ${s.sameStyleMean.toFixed(3)} · ρ(sem) ${s.rhoSemantics.toFixed(2)}`);
}
for (const c of consecutive) console.log(`ρ ${c.from} → ${c.to}: ${c.rho.toFixed(2)}`);
for (const s of signals) console.log(`${s.name}: ${s.stages.map((st) => `${st.layer}/${st.what} ρ=${st.rho.toFixed(2)}`).join(" · ")}`);
