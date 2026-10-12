import { readFileSync } from "node:fs";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { assertNotChallenge, checkHtmlResponse } from "../../src/lib/acquisition/static-fetch";
import { normalize } from "../../src/lib/model/normalize";
import { captureCaveat } from "../../src/lib/snapshot/caveat";
import { isMarkupWithoutWords, snapshotFromHtml } from "../../src/lib/snapshot/parse-html";
import type { CaptureWarning, DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { DATASET } from "../real-pages/dataset";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};
const snap = (id: string) => JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")) as DomSnapshot;

const SCAFFOLD = `<!doctype html><html lang="en"><head><title>App</title></head><body><div id="root"></div><noscript>You need to enable JavaScript to run this app.</noscript><script src="/static/js/main.js"></script></body></html>`;
const scaffold = snapshotFromHtml(SCAFFOLD, "https://scaffold.invalid/", "static");
const scaffoldDoc = normalize(scaffold);
const told = captureCaveat(scaffoldDoc);
check("a scaffold is read as a scaffold (spa_shell)", scaffold.warnings.some((w) => w.code === "spa_shell"), scaffold.warnings.map((w) => w.code).join(",") || "no warning");
check("the warning survives normalization, so the client receives it", scaffoldDoc.warnings.some((w) => w.code === "spa_shell"));
check("a scaffold's city carries a caveat with a line and a detail", told?.kind === "caveat" && told.code === "spa_shell" && told.line.length > 10 && told.detail.length > 20, told ? `“${told.line}”` : "none");

const failedRender = captureCaveat({ ...scaffoldDoc, warnings: [...scaffoldDoc.warnings, { code: "rendered_unavailable", message: "Rendered capture failed; showing the static scaffold." }] });
check("a failed browser capture is said in the same caveat", !!failedRender && failedRender.detail.includes("Rendered capture failed"));

const CODES: CaptureWarning["code"][] = ["spa_shell", "truncated", "few_elements", "noscript_heavy"];
const each = CODES.map((code) => captureCaveat({ warnings: [{ code, message: `${code} message` }], source: { strategy: "static" } }));
check("every warning the parser can raise has its own line", each.every((c, i) => c?.kind === "caveat" && c.code === CODES[i] && c.line.length > 10), each.map((c) => c?.code ?? "none").join(","));

const tiny = snap("oldweb--www.berkshirehathaway.com.rejected");
check("a frozen page that was read as almost nothing carries a caveat", captureCaveat(normalize(tiny))?.code === "few_elements");

const ids = DATASET.map((e) => e.id).filter((id) => {
  try {
    return !!snap(id);
  } catch {
    return false;
  }
});
const clean = ids.filter((id) => captureCaveat(normalize(snap(id))) === null);
check("no page of the corpus, read whole, carries one", clean.length === ids.length, `${clean.length}/${ids.length}`);

const viaBrowser = captureCaveat({ warnings: [], source: { strategy: "rendered" } });
check("a page read in a browser says so, as a note and not as a caveat", viaBrowser?.kind === "note" && viaBrowser.code === "rendered");
const stillBare = captureCaveat({ warnings: scaffold.warnings, source: { strategy: "rendered" } });
check("a page still wordless after a browser read it keeps a caveat, and it no longer blames the rendering", stillBare?.kind === "caveat" && /even in a browser/.test(stillBare.line) && !/scaffolding/i.test(stillBare.line));

const KB = 1024;
const WORDLESS: Array<[string, number, number, number]> = [
  ["youtube.com (placeholder boxes; a browser finds 27 regions where the HTML has none)", 311, 0, 929 * KB],
  ["airbnb.com (header and footer; the listings arrive later, ten times the text)", 497, 732, 912 * KB],
];
const WHOLE: Array<[string, number, number, number]> = [
  ["open.spotify.com", 726, 1754, 304 * KB],
  ["bundlephobia.com", 82, 616, 20 * KB],
  ["caniuse.com", 187, 2568, 19 * KB],
  ["regex101.com", 415, 1618, 64 * KB],
  ["stackblitz.com", 226, 1704, 35 * KB],
  ["notion.com/help", 676, 2981, 168 * KB],
  ["en.wikipedia.org/wiki/City", 10966, 171520, 1315 * KB],
  ["news.ycombinator.com", 801, 3478, 33 * KB],
  ["developer.mozilla.org", 1486, 11384, 182 * KB],
  ["github.com/vercel/next.js", 2360, 6126, 426 * KB],
  ["godbolt.org", 1578, 6574, 116 * KB],
  ["theguardian.com", 3843, 18974, 1415 * KB],
];
check("markup without words is told apart on the two pages the old rule missed", WORDLESS.every(([, e, t, b]) => isMarkupWithoutWords(e, t, b)), WORDLESS.map(([n]) => n.split(" ")[0]).join(", "));
const wrongly = WHOLE.filter(([, e, t, b]) => isMarkupWithoutWords(e, t, b)).map(([n]) => n);
check("and on none of the twelve live pages a browser read the same as the server sent", wrongly.length === 0, wrongly.join(", ") || `${WHOLE.length}/${WHOLE.length} left alone`);
const textOf = (n: SnapshotNode): number => n.text + n.children.reduce((a, c) => a + textOf(c), 0);
const corpusHits = ids.filter((id) => {
  const s = snap(id);
  return isMarkupWithoutWords(s.stats.elementCount, textOf(s.root), s.source.bytes);
});
check("nor on any page of the frozen corpus", corpusHits.length === 0, corpusHits.join(", ") || `${ids.length}/${ids.length} left alone`);

const doc = (body: string) => `<!doctype html><html><head><title>t</title></head><body>${body}</body></html>`;
const flagged = (html: string) => snapshotFromHtml(html, "https://shape.invalid/", "static").warnings.some((w) => w.code === "spa_shell");
const skeleton = doc(`${'<div class="card"><div class="thumb"></div><div class="line"></div><div class="line short"></div></div>'.repeat(90)}<script>window.__DATA__=${JSON.stringify("x".repeat(400 * KB))}</script>`);
const imageWall = doc(`<main>${'<a href="/p"><img src="/p.jpg" alt=""></a>'.repeat(200)}<p>Photographs by a studio, shown without captions, one hundred and twenty words short.</p></main>`);
const wordy = doc(`<main>${"<p>A paragraph with enough words in it to be a paragraph that somebody wrote for somebody else to read.</p>".repeat(80)}</main><script>window.__DATA__=${JSON.stringify("x".repeat(1024 * KB))}</script>`);
check("a heavy page of empty placeholder boxes is read as a scaffold", flagged(skeleton));
check("a light wall of images with almost no text is not: it is thin per element but it is all there", !flagged(imageWall));
check("a wordy page that inlines a megabyte of data is not either", !flagged(wordy));

const AWS_WAF = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title></title><script type="text/javascript">window.awsWafCookieDomainList = ['example.org'];</script><script type="text/javascript" src="https://www.example.org/__challenge_h78IRKX3kpQxScCExxShBNwRUlb/d8c14d4960ca/a18a4859af9c/challenge.js"></script></head><body><div id="challenge-container"></div><noscript><h1>JavaScript is disabled</h1></noscript></body></html>`;
const refusal = (work: () => void) => {
  try {
    work();
    return "none";
  } catch (e) {
    return e instanceof CaptureError ? e.code : "unexpected";
  }
};
check("an AWS WAF challenge page would pass for a scaffold", snapshotFromHtml(AWS_WAF, "https://challenge.invalid/", "static").warnings.some((w) => w.code === "spa_shell"));
check("so it is refused as a challenge before it is parsed (blocked)", refusal(() => assertNotChallenge(AWS_WAF)) === "blocked");
check("and the 202 it arrives with is a refusal on its own (blocked)", refusal(() => checkHtmlResponse({ status: 202, headers: {}, contentType: "text/html" })) === "blocked");
check("an ordinary scaffold is not mistaken for a challenge", refusal(() => assertNotChallenge(SCAFFOLD)) === "none" && refusal(() => checkHtmlResponse({ status: 200, headers: {}, contentType: "text/html" })) === "none");

const app = readFileSync("src/components/pixel/PixelApp.tsx", "utf8");
const css = readFileSync("src/app/pixel/skyline.css", "utf8");
check("the city view draws the caveat next to its numbers", /captureCaveat\(doc\)/.test(app) && /className="sk-caveat-line"/.test(app) && /\.sk-caveat-line\s*\{/.test(css));
check("the panel draws the caveat or the note with its detail", /className="sk-caveat"/.test(app) && /caveat\.detail/.test(app) && /\.sk-caveat\s*\{/.test(css));

console.log(failed ? `\n${failed} check(s) failed` : "\nall capture-warning checks passed");
process.exit(failed ? 1 : 0);
