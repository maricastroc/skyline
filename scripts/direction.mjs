// Art-direction round: real screens of every variant, 1440×900, same cities and camera.
//   node scripts/direction.mjs [only…]   (groups: type inspector home cityview build)
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots/direction)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const OUT = (process.env.OUT ?? "docs/screenshots/direction").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const ONLY = process.argv.slice(2);
const want = (g) => !ONLY.length || ONLY.includes(g);
const LINEAR = "https://linear.app";
const WIKI = "https://en.wikipedia.org/wiki/Brutalist_architecture";
const GUARDIAN = "https://www.theguardian.com/international";
const HN = "https://news.ycombinator.com";
const q = (o) => "/pixel?" + new URLSearchParams(o).toString();

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
  await page.waitForFunction(`!!document.querySelector('.sk canvas')`, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  return page;
}
const phase = (page, p, timeout = 120000) => page.waitForFunction(`document.querySelector('.sk')?.dataset.phase === ${JSON.stringify(p)}`, { timeout });
async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", name);
}

// 1. Typography: same City View (meta), same cities and camera; only data-ui changes.
if (want("type"))
  for (const [site, url] of [["linear", LINEAR], ["wikipedia", WIKI]])
    for (const ui of ["grotesk", "editorial", "bitmap"]) {
      const page = await open(q({ url, ui, cv: "meta" }));
      await phase(page, "city");
      await sleep(1500);
      await shot(page, `type-${ui}-${site}`);
      await page.close();
    }

// 2. Inspector per typography (Linear's landmark).
if (want("inspector"))
  for (const ui of ["grotesk", "editorial", "bitmap"]) {
    const page = await open(q({ url: LINEAR, ui, at: "hero" }));
    await phase(page, "explore");
    await sleep(2600);
    await shot(page, `inspector-${ui}`);
    await page.close();
  }

// 3. Home: refined page / vacant world / blueprint (grotesk).
if (want("home"))
  for (const home of ["refined", "vacant", "blueprint"]) {
    const page = await open(q({ home, ui: "grotesk" }));
    await sleep(4500);
    await shot(page, `home-${home}`);
    await page.close();
  }

// 4. City View: identity + metadata / minimal identity / almost no UI (grotesk).
if (want("cityview"))
  for (const [site, url] of [["linear", LINEAR], ["guardian", GUARDIAN]])
    for (const cv of ["meta", "minimal", "bare"]) {
      const page = await open(q({ url, cv, ui: "grotesk" }));
      await phase(page, "city");
      await sleep(1500);
      await shot(page, `cityview-${cv}-${site}`);
      await page.close();
    }

// 5. Construction, from each world home: click Build and sample the build clock.
if (want("build"))
  for (const [home, site, url] of [["vacant", "linear", LINEAR], ["blueprint", "guardian", GUARDIAN], ["vacant", "hn", HN]]) {
    const page = await open(q({ home, ui: "grotesk" }));
    await sleep(3500);
    await page.type(".sk-field input", url);
    await page.click(".sk-field .sk-primary");
    await page.waitForFunction(`!!document.querySelector('.sk-step .n')`, { timeout: 120000 });
    const at = [0.5, 1.2, 2.2, 3.4, 4.4, 5.6];
    let prev = 0;
    for (const [i, t] of at.entries()) {
      await sleep((t - prev) * 1000);
      prev = t;
      await shot(page, `build-${home}-${site}-${i + 1}`);
    }
    await phase(page, "city");
    await sleep(900);
    await shot(page, `build-${home}-${site}-7`);
    await page.close();
  }

await browser.close();
