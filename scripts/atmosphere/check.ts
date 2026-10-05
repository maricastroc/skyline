// Art direction C4 (atmosphere) checks: npm run test:atmosphere
// The environment is read from the page and the foundation only (never the seed, the time or the
// site); it changes sky, haze and light and nothing else; it stays inside legible bands at every
// time of day; the ablations peel the art direction back layer by layer to the frozen kits.
// The current kit runs with `polishAssets: false` (visual polish off): this suite checks its own
// pass against the kits before it; the polish is checked by `npm run test:polish`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { rgbToOklch } from "../../src/lib/city/palette";
import { generateKitDistrict, newTrace, type KitTrace } from "../../src/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g9 } from "../../src/lib/pixelcity/kit-v9/district";
import { realPage as r9 } from "../../src/lib/pixelcity/kit-v9/real-page";
import { generateKitDistrict as g10 } from "../../src/lib/pixelcity/kit-v10/district";
import { realPage as r10 } from "../../src/lib/pixelcity/kit-v10/real-page";
import { generateKitDistrict as g11, newTrace as newTrace11 } from "../../src/lib/pixelcity/kit-v11/district";
import { realPage as r11 } from "../../src/lib/pixelcity/kit-v11/real-page";
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

// 1. Ablations, layer by layer: C4 off = kit-v11 (C3), C3 off = kit-v10 (C1), all off = kit-v9.
let off4 = 0;
let off3 = 0;
let off1 = 0;
let partsSame = 0;
let onlyEnv = 0;
let upstream = 0;
for (const e of DATASET) {
  const s = snap(e.id);
  const p = realPage(s);
  const q11 = r11(s);
  const q10 = r10(s);
  const q9 = r9(s);
  for (const [time, flat] of MODES) {
    const o = { profile: p.plan, time, seed: 7, flat, polishAssets: false } as const;
    const b11 = g11(q11.fp, { profile: q11.plan, time, seed: 7, flat });
    if (sha(generateKitDistrict(p.fp, { ...o, atmosphere: false })) === sha(b11)) off4++;
    if (sha(generateKitDistrict(p.fp, { ...o, streetLife: false })) === sha(g10(q10.fp, { profile: q10.plan, time, seed: 7, flat }))) off3++;
    if (sha(generateKitDistrict(p.fp, { ...o, artDirection: false })) === sha(g9(q9.fp, { profile: q9.plan, time, seed: 7, flat }))) off1++;
    // 2. With C4 on, the city is kit-v11's part for part; only sky, sun, ambient and haze differ.
    const a = generateKitDistrict(p.fp, o);
    if (sha([a.parts, a.signs, a.scenery, a.smokestacks]) === sha([b11.parts, b11.signs, b11.scenery, b11.smokestacks])) partsSame++;
    const strip = (pal: typeof a.palette) => ({ ...pal, sky: null, sun: null, ambient: null });
    if (sha(strip(a.palette)) === sha(strip(b11.palette))) onlyEnv++;
  }
  // 3. C1's roles and C3's street life are kit-v11's.
  const t: KitTrace = newTrace();
  generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed: 7, trace: t });
  const t11 = newTrace11();
  g11(q11.fp, { profile: q11.plan, time: "day", seed: 7, trace: t11 });
  if (sha([t.streets, t.life]) === sha([t11.streets, t11.life])) upstream++;
}
const n3 = DATASET.length * 3;
check("atmosphere off → kit-v11 (C3) byte for byte (day, night, flat)", off4 === n3, `${off4}/${n3}`);
check("street life off → kit-v10 (C1) byte for byte", off3 === n3, `${off3}/${n3}`);
check("art direction off → kit-v9 (foundation v1) byte for byte", off1 === n3, `${off1}/${n3}`);
check("with C4 on, parts, signs, scenery and smoke are kit-v11's", partsSame === n3, `${partsSame}/${n3}`);
check("with C4 on, the palette differs from kit-v11 only in sky, sun and ambient light", onlyEnv === n3, `${onlyEnv}/${n3}`);
check("C1 street roles and C3 street life unchanged (kit-v11)", upstream === DATASET.length, `${upstream}/${DATASET.length}`);

// 4. The environment is the page's: not the seed's, not the hour's.
const env = (id: string, seed: number, time: "day" | "night" | "golden") => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  const c = generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time, seed, trace: t });
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

// 5. Legible bands, every page, every time of day.
const BANDS = { day: { top: [0.62, 0.78], bottom: [0.86, 0.95] }, golden: { top: [0.52, 0.66], bottom: [0.78, 0.9] }, night: { top: [0.12, 0.22], bottom: [0.24, 0.38] } } as const;
let legible = 0;
let total = 0;
const worst: string[] = [];
for (const e of DATASET)
  for (const time of ["day", "golden", "night"] as const) {
    total++;
    const p = realPage(snap(e.id));
    const a = generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time, seed: 7 });
    const b = generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time, seed: 7, atmosphere: false });
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

// 6. No site knowledge in the atmosphere code.
const src = readFileSync("src/lib/pixelcity/kit/atmosphere.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const site = /hostname|location\.|\burl\b|siteName|wikipedia|ikea|craigslist|graham|nasa|linear|gov\.uk|python/i;
check("no hostname, URL or site name in the atmosphere code", !site.test(src), site.exec(src)?.[0] ?? "");

// 7. Family: the two Wikipedia articles share an environment more than the median pair does.
const vec = (id: string) => {
  const p = realPage(snap(id));
  const t: KitTrace = newTrace();
  generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed: 7, trace: t });
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

// 8. Equivalent pages, equivalent air: small page edits move the environment little.
let change = 0;
let n = 0;
for (const e of DATASET) {
  const base = by(e.id);
  for (const pt of PERTURBATIONS) {
    const p = realPage(snap(e.id), pt);
    const t: KitTrace = newTrace();
    generateKitDistrict(p.fp, { polishAssets: false, profile: p.plan, time: "day", seed: 7, trace: t });
    const x = t.environment!;
    const r = (x.tint.h * Math.PI) / 180;
    change += dist(base, [x.air, x.tint.strength * Math.cos(r), x.tint.strength * Math.sin(r), x.vivid, x.hardness]);
    n++;
  }
}
check("small page edits (text ±10%, links −10%, drop a section) move the environment < 0.1 on average", change / n < 0.1, `mean ${(change / n).toFixed(3)}`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall atmosphere checks passed");
process.exit(failed ? 1 : 0);
