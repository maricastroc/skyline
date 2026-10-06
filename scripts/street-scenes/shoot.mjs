import { existsSync, mkdirSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "docs/screenshots/street-scenes/before";
const CAMS = JSON.parse(readFileSync("scripts/street-scenes/cameras.json", "utf8"));
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const [id, cams] of Object.entries(CAMS))
  for (const [name, q] of Object.entries(cams)) {
    if (only.length && !only.includes(id) && !only.includes(name)) continue;
    const out = `${OUT}/${id}-${name}.png`;
    if (existsSync(out) && !process.env.FORCE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", id, name, e.message));
    await page.goto(`${BASE}/pixel/kit?page=${id}&${q}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 7000));
    await page.screenshot({ path: out });
    console.log("shot", id, name);
    await page.close();
  }
await browser.close();
