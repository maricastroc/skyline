import { readFileSync } from "node:fs";
import { ROOM } from "../../src/lib/pixelcity/kit/compose";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { dropItems } from "../morphology/perturb";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const city = (s: DomSnapshot, flags: string) => {
  const p = realPage(s, "none", parseExperiments(flags));
  const trace = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, flat: true, trace });
  return { p, trace, c };
};

console.log("# A. The layer exists only for the experiment that reads it");
{
  let absent = 0;
  let uncounted = 0;
  let present = 0;
  for (const e of DATASET) {
    const a = city(snap(e.id), "");
    const b = city(snap(e.id), "forum");
    if (!a.trace.layout) absent++;
    if (a.p.plan.territories.every((t) => !t.census)) uncounted++;
    if (b.trace.layout) present++;
  }
  check("by default no layout is computed and no census is taken", absent === DATASET.length && uncounted === DATASET.length, `${absent}/${DATASET.length} pages`);
  check("the forum experiment computes one", present === DATASET.length, `${present}/${DATASET.length} pages`);
}

console.log("\n# B. What the model holds");
{
  let pieces = 0;
  let briefed = 0;
  let wrongOwner = 0;
  let split = 0;
  let ensembles = 0;
  let lost = 0;
  let groupsIn = 0;
  let groupsOut = 0;
  for (const e of DATASET) {
    const { trace } = city(snap(e.id), "forum");
    const L = trace.layout!;
    const owned = trace.pieces.filter((x) => x.piece.seg >= 0);
    pieces += owned.length;
    for (const x of owned) {
      const b = L.briefs.get(x.piece);
      if (b) briefed++;
      if (b && b.territory !== x.territory) wrongOwner++;
    }
    for (const m of L.territories) {
      const own = L.ensembles.filter((en) => en.territory === m.index);
      ensembles += own.length;
      const order = own.flatMap((en) => en.pieces);
      if (order.some((k, i) => i > 0 && k < order[i - 1])) split++;
      if (m.lots > 0 && own.reduce((s, en) => s + en.lots, 0) !== L.pieces.filter((p) => p.territory === m.index).reduce((s, p) => s + p.piece.lots, 0)) lost++;
      if (own.length) {
        groupsIn += m.groups.length;
        groupsOut += own.reduce((s, en) => s + en.groups, 0);
      }
    }
  }
  check("every piece of land that belongs to a territory has exactly one brief, in that territory", briefed === pieces && wrongOwner === 0, `${briefed}/${pieces} pieces`);
  check("the ensembles of a territory follow the path in order and cover all of its land", split === 0 && lost === 0, `${ensembles} ensembles`);
  check("every group of the page is carried by one ensemble, even when there are more groups than pieces", groupsIn === groupsOut, `${groupsOut}/${groupsIn} groups`);
  const cl = city(snap("directory"), "forum").trace.layout!;
  const explicit = cl.territories.filter((m) => m.groups.length >= 2 && m.lots > 0);
  check("craigslist: the headed sub-lists of each territory arrive as its groups", explicit.length >= 6 && explicit.every((m) => m.groups.every((g) => g.kind === "items" && g.count > 0)), `${explicit.length} territories, ${explicit.reduce((s, m) => s + m.groups.length, 0)} groups`);
  const twice = JSON.stringify([...city(snap("directory"), "forum").trace.layout!.ensembles]) === JSON.stringify([...cl.ensembles]);
  check("the same page gives the same layout", twice);
}

console.log("\n# C. Counts are conserved where a fabric says what it can hold");
{
  let territories = 0;
  let exact = 0;
  let over = 0;
  let arcades = 0;
  let wanted = 0;
  let kiosks = 0;
  let controls = 0;
  for (const e of DATASET) {
    const { trace } = city(snap(e.id), "forum");
    const L = trace.layout!;
    for (const m of L.territories) {
      const mine = L.pieces.filter((p) => p.territory === m.index);
      const room = mine.map((p) => ROOM[p.comp]?.[p.piece.type] ?? null);
      if (!room.some(Boolean)) continue;
      territories++;
      const briefs = mine.map((p) => L.briefs.get(p.piece)!);
      const cap = room.reduce((s, r) => s + (r?.dominants ?? 0), 0);
      const placed = briefs.reduce((s, b) => s + b.dominants, 0);
      if (placed === Math.min(m.dominants, cap)) exact++;
      if (placed > m.dominants || briefs.some((b, k) => b.dominants > (room[k]?.dominants ?? 0) || b.units > (room[k]?.units ?? 0))) over++;
      const built = trace.buildings.filter((b) => b.territory === m.index && b.comp === "interactive");
      arcades += built.filter((b) => b.P.family === "slab").length;
      kiosks += built.filter((b) => b.P.family === "kiosk").length;
      wanted += placed;
      controls += briefs.reduce((s, b) => s + b.units, 0);
    }
  }
  check("dominant elements placed = groups of the page, up to what the land can hold", exact === territories && territories >= 10, `${exact}/${territories} territories`);
  check("no piece carries more than its fabric said it can, and no territory more than it has", over === 0);
  check("the buildings follow the briefs: one arcade per dominant element, one kiosk per unit", arcades === wanted && kiosks === controls, `${arcades}/${wanted} arcades, ${kiosks}/${controls} kiosks`);
}

console.log("\n# D. A small edit keeps the ensembles");
{
  const a = city(snap("hn"), "forum");
  const b = city(dropItems(snap("hn"), 1)!, "forum");
  const ens = (x: typeof a) => x.trace.layout!.ensembles.map((e) => e.id).join("\n");
  check("Hacker News: one story fewer keeps every ensemble under the same identity", ens(a) === ens(b), `${a.trace.layout!.ensembles.length} ensembles`);
}

console.log("\n# E. No page is named");
{
  const src = readFileSync("src/lib/pixelcity/kit/layout.ts", "utf8");
  const site = /hostname|location\.|\burl\b|siteName|wikipedia|ikea|craigslist|graham|nasa|linear|gov\.uk|python|soundcloud|airbnb/i;
  check("no hostname, URL or site name in the layout code", !site.test(src), site.exec(src)?.[0] ?? "");
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall territory-layout checks passed");
process.exit(failed ? 1 : 0);
