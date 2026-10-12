import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const [, , arm, expArg, viewArg, ...only] = process.argv;
const BASE = process.env.BASE ?? "http://localhost:3000";
const DIR = `docs/morphology/shots/${arm}`;
mkdirSync(DIR, { recursive: true });
const view = viewArg ?? "city";
const VIEW = process.env.VIEW_QUERY ?? { city: "time=day", flat: "time=day&flat=1", street: "time=day&view=street&focus=0,0" }[view];
const exp = expArg && expArg !== "none" ? `&exp=${expArg}` : "";
const { BENCH } = await Promise.all([import("./dataset.ts"), import("./holdout-set.ts")])
  .then(([d, h]) => ({ BENCH: [...d.BENCH, ...d.EXTRA, ...[...h.HOLDOUT, ...h.HOLDOUT_B].map((x) => ({ id: x.id, set: "pairs" })), ...(process.env.ALSO ?? "").split(",").filter(Boolean).map((id) => ({ id, set: "pairs", extra: true }))] }))
  .catch(async () => {
    const { readFileSync } = await import("node:fs");
    const out = [];
    for (const m of readFileSync("scripts/morphology/dataset.ts", "utf8").matchAll(/(corpus|pair)\("([a-z0-9-]+)"/g)) out.push({ id: m[2], set: m[1] === "corpus" ? "corpus" : "pairs" });
    for (const m of readFileSync("scripts/morphology/holdout-set.ts", "utf8").matchAll(/\bh\("([a-z0-9-]+)"/g)) out.push({ id: m[1], set: "pairs" });
    return { BENCH: out };
  });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const b of BENCH) {
  if (only.length && !only.includes(b.id)) continue;
  if (!only.length && b.extra) continue;
  const out = `${DIR}/${b.id}${view === "city" ? "" : `-${view}`}.jpg`;
  if (existsSync(out) && !process.env.FORCE) continue;
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("[pageerror]", b.id, e.message));
  await page.goto(`${BASE}/pixel/kit?page=${b.id}${b.set === "pairs" ? "&set=rendered-capture" : ""}&${VIEW}${exp}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 5500));
  await page.screenshot({ path: out, type: "jpeg", quality: 82 });
  console.log("shot", out);
  await page.close();
}
await browser.close();
