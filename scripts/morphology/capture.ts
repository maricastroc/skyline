import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { renderPage } from "../../src/lib/acquisition/render-page";
import { snapshotFromRendered } from "../../src/lib/acquisition/rendered-capture";
import { fetchStaticPage, fetchStylesheets } from "../../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../../src/lib/acquisition/url-policy";
import type { DomSnapshot } from "../../src/lib/snapshot/types";
import { HOLDOUT, HOLDOUT_B } from "./holdout-set";

const which = process.argv[2] === "b" ? "b" : "a";
const SET = which === "b" ? HOLDOUT_B : HOLDOUT;
const ROOT = which === "b" ? "docs/morphology/holdout2" : "docs/morphology/holdout";
const DIR = `${ROOT}/snapshots`;
mkdirSync(DIR, { recursive: true });
const only = process.argv.slice(3);

async function rendered(url: URL): Promise<DomSnapshot> {
  const page = await renderPage(url);
  return snapshotFromRendered(url, page, await fetchStylesheets(page.stylesheets));
}

async function acquire(input: string): Promise<DomSnapshot> {
  const url = normalizeInputUrl(input);
  let snapshot: DomSnapshot;
  try {
    snapshot = await fetchStaticPage(url);
  } catch (err) {
    if (err instanceof CaptureError && err.code === "empty_page") return rendered(url);
    throw err;
  }
  if (!snapshot.warnings.some((w) => w.code === "spa_shell")) return snapshot;
  try {
    const r = await rendered(url);
    return r.stats.elementCount > snapshot.stats.elementCount ? r : snapshot;
  } catch (err) {
    if (!(err instanceof CaptureError)) throw err;
    return snapshot;
  }
}

async function main() {
  const log: Array<{ id: string; url: string; ok: boolean; note: string }> = [];
  for (const h of SET) {
    if (only.length && !only.includes(h.id)) continue;
    const file = `${DIR}/${h.id}.json`;
    if (existsSync(file) && !process.env.FORCE) {
      log.push({ id: h.id, url: h.url, ok: true, note: "already captured" });
      continue;
    }
    try {
      const snap = await acquire(h.url);
      writeFileSync(file, JSON.stringify(snap));
      const note = `${snap.source.strategy}, ${snap.stats.elementCount} elements${snap.warnings.length ? `, warnings: ${snap.warnings.map((w) => w.code).join(",")}` : ""}`;
      log.push({ id: h.id, url: h.url, ok: true, note });
      console.log(`ok   ${h.id.padEnd(20)} ${note}`);
    } catch (err) {
      const note = err instanceof CaptureError ? `${err.code}${err.message ? `: ${err.message}` : ""}` : String(err).slice(0, 120);
      log.push({ id: h.id, url: h.url, ok: false, note });
      console.log(`fail ${h.id.padEnd(20)} ${note}`);
    }
  }
  if (!only.length) writeFileSync(`${ROOT}/capture-log.json`, JSON.stringify(log, null, 1));
}
main();
