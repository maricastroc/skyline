import { existsSync, readFileSync } from "node:fs";
import { regionKeys } from "../../src/lib/pixelcity/kit/plan";
import { realPage, type RealPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { addItems, dropItems, mainList } from "./perturb";
import { pages } from "./stability";

const args = process.argv.slice(2);
const flags = args.find((a) => a.startsWith("exp="))?.slice(4) ?? "";
const half = args.find((a) => a.startsWith("half="))?.slice(5);
const show = Number(args.find((a) => a.startsWith("show="))?.slice(5) ?? 0);
const exp = parseExperiments(flags);

interface Foot {
  page: string;
  arm: string;
  what: string;
  foot: number;
}
const foots = new Map<string, number>();
for (let k = 0; k < 8; k++) {
  const f = `docs/morphology/geometry-${k}.jsonl`;
  if (!existsSync(f)) continue;
  for (const l of readFileSync(f, "utf8").split("\n")) {
    if (!l) continue;
    const r = JSON.parse(l) as Foot;
    if (r.arm === (args.find((a) => a.startsWith("arm="))?.slice(4) ?? (flags ? "reading" : "default"))) foots.set(`${r.page}|${r.what}`, r.foot);
  }
}


const regionMap = (p: RealPage) => {
  const keys = regionKeys(p.doc, p.sem);
  return new Map(p.sem.regions.map((r) => [keys.get(r.id)!, r.kind]));
};
const mixMap = (p: RealPage) => new Map(p.plan.territories.map((t) => [t.key, t.mix.map((m) => m.comp).sort().join("+")]));

const causes: Record<string, number> = {};
const undue: Record<string, number> = {};
const lines: Array<{ foot: number; ratio: number; text: string }> = [];
const all = pages().filter((_, i) => (half === undefined ? true : i % 2 === Number(half)));
let cases = 0;
for (const b of all) {
  const list = mainList(b.snap);
  if (!list || list.share < 0.2) continue;
  const base = realPage(b.snap, "none", exp);
  const edits: Array<[string, DomSnapshot | null]> = [
    ["one item removed", dropItems(b.snap, 1)],
    ["one item added", addItems(b.snap, 1)],
  ];
  for (const [what, snap] of edits) {
    if (!snap) continue;
    cases++;
    const p = realPage(snap, "none", exp);
    const foot = foots.get(`${b.id}|${what}`) ?? 0;
    const ratio = foot * list.items.length;
    const ra = regionMap(base);
    const rb = regionMap(p);
    const changed = [...ra].filter(([k, v]) => rb.has(k) && rb.get(k) !== v).map(([k, v]) => `${v}→${rb.get(k)}`);
    const gone = [...ra].filter(([k]) => !rb.has(k)).map(([, v]) => v);
    const born = [...rb].filter(([k]) => !ra.has(k)).map(([, v]) => v);
    const ma = mixMap(base);
    const mb = mixMap(p);
    const mixFlip = [...ma].filter(([k, v]) => mb.has(k) && mb.get(k) !== v).map(([, v]) => v);
    const fb = Boolean(base.plan.hygiene?.fallback) !== Boolean(p.plan.hygiene?.fallback);
    const cause = fb
      ? "the fallback to observed blocks switches on or off"
      : changed.length
        ? "a region changes kind"
        : gone.length + born.length >= 3
          ? "three or more regions appear or disappear"
          : gone.length + born.length >= 1
            ? "one or two regions appear or disappear"
            : mixFlip.length
              ? "a fabric crosses the 15% cut inside a territory"
              : "same regions and fabrics: only proportions move";
    if (foot > 0.1) causes[cause] = (causes[cause] ?? 0) + 1;
    if (foot > 0.1 && ratio > 3) undue[cause] = (undue[cause] ?? 0) + 1;
    lines.push({ foot, ratio, text: `${b.id.padEnd(22)} ${what.padEnd(17)} ${String(list.items.length).padStart(3)} items · plan ${Math.round(foot * 100).toString().padStart(3)}% (${ratio.toFixed(1)}× the edit) · ${cause}${changed.length ? ` [${changed.slice(0, 3).join(", ")}]` : ""}${gone.length ? ` gone: ${gone.slice(0, 4).join(",")}` : ""}${born.length ? ` born: ${born.slice(0, 4).join(",")}` : ""}${mixFlip.length ? ` mix: ${mixFlip.slice(0, 2).join(" / ")}` : ""}` });
  }
}
const big = lines.filter((l) => l.foot > 0.1);
const dis = big.filter((l) => l.ratio > 3);
console.log(`${cases} single-item edits${half === undefined ? "" : ` (half ${half})`}, arm ${flags || "default"}`);
console.log(`large (built ↔ open over 10% of the plan): ${big.length}`);
for (const [c, n] of Object.entries(causes).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} · ${c}`);
console.log(`disproportionate (large, and more than three times the share of the list that was edited): ${dis.length}`);
for (const [c, n] of Object.entries(undue).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} · ${c}`);
for (const l of lines.sort((a, b) => b.ratio - a.ratio).slice(0, show)) console.log(l.text);
