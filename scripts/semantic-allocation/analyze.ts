// Semantic allocation pass — BEFORE (kit-v2, cycled minors) vs AFTER (kit, territories), same corpus.
//   npx tsx scripts/semantic-allocation/analyze.ts
// Writes docs/semantic-allocation/{tables.md, report.json, trace/<id>.md}.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SiteFingerprint } from "../../src/lib/fingerprint/fingerprint";
import type { Region, Semantics } from "../../src/lib/semantics/analyze";
import { deriveGrammar } from "../../src/lib/pixelcity/grammar";
import { generateKitDistrict, newTrace, blockCentre, type KitTrace } from "../../src/lib/pixelcity/kit-v3/district";
import { regionKeys, type Plan } from "../../src/lib/pixelcity/kit-v3/plan";
import { PERTURBATIONS, realPage, type Perturbation, type RealPage } from "../../src/lib/pixelcity/kit-v3/real-page";
import { N, LOT_TOTAL } from "../../src/lib/pixelcity/kit-v3/territory";
import { generateKitDistrict as genV2, type KitTrace as TraceV2, type Profile as ProfileV2 } from "../../src/lib/pixelcity/kit-v2/district";
import type { SourcedBrief } from "../../src/lib/pixelcity/kit-v2/page-brief";
import { realPage as realPageV2, type RealPage as RealPageV2 } from "../../src/lib/pixelcity/kit-v2/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

const OUT = "docs/semantic-allocation";
mkdirSync(`${OUT}/trace`, { recursive: true });
const SEED = 7;
const LOT_AREA = 3.5 * 3.5;
const load = (id: string): DomSnapshot => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "–");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/* ───────────── shared massing metrics (same code as the validation round) ───────────── */

const G = 0.5;
const EXT = 40;
const HN = Math.round((2 * EXT) / G);
interface BlockShape {
  cov: number;
  mean: number;
  max: number;
  std: number;
}
function heightmap(parts: Part[]): Float32Array {
  const hm = new Float32Array(HN * HN);
  for (const q of parts) {
    if (q.mesh === "sprite" || q.mesh === "glow" || q.mesh === "sign") continue;
    const c = Math.abs(Math.cos(q.rotY));
    const s = Math.abs(Math.sin(q.rotY));
    const hx = (q.w * c + q.d * s) / 2;
    const hz = (q.w * s + q.d * c) / 2;
    const top = q.y + q.h;
    const x0 = Math.max(0, Math.floor((q.x - hx + EXT) / G));
    const x1 = Math.min(HN - 1, Math.floor((q.x + hx + EXT) / G));
    const z0 = Math.max(0, Math.floor((q.z - hz + EXT) / G));
    const z1 = Math.min(HN - 1, Math.floor((q.z + hz + EXT) / G));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (top > hm[x * HN + z]) hm[x * HN + z] = top;
  }
  return hm;
}
const P_ = 14 + 2 * 1.1 + 2.6;
function blockShapes(hm: Float32Array): BlockShape[] {
  const out: BlockShape[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const cx = (i - 1.5) * P_;
      const cz = (j - 1.5) * P_;
      let n = 0;
      let c = 0;
      let sum = 0;
      let sq = 0;
      let max = 0;
      for (let x = Math.floor((cx - 7 + EXT) / G); x < Math.floor((cx + 7 + EXT) / G); x++)
        for (let z = Math.floor((cz - 7 + EXT) / G); z < Math.floor((cz + 7 + EXT) / G); z++) {
          n++;
          const h = hm[x * HN + z];
          if (h <= 0.3) continue;
          c++;
          sum += h;
          sq += h * h;
          max = Math.max(max, h);
        }
      const mean = c ? sum / c : 0;
      out.push({ cov: c / n, mean, max, std: c ? Math.sqrt(Math.max(0, sq / c - mean * mean)) : 0 });
    }
  return out;
}
function blockDist(a: BlockShape[], b: BlockShape[]) {
  let d = 0;
  for (let k = 0; k < a.length; k++) d += (Math.abs(a[k].cov - b[k].cov) + Math.min(1, Math.abs(a[k].mean - b[k].mean) / 4) + Math.min(1, Math.abs(a[k].max - b[k].max) / 8) + Math.min(1, Math.abs(a[k].std - b[k].std) / 2)) / 4;
  return d / a.length;
}
const hist = (xs: string[]) => xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {} as Record<string, number>);
function histDist(a: Record<string, number>, b: Record<string, number>) {
  const ta = Object.values(a).reduce((s, v) => s + v, 0) || 1;
  const tb = Object.values(b).reduce((s, v) => s + v, 0) || 1;
  let d = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) d += Math.abs((a[k] ?? 0) / ta - (b[k] ?? 0) / tb);
  return d / 2;
}
interface Decisions {
  org: Record<string, number>;
  families: Record<string, number>;
  roofs: Record<string, number>;
  styles: Record<string, number>;
}
const decisionDist = (a: Decisions, b: Decisions) => (histDist(a.org, b.org) + histDist(a.families, b.families) + histDist(a.roofs, b.roofs) + histDist(a.styles, b.styles)) / 4;

/* ───────────── a run of either generator, reduced to comparable facts ───────────── */

interface Run {
  /** Lot-grid owner key per lot (X*N+Y), "" = nobody. */
  owner: string[];
  /** Area per owner key (tiles²). */
  area: Map<string, number>;
  /** Buildings per owner key. */
  buildings: Map<string, number>;
  blocks: BlockShape[];
  dec: Decisions;
  landmark: { family: string; block: string; piece: string; floors: number } | null;
  /** Area by provenance class. */
  sources: Record<string, number>;
  /** "Blocks that speak": composed (BEFORE) or fully owned by one named region (AFTER). */
  speaking: number;
}

const keyCache = new WeakMap<object, Map<number, string>>();
const regionKey = (doc: RealPage["doc"], r: Region, sem?: Semantics) => {
  if (sem) {
    let m = keyCache.get(sem);
    if (!m) keyCache.set(sem, (m = regionKeys(doc, sem)));
    return m.get(r.id)!;
  }
  return `${r.kind}|${doc.nodes[r.node].selector}|${(r.title ?? "").slice(0, 40)}`;
};

function runAfter(page: RealPage, plan: Plan, seed = SEED): Run & { trace: KitTrace } {
  const trace = newTrace();
  const city = generateKitDistrict(page.fp, { profile: plan, time: "day", seed, trace });
  const alloc = trace.alloc!;
  const keys = plan.territories.map((t) => t.key);
  const owner = Array.from(alloc.owner, (si) => (si >= 0 ? keys[alloc.segments[si].territory] : ""));
  const area = new Map<string, number>();
  plan.territories.forEach((t, i) => area.set(t.key, (area.get(t.key) ?? 0) + alloc.lots[i] * LOT_AREA));
  const buildings = new Map<string, number>();
  for (const b of trace.buildings) buildings.set(keys[b.territory], (buildings.get(keys[b.territory]) ?? 0) + 1);
  const parts = trace.buildings.flatMap((b) => city.parts.slice(b.parts[0], b.parts[1]));
  const sources: Record<string, number> = { region: 0, remainder: 0, page: 0 };
  plan.territories.forEach((t, i) => (sources[t.source] += alloc.lots[i] * LOT_AREA));
  let speaking = 0;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const set = new Set<number>();
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) set.add(alloc.segments[alloc.owner[(i * 4 + a) * N + (j * 4 + b)]].territory);
      if (set.size === 1 && plan.territories[[...set][0]].source === "region") speaking++;
    }
  return {
    trace,
    owner,
    area,
    buildings,
    blocks: blockShapes(heightmap(parts)),
    dec: {
      org: hist(trace.pieces.map((p) => `${p.comp}/${p.piece.type}`)),
      families: hist(trace.buildings.map((b) => b.P.family)),
      roofs: hist(trace.buildings.map((b) => b.P.roof)),
      styles: hist(trace.buildings.map((b) => b.P.style)),
    },
    landmark: trace.landmark ? { family: trace.landmark.family, block: trace.landmark.block.join(","), piece: trace.landmark.piece, floors: trace.landmark.floors } : null,
    sources,
    speaking,
  };
}

function runBefore(page: RealPageV2, profile: ProfileV2, seed = SEED): Run & { trace: TraceV2 } {
  const trace: TraceV2 = { blocks: [], range: [0, 0] };
  const city = genV2(page.fp, { profile, time: "day", seed, trace });
  const keyOf = (b: SourcedBrief | null | undefined) => (!b ? "" : b.region < 0 ? "page|body|" : regionKey(page.doc, page.sem.regions[b.region], page.sem));
  // Rasterise ownership on 0.5-tile cells, then a lot cell's owner = the majority (≥ 25%).
  const cells = new Map<number, Map<string, number>>();
  const area = new Map<string, number>();
  const buildings = new Map<string, number>();
  const sources: Record<string, number> = { major: 0, minor: 0, fallback: 0 };
  const paint = (key: string, x0: number, x1: number, z0: number, z1: number) => {
    for (let x = Math.ceil(x0 / G) * G; x < x1; x += G)
      for (let z = Math.ceil(z0 / G) * G; z < z1; z += G) {
        const X = Math.floor((x + 2 * P_) / P_);
        const Y = Math.floor((z + 2 * P_) / P_);
        if (X < 0 || X > 3 || Y < 0 || Y > 3) continue;
        const [bx, bz] = blockCentre(X, Y);
        const a = Math.floor((x - (bx - 7)) / 3.5);
        const b = Math.floor((z - (bz - 7)) / 3.5);
        if (a < 0 || a > 3 || b < 0 || b > 3) continue;
        const k = (X * 4 + a) * N + (Y * 4 + b);
        const m = cells.get(k) ?? new Map<string, number>();
        m.set(key, (m.get(key) ?? 0) + 1);
        cells.set(k, m);
      }
  };
  const parts: Part[] = [];
  for (const blk of trace.blocks) {
    const [bx, bz] = blockCentre(blk.i, blk.j);
    if (blk.kind !== "lots") {
      const key = keyOf(blk.brief as SourcedBrief);
      paint(key, bx - 7, bx + 7, bz - 7, bz + 7);
      area.set(key, (area.get(key) ?? 0) + 196);
      sources.major += 196;
    }
    for (const b of blk.buildings) {
      const ps = city.parts.slice(b.parts[0], b.parts[1]).filter((q) => q.mesh !== "sprite" && q.mesh !== "glow" && q.mesh !== "sign");
      parts.push(...ps);
      const key = keyOf(b.brief as SourcedBrief);
      buildings.set(key, (buildings.get(key) ?? 0) + 1);
      if (blk.kind !== "lots") continue;
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const q of ps) {
        const c = Math.abs(Math.cos(q.rotY));
        const s = Math.abs(Math.sin(q.rotY));
        const hx = (q.w * c + q.d * s) / 2;
        const hz = (q.w * s + q.d * c) / 2;
        x0 = Math.min(x0, q.x - hx);
        x1 = Math.max(x1, q.x + hx);
        z0 = Math.min(z0, q.z - hz);
        z1 = Math.max(z1, q.z + hz);
      }
      if (!Number.isFinite(x0)) continue;
      paint(key, x0, x1, z0, z1);
      const a = b.w * b.d;
      area.set(key, (area.get(key) ?? 0) + a);
      if ((b.brief as SourcedBrief)?.region < 0) sources.fallback += a;
      else sources.minor += a;
    }
  }
  const owner = Array.from({ length: LOT_TOTAL }, (_, k) => {
    const m = cells.get(k);
    if (!m) return "";
    let best = "";
    let bv = 0;
    for (const [key, v] of m) if (v > bv) [best, bv] = [key, v];
    return bv >= 0.25 * 49 ? best : "";
  });
  const civic = trace.blocks.find((b) => b.kind === "civic");
  return {
    trace,
    owner,
    area,
    buildings,
    blocks: blockShapes(heightmap(parts)),
    dec: {
      org: hist(trace.blocks.map((b) => b.kind)),
      families: hist(trace.blocks.flatMap((b) => b.buildings.map((x) => x.P.family))),
      roofs: hist(trace.blocks.flatMap((b) => b.buildings.map((x) => x.P.roof))),
      styles: hist(trace.blocks.flatMap((b) => b.buildings.map((x) => x.P.style))),
    },
    landmark: civic ? { family: civic.buildings[0].P.family, block: `${civic.i},${civic.j}`, piece: "full", floors: civic.buildings[0].P.floors } : null,
    sources,
    speaking: trace.blocks.filter((b) => b.kind !== "lots").length,
  };
}

/* ───────────── elements: the AFTER partition is the reference description of the page ───────────── */

interface Element {
  key: string;
  label: string;
  kind: string;
  source: string;
  weight: number;
  region: number;
}

/** Map BEFORE owner keys onto elements (a container's area splits over its elements by weight). */
function toElements(run: Run, els: Element[], sem: Semantics, doc: RealPage["doc"]): { area: number[]; buildings: number[]; owner: number[] } {
  const byKey = new Map(els.map((e, i) => [e.key, i]));
  const nodes = doc.nodes;
  const resolve = (key: string): Array<[number, number]> => {
    if (byKey.has(key)) return [[byKey.get(key)!, 1]];
    if (key === "") return [];
    const r = sem.regions.find((x) => regionKey(doc, x, sem) === key);
    if (!r) return byKey.has("page|body|") ? [[byKey.get("page|body|")!, 1]] : [];
    // Inside an element's region?
    const host = els.findIndex((e) => e.region >= 0 && e.source === "region" && r.node > sem.regions[e.region].node && r.node < nodes[sem.regions[e.region].node].end);
    if (host >= 0) return [[host, 1]];
    // A container that the plan opened: its elements are the ones inside it.
    const inside = els.map((e, i) => [e, i] as const).filter(([e]) => e.region >= 0 && (e.region === r.id || (sem.regions[e.region].node >= r.node && sem.regions[e.region].node < nodes[r.node].end)));
    const tw = inside.reduce((s, [e]) => s + e.weight, 0);
    if (inside.length && tw > 0) return inside.map(([e, i]) => [i, e.weight / tw]);
    return byKey.has("page|body|") ? [[byKey.get("page|body|")!, 1]] : [];
  };
  const area = els.map(() => 0);
  const buildings = els.map(() => 0);
  for (const [k, v] of run.area) for (const [i, f] of resolve(k)) area[i] += v * f;
  for (const [k, v] of run.buildings) for (const [i, f] of resolve(k)) buildings[i] += v * f;
  const owner = run.owner.map((k) => {
    const r = resolve(k);
    if (!r.length) return -1;
    return r.sort((a, b) => b[1] - a[1])[0][0];
  });
  return { area, buildings, owner };
}

function fidelity(w: number[], area: number[]) {
  const tot = area.reduce((s, v) => s + v, 0) || 1;
  const a = area.map((v) => v / tot);
  const faithful = w.reduce((s, wi, i) => s + Math.min(wi, a[i]), 0);
  const sig = w.map((wi, i) => i).filter((i) => w[i] >= 0.005);
  const rank = (xs: number[]) => {
    const o = xs.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = xs.map(() => 0);
    o.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const rw = rank(sig.map((i) => w[i]));
  const ra = rank(sig.map((i) => a[i]));
  const n = sig.length;
  const rho = n > 2 ? 1 - (6 * rw.reduce((s, v, k) => s + (v - ra[k]) ** 2, 0)) / (n * (n * n - 1)) : NaN;
  const over = Math.max(...sig.map((i) => a[i] / w[i]));
  return { a, faithful, rho, over };
}

/** Connected components of each element on the 16×16 lot grid (4-neighbourhood). */
function contiguity(owner: number[], els: Element[]) {
  const comps = els.map(() => [] as number[]);
  const seen = new Uint8Array(LOT_TOTAL);
  for (let k = 0; k < LOT_TOTAL; k++) {
    const e = owner[k];
    if (e < 0 || seen[k]) continue;
    let size = 0;
    const stack = [k];
    seen[k] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      size++;
      const X = Math.floor(c / N);
      const Y = c % N;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = X + dx;
        const y = Y + dy;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const nk = x * N + y;
        if (!seen[nk] && owner[nk] === e) {
          seen[nk] = 1;
          stack.push(nk);
        }
      }
    }
    comps[e].push(size);
  }
  let num = 0;
  let den = 0;
  let split5 = 0;
  els.forEach((e, i) => {
    const tot = comps[i].reduce((s, v) => s + v, 0);
    if (tot < 2) return;
    num += e.weight * (Math.max(...comps[i]) / tot);
    den += e.weight;
    if (e.weight >= 0.05 && comps[i].length > 1) split5++;
  });
  return { comps, score: den ? num / den : NaN, split5 };
}

/** Fraction of owned lots whose owner changed; weighted centroid shift (tiles) of surviving owners. */
function ownershipChange(a: string[], b: string[], ignore?: string) {
  let changed = 0;
  let n = 0;
  for (let k = 0; k < LOT_TOTAL; k++) {
    if (!a[k] && !b[k]) continue;
    if (ignore !== undefined && a[k] === ignore) continue;
    n++;
    if (a[k] !== b[k]) changed++;
  }
  const centroid = (o: string[]) => {
    const m = new Map<string, [number, number, number]>();
    o.forEach((key, k) => {
      if (!key) return;
      const v = m.get(key) ?? [0, 0, 0];
      v[0] += Math.floor(k / N);
      v[1] += k % N;
      v[2]++;
      m.set(key, v);
    });
    return m;
  };
  const ca = centroid(a);
  const cb = centroid(b);
  let s = 0;
  let w = 0;
  for (const [key, va] of ca) {
    const vb = cb.get(key);
    if (!vb) continue;
    s += va[2] * Math.hypot(va[0] / va[2] - vb[0] / vb[2], va[1] / va[2] - vb[1] / vb[2]) * 3.5;
    w += va[2];
  }
  return { changed: n ? changed / n : 0, shift: w ? s / w : 0 };
}

/* ───────────── per page ───────────── */

interface PageRun {
  id: string;
  sibling?: string;
  page: RealPage;
  pageV2: RealPageV2;
  els: Element[];
  after: ReturnType<typeof runAfter>;
  before: ReturnType<typeof runBefore>;
  ea: ReturnType<typeof toElements>;
  eb: ReturnType<typeof toElements>;
}
const profileV2 = (p: RealPageV2): ProfileV2 => ({ identity: p.profile.identity, majors: p.profile.majors, minors: p.profile.minors });

const pages: PageRun[] = DATASET.map((e) => {
  const snap = load(e.id);
  const page = realPage(snap);
  const pageV2 = realPageV2(snap);
  const els: Element[] = page.plan.territories.map((t) => ({ key: t.key, label: t.label ?? "", kind: t.kind, source: t.source, weight: t.weight, region: t.source === "page" ? -1 : t.region }));
  const after = runAfter(page, page.plan);
  const before = runBefore(pageV2, profileV2(pageV2));
  return { id: e.id, sibling: e.sibling, page, pageV2, els, after, before, ea: toElements(after, els, page.sem, page.doc), eb: toElements(before, els, page.sem, page.doc) };
});
const main = pages.filter((p) => !p.sibling);
const ids = pages.map((p) => p.id);

/* A. fidelity, B. contiguity, F. coverage */
const fid = pages.map((p) => {
  const w = p.els.map((e) => e.weight);
  return { id: p.id, before: fidelity(w, p.eb.area), after: fidelity(w, p.ea.area), cb: contiguity(p.eb.owner, p.els), ca: contiguity(p.ea.owner, p.els) };
});

/* C. stability */
type Stab = { block: number; decision: number; owner: number; shift: number; note?: string };
const stab: Record<string, Record<string, { before: Stab; after: Stab }>> = {};
for (const p of pages) {
  stab[p.id] = {};
  for (const k of PERTURBATIONS) {
    const qa = realPage(load(p.id), k as Perturbation);
    const qb = realPageV2(load(p.id), k as Perturbation);
    const ra = runAfter(qa, qa.plan);
    const rb = runBefore(qb, profileV2(qb));
    const oa = ownershipChange(p.after.owner, ra.owner);
    const ob = ownershipChange(p.before.owner, rb.owner);
    stab[p.id][k] = {
      before: { block: blockDist(p.before.blocks, rb.blocks), decision: decisionDist(p.before.dec, rb.dec), owner: ob.changed, shift: ob.shift, note: qb.perturbed },
      after: { block: blockDist(p.after.blocks, ra.blocks), decision: decisionDist(p.after.dec, ra.dec), owner: oa.changed, shift: oa.shift },
    };
  }
}

/* C'. the specific effect: remove ONE small region (0.5–5% of the page), nothing else */
const removal: Array<{ id: string; label: string; w: number; before: { owner: number; block: number } | null; after: { owner: number; block: number } }> = [];
for (const p of main) {
  p.page.plan.territories.forEach((t, ti) => {
    if (t.source !== "region" || t.weight < 0.005 || t.weight >= 0.05 || ti === p.page.plan.hero) return;
    const plan: Plan = { ...p.page.plan, territories: p.page.plan.territories.filter((_, i) => i !== ti), hero: p.page.plan.hero > ti ? p.page.plan.hero - 1 : p.page.plan.hero };
    const ra = runAfter(p.page, plan);
    const after = { owner: ownershipChange(p.after.owner, ra.owner, t.key).changed, block: blockDist(p.after.blocks, ra.blocks) };
    const prof = profileV2(p.pageV2);
    const drop = (bs: SourcedBrief[]) => bs.filter((b) => b.region !== t.region);
    const minors = drop(prof.minors as SourcedBrief[]);
    const majors = drop(prof.majors as SourcedBrief[]);
    let before: { owner: number; block: number } | null = null;
    if (minors.length && (minors.length !== prof.minors.length || majors.length !== prof.majors.length)) {
      const rb = runBefore(p.pageV2, { ...prof, majors, minors });
      const key = regionKey(p.page.doc, p.page.sem.regions[t.region], p.page.sem);
      before = { owner: ownershipChange(p.before.owner, rb.owner, key).changed, block: blockDist(p.before.blocks, rb.blocks) };
    }
    removal.push({ id: p.id, label: `${t.kind} “${(t.label ?? "").slice(0, 20)}”`, w: t.weight, before, after });
  });
}

/* D. differentiation */
const pair = (f: (a: PageRun, b: PageRun) => number) => ids.map((a) => ids.map((b) => (a === b ? NaN : f(pages.find((p) => p.id === a)!, pages.find((p) => p.id === b)!))));
const pairBlockA = pair((a, b) => blockDist(a.after.blocks, b.after.blocks));
const pairBlockB = pair((a, b) => blockDist(a.before.blocks, b.before.blocks));
const pairDecA = pair((a, b) => decisionDist(a.after.dec, b.after.dec));
const pairDecB = pair((a, b) => decisionDist(a.before.dec, b.before.dec));
const pairOwnA = pair((a, b) => ownershipChange(a.after.owner.map((k) => (k ? kindOf(k) : "")), b.after.owner.map((k) => (k ? kindOf(k) : ""))).changed);
function kindOf(key: string) {
  return key.split("|")[0];
}
const seedCtl = pages.map((p) => {
  const vs = [8, 9, 10].map((s) => {
    const ra = runAfter(p.page, p.page.plan, s);
    const rb = runBefore(p.pageV2, profileV2(p.pageV2), s);
    return { a: { block: blockDist(p.after.blocks, ra.blocks), dec: decisionDist(p.after.dec, ra.dec) }, b: { block: blockDist(p.before.blocks, rb.blocks), dec: decisionDist(p.before.dec, rb.dec) } };
  });
  return { id: p.id, vs };
});
const idx = (id: string) => ids.indexOf(id);
const diffPairs: Array<[string, string]> = [];
for (const a of main) for (const b of main) if (a.id < b.id) diffPairs.push([a.id, b.id]);
const sibPairs = pages.filter((p) => p.sibling).map((p) => [p.id, p.sibling!] as [string, string]);
const stat = (vs: number[]) => {
  const ok = vs.filter(Number.isFinite);
  return { min: Math.min(...ok), mean: ok.reduce((s, v) => s + v, 0) / ok.length, max: Math.max(...ok) };
};

/* E. landmark diversity */
const lmKey = (l: Run["landmark"]) => {
  if (!l) return "none";
  const fb = l.floors <= 4 ? "≤4f" : l.floors <= 9 ? "5–9f" : l.floors <= 14 ? "10–14f" : l.floors <= 19 ? "15–19f" : "≥20f";
  return `${l.family} @${l.block} ${l.piece} ${fb}`;
};
const groups = (which: "before" | "after") => {
  const m = new Map<string, string[]>();
  for (const p of main) {
    const k = lmKey(p[which].landmark);
    m.set(k, [...(m.get(k) ?? []), p.id]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

/* style independence of the landmark: four style variants per page */
function styleVariants(fp: SiteFingerprint): Array<[string, SiteFingerprint]> {
  return [
    ["serif", { ...fp, type: { serif: 0.8, sans: 0.2, mono: 0 } }],
    ["mono", { ...fp, type: { serif: 0, sans: 0.2, mono: 0.8 } }],
    ["legacy", { ...fp, legacy: 1, type: { serif: 0, sans: 1, mono: 0 } }],
    ["rounded", { ...fp, roundness: 1, airiness: 1, type: { serif: 0, sans: 1, mono: 0 } }],
  ];
}
const styleLm = main.map((p) => {
  const after = styleVariants(p.page.fp).map(([n, fp]) => {
    const r = runAfter({ ...p.page, fp }, { ...p.page.plan, identity: fp });
    return `${n}:${r.landmark?.family ?? "none"}`;
  });
  const before = styleVariants(p.pageV2.fp).map(([n, fp]) => {
    const prof = { ...profileV2(p.pageV2), identity: fp };
    const r = runBefore({ ...p.pageV2, fp }, prof);
    return `${n}:${r.landmark?.family ?? "none"}`;
  });
  return { id: p.id, after, before, styles: styleVariants(p.page.fp).map(([n, fp]) => `${n}:${deriveGrammar(fp).style}`) };
});

/* Monotonicity: change ONE element's weight, rescale the rest, everything else constant. */
interface MonoRow {
  page: string;
  label: string;
  w0: number;
  levels: Array<{ w: number; afterLots: number; afterArea: number; afterBuildings: number; afterComps: number; beforeArea: number; beforeBuildings: number }>;
}
function mono(id: string, match: (e: Element) => boolean, levels: number[]): MonoRow {
  const p = pages.find((x) => x.id === id)!;
  const ti = p.els.findIndex(match);
  const t = p.page.plan.territories[ti];
  const regionId = t.region;
  const rows: MonoRow["levels"] = [];
  for (const w of levels) {
    const k = (1 - w) / (1 - t.weight);
    const plan: Plan = { ...p.page.plan, territories: p.page.plan.territories.map((x, i) => ({ ...x, weight: i === ti ? w : x.weight * k })) };
    const ra = runAfter(p.page, plan);
    const lots = ra.trace.alloc!.lots[ti];
    const comps = contiguity(toElements(ra, p.els, p.page.sem, p.page.doc).owner, p.els).comps[ti].length;
    // BEFORE: the same region's brief(s) at the same share, others rescaled.
    const scale = (bs: SourcedBrief[]) => bs.map((b) => (b.region === regionId ? { ...b, weight: w } : { ...b, weight: b.weight * k }));
    const prof = profileV2(p.pageV2);
    const rb = runBefore(p.pageV2, { ...prof, majors: scale(prof.majors as SourcedBrief[]), minors: scale(prof.minors as SourcedBrief[]) });
    const eb = toElements(rb, p.els, p.page.sem, p.page.doc);
    const totB = eb.area.reduce((s, v) => s + v, 0) || 1;
    rows.push({ w, afterLots: lots, afterArea: lots / LOT_TOTAL, afterBuildings: ra.trace.buildings.filter((b) => b.territory === ti).length, afterComps: comps, beforeArea: eb.area[ti] / totB, beforeBuildings: Math.round(eb.buildings[ti]) });
  }
  return { page: id, label: `${t.kind} “${(t.label ?? "").slice(0, 26)}”`, w0: t.weight, levels: rows };
}
const BIG = [0.05, 0.1, 0.2, 0.4, 0.7];
const SMALL = [0.002, 0.005, 0.01, 0.02, 0.05];
const monoRows = [
  mono("shop", (e) => e.kind === "pricing", BIG),
  mono("institution", (e) => e.kind === "feed", BIG),
  mono("reference", (e) => e.kind === "features" && e.label === "History", BIG),
  mono("forum", (e) => e.kind === "footer", SMALL),
  mono("saas", (e) => e.kind === "section" && e.label === "Changelog", SMALL),
  mono("news", (e) => e.kind === "nav", SMALL),
];
const monotone = (xs: number[]) => (Math.max(...xs) - Math.min(...xs) < 1e-9 ? "constant (ignores weight)" : xs.every((v, i) => i === 0 || v >= xs[i - 1] - 1e-9) ? "yes" : "**no**");

/* ───────────── outputs ───────────── */

const T: string[] = [];
T.push("# Semantic allocation — generated tables", "", `BEFORE = kit-v2 (massing pass, cycled minors). AFTER = kit (territories). Seed ${SEED}, day, same 14 frozen pages. Elements = the AFTER partition of each page (regions, container remainders, page remainder).`, "");

T.push("## A. Allocation fidelity", "", "faithful = Σ min(area share, weight share) (1 = land exactly ∝ weight). ρ = Spearman(weight, area) over elements ≥ 0.5%. over = max area/weight among them.", "", "| page | faithful B | faithful A | ρ B | ρ A | over B | over A |", "|---|---|---|---|---|---|---|");
for (const f of fid) T.push(`| ${f.id} | ${f2(f.before.faithful)} | **${f2(f.after.faithful)}** | ${f2(f.before.rho)} | ${f2(f.after.rho)} | ${f2(f.before.over)}× | ${f2(f.after.over)}× |`);
const mf = (k: "before" | "after", m: "faithful" | "rho") => stat(fid.map((f) => f[k][m]));
T.push(`| **mean** | ${f2(mf("before", "faithful").mean)} | **${f2(mf("after", "faithful").mean)}** | ${f2(mf("before", "rho").mean)} | ${f2(mf("after", "rho").mean)} | | |`);

T.push("", "### Extremes", "", "| page | element | weight | area B | area A | buildings B | buildings A |", "|---|---|---|---|---|---|---|");
for (const p of pages) {
  const f = fid.find((x) => x.id === p.id)!;
  const order = p.els.map((e, i) => i).sort((a, b) => p.els[b].weight - p.els[a].weight);
  const pick = new Set([order[0], ...p.els.map((e, i) => i).filter((i) => p.els[i].kind === "footer")]);
  for (const i of pick) {
    const e = p.els[i];
    T.push(`| ${p.id} | ${e.kind} “${e.label.slice(0, 24)}” | ${pct(e.weight)} | ${pct(f.before.a[i])} | ${pct(f.after.a[i])} | ${Math.round(p.eb.buildings[i])} | ${Math.round(p.ea.buildings[i])} |`);
  }
}

T.push("", "## B. Contiguity", "", "score = weight-averaged share of each element's land in its largest connected piece (lot grid, 4-neighbours; lots facing across a street are neighbours). split ≥5% = elements with ≥ 5% of the page in more than one piece.", "", "| page | score B | score A | split ≥5% B | split ≥5% A |", "|---|---|---|---|---|");
for (const f of fid) T.push(`| ${f.id} | ${f2(f.cb.score)} | **${f2(f.ca.score)}** | ${f.cb.split5} | ${f.ca.split5} |`);

T.push("", "## C. Stability (perturbation → change)", "", "owner = share of lots whose owner changed; shift = land-weighted centroid move of surviving owners (tiles); block / decision = the validation round's distances.", "", "| page | perturbation | owner B | owner A | shift B | shift A | block B | block A | decision B | decision A |", "|---|---|---|---|---|---|---|---|---|---|");
for (const p of pages)
  for (const k of PERTURBATIONS) {
    const s = stab[p.id][k];
    T.push(`| ${p.id} | ${k} | ${f2(s.before.owner)} | ${f2(s.after.owner)} | ${s.before.shift.toFixed(1)} | ${s.after.shift.toFixed(1)} | ${f2(s.before.block)} | ${f2(s.after.block)} | ${f2(s.before.decision)} | ${f2(s.after.decision)} |`);
  }
const allStab = pages.flatMap((p) => PERTURBATIONS.map((k) => stab[p.id][k]));
const cnt = (f: (s: (typeof allStab)[number]) => boolean) => allStab.filter(f).length;
T.push("", "| summary (56 runs) | BEFORE | AFTER |", "|---|---|---|");
T.push(`| owner change mean / max | ${f2(stat(allStab.map((s) => s.before.owner)).mean)} / ${f2(stat(allStab.map((s) => s.before.owner)).max)} | ${f2(stat(allStab.map((s) => s.after.owner)).mean)} / ${f2(stat(allStab.map((s) => s.after.owner)).max)} |`);
T.push(`| runs with owner change > 25% | ${cnt((s) => s.before.owner > 0.25)} | ${cnt((s) => s.after.owner > 0.25)} |`);
T.push(`| block ≤ 0.01 | ${cnt((s) => s.before.block <= 0.01)} | ${cnt((s) => s.after.block <= 0.01)} |`);
T.push(`| block ≤ 0.04 | ${cnt((s) => s.before.block <= 0.04)} | ${cnt((s) => s.after.block <= 0.04)} |`);
T.push(`| block max | ${f2(stat(allStab.map((s) => s.before.block)).max)} | ${f2(stat(allStab.map((s) => s.after.block)).max)} |`);
T.push(`| centroid shift mean (tiles) | ${stat(allStab.map((s) => s.before.shift)).mean.toFixed(2)} | ${stat(allStab.map((s) => s.after.shift)).mean.toFixed(2)} |`);

const rmB = removal.filter((r) => r.before).map((r) => r.before!);
const rmA = removal.filter((r) => r.before).map((r) => r.after);
T.push("", "### Removing one small region (0.5–5% of the page), everything else constant", "", `${rmA.length} removals present in both generators (regions that were briefs in BEFORE). owner = share of OTHER regions' lots whose owner changed.`, "", "| | BEFORE | AFTER |", "|---|---|---|");
T.push(`| owner change mean / max | ${f2(stat(rmB.map((x) => x.owner)).mean)} / ${f2(stat(rmB.map((x) => x.owner)).max)} | ${f2(stat(rmA.map((x) => x.owner)).mean)} / ${f2(stat(rmA.map((x) => x.owner)).max)} |`);
T.push(`| removals that change > 25% of the rest | ${rmB.filter((x) => x.owner > 0.25).length} | ${rmA.filter((x) => x.owner > 0.25).length} |`);
T.push(`| block mean / max | ${f2(stat(rmB.map((x) => x.block)).mean)} / ${f2(stat(rmB.map((x) => x.block)).max)} | ${f2(stat(rmA.map((x) => x.block)).mean)} / ${f2(stat(rmA.map((x) => x.block)).max)} |`);
T.push("", "| page | region | weight | owner B | owner A | block B | block A |", "|---|---|---|---|---|---|---|");
for (const r of removal.filter((x) => x.before)) T.push(`| ${r.id} | ${r.label} | ${pct(r.w)} | ${f2(r.before!.owner)} | ${f2(r.after.owner)} | ${f2(r.before!.block)} | ${f2(r.after.block)} |`);

T.push("", "## D. Differentiation", "", "| metric (min / mean / max) | seed only B | seed only A | siblings B | siblings A | different pages B | different pages A |", "|---|---|---|---|---|---|---|");
for (const [name, mb, ma, sb, sa] of [
  ["block", pairBlockB, pairBlockA, (s: (typeof seedCtl)[number]) => s.vs.map((v) => v.b.block), (s: (typeof seedCtl)[number]) => s.vs.map((v) => v.a.block)],
  ["decision", pairDecB, pairDecA, (s: (typeof seedCtl)[number]) => s.vs.map((v) => v.b.dec), (s: (typeof seedCtl)[number]) => s.vs.map((v) => v.a.dec)],
] as const) {
  const fm = (x: { min: number; mean: number; max: number }) => `${f2(x.min)} / ${f2(x.mean)} / ${f2(x.max)}`;
  T.push(`| ${name} | ${fm(stat(seedCtl.flatMap(sb)))} | ${fm(stat(seedCtl.flatMap(sa)))} | ${fm(stat(sibPairs.map(([a, b]) => mb[idx(a)][idx(b)])))} | ${fm(stat(sibPairs.map(([a, b]) => ma[idx(a)][idx(b)])))} | ${fm(stat(diffPairs.map(([a, b]) => mb[idx(a)][idx(b)])))} | ${fm(stat(diffPairs.map(([a, b]) => ma[idx(a)][idx(b)])))} |`);
}
const ratio = (m: number[][], s: (x: (typeof seedCtl)[number]) => number[]) => stat(diffPairs.map(([a, b]) => m[idx(a)][idx(b)])).mean / stat(seedCtl.flatMap(s)).mean;
T.push("", `page difference / seed noise (means): block B ${ratio(pairBlockB, (s) => s.vs.map((v) => v.b.block)).toFixed(1)}× → A ${ratio(pairBlockA, (s) => s.vs.map((v) => v.a.block)).toFixed(1)}×; decision B ${ratio(pairDecB, (s) => s.vs.map((v) => v.b.dec)).toFixed(1)}× → A ${ratio(pairDecA, (s) => s.vs.map((v) => v.a.dec)).toFixed(1)}×`);
const closest = (m: number[][]) => diffPairs.map(([a, b]) => [m[idx(a)][idx(b)], a, b] as const).sort((x, y) => x[0] - y[0]).slice(0, 5);
T.push("", "closest different pages (block): B " + closest(pairBlockB).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", ") + " · A " + closest(pairBlockA).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", "));
T.push("", "closest different pages (decision): B " + closest(pairDecB).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", ") + " · A " + closest(pairDecA).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", "));
T.push("", "### Block distance matrix (AFTER)", "", `| | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
ids.forEach((a, i) => T.push(`| ${a} | ${ids.map((b, j) => (i === j ? "·" : f2(pairBlockA[i][j]))).join(" | ")} |`));
T.push("", "### Decision distance matrix (AFTER)", "", `| | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
ids.forEach((a, i) => T.push(`| ${a} | ${ids.map((b, j) => (i === j ? "·" : f2(pairDecA[i][j]))).join(" | ")} |`));
void pairOwnA;

T.push("", "## E. Landmark", "", "| page | BEFORE | AFTER |", "|---|---|---|");
for (const p of main) T.push(`| ${p.id} | ${lmKey(p.before.landmark)} | ${lmKey(p.after.landmark)}${p.after.trace.landmark ? ` (${p.after.trace.landmark.role})` : ""} |`);
const withLm = (w: "before" | "after") => main.filter((p) => p[w].landmark).length;
const biggestReal = (w: "before" | "after") => groups(w).filter(([k]) => k !== "none")[0];
T.push("", `Pages with a landmark: BEFORE ${withLm("before")}/12, AFTER ${withLm("after")}/12. Largest group of pages sharing the SAME landmark (family + placement + massing): BEFORE ${biggestReal("before")[1].length}/12, AFTER ${biggestReal("after")[1].length}/12.`);
T.push("", `Largest group sharing family + placement + massing: BEFORE ${groups("before")[0][1].length}/12 (${groups("before")[0][0]}: ${groups("before")[0][1].join(", ")}) · AFTER ${groups("after")[0][1].length}/12 (${groups("after")[0][0]}: ${groups("after")[0][1].join(", ")}). Distinct combinations: BEFORE ${groups("before").length}, AFTER ${groups("after").length}.`);
T.push("", "Groups AFTER: " + groups("after").map(([k, v]) => `${k} → ${v.join(", ")}`).join(" · "));
T.push("", "### Style independence (landmark family under four forced styles)", "", "| page | styles | BEFORE | AFTER |", "|---|---|---|---|");
for (const s of styleLm) T.push(`| ${s.id} | ${s.styles.join(" ")} | ${s.before.join(" ")} | ${s.after.join(" ")} |`);
const famVar = (xs: string[]) => new Set(xs.map((x) => x.split(":")[1])).size;
T.push("", `Pages whose landmark family changes with style alone: BEFORE ${styleLm.filter((s) => famVar(s.before) > 1).length}/12, AFTER ${styleLm.filter((s) => famVar(s.after) > 1).length}/12.`);

T.push("", "## F. Semantic coverage", "", "AFTER land by source: a named region / a container's own content (remainder) / content outside every region (page). BEFORE: composed blocks of majors / lots of minor briefs / fallback / unattributed (yards between lots). Speaking blocks: BEFORE = composed blocks; AFTER = blocks owned entirely by one named region.", "", "| page | faithful B | faithful A | B major / minor / fallback / other | A region / remainder / page | speaking blocks B | A |", "|---|---|---|---|---|---|---|");
for (const p of pages) {
  const f = fid.find((x) => x.id === p.id)!;
  const tb = 16 * 196;
  const other = tb - p.before.sources.major - p.before.sources.minor - p.before.sources.fallback;
  T.push(`| ${p.id} | ${f2(f.before.faithful)} | ${f2(f.after.faithful)} | ${pct(p.before.sources.major / tb)} / ${pct(p.before.sources.minor / tb)} / ${pct(p.before.sources.fallback / tb)} / ${pct(other / tb)} | ${pct(p.after.sources.region / tb)} / ${pct(p.after.sources.remainder / tb)} / ${pct(p.after.sources.page / tb)} | ${p.before.speaking}/16 | ${p.after.speaking}/16 |`);
}

T.push("", "## Monotonicity (one element's weight changed, the rest rescaled)", "");
for (const r of monoRows) {
  T.push(`### ${r.page} · ${r.label} (actual ${pct(r.w0)})`, "", "| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |", "|---|---|---|---|---|---|---|");
  for (const l of r.levels) T.push(`| ${pct(l.w)} | ${l.afterLots} | ${pct(l.afterArea)} | ${l.afterBuildings} | ${l.afterComps} | ${pct(l.beforeArea)} | ${l.beforeBuildings} |`);
  T.push("", `monotone land: AFTER ${monotone(r.levels.map((l) => l.afterArea))}, BEFORE ${monotone(r.levels.map((l) => l.beforeArea))} · monotone buildings: AFTER ${monotone(r.levels.map((l) => l.afterBuildings))}, BEFORE ${monotone(r.levels.map((l) => l.beforeBuildings))}`, "");
}
writeFileSync(`${OUT}/tables.md`, T.join("\n") + "\n");

/* per-page audit traces */
for (const p of pages) {
  const f = fid.find((x) => x.id === p.id)!;
  const plan = p.page.plan;
  const tr = p.after.trace;
  const L: string[] = [`# ${p.id} — territories (AFTER)`, "", `URL: ${load(p.id).source.finalUrl}`, ""];
  L.push(`Landmark: ${tr.landmark ? `${tr.landmark.family} (${tr.landmark.role}), ${tr.landmark.floors} floors, on a ${tr.landmark.piece} piece of block ${tr.landmark.block}` : "none (no hero with an <h1>, or the hero got no land)"}`, "");
  L.push("| # | tier | territory | source | weight | lots | land | area B | buildings B → A | contiguous pieces B → A | organisation | why |", "|---|---|---|---|---|---|---|---|---|---|---|---|");
  plan.territories.forEach((t, i) => {
    const lots = tr.alloc!.lots[i];
    const pieces = tr.pieces.filter((x) => x.territory === i).map((x) => `${x.comp}:${x.piece.type}@${x.block.join(",")}`);
    L.push(`| ${i} | ${t.tier} | ${t.kind} “${(t.label ?? "").slice(0, 30)}” | ${t.source} | ${pct(t.weight)} | ${lots} | ${pct(f.after.a[i])} | ${pct(f.before.a[i])} | ${Math.round(p.eb.buildings[i])} → ${Math.round(p.ea.buildings[i])} | ${f.cb.comps[i].length} → ${f.ca.comps[i].length} | ${t.mix.map((m) => `${m.comp}${m.share < 1 ? ` ${Math.round(m.share * 100)}%` : ""}`).join(" + ")} | ${t.why.join("; ")} |`);
    if (pieces.length) L.push(`|  |  | ↳ pieces: ${pieces.join(" ")} | | | | | | | | | |`);
  });
  writeFileSync(`${OUT}/trace/${p.id}.md`, L.join("\n") + "\n");
}

writeFileSync(
  `${OUT}/report.json`,
  JSON.stringify(
    {
      fidelity: fid.map((f) => ({ id: f.id, before: { faithful: f.before.faithful, rho: f.before.rho, over: f.before.over }, after: { faithful: f.after.faithful, rho: f.after.rho, over: f.after.over }, contiguity: { before: f.cb.score, after: f.ca.score, split5Before: f.cb.split5, split5After: f.ca.split5 } })),
      stability: stab,
      seed: seedCtl,
      landmark: { before: groups("before"), after: groups("after"), style: styleLm },
      mono: monoRows,
      coverage: pages.map((p) => ({ id: p.id, before: p.before.sources, after: p.after.sources, speaking: { before: p.before.speaking, after: p.after.speaking } })),
    },
    null,
    1,
  ),
);
console.log("wrote", `${OUT}/tables.md`, `${OUT}/report.json`, `${OUT}/trace/*.md`);
