import { execSync } from "node:child_process";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { isLocalRendererEnabled, localChromePath } from "../../src/lib/acquisition/local-browser";
import { renderPage, type RenderOptions } from "../../src/lib/acquisition/render-page";
import { snapshotFromRendered } from "../../src/lib/acquisition/rendered-capture";
import { normalize } from "../../src/lib/model/normalize";
import { analyzeSemantics } from "../../src/lib/semantics/analyze";
import { captureCaveat } from "../../src/lib/snapshot/caveat";
import { snapshotFromHtml } from "../../src/lib/snapshot/parse-html";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const ORIGIN = "https://app.skyline.invalid";
const HOSTILE = [
  "https://127.0.0.1/admin",
  "https://169.254.169.254/latest/meta-data/",
  "https://10.0.0.5/internal",
  "https://localhost/",
  "https://intranet.corp/payroll",
  "http://plain.skyline.invalid/",
  "https://user:pass@public.skyline.invalid/",
  "https://public.skyline.invalid:8443/",
];
const SCAFFOLD = `<!doctype html><html lang="en"><head><title>Feed</title><style id="rt"></style></head><body><div id="root"></div><noscript>Enable JavaScript.</noscript><script src="/app.js"></script></body></html>`;
const APP_JS = `
  document.getElementById("rt").sheet.insertRule(".post h3 { color: #ff0055 }");
  for (const u of ${JSON.stringify(HOSTILE)}) fetch(u, { mode: "no-cors" }).catch(() => {});
  new Image().src = "https://192.168.0.1/pixel.png";
  setTimeout(() => {
    const root = document.getElementById("root");
    const el = (tag, text, parent, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; parent.appendChild(n); return n; };
    const header = el("header", "", root);
    const nav = el("nav", "", header);
    for (const t of ["Home", "Discover", "Feeds", "Lists", "About"]) el("a", t, nav).setAttribute("href", "/" + t.toLowerCase());
    const main = el("main", "", root);
    el("h1", "Discover", main);
    for (let i = 0; i < 40; i++) {
      const post = el("article", "", main, "post");
      el("h3", "Author number " + i, post);
      el("p", "A post with enough words in it to count as real content on a page that a server never sent, number " + i + ".", post);
      el("a", "Read the thread", post).setAttribute("href", "/post/" + i);
    }
    const footer = el("footer", "", root);
    for (const t of ["Terms", "Privacy", "Status"]) el("a", t, footer).setAttribute("href", "/" + t.toLowerCase());
  }, 250);
`;
const page = (body: string, title = "Page") => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
const FIXTURES: Record<string, ReturnType<NonNullable<RenderOptions["intercept"]>>> = {
  [`${ORIGIN}/`]: { contentType: "text/html", body: SCAFFOLD },
  [`${ORIGIN}/app.js`]: { contentType: "text/javascript", body: APP_JS },
  [`${ORIGIN}/login-wall`]: { contentType: "text/html", body: page(`<form><input type="email"><input type="password"><button>Sign in</button></form>`, "Sign in") },
  [`${ORIGIN}/challenge`]: { contentType: "text/html", body: page(`<p>Checking your browser</p>`, "Just a moment...") },
  [`${ORIGIN}/forbidden`]: { status: 403, contentType: "text/html", body: page("<p>No</p>") },
  [`${ORIGIN}/to-private`]: { status: 302, contentType: "text/html", body: "", headers: { location: "https://127.0.0.1/" } },
  [`${ORIGIN}/waf`]: { status: 202, contentType: "text/html", body: page(`<script>window.awsWafCookieDomainList = ["skyline.invalid"]; setTimeout(() => location.replace("/"), 150)</script>`, "") },
  [`${ORIGIN}/lazy`]: {
    contentType: "text/html",
    body: page(
      `<main><h1>Covers</h1><ul id="l"></ul></main><script>for (let k = 0; k < 6; k++) { const li = document.createElement("li"); const a = document.createElement("span"); a.setAttribute("aria-label", "Cover " + k); li.appendChild(a); li.appendChild(document.createTextNode(" Album number " + k)); document.getElementById("l").appendChild(li); const im = new Image(); if (k % 2) im.crossOrigin = "anonymous"; im.onload = () => { a.style.backgroundImage = "url(https://covers.example.com/" + k + ".jpg)"; }; im.src = "https://covers.example.com/" + k + ".jpg"; }</script>`,
    ),
  },
  [`${ORIGIN}/restless`]: { contentType: "text/html", body: page(`<main id="m"></main><script>setInterval(() => document.getElementById("m").appendChild(document.createElement("p")), 100)</script>`) },
};
const noSandbox = !!process.env.CI;
const seen: string[] = [];
const opts: RenderOptions = {
  intercept: (u) => {
    seen.push(u);
    return FIXTURES[u];
  },
  noSandbox,
};
const browsers = () => Number(execSync("pgrep -f puppeteer_dev_chrome_profile | wc -l || true").toString().trim());
const codeOf = async (work: Promise<unknown>) => {
  try {
    await work;
    return "none";
  } catch (e) {
    return e instanceof CaptureError ? e.code : `unexpected: ${String(e).slice(0, 80)}`;
  }
};

async function main() {
  const env = { ...process.env };
  const gate = (set: Record<string, string | undefined>) => {
    Object.assign(process.env, { SKYLINE_LOCAL_RENDERER: undefined, NODE_ENV: undefined, VERCEL: undefined }, set);
    for (const k of Object.keys(set)) if (set[k] === undefined) delete process.env[k];
    for (const k of ["SKYLINE_LOCAL_RENDERER", "NODE_ENV", "VERCEL"]) if (process.env[k] === "undefined") delete process.env[k];
    const on = isLocalRendererEnabled();
    for (const k of ["SKYLINE_LOCAL_RENDERER", "NODE_ENV", "VERCEL"]) if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
    return on;
  };
  check("the local browser is off unless asked for", !gate({}));
  check("it is off in a production build even when asked for", !gate({ SKYLINE_LOCAL_RENDERER: "1", NODE_ENV: "production" }));
  check("it is off on Vercel even when asked for", !gate({ SKYLINE_LOCAL_RENDERER: "1", VERCEL: "1" }));

  if (!localChromePath()) {
    console.log("– browser checks skipped: no local Chrome (set CHROME_PATH)");
    console.log(failed ? `\n${failed} check(s) failed` : "\nall rendered-capture checks passed (browser part skipped)");
    process.exit(failed ? 1 : 0);
  }
  check("it is on when asked for on a developer machine", gate({ SKYLINE_LOCAL_RENDERER: "1" }));

  const before = browsers();
  const url = new URL(`${ORIGIN}/`);
  const still = snapshotFromHtml(SCAFFOLD, url.toString(), "static");
  const rendered = await renderPage(url, opts);
  const snap = snapshotFromRendered(url, rendered);
  const doc = normalize(snap);
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true });
  const kinds = new Set(sem.regions.map((r) => r.kind));

  check("the HTML the server sent is a scaffold", still.warnings.some((w) => w.code === "spa_shell") && still.stats.elementCount < 10, `${still.stats.elementCount} elements`);
  check("the page a browser assembled is not", !snap.warnings.some((w) => w.code === "spa_shell") && snap.stats.elementCount > 150, `${snap.stats.elementCount} elements`);
  check("it is marked as read in a browser, and says so as a note", snap.source.strategy === "rendered" && captureCaveat(doc)?.kind === "note");
  check("the same parser finds its navigation, its main content and its footer", kinds.has("nav") && (kinds.has("main") || kinds.has("feed")) && kinds.has("footer"), [...kinds].join(","));
  check("the capture waited for the page to settle", rendered.settled === "quiet", `${rendered.durationMs} ms`);
  check("a colour that exists only in the CSSOM reaches the snapshot", snap.styles.colors.some((c) => c.hex.toLowerCase() === "#ff0055"), snap.styles.colors.slice(0, 4).map((c) => c.hex).join(","));

  const hostile = [...HOSTILE, "https://192.168.0.1/pixel.png"];
  const refused = new Set(rendered.refused);
  const left = seen.filter((u) => !FIXTURES[u] && !refused.has(u) && !/^(data|blob|about):/.test(u));
  const stoppedByChrome = hostile.filter((u) => !seen.includes(u));
  check("nothing but the fixtures left the browser", left.length === 0, left.length ? `went out: ${left.join(", ")}` : `${seen.length} requests seen`);
  check(
    "every hostile request that reached the filter was refused by the URL policy",
    hostile.filter((u) => seen.includes(u)).every((u) => refused.has(u)) && refused.size >= 6,
    `${refused.size} refused by the policy, ${stoppedByChrome.length} stopped earlier by Chrome itself (mixed content, credentials in the URL)`,
  );

  check("a page that redirects to a private address is refused", (await codeOf(renderPage(new URL(`${ORIGIN}/to-private`), opts))) === "forbidden_host");
  check("a first address outside the policy is refused", (await codeOf(renderPage(new URL("https://localhost/"), { noSandbox }))) === "forbidden_host");
  const through = async (path: string) => {
    const u = new URL(`${ORIGIN}${path}`);
    return codeOf(renderPage(u, opts).then((r) => snapshotFromRendered(u, r)));
  };
  check("a login wall is still a login wall in a browser (auth_required)", (await through("/login-wall")) === "auth_required");
  check("a bot challenge is still refused, not worked around (blocked)", (await through("/challenge")) === "blocked");
  check("a 403 is still a refusal (blocked)", (await through("/forbidden")) === "blocked");
  check("a JavaScript challenge the browser walked through is refused all the same (blocked)", (await through("/waf")) === "blocked");

  const pictures = (r: Awaited<ReturnType<typeof renderPage>>) => (snapshotFromRendered(new URL(`${ORIGIN}/lazy`), r).root ? (JSON.stringify(snapshotFromRendered(new URL(`${ORIGIN}/lazy`), r).root).match(/"image":"https:\/\/covers/g) ?? []).length : 0);
  const lazyOff = await renderPage(new URL(`${ORIGIN}/lazy`), { ...opts, images: "abort" });
  const lazyOn = await renderPage(new URL(`${ORIGIN}/lazy`), opts);
  check("covers that a script sets only after they load are lost when images are refused", pictures(lazyOff) === 0 && lazyOff.placeholders === 0, `${pictures(lazyOff)} covers`);
  check("answered with a blank image from memory (the default), the same covers reach the snapshot, cross-origin ones included, and nothing is downloaded", pictures(lazyOn) === 6 && lazyOn.placeholders >= 6 && lazyOn.requests < lazyOff.requests, `${pictures(lazyOn)} covers, ${lazyOn.placeholders} answered locally, ${lazyOn.requests} requests against the network budget (${lazyOff.requests} when refused)`);
  const t0 = Date.now();
  const restless = await renderPage(new URL(`${ORIGIN}/restless`), opts);
  check("a page that never stops changing is cut at the cap and still read", restless.settled === "deadline" && Date.now() - t0 < 22_000 && restless.html.includes("<p>"), `${Date.now() - t0} ms`);

  await new Promise((r) => setTimeout(r, 800));
  check("no browser is left running", browsers() <= before, `${browsers()} processes, ${before} before`);

  console.log(failed ? `\n${failed} check(s) failed` : "\nall rendered-capture checks passed");
  process.exit(failed ? 1 : 0);
}
main();
