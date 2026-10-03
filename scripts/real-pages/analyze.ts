// Real-page validation: npx tsx scripts/real-pages/analyze.ts
// For every frozen page: facts → brief → block/building decisions (traced), a massing signature,
// and the controlled comparisons (pairwise, seed, perturbations, input sensitivity).
// Writes docs/real-pages/report.json, docs/real-pages/trace/<id>.md and docs/real-pages/tables.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SiteFingerprint } from "../../src/lib/fingerprint/fingerprint";
import { deriveGrammar } from "../../src/lib/pixelcity/grammar";
import type { Brief } from "../../src/lib/pixelcity/kit-v2/brief";
import { generateKitDistrict, type KitTrace, type Profile } from "../../src/lib/pixelcity/kit-v2/district";
import { CONTENT_RULES, MAJOR_SHARE, MAX_MAJORS, CONTAINER_SHARE, type SourcedBrief } from "../../src/lib/pixelcity/kit-v2/page-brief";
import { PERTURBATIONS, realPage, type Perturbation, type RealPage } from "../../src/lib/pixelcity/kit-v2/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "./dataset";

const OUT = "docs/real-pages";
mkdirSync(`${OUT}/trace`, { recursive: true });
const SEED = 7;

/* ───────────── generation + massing signature ───────────── */

interface Run {
  trace: KitTrace;
  /** Buildings only (no trees, plazas, street furniture, people). */
  hm: Float32Array;
  blocks: BlockShape[];
}
interface BlockShape {
  cov: number;
  mean: number;
  max: number;
  std: number;
}
const G = 0.5;
const EXT = 40;
const N = Math.round((2 * EXT) / G);

function run(fp: SiteFingerprint, profile: Profile, seed = SEED): Run {
  const trace: KitTrace = { blocks: [], range: [0, 0] };
  const city = generateKitDistrict(fp, { profile, time: "day", seed, trace });
  const parts = trace.blocks.flatMap((b) => b.buildings.flatMap((x) => city.parts.slice(x.parts[0], x.parts[1])));
  const hm = heightmap(parts);
  return { trace, hm, blocks: blockShapes(hm) };
}

/** Per block (fixed grid position): built coverage, mean/max/std of building height. */
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
          const h = hm[x * N + z];
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
/** 0 = every block has the same coverage and height profile. */
function blockDist(a: BlockShape[], b: BlockShape[]) {
  let d = 0;
  for (let k = 0; k < a.length; k++) d += (Math.abs(a[k].cov - b[k].cov) + Math.min(1, Math.abs(a[k].mean - b[k].mean) / 4) + Math.min(1, Math.abs(a[k].max - b[k].max) / 8) + Math.min(1, Math.abs(a[k].std - b[k].std) / 2)) / 4;
  return d / a.length;
}

/** Max top height per 0.5-tile cell over the blocks (people, glows and signs excluded). */
function heightmap(parts: Part[]): Float32Array {
  const hm = new Float32Array(N * N);
  for (const q of parts) {
    if (q.mesh === "sprite" || q.mesh === "glow" || q.mesh === "sign") continue;
    const c = Math.abs(Math.cos(q.rotY));
    const s = Math.abs(Math.sin(q.rotY));
    const hx = (q.w * c + q.d * s) / 2;
    const hz = (q.w * s + q.d * c) / 2;
    const top = q.y + q.h;
    const x0 = Math.max(0, Math.floor((q.x - hx + EXT) / G));
    const x1 = Math.min(N - 1, Math.floor((q.x + hx + EXT) / G));
    const z0 = Math.max(0, Math.floor((q.z - hz + EXT) / G));
    const z1 = Math.min(N - 1, Math.floor((q.z + hz + EXT) / G));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (top > hm[x * N + z]) hm[x * N + z] = top;
  }
  return hm;
}

/** 0 = identical massing, 1 = nothing in common (weighted Jaccard distance on heights). */
function massDist(a: Float32Array, b: Float32Array) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < a.length; i++) {
    num += Math.abs(a[i] - b[i]);
    den += Math.max(a[i], b[i]);
  }
  return den ? num / den : 0;
}

/* ───────────── decision summaries ───────────── */

const hist = <T extends string>(xs: T[]) => xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {} as Record<string, number>);
function histDist(a: Record<string, number>, b: Record<string, number>) {
  const ta = Object.values(a).reduce((s, v) => s + v, 0) || 1;
  const tb = Object.values(b).reduce((s, v) => s + v, 0) || 1;
  let d = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) d += Math.abs((a[k] ?? 0) / ta - (b[k] ?? 0) / tb);
  return d / 2;
}

function summary(t: KitTrace) {
  const bs = t.blocks.flatMap((b) => b.buildings);
  const floors = bs.map((b) => b.P.floors);
  const minorPrograms = new Set(t.blocks.filter((b) => b.kind === "lots").flatMap((b) => b.buildings.map((x) => `${x.P.family}/${x.P.roof}/${x.P.style}/${x.P.floors}`)));
  const lots = t.blocks.filter((b) => b.kind === "lots").flatMap((b) => b.buildings);
  const perBrief = hist(lots.map((x) => (x.brief as SourcedBrief | null)?.region?.toString() ?? "?"));
  return {
    blocks: t.blocks.map((b) => b.kind),
    blockHist: hist(t.blocks.map((b) => b.kind)),
    families: hist(bs.map((b) => b.P.family)),
    roofs: hist(bs.map((b) => b.P.roof)),
    styles: hist(bs.map((b) => b.P.style)),
    grounds: hist(bs.map((b) => b.P.ground)),
    signage: hist(bs.map((b) => b.P.signage)),
    buildings: bs.length,
    floors: { min: Math.min(...floors), max: Math.max(...floors), mean: floors.reduce((s, v) => s + v, 0) / floors.length },
    distinctLotPrograms: minorPrograms.size,
    lots: lots.length,
    lotsPerMinor: perBrief,
    landmark: t.blocks.find((b) => b.kind === "civic")?.buildings[0]?.P.family ?? "none",
  };
}
type Summary = ReturnType<typeof summary>;
const decisionDist = (a: Summary, b: Summary) => (histDist(a.blockHist, b.blockHist) + histDist(a.families, b.families) + histDist(a.roofs, b.roofs) + histDist(a.styles, b.styles)) / 4;

/* ───────────── pages ───────────── */

interface PageRun {
  id: string;
  category: string;
  url: string;
  sibling?: string;
  page: RealPage;
  profile: Profile;
  base: Run;
  sum: Summary;
}

const load = (id: string): DomSnapshot => JSON.parse(readFileSync(`${OUT}/snapshots/${id}.json`, "utf8"));
const profileOf = (p: RealPage): Profile => ({ identity: p.profile.identity, majors: p.profile.majors, minors: p.profile.minors });

const pages: PageRun[] = DATASET.map((e) => {
  const snap = load(e.id);
  const page = realPage(snap);
  const profile = profileOf(page);
  const base = run(page.fp, profile);
  return { id: e.id, category: e.category, url: snap.source.finalUrl, sibling: e.sibling, page, profile, base, sum: summary(base.trace) };
});
const main = pages.filter((p) => !p.sibling);

/* pairwise */
const pair: Record<string, Record<string, { mass: number; block: number; decision: number }>> = {};
for (const a of pages) {
  pair[a.id] = {};
  for (const b of pages) pair[a.id][b.id] = { mass: massDist(a.base.hm, b.base.hm), block: blockDist(a.base.blocks, b.base.blocks), decision: decisionDist(a.sum, b.sum) };
}

/* seed control */
const seedCtl: Record<string, Array<{ mass: number; block: number; decision: number }>> = {};
for (const p of pages)
  seedCtl[p.id] = [8, 9, 10].map((s) => {
    const r = run(p.page.fp, p.profile, s);
    return { mass: massDist(p.base.hm, r.hm), block: blockDist(p.base.blocks, r.blocks), decision: decisionDist(p.sum, summary(r.trace)) };
  });

/* perturbations */
const perturb: Record<string, Record<string, { mass: number; block: number; decision: number; note?: string; changes: string[] }>> = {};
for (const p of pages) {
  perturb[p.id] = {};
  for (const k of PERTURBATIONS) {
    const q = realPage(load(p.id), k as Perturbation);
    const prof = profileOf(q);
    const r = run(q.fp, prof);
    const s = summary(r.trace);
    perturb[p.id][k] = { mass: massDist(p.base.hm, r.hm), block: blockDist(p.base.blocks, r.blocks), decision: decisionDist(p.sum, s), note: q.perturbed, changes: diffChanges(p, q, s) };
  }
}

function diffChanges(p: PageRun, q: RealPage, s: Summary): string[] {
  const out: string[] = [];
  const g0 = deriveGrammar(p.page.fp);
  const g1 = deriveGrammar(q.fp);
  if (g0.style !== g1.style) out.push(`style ${g0.style} → ${g1.style}`);
  if (g0.secondary !== g1.secondary) out.push(`secondary ${g0.secondary} → ${g1.secondary}`);
  if (Math.abs(g0.verticality - g1.verticality) > 0.02) out.push(`verticality ${g0.verticality.toFixed(2)} → ${g1.verticality.toFixed(2)}`);
  if (g0.time !== g1.time) out.push(`time ${g0.time} → ${g1.time}`);
  const k0 = p.sum.blocks.join(",");
  const k1 = s.blocks.join(",");
  if (k0 !== k1) out.push(`blocks ${p.sum.blocks.filter((b) => b !== "lots").join("+")} → ${s.blocks.filter((b) => b !== "lots").join("+")}`);
  const m0 = p.page.profile.majors.map((b) => `${b.content}:${b.label ?? b.kind}`).join(" ");
  const m1 = q.profile.majors.map((b) => `${b.content}:${b.label ?? b.kind}`).join(" ");
  if (m0 !== m1) out.push(`majors [${m0}] → [${m1}]`);
  if (p.page.profile.minors.length !== q.profile.minors.length) out.push(`minors ${p.page.profile.minors.length} → ${q.profile.minors.length}`);
  else {
    const flips = p.page.profile.minors.map((b, i) => [b, q.profile.minors[i]] as const).filter(([a, b]) => a.content !== b.content || a.role !== b.role);
    if (flips.length) out.push(`minor content ${flips.map(([a, b]) => `“${a.label ?? a.kind}” ${a.content}→${b.content}`).join(", ")}`);
    const w = p.page.profile.minors.filter((b, i) => Math.abs(b.weight - q.profile.minors[i].weight) > 0.002 || b.repeat !== q.profile.minors[i].repeat).length;
    if (w) out.push(`${w} minor weight/repeat changes`);
  }
  return out;
}

/* fingerprint sensitivity: one field at a time, ±0.25 toward the middle */
const FIELDS = ["size", "depth", "breadth", "regularity", "sections", "textDensity", "imagery", "linkDensity", "headings", "interactivity", "forms", "roundness", "airiness", "ornament", "darkness", "legacy", "colorfulness", "type.serif", "type.mono", "hues"] as const;
function nudge(fp: SiteFingerprint, f: (typeof FIELDS)[number]): SiteFingerprint {
  const c = structuredClone(fp);
  const step = (v: number) => (v < 0.5 ? Math.min(1, v + 0.25) : Math.max(0, v - 0.25));
  if (f === "hues") c.hues = c.hues.length ? c.hues.slice(1) : [{ l: 0.6, c: 0.15, h: 40 }];
  else if (f === "type.serif" || f === "type.mono") {
    const k = f === "type.serif" ? "serif" : "mono";
    const v = step(c.type[k]);
    const d = v - c.type[k];
    c.type[k] = v;
    c.type.sans = Math.max(0, c.type.sans - d);
  } else (c as unknown as Record<string, number>)[f] = step((c as unknown as Record<string, number>)[f]);
  return c;
}
const sens: Record<string, Record<string, { mass: number; block: number; decision: number; grammar: string[] }>> = {};
for (const p of main) {
  sens[p.id] = {};
  for (const f of FIELDS) {
    const fp = nudge(p.page.fp, f);
    const prof = { ...p.profile, identity: fp };
    const r = run(fp, prof);
    const g0 = deriveGrammar(p.page.fp);
    const g1 = deriveGrammar(fp);
    const changes: string[] = [];
    if (g0.style !== g1.style) changes.push(`style ${g0.style}→${g1.style}`);
    if (g0.secondary !== g1.secondary) changes.push(`2nd ${g0.secondary}→${g1.secondary}`);
    if (Math.abs(g0.secondaryShare - g1.secondaryShare) > 0.01) changes.push(`share ${g0.secondaryShare.toFixed(2)}→${g1.secondaryShare.toFixed(2)}`);
    if (Math.abs(g0.verticality - g1.verticality) > 0.005) changes.push(`vert ${g0.verticality.toFixed(2)}→${g1.verticality.toFixed(2)}`);
    if (g0.time !== g1.time) changes.push(`time ${g0.time}→${g1.time}`);
    sens[p.id][f] = { mass: massDist(p.base.hm, r.hm), block: blockDist(p.base.blocks, r.blocks), decision: decisionDist(p.sum, summary(r.trace)), grammar: changes };
  }
}

/* brief-level sensitivity */
const briefSens: Record<string, Record<string, number>> = {};
const scale = (bs: Brief[], k: number, roles: Brief["role"][]) => bs.map((b) => (roles.includes(b.role) ? { ...b, weight: Math.min(1, b.weight * k) } : b));
for (const p of main) {
  const t = (prof: Profile) => blockDist(p.base.blocks, run(p.page.fp, prof).blocks);
  briefSens[p.id] = {
    "major weights ×1.25": t({ ...p.profile, majors: scale(p.profile.majors, 1.25, ["major", "landmark"]) }),
    "minor weights ×1.25": t({ ...p.profile, minors: scale(p.profile.minors, 1.25, ["minor", "support"]) }),
    "all repeats +3": t({ ...p.profile, majors: p.profile.majors.map((b) => ({ ...b, repeat: b.repeat + 3 })), minors: p.profile.minors.map((b) => ({ ...b, repeat: b.repeat + 3 })) }),
    "minor order reversed": t({ ...p.profile, minors: [...p.profile.minors].reverse() }),
    "first minor removed": p.profile.minors.length > 1 ? t({ ...p.profile, minors: p.profile.minors.slice(1) }) : NaN,
    "major content → text": t({ ...p.profile, majors: p.profile.majors.map((b) => (b.role === "major" ? { ...b, content: "text" as const } : b)) }),
  };
}

/* information collapse: which distinct facts end in the same decision */
const collapse: Record<string, Set<string>> = {};
const famFrom: Record<string, Set<string>> = {};
for (const p of pages) {
  for (const b of p.base.trace.blocks) {
    const sb = b.brief as SourcedBrief | null;
    if (sb) (collapse[`block:${b.kind}`] ??= new Set()).add(`${sb.kind}→${sb.content}`);
    for (const x of b.buildings) {
      const xb = x.brief as SourcedBrief | null;
      if (b.kind === "lots" && xb) (famFrom[`${x.P.family}`] ??= new Set()).add(`${xb.kind}/${xb.content}${xb.repeat >= 3 ? "/rep" : ""}`);
    }
  }
}

/* ───────────── outputs ───────────── */

const f2 = (v: number) => v.toFixed(2);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

for (const p of pages) {
  const fp = p.page.fp;
  const g = deriveGrammar(fp);
  const L: string[] = [];
  L.push(`# ${p.id} — ${p.category}`, "", `URL: ${p.url}`, "");
  L.push("## Extracted facts", "");
  L.push(`- nodes ${p.page.doc.nodes.length}, elements ${p.page.doc.stats.elements}, regions ${p.page.sem.regions.length}, districts ${p.page.sem.districts.length}, site name “${p.page.sem.siteName}”`);
  L.push(`- structure: size ${f2(fp.size)}, depth ${f2(fp.depth)}, breadth ${f2(fp.breadth)}, regularity ${f2(fp.regularity)}, sections ${f2(fp.sections)}`);
  L.push(`- content: text ${f2(fp.textDensity)}, imagery ${f2(fp.imagery)}, links ${f2(fp.linkDensity)}, headings ${f2(fp.headings)}, interactivity ${f2(fp.interactivity)}, forms ${f2(fp.forms)}`);
  L.push(`- style: serif ${f2(fp.type.serif)} / sans ${f2(fp.type.sans)} / mono ${f2(fp.type.mono)}, roundness ${f2(fp.roundness)}, airiness ${f2(fp.airiness)}, ornament ${f2(fp.ornament)}, darkness ${f2(fp.darkness)}, legacy ${f2(fp.legacy)}, ${fp.hues.length} hues`);
  L.push(`- grammar: **${g.style}** (2nd ${g.secondary}, share ${f2(g.secondaryShare)}), verticality ${f2(g.verticality)}, natural time ${g.time} (captures forced to day)`);
  L.push(`  - ${g.notes.join("\n  - ")}`, "");
  L.push("## Brief", "", "| # | role | content | weight | repeat | label | region | why |", "|---|---|---|---|---|---|---|---|");
  [...p.page.profile.majors, ...p.page.profile.minors].forEach((b, i) => L.push(`| ${i} | ${b.role} | ${b.content} | ${pct(b.weight)} | ${b.repeat} | ${b.label ?? ""} | ${b.kind} \`${b.selector.slice(0, 40)}\` | ${b.why.slice(0, 2).join("; ")} |`));
  if (p.page.profile.skipped.length) L.push("", "Skipped regions:", ...p.page.profile.skipped.map((s) => `- ${s.kind} “${s.title ?? ""}”: ${s.why}`));
  if (p.page.profile.suspicious.length) L.push("", "**Suspicious:**", ...p.page.profile.suspicious.map((s) => `- ${s}`));
  L.push("", "## Block and building decisions (blocks in priority order: centre first)", "");
  for (const b of p.base.trace.blocks) {
    const sb = b.brief as SourcedBrief | null;
    if (b.kind !== "lots") {
      L.push(`- block ${b.order} (${b.i},${b.j}) **${b.kind}** ← ${sb ? `${sb.role} ${sb.content} “${sb.label ?? sb.kind}”` : "-"}: ${b.buildings.map((x) => `${x.P.family} ${x.P.floors}f ${x.P.roof} ${x.P.style}`).join(", ")}`);
    } else {
      const fams = hist(b.buildings.map((x) => `${x.P.family}/${x.P.roof}`));
      L.push(`- block ${b.order} (${b.i},${b.j}) lots ×${b.buildings.length}: ${Object.entries(fams).map(([k, v]) => `${k}×${v}`).join(", ")}; floors ${b.buildings.map((x) => x.P.floors).join(" ")}`);
    }
  }
  const s = p.sum;
  L.push("", "## Summary", "", "```json", JSON.stringify({ ...s, lotsPerMinor: undefined }, null, 1), "```");
  writeFileSync(`${OUT}/trace/${p.id}.md`, L.join("\n") + "\n");
}

const T: string[] = [];
T.push("# Generated tables", "", `Adapter constants: MAJOR_SHARE ${MAJOR_SHARE}, MAX_MAJORS ${MAX_MAJORS}, CONTAINER_SHARE ${CONTAINER_SHARE}, content rules ${JSON.stringify(CONTENT_RULES)}. Seed ${SEED}, day.`, "");
T.push("## Pages", "", "| id | style (2nd) | vert | majors (content:label) | minors | blocks (non-lot) | landmark | buildings | floors mean/max | distinct lot programs |", "|---|---|---|---|---|---|---|---|---|---|");
for (const p of pages) {
  const g = deriveGrammar(p.page.fp);
  T.push(`| ${p.id} | ${g.style} (${g.secondary} ${f2(g.secondaryShare)}) | ${f2(g.verticality)} | ${p.page.profile.majors.map((b) => `${b.role === "landmark" ? "★" : ""}${b.content}:${b.label ?? b.kind}`).join(", ")} | ${p.page.profile.minors.length} | ${p.sum.blocks.filter((b) => b !== "lots").join(", ")} | ${p.sum.landmark} | ${p.sum.buildings} | ${p.sum.floors.mean.toFixed(1)}/${p.sum.floors.max} | ${p.sum.distinctLotPrograms}/${p.sum.lots} |`);
}
const ids = pages.map((p) => p.id);
T.push("", "## Block-morphology distance (per block: coverage, mean/max/std height; 0 = same)", "", `| | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
for (const a of ids) T.push(`| ${a} | ${ids.map((b) => (a === b ? "·" : f2(pair[a][b].block))).join(" | ")} |`);
T.push("", "## Massing distance (building heightmaps, 0.5-tile cells; 0 = same massing)", "", `| | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
for (const a of ids) T.push(`| ${a} | ${ids.map((b) => (a === b ? "·" : f2(pair[a][b].mass))).join(" | ")} |`);
T.push("", "## Decision distance (block kinds, families, roofs, styles; 0 = same mix)", "", `| | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
for (const a of ids) T.push(`| ${a} | ${ids.map((b) => (a === b ? "·" : f2(pair[a][b].decision))).join(" | ")} |`);
T.push("", "## Seed control (same page, seed 7 vs 8/9/10: block / mass / decision)", "", "| page | 8 | 9 | 10 |", "|---|---|---|---|");
for (const p of pages) T.push(`| ${p.id} | ${seedCtl[p.id].map((v) => `${f2(v.block)} / ${f2(v.mass)} / ${f2(v.decision)}`).join(" | ")} |`);
const others = (id: string) => ids.filter((x) => x !== id && !(pages.find((p) => p.id === x)?.sibling === id) && pages.find((p) => p.id === id)?.sibling !== x);
const stat = (vs: number[]) => `${f2(Math.min(...vs))} / ${f2(vs.reduce((s, v) => s + v, 0) / vs.length)} / ${f2(Math.max(...vs))}`;
T.push("", "## Noise floor vs page differences (min / mean / max)", "", "| metric | seed only | sibling pages | different pages |", "|---|---|---|---|");
for (const m of ["block", "mass", "decision"] as const) {
  const seedV = pages.flatMap((p) => seedCtl[p.id].map((v) => v[m]));
  const sib = pages.filter((p) => p.sibling).map((p) => pair[p.id][p.sibling!][m]);
  const diff = main.flatMap((a) => others(a.id).filter((b) => !pages.find((p) => p.id === b)?.sibling).map((b) => pair[a.id][b][m]));
  T.push(`| ${m} | ${stat(seedV)} | ${stat(sib)} | ${stat(diff)} |`);
}
T.push("", "## Perturbations (block / mass / decision distance; what changed)", "", "| page | perturbation | block | mass | decision | changed |", "|---|---|---|---|---|---|");
for (const p of pages) for (const k of PERTURBATIONS) {
  const r = perturb[p.id][k];
  T.push(`| ${p.id} | ${k} (${r.note}) | ${f2(r.block)} | ${f2(r.mass)} | ${f2(r.decision)} | ${r.changes.join("; ") || "—"} |`);
}
T.push("", "## Fingerprint sensitivity (block-morphology distance after moving one field by 0.25)", "", `| field | ${main.map((p) => p.id).join(" | ")} | max |`, `|---|${main.map(() => "---").join("|")}|---|`);
for (const f of FIELDS) {
  const vs = main.map((p) => sens[p.id][f].block);
  T.push(`| ${f} | ${vs.map((v, i) => `${f2(v)}${sens[main[i].id][f].grammar.length ? "*" : ""}`).join(" | ")} | ${f2(Math.max(...vs))} |`);
}
T.push("", "\\* the grammar changed: ", ...main.flatMap((p) => FIELDS.filter((f) => sens[p.id][f].grammar.length).map((f) => `- ${p.id} ${f}: ${sens[p.id][f].grammar.join(", ")}`)));
T.push("", "## Brief-level sensitivity (block-morphology distance)", "", `| change | ${main.map((p) => p.id).join(" | ")} |`, `|---|${main.map(() => "---").join("|")}|`);
for (const k of Object.keys(briefSens[main[0].id])) T.push(`| ${k} | ${main.map((p) => f2(briefSens[p.id][k])).join(" | ")} |`);
T.push("", "## Collapse: distinct facts → one decision", "", "| decision | from (region kind → content) |", "|---|---|");
for (const [k, v] of Object.entries(collapse)) T.push(`| ${k} | ${[...v].sort().join(", ")} |`);
for (const [k, v] of Object.entries(famFrom)) T.push(`| lot family ${k} | ${[...v].sort().join(", ")} |`);
writeFileSync(`${OUT}/tables.md`, T.join("\n") + "\n");

writeFileSync(
  `${OUT}/report.json`,
  JSON.stringify(
    {
      seed: SEED,
      pages: pages.map((p) => ({ id: p.id, url: p.url, category: p.category, summary: p.sum, majors: p.page.profile.majors.map(({ metrics, ...b }) => ({ ...b, metrics })), minors: p.page.profile.minors.length, suspicious: p.page.profile.suspicious })),
      pair,
      seedCtl,
      perturb,
      sens,
      briefSens,
    },
    null,
    1,
  ),
);
console.log("wrote", `${OUT}/tables.md`, `${OUT}/report.json`, `${OUT}/trace/*.md`);
