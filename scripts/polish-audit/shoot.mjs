// Visual polish audit (round 0): captures of the current kit (= kit-v12), 1440×900 @2x, seed 7, no debug overlays.
//   node scripts/polish-audit/shoot.mjs
// Views: city (day) · night · street (focus 0,0) · wide (street at zoom 0.55) · close.
// Writes docs/screenshots/polish-audit/<view>/<page>.png. Env: BASE, CHROME_PATH, PAGES, VIEWS, FORCE.
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const PAGES = (process.env.PAGES ?? "hn,reference,saas,news,shop,oldweb,media,institution").split(",");
const VIEWS = {
  city: "time=day",
  night: "time=night",
  street: "time=day&view=street&focus=0,0",
  wide: "time=day&view=street&focus=0,0&zoom=0.55",
  close: "time=day&view=close",
};
const views = (process.env.VIEWS ?? "city,street,night,wide").split(",");
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const view of views) {
  const dir = `docs/screenshots/polish-audit/${view}/`;
  mkdirSync(dir, { recursive: true });
  for (const id of PAGES) {
    const out = `${dir}${id}.png`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", view, id, e.message));
    await page.goto(`${BASE}/pixel/kit?page=${id}&${VIEWS[view]}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 6000));
    await page.screenshot({ path: out });
    console.log("shot", view, id);
    await page.close();
  }
}
await browser.close();
console.log("POLISH AUDIT SHOTS DONE");
