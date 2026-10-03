/**
 * Real-page validation dataset. Each entry lists URLs in order of preference: the first one
 * that captures cleanly (static fetch, no bot challenge, not an empty SPA shell) is used and
 * its snapshot frozen under docs/real-pages/snapshots/<id>.json, so every later run (and every
 * screenshot) reads the same page.
 *
 * `sibling` marks a second page of an already-covered category, used only for the
 * family-resemblance test (B).
 */
export interface PageEntry {
  id: string;
  category: string;
  urls: string[];
  sibling?: string;
}

export const DATASET: PageEntry[] = [
  { id: "reference", category: "long article / reference", urls: ["https://en.wikipedia.org/wiki/Suspension_bridge"] },
  { id: "docs", category: "technical documentation", urls: ["https://docs.python.org/3/library/itertools.html", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table"] },
  { id: "app", category: "dashboard / app", urls: ["https://github.com/sveltejs/svelte", "https://www.githubstatus.com/"] },
  { id: "saas", category: "product / SaaS landing", urls: ["https://linear.app/", "https://stripe.com/"] },
  { id: "shop", category: "e-commerce", urls: ["https://www.allbirds.com/collections/mens", "https://www.patagonia.com/shop/mens", "https://www.ikea.com/us/en/cat/chairs-fu002/", "https://store.steampowered.com/", "https://www.everlane.com/collections/mens-tees", "https://books.toscrape.com/"] },
  { id: "news", category: "news / editorial", urls: ["https://www.theguardian.com/international", "https://www.bbc.com/news"] },
  { id: "portfolio", category: "portfolio", urls: ["https://brittanychiang.com/", "https://jackmcdade.com/", "https://rauno.me/"] },
  { id: "forum", category: "forum / community", urls: ["https://lobste.rs/", "https://news.ycombinator.com/"] },
  { id: "institution", category: "institutional", urls: ["https://www.gov.uk/", "https://www.un.org/en/"] },
  { id: "oldweb", category: "old / simple HTML", urls: ["https://www.berkshirehathaway.com/", "https://www.paulgraham.com/articles.html", "https://www.spacejam.com/1996/", "https://www.cs.utexas.edu/~EWD/", "https://danluu.com/"] },
  { id: "media", category: "media-heavy", urls: ["https://unsplash.com/", "https://www.nasa.gov/images/", "https://www.flickr.com/explore"] },
  { id: "directory", category: "links / navigation", urls: ["https://www.craigslist.org/about/sites", "https://lite.cnn.com/"] },
  // Family resemblance (B): a second page of a category already covered.
  { id: "reference-2", category: "long article / reference", urls: ["https://en.wikipedia.org/wiki/Lighthouse"], sibling: "reference" },
  { id: "saas-2", category: "product / SaaS landing", urls: ["https://vercel.com/", "https://www.notion.com/"], sibling: "saas" },
];
