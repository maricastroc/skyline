import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { listAnatomy, listSays } from "../../src/lib/pixelcity/kit/plan";
import { realPage, type RealPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { holdoutFile } from "./dataset";
import { FABRIC, HOLDOUT, HOLDOUT_B, type Expect } from "./holdout-set";

const which = process.argv[2] === "b" ? "b" : "a";
const SET = which === "b" ? HOLDOUT_B : HOLDOUT;
const dir = which === "b" ? "holdout2" : "holdout";
const custom = Object.fromEntries(
  process.argv
    .filter((a) => a.startsWith("arm:"))
    .map((a) => a.slice(4).split("=")),
);
const ARMS: Record<string, string> = { default: "", reading: "reading", ...custom };
type Arm = string;
const NAMES = Object.keys(ARMS);
const CLASS: Record<string, string> = {
  feed: "feed",
  pricing: "catalogue",
  gallery: "images",
  showcase: "images",
  logos: "images",
  directory: "index",
  toc: "index",
  references: "index",
  faq: "faq",
};
const WANT: Record<Expect, string | null> = {
  headline: "feed",
  post: "feed",
  "media-post": "feed",
  cards: "feed",
  catalogue: "catalogue",
  gallery: "images",
  directory: "index",
  mixed: null,
  none: null,
};
const MIN_ELEMENTS = 60;
const DOMINANT = 0.3;

function read(p: RealPage) {
  const land: Record<string, number> = {};
  for (const t of p.plan.territories) {
    const c = CLASS[t.kind] ?? "other";
    land[c] = (land[c] ?? 0) + t.weight;
  }
  const lists = Object.entries(land)
    .filter(([k]) => k !== "other")
    .sort((a, b) => b[1] - a[1]);
  const fabric: Record<string, number> = {};
  for (const t of p.plan.territories)
    for (const m of t.mix)
      fabric[m.comp] = (fabric[m.comp] ?? 0) + t.weight * m.share;
  const big = [...p.plan.territories].sort((a, b) => b.weight - a.weight)[0];
  const feed = [...p.plan.territories]
    .filter((t) => t.kind === "feed")
    .sort((a, b) => b.weight - a.weight)[0];
  const region = feed && feed.region >= 0 ? p.sem.regions[feed.region] : null;
  return {
    land,
    reading: lists[0] && lists[0][1] >= DOMINANT ? lists[0][0] : "none",
    share: lists[0]?.[1] ?? 0,
    listLand: lists.reduce((s, [, v]) => s + v, 0),
    territories: p.plan.territories.length,
    largest: big ? { kind: big.kind, weight: big.weight } : null,
    fabric,
    feed: feed
      ? {
          weight: feed.weight,
          mix: feed.mix,
          form:
            feed.items && feed.items.source === "series"
              ? {
                  count: feed.items.count,
                  chars: feed.items.charsPerItem,
                  media: feed.items.mediaPerItem,
                  shape: feed.items.shape,
                }
              : null,
          own: listAnatomy(p.doc, region ? region.items : []),
          says: listSays(p.doc, region ? region.items : []),
        }
      : null,
  };
}

function right(expect: Expect, r: ReturnType<typeof read>): boolean {
  const want = WANT[expect];
  if (want) return (r.land[want] ?? 0) >= DOMINANT;
  if (expect === "none") return r.listLand < DOMINANT;
  return r.share < 0.6 && r.territories >= 5;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const rows = [];
for (const h of SET) {
  if (!existsSync(holdoutFile(h.id, dir))) continue;
  const snap = JSON.parse(
    readFileSync(holdoutFile(h.id, dir), "utf8"),
  ) as DomSnapshot;
  if (snap.stats.elementCount < MIN_ELEMENTS) {
    console.log(
      `${h.id.padEnd(20)} excluded: ${snap.stats.elementCount} elements, not a usable capture`,
    );
    continue;
  }
  const out = {} as Record<Arm, ReturnType<typeof read>>;
  const ok = {} as Record<Arm, boolean>;
  const built = {} as Record<Arm, boolean>;
  for (const arm of NAMES) {
    out[arm] = read(realPage(snap, "none", parseExperiments(ARMS[arm])));
    ok[arm] = right(h.expect, out[arm]);
    built[arm] = (FABRIC[h.expect] ?? []).includes(
      Object.entries(out[arm].fabric).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
    );
  }
  rows.push({ ...h, elements: snap.stats.elementCount, out, ok, built });
}

const show = (r: ReturnType<typeof read>) =>
  `${r.reading.padEnd(9)} ${pct(r.share).padStart(4)} ${Object.entries(r.fabric)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k, v]) => `${k.slice(0, 5)} ${Math.round(v * 100)}`)
    .join("+")}`;
console.log(
  `\n${"page".padEnd(20)} ${"expected".padEnd(10)} ${NAMES.map((n) => `| ${n.padEnd(36)}`).join("")}`,
);
for (const r of rows)
  console.log(
    `${r.id.padEnd(20)} ${r.expect.padEnd(10)} ${NAMES.map((n) => `| ${r.ok[n] ? "✓" : "✗"}${FABRIC[r.expect] ? (r.built[n] ? "✓" : "✗") : " "} ${show(r.out[n]).padEnd(33)}`).join("")}`,
  );

const groups: Record<string, Expect[]> = {
  "feed-like": ["headline", "post", "media-post", "cards"],
  catalogue: ["catalogue"],
  gallery: ["gallery"],
  directory: ["directory"],
  mixed: ["mixed"],
  "not a list": ["none"],
};
console.log("\nexpected structure read as expected:");
for (const [g, es] of [
  ...Object.entries(groups),
  ["all", Object.values(groups).flat()] as [string, Expect[]],
]) {
  const rs = rows.filter((r) => es.includes(r.expect));
  console.log(
    `  ${g.padEnd(12)} ${String(rs.length).padStart(2)} pages · ${NAMES.map((n) => `${n} ${rs.filter((r) => r.ok[n]).length}`).join(" · ")}`,
  );
}

console.log(
  "\ndominant fabric of the city as expected (headline: terraces, post: courtyard blocks, media post: blocks or screens, catalogue: grid, gallery: screens, directory: slabs):",
);
for (const [g, es] of [
  ...Object.entries(groups),
  ["all", Object.values(groups).flat()] as [string, Expect[]],
]) {
  const rs = rows.filter((r) => es.includes(r.expect) && FABRIC[r.expect]);
  if (rs.length)
    console.log(
      `  ${g.padEnd(12)} ${String(rs.length).padStart(2)} pages · ${NAMES.map((n) => `${n} ${rs.filter((r) => r.built[n]).length}`).join(" · ")}`,
    );
}

console.log("\nfeeds found by the last arm and the anatomy of their item:");
for (const r of rows) {
  const f = r.out[NAMES[NAMES.length - 1]].feed;
  if (!f) continue;
  console.log(
    `  ${r.id.padEnd(20)} ${r.expect.padEnd(10)} feed ${pct(f.weight).padStart(4)} · ${String(f.own.count).padStart(3)} items ${String(Math.round(f.own.chars)).padStart(5)} chars, says ${String(Math.round(f.says)).padStart(4)}, ${pct(f.own.pictured).padStart(4)} pictured ${f.own.links.toFixed(1)} links → ${f.mix.map((m) => `${m.comp} ${Math.round(m.share * 100)}`).join(" + ")}`,
  );
}
if (!process.argv[3])
  writeFileSync(
    `docs/morphology/${dir}/results.json`,
    JSON.stringify(rows, null, 1),
  );
