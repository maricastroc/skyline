import { readFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { DATASET } from "../real-pages/dataset";
console.log("| page | territory | parcelled lots | structure | evidence | frontage | verdict |");
console.log("|---|---|---|---|---|---|---|");
for (const e of DATASET) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${e.id}.json`, "utf8")));
  const t = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, trace: t });
  const lots = new Map<number, number>();
  for (const s of t.alloc!.segments) if (s.comp === "parcelled") lots.set(s.territory, (lots.get(s.territory) ?? 0) + s.count);
  for (const [ti, n] of lots) {
    const T = p.plan.territories[ti];
    const f = t.frontage.find((x) => x.territory === ti);
    const s = T.structure!;
    const verdict = f ? "changed — explicit groups" : s.source === "none" ? "unchanged — one sequence / no evidence" : "unchanged — structure but frontage too short";
    console.log(`| ${e.id} | ${T.kind} «${(T.label ?? "").slice(0, 22)}» | ${n} | ${s.source}${s.groups.length ? ` ${s.groups.length}` : ""} | ${s.evidence[0].slice(0, 70)} | ${f ? `${f.clusters} clusters, ${f.passages} passages / ${f.slots} slots` : "no frontage plan"} | ${verdict} |`);
  }
}
