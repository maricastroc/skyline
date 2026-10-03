// Framing test: A = island (whole plinth in frame) vs B = world (the city runs past the frame).
// Same pages, same grammar, same camera angle; only composition/camera/scale differ.
//   node scripts/framing.mjs
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots/framing)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const SITES = [
  ["hn", "https://news.ycombinator.com"],
  ["wikipedia", "https://en.wikipedia.org/wiki/Brutalist_architecture"],
  ["linear", "https://linear.app"],
];
const OUT = (process.env.OUT ?? "docs/screenshots/framing").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(path) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('.px-stage canvas')`, { timeout: 120000 });
  return page;
}

for (const [name, url] of SITES) {
  const q = `/pixel?url=${encodeURIComponent(url)}`;
  for (const [tag, path] of [["A-island", `${q}&frame=island`], ["B-world", q]]) {
    const page = await open(path);
    await sleep(8000); // intro glide + build-up + billboard images
    await page.screenshot({ path: `${OUT}${name}-${tag}.png` });
    console.log("shot", `${OUT}${name}-${tag}.png`);
    await page.close();
  }
}

// One continuous move, sampled: City View → approach → street (Linear).
const page = await open(`/pixel?url=${encodeURIComponent("https://linear.app")}`);
await sleep(8000);
await page.click(".px-enter");
for (const [i, t] of [[1, 550], [2, 500], [3, 1600]]) {
  await sleep(t);
  await page.screenshot({ path: `${OUT}descent-${i}.png` });
  console.log("shot", `${OUT}descent-${i}.png`);
}
await browser.close();
