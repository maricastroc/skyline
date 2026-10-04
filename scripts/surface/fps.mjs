// Approximate frame rate, kit-v4 vs current, same scenes (headless GPU, vsync-capped at ~60:
// only drops are informative). Alternates versions per scene to cancel drift.
//   node scripts/surface/fps.mjs [page …]      Env: BASE, CHROME_PATH
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3000";
const pages = process.argv.slice(2).filter((a) => !a.startsWith("--")).length ? process.argv.slice(2).filter((a) => !a.startsWith("--")) : ["reference", "shop", "institution", "oldweb"];
const BEFORE = process.argv.find((a) => a.startsWith("--before="))?.split("=")[1] ?? "4";
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
// --scale=2 renders a 2880×1800 CSS viewport (4× the fragments) to stress fill rate.
const REPS = Number(process.argv.find((a) => a.startsWith("--reps="))?.split("=")[1] ?? 1);
const SCALE = Number(process.argv.find((a) => a.startsWith("--scale="))?.split("=")[1] ?? 1);
const measure = async (q) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440 * SCALE, height: 900 * SCALE, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/pixel/kit?${q}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, SCALE > 1 ? 15000 : 9000));
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
console.log(`| page | view | fps kit-v${BEFORE} | fps now |`);
console.log("|---|---|---|---|");
for (const id of pages)
  for (const [v, q] of views) {
    // Alternate versions; the median of REPS runs each (fill-rate stress is noisy).
    const A = [];
    const B = [];
    for (let r = 0; r < REPS; r++) {
      A.push(await measure(`page=${id}&v=${BEFORE}&${q}`));
      B.push(await measure(`page=${id}&${q}`));
    }
    const med = (x) => x.sort((m, n) => m - n)[Math.floor(x.length / 2)];
    const a = med(A);
    const b = med(B);
    console.log(`| ${id} | ${v} | ${a.toFixed(0)} | ${b.toFixed(0)} |`);
  }
await browser.close();
