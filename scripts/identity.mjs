// Identity test, picture half: same-angle comparison + City View + landmark inspector per site.
//   node scripts/identity.mjs
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots/semantic)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const SITES = [
  ["wikipedia", "https://en.wikipedia.org/wiki/Brutalist_architecture", "references"],
  ["hn", "https://news.ycombinator.com", "feed"],
  ["linear", "https://linear.app", "showcase"],
];
const OUT = (process.env.OUT ?? "docs/screenshots/semantic").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const ONLY = process.env.ONLY?.split(",");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(path, w, h, file, ready, settle = 7000) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("[page]", m.text().slice(0, 300)));
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(ready, { timeout: 120000 });
  await sleep(settle); // build-up animation, billboard images, camera glide
  await page.screenshot({ path: `${OUT}${file}` });
  console.log("shot", `${OUT}${file}`);
  await page.close();
}

const want = (k) => !ONLY || ONLY.includes(k);
const qs = SITES.map(([, u]) => `u=${encodeURIComponent(u)}`).join("&");
const panelsReady = `document.querySelectorAll('.px-panel[data-ready="1"]').length === ${SITES.length}`;
if (want("compare")) {
  await shoot(`/pixel/compare?${qs}&az=45`, 2400, 900, "compare.png", panelsReady);
  await shoot(`/pixel/compare?${qs}&az=45&reveal=1`, 2400, 900, "compare-revealed.png", panelsReady);
}
const stageReady = `!!document.querySelector('.px-stage canvas')`;
for (const [name, url, district] of SITES) {
  if (!want(name)) continue;
  const q = `/pixel?url=${encodeURIComponent(url)}`;
  await shoot(q, 1440, 900, `${name}-city.png`, stageReady);
  await shoot(`${q}&at=entrance`, 1440, 900, `${name}-landmark.png`, stageReady);
  await shoot(`${q}&at=${district}`, 1440, 900, `${name}-${district}.png`, stageReady);
}
await browser.close();
