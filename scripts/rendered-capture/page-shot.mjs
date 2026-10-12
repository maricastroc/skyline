import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const DIR = "docs/rendered-capture/shots";
mkdirSync(DIR, { recursive: true });
const UA = process.env.SKYLINE_USER_AGENT ?? "Mozilla/5.0 (compatible; SkylineDOM/0.1; renders public pages as 3D cities)";
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--disable-quic", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "--mute-audio"],
});
for (const arg of process.argv.slice(2)) {
  const [id, url] = [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)];
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1440, height: 900 });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 9000 }).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${DIR}/${id}-page.jpg`, type: "jpeg", quality: 78 });
    console.log("shot", `${DIR}/${id}-page.jpg`);
  } catch (e) {
    console.log("failed", id, String(e).slice(0, 100));
  }
  await context.close();
}
await browser.close();
