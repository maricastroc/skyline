// Approximate frame rate, kit-v4 vs current, same scenes (headless GPU, vsync-capped at ~60:
// only drops are informative). Alternates versions per scene to cancel drift.
//   node scripts/surface/fps.mjs [page …]      Env: BASE, CHROME_PATH
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["reference", "shop", "institution", "oldweb"];
const views = [
  ["city", "time=day"],
  ["street", "time=day&view=street&focus=9.4,9.4"],
  ["close", "time=day&view=close&focus=9.4,0"],
  ["night", "time=night&view=street&focus=9.4,9.4"],
];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const measure = async (q) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/pixel/kit?${q}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < 4000) requestAnimationFrame(f);
          else res((n * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(f);
      }),
  );
  await page.close();
  return fps;
};
console.log("| page | view | fps kit-v4 | fps now |");
console.log("|---|---|---|---|");
for (const id of pages)
  for (const [v, q] of views) {
    const a = await measure(`page=${id}&v=4&${q}`);
    const b = await measure(`page=${id}&${q}`);
    console.log(`| ${id} | ${v} | ${a.toFixed(0)} | ${b.toFixed(0)} |`);
  }
await browser.close();
