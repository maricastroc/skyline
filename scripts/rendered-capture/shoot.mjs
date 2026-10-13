import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const DIR = "docs/rendered-capture";
const VIEWS = { city: "time=day", close: "time=day&view=close&focus=0,0" };
const views = (process.env.VIEWS ?? "city").split(",");
const ids = process.argv.slice(2);
mkdirSync(`${DIR}/shots`, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const id of ids)
  for (const how of ["static", "rendered"])
    for (const view of views) {
      if (!existsSync(`${DIR}/snapshots/${id}-${how}.json`)) {
        console.log("no snapshot", id, how);
        continue;
      }
      const out = `${DIR}/shots/${id}-${how}${view === "city" ? "" : `-${view}`}.jpg`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      page.on("pageerror", (e) => console.log("[pageerror]", id, how, e.message));
      await page.goto(`${BASE}/pixel/kit?set=rendered-capture&page=${id}-${how}&${VIEWS[view]}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.screenshot({ path: out, type: "jpeg", quality: 82 });
      console.log("shot", out);
      await page.close();
    }
await browser.close();
