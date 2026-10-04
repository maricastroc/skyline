// C4 atmosphere, BEFORE (kit-v11, C3) × AFTER (current) captures, 1440×900 @2x, day, seed 7, same camera:
//   node scripts/atmosphere/shoot.mjs [variant …]   variants: before · after · seed8 (after, seed 8)
// Views: city · street · wide (street view at zoom 0.55: the whole district). Writes
// docs/screenshots/atmosphere/<variant>/<view>/<page>.png. Env: BASE, CHROME_PATH, PAGES, VIEWS, FORCE.
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const PAGES = (process.env.PAGES ?? "shop,oldweb,directory,institution,reference,media,saas,docs,reference-2").split(",");
const VIEWS = { city: "time=day", night: "time=night", street: "time=day&view=street&focus=0,0", own: "", wide: "time=day&view=street&focus=0,0&zoom=0.55" };
const VARIANTS = { before: "&v=11", after: "", seed8: "&seed=8" };
const views = (process.env.VIEWS ?? "city,night,street").split(",");
const want = process.argv.slice(2).length ? process.argv.slice(2) : ["before", "after"];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const variant of want)
  for (const view of views) {
    const dir = `docs/screenshots/atmosphere/${variant}/${view}/`;
    mkdirSync(dir, { recursive: true });
    for (const id of PAGES) {
      const out = `${dir}${id}.png`;
      if (existsSync(out) && !process.env.FORCE) continue;
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      page.on("pageerror", (e) => console.log("[pageerror]", variant, view, id, e.message));
      await page.goto(`${BASE}/pixel/kit?page=${id}&${VIEWS[view]}${VARIANTS[variant]}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.screenshot({ path: out });
      console.log("shot", variant, view, id);
      await page.close();
    }
  }
await browser.close();
console.log("ATMOSPHERE SHOTS DONE");
