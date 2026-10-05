import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g12, newTrace as newTrace12, type KitTrace as KitTrace12 } from "../../src/lib/pixelcity/kit-v12/district";
import { realPage as r12 } from "../../src/lib/pixelcity/kit-v12/real-page";
import type { Part } from "../../src/lib/pixelcity/types";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const MODES = [["day", false], ["golden", false], ["night", false], ["day", true]] as const;

const decided = (t: KitTrace | KitTrace12) =>
  sha({
    grammar: t.grammar,
    plan: t.plan,
    alloc: { path: t.alloc!.path, owner: Array.from(t.alloc!.owner), segments: t.alloc!.segments, lots: t.alloc!.lots },
    buildings: t.buildings.map((b) => ({ ...b, parts: null })),
    pieces: t.pieces.map((pc) => ({ ...pc, parts: null })),
    landmark: t.landmark,
    frontage: t.frontage,
    streets: t.streets,
    life: t.life,
    environment: t.environment,
  });
const setting = (c: ReturnType<typeof generateKitDistrict>) => sha({ ...c, parts: null, signs: null });
const kept = (q: { mesh: string }) => q.mesh !== "sign" && q.mesh !== "sprite" && q.mesh !== "glow";
const outside = (parts: Part[], ranges: Array<[number, number]>, full: Part[] | null) => {
  const inAsset = new Set<number>();
  for (const [a, b] of ranges) for (let i = a; i < b; i++) inAsset.add(i);
  if (!full) return parts.filter((_, i) => !inAsset.has(i));
  const out: Part[] = [];
  let j = 0;
  full.forEach((q, i) => {
    if (!kept(q)) return;
    if (!inAsset.has(i)) out.push(parts[j]);
    j++;
  });
  return out;
};
const box = (ps: Part[]) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, top = -Infinity;
  for (const p of ps) {
    const quarter = Math.abs(Math.sin(p.rotY)) > 0.7;
    const hw = (quarter ? p.d : p.w) / 2;
    const hd = (quarter ? p.w : p.d) / 2;
    x0 = Math.min(x0, p.x - hw); x1 = Math.max(x1, p.x + hw);
    z0 = Math.min(z0, p.z - hd); z1 = Math.max(z1, p.z + hd);
    top = Math.max(top, p.y + p.h);
  }
  return { x0, x1, z0, z1, top };
};
const panelOf = (ps: Part[]) => ps.find((p) => p.mesh === "glow" && p.w > 0.3)!;

let ablation = 0, decisions = 0, settings = 0, rest = 0, assets = 0, plantsIn = 0, panels = 0, signs = 0;
let nPlants = 0, nScreens = 0;
const notes: string[] = [];
for (const e of DATASET) {
  const s = snap(e.id);
  const p = realPage(s);
  const q = r12(s);
  for (const [time, flat] of MODES) {
    const key = `${e.id}/${time}${flat ? "/flat" : ""}`;
    const tOn = newTrace();
    const tOff = newTrace();
    const t12 = newTrace12();
    const on = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat, trace: tOn });
    const off = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, flat, trace: tOff, polishAssets: false });
    const v12 = g12(q.fp, { profile: q.plan, time, seed: 7, flat, trace: t12 });
    if (sha(off) === sha(v12)) ablation++;
    else notes.push(`${key}: polishAssets:false differs from kit-v12`);
    if (decided(tOn) === decided(t12)) decisions++;
    else notes.push(`${key}: a decision moved`);
    if (setting(on) === setting(v12)) settings++;
    else notes.push(`${key}: palette / haze / scenery moved`);
    const fullOn = flat ? generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7 }).parts : null;
    const fullOff = flat ? generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, polishAssets: false }).parts : null;
    const A = tOn.assets!;
    const B = tOff.assets!;
    if (sha(outside(on.parts, A.map((a) => a.range), fullOn)) === sha(outside(off.parts, B.map((b) => b.range), fullOff))) rest++;
    else notes.push(`${key}: a part outside the assets moved`);
    if (A.length === B.length && A.every((a, i) => a.asset === B[i].asset)) assets++;
    else notes.push(`${key}: assets ${B.length} → ${A.length}`);
    if (!flat && A.length === B.length) {
      let okP = true, okS = true;
      A.forEach((a, i) => {
        const pa = on.parts.slice(...a.range);
        const pb = off.parts.slice(...B[i].range);
        if (a.asset === "hvac") {
          nPlants++;
          const n = box(pa), o = box(pb);
          if (!(n.x0 >= o.x0 - 1e-6 && n.x1 <= o.x1 + 1e-6 && n.z0 >= o.z0 - 1e-6 && n.z1 <= o.z1 + 1e-6 && n.top <= o.top + 1e-6)) okP = false;
        } else {
          nScreens++;
          const n = panelOf(pa), o = panelOf(pb);
          const forward = Math.hypot(n.x - o.x, n.z - o.z);
          if (!(n.w === o.w && n.h === o.h && n.y === o.y && n.rotY === o.rotY && forward <= 0.031)) okS = false;
        }
      });
      if (okP) plantsIn++;
      else notes.push(`${key}: a rooftop plant leaves its old footprint`);
      if (okS) panels++;
      else notes.push(`${key}: a billboard panel moved or changed size`);
    }
    const count = (ps: Part[], m: string) => ps.filter((x) => x.mesh === m).length;
    if (sha(on.signs) === sha(off.signs) && count(on.parts, "sign") === count(off.parts, "sign") && count(on.parts, "image") === count(off.parts, "image")) signs++;
    else notes.push(`${key}: signs or images differ`);
  }
}
const n = DATASET.length * MODES.length;
const nLit = DATASET.length * (MODES.length - 1);
check("polishAssets: false → kit-v12 (Art Direction v1), byte for byte (day, golden, night, flat)", ablation === n, `${ablation}/${n}`);
check("with the polish on, every decision is kit-v12's (plan, allocation, buildings, streets, life, environment)", decisions === n, `${decisions}/${n}`);
check("with the polish on, palette, haze, scenery and smoke are kit-v12's", settings === n, `${settings}/${n}`);
check("every part outside the rooftop plant and the billboards is byte-identical to the ablation", rest === n, `${rest}/${n}`);
check("the same rooftop plants and billboards, in the same order (none added, none removed)", assets === n, `${assets}/${n}`);
check("every rooftop plant inside its old footprint and no taller", plantsIn === nLit, `${plantsIn}/${nLit} cities, ${nPlants} plants`);
check("every billboard panel keeps its size, orientation and place (forward on the face only)", panels === nLit, `${panels}/${nLit} cities, ${nScreens} billboards`);
check("the page's text is untouched and nothing is invented (same signs, no new sign or image parts)", signs === n, `${signs}/${n}`);
if (notes.length) console.log(notes.slice(0, 12).join("\n"));
console.log(failed ? `\n${failed} check(s) failed` : "\nall polish checks passed");
process.exit(failed ? 1 : 0);
