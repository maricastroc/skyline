import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { unitsOf, type Series } from "../../src/lib/pixelcity/kit/series";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { dropItems } from "../morphology/perturb";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

type B = [number, number, number, number];
const el = (tag: string, at: B | null, o: Partial<SnapshotNode> = {}, children: SnapshotNode[] = []): SnapshotNode => ({
  tag,
  text: 0,
  ...(at ? { box: { x: at[0], y: at[1], w: at[2], h: at[3] }, fontSize: 16 } : {}),
  ...o,
  children,
});
const words = (tag: string, at: B, sample: string, size = 16) => el(tag, at, { text: sample.length, sample, own: sample, fontSize: size });
const count = (x: SnapshotNode): number => 1 + x.children.reduce((s, c) => s + count(c), 0);
let serial = 0;
const picture = (at: B) => el("img", at, { attrs: { src: `/p/${serial++}.png`, alt: "" } });
function page(body: SnapshotNode[], height = 2400, measured = true): DomSnapshot {
  const root = el("body", [0, 0, 1440, height], {}, [el("main", [0, 0, 1440, height], {}, body)]);
  return {
    version: 1,
    source: { requestedUrl: "https://example.test/", finalUrl: "https://example.test/", strategy: "rendered", fetchedAt: "", status: 200, bytes: 0, durationMs: 0, redirects: [] },
    document: { title: "Test" },
    styles: { colors: [] },
    stats: { elementCount: count(root), maxDepth: 8, truncated: false },
    root,
    warnings: [],
    ...(measured ? { layout: { width: 1440, height, viewport: 1440 } } : {}),
  };
}
const read = (body: SnapshotNode[], height?: number) => unitsOf(normalize(page(body, height)), { roots: [0], excluded: [] });
const says = (s: Series | null) => (s ? `${s.units} ${s.kind} of ${Math.round(s.width)}×${Math.round(s.height)}, ${s.perRow} per row, ${s.arrangement}` : "no series");

const card = (x: number, y: number, w = 300, h = 340, inner: SnapshotNode[] = []) =>
  el("div", [x, y, w, h], { classes: ["card"] }, [
    el("a", [x, y, w, h - 100], { attrs: { href: `/item/${serial}` } }, [picture([x, y, w, h - 100])]),
    words("h3", [x, y + h - 92, w, 24], `Item number ${serial}`, 20),
    words("p", [x, y + h - 60, w, 44], "A caption long enough to be a sentence about the item."),
    ...inner,
  ]);
const shelf = (rows: number, perRow: number, make: (x: number, y: number) => SnapshotNode, top = 200, stepX = 320, stepY = 360) =>
  el(
    "div",
    [60, top, perRow * stepX, rows * stepY],
    { classes: ["shelf"] },
    Array.from({ length: rows * perRow }, (_, k) => make(60 + (k % perRow) * stepX, top + Math.floor(k / perRow) * stepY)),
  );
const titled = (shelves: SnapshotNode[]) => [words("h1", [60, 60, 900, 60], "A page of items", 40), ...shelves];

console.log("# A. Reading the units of a measured page");

const grid = read(titled([shelf(2, 4, (x, y) => card(x, y))]));
check("repeated cards in two rows of four are read as cards, four per row, several rows", grid?.kind === "card" && grid.perRow === 4 && grid.arrangement === "grid" && grid.units === 8 && grid.width === 300, says(grid));

const strip = read(titled([shelf(1, 5, (x, y) => card(x, y, 240, 320), 200, 260)]));
check("one row of cards is a strip", strip?.kind === "card" && strip.perRow === 5 && strip.arrangement === "strip", says(strip));

const thumbs = (x: number, y: number) => el("div", [x, y + 300, 300, 40], { classes: ["more"] }, Array.from({ length: 4 }, (_, k) => el("a", [x + k * 48, y + 300, 40, 40], { attrs: { href: `/t/${serial}` } }, [picture([x + k * 48, y + 300, 40, 40])])));
const nestedRead = read(titled([shelf(2, 4, (x, y) => card(x, y, 300, 340, [thumbs(x, y)]))]));
check("thumbnails repeated inside each card do not replace the card", nestedRead?.kind === "card" && nestedRead.width === 300 && nestedRead.units === 8, says(nestedRead));

const whole = read(titled([shelf(2, 4, (x, y) => el("a", [x, y, 300, 300], { attrs: { href: `/photo/${serial}` } }, [picture([x, y, 300, 300])]), 200, 320, 320)]));
check("items that are only their picture are read as pictures", whole?.kind === "picture" && whole.perRow === 4, says(whole));

const tiles = read(titled([el("div", [0, 200, 1024, 768], { classes: ["map"] }, Array.from({ length: 12 }, (_, k) => picture([(k % 4) * 256, 200 + Math.floor(k / 4) * 256, 256, 256])))]));
check("glued tiles without links (a map) are not a series", tiles === null, says(tiles));

const bar = read([el("div", [400, 20, 400, 36], { classes: ["toolbar"] }, Array.from({ length: 10 }, (_, k) => el("button", [400 + k * 40, 20, 36, 36], { text: 1, sample: "+", own: "+" })))], 900);
check("a row of small buttons is read as keys", bar?.kind === "key" && bar.perRow === 10 && bar.arrangement === "tiles", says(bar));

const stacked = read(titled([shelf(5, 1, (x, y) => card(x, y, 1000, 300), 200, 1100, 320)]));
check("cards stacked one per row are not a series", stacked === null, says(stacked));

const long = read(titled([shelf(10, 3, (x, y) => card(x, y))]), 4200);
check("items the normaliser folds into a summary are still counted", long?.units === 30 && long.perRow === 3, says(long));

const bare = page(titled([shelf(2, 4, (x, y) => card(x, y))]));
const strip0 = (n: SnapshotNode) => {
  delete n.box;
  delete n.fontSize;
  n.children.forEach(strip0);
};
const unboxed = structuredClone(bare);
strip0(unboxed.root);
check("a measured page that came back without boxes has no series and still builds", realPage(unboxed, "none").plan.territories.every((t) => !t.series) && generateKitDistrict(realPage(unboxed, "none").fp, { profile: realPage(unboxed, "none").plan, time: "day", seed: 7 }).parts.length > 0);

console.log("\n# B. Measured against unmeasured, on real pages");

const FIXTURES = "docs/real-pages/measured";
const load = (id: string) => JSON.parse(readFileSync(`${FIXTURES}/${id}.json`, "utf8")) as DomSnapshot;
const unmeasured = (s: DomSnapshot) => {
  const c = structuredClone(s);
  delete c.layout;
  strip0(c.root);
  return c;
};

function build(snap: DomSnapshot) {
  const p = realPage(snap, "none");
  const trace = newTrace();
  const city = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace });
  const h = createHash("sha1");
  for (const q of city.parts) h.update(JSON.stringify([q.mesh, q.x, q.y, q.z, q.w, q.h, q.d, q.color, q.surf, q.rotY]));
  const families: Record<string, number> = {};
  const feet: Array<[number, number, number, number]> = [];
  let tallest = 0;
  for (const b of trace.buildings) {
    families[b.P.family] = (families[b.P.family] ?? 0) + 1;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = b.parts[0]; k < b.parts[1]; k++) {
      const q = city.parts[k];
      tallest = Math.max(tallest, q.y + q.h);
      if (q.mesh !== "box" || q.h < 0.45 || q.w < 0.6 || q.d < 0.6 || q.y > 0.9) continue;
      const turned = Math.abs(Math.sin(q.rotY ?? 0)) > 0.5;
      const w = turned ? q.d : q.w, d = turned ? q.w : q.d;
      x0 = Math.min(x0, q.x - w / 2); x1 = Math.max(x1, q.x + w / 2); z0 = Math.min(z0, q.z - d / 2); z1 = Math.max(z1, q.z + d / 2);
    }
    if (x0 < x1) feet.push([x0, x1, z0, z1]);
  }
  let overlaps = 0;
  for (let i = 0; i < feet.length; i++) for (let j = i + 1; j < feet.length; j++) if (Math.min(feet[i][1], feet[j][1]) - Math.max(feet[i][0], feet[j][0]) > 0.15 && Math.min(feet[i][3], feet[j][3]) - Math.max(feet[i][2], feet[j][2]) > 0.15) overlaps++;
  const series = p.plan.territories.filter((t) => t.series).sort((a, b) => b.weight - a.weight).map((t) => t.series!);
  return { hash: h.digest("hex"), families, tallest, overlaps, buildings: trace.buildings.length, series };
}

const LOW = new Set(["walkup", "rows"]);
const FRONTED: Array<[string, Partial<Series>]> = [
  ["spotify", { kind: "card", perRow: 8, arrangement: "strip", width: 168 }],
  ["pinterest", { kind: "card", perRow: 4, arrangement: "strip", width: 273 }],
  ["lego", { kind: "card", perRow: 6, arrangement: "grid", width: 225 }],
  ["toscrape", { kind: "card", perRow: 4, arrangement: "grid", width: 225 }],
  ["soundcloud", { kind: "card", perRow: 5, arrangement: "strip", width: 191 }],
  ["sketchfab", { perRow: 3, arrangement: "grid", width: 439 }],
];
for (const [id, want] of FRONTED) {
  const snap = load(id);
  const on = build(snap);
  const off = build(unmeasured(snap));
  const s = on.series[0];
  console.log(`\n## ${id}`);
  check("the items of its main section are read", !!s && (!want.kind || s.kind === want.kind) && s.perRow === want.perRow && s.arrangement === want.arrangement && Math.abs(s.width - want.width!) <= 0.25 * want.width!, says(s ?? null));
  const grew = Object.keys(on.families).filter((f) => on.families[f] > (off.families[f] ?? 0));
  check("low frontages are added, and nothing else", on.buildings > off.buildings && grew.every((f) => LOW.has(f)), `${off.buildings} → ${on.buildings} buildings, more ${grew.join(" and ")}`);
  check("no family of today's city loses a building", Object.keys(off.families).every((f) => (on.families[f] ?? 0) >= off.families[f]), Object.entries(off.families).map(([f, n]) => `${f} ${n}→${on.families[f] ?? 0}`).join(", "));
  check("the tallest building is not lower", on.tallest >= off.tallest - 1e-6, `${off.tallest.toFixed(1)} → ${on.tallest.toFixed(1)}`);
  check("no new overlap between buildings", on.overlaps <= off.overlaps, `${off.overlaps} → ${on.overlaps}`);
  const less = dropItems(snap, 1);
  const t = less ? build(less).series[0] : null;
  if (less) check("one item fewer keeps the items per row and the arrangement", !!t && t.perRow === s.perRow && t.arrangement === s.arrangement, says(t));
}

console.log("\n## pages the frontages must not touch");
for (const [id, why] of [["hn", "a list of text links"], ["excalidraw", "a toolbar of keys"], ["linear", "buttons of an illustrated interface"]] as const) {
  const snap = load(id);
  const on = build(snap);
  check(`${id} (${why}) is the same city measured or not`, on.hash === build(unmeasured(snap)).hash, on.series.length ? `read: ${says(on.series[0])}` : "no series");
}
const keys = build(load("excalidraw")).series[0];
check("the toolbar is read as keys, and keys keep today's recipe", keys?.kind === "key", says(keys ?? null));

console.log("\n## static captures");
const statics = readdirSync("docs/real-pages/snapshots").filter((f) => f.endsWith(".json"));
const withSeries = statics.filter((f) => realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${f}`, "utf8")) as DomSnapshot, "none").plan.territories.some((t) => t.series));
check("a static capture never carries a series", withSeries.length === 0, `${statics.length} snapshots`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall item-frontage checks passed");
process.exit(failed ? 1 : 0);
