import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const PAGES = (process.env.PAGES ?? "shop,oldweb,directory,institution,reference,media,saas,docs,reference-2").split(",");
const VIEWS = { city: "time=day", street: "time=day&view=street&focus=0,0", wide: "time=day&view=street&focus=0,0&zoom=0.55" };
const VARIANTS = { before: "&v=10", after: "", seed8: "&seed=8" };
const views = (process.env.VIEWS ?? "city,street,wide").split(",");
const want = process.argv.slice(2).length ? process.argv.slice(2) : ["before", "after"];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const variant of want)
  for (const view of views) {
    const dir = `docs/screenshots/street-life/${variant}/${view}/`;
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
console.log("STREET LIFE SHOTS DONE");
