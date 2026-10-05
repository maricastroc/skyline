// Visual polish round 2 (placeholder assets), studies: real cases where each defect shows, with
// ?hvacStudy= / ?screenStudy=. The switch exists only with scripts/polish-assets/asset-studies.patch
// applied on commit 55d9303 (git apply); see docs/PIXEL_POLISH_ASSETS.md. "cur" = no switch: the
// current asset (BEFORE).
//   node scripts/polish-assets/shoot-study.mjs <hvac|screen> [variant …]   (default: cur a b c)
// Writes <OUT>/<asset>/<variant>/<case>.png (default OUT: docs/screenshots/polish-assets/studies).
// Env: BASE, OUT, CASES (comma list), FORCE.
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = process.env.OUT ?? "docs/screenshots/polish-assets/studies";
const CASES = {
  hvac: {
    "pg-city": "page=oldweb&time=day",
    "hn-city": "page=hn&time=day",
    "ikea-city": "page=shop&time=day",
    "govuk-city": "page=institution&time=day",
    "hn-street": "page=hn&time=day&view=street&focus=-4.3,4.3&zoom=2.6",
    "pg-street": "page=oldweb&time=day&view=street&focus=0,0",
    "pg-night": "page=oldweb&time=night",
  },
  screen: {
    "guardian-city": "page=news&time=day",
    "linear-city": "page=saas&time=day",
    "guardian-night": "page=news&time=night",
    "linear-night": "page=saas&time=night",
    "guardian-street": "page=news&time=day&view=street&focus=9.5,12&zoom=2.2",
    "linear-street": "page=saas&time=day&view=street&focus=5.9,5.6&zoom=2.2",
    "guardian-street-night": "page=news&time=night&view=street&focus=9.5,12&zoom=2.2",
  },
};
const [asset, ...vs] = process.argv.slice(2);
if (!CASES[asset]) throw new Error("usage: shoot-study.mjs <hvac|screen> [variant …]");
const variants = vs.length ? vs : ["cur", "a", "b", "c"];
const only = process.env.CASES?.split(",");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const v of variants) {
  const dir = `${OUT}/${asset}/${v}/`;
  mkdirSync(dir, { recursive: true });
  for (const [name, q] of Object.entries(CASES[asset])) {
    if (only && !only.includes(name)) continue;
    const out = `${dir}${name}.png`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", v, name, e.message));
    page.on("console", (m) => m.type() === "error" && console.log("[console]", v, name, m.text().slice(0, 300)));
    await page.goto(`${BASE}/pixel/kit?${q}${v === "cur" ? "" : `&${asset}Study=${v}`}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: out });
    console.log("shot", asset, v, name);
    await page.close();
  }
}
await browser.close();
console.log("ASSET STUDY SHOTS DONE");
