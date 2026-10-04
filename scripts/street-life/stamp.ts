// C3 audit (read-only): how much of the street layer is the same in every page?
//   npx tsx scripts/street-life/stamp.ts [kit]   kit: v10 (default, C1) or current
// For the 8 audit pages, compares the sidewalk furniture, the crossing furniture and the traffic
// part by part (mesh + position + size, colour ignored) and counts what is identical in all 8.
import { readFileSync } from "node:fs";
import { generateKitDistrict as gCur, newTrace as tCur } from "../../src/lib/pixelcity/kit/district";
import { realPage as rCur } from "../../src/lib/pixelcity/kit/real-page";
import { generateKitDistrict as g10, newTrace as t10 } from "../../src/lib/pixelcity/kit-v10/district";
import { realPage as r10 } from "../../src/lib/pixelcity/kit-v10/real-page";
import type { Part } from "../../src/lib/pixelcity/types";

const PAGES = ["shop", "oldweb", "directory", "institution", "reference", "media", "saas", "docs"];
const which = process.argv[2] ?? "v10";
const key = (q: Part) => `${q.mesh}|${q.x.toFixed(3)}|${q.y.toFixed(3)}|${q.z.toFixed(3)}|${q.w.toFixed(3)}|${q.h.toFixed(3)}|${q.d.toFixed(3)}`;
const layers: Record<string, Array<Set<string>>> = { furniture: [], crossings: [], traffic: [] };
const sizes: Record<string, number[]> = { furniture: [], crossings: [], traffic: [] };
for (const id of PAGES) {
  const snap = JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8"));
  const p = which === "current" ? rCur(snap) : r10(snap);
  const t = which === "current" ? tCur() : t10();
  const c = (which === "current" ? gCur : g10)(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t as never });
  for (const L of Object.keys(layers)) {
    const [a, b] = (t.scene as Record<string, [number, number]>)[L];
    const ks = c.parts.slice(a, b).map(key);
    layers[L].push(new Set(ks));
    sizes[L].push(ks.length);
  }
}
for (const L of Object.keys(layers)) {
  const [first, ...rest] = layers[L];
  const common = [...first].filter((k) => rest.every((s) => s.has(k))).length;
  const mean = sizes[L].reduce((a, b) => a + b, 0) / sizes[L].length;
  console.log(`${L.padEnd(10)} parts per page ${sizes[L].join("/")}  identical in all 8 pages: ${common} (${((100 * common) / mean).toFixed(0)}% of a page's ${L})`);
}
