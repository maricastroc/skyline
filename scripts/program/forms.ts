import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { withoutItems } from "../../src/lib/pixelcity/kit/items";
import type { Comp, Territory } from "../../src/lib/pixelcity/kit/plan";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { DATASET } from "../real-pages/dataset";

export type Form = "media cards" | "illustrated sections" | "titled entries" | "compound rows" | "grouped link index" | "link index" | "annotated list" | "prose" | "text items" | "no series";
export function formOf(t: Territory): Form {
  const it = t.items!;
  if (it.source === "none") return "no series";
  if (it.mediaPerItem >= 0.5) return it.charsPerItem >= 200 ? "illustrated sections" : "media cards";
  if (it.titledShare >= 0.5) return "titled entries";
  if (it.charsPerItem >= 200) return "prose";
  if (it.linksPerItem >= 1.5 && it.charsPerItem >= 80) return "annotated list";
  if (it.linksPerItem >= 1.5) return "compound rows";
  if (it.linksPerItem >= 0.5) return t.structure?.source === "explicit" ? "grouped link index" : "link index";
  return "text items";
}

export type Fn = "identity" | "wayfinding" | "support" | "interaction" | "data" | "transaction" | "showcase" | "reading" | "index" | "listing with metadata" | "unknown";
export function functionOf(t: Territory, comp: Comp): Fn {
  if (comp === "landmark") return "identity";
  if (comp === "navigation") return "wayfinding";
  if (comp === "support") return "support";
  if (comp === "interactive") return "interaction";
  if (comp === "structured") return "data";
  const it = t.items!;
  const f = formOf(t);
  if (f === "media cards") return t.metrics.images >= 3 && t.metrics.controls >= 3 ? "transaction" : "showcase";
  if (f === "prose" || f === "illustrated sections") return "reading";
  if (it.controlsPerItem >= 0.5) return "unknown";
  if (f === "link index" || f === "grouped link index" || (f === "titled entries" && it.linksPerItem <= 1)) return "index";
  if (f === "titled entries" || f === "compound rows" || f === "annotated list") return "listing with metadata";
  return "unknown";
}

const USES = ["commercial", "residential", "office", "institutional", "service", "civic"];
const MULTI = new Set(["grid", "parcelled"]);
const proposed = (comp: string, t: Territory, fn: Fn, use: string) => (MULTI.has(comp) && fn === "index" && t.items!.count >= 5 ? "institutional" : use);
const reason = (comp: string, fn: Fn) => (fn === "transaction" ? "evidence: transaction" : comp === "navigation" ? "convention: wayfinding arcade" : "fallback: no function the vocabulary names");
const dryRun = (comp: string, t: Territory, use: string) => {
  const m = t.metrics;
  if (!MULTI.has(comp)) return use;
  if ((m.images >= 3 && m.controls >= 3) || (m.controls >= 3 && m.controls >= m.links)) return "commercial";
  return m.links >= 3 && m.controls <= 0.2 * m.links && m.images <= 0.2 * m.links ? "institutional" : use;
};

const NAMES: Record<string, string> = { reference: "Wikipedia", docs: "Python Docs", app: "GitHub (repo)", saas: "Linear", shop: "IKEA", news: "Guardian", portfolio: "portfolio", forum: "lobste.rs", institution: "GOV.UK", oldweb: "Paul Graham", media: "NASA", directory: "craigslist", "reference-2": "Wikipedia 2", "saas-2": "Vercel" };
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
type Row = { page: string; kind: string; comp: string; form: Form; fn: Fn; use: string; P: string; D: string; territory: number };
const rows: Row[] = [];
const terr: string[] = [];
const cases = new Map<string, string[]>();
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const t = newTrace();
  generateKitDistrict(p.fp, { profile: withoutItems(p.plan), time: "day", seed: 7, trace: t });
  const lots = t.alloc!.lots;
  for (const b of t.buildings) {
    const T = p.plan.territories[b.territory];
    const f = formOf(T);
    const fn = functionOf(T, b.comp as Comp);
    for (const A of b.anatomy) rows.push({ page: e.id, kind: T.kind, comp: b.comp, form: f, fn, use: A.use, P: proposed(b.comp, T, fn, A.use), D: dryRun(b.comp, T, A.use), territory: b.territory });
  }
  const lines: string[] = [];
  p.plan.territories.forEach((T, i) => {
    if (lots[i] < 4) return;
    const it = T.items!;
    const comps = [...new Set(t.alloc!.segments.filter((s) => s.territory === i).map((s) => s.comp))];
    terr.push(`| ${e.id} | ${T.kind} | ${comps.join("+")} | ${lots[i]} | **${formOf(T)}** | ${it.source === "none" ? "–" : `${it.count} × \`${it.shape}\``} | ${it.linksPerItem.toFixed(1)} | ${it.charsPerItem.toFixed(0)} | ${it.mediaPerItem.toFixed(1)} | ${it.controlsPerItem.toFixed(1)} | ${Math.round(it.titledShare * 100)}% | ${it.groups || ""} | ${it.confidence} |`);
    const rs = rows.filter((r) => r.page === e.id && r.territory === i);
    if (!rs.length || lots[i] < 6) return;
    const tally = (k: "use" | "P") => [...new Set(rs.map((r) => r[k]))].map((u) => `${u} ${rs.filter((r) => r[k] === u).length}`).join(", ");
    const fns = [...new Set(rs.map((r) => r.fn))].join(" / ");
    lines.push(`| ${T.kind} | ${comps.join("+")} | ${lots[i]} | ${formOf(T)}${it.source === "none" ? "" : ` (${it.count} × ${it.linksPerItem.toFixed(1)} links, ${it.charsPerItem.toFixed(0)} chars, media ${it.mediaPerItem.toFixed(1)}, ctl ${it.controlsPerItem.toFixed(1)}, titled ${Math.round(it.titledShare * 100)}%, ${it.confidence})`} | ${fns} | ${tally("use")} | ${tally("P") === tally("use") ? "=" : `**${tally("P")}**`} |`);
  });
  cases.set(e.id, lines);
}
const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`;
const table = (keyName: string, keys: string[], cols: string[], get: (k: string, c: string) => number) => {
  console.log(`| ${keyName} | ${cols.join(" | ")} |`);
  console.log(`|---|${cols.map(() => "---").join("|")}|`);
  for (const k of keys) console.log(`| ${k} | ${cols.map((c) => get(k, c) || "").join(" | ")} |`);
};
console.log("# Content form, observable function and simulated program distributions\n");
console.log("Generated by `scripts/program/forms.ts`. Nothing here is connected to the city: the content form is read from `Territory.items`, `structure` and metrics; the function from the form (kind / composition only for chrome and identity); the program columns are simulations.\n");
console.log("## 1. Territories (≥ 4 lots)\n");
console.log("| page | territory kind | composition | lots | content form | items | links/item | chars/item | media/item | controls/item | titled | groups | confidence |");
console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const r of terr) console.log(r);
const forms = [...new Set(rows.map((r) => r.form))];
const comps = [...new Set(rows.map((r) => r.comp))].sort();
const fns = [...new Set(rows.map((r) => r.fn))];
console.log("\n## 2. Content form × composition (volumes)\n");
table("content form", forms, comps, (f, c) => rows.filter((r) => r.form === f && r.comp === c).length);
console.log("\n## 3. Content form × current use (volumes)\n");
table("content form", forms, USES, (f, u) => rows.filter((r) => r.form === f && r.use === u).length);
console.log("\n## 4. Observable function × current use (volumes)\n");
table("function", fns, USES, (f, u) => rows.filter((r) => r.fn === f && r.use === u).length);
console.log("\n## 5. Simulated distributions (volumes)\n");
console.log("| use | BEFORE | dry run (reverted: every link list → institutional) | PROPOSED (index of ≥ 5 single-destination items in grid / parcelled → institutional; everything else unchanged) |");
console.log("|---|---|---|---|");
for (const u of USES) console.log(`| ${u} | ${pct(rows.filter((r) => r.use === u).length, rows.length)} | ${pct(rows.filter((r) => r.D === u).length, rows.length)} | ${pct(rows.filter((r) => r.P === u).length, rows.length)} |`);
console.log("\nWhy the remaining commercial volumes are commercial (BEFORE → PROPOSED):\n");
console.log("| reason | BEFORE | PROPOSED |");
console.log("|---|---|---|");
for (const k of ["evidence: transaction", "convention: wayfinding arcade", "fallback: no function the vocabulary names"]) console.log(`| ${k} | ${rows.filter((r) => r.use === "commercial" && reason(r.comp, r.fn) === k).length} | ${rows.filter((r) => r.P === "commercial" && reason(r.comp, r.fn) === k).length} |`);
console.log("\nFallback volumes under PROPOSED, by function:\n");
for (const f of fns) {
  const rs = rows.filter((r) => r.P === "commercial" && r.fn === f && reason(r.comp, r.fn).startsWith("fallback"));
  if (rs.length) console.log(`- ${f}: ${rs.length} (${[...new Set(rs.map((r) => r.page))].join(", ")})`);
}
console.log("\n## 6. Per page (volumes)\n");
console.log("| page | BEFORE commercial | BEFORE institutional | PROPOSED commercial | PROPOSED institutional |");
console.log("|---|---|---|---|---|");
for (const e of DATASET) {
  const rs = rows.filter((r) => r.page === e.id);
  const share = (k: "use" | "P", u: string) => pct(rs.filter((r) => r[k] === u).length, rs.length);
  console.log(`| ${e.id} (${NAMES[e.id]}) | ${share("use", "commercial")} | ${share("use", "institutional")} | ${share("P", "commercial")} | ${share("P", "institutional")} |`);
}
console.log("\n## 7. Cases (territories ≥ 6 lots that hold volumes)\n");
for (const id of ["shop", "oldweb", "directory", "forum", "app", "institution", "docs", "reference", "media", "saas"]) {
  console.log(`### ${NAMES[id]} (\`${id}\`)\n`);
  console.log("| kind | composition | lots | content form (items) | function | uses BEFORE (volumes) | PROPOSED |");
  console.log("|---|---|---|---|---|---|---|");
  for (const l of cases.get(id)!) console.log(l);
  console.log("");
}
