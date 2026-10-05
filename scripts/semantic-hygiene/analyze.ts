import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import type { Plan } from "../../src/lib/pixelcity/kit/plan";
import { PERTURBATIONS, realPage, type Perturbation } from "../../src/lib/pixelcity/kit/real-page";
import { LOT_TOTAL, N } from "../../src/lib/pixelcity/kit/territory";
import { generateKitDistrict as genV3, newTrace as newTraceV3, type KitTrace as TraceV3 } from "../../src/lib/pixelcity/kit-v3/district";
import type { Plan as PlanV3 } from "../../src/lib/pixelcity/kit-v3/plan";
import { realPage as realPageV3 } from "../../src/lib/pixelcity/kit-v3/real-page";
import type { Part, PixelCity } from "../../src/lib/pixelcity/types";
import { chromeOf } from "../../src/lib/semantics/hygiene";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

const OUT = "docs/semantic-hygiene";
mkdirSync(`${OUT}/trace`, { recursive: true });
const load = (id: string): DomSnapshot => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "–");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const FOCUS = ["forum", "oldweb", "institution", "media", "saas-2", "portfolio", "app", "docs", "shop"];

const G = 0.5;
const EXT = 40;
const HN = Math.round((2 * EXT) / G);
const P_ = 14 + 2 * 1.1 + 2.6;
type BlockShape = { cov: number; mean: number; max: number; std: number };
function heightmap(parts: Part[]) {
  const hm = new Float32Array(HN * HN);
  for (const q of parts) {
    if (q.mesh === "sprite" || q.mesh === "glow" || q.mesh === "sign") continue;
    const c = Math.abs(Math.cos(q.rotY));
    const s = Math.abs(Math.sin(q.rotY));
    const hx = (q.w * c + q.d * s) / 2;
    const hz = (q.w * s + q.d * c) / 2;
    const top = q.y + q.h;
    for (let x = Math.max(0, Math.floor((q.x - hx + EXT) / G)); x <= Math.min(HN - 1, Math.floor((q.x + hx + EXT) / G)); x++)
      for (let z = Math.max(0, Math.floor((q.z - hz + EXT) / G)); z <= Math.min(HN - 1, Math.floor((q.z + hz + EXT) / G)); z++) if (top > hm[x * HN + z]) hm[x * HN + z] = top;
  }
  return hm;
}
function blockShapes(hm: Float32Array): BlockShape[] {
  const out: BlockShape[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const cx = (i - 1.5) * P_;
      const cz = (j - 1.5) * P_;
      let n = 0, c = 0, sum = 0, sq = 0, max = 0;
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

interface Run {
  plan: Plan | PlanV3;
  trace: KitTrace | TraceV3;
  owner: string[];
  blocks: BlockShape[];
  dec: Record<string, Record<string, number>>;
  lots: number[];
}
function reduce(plan: Plan | PlanV3, trace: KitTrace | TraceV3, city: PixelCity): Run {
  const alloc = trace.alloc!;
  const keys = plan.territories.map((t) => t.key);
  const parts = trace.buildings.flatMap((b) => city.parts.slice(b.parts[0], b.parts[1]));
  return {
    plan,
    trace,
    owner: Array.from(alloc.owner, (si) => (si >= 0 ? keys[alloc.segments[si].territory] : "")),
    blocks: blockShapes(heightmap(parts)),
    dec: {
      org: hist(trace.pieces.map((p) => `${p.comp}/${p.piece.type}`)),
      fam: hist(trace.buildings.map((b) => b.P.family)),
      roof: hist(trace.buildings.map((b) => b.P.roof)),
      style: hist(trace.buildings.map((b) => b.P.style)),
    },
    lots: alloc.lots,
  };
}
const decDist = (a: Run, b: Run) => (histDist(a.dec.org, b.dec.org) + histDist(a.dec.fam, b.dec.fam) + histDist(a.dec.roof, b.dec.roof) + histDist(a.dec.style, b.dec.style)) / 4;
function after(id: string, pt: Perturbation = "none", seed = 7) {
  const p = realPage(load(id), pt);
  const tr = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, trace: tr });
  return { page: p, run: reduce(p.plan, tr, c) };
}
function before(id: string, pt: Perturbation = "none", seed = 7) {
  const p = realPageV3(load(id), pt);
  const tr = newTraceV3();
  const c = genV3(p.fp, { profile: p.plan, time: "day", seed, trace: tr });
  return { page: p, run: reduce(p.plan, tr, c) };
}

function ownerChange(a: string[], b: string[]) {
  let n = 0, ch = 0;
  for (let k = 0; k < LOT_TOTAL; k++) {
    if (!a[k] && !b[k]) continue;
    n++;
    if (a[k] !== b[k]) ch++;
  }
  return n ? ch / n : 0;
}
function contiguity(run: Run) {
  const owner = run.owner;
  const comps = new Map<string, number[]>();
  const seen = new Uint8Array(LOT_TOTAL);
  for (let k = 0; k < LOT_TOTAL; k++) {
    if (!owner[k] || seen[k]) continue;
    let size = 0;
    const st = [k];
    seen[k] = 1;
    while (st.length) {
      const c = st.pop()!;
      size++;
      const X = Math.floor(c / N), Y = c % N;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = X + dx, y = Y + dy;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const nk = x * N + y;
        if (!seen[nk] && owner[nk] === owner[k]) {
          seen[nk] = 1;
          st.push(nk);
        }
      }
    }
    comps.set(owner[k], [...(comps.get(owner[k]) ?? []), size]);
  }
  let num = 0, den = 0;
  run.plan.territories.forEach((t) => {
    const cs = comps.get(t.key) ?? [];
    const tot = cs.reduce((s, v) => s + v, 0);
    if (tot < 2) return;
    num += t.weight * (Math.max(...cs) / tot);
    den += t.weight;
  });
  return den ? num / den : 1;
}
const fidelity = (run: Run, w: (t: Run["plan"]["territories"][number]) => number) => {
  const tw = run.plan.territories.reduce((s, t) => s + w(t), 0) || 1;
  return run.plan.territories.reduce((s, t, i) => s + Math.min(run.lots[i] / LOT_TOTAL, w(t) / tw), 0);
};

const rows = DATASET.map((e) => {
  const A = after(e.id);
  const B = before(e.id);
  const chromeSet = (pg: { doc: typeof A.page.doc; sem: typeof A.page.sem }) => {
    const chrome = chromeOf(pg.doc, pg.sem);
    const chromeNodes = [...chrome.keys()].map((id) => pg.sem.regions[id].node);
    return {
      chrome: (region: number) => region >= 0 && (chrome.has(region) || chromeNodes.some((c) => pg.sem.regions[region].node >= c && pg.sem.regions[region].node < pg.doc.nodes[c].end)),
      footer: (region: number) => region >= 0 && pg.sem.regions[region].kind === "footer",
    };
  };
  const cA = chromeSet(A.page);
  const cB = chromeSet(B.page);
  const landShare = (run: Run, pred: (t: Run["plan"]["territories"][number]) => boolean) => run.plan.territories.reduce((s, t, i) => s + (pred(t) ? run.lots[i] : 0), 0) / LOT_TOTAL;
  const tv3 = B.run.plan.territories;
  const tv4 = A.page.plan.territories;
  const lm = (r: Run) => (r.trace.landmark ? `${r.trace.landmark.family} ${r.trace.landmark.floors}f ${r.trace.landmark.piece}` : "none");
  return {
    id: e.id,
    sibling: e.sibling,
    A,
    B,
    stats: {
      territories: [tv3.length, tv4.length],
      regions: [tv3.filter((t) => t.source === "region").length, tv4.filter((t) => t.source === "region").length],
      remainders: [tv3.filter((t) => t.source === "remainder").length, tv4.filter((t) => t.source === "remainder").length],
      observed: tv4.filter((t) => t.source === "observed").length,
      zeroLot: [B.run.lots.filter((l) => l === 0).length, A.run.lots.filter((l) => l === 0).length],
      images: A.page.doc.media?.total ?? 0,
      contentImages: A.page.doc.media?.content ?? 0,
      incidental: A.page.doc.media?.byReason,
      chromeRaw: tv4.filter((t) => cA.chrome(t.region)).reduce((s, t) => s + t.rawWeight, 0),
      chromeLandB: landShare(B.run, (t) => cB.chrome(t.region)),
      chromeLandA: landShare(A.run, (t) => cA.chrome(t.region)),
      footerRaw: tv4.filter((t) => cA.footer(t.region)).reduce((s, t) => s + t.rawWeight, 0),
      footerLandB: landShare(B.run, (t) => cB.footer(t.region)),
      footerLandA: landShare(A.run, (t) => cA.footer(t.region)),
      largestB: Math.max(...B.run.lots) / LOT_TOTAL,
      largestA: Math.max(...A.run.lots) / LOT_TOTAL,
      coverageB: landShare(B.run, (t) => t.source === "region"),
      coverageA: landShare(A.run, (t) => t.source === "region"),
      observedLand: landShare(A.run, (t) => t.source === "observed"),
      mediaLandB: B.run.plan.territories.reduce((s, t, i) => s + (t.mix.find((m) => m.comp === "media")?.share ?? 0) * B.run.lots[i], 0) / LOT_TOTAL,
      mediaLandA: A.run.plan.territories.reduce((s, t, i) => s + (t.mix.find((m) => m.comp === "media")?.share ?? 0) * A.run.lots[i], 0) / LOT_TOTAL,
      morph: blockDist(B.run.blocks, A.run.blocks),
      decision: decDist(B.run, A.run),
      landmark: [lm(B.run), lm(A.run)],
      merges: A.page.plan.hygiene?.merges ?? [],
      fallback: A.page.plan.hygiene?.fallback ?? false,
      semCoverage: A.page.plan.hygiene?.coverage ?? 0,
    },
  };
});
const main = rows.filter((r) => !r.sibling);
const ids = rows.map((r) => r.id);

const stat = (vs: number[]) => {
  const ok = vs.filter(Number.isFinite);
  return { min: Math.min(...ok), mean: ok.reduce((s, v) => s + v, 0) / ok.length, max: Math.max(...ok) };
};
const pairs: Array<[number, number]> = [];
for (let i = 0; i < main.length; i++) for (let j = i + 1; j < main.length; j++) pairs.push([i, j]);
const diffB = pairs.map(([i, j]) => blockDist(main[i].B.run.blocks, main[j].B.run.blocks));
const diffA = pairs.map(([i, j]) => blockDist(main[i].A.run.blocks, main[j].A.run.blocks));
const ddiffB = pairs.map(([i, j]) => decDist(main[i].B.run, main[j].B.run));
const ddiffA = pairs.map(([i, j]) => decDist(main[i].A.run, main[j].A.run));
const seedB: number[] = [], seedA: number[] = [], dseedB: number[] = [], dseedA: number[] = [];
for (const r of rows)
  for (const s of [8, 9, 10]) {
    const b = before(r.id, "none", s).run;
    const a = after(r.id, "none", s).run;
    seedB.push(blockDist(r.B.run.blocks, b.blocks));
    seedA.push(blockDist(r.A.run.blocks, a.blocks));
    dseedB.push(decDist(r.B.run, b));
    dseedA.push(decDist(r.A.run, a));
  }
const stab = rows.flatMap((r) =>
  PERTURBATIONS.map((k) => {
    const b = before(r.id, k as Perturbation).run;
    const a = after(r.id, k as Perturbation).run;
    return { id: r.id, k, ownerB: ownerChange(r.B.run.owner, b.owner), ownerA: ownerChange(r.A.run.owner, a.owner), blockB: blockDist(r.B.run.blocks, b.blocks), blockA: blockDist(r.A.run.blocks, a.blocks) };
  }),
);
const lmGroups = (w: "B" | "A") => {
  const m = new Map<string, string[]>();
  for (const r of main) {
    const run = r[w].run;
    const l = run.trace.landmark;
    const fb = !l ? "" : l.floors <= 4 ? "≤4f" : l.floors <= 9 ? "5–9f" : l.floors <= 14 ? "10–14f" : l.floors <= 19 ? "15–19f" : "≥20f";
    const k = l ? `${l.family} @${l.block.join(",")} ${l.piece} ${fb}` : "none";
    m.set(k, [...(m.get(k) ?? []), r.id]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};
const realLm = (w: "B" | "A") => lmGroups(w).filter(([k]) => k !== "none");

const T: string[] = ["# Semantic hygiene — generated tables", "", "BEFORE = kit-v3 (allocation pass). AFTER = kit (hygiene). Same 14 frozen pages, seed 7, day.", ""];
const HEAD = ["| page | territories | regions | remainders | zero-lot | images → content media | chrome raw → land B → land A | footer raw → land B → land A | largest territory B → A | named-region land B → A | media land B → A | morphology B→A | landmark B → A |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|"];
T.push("## Affected pages", "", HEAD[0], "|---|---|---|---|---|---|---|---|---|---|---|---|---|");
const line = (r: (typeof rows)[number]) => {
  const s = r.stats;
  return `| ${r.id} | ${s.territories[0]} → ${s.territories[1]}${s.observed ? ` (${s.observed} observed)` : ""} | ${s.regions[0]} → ${s.regions[1]} | ${s.remainders[0]} → ${s.remainders[1]} | ${s.zeroLot[0]} → ${s.zeroLot[1]} | ${s.images} → ${s.contentImages} | ${pct(s.chromeRaw)} → ${pct(s.chromeLandB)} → ${pct(s.chromeLandA)} | ${pct(s.footerRaw)} → ${pct(s.footerLandB)} → ${pct(s.footerLandA)} | ${pct(s.largestB)} → ${pct(s.largestA)} | ${pct(s.coverageB)} → ${pct(s.coverageA)} | ${pct(s.mediaLandB)} → ${pct(s.mediaLandA)} | ${f2(s.morph)} | ${s.landmark[0]} → ${s.landmark[1]} |`;
};
for (const id of FOCUS) T.push(line(rows.find((r) => r.id === id)!));
T.push("", "## Other pages (regression)", "", HEAD[0], "|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of rows.filter((x) => !FOCUS.includes(x.id))) T.push(line(r));
T.push("", "## Image census (AFTER extraction)", "", "| page | images | content | spacer | icon | repeated | named-ui |", "|---|---|---|---|---|---|---|");
for (const r of rows) {
  const b = r.stats.incidental ?? { spacer: 0, icon: 0, repeated: 0, "named-ui": 0 };
  T.push(`| ${r.id} | ${r.stats.images} | ${r.stats.contentImages} | ${b.spacer} | ${b.icon} | ${b.repeated} | ${b["named-ui"]} |`);
}
T.push("", "## Remainder merges", "");
for (const r of rows) if (r.stats.merges.length) T.push(`- **${r.id}** (${r.stats.merges.length}): ${r.stats.merges.map((m) => `${m.label} ${pct(m.weight)} — ${m.reason}`).join("; ")}`);
T.push("", "## Corpus regression", "", "| metric | BEFORE | AFTER |", "|---|---|---|");
const fm = (x: { min: number; mean: number; max: number }) => `${f2(x.min)} / ${f2(x.mean)} / ${f2(x.max)}`;
T.push(`| block distance, different pages (min / mean / max) | ${fm(stat(diffB))} | ${fm(stat(diffA))} |`);
T.push(`| block distance, seed only | ${fm(stat(seedB))} | ${fm(stat(seedA))} |`);
const ART = new Set(["forum", "oldweb"]);
const clean = pairs.map(([i, j], k) => [i, j, k] as const).filter(([i, j]) => !ART.has(main[i].id) && !ART.has(main[j].id)).map(([, , k]) => k);
T.push(`| block distance, different pages, without forum & oldweb (the two pages the hygiene targets) | ${fm(stat(clean.map((k) => diffB[k])))} | ${fm(stat(clean.map((k) => diffA[k])))} |`);
T.push(`| page difference / seed noise (block), without forum & oldweb | ${(stat(clean.map((k) => diffB[k])).mean / stat(seedB).mean).toFixed(1)}× | ${(stat(clean.map((k) => diffA[k])).mean / stat(seedA).mean).toFixed(1)}× |`);
T.push(`| page difference / seed noise (block) | ${(stat(diffB).mean / stat(seedB).mean).toFixed(1)}× | ${(stat(diffA).mean / stat(seedA).mean).toFixed(1)}× |`);
T.push(`| decision distance, different pages | ${fm(stat(ddiffB))} | ${fm(stat(ddiffA))} |`);
T.push(`| decision distance, seed only | ${fm(stat(dseedB))} | ${fm(stat(dseedA))} |`);
T.push(`| page difference / seed noise (decision) | ${(stat(ddiffB).mean / stat(dseedB).mean).toFixed(1)}× | ${(stat(ddiffA).mean / stat(dseedA).mean).toFixed(1)}× |`);
T.push(`| allocation fidelity to its own weights (mean) | ${f2(stat(rows.map((r) => fidelity(r.B.run, (t) => t.weight))).mean)} | ${f2(stat(rows.map((r) => fidelity(r.A.run, (t) => t.weight))).mean)} |`);
T.push(`| land vs RAW structural weight (mean; hygiene moves it on purpose) | ${f2(stat(rows.map((r) => fidelity(r.B.run, (t) => t.weight))).mean)} | ${f2(stat(rows.map((r) => fidelity(r.A.run, (t) => (t as { rawWeight?: number }).rawWeight ?? t.weight))).mean)} |`);
T.push(`| contiguity score (mean / min) | ${f2(stat(rows.map((r) => contiguity(r.B.run))).mean)} / ${f2(stat(rows.map((r) => contiguity(r.B.run))).min)} | ${f2(stat(rows.map((r) => contiguity(r.A.run))).mean)} / ${f2(stat(rows.map((r) => contiguity(r.A.run))).min)} |`);
T.push(`| perturbations: owner change mean / max | ${f2(stat(stab.map((s) => s.ownerB)).mean)} / ${f2(stat(stab.map((s) => s.ownerB)).max)} | ${f2(stat(stab.map((s) => s.ownerA)).mean)} / ${f2(stat(stab.map((s) => s.ownerA)).max)} |`);
T.push(`| perturbations: runs with owner change > 25% | ${stab.filter((s) => s.ownerB > 0.25).length} | ${stab.filter((s) => s.ownerA > 0.25).length} |`);
T.push(`| perturbations: block ≤ 0.01 / ≤ 0.04 / max | ${stab.filter((s) => s.blockB <= 0.01).length} / ${stab.filter((s) => s.blockB <= 0.04).length} / ${f2(stat(stab.map((s) => s.blockB)).max)} | ${stab.filter((s) => s.blockA <= 0.01).length} / ${stab.filter((s) => s.blockA <= 0.04).length} / ${f2(stat(stab.map((s) => s.blockA)).max)} |`);
T.push(`| landmark: largest group sharing family + placement + massing | ${realLm("B")[0]?.[1].length ?? 0}/12 | ${realLm("A")[0]?.[1].length ?? 0}/12 |`);
T.push(`| landmark: pages with a landmark / distinct combinations | ${main.filter((r) => r.B.run.trace.landmark).length}/12 · ${lmGroups("B").length} | ${main.filter((r) => r.A.run.trace.landmark).length}/12 · ${lmGroups("A").length} |`);
T.push("", "Landmark groups AFTER: " + lmGroups("A").map(([k, v]) => `${k} → ${v.join(", ")}`).join(" · "));
T.push("", "Perturbation runs with block > 0.04 or owner > 25% (AFTER):", "");
for (const s of stab.filter((x) => x.blockA > 0.04 || x.ownerA > 0.25)) T.push(`- ${s.id} ${s.k}: owner ${f2(s.ownerB)} → ${f2(s.ownerA)}, block ${f2(s.blockB)} → ${f2(s.blockA)}`);
T.push("", "Mean block distance of each page to the other 11 (BEFORE → AFTER): " + main.map((r, i) => {
  const mb = pairs.map(([a, b], k) => (a === i || b === i ? diffB[k] : NaN)).filter(Number.isFinite);
  const ma = pairs.map(([a, b], k) => (a === i || b === i ? diffA[k] : NaN)).filter(Number.isFinite);
  return `${r.id} ${f2(mb.reduce((s, v) => s + v, 0) / mb.length)} → ${f2(ma.reduce((s, v) => s + v, 0) / ma.length)}`;
}).join(", "));
T.push("", "Closest different pages AFTER (block, with decision distance): " + pairs.map(([i, j], k) => [diffA[k], main[i].id, main[j].id, ddiffA[k]] as const).sort((a, b) => a[0] - b[0]).slice(0, 5).map(([v, a, b, d]) => `${a}×${b} ${f2(v)} (decision ${f2(d)})`).join(", "));
T.push("", "Closest different pages AFTER (block): " + pairs.map(([i, j], k) => [diffA[k], main[i].id, main[j].id] as const).sort((a, b) => a[0] - b[0]).slice(0, 5).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", "));
T.push("", "Closest different pages BEFORE (block): " + pairs.map(([i, j], k) => [diffB[k], main[i].id, main[j].id] as const).sort((a, b) => a[0] - b[0]).slice(0, 5).map(([v, a, b]) => `${a}×${b} ${f2(v)}`).join(", "));
writeFileSync(`${OUT}/tables.md`, T.join("\n") + "\n");

for (const r of rows) {
  const plan = r.A.page.plan;
  const L = [`# ${r.id} — hygiene trace`, "", `URL: ${load(r.id).source.finalUrl}`, ""];
  const h = plan.hygiene!;
  L.push(`- images ${h.media?.total ?? 0}: content ${h.media?.content ?? 0}, incidental ${h.media?.incidental ?? 0} (${Object.entries(h.media?.byReason ?? {}).filter(([k, v]) => k !== "content" && v).map(([k, v]) => `${k} ${v}`).join(", ") || "—"})`);
  L.push(`- named-region coverage of the content: ${pct(h.coverage)}${h.fallback ? " → **observed-block fallback**" : ""}`);
  L.push(`- chrome: ${pct(h.chrome.before)} → ${pct(h.chrome.after)} over ${h.chrome.regions} region(s) (S → S/(1+S))`);
  L.push(`- remainder merges: ${h.merges.length ? h.merges.map((m) => `${m.label} ${pct(m.weight)} (${m.reason})`).join("; ") : "none"}`, "");
  L.push("| # | territory | source | rawWeight | urbanWeight | lots | organisation | why |", "|---|---|---|---|---|---|---|---|");
  plan.territories.forEach((t, i) => L.push(`| ${i} | ${t.kind} “${(t.label ?? "").slice(0, 30)}” | ${t.source} | ${pct(t.rawWeight)} | ${pct(t.weight)} | ${r.A.run.lots[i]} | ${t.mix.map((m) => `${m.comp}${m.share < 1 ? ` ${Math.round(m.share * 100)}%` : ""}`).join(" + ")} | ${t.why.join("; ")} |`));
  writeFileSync(`${OUT}/trace/${r.id}.md`, L.join("\n") + "\n");
}
writeFileSync(`${OUT}/report.json`, JSON.stringify({ pages: rows.map((r) => ({ id: r.id, ...r.stats })), stability: stab, landmark: { before: lmGroups("B"), after: lmGroups("A") } }, null, 1));
console.log("wrote", `${OUT}/tables.md`, `${OUT}/report.json`, `${OUT}/trace/*.md`, ids.length, "pages");
