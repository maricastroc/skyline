// Detail-kit prototype captures (1440×900 @2x): views × time × people.
//   node scripts/kit.mjs [name=query …]     e.g. node scripts/kit.mjs street=view=street
// Without arguments, shoots the full set used in docs/PIXEL_KIT.md.
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots/kit)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const OUT = (process.env.OUT ?? "docs/screenshots/kit").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const ROUTE = process.env.ROUTE ?? "/pixel/kit"; // e.g. /pixel/surface-lab
const DEFAULT = [
  // The prototype views (default profile).
  ["kit-city-day", "view=city"],
  ["kit-street-day", "view=street"],
  ["kit-close-day", "view=close"],
  ["kit-city-night", "view=city&time=night"],
  ["kit-street-night", "view=street&time=night"],
  // Before (frozen first kit) at the same views.
  ["v1-city-day", "view=city&v=1"],
  ["v1-close-day", "view=close&v=1"],
  // Silhouette test: same colour, no patterns, no signs or people.
  ["v1-city-flat", "view=city&v=1&flat=1"],
  ["kit-city-flat", "view=city&flat=1"],
  // Four structurally different page profiles, same kit and camera.
  ["profile-portal", "view=city&profile=portal"],
  ["profile-product", "view=city&profile=product"],
  ["profile-reference", "view=city&profile=reference"],
  ["profile-portal-flat", "view=city&profile=portal&flat=1"],
  ["profile-product-flat", "view=city&profile=product&flat=1"],
  ["profile-reference-flat", "view=city&profile=reference&flat=1"],
];
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const shots = args.length ? args.map((a) => a.split(/=(.*)/s).slice(0, 2)) : DEFAULT;
const CURRENT = process.argv.includes("--current");

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const [name, query] of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(`${BASE}${ROUTE}?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000)); // camera glide + build-up
  // Rough frame rate of the prototype at this view (headless GPU; relative, not absolute).
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(Math.round((n * 1000) / (performance.now() - t0))); }; requestAnimationFrame(f); }));
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("shot", name, `~${fps} fps`);
  await page.close();
}

// The current vocabulary at the same camera distances, for comparison (HUD hidden).
if (CURRENT)
  for (const [name, url, at] of [
    ["current-wikipedia", "https://en.wikipedia.org/wiki/Brutalist_architecture", "history"],
    ["current-linear", "https://linear.app", "showcase"],
  ]) {
    for (const [view, q] of [["city", ""], ["street", `&at=${at}`]]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      await page.goto(`${BASE}/pixel?url=${encodeURIComponent(url)}&cv=bare${q}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(`["city","explore"].includes(document.querySelector('.sk')?.dataset.phase)`, { timeout: 120000 });
      await new Promise((r) => setTimeout(r, 3500));
      await page.keyboard.press("h");
      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({ path: `${OUT}${name}-${view}.png` });
      console.log("shot", `${name}-${view}`);
      await page.close();
    }
  }
await browser.close();
