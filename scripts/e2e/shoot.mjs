import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PAGES = (process.env.PAGES ?? "reference,docs,app,saas,shop,news,portfolio,forum,institution,oldweb,media,directory,reference-2,saas-2").split(",");
const VIEWS = { city: "time=day", street: "time=day&view=street&focus=0,0", close: "time=day&view=close&focus=9.4,0", flat: "time=day&flat=1" };
const VARIANTS = {
  normal: { q: "", views: ["city", "street", "close", "flat"] },
  seed8: { q: "&seed=8", views: ["city", "street", "close"] },
  classic: { q: "&style=classic", views: ["city", "street", "close"] },
  modern: { q: "&style=modern", views: ["city", "street", "close"] },
  v5: { q: "&v=5", views: ["street", "close"] },
  v4: { q: "&v=4", views: ["city", "street", "close"] },
};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VARIANTS);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const name of want) {
  const v = VARIANTS[name];
  const dir = `docs/screenshots/e2e/${name}/`;
  mkdirSync(dir, { recursive: true });
  for (const id of PAGES)
    for (const view of v.views) {
      const out = `${dir}${id}-${view}.png`;
      if (existsSync(out) && !process.env.FORCE) continue;
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      page.on("pageerror", (e) => console.log("[pageerror]", id, view, e.message));
      await page.goto(`${BASE}/pixel/kit?page=${id}&${VIEWS[view]}${v.q}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.screenshot({ path: out });
      console.log("shot", name, id, view);
      await page.close();
    }
}
await browser.close();
console.log("E2E SHOTS DONE");
