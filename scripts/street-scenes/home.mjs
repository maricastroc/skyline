import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "docs/screenshots/home-scrim/before";
mkdirSync(OUT, { recursive: true });
const SIZES = { desktop: [1440, 900], laptop: [1280, 720], phone: [390, 844] };
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const [name, [w, h]] of Object.entries(SIZES))
  for (const bare of [false, true]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/pixel`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('canvas') && !!document.querySelector('.sk-hero')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 9000));
    if (bare) await page.addStyleTag({ content: ".sk-ask, .sk-top { visibility: hidden !important; }" });
    await new Promise((r) => setTimeout(r, 300));
    const box = await page.evaluate(() => {
      const r = document.querySelector(".sk-ask").getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
    await page.screenshot({ path: `${OUT}/${name}${bare ? "-bare" : ""}.png` });
    if (!bare) console.log(name, JSON.stringify(box.map((v) => Math.round(v))));
    await page.close();
  }
await browser.close();
