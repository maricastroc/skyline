import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { groupFixture } from "../../src/lib/pixelcity/kit/fixtures";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { withoutItems } from "../../src/lib/pixelcity/kit/items";
import { structureOf, withoutStructure } from "../../src/lib/pixelcity/kit/structure";
import { allocate } from "../../src/lib/pixelcity/kit/territory";
import type { Part } from "../../src/lib/pixelcity/types";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;

const el = (tag: string, o: Partial<SnapshotNode> = {}, children: SnapshotNode[] = []): SnapshotNode => ({ tag, text: 0, ...o, children });
const txt = (tag: string, chars: number, sample?: string) => el(tag, { text: chars, sample, own: sample });
let n = 0;
const link = (chars = 10) => el("a", { text: chars, sample: `link ${n}`, own: `link ${n}`, attrs: { href: `/x/${n++}` } });
const ul = (k: number) => el("ul", {}, Array.from({ length: k }, () => el("li", {}, [link()])));
const count = (x: SnapshotNode): number => 1 + x.children.reduce((s, c) => s + count(c), 0);
function page(body: SnapshotNode[]): DomSnapshot {
  const root = el("body", {}, [el("main", {}, body)]);
  return { version: 1, source: { requestedUrl: "https://example.test/", finalUrl: "https://example.test/", strategy: "static", fetchedAt: "", status: 200, bytes: 0, durationMs: 0, redirects: [] }, document: { title: "Test" }, styles: { colors: [] }, stats: { elementCount: count(root), maxDepth: 8, truncated: false }, root, warnings: [] };
}
const structure = (body: SnapshotNode[]) => {
  const doc = normalize(page(body));
  return structureOf(doc, [0], []);
};
const headed = (sizes: number[], level = 4) => sizes.flatMap((k, i) => [txt(`h${level}`, 8, `Group ${i}`), ul(k)]);

console.log("# A. Page Model — the structure descriptor");
console.log("\n## synthetic pages (same 120 links, only the organisation changes)");
for (const [name, sizes] of [
  ["1 × 120", [120]],
  ["2 × 60", [60, 60]],
  ["4 × 30", [30, 30, 30, 30]],
  ["6 × 20", [20, 20, 20, 20, 20, 20]],
  ["12 × 10", Array(12).fill(10)],
] as Array<[string, number[]]>) {
  const s = structure(sizes.length === 1 ? [ul(120)] : headed(sizes));
  const want = sizes.length === 1 ? 0 : sizes.length;
  check(`${name}: ${want ? `${want} explicit groups` : "one sequence"}`, s.groups.length === want && (want ? s.source === "explicit" : s.source === "none"), `${s.source}, ${s.groups.length} groups, items ${s.groups.map((g) => g.items).join("/")}`);
}
{
  const s = structure(headed([60, 30, 18, 12]));
  const shares = s.groups.map((g) => g.share);
  check("50/25/15/10: group shares follow the item counts", s.groups.map((g) => g.items).join("/") === "60/30/18/12" && shares[0] > shares[1] && shares[1] > shares[2] && shares[2] > shares[3], shares.map((x) => x.toFixed(2)).join("/"));
}
{
  const s = structure([txt("h2", 9, "Section A"), ...headed([10, 10]), txt("h2", 9, "Section B"), ...headed([10, 10, 10])]);
  check("h2 sections above h4 groups: 5 groups in 2 sections", s.groups.length === 5 && s.sections === 2 && s.groups.map((g) => g.section).join("") === "00111", `${s.groups.length} groups, ${s.sections} sections, sections ${s.groups.map((g) => g.section).join("")}`);
}
{
  const items = Array.from({ length: 20 }, () => el("article", {}, [el("h2", {}, [link(40)]), txt("p", 60), link(8)]));
  const s = structure(items);
  check("headings that are item titles (links) do not make groups", s.source === "none" && s.groups.length === 0, s.evidence[0]);
}
{
  const s = structure([ul(10), ul(10), ul(10)]);
  check("3 sibling <ul> lists of 10 (no headings): inferred, 3 groups", s.source === "inferred" && s.groups.length === 3, s.evidence[0]);
  const t = structure([ul(40), ul(2), ul(1)]);
  check("one real list + two tiny ones: no inferred groups", t.source === "none", t.evidence[0]);
  const u = structure([ul(60), ul(4)]);
  check("a small list under 10% of the items is not a group", u.source === "none", u.evidence[0]);
}
{
  const cols = Array.from({ length: 4 }, () => el("div", { classes: ["col"] }, Array.from({ length: 12 }, () => link())));
  const s = structure(cols);
  check("layout columns (div) of links are not groups", s.source === "none", s.evidence[0]);
  const dl = Array.from({ length: 6 }, () => el("dl", {}, [txt("dt", 20), el("dd", {}, [link(), link(), link(), txt("p", 80)])]));
  const d = structure(dl);
  check("a series of definition lists (entries) is not a series of groups", d.source === "none", d.evidence[0]);
}
{
  const a = structure(headed([12, 30, 8]));
  const b = structure(headed([12, 30, 8]));
  check("deterministic", JSON.stringify(a) === JSON.stringify(b));
}

console.log("\n## real pages");
const pages = new Map(DATASET.map((e) => [e.id, realPage(snap(e.id))] as const));
{
  const d = pages.get("directory")!.plan.territories;
  const lists = d.filter((t) => t.kind === "features");
  check(
    "craigslist: every country-list territory keeps its headed sub-lists",
    lists.length === 5 && lists.every((t) => t.structure?.source === "explicit") && lists.map((t) => t.structure!.groups.length).join("/") === "12/27/21/19/7",
    lists.map((t) => `${t.label} ${t.structure!.groups.length}`).join(", "),
  );
  const rest = d.find((t) => t.kind === "remainder")!;
  check("craigslist: the page remainder (US + Oceania) keeps 41 sub-lists in 2 headed sections", rest.structure!.groups.length === 41 && rest.structure!.sections === 2, `${rest.structure!.groups.length} groups, ${rest.structure!.sections} sections`);
  const sum = lists.reduce((s, t) => s + t.structure!.groups.reduce((a, g) => a + g.items, 0), 0);
  const all = lists.reduce((s, t) => s + t.metrics.links, 0);
  check("craigslist: group sizes account for the list links", sum >= 0.95 * all, `${sum} of ${all} links in groups`);
}
{
  const pg = pages.get("oldweb")!.plan.territories;
  const main = pg.reduce((a, b) => (b.weight > a.weight ? b : a));
  check("Paul Graham: the 215-link list stays one sequence", main.structure?.source === "none" && main.structure.items === 215, `${main.structure?.source}, ${main.structure?.items} items`);
}
{
  const forum = pages.get("forum")!.plan.territories.reduce((a, b) => (b.weight > a.weight ? b : a));
  check("lobste.rs: 25 titled stories are one list, not 49 groups", forum.structure?.source === "none", forum.structure?.evidence[0] ?? "");
}
{
  const parcelled = [...pages].flatMap(([id, p]) => p.plan.territories.filter((t) => t.mix.some((m) => m.comp === "parcelled")).map((t) => ({ id, t })));
  const structured = parcelled.filter(({ t }) => t.structure!.source !== "none");
  check("among parcelled territories, only the explicitly grouped ones carry structure", structured.every(({ id }) => id === "directory"), structured.map(({ id, t }) => `${id}/${t.kind}`).join(", "));
  const inferred = [...pages].flatMap(([id, p]) => p.plan.territories.filter((t) => t.structure!.source === "inferred").map((t) => `${id}/${t.kind} ${t.structure!.groups.length}`));
  check("inferred groups are rare and small", inferred.length <= 6, inferred.join(", "));
}
{
  const src = readFileSync("src/lib/pixelcity/kit/structure.ts", "utf8");
  check("the descriptor never reads a URL, host, site name or specific words", !/hostname|finalUrl|requestedUrl|siteName|country|essay|product/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
}

console.log("\n## additive only: the descriptor never moves the land");
{
  let alloc = 0;
  for (const e of DATASET) {
    const p = pages.get(e.id)!;
    const a = allocate(p.plan);
    const b = allocate(withoutStructure(p.plan));
    if (JSON.stringify({ path: a.path, owner: [...a.owner], segments: a.segments, lots: a.lots }) === JSON.stringify({ path: b.path, owner: [...b.owner], segments: b.segments, lots: b.lots })) alloc++;
  }
  check("structure on × off: allocation, path, owners, segments and lots byte-identical", alloc === DATASET.length, `${alloc}/${DATASET.length}`);
  const t = newTrace();
  generateKitDistrict(pages.get("directory")!.fp, { profile: pages.get("directory")!.plan, time: "day", seed: 7, trace: t });
  check("the descriptor and its evidence are in the trace", t.plan!.territories.every((x) => x.structure && x.structure.evidence.length > 0));
}

console.log("\n# B. Composition — parcelled consuming the descriptor");
const raster = (parts: Part[]) => {
  const m = new Map<number, number>();
  for (const q of parts) {
    if (q.mesh === "sign" || q.mesh === "sprite" || q.mesh === "glow" || q.y + q.h < 0.3) continue;
    const c = Math.abs(Math.cos(q.rotY));
    const s = Math.abs(Math.sin(q.rotY));
    const hw = (q.w * c + q.d * s) / 2;
    const hd = (q.w * s + q.d * c) / 2;
    for (let x = Math.ceil((q.x - hw) * 4); x <= Math.floor((q.x + hw) * 4); x++)
      for (let z = Math.ceil((q.z - hd) * 4); z <= Math.floor((q.z + hd) * 4); z++) {
        const k = x * 100000 + z;
        m.set(k, Math.max(m.get(k) ?? 0, q.y + q.h));
      }
  }
  return m;
};
const planChange = (a: Map<number, number>, b: Map<number, number>, inside?: (k: number) => boolean) => {
  let n = 0;
  let d = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (inside && !inside(k)) continue;
    n++;
    if (Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0)) > 0.15) d++;
  }
  return n ? d / n : 0;
};
const fx = (sizes: number[]) => {
  const t = newTrace();
  const c = generateKitDistrict(vacantFingerprint(), { profile: groupFixture(sizes, vacantFingerprint()), time: "day", seed: 7, flat: true, trace: t });
  return { c, t, r: raster(c.parts) };
};
console.log("\n## synthetic: same land, items, program, style and seed; only the organisation changes");
{
  const runs = [[120], [60, 60], [30, 30, 30, 30], Array(6).fill(20), Array(12).fill(10)].map((s) => ({ s, ...fx(s) }));
  const base = runs[0];
  const rows = runs.map(({ s, t, r }) => ({ groups: s.length, passages: t.frontage[0]?.passages ?? 0, clusters: t.frontage[0]?.clusters ?? 1, change: planChange(base.r, r) }));
  console.log("  groups · clusters · passages · ground plan changed vs 1 group");
  for (const x of rows) console.log(`  ${String(x.groups).padStart(6)} · ${String(x.clusters).padStart(8)} · ${String(x.passages).padStart(8)} · ${(100 * x.change).toFixed(2)}%`);
  check("1 group (no structure): no frontage plan", !base.t.frontage.length);
  check("passages grow strictly with the number of groups", rows.every((x, i) => i === 0 || x.passages > rows[i - 1].passages), rows.map((x) => x.passages).join(" < "));
  check("the ground plan changes more as the organisation is more segmented", rows.every((x, i) => i === 0 || x.change > rows[i - 1].change), rows.map((x) => (100 * x.change).toFixed(2) + "%").join(" < "));
  check("segmentation is limited: ≤ 5% of the ground plan even at 12 groups", rows[rows.length - 1].change <= 0.05, `${(100 * rows[rows.length - 1].change).toFixed(2)}%`);
  const same = fx([120]);
  check("deterministic", JSON.stringify([...same.r]) === JSON.stringify([...base.r]));
  const total = (t: ReturnType<typeof fx>["t"]) => t.buildings.reduce((a, b) => a + b.w * b.d, 0);
  check("land and pieces unchanged: the same pieces, and built footprint within 3%", JSON.stringify(runs.map((x) => x.t.pieces.map((p) => [p.piece.type, p.piece.x, p.piece.z]))) === JSON.stringify(runs.map(() => base.t.pieces.map((p) => [p.piece.type, p.piece.x, p.piece.z]))) && runs.every((x) => Math.abs(total(x.t) / total(base.t) - 1) < 0.03), runs.map((x) => (total(x.t) / total(base.t)).toFixed(3)).join(" / "));
}
{
  console.log("\n## weights: bigger groups get proportionally more frontage");
  for (const [name, sizes] of [
    ["50/50", [60, 60]],
    ["80/20", [96, 24]],
    ["50/25/15/10", [60, 30, 18, 12]],
  ] as Array<[string, number[]]>) {
    const f = fx(sizes).t.frontage[0];
    const share = f.clusterSlots.map((x) => x / f.slots);
    const want = sizes.map((x) => x / sizes.reduce((a, b) => a + b, 0));
    const err = Math.max(...share.map((x, i) => Math.abs(x - want[i])));
    check(`${name}: frontage shares follow the group sizes (± 3 points)`, share.length === sizes.length && err <= 0.03, `slots ${f.clusterSlots.join("/")} of ${f.slots}`);
  }
}

console.log("\n## real pages: only territories with structure change");
{
  let identical = 0;
  const changed: string[] = [];
  for (const e of DATASET) {
    const p = pages.get(e.id)!;
    const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, flat: true });
    const d = generateKitDistrict(p.fp, { profile: withoutStructure(p.plan), time: "day", seed: 7, flat: true });
    if (sha(JSON.stringify(c.parts)) === sha(JSON.stringify(d.parts))) identical++;
    else changed.push(e.id);
  }
  check("structure on × off: every city without structured parcelled land is byte-identical (IKEA, Wikipedia ×2, Python Docs, GOV.UK, lobste.rs, Paul Graham…)", identical === DATASET.length - 1 && changed.join() === "directory", `${identical}/${DATASET.length} identical; changed: ${changed.join(", ")}`);
}
const golden = () => pages.get("directory")!;
{
  const p = golden();
  const t = newTrace();
  const tv = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, flat: true, trace: t });
  const d = generateKitDistrict(p.fp, { profile: withoutStructure(p.plan), time: "day", seed: 7, flat: true, trace: tv });
  check("craigslist: structure on × off, same pieces (type, position, size) — the land is untouched", JSON.stringify(t.pieces.map((x) => [x.territory, x.piece])) === JSON.stringify(tv.pieces.map((x) => [x.territory, x.piece])));
  check("craigslist: 6 parcelled territories planned, every one from explicit headings", t.frontage.length === 6 && t.frontage.every((f) => p.plan.territories[f.territory].structure!.source === "explicit"), t.frontage.map((f) => `${f.groups}→${f.clusters}`).join(", "));
  check("craigslist: clusters ≤ ⌈slots/2⌉ (no micro-fragmentation)", t.frontage.every((f) => f.clusters <= Math.ceil(f.slots / 2)));
  const change = planChange(raster(d.parts), raster(c.parts));
  check("craigslist: a visible but bounded change of the ground plan", change > 0.01 && change < 0.15, `${(100 * change).toFixed(1)}% of the ground plan`);
}

console.log("\n## stability: small changes of the page move few cuts");
{
  const p = golden();
  const ti = p.plan.territories.findIndex((x) => x.kind === "remainder");
  const base = p.plan.territories[ti].structure!;
  const cityOf = (s: typeof base) => {
    const plan = withoutItems({ ...p.plan, territories: p.plan.territories.map((x, i) => (i === ti ? { ...x, structure: s } : x)) });
    const t = newTrace();
    const c = generateKitDistrict(p.fp, { profile: plan, time: "day", seed: 7, flat: true, trace: t });
    return { r: raster(c.parts), f: t.frontage.find((x) => x.territory === ti)! };
  };
  const ref = cityOf(base);
  const cuts = (f: typeof ref.f) => {
    let acc = 0;
    return new Set(f.clusterSlots.slice(0, -1).map((x) => (acc += x)));
  };
  const refCuts = cuts(ref.f);
  const k = base.groups.reduce((m, g, i) => (g.items > base.groups[m].items ? i : m), 0);
  const per = base.groups[k].share / Math.max(1, base.groups[k].items);
  const tweak = (fn: (g: typeof base.groups) => typeof base.groups) => {
    const groups = fn(base.groups.map((g) => ({ ...g })));
    const tot = groups.reduce((a, g) => a + g.share, 0);
    return { ...base, groups: groups.map((g) => ({ ...g, share: (g.share * base.groups.reduce((a, x) => a + x.share, 0)) / tot })) };
  };
  const small = base.groups.findIndex((g) => g.items <= 1);
  const cases: Array<[string, typeof base]> = [
    ["item +1 in the largest group", tweak((g) => ((g[k].share += per), (g[k].items += 1), g))],
    ["item −1 in the largest group", tweak((g) => ((g[k].share -= per), (g[k].items -= 1), g))],
    ["largest group weight +5%", tweak((g) => ((g[k].share *= 1.05), g))],
    ["largest group weight −10%", tweak((g) => ((g[k].share *= 0.9), g))],
    ["a 1-item group disappears", tweak((g) => g.filter((_, i) => i !== small))],
    ["a 1-item group appears", tweak((g) => [...g.slice(0, 1), { ...g[small] }, ...g.slice(1)])],
  ];
  for (const [name, s] of cases) {
    const x = cityOf(s);
    const xc = cuts(x.f);
    const moved = [...new Set([...refCuts, ...xc])].filter((c) => !(refCuts.has(c) && xc.has(c))).length;
    const ch = planChange(ref.r, x.r);
    check(`${name}: ≤ 6 of ${refCuts.size} cuts move, ≤ 2% of the city's ground plan`, moved <= 6 && ch <= 0.02, `${moved} cuts moved, ${(100 * ch).toFixed(2)}% of the ground plan`);
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall composition checks passed");
process.exit(failed ? 1 : 0);
