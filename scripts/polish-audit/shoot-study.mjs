// Visual polish audit (round 0), haze studies: the same captures as shoot.mjs with ?hazeStudy=<a|b|c>.
// The switch exists only with scripts/polish-audit/haze-studies.patch applied on commit debceb0
// (the haze code changed in round 1); see docs/PIXEL_POLISH_AUDIT.md.
//   node scripts/polish-audit/shoot-study.mjs a b c      Env: BASE, PAGES, VIEWS, OUT, FORCE.
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = process.env.OUT ?? "docs/screenshots/polish-audit/studies";
const PAGES = (process.env.PAGES ?? "hn,reference,saas,news,shop,oldweb,media,institution").split(",");
const VIEWS = { city: "time=day", night: "time=night" };
const views = (process.env.VIEWS ?? "city").split(",");
const want = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const v of want)
  for (const view of views) {
    const dir = `${OUT}/${v}/${view}/`;
    mkdirSync(dir, { recursive: true });
    for (const id of PAGES) {
      const out = `${dir}${id}.png`;
      if (existsSync(out) && !process.env.FORCE) continue;
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      page.on("pageerror", (e) => console.log("[pageerror]", v, view, id, e.message));
      page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text().slice(0, 300)));
      await page.goto(`${BASE}/pixel/kit?page=${id}&${VIEWS[view]}&hazeStudy=${v}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.screenshot({ path: out });
      console.log("shot", v, view, id);
      await page.close();
    }
  }
await browser.close();
console.log("STUDY SHOTS DONE");
