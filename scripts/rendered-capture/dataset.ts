export type Group = "shell" | "suspect" | "control";
export interface Entry {
  id: string;
  url: string;
  group: Group;
  what: string;
}

export const DATASET: Entry[] = [
  { id: "bsky", url: "https://bsky.app", group: "shell", what: "social feed" },
  { id: "mastodon", url: "https://mastodon.social/explore", group: "shell", what: "social feed" },
  { id: "hn-algolia", url: "https://hn.algolia.com", group: "shell", what: "search results list" },
  { id: "devdocs", url: "https://devdocs.io", group: "shell", what: "documentation app" },
  { id: "duolingo", url: "https://www.duolingo.com", group: "shell", what: "product landing" },
  { id: "soundcloud", url: "https://soundcloud.com/discover", group: "shell", what: "media catalogue" },
  { id: "twitch", url: "https://www.twitch.tv", group: "shell", what: "media catalogue" },
  { id: "pinterest", url: "https://www.pinterest.com", group: "shell", what: "image wall" },
  { id: "booking", url: "https://www.booking.com", group: "shell", what: "travel search" },
  { id: "uniswap", url: "https://app.uniswap.org", group: "shell", what: "web app" },
  { id: "excalidraw", url: "https://excalidraw.com", group: "shell", what: "canvas tool" },
  { id: "tldraw", url: "https://tldraw.com", group: "shell", what: "canvas tool" },
  { id: "diagrams", url: "https://app.diagrams.net", group: "shell", what: "canvas tool" },
  { id: "photopea", url: "https://www.photopea.com", group: "shell", what: "canvas tool" },
  { id: "desmos", url: "https://www.desmos.com/calculator", group: "shell", what: "canvas tool" },
  { id: "rayso", url: "https://ray.so", group: "shell", what: "single-purpose tool" },
  { id: "jsoncrack", url: "https://jsoncrack.com/editor", group: "shell", what: "editor" },
  { id: "squoosh", url: "https://squoosh.app", group: "shell", what: "single-purpose tool" },
  { id: "carbon", url: "https://carbon.now.sh", group: "shell", what: "single-purpose tool" },
  { id: "ytmusic", url: "https://music.youtube.com", group: "shell", what: "media catalogue" },

  { id: "youtube", url: "https://www.youtube.com", group: "suspect", what: "media catalogue" },
  { id: "airbnb", url: "https://www.airbnb.com", group: "suspect", what: "listings" },
  { id: "spotify", url: "https://open.spotify.com", group: "suspect", what: "media catalogue" },
  { id: "bundlephobia", url: "https://bundlephobia.com", group: "suspect", what: "single-purpose tool" },
  { id: "caniuse", url: "https://caniuse.com", group: "suspect", what: "reference tables" },
  { id: "regex101", url: "https://regex101.com", group: "suspect", what: "editor" },
  { id: "stackblitz", url: "https://stackblitz.com", group: "suspect", what: "product landing" },
  { id: "notion-help", url: "https://www.notion.com/help", group: "suspect", what: "help centre" },

  { id: "wikipedia", url: "https://en.wikipedia.org/wiki/City", group: "control", what: "reference article" },
  { id: "hn", url: "https://news.ycombinator.com", group: "control", what: "link list" },
  { id: "mdn", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", group: "control", what: "documentation" },
  { id: "github-repo", url: "https://github.com/vercel/next.js", group: "control", what: "repository page" },
  { id: "godbolt", url: "https://godbolt.org", group: "control", what: "editor" },
  { id: "guardian", url: "https://www.theguardian.com/international", group: "control", what: "news front" },
];
