export type Family = "feed" | "docs" | "market" | "editorial" | "app" | "landing";
export interface Bench {
  id: string;
  set: "corpus" | "pairs" | "holdout";
  file: string;
  family: Family;
  what: string;
}
const corpus = (id: string, family: Family, what: string): Bench => ({ id, set: "corpus", file: `docs/real-pages/snapshots/${id}.json`, family, what });
const pair = (id: string, family: Family, what: string): Bench => ({ id, set: "pairs", file: `docs/rendered-capture/snapshots/${id}.json`, family, what });

export const BENCH: Bench[] = [
  corpus("hn", "feed", "Hacker News front page"),
  corpus("forum", "feed", "lobste.rs front page"),
  pair("bsky-rendered", "feed", "Bluesky Discover feed"),
  pair("mastodon-rendered", "feed", "Mastodon explore"),
  pair("hn-algolia-rendered", "feed", "HN search results"),
  pair("twitch-rendered", "feed", "Twitch home"),

  corpus("docs", "docs", "Python docs"),
  corpus("reference", "docs", "Wikipedia article"),
  pair("mdn-static", "docs", "MDN HTML reference"),
  pair("devdocs-rendered", "docs", "DevDocs app"),

  corpus("shop", "market", "IKEA"),
  corpus("directory", "market", "craigslist"),
  pair("airbnb-rendered", "market", "Airbnb home"),
  pair("spotify-static", "market", "Spotify web"),
  pair("pinterest-rendered", "market", "Pinterest home"),
  pair("soundcloud-rendered", "market", "SoundCloud discover"),

  corpus("news", "editorial", "The Guardian front"),
  corpus("media", "editorial", "NASA"),
  corpus("oldweb", "editorial", "Paul Graham essays"),

  corpus("app", "app", "GitHub repository"),
  pair("rayso-rendered", "app", "ray.so"),
  pair("youtube-rendered", "app", "YouTube signed out"),
  pair("excalidraw-rendered", "app", "Excalidraw"),
  pair("photopea-rendered", "app", "Photopea"),

  corpus("portfolio", "landing", "a portfolio"),
  corpus("saas", "landing", "Linear"),
  corpus("saas-2", "landing", "Vercel"),
  corpus("apple", "landing", "Apple"),
  corpus("institution", "landing", "GOV.UK"),
  pair("duolingo-rendered", "landing", "Duolingo"),
];

export const EXTRA: Bench[] = [
  pair("hn-rendered", "feed", "Hacker News, another day"),
  pair("github-repo-rendered", "app", "GitHub repository (next.js)"),
  pair("guardian-rendered", "editorial", "The Guardian, another day"),
  pair("mdn-rendered", "docs", "MDN HTML reference, rendered"),
  pair("wikipedia-rendered", "docs", "Wikipedia: City"),
  pair("notion-help-rendered", "docs", "Notion help centre"),
  pair("caniuse-rendered", "app", "Can I use"),
  pair("godbolt-rendered", "app", "Compiler Explorer"),
  pair("regex101-rendered", "app", "regex101"),
  pair("stackblitz-rendered", "landing", "StackBlitz"),
  pair("spotify-rendered", "market", "Spotify web, rendered"),
  pair("diagrams-rendered", "app", "diagrams.net"),
  pair("desmos-rendered", "app", "Desmos calculator"),
  pair("jsoncrack-rendered", "app", "JSON Crack editor"),
  pair("carbon-rendered", "app", "Carbon"),
  pair("bundlephobia-rendered", "app", "Bundlephobia"),
  pair("squoosh-rendered", "app", "Squoosh"),
  pair("tldraw-rendered", "app", "tldraw"),
  pair("airbnb-static", "market", "Airbnb, static scaffold"),
  { id: "reference-2", set: "corpus", file: "docs/real-pages/snapshots/reference-2.json", family: "docs", what: "Wikipedia: Lighthouse" },
  { id: "danluu", set: "corpus", file: "docs/real-pages/snapshots/oldweb--danluu.com.rejected.json", family: "editorial", what: "danluu.com index" },
];

export const holdoutFile = (id: string, dir = "holdout") => `docs/morphology/${dir}/snapshots/${id}.json`;
