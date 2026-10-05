import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const set = process.argv[2] ?? "programs";
const versions = arg("v", "4,5").split(",");
const style = arg("style", "classic");
const time = arg("time", "day");
const zoom = arg("zoom", "1.9");
const dx = Number(arg("dx", "-1.2"));
const dz = Number(arg("dz", "-1.2"));
const tag = arg("tag", "");
const light = arg("light", "");
const OUT = (process.env.OUT ?? "docs/screenshots/surface/lab").replace(/\/?$/, "/");
const BASE = process.env.BASE ?? "http://localhost:3000";
mkdirSync(OUT, { recursive: true });

const LAYOUT = { programs: [7, 14], corners: [7, 14], roofs: [7, 21], styles: [5, 15], sizes: [7, 14], openings: [5, 20] };
const [cols, n] = LAYOUT[set];
const rows = Math.ceil(n / cols);
const cells = arg("cells", "") ? arg("cells", "").split(",").map(Number) : [...Array(n).keys()];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
for (const v of versions)
  for (const i of cells) {
    const x = ((i % cols) - (cols - 1) / 2) * 11 + dx;
    const z = (Math.floor(i / cols) - (rows - 1) / 2) * 11 + dz;
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => console.log("[pageerror]", e.message));
    await page.goto(`${BASE}/pixel/surface-lab?set=${set}&style=${style}&time=${time}&v=${v}&focus=${x},${z}&zoom=${zoom}${light ? `&light=${light}` : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(`!!document.querySelector('.kit-stage canvas')`, { timeout: 120000 });
    await new Promise((r) => setTimeout(r, 4500));
    const name = `${OUT}${set}-${style}${time === "day" ? "" : "-" + time}${light ? "-" + light : ""}${tag ? "-" + tag : ""}-v${v}-${i}.png`;
    await page.screenshot({ path: name, clip: { x: 340, y: 90, width: 760, height: 720 } });
    console.log("shot", name);
    await page.close();
  }
await browser.close();
