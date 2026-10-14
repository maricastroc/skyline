import { execSync } from "node:child_process";
import http from "node:http";
import type net from "node:net";
import { createRenderer, type Renderer, type RendererConfig } from "../../renderer/service";
import { acquire, type AcquireSources } from "../../src/lib/acquisition/acquire";
import { networkOf } from "../../src/lib/acquisition/rate-limit";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { localChromePath } from "../../src/lib/acquisition/local-browser";
import type { RenderOptions, RenderedPage } from "../../src/lib/acquisition/render-page";
import { captureRenderedPage, captureWithLocalBrowser, isRendererAvailable, rendererReady } from "../../src/lib/acquisition/rendered-capture";
import { clampViewport, fromWire, MAX_RESPONSE_BYTES, PROTOCOL, signedHeaders, signRequest, toWire, verifyRequest } from "../../src/lib/acquisition/renderer-protocol";
import { normalize } from "../../src/lib/model/normalize";
import { buildKitCity } from "../../src/lib/pixelcity/kit-city";
import { unitsOf } from "../../src/lib/pixelcity/kit/series";
import { snapshotFromHtml } from "../../src/lib/snapshot/parse-html";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const SECRET = "test-secret-".padEnd(48, "s");
const OTHER = "another-secret-".padEnd(48, "o");
const SITE = "https://shop.skyline-fixture.dev";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const logged: string[] = [];
console.error = (...args: unknown[]) => void logged.push(args.map(String).join(" "));

const card = (k: number) => {
  const x = (k % 4) * 230;
  const y = 120 + Math.floor(k / 4) * 260;
  return `<a class="card" href="/item/${k}" data-sk-box="${x} ${y} 210 240 16"><img src="/cover-${k}.png" alt="" data-sk-box="${x} ${y} 210 140 0"><h3 data-sk-box="${x} ${y + 150} 210 24 18">Item number ${k}</h3><p data-sk-box="${x} ${y + 180} 210 40 14">A caption long enough to be a sentence about item ${k}.</p></a>`;
};
const SHELF = `<!doctype html><html><head><title>Shelf</title></head><body data-sk-box="0 0 1440 900 0"><main data-sk-box="0 0 1440 700 16"><h1 data-sk-box="0 20 900 60 32">Shelf</h1><div class="shelf" data-sk-box="0 120 900 500 16">${Array.from({ length: 8 }, (_, k) => card(k)).join("")}</div></main></body></html>`;
const pageOf = (html: string, extra: Partial<RenderedPage> = {}): RenderedPage => ({
  html,
  finalUrl: `${SITE}/`,
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8", "set-cookie": "session=secret", server: "internal-origin/1.2" },
  redirects: [],
  durationMs: 5,
  stylesheets: [],
  injectedCss: [],
  requests: 1,
  refused: [],
  placeholders: 8,
  settled: "quiet",
  layout: { width: 1440, height: 900, viewport: 1440 },
  egress: { connections: 1, refused: 0, bytes: 100 },
  ...extra,
});

const walk = (n: SnapshotNode, f: (n: SnapshotNode) => void) => {
  f(n);
  n.children.forEach((c) => walk(c, f));
};
const boxes = (s: DomSnapshot) => {
  let n = 0;
  walk(s.root, (x) => x.box && n++);
  return n;
};
const codeOf = async (work: Promise<unknown>) => {
  try {
    await work;
    return "none";
  } catch (e) {
    return e instanceof CaptureError ? e.code : `unexpected: ${String(e).slice(0, 80)}`;
  }
};
const errorOf = async (work: Promise<unknown>) => {
  try {
    await work;
    return null;
  } catch (e) {
    return e instanceof CaptureError ? e : new CaptureError("internal", String(e));
  }
};

const open: Array<() => Promise<void>> = [];
async function service(config: Partial<RendererConfig> = {}): Promise<{ base: string; renderer: Renderer; lines: Array<Record<string, unknown>> }> {
  const lines: Array<Record<string, unknown>> = [];
  const renderer = createRenderer({ secret: SECRET, probe: async () => "Chrome/fixture", log: (l) => lines.push(l), ...config });
  const port = await renderer.listen(0, "127.0.0.1");
  open.push(() => renderer.close());
  return { base: `http://127.0.0.1:${port}`, renderer, lines };
}
async function impostor(handler: http.RequestListener): Promise<string> {
  const server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  open.push(
    () =>
      new Promise<void>((r) => {
        server.close(() => r());
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
}
const point = (base: string | undefined, secret: string | undefined = SECRET) => {
  for (const [k, v] of [["SKYLINE_RENDERER_URL", base], ["SKYLINE_RENDERER_SECRET", secret], ["SKYLINE_LOCAL_RENDERER", undefined]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
};
const call = (base: string, method: string, path: string, body = "", headers: Record<string, string> = signedHeaders(SECRET, method, path, body)) =>
  fetch(`${base}${path}`, { method, headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, body: body || undefined }).then(async (res) => ({ status: res.status, text: await res.text(), headers: res.headers }));
const render = (base: string, url: string, client = "c") => call(base, "POST", "/render", JSON.stringify({ url, client }));

async function protocol() {
  console.log("# The signed request");
  const now = 1_800_000_000_000;
  const sig = signRequest(SECRET, now, "POST", "/render", "{}");
  const ok = (over: Partial<{ secret: string; time: unknown; signature: unknown; method: string; path: string; body: string; now: number }> = {}) =>
    verifyRequest(over.secret ?? SECRET, { time: "time" in over ? over.time : String(now), signature: "signature" in over ? over.signature : sig }, over.method ?? "POST", over.path ?? "/render", over.body ?? "{}", over.now ?? now);
  check("a request signed with the shared secret is accepted", ok());
  check("another secret, another body, another path or another method is not", !ok({ secret: OTHER }) && !ok({ body: '{"url":"https://evil.example/"}' }) && !ok({ path: "/health" }) && !ok({ method: "GET" }));
  check("a signature older or newer than the window is not", !ok({ now: now + 91_000 }) && !ok({ now: now - 91_000 }) && ok({ now: now + 60_000 }));
  check("a missing or malformed signature is not", !ok({ signature: undefined }) && !ok({ signature: "" }) && !ok({ signature: sig.slice(2) }) && !ok({ time: "soon" }) && !ok({ time: undefined }));
  check("the viewport is kept within bounds", JSON.stringify(clampViewport({ width: 99_999, height: 1 })) === '{"width":1920,"height":480}' && JSON.stringify(clampViewport("big")) === '{"width":1440,"height":900}');

  const wire = toWire(pageOf(SHELF));
  const back = fromWire(JSON.parse(JSON.stringify(wire)));
  check("a page crosses the wire with its markup, its boxes and its layout untouched", back?.html === SHELF && back.layout?.width === 1440 && back.settled === "quiet");
  check("only the response headers the capture reads are carried", JSON.stringify(Object.keys(wire.headers)) === '["content-type"]');
  const odd = toWire(pageOf(SHELF, { stylesheets: [`data:text/css;base64,${"A".repeat(9_000)}`, "https://cdn.skyline-fixture.dev/site.css", "http://plain.skyline-fixture.dev/x.css"], redirects: [`https://shop.skyline-fixture.dev/?q=${"x".repeat(5_000)}`], injectedCss: Array(2_500).fill("a{color:red}") }));
  check("a page with inline stylesheets, endless addresses or thousands of style sheets still crosses", fromWire(JSON.parse(JSON.stringify(odd)))?.stylesheets.join() === "https://cdn.skyline-fixture.dev/site.css" && odd.redirects.length === 0 && odd.injectedCss.length === 2_000);
  const bad: unknown[] = [null, "page", { ...wire, html: 42 }, { ...wire, html: "x".repeat(4 * 1024 * 1024 + 1) }, { ...wire, status: 9_999 }, { ...wire, layout: { width: "wide", height: 1, viewport: 1 } }, { ...wire, redirects: "no" }, { ...wire, settled: "maybe" }, { ...wire, stylesheets: Array(51).fill("https://a.example/x.css") }, { ...wire, injectedCss: ["x".repeat(1024 * 1024 + 1)] }];
  check("a malformed or oversized page is not accepted", bad.every((b) => fromWire(b) === null));
}

async function theService() {
  console.log("\n# The service");
  let renders = 0;
  const { base, lines } = await service({
    render: async () => {
      renders++;
      return pageOf(SHELF);
    },
  });

  const live = await fetch(`${base}/healthz`).then(async (r) => ({ status: r.status, text: await r.text() }));
  check("it answers that it is up, and nothing else, to anyone", live.status === 200 && live.text === "ok");
  const anon = await call(base, "GET", "/health", "", {});
  const anonRender = await call(base, "POST", "/render", JSON.stringify({ url: `${SITE}/` }), {});
  check("it tells an unsigned caller nothing and renders nothing for it", anon.status === 401 && anonRender.status === 401 && renders === 0 && anon.text === '{"v":1,"error":{"code":"unauthorized"}}', anon.text);
  const wrong = await call(base, "POST", "/render", JSON.stringify({ url: `${SITE}/` }), signedHeaders(OTHER, "POST", "/render", JSON.stringify({ url: `${SITE}/` })));
  const replay = await call(base, "POST", "/render", JSON.stringify({ url: `${SITE}/other` }), signedHeaders(SECRET, "POST", "/render", JSON.stringify({ url: `${SITE}/` })));
  const stale = await call(base, "POST", "/render", JSON.stringify({ url: `${SITE}/` }), signedHeaders(SECRET, "POST", "/render", JSON.stringify({ url: `${SITE}/` }), Date.now() - 10 * 60_000));
  check("a wrong secret, a signature reused for another address and an old signature are refused", wrong.status === 401 && replay.status === 401 && stale.status === 401 && renders === 0);

  const health = await call(base, "GET", "/health");
  const state = JSON.parse(health.text) as Record<string, unknown>;
  check("a signed caller learns that a browser starts there, and how busy it is", health.status === 200 && state.ok === true && state.v === PROTOCOL && state.capacity === 2 && state.active === 0 && state.sandbox === true, health.text);

  const elsewhere = await call(base, "GET", "/admin");
  const put = await call(base, "PUT", "/render", "{}", signedHeaders(SECRET, "PUT", "/render", "{}"));
  check("there is nothing else to call", elsewhere.status === 404 && put.status === 404);
  const garbage = await call(base, "POST", "/render", "{not json");
  const empty = await call(base, "POST", "/render", JSON.stringify({ viewport: {} }));
  const huge = await call(base, "POST", "/render", JSON.stringify({ url: `${SITE}/`, pad: "x".repeat(200_000) }));
  check("a body that is not a request, or is too long, is refused", garbage.status === 400 && empty.status === 400 && huge.status === 413 && renders === 0, `${garbage.status}, ${empty.status}, ${huge.status}`);

  const hostile = ["http://shop.skyline-fixture.dev/", "https://127.0.0.1/", "https://169.254.169.254/latest/meta-data/", "https://localhost/", "https://metadata.google.internal/", "https://user:pw@shop.skyline-fixture.dev/", "https://shop.skyline-fixture.dev:8443/", "file:///etc/passwd", "https://[::1]/"];
  const answers = await Promise.all(hostile.map((u) => render(base, u)));
  check("it applies the address policy itself, whatever the caller already checked", answers.every((a) => a.status === 422 && /"code":"(unsupported_scheme|private_address|forbidden_host|invalid_url)"/.test(a.text)) && renders === 0, answers.map((a) => /"code":"(\w+)"/.exec(a.text)?.[1]).join(","));

  const first = await render(base, `${SITE}/`);
  const page = fromWire((JSON.parse(first.text) as { page: unknown }).page);
  check("it renders a public address and answers with the page", first.status === 200 && page?.html === SHELF && renders === 1);
  const again = await render(base, `${SITE}/`, "someone-else");
  check("the same address asked again within minutes is not rendered twice", again.status === 200 && renders === 1 && lines.some((l) => l.outcome === "cached"));
  check("it logs the host and the outcome of each capture, and never the path or the query", lines.filter((l) => l.event === "render").every((l) => l.host === "shop.skyline-fixture.dev" && !JSON.stringify(l).includes("/item")) && lines.some((l) => l.outcome === "ok" && typeof l.ms === "number"));

  const cjk = `https://ja.skyline-fixture.dev/wiki/${"東".repeat(460)}`;
  const longQuery = `${SITE}/search?q=${"<".repeat(2_000)}`;
  const accepted = await Promise.all([cjk, longQuery].map((u) => render(base, new URL(u).toString(), `long-${u.length}`)));
  const tooLong = await render(base, `${SITE}/${"a".repeat(21_000)}`);
  check("addresses that grow when encoded are still accepted, and only an address past the limit is refused as invalid", accepted.every((a) => a.status === 200) && tooLong.status === 422 && /"code":"invalid_url"/.test(tooLong.text), `${accepted.map((a) => a.status).join(", ")}; ${tooLong.status}`);
}

async function limits() {
  console.log("\n# Limits");
  let running = 0;
  let peak = 0;
  let renders = 0;
  const slow = async (_url: URL, opts: RenderOptions) => {
    renders++;
    peak = Math.max(peak, ++running);
    await new Promise<void>((r) => {
      const t = setTimeout(r, 400);
      opts.signal?.addEventListener("abort", () => {
        clearTimeout(t);
        r();
      });
    });
    running--;
    if (opts.signal?.aborted) throw new CaptureError("timeout", "rendered capture");
    return pageOf(SHELF);
  };
  const { base } = await service({ render: slow, concurrency: 2, queue: 1, queueWaitMs: 2_000, perClient: { capacity: 100, refillPerSec: 0 } });

  const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => render(base, `${SITE}/burst-${i}`, `burst-${i}`)));
  const done = burst.filter((b) => b.status === 200).length;
  const busy = burst.filter((b) => b.status === 503 && b.text === '{"v":1,"error":{"code":"busy"}}');
  check("no more pages are open at once than the service allows", peak === 2, `peak ${peak}`);
  check("one more waits its turn, and the rest are told the browser is busy", done === 3 && busy.length === 3 && busy.every((b) => b.headers.get("retry-after") === "5"), `${done} rendered, ${busy.length} busy`);

  renders = 0;
  const same = await Promise.all(Array.from({ length: 5 }, (_, i) => render(base, `${SITE}/same`, `same-${i}`)));
  check("several people asking for the same page at once share one capture", same.every((s) => s.status === 200) && renders === 1, `${renders} render(s) for 5 requests`);

  const waiting = await service({ render: slow, concurrency: 1, queue: 4, queueWaitMs: 150, perClient: { capacity: 100, refillPerSec: 0 } });
  const impatient = await Promise.all([render(waiting.base, `${SITE}/w1`, "w1"), render(waiting.base, `${SITE}/w2`, "w2")]);
  check("a request does not wait in the queue longer than the service allows", impatient.filter((r) => r.status === 200).length === 1 && impatient.filter((r) => r.status === 503).length === 1);

  const fair = await service({ render: async () => pageOf(SHELF), perClient: { capacity: 2, refillPerSec: 0 } });
  const greedy = [await render(fair.base, `${SITE}/g1`, "greedy"), await render(fair.base, `${SITE}/g2`, "greedy"), await render(fair.base, `${SITE}/g3`, "greedy")];
  const polite = await render(fair.base, `${SITE}/g4`, "polite");
  check("one visitor cannot use the browser without end, and others are not affected", greedy.map((g) => g.status).join() === "200,200,429" && /"code":"rate_limited"/.test(greedy[2].text) && polite.status === 200, greedy.map((g) => g.status).join());

  let rendersOfRetried = 0;
  const flaky = await service({
    render: (_u, opts) =>
      new Promise<RenderedPage>((done, fail) => {
        if (++rendersOfRetried > 1) return done(pageOf(SHELF));
        opts.signal?.addEventListener("abort", () => setTimeout(() => fail(new CaptureError("timeout", "rendered capture")), 1_000));
      }),
  });
  const retryBody = JSON.stringify({ url: `${SITE}/retried`, client: "retrier" });
  const first = http.request(`${flaky.base}/render`, { method: "POST", headers: { "content-type": "application/json", ...signedHeaders(SECRET, "POST", "/render", retryBody) } });
  first.on("error", () => undefined);
  first.end(retryBody);
  await sleep(150);
  first.destroy();
  await sleep(100);
  const again = await render(flaky.base, `${SITE}/retried`, "retrier-2");
  check("asking again right after giving up starts a new capture instead of joining the one being stopped", again.status === 200 && rendersOfRetried === 2, `HTTP ${again.status}, ${rendersOfRetried} render(s)`);

  let aborted = false;
  const patient = await service({
    render: (_u, opts) =>
      new Promise<RenderedPage>((_, reject) => {
        opts.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(new CaptureError("timeout", "rendered capture"));
        });
      }),
  });
  const body = JSON.stringify({ url: `${SITE}/abandoned`, client: "leaver" });
  const leaving = http.request(`${patient.base}/render`, { method: "POST", headers: { "content-type": "application/json", ...signedHeaders(SECRET, "POST", "/render", body) } });
  leaving.on("error", () => undefined);
  leaving.end(body);
  await sleep(200);
  leaving.destroy();
  await sleep(300);
  const after = JSON.parse((await call(patient.base, "GET", "/health")).text) as { active: number };
  check("when the caller goes away, the capture is stopped and its place is freed", aborted && after.active === 0, `aborted ${aborted}, ${after.active} active`);
}

async function theClient() {
  console.log("\n# The application's side");
  const good = await service({ render: async () => pageOf(SHELF) });
  point(good.base);
  check("a renderer that answers the signed health check is reported as ready", isRendererAvailable() && (await rendererReady()) === true);
  const snap = await captureRenderedPage(new URL(`${SITE}/`), { client: "app" });
  const doc = normalize(snap);
  const read = unitsOf(doc, { roots: [0], excluded: [] });
  check("a capture through it is a rendered snapshot built by the application's own parser", snap.source.strategy === "rendered" && snap.source.requestedUrl === `${SITE}/` && snap.stats.elementCount > 30);
  check("the measures arrive: the page size, and a box on every measured element", snap.layout?.width === 1440 && boxes(snap) === snap.stats.elementCount, `${boxes(snap)} boxes on ${snap.stats.elementCount} elements`);
  check("the unit reading works on them: cards, four per row", read?.kind === "card" && read.perRow === 4 && read.units === 8, read ? `${read.units} ${read.kind}, ${read.perRow} per row` : "no series");
  check("and the city is built from it", buildKitCity(doc).structures > 0);

  point(good.base, OTHER);
  check("with the wrong secret the renderer is not ready, and a capture says no browser is available", (await rendererReady()) === false && (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable");
  point(good.base, "short");
  check("without a real secret nothing is sent at all", !isRendererAvailable() && (await rendererReady()) === false && (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable");
  point("http://renderer.skyline-fixture.dev:8080");
  check("a renderer address that is not HTTPS is not used", !isRendererAvailable() && (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable");
  point(undefined, undefined);
  check("with nothing configured there is no renderer", !isRendererAvailable() && (await rendererReady()) === false && (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable");

  const sick = await service({
    render: async () => pageOf(SHELF),
    probe: async () => {
      throw new Error("Failed to launch the browser process: /usr/bin/chromium --no-zygote");
    },
  });
  point(sick.base);
  const sickHealth = await call(sick.base, "GET", "/health");
  check("a service whose browser does not start is not ready, and does not say why to the caller", (await rendererReady()) === false && sickHealth.status === 503 && !sickHealth.text.includes("chromium"), sickHealth.text);

  const parked = await impostor((_req, res) => void res.writeHead(200, { "content-type": "text/html" }).end("<html>parked domain</html>"));
  point(parked);
  check("something else answering at that address is not a renderer", (await rendererReady()) === false && (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable");

  const dead = await impostor(() => undefined);
  await open.pop()!();
  point(dead);
  let t0 = Date.now();
  const refused = await errorOf(captureRenderedPage(new URL(`${SITE}/`)));
  check("a service that is down fails at once", refused?.code === "renderer_unavailable" && Date.now() - t0 < 2_000, `${Date.now() - t0} ms`);
  check("and for a while the automatic capture does not try it again", !isRendererAvailable() && (await rendererReady()) === false);

  const silent = await impostor(() => undefined);
  point(silent);
  t0 = Date.now();
  check("a service that never answers is given up on", (await codeOf(captureRenderedPage(new URL(`${SITE}/`), { timeoutMs: 700 }))) === "renderer_unavailable" && Date.now() - t0 < 3_000, `${Date.now() - t0} ms`);

  const cases: Array<[string, http.RequestListener]> = [
    ["an error page", (_q, r) => void r.writeHead(502, { "content-type": "text/html" }).end("<html>Bad gateway</html>")],
    ["words that are not JSON", (_q, r) => void r.writeHead(200).end("ok")],
    ["another protocol version", (_q, r) => void r.writeHead(200).end(JSON.stringify({ v: 2, page: toWire(pageOf(SHELF)) }))],
    ["a page of the wrong shape", (_q, r) => void r.writeHead(200).end(JSON.stringify({ v: 1, page: { html: 42 } }))],
    ["no page", (_q, r) => void r.writeHead(200).end(JSON.stringify({ v: 1 }))],
    ["a final address inside a private network", (_q, r) => void r.writeHead(200).end(JSON.stringify({ v: 1, page: toWire(pageOf(SHELF, { finalUrl: "https://10.0.0.5/" })) }))],
    ["a redirect elsewhere", (_q, r) => void r.writeHead(307, { location: "https://elsewhere.skyline-fixture.dev/render" }).end()],
    ["an error it does not know", (_q, r) => void r.writeHead(500).end(JSON.stringify({ v: 1, error: { code: "kernel_panic", extra: "at 0xdeadbeef" } }))],
  ];
  const outcomes: string[] = [];
  for (const [name, handler] of cases) {
    point(await impostor(handler));
    const code = await codeOf(captureRenderedPage(new URL(`${SITE}/`), { timeoutMs: 5_000 }));
    if (code !== "renderer_unavailable") outcomes.push(`${name}: ${code}`);
  }
  check("an answer that is not a page is never taken for one", outcomes.length === 0, outcomes.join("; ") || `${cases.length} kinds of bad answer`);

  point(
    await impostor((_q, r) => {
      r.writeHead(200, { "content-type": "application/json" });
      const chunk = Buffer.alloc(1024 * 1024, 97);
      let sent = 0;
      const more = () => {
        while (sent <= MAX_RESPONSE_BYTES / chunk.length + 1) {
          sent++;
          if (!r.write(chunk)) return void r.once("drain", more);
        }
        r.end();
      };
      r.on("error", () => undefined);
      more();
    }),
  );
  check("an answer larger than any page is refused as too large, and the renderer is not taken for broken", (await codeOf(captureRenderedPage(new URL(`${SITE}/`), { timeoutMs: 5_000 }))) === "too_large" && isRendererAvailable());

  const broken = await service({
    render: async () => {
      throw new CaptureError("renderer_unavailable", "the browser did not start: spawn ENOENT");
    },
  });
  point(broken.base);
  check("a browser that does not start is an outage: no browser is available, and the automatic capture stops trying for a while", (await codeOf(captureRenderedPage(new URL(`${SITE}/`)))) === "renderer_unavailable" && !isRendererAvailable());

  const moody = await service({
    render: async (url) => {
      const path = url.pathname.slice(1);
      if (path.startsWith("crash")) throw new Error(`spawn /usr/bin/chromium ENOENT (secret ${SECRET}) at 127.0.0.1:9222 loading https://${url.host}/private/path?token=abc123`);
      throw new CaptureError(path as never, path === "blocked" ? "HTTP 403" : undefined);
    },
    perClient: { capacity: 100, refillPerSec: 0 },
  });
  point(moody.base);
  const passed = ["blocked", "auth_required", "timeout", "too_large", "dns_failed", "tls_error", "too_many_redirects", "private_address", "not_html"];
  const got = await Promise.all(passed.map((c) => codeOf(captureRenderedPage(new URL(`${SITE}/${c}`)))));
  check("what the page did wrong is passed on as it is", got.join() === passed.join(), got.join());
  const crash = await errorOf(captureRenderedPage(new URL(`${SITE}/crash`)));
  const raw = await render(moody.base, `${SITE}/crash-again`);
  const said = JSON.stringify(crash?.toPayload());
  check("a failure the page caused inside the service reaches the visitor as an unexpected failure, with no paths, addresses or secrets", crash?.code === "internal" && raw.text === '{"v":1,"error":{"code":"internal"}}' && !/chromium|127\.0\.0\.1|9222|secret|ENOENT|token/i.test(said), said);
  check("and it does not make the renderer look down", isRendererAvailable());
  const crashLog = JSON.stringify(moody.lines.filter((l) => l.outcome === "internal"));
  check("the service logs where it failed without the path or the query of the page", crashLog.includes("shop.skyline-fixture.dev") && !crashLog.includes("/private/path") && !crashLog.includes("token=abc123"), crashLog.slice(0, 160));
  check("nothing the application logs carries the secret", !logged.join("\n").includes(SECRET) && !logged.join("\n").includes(OTHER) && logged.length > 5, `${logged.length} lines`);

  const full = await service({ render: () => new Promise<RenderedPage>(() => undefined), concurrency: 1, queue: 0 });
  point(full.base);
  void captureRenderedPage(new URL(`${SITE}/held`), { timeoutMs: 3_000 }).catch(() => undefined);
  await sleep(150);
  check("a busy renderer is said to be busy, not broken", (await codeOf(captureRenderedPage(new URL(`${SITE}/next`)))) === "renderer_busy" && isRendererAvailable());
}

function networks() {
  console.log("\n# Who counts as one visitor");
  const same = networkOf("2001:db8:1:2:aaaa::1") === networkOf("2001:db8:1:2:bbbb::9");
  const other = networkOf("2001:db8:1:3::1") !== networkOf("2001:db8:1:2::1");
  check("addresses inside one IPv6 /64 share a limit, other /64s do not", same && other, networkOf("2001:db8:1:2:aaaa::1"));
  check("IPv4 and IPv4 written as IPv6 are one address each", networkOf("203.0.113.7") === "203.0.113.7" && networkOf("::ffff:203.0.113.7") === "203.0.113.7" && networkOf("local") === "local");
}

async function decisions() {
  console.log("\n# Which capture is used");
  const U = "https://page.skyline-fixture.dev/";
  const complete = () => snapshotFromHtml(`<html><body><main><h1>Title</h1>${"<p>Enough ordinary words to be a page that a server sent whole.</p>".repeat(40)}</main></body></html>`, U, "static");
  const shell = () => snapshotFromHtml(`<html><body><div id="root"></div><noscript>Enable JavaScript.</noscript></body></html>`, U, "static");
  const built = () => snapshotFromHtml(SHELF, U, "rendered", { layout: { width: 1440, height: 900, viewport: 1440 } });
  const world = (o: { still: () => DomSnapshot | CaptureError; live?: () => DomSnapshot | CaptureError; available?: boolean }) => {
    const calls = { still: 0, live: 0 };
    const give = (v: DomSnapshot | CaptureError) => {
      if (v instanceof CaptureError) throw v;
      return v;
    };
    const sources: AcquireSources = {
      fetchStatic: async () => {
        calls.still++;
        return give(o.still());
      },
      captureRendered: async () => {
        calls.live++;
        return give((o.live ?? built)());
      },
      rendererAvailable: () => o.available ?? true,
    };
    return { calls, sources };
  };

  let w = world({ still: complete });
  let snap = await acquire(U, "auto", {}, w.sources);
  check("a page the server sends whole never touches the renderer", snap.source.strategy === "static" && w.calls.live === 0 && w.calls.still === 1);

  w = world({ still: shell });
  snap = await acquire(U, "auto", {}, w.sources);
  check("a page that builds itself in the browser is opened in one", snap.source.strategy === "rendered" && w.calls.live === 1 && !!snap.layout);

  w = world({ still: shell, live: () => new CaptureError("renderer_unavailable") });
  snap = await acquire(U, "auto", {}, w.sources);
  check("if the renderer fails then, the static scaffold is shown and the page says so", snap.source.strategy === "static" && snap.warnings.some((x) => x.code === "spa_shell") && snap.warnings.some((x) => x.code === "rendered_unavailable"));

  w = world({ still: shell, available: false });
  snap = await acquire(U, "auto", {}, w.sources);
  check("with no renderer, the same page is the static scaffold and nothing is waited for", snap.source.strategy === "static" && w.calls.live === 0 && snap.warnings.some((x) => x.code === "spa_shell"));

  w = world({ still: () => new CaptureError("empty_page") });
  snap = await acquire(U, "auto", {}, w.sources);
  check("a page with an empty body is opened in a browser when there is one", snap.source.strategy === "rendered" && w.calls.live === 1);
  w = world({ still: () => new CaptureError("empty_page"), available: false });
  check("and is an empty page when there is none", (await codeOf(acquire(U, "auto", {}, w.sources))) === "empty_page" && w.calls.live === 0);

  w = world({ still: complete });
  snap = await acquire(U, "rendered", {}, w.sources);
  check("asking for more detail uses the renderer and its measures, without a static capture first", snap.source.strategy === "rendered" && !!snap.layout && w.calls.still === 0 && w.calls.live === 1);

  for (const code of ["renderer_unavailable", "renderer_busy", "timeout", "blocked"] as const) {
    w = world({ still: complete, live: () => new CaptureError(code) });
    const got = await codeOf(acquire(U, "rendered", {}, w.sources));
    check(`when that fails (${code}), the failure is the answer: no static capture is put in its place`, got === code && w.calls.still === 0);
  }

  w = world({ still: shell });
  snap = await acquire(U, "static", {}, w.sources);
  check("a static capture asked for by name never uses the renderer", snap.source.strategy === "static" && w.calls.live === 0);

  w = world({ still: complete });
  check("an address outside the policy is refused before any capture", (await codeOf(acquire("https://169.254.169.254/", "rendered", {}, w.sources))) === "private_address" && (await codeOf(acquire("http://page.skyline-fixture.dev/", "auto", {}, w.sources))) === "unsupported_scheme" && w.calls.still + w.calls.live === 0);
}

const ORIGIN = "https://app.skyline-fixture.dev";
const doc = (body: string, title = "Page") => `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;
const FIXTURES: Record<string, ReturnType<NonNullable<RenderOptions["intercept"]>>> = {
  [`${ORIGIN}/shelf`]: {
    contentType: "text/html",
    body: doc(
      `<style>body{margin:0}.shelf{display:flex;flex-wrap:wrap;gap:20px;width:900px}.card{display:block;width:210px}.card img{display:block}</style><main><h1>Shelf</h1><div class="shelf">${Array.from({ length: 8 }, (_, k) => `<a class="card" href="/item/${k}"><img src="/cover-${k}.png" width="210" height="140" alt=""><h3>Item number ${k}</h3><p>A caption long enough to be a sentence about item ${k}.</p></a>`).join("")}</div></main>`,
    ),
  },
  [`${ORIGIN}/app`]: { contentType: "text/html", body: `<!doctype html><html lang="en"><head><title>Feed</title></head><body><div id="root"></div><noscript>Enable JavaScript.</noscript><script src="/app.js"></script></body></html>` },
  [`${ORIGIN}/app.js`]: {
    contentType: "text/javascript",
    body: `setTimeout(() => { const root = document.getElementById("root"); const el = (tag, text, parent) => { const n = document.createElement(tag); if (text) n.textContent = text; parent.appendChild(n); return n; }; const nav = el("nav", "", el("header", "", root)); for (const t of ["Home", "Discover", "Feeds", "About"]) el("a", t, nav).setAttribute("href", "/" + t.toLowerCase()); const main = el("main", "", root); el("h1", "Discover", main); for (let i = 0; i < 30; i++) { const post = el("article", "", main); el("h3", "Author number " + i, post); el("p", "A post with enough words in it to count as real content on a page that a server never sent, number " + i + ".", post); } }, 200);`,
  },
  [`${ORIGIN}/login-wall`]: { contentType: "text/html", body: doc(`<form><input type="email"><input type="password"><button>Sign in</button></form>`, "Sign in") },
  [`${ORIGIN}/challenge`]: { contentType: "text/html", body: doc(`<p>Checking your browser</p>`, "Just a moment...") },
  [`${ORIGIN}/forbidden`]: { status: 403, contentType: "text/html", body: doc("<p>No</p>") },
  [`${ORIGIN}/to-private`]: { status: 302, contentType: "text/html", body: "", headers: { location: "https://127.0.0.1/" } },
};
const browsers = () => Number(execSync("pgrep -f puppeteer_dev_chrome_profile | wc -l || true").toString().trim());

async function sameReading() {
  console.log("\n# The same page, read here and through the service");
  if (!localChromePath()) return console.log("– skipped: no local Chrome (set CHROME_PATH)");
  const before = browsers();
  const noSandbox = !!process.env.CI;
  const intercept: RenderOptions["intercept"] = (u) => FIXTURES[u];
  const real = await service({ probe: undefined, noSandbox, renderOptions: { intercept }, perClient: { capacity: 100, refillPerSec: 0 } });
  point(real.base);

  check("the service is ready only because its browser really started", (await rendererReady()) === true && /Chrom/.test(String((JSON.parse((await call(real.base, "GET", "/health")).text) as { chrome?: string }).chrome)));

  const bare = (s: DomSnapshot) => JSON.stringify({ ...s, source: { ...s.source, durationMs: 0, fetchedAt: "" } });
  const city = (s: DomSnapshot) => {
    const k = buildKitCity(normalize(s));
    return `${k.structures} structures, ${k.city.parts.length} parts, ${k.plan.territories.length} territories`;
  };
  for (const path of ["/shelf", "/app"]) {
    const url = new URL(`${ORIGIN}${path}`);
    const here = await captureWithLocalBrowser(url, { intercept, noSandbox });
    const there = await captureRenderedPage(url, { client: "equivalence" });
    const a = unitsOf(normalize(here), { roots: [0], excluded: [] });
    const b = unitsOf(normalize(there), { roots: [0], excluded: [] });
    check(`${path}: the snapshot is the same, element for element and box for box`, bare(here) === bare(there) && boxes(there) > 0, `${there.stats.elementCount} elements, ${boxes(there)} boxes, page ${there.layout?.width}×${there.layout?.height}`);
    check(`${path}: the units read from it are the same`, JSON.stringify(a) === JSON.stringify(b), b ? `${b.units} ${b.kind}, ${b.perRow} per row` : "no series in either");
    check(`${path}: and so is the city`, city(here) === city(there), city(there));
  }
  const shelf = unitsOf(normalize(await captureRenderedPage(new URL(`${ORIGIN}/shelf`))), { roots: [0], excluded: [] });
  check("through the service, the shelf is read as cards, four per row", shelf?.kind === "card" && shelf.perRow === 4 && shelf.units === 8);
  const app = await captureRenderedPage(new URL(`${ORIGIN}/app`));
  check("through the service, a page that builds itself in the browser is read once it is built", !app.warnings.some((x) => x.code === "spa_shell") && app.stats.elementCount > 90, `${app.stats.elementCount} elements`);

  const refusals = await Promise.all(["/login-wall", "/challenge", "/forbidden", "/to-private"].map((p) => codeOf(captureRenderedPage(new URL(`${ORIGIN}${p}`)))));
  check("a login wall, a bot challenge, a 403 and a redirect to a private address are refused through the service as they are here", refusals.join() === "auth_required,blocked,blocked,forbidden_host", refusals.join());

  await sleep(800);
  check("no browser is left running", browsers() <= before, `${browsers()} processes, ${before} before`);
}

async function main() {
  const env = { url: process.env.SKYLINE_RENDERER_URL, secret: process.env.SKYLINE_RENDERER_SECRET, local: process.env.SKYLINE_LOCAL_RENDERER };
  await protocol();
  await theService();
  await limits();
  await theClient();
  networks();
  await decisions();
  await sameReading();
  point(env.url, env.secret);
  if (env.local) process.env.SKYLINE_LOCAL_RENDERER = env.local;
  await Promise.all(open.map((close) => close().catch(() => undefined)));
  console.log(failed ? `\n${failed} check(s) failed` : "\nall renderer-service checks passed");
  process.exit(failed ? 1 : 0);
}
main();
