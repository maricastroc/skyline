// Side-by-side test: N cities, same camera, domains hidden.
//   node scripts/compare.mjs <out-prefix> <url> <url> <url> [--reveal] [--az=45] [--single]
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots/pixel)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const prefix = args.shift();
const urls = args.filter((a) => !a.startsWith("--"));
const reveal = args.includes("--reveal");
const single = args.includes("--single");
const az = args.find((a) => a.startsWith("--az="))?.slice(5) ?? "45";
const OUT = (process.env.OUT ?? "docs/screenshots/pixel").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(path, w, h, file, readySel) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("[page]", m.text().slice(0, 300)));
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(readySel, { timeout: 120000 });
  await sleep(5200); // build-up animation + billboard images
  await page.screenshot({ path: `${OUT}${file}` });
  console.log("shot", `${OUT}${file}`);
  await page.close();
}

const qs = urls.map((u) => `u=${encodeURIComponent(u)}`).join("&");
await shoot(
  `/pixel/compare?${qs}&az=${az}${reveal ? "&reveal=1" : ""}`,
  2400,
  Number(process.env.H ?? 680),
  `${prefix}-compare${reveal ? "-revealed" : ""}.png`,
  `document.querySelectorAll('.px-panel[data-ready="1"]').length === ${urls.length}`,
);
if (single) {
  for (const [i, u] of urls.entries()) {
    await shoot(`/pixel?url=${encodeURIComponent(u)}`, 1440, 900, `${prefix}-${String.fromCharCode(97 + i)}.png`, `!!document.querySelector('canvas')`);
  }
}
await browser.close();
