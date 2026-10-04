// Art-direction audit captures (1440×900 @2x, same camera, day, seed 7 unless the view says otherwise):
//   node scripts/art-audit/shoot.mjs [view …]
// Views: city · street · flat (massing only) · own (city at the page's own time of day) · wide (city, zoom 0.55)
// Writes docs/screenshots/art-audit/<view>/<page>.png. Env: BASE, CHROME_PATH, PAGES (comma list), FORCE.
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const PAGES = (process.env.PAGES ?? "shop,oldweb,directory,institution,reference,media,saas,docs,reference-2").split(",");
const VIEWS = {
  city: "time=day",
  street: "time=day&view=street&focus=0,0",
  flat: "time=day&flat=1",
  own: "",
  wide: "time=day&view=street&focus=0,0&zoom=0.55",
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : ["city", "street"];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const view of want) {
  const dir = `docs/screenshots/art-audit/${view}/`;
  mkdirSync(dir, { recursive: true });
  for (const id of PAGES) {
    const out = `${dir}${id}.png`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", id, view, e.message));
    await page.goto(`${BASE}/pixel/kit?page=${id}&${VIEWS[view]}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: out });
    console.log("shot", view, id);
    await page.close();
  }
}
await browser.close();
console.log("ART AUDIT SHOTS DONE");
