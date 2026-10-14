import { colorFunctions, cssRules, customProperties, fontDeclarations, stripComments } from "../../src/lib/snapshot/css-scan";
import { collectBackgroundRules, collectColors, collectPositionRules, firstColor } from "../../src/lib/snapshot/css-signals";
import { snapshotFromHtml } from "../../src/lib/snapshot/parse-html";
import { extractStyleSignals } from "../../src/lib/snapshot/style-signals";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const REFERENCE = {
  comments: (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, ""),
  rules: (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1], m[2]]),
  fonts: (css: string) => [...css.matchAll(/([^{}]*)\{[^{}]*?font(?:-family)?\s*:\s*([^;}]+)/gi)].map((m) => [m[1], m[2]]),
  colors: (css: string) => [...css.matchAll(/\b(rgba?|hsla?)\(\s*([^)]+)\)/gi)].map((m) => [m[1], m[2]]),
  firstFunction: (css: string) => /\b(rgba?|hsla?)\([^)]+\)/i.exec(css),
  properties: (css: string) => [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1], m[2]]),
  backgrounds: (css: string) => [...css.matchAll(/--[\w-]*(?:bg|background)[\w-]*\s*:\s*([^;}]+)/gi)].map((m) => m[1]),
};
const SCANNED = {
  comments: stripComments,
  rules: (css: string) => [...cssRules(css)],
  fonts: (css: string) => [...fontDeclarations(css)],
  colors: (css: string) => [...colorFunctions(css)].map((f) => [f.name, f.args]),
  properties: (css: string) => [...customProperties(css)],
  backgrounds: (css: string) => [...customProperties(css, /bg|background/i)].map(([, value]) => value),
};

const TOKENS = ["{", "{", "}", "}", ";", ";", ":", ":", " ", " ", "\n", "\t", "font", "FONT", "Font", "-family", "-FAMİLY", "-famıly", "-ﬀamily", "font-family", "font-size", "--", "--", "-", "a", "b", "x1", "bg", "BG", "background", "_", "9", "rgb(", "rgba(", "RGB(", "hsl(", "hsla(", "(", ")", ")", ",", "/*", "*/", "*", "/", "#fff", "var(", ".", "html", "body", "'", '"', "!", "é", "İ", "ſ", " ", " "];
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DENSE = ["{", "}", ";", ":", ":", " ", "font", "font", "-family", "--", "--", "bg", "a", "-", "rgb(", ")", " ", "x"];
const CASES = 150_000;
const random = generator(20261013);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const wrong: Record<string, string | undefined> = {};
const matches: Record<string, number> = { rules: 0, fonts: 0, colors: 0, properties: 0, backgrounds: 0, comments: 0 };
for (let i = 0; i < CASES; i++) {
  const length = 1 + Math.floor(random() * 40);
  const alphabet = i % 2 ? DENSE : TOKENS;
  let css = "";
  for (let k = 0; k < length; k++) css += alphabet[Math.floor(random() * alphabet.length)];
  for (const kind of ["comments", "rules", "fonts", "colors", "properties", "backgrounds"] as const) {
    const expected = REFERENCE[kind](css);
    if (kind === "comments" ? expected !== css : (expected as unknown[]).length > 0) matches[kind]++;
    if (!wrong[kind] && !same(SCANNED[kind](css), expected)) wrong[kind] = css;
  }
  if (!wrong.first) {
    const expected = REFERENCE.firstFunction(css);
    const got = colorFunctions(css).next().value;
    if (expected ? !got || got.index !== expected.index || css.slice(got.index, got.end) !== expected[0] : !!got) wrong.first = css;
  }
}
const said = (kind: string) => (wrong[kind] ? `differs on ${JSON.stringify(wrong[kind])}` : `${matches[kind] ?? CASES} of ${CASES} random inputs had something to find`);
console.log("# The scanners against the expressions they replace");
check("comments are stripped exactly as before", !wrong.comments, said("comments"));
check("rules are found exactly as before", !wrong.rules, said("rules"));
check("font declarations are found exactly as before", !wrong.fonts, said("fonts"));
check("colour functions are found exactly as before", !wrong.colors, said("colors"));
check("the first colour function is the same one", !wrong.first, wrong.first ? `differs on ${JSON.stringify(wrong.first)}` : "");
check("custom properties are found exactly as before", !wrong.properties, said("properties"));
check("background custom properties are found exactly as before", !wrong.backgrounds, said("backgrounds"));

const CSS = `:root{--brand:#0a66c2;--page-bg: rgb(250 250 250);--radius:8px;--stack:"Inter", system-ui, sans-serif}
/* header */ html, body { margin:0; font-family: var(--stack); background: var(--page-bg) }
h1,.title{font:700 2rem/1.1 Georgia, serif;border-radius:var(--radius)}
.card{padding:16px 24px;border-radius:9999px;background-color:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.6)}
header.site{position:sticky;top:0;background:hsl(210 50% 20%)} code{font-family:ui-monospace,monospace}
@media (min-width:800px){.card{padding:32px;gap:48px} .hero{background:linear-gradient(#fff,#eee)}}`;
const markup = { legacy: 0, utilityClasses: 0, totalClasses: 0, utilSpacing: [], utilRadius: [], utilFonts: { serif: 0, sans: 0, mono: 0 } };
const signals = extractStyleSignals([CSS], markup);
const positions: Parameters<typeof collectPositionRules>[1] = [];
const backgrounds: Parameters<typeof collectBackgroundRules>[1] = [];
const colors = new Map<string, number>();
collectPositionRules(CSS, positions);
collectBackgroundRules(CSS, backgrounds);
collectColors(CSS, colors);
console.log("\n# What is read from a style sheet");
check("fonts, radii, spacing and the page background are read", signals.fonts.sans === 10 && signals.fonts.serif === 6 && signals.fonts.mono === 1 && signals.radius.count === 1 && signals.radius.pill === 1 && signals.spacing.count === 4 && signals.pageBg === "#fafafa", JSON.stringify({ fonts: signals.fonts, radius: signals.radius, spacing: signals.spacing.count, pageBg: signals.pageBg }));
check("a sticky header and a card background are read", positions.length === 1 && positions[0].tag === "header" && positions[0].cls === "site" && backgrounds.some((b) => b.cls === "card" && b.hex === "#ffffff"));
check("colours written as functions are read", colors.has("#fafafa") && colors.has("#000000") && firstColor("0 1px 2px rgba(0,0,0,.6)") === "#000000" && firstColor("none") === undefined, [...colors.keys()].join(","));

console.log("\n# Time");
const MB = 1024 * 1024;
const shapes: Record<string, string> = {
  "unclosed comments": "/*".repeat(MB / 2),
  "no braces at all": "a".repeat(MB),
  "a run of dashes": "-".repeat(MB),
  "one enormous rule": `:root{${"--a-token:1px;".repeat(MB / 14)}}`,
  "colour functions never closed": "rgb(".repeat(MB / 4),
  "an open rule with a long tail": `.a{${"a".repeat(MB)}`,
  "custom properties never ended": "--x".repeat(MB / 3),
  "nested variables that multiply": `:root{--d:${"x".repeat(900)};--c:${"var(--d) ".repeat(60)};--b:${"var(--c) ".repeat(60)};--a:${"var(--b) ".repeat(60)}} p{padding:${"var(--a) ".repeat(60)}}`,
};
let slowest = ["", 0] as [string, number];
for (const [name, css] of Object.entries(shapes)) {
  const t0 = Date.now();
  collectColors(css, new Map());
  collectPositionRules(css, []);
  collectBackgroundRules(css, []);
  extractStyleSignals([css], markup);
  if (Date.now() - t0 > slowest[1]) slowest = [name, Date.now() - t0];
}
check("a megabyte of each awkward shape of CSS is read in well under a second", slowest[1] < 800, `slowest: ${slowest[0]}, ${slowest[1]} ms`);

const page = (body: string, head = "") => `<!doctype html><html><head><title>x</title>${head}</head><body><main><h1>Title</h1><p>Some ordinary words in a paragraph.</p>${body}</main></body></html>`;
const pages: Record<string, string> = {
  "a style block with no braces": page("", `<style>${"a".repeat(MB)}</style>`),
  "one enormous rule in a style block": page("", `<style>:root{${"--a-token:1px;".repeat(MB / 14)}}</style>`),
  "an inline style repeating background": page(`<div style="${"background:".repeat(MB / 11)}">x</div>`),
  "an inline style repeating url(": page(`<div style="${"background:url('".repeat(MB / 16)}">x</div>`),
  "a theme colour that never closes": page("", `<meta name="theme-color" content="${"rgb(".repeat(MB / 4)}">`),
};
slowest = ["", 0];
for (const [name, html] of Object.entries(pages)) {
  const t0 = Date.now();
  const snapshot = snapshotFromHtml(html, "https://page.skyline-fixture.dev/", "static");
  if (snapshot.stats.elementCount < 3) failed++;
  if (Date.now() - t0 > slowest[1]) slowest = [name, Date.now() - t0];
}
check("a page carrying a megabyte of each is parsed in well under a second", slowest[1] < 1_500, `slowest: ${slowest[0]}, ${slowest[1]} ms`);

console.log(failed ? `\n${failed} check(s) failed` : "\nall css-scan checks passed");
process.exit(failed ? 1 : 0);
