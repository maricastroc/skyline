import type { NodeRole } from "./types";

const ARIA: Record<string, NodeRole> = {
  banner: "header",
  navigation: "nav",
  menubar: "nav",
  tablist: "nav",
  main: "main",
  contentinfo: "footer",
  complementary: "aside",
  region: "section",
  dialog: "section",
  article: "article",
  form: "form",
  search: "form",
  button: "button",
  link: "link",
  img: "image",
  heading: "heading",
  list: "list",
  table: "table",
  grid: "table",
  textbox: "control",
  searchbox: "control",
  combobox: "control",
  checkbox: "control",
  radio: "control",
  switch: "control",
  slider: "control",
};

const TAGS: Record<string, NodeRole> = {
  body: "root",
  main: "main",
  nav: "nav",
  aside: "aside",
  section: "section",
  article: "article",
  form: "form",
  ul: "list",
  ol: "list",
  dl: "list",
  menu: "list",
  table: "table",
  li: "item",
  dt: "item",
  dd: "item",
  td: "item",
  th: "item",
  p: "text",
  blockquote: "text",
  pre: "text",
  figcaption: "text",
  caption: "text",
  address: "text",
  legend: "text",
  summary: "text",
  img: "image",
  picture: "image",
  video: "media",
  iframe: "media",
  canvas: "media",
  audio: "media",
  object: "media",
  embed: "media",
  svg: "icon",
  math: "inline",
  a: "link",
  button: "button",
  select: "control",
  textarea: "control",
};

const INLINE = new Set([
  "span", "strong", "em", "b", "i", "u", "s", "small", "mark", "abbr", "cite", "q", "sub", "sup", "time",
  "code", "kbd", "samp", "var", "data", "font", "bdi", "bdo", "ruby", "rt", "rp", "del", "ins", "label",
  "output", "meter", "progress", "big", "tt", "strike", "nobr", "acronym", "dfn",
]);

export interface ClassifyInput {
  tag: string;
  id?: string;
  classes?: string[];
  role?: string;
  type?: string;
  depth: number;
  insideContent: boolean;
}

export function classify(n: ClassifyInput): NodeRole {
  const aria = n.role?.split(/\s+/)[0]?.toLowerCase();
  if (aria && ARIA[aria]) {
    const r = ARIA[aria];
    if ((r === "header" || r === "footer") && n.insideContent) return "container";
    return r;
  }

  const tag = n.tag;
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "header" || tag === "footer") return n.insideContent ? "container" : tag;
  if (tag === "input") {
    const t = (n.type ?? "text").toLowerCase();
    return t === "submit" || t === "button" || t === "reset" || t === "image" ? "button" : "control";
  }
  const direct = TAGS[tag];
  if (direct) return direct;
  if (INLINE.has(tag)) return "inline";

  const names = `${n.id ?? ""} ${(n.classes ?? []).slice(0, 3).join(" ")}`.toLowerCase();
  if (names.trim()) {
    if (n.depth <= 6 && !n.insideContent) {
      if (/(^|[\s_-])(header|masthead|topbar|top-bar|navbar|site-head|pagetop)([\s_-]|$)/.test(names)) return "header";
      if (/(^|[\s_-])(footer|site-foot|colophon)([\s_-]|$)/.test(names)) return "footer";
      if (/(^|[\s_-])(sidebar|aside|side-bar)([\s_-]|$)/.test(names)) return "aside";
      if (/(^|\s)(main|content|main-content|maincontent|page-content|bodycontent|mw-body)(\s|$)/.test(names)) return "main";
    }
    if (n.depth <= 8 && /(^|[\s_-])(nav|navigation|menu|breadcrumbs?)([\s_-]|$)/.test(names)) return "nav";
    if (/(^|[\s_-])(card|tile|post|teaser|story|product|entry)([\s_-]|$)/.test(names)) return "article";
    if (/(^|[\s_-])(section|band|panel|module)([\s_-]|$)/.test(names)) return "section";
  }
  return "container";
}

export const STRUCTURAL: ReadonlySet<NodeRole> = new Set([
  "root", "header", "nav", "main", "footer", "aside", "section", "article", "form",
]);

export const TEXT_BEARING: ReadonlySet<NodeRole> = new Set(["text", "heading", "item", "button", "control"]);
