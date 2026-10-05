import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { rgbToOklch } from "../../src/lib/city/palette";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (v: unknown) => createHash("sha1").update(JSON.stringify(v)).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;
const MODES = [["day", false], ["night", false], ["day", true]] as const;

let partsSame = 0;
let onlyEnv = 0;
let upstream = 0;
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  for (const [time, flat] of MODES) {
    const o = { profile: p.plan, time, seed: 7, flat } as const;
    const a = generateKitDistrict(p.fp, o);
    const b = generateKitDistrict(p.fp, { ...o, atmosphere: false });
    if (sha([a.parts, a.signs, a.scenery, a.smokestacks]) === sha([b.parts, b.signs, b.scenery, b.smokestacks])) partsSame++;
    const strip = (pal: typeof a.palette) => ({ ...pal, sky: null, sun: null, ambient: null });
    if (sha(strip(a.palette)) === sha(strip(b.palette))) onlyEnv++;
  }
  const ta: KitTrace = newTrace();
  const tb: KitTrace = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: ta });
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: tb, atmosphere: false });
  if (sha([ta.streets, ta.life]) === sha([tb.streets, tb.life])) upstream++;
}
const n3 = DATASET.length * MODES.length;
check("atmosphere on × off: parts, signs, scenery and smoke identical (day, night, flat)", partsSame === n3, `${partsSame}/${n3}`);
check("atmosphere on × off: the palette differs only in sky, sun and ambient light", onlyEnv === n3, `${onlyEnv}/${n3}`);
check("atmosphere on × off: street roles and street life identical", upstream === DATASET.length, `${upstream}/${DATASET.length}`);

const env = (id: string, seed: number, time: "day" | "night" | "golden") => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  const c = generateKitDistrict(p.fp, { profile: p.plan, time, seed, trace: t });
  return { env: JSON.stringify(t.environment), haze: JSON.stringify(c.atmosphere), c };
};
let seedFree = 0;
let timeFree = 0;
for (const e of DATASET) {
  const a = env(e.id, 7, "day");
  if ([8, 11].every((s) => env(e.id, s, "day").env === a.env)) seedFree++;
  if ((["night", "golden"] as const).every((t) => env(e.id, 7, t).env === a.env && env(e.id, 7, t).haze === a.haze)) timeFree++;
}
check("environment independent of the seed (7 / 8 / 11)", seedFree === DATASET.length, `${seedFree}/${DATASET.length}`);
check("day, golden and night share one environment (axes and haze band)", timeFree === DATASET.length, `${timeFree}/${DATASET.length}`);

const BANDS = { day: { top: [0.62, 0.78], bottom: [0.86, 0.95] }, golden: { top: [0.52, 0.66], bottom: [0.78, 0.9] }, night: { top: [0.12, 0.22], bottom: [0.24, 0.38] } } as const;
let legible = 0;
let total = 0;
const worst: string[] = [];
for (const e of DATASET)
  for (const time of ["day", "golden", "night"] as const) {
    total++;
    const p = realPage(snap(e.id));
    const a = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7 });
    const b = generateKitDistrict(p.fp, { profile: p.plan, time, seed: 7, atmosphere: false });
    const top = rgbToOklch(a.palette.sky.top);
    const bot = rgbToOklch(a.palette.sky.bottom);
    const B = BANDS[time];
    const ok =
      top.l >= B.top[0] - 0.005 && top.l <= B.top[1] + 0.005 && bot.l >= B.bottom[0] - 0.005 && bot.l <= B.bottom[1] + 0.005 &&
      top.c <= 0.145 && bot.c <= 0.125 &&
      a.palette.sun.intensity / b.palette.sun.intensity >= 0.85 - 1e-9 && a.palette.sun.intensity / b.palette.sun.intensity <= 1.15 + 1e-9 &&
      a.palette.ambient.intensity / b.palette.ambient.intensity >= 0.88 - 1e-9 && a.palette.ambient.intensity / b.palette.ambient.intensity <= 1.12 + 1e-9 &&
      a.atmosphere!.haze[0] >= 0.53 && a.atmosphere!.haze[1] <= 1.05;
    if (ok) legible++;
    else worst.push(`${e.id}/${time}`);
  }
check("sky lightness and chroma, sun / ambient balance and haze band inside the legible bands", legible === total, `${legible}/${total}${worst.length ? `; out: ${worst.join(", ")}` : ""}`);

const src = readFileSync("src/lib/pixelcity/kit/atmosphere.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const site = /hostname|location\.|\burl\b|siteName|wikipedia|ikea|craigslist|graham|nasa|linear|gov\.uk|python/i;
check("no hostname, URL or site name in the atmosphere code", !site.test(src), site.exec(src)?.[0] ?? "");

const vec = (id: string) => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
  const e = t.environment!;
  const r = (e.tint.h * Math.PI) / 180;
  return [e.air, e.tint.strength * Math.cos(r), e.tint.strength * Math.sin(r), e.vivid, e.hardness];
};
const vs = DATASET.map((e) => ({ id: e.id, v: vec(e.id) }));
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, k) => x - b[k]));
const pairs: number[] = [];
for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) pairs.push(dist(vs[i].v, vs[j].v));
pairs.sort((a, b) => a - b);
const median = pairs[Math.floor(pairs.length / 2)];
const by = (id: string) => vs.find((x) => x.id === id)!.v;
const wiki = dist(by("reference"), by("reference-2"));
check("Wikipedia × Wikipedia closer than the median pair (air, tint, vividness, hardness)", wiki < median, `${wiki.toFixed(3)} vs median ${median.toFixed(3)}; Wikipedia × Paul Graham ${dist(by("reference"), by("oldweb")).toFixed(3)}`);

let change = 0;
let n = 0;
for (const e of DATASET) {
  const base = by(e.id);
  for (const pt of PERTURBATIONS) {
    const p = realPage(snap(e.id), pt);
    const t: KitTrace = newTrace();
    generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
    const x = t.environment!;
    const r = (x.tint.h * Math.PI) / 180;
    change += dist(base, [x.air, x.tint.strength * Math.cos(r), x.tint.strength * Math.sin(r), x.vivid, x.hardness]);
    n++;
  }
}
check("small page edits (text ±10%, links −10%, drop a section) move the environment < 0.1 on average", change / n < 0.1, `mean ${(change / n).toFixed(3)}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall atmosphere checks passed");
process.exit(failed ? 1 : 0);
