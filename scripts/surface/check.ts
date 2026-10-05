import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { FLOOR, building, type Program } from "../../src/lib/pixelcity/kit/buildings";
import { Kit } from "../../src/lib/pixelcity/kit/core";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { generateSurfaceLab, LAB_SETS, labProgram, USES, type LabKit, type LabResult, type LabSet } from "../../src/lib/pixelcity/kit/lab";
import { deriveGrammar } from "../../src/lib/pixelcity/grammar";
import { buildGamePalette } from "../../src/lib/pixelcity/palette";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { surfaceTrace, type Anatomy } from "../../src/lib/pixelcity/kit/surface";
import type { ArchStyle } from "../../src/lib/pixelcity/grammar";
import type { Part } from "../../src/lib/pixelcity/types";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string | Buffer) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));

class ZoneKit extends Kit {
  override zones: Array<string | null> = [];
}
const ZONED: LabKit = { Kit: ZoneKit as unknown as LabKit["Kit"], building: building as unknown as (kit: never, w: number, d: number, P: Program) => number };
const fp = vacantFingerprint();
const labs: Array<{ set: LabSet; style: ArchStyle; lab: LabResult; zones: Array<string | null> }> = [];
for (const set of LAB_SETS)
  for (const style of ["classic", "retro", "modern"] as ArchStyle[]) {
    let zones: Array<string | null> = [];
    const api: LabKit = {
      Kit: class extends ZoneKit {
        constructor(...a: ConstructorParameters<typeof Kit>) {
          super(...a);
          zones = this.zones;
        }
      } as unknown as LabKit["Kit"],
      building: ZONED.building,
    };
    labs.push({ set, style, lab: generateSurfaceLab(api, fp, { set, style }), zones });
  }
const BASE_Y = 0.1;
const EPS = 0.02;
interface Bad { what: string; n: number; worst: number; at: string }
const bad = (what: string): Bad => ({ what, n: 0, worst: 0, at: "" });
const note = (b: Bad, by: number, at: string) => {
  b.n++;
  if (by > b.worst) {
    b.worst = by;
    b.at = at;
  }
};
const groundB = bad("ground floor element above the ground floor (a portal may rise one floor)");
const baseB = bad("base outside its floors");
const crownB = bad("crown below the top of the body");
const roofB = bad("roof props outside the roof");
const footB = bad("details beyond the footprint");
let cellsChecked = 0;
let crownCells = 0;
let roofParts = 0;
for (const { set, style, lab, zones } of labs) {
  const parts = lab.city.parts;
  for (const c of lab.cells) {
    const A = c.anatomy;
    if (!A) continue;
    cellsChecked++;
    const g = A.ground.height;
    const floors = c.floors;
    const H = g + floors * FLOOR;
    const cF = floors - A.crown.floors >= 1 + (A.base.floors ? 1 : 0) ? A.crown.floors : 0;
    const bF = floors - cF - A.base.floors >= 1 ? A.base.floors : 0;
    if (cF) crownCells++;
    const [fx0, fx1, fz0, fz1] = c.footprint;
    const at = `${set}/${style}/${c.label}`;
    for (let k = c.parts[0]; k < c.parts[1]; k++) {
      const q: Part = parts[k];
      const z = zones[k];
      const y0 = q.y - BASE_Y;
      const y1 = q.y + q.h - BASE_Y;
      const c0 = Math.abs(Math.cos(q.rotY));
      const s0 = Math.abs(Math.sin(q.rotY));
      const hw = (q.w * c0 + q.d * s0) / 2;
      const hd = (q.w * s0 + q.d * c0) / 2;
      const out = Math.max(fx0 - (q.x - hw), q.x + hw - fx1, fz0 - (q.z - hd), q.z + hd - fz1, 0);
      if (q.mesh !== "sprite" && out > 1.0) note(footB, out, `${at} ${z} ${q.mesh}`);
      if (z === "ground" && y1 > g + 0.12 + EPS) note(groundB, y1 - g, `${at} ${q.mesh} top ${y1.toFixed(2)} > g ${g.toFixed(2)}`);
      if (z === "portal" && y1 > g + FLOOR + EPS) note(groundB, y1 - g, `${at} portal ${q.mesh} top ${y1.toFixed(2)} > g + 1 floor`);
      if (z === "base" && (y0 < g - EPS || y1 > g + bF * FLOOR + 0.1)) note(baseB, Math.max(g - y0, y1 - g - bF * FLOOR), at);
      if (z === "crown" && y0 < H - cF * FLOOR - 0.1) note(crownB, H - cF * FLOOR - y0, `${at} y0 ${y0.toFixed(2)}`);
      if (z === "roof") {
        roofParts++;
        const o = Math.max(fx0 - (q.x - hw), q.x + hw - fx1, fz0 - (q.z - hd), q.z + hd - fz1, 0);
        if (o > EPS || y0 < H - 0.05) note(roofB, Math.max(o, H - y0), `${at} ${q.mesh} y0 ${y0.toFixed(2)} H ${H.toFixed(2)}`);
      }
    }
  }
}
console.log(`\n# Anatomy invariants — ${cellsChecked} lab buildings (${LAB_SETS.length} sets × 3 styles), ${crownCells} with a crown floor, ${roofParts} roof-zone parts`);
for (const b of [groundB, baseB, crownB, roofB, footB]) check(`no ${b.what}`, b.n === 0, b.n ? `${b.n} part(s), worst ${b.worst.toFixed(2)} at ${b.at}` : "");

console.log("\n# Program legibility (same box, same palette, only the use changes)");
for (const style of ["classic", "modern"] as ArchStyle[]) {
  const { lab } = labs.find((l) => l.set === "programs" && l.style === style)!;
  const row = lab.cells.slice(0, 7);
  const sig = row.map((c) => JSON.stringify({ ...surfaceTrace(c.anatomy!), program: undefined, pageSignalsUsed: undefined, styleExpression: undefined }));
  const geo = row.map((c) => {
    const ps = lab.city.parts.slice(c.parts[0], c.parts[1]).filter((q) => q.mesh !== "sign");
    return sha(JSON.stringify(ps.map((q) => [q.mesh, +(q.x - c.x).toFixed(3), +q.y.toFixed(3), +(q.z - c.z).toFixed(3), +q.w.toFixed(3), +q.h.toFixed(3), +q.d.toFixed(3), q.surf, q.variant ?? 0])));
  });
  check(`${style}: 7 uses → 7 distinct anatomies`, new Set(sig).size === 7, `${new Set(sig).size} distinct`);
  check(`${style}: 7 uses → 7 distinct geometries`, new Set(geo).size === 7, `${new Set(geo).size} distinct`);
  const grounds = new Set(row.map((c) => `${c.anatomy!.ground.kind}/${c.anatomy!.ground.entrance}`));
  check(`${style}: the ground floor alone separates ≥ 6 of 7 uses`, grounds.size >= 6, [...grounds].join(", "));
  const roofs = new Set(row.map((c) => `${c.anatomy!.roof.service}/${c.anatomy!.roof.occupied}`));
  check(`${style}: the roof alone separates ≥ 4 of 7 uses`, roofs.size >= 4, [...roofs].join(", "));
}

console.log("\n# Style invariance (same use, same lot, five styles)");
{
  const g = deriveGrammar(fp);
  const pal = buildGamePalette(fp, g);
  for (const use of USES) {
    const row = (["classic", "retro", "modern", "soft", "tech"] as ArchStyle[]).map((st) => {
      const kit = new Kit(pal, 7);
      const P = labProgram(use, st, pal, { seed: 3 });
      const top = kit.frame(4, -2, 0, () => building(kit, 6, 5, P));
      return { A: kit.anatomies[0], top, P };
    });
    const structure = (A: Anatomy) => JSON.stringify([A.use, A.ground.kind, A.ground.entrance, A.ground.units, A.base.floors, A.corner.condition, A.body.bay]);
    const s = new Set(row.map((r) => structure(r.A)));
    const heights = new Set(row.map((r) => (r.A.ground.height + r.P.floors * FLOOR).toFixed(3)));
    check(`${use}: use, ground kind, entrances, units, base floors, bays unchanged across styles`, s.size === 1, s.size === 1 ? "" : [...s].join(" | "));
    check(`${use}: outer height unchanged across styles`, heights.size === 1, [...heights].join(", "));
    const expr = new Set(row.map((r) => r.A.style));
    check(`${use}: expression differs across styles`, expr.size >= 3, `${expr.size} expressions`);
  }
}

console.log("\n# Determinism and provenance");
const traceOf = (id: string, mutate?: (s: ReturnType<typeof snap>) => void) => {
  const s = snap(id);
  mutate?.(s);
  const p = realPage(s);
  const t = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
  return { c, t, hash: sha(JSON.stringify([c.parts, c.signs])) };
};
const anatomies = (t: KitTrace) => JSON.stringify(t.buildings.map((b) => b.anatomy.map(surfaceTrace)));
for (const id of ["reference", "shop", "institution"]) {
  const a = traceOf(id);
  const b = traceOf(id);
  check(`${id}: same page → same city and same surface trace`, a.hash === b.hash && anatomies(a.t) === anatomies(b.t));
}
{
  const a = traceOf("reference");
  const b = traceOf("reference", (s) => {
    s.source.requestedUrl = "https://elsewhere.test/a/b";
    s.source.finalUrl = "https://elsewhere.test/a/b";
  });
  check("another hostname → identical surface anatomies", anatomies(a.t) === anatomies(b.t), a.hash === b.hash ? "city identical too" : "city identical except host-seeded variation");
  const src = ["surface.ts", "buildings.ts", "compose.ts"].map((f) => readFileSync(`src/lib/pixelcity/kit/${f}`, "utf8")).join("\n");
  check("surface code never reads a URL, host or site name", !/hostname|finalUrl|requestedUrl|siteName|location\./.test(src));
}
{
  let total = 0;
  let traced = 0;
  let mismatched = 0;
  const USE: Record<string, string> = { marker: "kiosk", continuous: "residential", parcelled: "commercial", archive: "institutional", grid: "commercial", media: "office", interactive: "kiosk", navigation: "commercial", support: "service", structured: "office" };
  for (const e of DATASET) {
    const { t } = traceOf(e.id);
    for (const b of t.buildings) {
      total++;
      if (b.anatomy.length) traced++;
      const want = b.program.reason === "simple-index evidence" ? "institutional" : USE[b.comp];
      if (want && b.P.family !== "kiosk" && b.anatomy.some((A) => A.use !== want)) mismatched++;
    }
  }
  check("every non-kiosk building records its anatomy", traced >= total * 0.9, `${traced}/${total} (kiosks and civic pavilions have none)`);
  check("use follows the composition (region type) or simple-index evidence, never the style", mismatched === 0, `${mismatched} mismatches`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall surface checks passed");
process.exit(failed ? 1 : 0);
