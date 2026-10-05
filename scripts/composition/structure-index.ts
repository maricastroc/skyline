import { readFileSync } from "node:fs";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { allocate } from "../../src/lib/pixelcity/kit/territory";
import { DATASET } from "../real-pages/dataset";
const out: Record<string, number> = {};
for (const e of DATASET) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8")));
  const a = allocate(p.plan);
  let s = 0;
  for (const seg of a.segments) if (seg.comp === "parcelled") s += seg.count * Math.log2(Math.max(1, p.plan.territories[seg.territory].structure?.groups.length ?? 1));
  out[e.id] = s / 256;
}
console.log(JSON.stringify(out));
