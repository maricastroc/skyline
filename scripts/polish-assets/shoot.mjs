// Visual polish round 2 (rooftop condensers, structured billboards): BEFORE × AFTER captures,
// 1440×900 @2x, seed 7, no overlays. BEFORE = ?v=12 (kit-v12, byte-identical to polishAssets:
// false) drawn by the current renderer; AFTER = the current kit.
//   node scripts/polish-assets/shoot.mjs [before|after …]      Env: BASE, OUT, CASES, FORCE.
// Writes <OUT>/<variant>/<case>.png (default OUT: docs/screenshots/polish-assets).
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = process.env.OUT ?? "docs/screenshots/polish-assets";
const CASES = {
  // rooftop plant
  "pg-city": "page=oldweb&time=day",
  "ikea-city": "page=shop&time=day",
  "pg-street": "page=oldweb&time=day&view=street&focus=0,0",
  "ikea-street": "page=shop&time=day&view=street&focus=0,0",
  "guardian-street": "page=news&time=day&view=street&focus=0,0",
  // billboards (Guardian City also shows its rooftop plant)
  "guardian-city": "page=news&time=day",
  "guardian-night": "page=news&time=night",
  "linear-city": "page=saas&time=day",
  "linear-night": "page=saas&time=night",
  "guardian-blank": "page=news&time=day&view=street&focus=9.5,12&zoom=2.2",
  "guardian-blank-night": "page=news&time=night&view=street&focus=9.5,12&zoom=2.2",
  "guardian-text": "page=news&time=day&view=street&focus=-7.5,2.6&zoom=2.2",
  "guardian-text-night": "page=news&time=night&view=street&focus=-7.5,2.6&zoom=2.2",
  "linear-blank": "page=saas&time=day&view=street&focus=5.9,5.6&zoom=2.2",
  "linear-blank-night": "page=saas&time=night&view=street&focus=5.9,5.6&zoom=2.2",
  "linear-text": "page=saas&time=day&view=street&focus=13,-16.5&zoom=2.2",
  "linear-text-night": "page=saas&time=night&view=street&focus=13,-16.5&zoom=2.2",
};
const VARIANTS = { before: "&v=12", after: "" };
const want = process.argv.slice(2).length ? process.argv.slice(2) : ["before", "after"];
const only = process.env.CASES?.split(",");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const v of want) {
  const dir = `${OUT}/${v}/`;
  mkdirSync(dir, { recursive: true });
  for (const [name, q] of Object.entries(CASES)) {
    if (only && !only.includes(name)) continue;
    const out = `${dir}${name}.png`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", v, name, e.message));
    page.on("console", (m) => m.type() === "error" && console.log("[console]", v, name, m.text().slice(0, 300)));
    await page.goto(`${BASE}/pixel/kit?${q}${VARIANTS[v]}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 180000 });
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: out });
    console.log("shot", v, name);
    await page.close();
  }
}
await browser.close();
console.log("POLISH ASSETS SHOTS DONE");
