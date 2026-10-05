import { mkdirSync, writeFileSync } from "node:fs";
import { fetchStaticPage } from "../../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../../src/lib/acquisition/url-policy";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { normalize } from "../../src/lib/model/normalize";
import { analyzeSemantics } from "../../src/lib/semantics/analyze";
import { DATASET } from "./dataset";

const DIR = "docs/real-pages/snapshots";
mkdirSync(DIR, { recursive: true });

async function main() {
  const only = process.argv.slice(2);
  const log: string[] = [];
  for (const e of DATASET) {
    if (only.length && !only.includes(e.id)) continue;
    let done = false;
    for (const u of e.urls) {
      try {
        const snap = await fetchStaticPage(normalizeInputUrl(u));
        const doc = normalize(snap);
        const sem = analyzeSemantics(doc);
        const shell = snap.warnings.some((w) => w.code === "spa_shell" || w.code === "few_elements");
        const line = `${e.id.padEnd(12)} ${u}  → ${snap.source.finalUrl}  ${snap.stats.elementCount} el, ${doc.nodes.length} nodes, ${sem.regions.length} regions, ${sem.districts.length} districts${snap.warnings.length ? `  [${snap.warnings.map((w) => w.code).join(",")}]` : ""}`;
        console.log(line);
        const why = shell ? "shell" : doc.nodes.length < 60 ? "under 60 nodes" : sem.districts.length === 0 ? "no districts" : "";
        if (why) {
          log.push(`${line}  REJECTED (${why})`);
          writeFileSync(`${DIR}/${e.id}--${new URL(u).hostname}.rejected.json`, JSON.stringify(snap));
          continue;
        }
        writeFileSync(`${DIR}/${e.id}.json`, JSON.stringify(snap));
        log.push(`${line}  USED`);
        done = true;
        break;
      } catch (err) {
        const msg = err instanceof CaptureError ? `${err.code}: ${err.message}` : String(err);
        console.log(`${e.id.padEnd(12)} ${u}  ✗ ${msg}`);
        log.push(`${e.id.padEnd(12)} ${u}  ✗ ${msg}`);
      }
    }
    if (!done) console.log(`${e.id}: no clean capture`);
  }
  writeFileSync(`${DIR}/../fetch-log-${only.length ? only.join("-") : "all"}.txt`, `${new Date().toISOString()}\n${log.join("\n")}\n`);
}
main();
