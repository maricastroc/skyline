// Acceptance tests of the openings depth pass: npm run test:openings
// The opening model (kit/openings.ts, mirrored by the shader), the Surface Lab, real snapshots.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { deriveGrammar, type ArchStyle } from "../../src/lib/pixelcity/grammar";
import { building, type Program } from "../../src/lib/pixelcity/kit/buildings";
import { Kit } from "../../src/lib/pixelcity/kit/core";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { generateSurfaceLab, labProgram, LAB_SETS, USES, type LabKit } from "../../src/lib/pixelcity/kit/lab";
import { withoutItems } from "../../src/lib/pixelcity/kit/items";
import { withoutStructure } from "../../src/lib/pixelcity/kit/structure";
import { decodeOpening, DEPTH_M, FRAME_W, OPENING, punchedOpening, recessPart } from "../../src/lib/pixelcity/kit/openings";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { PATTERN_BITS, type Anatomy } from "../../src/lib/pixelcity/kit/surface";
import { generateKitDistrict as v5 } from "../../src/lib/pixelcity/kit-v5/district";
import { realPage as realPageV5 } from "../../src/lib/pixelcity/kit-v5/real-page";
import { buildGamePalette } from "../../src/lib/pixelcity/palette";
import { Surf, type Part } from "../../src/lib/pixelcity/types";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
const OPENING_MASK = ~(OPENING - 1); // every bit from 1024 up belongs to the openings pass

/* ───────────── The opening model ───────────── */
console.log("# Opening anatomy (the rectangles and the recess solver the shader uses)");
{
  let inside = 0;
  let total = 0;
  let worst = "";
  for (let bayCode = 0; bayCode < 4; bayCode++)
    for (const pattern of [0, 1, 2])
      for (const tall of [false, true])
        for (const attic of [false, true]) {
          const o = punchedOpening(bayCode, { pattern, tall, attic });
          total++;
          // Opening and its frame ring inside the bay; opening inside the floor.
          const head = o.y1 + FRAME_W * 1.7 < 0.49 ? FRAME_W * 1.7 : FRAME_W; // as the shader
          const ok = o.cx + o.hw + FRAME_W <= o.bay / 2 + 1e-9 && o.y0 - FRAME_W >= 0 && o.y1 + head <= 0.5;
          if (ok) inside++;
          else worst = `bay ${o.bay} pattern ${pattern}${tall ? " tall" : ""}${attic ? " attic" : ""}`;
        }
  check("opening + frame ring stay inside the bay and the floor", inside === total, `${inside}/${total}${worst ? `, fails: ${worst}` : ""}`);
}
{
  // Sample the solver along rays from the opening's centre: the layers must appear in order
  // glass → (sash) → reveal → outside, never glass after reveal.
  const views: Array<[number, number, number]> = [
    [0.7, 0.5, 0.6],
    [-0.7, 0.5, 0.6],
    [0.2, 0.6, 0.9],
  ];
  const suns: Array<[number, number, number]> = [
    [-0.3, 0.78, 0.54],
    [0.9, 0.4, 0.15],
    [-0.3, 0.8, -0.5],
  ];
  let bad = 0;
  let rays = 0;
  let revealWhereNoDepth = 0;
  for (const d of Object.values(DEPTH_M))
    for (const v of views)
      for (const l of suns)
        for (const px of [
          [0.0092, 0.0092],
          [0.0168, 0.0168],
          [0.033, 0.033],
        ] as Array<[number, number]>) {
          const r: [number, number, number] = [0.12, 0.13, 0.4];
          for (let a = 0; a < 16; a++) {
            rays++;
            const dir = [Math.cos((a / 16) * Math.PI * 2), Math.sin((a / 16) * Math.PI * 2)];
            let seenReveal = false;
            let seenOutside = false;
            for (let t = 0; t < 0.3; t += 0.002) {
              const q = recessPart([dir[0] * t, 0.265 + dir[1] * t], r, d, v, l, px);
              if (q.part === 0) seenOutside = true;
              else if (seenOutside) bad++;
              if (q.part === 3 || q.part === 4) {
                seenReveal = true;
                if (d < 0.9 * px[0]) revealWhereNoDepth++;
              } else if ((q.part === 1 || q.part === 5) && seenReveal) {
                bad++;
                break;
              }
            }
          }
        }
  check("layers in order along every ray: glass → sash → reveal → wall", bad === 0, `${rays} rays, ${bad} out of order`);
  check("no reveal where the recess is under a pixel (City View stays flush)", revealWhereNoDepth === 0);
  const q = recessPart([0, 0.3], [0.12, 0.13, 0.4], DEPTH_M.medium, [0.7, 0.5, 0.6], [-0.3, 0.78, 0.54], [0.0168, 0.0168]);
  check("glass centre seen as glass at street zoom", q.part === 1);
}

/* ───────────── Lab: program decides the depth, style the expression ───────────── */
console.log("\n# Program and style (Surface Lab, same lot)");
const fp = vacantFingerprint();
const pal = buildGamePalette(fp, deriveGrammar(fp));
const at = (use: Anatomy["use"], st: ArchStyle) => {
  const kit = new Kit(pal, 7);
  kit.frame(4, -2, 0, () => building(kit, 6, 5, labProgram(use, st, pal, { seed: 3 })));
  return kit.anatomies[0];
};
for (const use of USES) {
  const row = (["classic", "retro", "modern", "soft", "tech"] as ArchStyle[]).map((st) => at(use, st));
  const depth = new Set(row.filter((A) => A.opening.glazing !== "curtain").map((A) => A.opening.depth));
  const frames = new Set(row.map((A) => `${A.opening.frame}/${A.opening.sill}/${A.opening.sash}`));
  const uses = new Set(row.map((A) => A.use));
  check(`${use}: one depth across styles, use unchanged`, depth.size <= 1 && uses.size === 1, `${[...depth].join(",")}`);
  if (use !== "industrial" && use !== "service") check(`${use}: the style changes the frame`, frames.size >= 3, `${frames.size} expressions`);
}
{
  const depthOf = (u: Anatomy["use"]) => at(u, "classic").opening.depth;
  check("civic and institutional openings are deeper than homes, homes deeper than offices", depthOf("civic") === "deep" && depthOf("institutional") === "deep" && depthOf("residential") === "medium" && depthOf("office") === "shallow", USES.map((u) => `${u} ${depthOf(u)}`).join(", "));
  check("curtain walls stay flush", at("office", "tech").opening.depth === "flush");
}
{
  // Ground glazing never above the ground floor (or the glazed base), in every lab building.
  let zones: Array<string | null> = [];
  const api: LabKit = {
    Kit: class extends Kit {
      constructor(...a: ConstructorParameters<typeof Kit>) {
        super(...a);
        this.zones = [];
        zones = this.zones;
      }
    } as unknown as LabKit["Kit"],
    building: building as unknown as (kit: never, w: number, d: number, P: Program) => number,
  };
  let glazing = 0;
  let above = 0;
  let worst = "";
  for (const set of LAB_SETS) {
    const lab = generateSurfaceLab(api, fp, { set });
    for (const c of lab.cells) {
      const A = c.anatomy;
      if (!A) continue;
      const top = A.ground.height + (A.base.treatment === "glazed" ? A.base.floors * 0.5 : 0) + 0.02;
      for (let k = c.parts[0]; k < c.parts[1]; k++) {
        const q = lab.city.parts[k];
        if (q.surf !== Surf.STORE || !decodeOpening(q.variant ?? 0).on) continue;
        glazing++;
        if (q.y + q.h - 0.1 > top) {
          above++;
          worst = `${set}/${c.label} ${zones[k]} top ${(q.y + q.h - 0.1).toFixed(2)} > ${top.toFixed(2)}`;
        }
      }
    }
  }
  check("recessed shop / lobby glazing stays in the ground floor or glazed base", above === 0 && glazing > 0, `${glazing} glazing parts${above ? `, ${above} above: ${worst}` : ""}`);
}

/* ───────────── Real pages: frozen, flat, families, determinism ───────────── */
console.log("\n# Real pages against the frozen surface-grammar kit (kit-v5)");
const before = new Map<string, string>();
for (const l of readFileSync("docs/openings/corpus-before.txt", "utf8").split("\n")) {
  const m = l.match(/^v5-(normal|flat|night) (\S+)\s+([0-9a-f]{40})/);
  if (m) before.set(`${m[1]}/${m[2]}`, m[3]);
}
let frozen = 0;
let flatSame = 0;
let structural = 0;
let foreign = 0;
let windowed = 0;
let treated = 0;
let maxV5 = 0;
const surfOn = new Set<number>([Surf.FRAMED, Surf.BANDS, Surf.STORE]);
for (const e of DATASET) {
  const p5 = realPageV5(snap(e.id));
  const p6 = realPage(snap(e.id));
  for (const mode of ["normal", "flat", "night"] as const) {
    const a = v5(p5.fp, { profile: p5.plan, time: mode === "night" ? "night" : "day", seed: 7, flat: mode === "flat" });
    if (sha(JSON.stringify([a.parts, a.signs])) === before.get(`${mode}/${e.id}`)) frozen++;
    for (const q of a.parts) maxV5 = Math.max(maxV5, q.variant ?? 0);
    // Without the intra-territory and item descriptors (later passes that change structured
    // parcelled land and the use of simple indexes).
    const b = generateKitDistrict(p6.fp, { profile: withoutItems(withoutStructure(p6.plan)), time: mode === "night" ? "night" : "day", seed: 7, flat: mode === "flat" });
    if (mode === "flat") {
      if (sha(JSON.stringify([b.parts, b.signs])) === before.get(`flat/${e.id}`)) flatSame++;
      continue;
    }
    if (a.parts.length !== b.parts.length) {
      structural++;
      continue;
    }
    for (let k = 0; k < a.parts.length; k++) {
      const x: Part = a.parts[k];
      const y: Part = b.parts[k];
      const vx = x.variant ?? 0;
      const vy = y.variant ?? 0;
      if (x.surf !== y.surf || x.x !== y.x || x.y !== y.y || x.z !== y.z || x.w !== y.w || x.h !== y.h || x.d !== y.d || x.mesh !== y.mesh) structural++;
      else if ((vy & ~OPENING_MASK) !== vx) structural++;
      if ((vy & OPENING_MASK) !== 0 && !surfOn.has(y.surf)) foreign++;
      if (surfOn.has(y.surf)) {
        windowed++;
        if ((vy & OPENING_MASK) !== 0) treated++;
      }
    }
  }
}
check("kit-v5 reproduces docs/openings/corpus-before.txt (normal, flat, night)", frozen === DATASET.length * 3, `${frozen}/${DATASET.length * 3}`);
check("no frozen kit uses the openings bits", maxV5 < OPENING, `kit-v5 max variant ${maxV5}`);
check("flat=1 is byte-identical to the frozen kit", flatSame === DATASET.length, `${flatSame}/${DATASET.length}`);
check("same parts, positions, sizes and surfaces as kit-v5; variants differ only by openings bits", structural === 0, `${structural} differences`);
check("openings bits only on windowed surfaces (punched, ribbon, shop glazing)", foreign === 0, `${foreign} elsewhere`);
check("most windowed parts get a treatment", treated > windowed * 0.6, `${treated}/${windowed} (curtain walls and families outside the grammar stay flush)`);
{
  const a = realPage(snap("reference"));
  const t1 = newTrace();
  const t2 = newTrace();
  const c1 = generateKitDistrict(a.fp, { profile: a.plan, time: "day", seed: 7, trace: t1 });
  const c2 = generateKitDistrict(a.fp, { profile: a.plan, time: "day", seed: 7, trace: t2 });
  const op = (t: typeof t1) => JSON.stringify(t.buildings.map((b) => b.anatomy.map((A) => A.opening)));
  check("same page + seed → same openings and same city", op(t1) === op(t2) && sha(JSON.stringify(c1.parts)) === sha(JSON.stringify(c2.parts)));
}
{
  const src = readFileSync("src/lib/pixelcity/kit/openings.ts", "utf8") + readFileSync("src/components/pixel/materials.ts", "utf8");
  check("openings code never reads a URL, host or site name", !/hostname|finalUrl|requestedUrl|siteName|location\./.test(src));
  check("PATTERN_BITS untouched (façade rhythm is the surface grammar's)", PATTERN_BITS.paired === 16 && PATTERN_BITS.vertical === 32 && PATTERN_BITS.sparse === 48);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall openings checks passed");
process.exit(failed ? 1 : 0);
