import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { renderPage } from "../../src/lib/acquisition/render-page";
import { snapshotFromRendered } from "../../src/lib/acquisition/rendered-capture";
import { fetchStaticPage, fetchStylesheets } from "../../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../../src/lib/acquisition/url-policy";
import type { DomSnapshot } from "../../src/lib/snapshot/types";

export const VISUAL: Array<[string, string, "known" | "new"]> = [
  ["soundcloud", "https://soundcloud.com/discover", "known"],
  ["twitch", "https://www.twitch.tv/", "known"],
  ["spotify", "https://open.spotify.com/", "known"],
  ["pinterest", "https://www.pinterest.com/", "known"],
  ["bsky", "https://bsky.app/", "known"],
  ["mastodon", "https://mastodon.social/explore", "known"],
  ["youtube", "https://www.youtube.com/", "known"],
  ["airbnb", "https://www.airbnb.com/", "known"],
  ["duolingo", "https://www.duolingo.com/", "known"],
  ["bandcamp", "https://bandcamp.com/discover", "known"],
  ["flickr", "https://www.flickr.com/explore", "known"],
  ["hn-algolia", "https://hn.algolia.com/", "known"],
  ["mixcloud", "https://www.mixcloud.com/discover/", "new"],
  ["audiomack", "https://audiomack.com/trending-now", "new"],
  ["apple-music", "https://music.apple.com/us/browse", "new"],
  ["apple-podcasts", "https://podcasts.apple.com/us/browse", "new"],
  ["vimeo", "https://vimeo.com/watch", "new"],
  ["500px", "https://500px.com/popular", "new"],
  ["giphy", "https://giphy.com/", "new"],
  ["imgur", "https://imgur.com/", "new"],
  ["behance", "https://www.behance.net/galleries", "new"],
  ["deezer", "https://www.deezer.com/en/channels/explore", "new"],
  ["tidal", "https://tidal.com/browse/", "new"],
  ["letterboxd", "https://letterboxd.com/films/popular/", "new"],
];

const ROOT = "docs/morphology/recapture";
const [, , part = "0/1"] = process.argv;
const [k, n] = part.split("/").map(Number);

async function one(url: URL, images: "abort" | "placeholder"): Promise<DomSnapshot> {
  let still: DomSnapshot | null = null;
  try {
    still = await fetchStaticPage(url);
  } catch (err) {
    if (!(err instanceof CaptureError && err.code === "empty_page")) throw err;
  }
  if (still && !still.warnings.some((w) => w.code === "spa_shell")) return still;
  const page = await renderPage(url, { images });
  const snap = snapshotFromRendered(url, page, await fetchStylesheets(page.stylesheets));
  return still && snap.stats.elementCount <= still.stats.elementCount ? still : snap;
}

async function main() {
  for (const mode of ["abort", "placeholder"] as const) mkdirSync(`${ROOT}/${mode}`, { recursive: true });
  for (const [i, [id, input]] of VISUAL.entries()) {
    if (i % n !== k) continue;
    for (const mode of ["abort", "placeholder"] as const) {
      const file = `${ROOT}/${mode}/${id}.json`;
      if (existsSync(file)) continue;
      try {
        const snap = await one(normalizeInputUrl(input), mode);
        writeFileSync(file, JSON.stringify(snap));
        console.log(`ok   ${id.padEnd(15)} ${mode.padEnd(11)} ${snap.source.strategy}, ${snap.stats.elementCount} elements`);
      } catch (err) {
        console.log(`fail ${id.padEnd(15)} ${mode.padEnd(11)} ${err instanceof CaptureError ? err.code : String(err).slice(0, 80)}`);
      }
    }
  }
}
const RENDERED = ["soundcloud", "twitch", "pinterest", "bsky", "mastodon", "youtube", "airbnb", "duolingo", "bandcamp", "flickr", "hn-algolia", "vimeo", "500px", "giphy", "imgur", "deezer"];

async function cost(runs: number) {
  const rows: Array<Record<string, string | number>> = [];
  for (const [id, input] of VISUAL.filter(([v]) => RENDERED.includes(v))) {
    for (let r = 0; r < runs; r++)
      for (const mode of ["abort", "placeholder"] as const) {
        try {
          const page = await renderPage(normalizeInputUrl(input), { images: mode });
          rows.push({ id, mode, run: r, ms: page.durationMs, requests: page.requests, placeholders: page.placeholders, refused: page.refused.length, settled: page.settled, html: page.html.length });
        } catch (err) {
          rows.push({ id, mode, run: r, ms: -1, requests: 0, placeholders: 0, refused: 0, settled: err instanceof CaptureError ? err.code : "error", html: 0 });
        }
        console.log(JSON.stringify(rows[rows.length - 1]));
      }
  }
  writeFileSync("docs/morphology/capture-cost.json", JSON.stringify(rows, null, 1));
}

if (process.argv[1]?.endsWith("recapture.ts")) void (process.argv[2] === "cost" ? cost(Number(process.argv[3] ?? 2)) : main());
