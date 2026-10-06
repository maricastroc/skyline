import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "docs/screenshots/hover/before";
mkdirSync(OUT, { recursive: true });
const CITIES = { hn: "https://news.ycombinator.com", news: "https://www.theguardian.com/international", apple: "https://www.apple.com" };
const POINTS = [[760, 470], [980, 560]];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const [id, url] of Object.entries(CITIES)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/pixel?url=${encodeURIComponent(url)}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('canvas')`, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 12000));
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 6000));
  const btn = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /new city/i.test(x.textContent ?? ""));
    const r = b ? b.getBoundingClientRect() : null;
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : [720, 20];
  });
  await page.mouse.move(btn[0], btn[1]);
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${OUT}/${id}-idle.png` });
  for (const [k, [x, y]] of POINTS.entries()) {
    await page.mouse.move(x, y, { steps: 4 });
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: `${OUT}/${id}-hover${k}.png` });
  }
  console.log("shot", id);
  await page.close();
}
await browser.close();
