import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { parseExperiments } from "../../src/lib/semantics/experiments";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { BENCH, EXTRA, holdoutFile } from "./dataset";

const [flags, ...ids] = process.argv.slice(2);
mkdirSync("docs/morphology/layout", { recursive: true });
for (const id of ids) {
  const file = [...BENCH, ...EXTRA].find((b) => b.id === id)?.file ?? (existsSync(holdoutFile(id)) ? holdoutFile(id) : holdoutFile(id, "holdout2"));
  const p = realPage(JSON.parse(readFileSync(file, "utf8")) as DomSnapshot, "none", parseExperiments(flags));
  const trace = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, time: "day", seed: 7, flat: true, trace });
  const L = trace.layout!;
  const pieces = trace.pieces
    .filter((x) => x.piece.seg >= 0)
    .map((x) => {
      const b = L.briefs.get(x.piece)!;
      const c = Math.abs(Math.cos(x.piece.rot));
      const s = Math.abs(Math.sin(x.piece.rot));
      const hw = (x.piece.w * c + x.piece.d * s) / 2;
      const hd = (x.piece.w * s + x.piece.d * c) / 2;
      return { block: x.block, x0: x.piece.x - hw, x1: x.piece.x + hw, z0: x.piece.z - hd, z1: x.piece.z + hd, comp: x.comp, type: x.piece.type, territory: b.territory, ensemble: b.ensemble, first: b.first, dominants: b.dominants, units: b.units, anchor: L.ensembles[b.ensemble].anchor >= 0 && L.pieces[L.ensembles[b.ensemble].anchor].piece === x.piece };
    });
  const territories = L.territories
    .filter((m) => m.lots > 0)
    .map((m) => ({ index: m.index, kind: m.kind, label: (p.plan.territories[m.index].label ?? "").slice(0, 26), lots: m.lots, fabric: [...m.fabrics].sort((a, b) => b.share - a.share)[0]?.comp ?? "", groups: m.groups.length, groupKind: m.groups[0]?.kind ?? "", items: m.counts.items, controls: m.counts.controls, ensembles: L.ensembles.filter((e) => e.territory === m.index).length }));
  writeFileSync(`docs/morphology/layout/${id}.json`, JSON.stringify({ id, flags, pieces, territories }));
  console.log(`${id}: ${territories.length} territories, ${L.ensembles.length} ensembles, ${pieces.length} pieces`);
}
