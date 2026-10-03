// Screenshot harness: drives a locally installed Chrome against a running dev server.
//   npm run shoot -- <site-url> <prefix> [scenes...]
// Scenes: landing intro entrance aerial street inspect destroy orbit (default: most of them)
// Env: BASE (default http://localhost:3000), CHROME_PATH, OUT (default docs/screenshots), Q (quality tier 0-4)
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const [, , site, prefix, ...scenesArg] = process.argv;
const scenes = scenesArg.length ? scenesArg : ["intro", "entrance", "aerial", "street", "inspect", "destroy"];
const OUT = (process.env.OUT ?? "docs/screenshots").replace(/\/?$/, "/");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type()) && !/DevTools|deprecated|PCFSoft/.test(m.text())) console.log("[page]", m.type(), m.text().slice(0, 300));
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  const path = `${OUT}${prefix}-${name}.png`;
  await page.screenshot({ path });
  console.log("shot", path);
};
const sk = (fn, ...args) => page.evaluate(fn, ...args);

const t0 = Date.now();
await page.goto(`${BASE}/maquette?url=${encodeURIComponent(site)}&q=${process.env.Q ?? 4}`, { waitUntil: "domcontentloaded" });
if (scenes.includes("landing")) {
  await sleep(600);
  await shot("landing");
}
const err = await page
  .waitForFunction(() => window.__skyline || document.querySelector(".capture-error"), { timeout: 90000 })
  .then(() => page.evaluate(() => document.querySelector(".capture-error")?.innerText ?? null));
if (err) {
  console.log("CAPTURE ERROR:", err.replace(/\n/g, " | "));
  await shot("error");
  await browser.close();
  process.exit(0);
}
console.log("city ready in", Date.now() - t0, "ms");
const info = await sk(() => {
  const r = window.__skyline.runtime;
  return { nodes: r.doc.nodes.length, structures: r.city.structures.length, size: r.city.size, maxH: r.city.maxHeight, images: r.city.images.length, entrance: r.city.entrance };
});
console.log(JSON.stringify(info));

if (scenes.includes("intro")) {
  await sleep(2200);
  await shot("intro");
}
await sk(() => window.__skyline.skipIntro());
await sleep(4200); // let the build finish and billboards load

const span = Math.max(info.size.w, info.size.d);
const front = info.size.d / 2;

if (scenes.includes("entrance")) {
  await page.mouse.move(120, 120); // over a HUD panel: no hover
  await shot("entrance");
}
if (scenes.includes("aerial")) {
  await sk((s) => window.__skyline.setView([s.span * 0.55, s.span * 0.62, s.front + s.span * 0.45], [0, 0, -s.span * 0.05]), { span, front });
  await sleep(900);
  await shot("aerial");
}
const pickNodes = await sk(() => {
  const r = window.__skyline.runtime;
  const nodes = r.doc.nodes;
  const total = nodes[0].weight;
  const blocks = nodes.filter((n) => (n.role === "section" || n.role === "article" || n.role === "container" || n.role === "list") && n.children.length >= 3 && n.weight < total * 0.25 && n.weight > total * 0.015);
  const byImages = [...blocks].sort((a, b) => b.images - a.images || b.weight - a.weight);
  const byWeight = [...blocks].sort((a, b) => b.weight - a.weight);
  const h1 = nodes.find((n) => n.heading === 1);
  return { gallery: byImages[0]?.id ?? 1, heavy: byWeight.find((n) => n.id !== byImages[0]?.id)?.id ?? byWeight[0]?.id ?? 1, h1: h1?.id ?? null };
});
console.log("targets", JSON.stringify(pickNodes));

const frame = async (id, k = 1, lift = 1) =>
  sk(
    ({ id, k, lift }) => {
      const s = window.__skyline;
      const b = s.runtime.city.bounds[id];
      const c = [(b.min[0] + b.max[0]) / 2, b.min[1] + (b.max[1] - b.min[1]) * 0.3, (b.min[2] + b.max[2]) / 2];
      const r = Math.max(6, Math.hypot(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2) * k;
      s.setView([c[0] - r * 0.7, c[1] + r * 0.75 * lift + 5, c[2] + r * 1.35 + 5], c);
    },
    { id, k, lift },
  );

const hoverNode = async (id) => {
  // Aim at a leaf inside the target (a container's own anchor is often covered by its children).
  const p = await sk((id) => {
    const s = window.__skyline;
    const nodes = s.runtime.doc.nodes;
    const n = nodes[id];
    const leaves = [];
    for (let i = id + 1; i < n.end; i++) if (!nodes[i].children.length) leaves.push(i);
    const leaf = leaves[Math.floor(leaves.length / 2)] ?? id;
    return s.project(leaf);
  }, id);
  await page.mouse.move(p.x, p.y);
  await sleep(250);
  // Climb from whatever leaf is under the cursor to the target, with the real scroll wheel.
  const climb = await sk((id) => {
    const s = window.__skyline;
    const h = s.state().hover;
    if (!h) return -1;
    const nodes = s.runtime.doc.nodes;
    if (h.hit < id || h.hit >= nodes[id].end) return -1;
    return nodes[h.hit].level - nodes[id].level;
  }, id);
  for (let i = 0; i < climb; i++) {
    await page.mouse.wheel({ deltaY: -120 });
    await sleep(60);
  }
  await sleep(250);
  return sk(() => window.__skyline.state().hover);
};

if (scenes.includes("street")) {
  await sk(
    ({ g, h1 }) => {
      const s = window.__skyline;
      const b = s.runtime.city.bounds[g];
      const c = [(b.min[0] + b.max[0]) / 2, b.min[1], (b.min[2] + b.max[2]) / 2];
      const t = h1 !== null ? s.runtime.city.anchor[h1] : [c[0], c[1] + 10, c[2] - 30];
      s.setView([c[0] + 3, b.max[1] + 4, b.max[2] + 6], [t[0], t[1] * 0.6, t[2]]);
    },
    { g: pickNodes.gallery, h1: pickNodes.h1 },
  );
  await page.mouse.move(120, 120);
  await sleep(900);
  await shot("street");
}
if (scenes.includes("inspect")) {
  await sk((id) => window.__skyline.select(id), pickNodes.gallery);
  await frame(pickNodes.gallery, 1.05);
  await sleep(900);
  const h = await hoverNode(pickNodes.gallery);
  console.log("inspect hover", JSON.stringify(h));
  await shot("inspect");
}
if (scenes.includes("destroy")) {
  const id = pickNodes.heavy;
  await sk(() => window.__skyline.select(null));
  await frame(id, 1.2, 1.1);
  await sleep(700);
  await page.keyboard.press("Digit2");
  const h = await hoverNode(id);
  console.log("destroy hover", JSON.stringify(h), "target", id);
  await shot("destroy-preview");
  await sk((id) => window.__skyline.destroy(id), h?.node ?? id);
  await sleep(700);
  await shot("destroy-collapse");
  await sleep(3500);
  await shot("destroy-after");
}
if (scenes.includes("orbit")) {
  await page.mouse.move(120, 120);
  await sk(() => window.__skyline.state().set({ hudHidden: true }));
  await sk(() => window.__skyline.orbit(true));
  await sleep(2500);
  await shot("orbit");
}
const bench = await sk(() => window.__skyline.bench(40));
console.log("bench", JSON.stringify(bench));
await browser.close();
