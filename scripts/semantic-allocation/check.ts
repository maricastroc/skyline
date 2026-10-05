import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import type { Plan } from "../../src/lib/pixelcity/kit/plan";
import { PERTURBATIONS, realPage } from "../../src/lib/pixelcity/kit/real-page";
import { allocate, lotPath, LOT_TOTAL, N } from "../../src/lib/pixelcity/kit/territory";
import { vacantFingerprint } from "../../src/lib/pixelcity/vacant-fingerprint";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));

const path = lotPath();
const unique = new Set(path.map(([x, y]) => x * N + y)).size;
const steps = path.slice(1).every((p, k) => Math.abs(p[0] - path[k][0]) + Math.abs(p[1] - path[k][1]) === 1);
check("path visits all 256 lots once, every step between neighbours", path.length === LOT_TOTAL && unique === LOT_TOTAL && steps);

const contiguous = (lots: Array<[number, number]>) => {
  if (lots.length < 2) return true;
  const set = new Set(lots.map(([x, y]) => x * N + y));
  const seen = new Set([lots[0][0] * N + lots[0][1]]);
  const stack = [lots[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = (x + dx) * N + (y + dy);
      if (x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N && set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === set.size;
};
let worstErr = 0;
let allContig = true;
let sums = true;
for (const e of DATASET) {
  const p = realPage(snap(e.id));
  const a = allocate(p.plan);
  sums &&= a.lots.reduce((s, v) => s + v, 0) === LOT_TOTAL;
  p.plan.territories.forEach((t, i) => {
    worstErr = Math.max(worstErr, Math.abs(a.lots[i] - t.weight * LOT_TOTAL));
    const lots: Array<[number, number]> = [];
    for (const s of a.segments) if (s.territory === i) for (let k = s.from; k < s.from + s.count; k++) lots.push(path[k]);
    allContig &&= contiguous(lots);
  });
}
check("every page's lots sum to 256", sums);
check("every territory within ±1 lot of 256·weight (+ one per extra mix segment)", worstErr < 2, `worst ${worstErr.toFixed(2)} lots`);
check("every territory is one connected piece", allContig);

let mono = true;
const base = realPage(snap("institution")).plan;
for (let ti = 0; ti < base.territories.length; ti++) {
  let prev = -1;
  for (let w = 0.002; w < 0.95; w *= 1.35) {
    const k = (1 - w) / (1 - base.territories[ti].weight);
    const plan: Plan = { ...base, territories: base.territories.map((t, i) => ({ ...t, weight: i === ti ? w : t.weight * k })) };
    const lots = allocate(plan).lots[ti];
    if (lots < prev) mono = false;
    prev = lots;
  }
}
check("raising one territory's weight never lowers its lots (every territory of a real page, 0.2% → 95%)", mono);

let bad = 0;
let det = true;
let n = 0;
for (const e of DATASET)
  for (const pt of ["none", ...PERTURBATIONS] as const) {
    const p = realPage(snap(e.id), pt);
    for (const seed of [7, 8]) {
      for (const mode of [{}, { flat: true }, { provenance: true }, { time: "night" as const }]) {
        const c = generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, ...mode });
        n++;
        bad += c.parts.filter((q) => !q.color || q.color.some((v) => !Number.isFinite(v)) || ![q.x, q.y, q.z, q.w, q.h, q.d].every(Number.isFinite)).length;
      }
      if (pt === "none" && seed === 7) {
        const h = () => sha(JSON.stringify(generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed, trace: newTrace() }).parts));
        det &&= h() === h();
      }
    }
  }
check(`no invalid parts (${n} cities)`, bad === 0, `${bad} invalid`);
check("same snapshot → same city (hash)", det);
for (const prof of ["mixed", "portal", "product", "reference"] as const) {
  const c = generateKitDistrict(vacantFingerprint(), { profile: prof });
  check(`synthetic profile “${prof}” still renders`, c.parts.length > 1000);
}

const hosts = DATASET.flatMap((e) => e.urls.map((u) => new URL(u).hostname.replace(/^www\./, "")));
const brands = ["wikipedia", "ikea", "lobste", "vercel", "theguardian", "nasa.gov", "craigslist", "github", "paulgraham", "brittanychiang", "svelte", "allbirds", "patagonia", "unsplash", "berkshire", "spacejam", "danluu", "notion", "steampowered", "everlane", "toscrape", "hostname", "location.host"];
const words = [...new Set([...hosts, ...brands])];
const src = readdirSync("src/lib/pixelcity/kit").map((f) => [f, readFileSync(`src/lib/pixelcity/kit/${f}`, "utf8").toLowerCase()] as const);
const hits = src.flatMap(([f, s]) => words.filter((w) => w.length > 3 && s.includes(w.toLowerCase())).map((w) => `${f}:${w}`));
check("no benchmark site, host or hostname check in src/lib/pixelcity/kit", hits.length === 0, hits.join(", "));

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
