import { execFileSync, execSync } from "node:child_process";
import crypto from "node:crypto";
import dgram from "node:dgram";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import https from "node:https";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startEgressProxy, type EgressOptions, type EgressProxy } from "../../src/lib/acquisition/egress-proxy";
import { CaptureError } from "../../src/lib/acquisition/errors";
import { browserEnv, launchBrowser, localChromePath } from "../../src/lib/acquisition/local-browser";
import { renderPage, type RenderOptions } from "../../src/lib/acquisition/render-page";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const PUBLIC = "93.184.216.34";
const DEAD = "93.184.216.35";
const NAMES: Record<string, string[]> = {
  "public.skyline-fixture.dev": [PUBLIC],
  "internal.skyline-fixture.dev": ["10.0.0.5"],
  "metadata.skyline-fixture.dev": ["169.254.169.254"],
  "mixed.skyline-fixture.dev": [PUBLIC, "127.0.0.1"],
  "loop.skyline-fixture.dev": ["127.0.0.1"],
  "cgnat.skyline-fixture.dev": ["100.64.0.7"],
  "ula.skyline-fixture.dev": ["fd00::1"],
  "mapped.skyline-fixture.dev": ["::ffff:10.0.0.5"],
  "dead.skyline-fixture.dev": [DEAD],
};

interface World {
  resolved: string[];
  dialled: string[];
  rebinds: number;
  egress: EgressOptions;
}

function world(port: () => number): World {
  const w: World = {
    resolved: [],
    dialled: [],
    rebinds: 0,
    egress: {
      resolve: async (host) => {
        w.resolved.push(host);
        if (host === "rebind.skyline-fixture.dev") return w.rebinds++ === 0 ? [PUBLIC] : ["169.254.169.254"];
        if (/\.flood\.skyline-fixture\.dev$/.test(host)) return [PUBLIC];
        const hit = NAMES[host];
        if (!hit) throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
        return hit;
      },
      dial: (address) => {
        w.dialled.push(address);
        return net.connect({ host: "127.0.0.1", port: address === DEAD ? 1 : port() });
      },
    },
  };
  return w;
}

function ask(proxy: EgressProxy, request: string): Promise<{ status: number; socket: net.Socket }> {
  return new Promise((done, fail) => {
    const socket = net.connect({ host: "127.0.0.1", port: proxy.port });
    let head = "";
    const onData = (chunk: Buffer) => {
      head += chunk.toString("latin1");
      const end = head.indexOf("\r\n\r\n");
      if (end < 0) return;
      socket.off("data", onData);
      done({ status: Number(/^HTTP\/1\.1 (\d{3})/.exec(head)?.[1] ?? 0), socket });
    };
    socket.on("data", onData);
    socket.on("error", fail);
    socket.on("close", () => done({ status: Number(/^HTTP\/1\.1 (\d{3})/.exec(head)?.[1] ?? 0), socket }));
    socket.write(request);
  });
}
const connect = (proxy: EgressProxy, target: string) => ask(proxy, `CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`);
const refusedAs = async (proxy: EgressProxy, target: string) => {
  const { status, socket } = await connect(proxy, target);
  socket.destroy();
  return `${status} ${proxy.stats().refused.at(-1)?.reason ?? "-"}`;
};
const reply = (socket: net.Socket) => new Promise<string>((done) => socket.once("data", (c: Buffer) => done(c.toString())));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function proxyAlone() {
  console.log("# The way out, on its own");
  const echo = net.createServer((s) => {
    s.on("error", () => undefined);
    s.on("data", (c: Buffer) => {
      const text = c.toString();
      if (text.startsWith("flood")) s.write(Buffer.alloc(8_000, 120));
      else s.write(`echo:${text}`);
    });
  });
  await new Promise<void>((r) => echo.listen(0, "127.0.0.1", r));
  const port = () => (echo.address() as net.AddressInfo).port;

  const w = world(port);
  const proxy = await startEgressProxy(w.egress);

  const open = await connect(proxy, "public.skyline-fixture.dev:443");
  open.socket.write("ping");
  const back = await reply(open.socket);
  check("a public host on port 443 gets a tunnel, and bytes flow both ways", open.status === 200 && back === "echo:ping", `HTTP ${open.status}, "${back}"`);
  check("the connection goes to the address that was checked", w.dialled.length === 1 && w.dialled[0] === PUBLIC, w.dialled.join(","));
  open.socket.destroy();

  const literals = ["127.0.0.1:443", "10.0.0.5:443", "192.168.1.1:443", "172.16.0.9:443", "169.254.169.254:443", "100.64.0.1:443", "0.0.0.0:443", "[::1]:443", "[::7f00:1]:443", "[fd00::1]:443", "[fe80::1]:443", "[::ffff:127.0.0.1]:443", "[64:ff9b::a00:5]:443"];
  const literalAnswers = await Promise.all(literals.map((t) => refusedAs(proxy, t)));
  check("loopback, private, link-local, metadata, CGNAT, ULA and embedded IPv4 literals are refused", literalAnswers.every((a) => a === "403 private_address"), literalAnswers.filter((a) => a !== "403 private_address").join(" | ") || `${literals.length} addresses`);

  const names = ["localhost:443", "printer.local:443", "metadata.google.internal:443", "intranet.corp:443", "metadata:443", "db.lan:443"];
  const nameAnswers = await Promise.all(names.map((t) => refusedAs(proxy, t)));
  check("internal names are refused before any lookup", nameAnswers.every((a) => a === "403 forbidden_host") && !w.resolved.some((h) => names.some((n) => n.startsWith(h))), nameAnswers.join(" | "));

  const before = w.dialled.length;
  const hidden = ["internal.skyline-fixture.dev:443", "metadata.skyline-fixture.dev:443", "loop.skyline-fixture.dev:443", "cgnat.skyline-fixture.dev:443", "ula.skyline-fixture.dev:443", "mapped.skyline-fixture.dev:443"];
  const hiddenAnswers = await Promise.all(hidden.map((t) => refusedAs(proxy, t)));
  check("a public-looking name that resolves inside a private network is refused and never dialled", hiddenAnswers.every((a) => a === "403 private_address") && w.dialled.length === before, hiddenAnswers.join(" | "));
  check("one private address among public ones is enough to refuse", (await refusedAs(proxy, "mixed.skyline-fixture.dev:443")) === "403 private_address" && w.dialled.length === before);

  const first = await connect(proxy, "rebind.skyline-fixture.dev:443");
  first.socket.destroy();
  const second = await refusedAs(proxy, "rebind.skyline-fixture.dev:443");
  check("a name that answers public first and private later is refused the second time, and only the checked address was ever dialled", first.status === 200 && second === "403 private_address" && w.dialled.every((a) => a === PUBLIC), `${first.status} then ${second}; dialled ${[...new Set(w.dialled)].join(",")}`);

  const ports = await Promise.all(["public.skyline-fixture.dev:80", "public.skyline-fixture.dev:8443", "public.skyline-fixture.dev:22", "public.skyline-fixture.dev:6379"].map((t) => refusedAs(proxy, t)));
  check("any port other than 443 is refused", ports.every((a) => a === "403 port"), ports.join(" | "));

  const plain = await ask(proxy, "GET http://public.skyline-fixture.dev/ HTTP/1.1\r\nHost: public.skyline-fixture.dev\r\n\r\n");
  plain.socket.destroy();
  check("plain HTTP is not proxied", plain.status === 403 && proxy.stats().refused.at(-1)?.reason === "plain_http");

  const malformed = await Promise.all(["public.skyline-fixture.dev", "public.skyline-fixture.dev:443:443", "user@public.skyline-fixture.dev:443", ":443"].map((t) => refusedAs(proxy, t)));
  check("a malformed target is refused", malformed.every((a) => /^(400|403) forbidden_host$/.test(a)), malformed.join(" | "));

  check("a name that does not resolve is a DNS failure", (await refusedAs(proxy, "nowhere.skyline-fixture.dev:443")) === "502 dns_failed");
  check("an address that does not answer is a connection failure", (await refusedAs(proxy, "dead.skyline-fixture.dev:443")) === "502 connect_failed");
  check("the proxy remembers why a host was refused", proxy.refusalFor("internal.skyline-fixture.dev") === "private_address" && proxy.refusalFor("nowhere.skyline-fixture.dev") === "dns_failed" && proxy.refusalFor("public.skyline-fixture.dev") === "plain_http");
  await proxy.close();
  const gone = await new Promise<boolean>((done) => net.connect({ host: "127.0.0.1", port: proxy.port }).on("connect", () => done(false)).on("error", () => done(true)));
  check("closing it leaves nothing listening", gone);

  const hanging = await startEgressProxy({ ...world(port).egress, resolve: () => new Promise<string[]>(() => undefined), limits: { lookupMs: 300 } });
  let t0 = Date.now();
  const stuck = await refusedAs(hanging, "slow.skyline-fixture.dev:443");
  check("a name whose DNS never answers is given up on", stuck === "502 dns_failed" && Date.now() - t0 < 2_000, `${stuck} after ${Date.now() - t0} ms`);
  await hanging.close();

  let resolvingNow = 0;
  let resolvingMost = 0;
  const slowDns = await startEgressProxy({
    ...world(port).egress,
    resolve: async () => {
      resolvingMost = Math.max(resolvingMost, ++resolvingNow);
      await sleep(150);
      resolvingNow--;
      return [PUBLIC];
    },
    limits: { lookups: 4 },
  });
  t0 = Date.now();
  const many = await Promise.all(Array.from({ length: 16 }, (_, i) => connect(slowDns, `n${i}.skyline-fixture.dev:443`)));
  many.forEach((c) => c.socket.destroy());
  check("a page cannot run more DNS lookups at once than the cap, and the rest wait their turn", resolvingMost === 4 && many.every((c) => c.status === 200), `${resolvingMost} at most, ${many.filter((c) => c.status === 200).length} of 16 answered in ${Date.now() - t0} ms`);
  await slowDns.close();

  const few = await startEgressProxy({ ...world(port).egress, limits: { maxConnections: 5 } });
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    const c = await connect(few, "public.skyline-fixture.dev:443");
    statuses.push(c.status);
    c.socket.destroy();
  }
  check("connections past the cap are cut", statuses.slice(0, 5).every((s) => s === 200) && statuses.slice(5).every((s) => s === 429) && few.stats().connections === 5, statuses.join(","));
  await few.close();

  const narrow = await startEgressProxy({ ...world(port).egress, limits: { maxOpen: 2 } });
  const held = [await connect(narrow, "public.skyline-fixture.dev:443"), await connect(narrow, "public.skyline-fixture.dev:443")];
  const third = await connect(narrow, "public.skyline-fixture.dev:443");
  check("no more tunnels are open at once than the cap", held.every((h) => h.status === 200) && third.status === 429);
  [...held, third].forEach((h) => h.socket.destroy());
  await narrow.close();

  const thin = await startEgressProxy({ ...world(port).egress, limits: { maxBytes: 3_000 } });
  const fat = await connect(thin, "public.skyline-fixture.dev:443");
  let got = 0;
  fat.socket.on("data", (c: Buffer) => (got += c.length));
  fat.socket.write("flood");
  await new Promise<void>((r) => fat.socket.once("close", () => r()));
  const after = await connect(thin, "public.skyline-fixture.dev:443");
  after.socket.destroy();
  check("a capture that moves more bytes than the cap is cut, and gets no new tunnel", got < 8_000 + 3_000 && thin.stats().refused.some((r) => r.reason === "byte_limit") && after.status === 429, `${got} bytes passed, then HTTP ${after.status}`);
  await thin.close();

  const idle = await startEgressProxy({ ...world(port).egress, limits: { idleMs: 250 } });
  const quiet = await connect(idle, "public.skyline-fixture.dev:443");
  const closedAt = await Promise.race([new Promise<string>((r) => quiet.socket.once("close", () => r("closed"))), sleep(1_500).then(() => "open")]);
  check("a tunnel that goes quiet is closed", closedAt === "closed");
  await idle.close();

  const closing = await startEgressProxy(world(port).egress);
  const live = await connect(closing, "public.skyline-fixture.dev:443");
  const dropped = new Promise<boolean>((r) => live.socket.once("close", () => r(true)));
  await closing.close();
  check("closing the proxy drops the tunnels that were open", await Promise.race([dropped, sleep(1_000).then(() => false)]));

  await new Promise<void>((r) => echo.close(() => r()));
}

const ORIGIN = "https://app.skyline-fixture.dev";
const html = (body: string) => `<!doctype html><html><head><title>Fixture</title></head><body><main><h1>Fixture</h1><p>A page with a paragraph of ordinary words in it, long enough to be read as content.</p></main>${body}</body></html>`;
const browsers = () => Number(execSync("pgrep -f puppeteer_dev_chrome_profile | wc -l || true").toString().trim());
const codeOf = async (work: Promise<unknown>) => {
  try {
    await work;
    return "none";
  } catch (e) {
    return e instanceof CaptureError ? e.code : `unexpected: ${String(e).slice(0, 80)}`;
  }
};

function certificate(): { key: string; cert: string; pin: string; dir: string } | null {
  const dir = mkdtempSync(join(tmpdir(), "skyline-egress-"));
  try {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem"), "-days", "2", "-subj", "/CN=skyline-fixture", "-addext", "subjectAltName=DNS:*.skyline-fixture.dev,DNS:*.flood.skyline-fixture.dev"], { stdio: "ignore" });
    const cert = readFileSync(join(dir, "cert.pem"), "utf8");
    const spki = new crypto.X509Certificate(cert).publicKey.export({ type: "spki", format: "der" });
    return { key: readFileSync(join(dir, "key.pem"), "utf8"), cert, pin: crypto.createHash("sha256").update(spki).digest("base64"), dir };
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
}

async function behindTheBrowser() {
  console.log("\n# A real browser behind it");
  if (!localChromePath()) return console.log("– skipped: no local Chrome (set CHROME_PATH)");
  const tls = certificate();
  if (!tls) return console.log("– skipped: openssl is not available to make a certificate for the fixture server");

  const hits: string[] = [];
  const upgrades: string[] = [];
  const origin = https.createServer({ key: tls.key, cert: tls.cert }, (req, res) => {
    const path = req.url ?? "/";
    hits.push(`${req.headers.host}${path}`);
    const headers = { "content-type": "text/plain", "access-control-allow-origin": "*", connection: "close" };
    if (path === "/hop") return void res.writeHead(302, { location: "https://internal.skyline-fixture.dev/", connection: "close" }).end();
    if (path === "/landing") return void res.writeHead(200, { "content-type": "text/html", connection: "close" }).end(html("<p>Arrived through the proxy.</p>"));
    res.writeHead(200, headers).end("served");
  });
  origin.on("upgrade", (req, socket) => {
    upgrades.push(req.url ?? "");
    socket.destroy();
  });
  await new Promise<void>((r) => origin.listen(0, "127.0.0.1", r));
  const port = (origin.address() as net.AddressInfo).port;
  const before = browsers();
  const noSandbox = !!process.env.CI;
  const launchArgs = [`--ignore-certificate-errors-spki-list=${tls.pin}`];

  const probes = `
    const out = {};
    const done = [];
    const say = (k, v) => { out[k] = v; };
    const get = (k, u) => done.push(fetch(u, { mode: "cors" }).then((r) => r.text()).then((t) => say(k, t), () => say(k, "failed")));
    const ws = (k, u) => done.push(new Promise((r) => { try { const s = new WebSocket(u); s.onopen = () => { say(k, "open"); s.close(); r(); }; s.onerror = () => { say(k, "failed"); r(); }; } catch { say(k, "threw"); r(); } }));
    get("public", "https://public.skyline-fixture.dev/ok");
    get("internal", "https://internal.skyline-fixture.dev/secret");
    get("metadata", "https://metadata.skyline-fixture.dev/latest/meta-data/");
    get("mixed", "https://mixed.skyline-fixture.dev/x");
    ws("wsPrivateLiteral", "wss://10.0.0.5/socket");
    ws("wsPrivateName", "wss://internal.skyline-fixture.dev/socket");
    ws("wsLoopback", "wss://127.0.0.1:${port}/ws-direct");
    ws("wsPlain", "ws://public.skyline-fixture.dev/socket");
    const frame = document.createElement("iframe"); frame.src = "https://internal.skyline-fixture.dev/frame"; document.body.appendChild(frame);
    const script = document.createElement("script"); script.src = "https://metadata.skyline-fixture.dev/x.js"; document.body.appendChild(script);
    done.push(fetch("https://rebind.skyline-fixture.dev/first").then((r) => r.text()).then((t) => say("rebindFirst", t), () => say("rebindFirst", "failed")).then(() => fetch("https://rebind.skyline-fixture.dev/second").then((r) => r.text()).then((t) => say("rebindSecond", t), () => say("rebindSecond", "failed"))));
    Promise.all(done).then(() => { const p = document.createElement("p"); p.id = "out"; p.textContent = JSON.stringify(out); document.body.appendChild(p); });
  `;
  let t0 = Date.now();
  const fixtures: Record<string, ReturnType<NonNullable<RenderOptions["intercept"]>>> = {
    [`${ORIGIN}/attack`]: { contentType: "text/html", body: html(`<script>${probes}</script>`) },
    [`${ORIGIN}/flood`]: { contentType: "text/html", body: html(`<script>const all = []; for (let i = 0; i < 500; i++) all.push(fetch("https://h" + i + ".flood.skyline-fixture.dev/" + i).then(() => 1, () => 0)); Promise.all(all).then((r) => { const p = document.createElement("p"); p.id = "out"; p.textContent = String(r.reduce((a, b) => a + b, 0)); document.body.appendChild(p); });</script>`) },
    [`${ORIGIN}/spin`]: { contentType: "text/html", body: html(`<script>setTimeout(() => { for (;;) {} }, 50)</script>`) },
    [`${ORIGIN}/hog`]: { contentType: "text/html", body: html(`<script>setTimeout(() => { const keep = []; for (;;) keep.push(new Array(1e6).fill(keep.length)); }, 50)</script>`) },
    [`${ORIGIN}/loop-a`]: { contentType: "text/html", body: html(`<script>location.replace("/loop-b")</script>`) },
    [`${ORIGIN}/loop-b`]: { contentType: "text/html", body: html(`<script>location.replace("/loop-a")</script>`) },
    [`${ORIGIN}/bounce`]: { status: 302, contentType: "text/html", body: "", headers: { location: `${ORIGIN}/bounce` } },
    [`${ORIGIN}/download`]: { contentType: "application/octet-stream", body: "binary", headers: { "content-disposition": 'attachment; filename="x.bin"' } },
    [`${ORIGIN}/nothing`]: { status: 204, contentType: "text/html", body: "" },
    [`${ORIGIN}/giant`]: { contentType: "text/html", body: html(`<script>document.querySelector("main").appendChild(document.createTextNode("x".repeat(6 * 1024 * 1024)))</script>`) },
  };
  const w = world(() => port);
  const opts: RenderOptions = { intercept: (u) => fixtures[u], egress: w.egress, launchArgs, noSandbox };
  const read = (page: string) => /<p id="out">([^<]*)<\/p>/.exec(page)?.[1].replace(/&quot;/g, '"') ?? "";

  const landing = await renderPage(new URL("https://public.skyline-fixture.dev/landing"), opts).catch((e) => String(e));
  check("a page on a public host is opened through the proxy", typeof landing !== "string" && landing.html.includes("Arrived through the proxy") && landing.egress.connections >= 1, typeof landing === "string" ? landing : `${landing.egress.connections} tunnel(s)`);

  const attack = await renderPage(new URL(`${ORIGIN}/attack`), opts);
  const saw = JSON.parse(read(attack.html) || "{}") as Record<string, string>;
  check("the page reaches a public host", saw.public === "served", JSON.stringify(saw));
  check("its requests to names that resolve inside a private network fail", saw.internal === "failed" && saw.metadata === "failed" && saw.mixed === "failed");
  check("its WebSockets to private addresses fail, by literal, by name and to loopback", saw.wsPrivateLiteral === "failed" && saw.wsPrivateName === "failed" && saw.wsLoopback === "failed" && !upgrades.includes("/ws-direct"), `${upgrades.length} upgrade(s) reached the fixture server`);
  check("a plain WebSocket does not leave", saw.wsPlain !== "open");
  check("DNS rebinding: the first answer is served and the rebound one is refused", saw.rebindFirst === "served" && saw.rebindSecond === "failed", `${saw.rebindFirst} then ${saw.rebindSecond}`);
  check("frames and scripts aimed at private names never reached anything", !hits.some((h) => /^(internal|metadata|mixed)\./.test(h)), `${hits.length} request(s) reached the fixture server, all on public names`);
  check("every connection the browser made went to an address that was checked", w.dialled.length > 0 && w.dialled.every((a) => a === PUBLIC), `${w.dialled.length} dialled, ${attack.egress.refused} refused`);
  check("the capture reports what the proxy refused", attack.egress.refused >= 6, `${attack.egress.refused} refused`);

  check("a redirect from a public host to a private one is refused at the second hop", (await codeOf(renderPage(new URL("https://public.skyline-fixture.dev/hop"), opts))) === "private_address");
  check("a first address that resolves inside a private network is refused", (await codeOf(renderPage(new URL("https://internal.skyline-fixture.dev/"), opts))) === "private_address");
  check("a first address that does not resolve is a DNS failure", (await codeOf(renderPage(new URL("https://nowhere.skyline-fixture.dev/"), opts))) === "dns_failed");

  const flood = await renderPage(new URL(`${ORIGIN}/flood`), { ...opts, egress: { ...w.egress, limits: { maxConnections: 120 } } });
  const served = Number(read(flood.html) || -1);
  check("a page that opens hundreds of connections is cut at the cap and still read", flood.egress.connections <= 120 && flood.egress.refused > 0 && served >= 0 && served <= 120 && flood.html.includes("Fixture"), `${flood.egress.connections} tunnels, ${flood.egress.refused} refused, ${served} of 500 answered`);

  t0 = Date.now();
  const spin = await codeOf(renderPage(new URL(`${ORIGIN}/spin`), { ...opts, deadlineMs: 5_000 }));
  check("a page that hangs the browser is ended at the deadline", spin === "timeout" && Date.now() - t0 < 12_000, `${spin} after ${Date.now() - t0} ms`);
  t0 = Date.now();
  let heaviest = 0;
  const weigh = setInterval(() => {
    const rss = Number(execSync("ps -eo rss,args | grep -- '--type=renderer' | grep -v grep | sort -rn | head -1 | awk '{print $1}' || true").toString().trim() || 0);
    heaviest = Math.max(heaviest, rss / 1024);
  }, 300);
  const hog = await codeOf(renderPage(new URL(`${ORIGIN}/hog`), { ...opts, deadlineMs: 12_000 }));
  clearInterval(weigh);
  check("a page that eats memory without end is held under a ceiling and ended", (hog === "too_large" || hog === "timeout") && Date.now() - t0 < 16_000 && heaviest > 0 && heaviest < 2_000, `${hog} after ${Date.now() - t0} ms; its process peaked at ${heaviest.toFixed(0)} MB`);
  check("a page that keeps sending itself somewhere else is given up on", (await codeOf(renderPage(new URL(`${ORIGIN}/loop-a`), opts))) === "too_many_redirects");
  check("so is a redirect that never ends", (await codeOf(renderPage(new URL(`${ORIGIN}/bounce`), opts))) === "too_many_redirects");
  const odd = [await codeOf(renderPage(new URL(`${ORIGIN}/download`), opts)), await codeOf(renderPage(new URL(`${ORIGIN}/nothing`), opts))];
  check("an address that downloads a file or answers with nothing is not a page, and says so", odd.every((c) => c === "not_html"), odd.join(", "));
  t0 = Date.now();
  check("a page that grows past the size limit in the browser is refused before it is transferred", (await codeOf(renderPage(new URL(`${ORIGIN}/giant`), opts))) === "too_large" && Date.now() - t0 < 15_000, `${Date.now() - t0} ms`);

  const udp = dgram.createSocket("udp4");
  let datagrams = 0;
  udp.on("message", () => datagrams++);
  await new Promise<void>((r) => udp.bind(0, "127.0.0.1", () => r()));
  const udpPort = (udp.address() as net.AddressInfo).port;
  fixtures[`${ORIGIN}/udp`] = {
    contentType: "text/html",
    body: html(`<p id="out"></p><script>
      const out = (v) => (document.getElementById("out").textContent += v + " ");
      const ice = { iceServers: [{ urls: "stun:127.0.0.1:${udpPort}" }, { urls: "turn:127.0.0.1:${udpPort}?transport=udp", username: "u", credential: "p" }] };
      const peer = (PC) => { if (typeof PC !== "function") return out("none"); try { const pc = new PC(ice); pc.createDataChannel("x"); pc.createOffer().then((o) => pc.setLocalDescription(o)); out("made"); } catch { out("threw"); } };
      peer(window.RTCPeerConnection);
      peer(window.webkitRTCPeerConnection);
      const frame = document.createElement("iframe"); document.body.appendChild(frame);
      peer(frame.contentWindow && frame.contentWindow.RTCPeerConnection);
      peer(window[0] && window[0].RTCPeerConnection);
      const popup = window.open("about:blank");
      peer(popup && popup.RTCPeerConnection);
      try { new WebTransport("https://127.0.0.1:${udpPort}/x").ready.catch(() => {}); out("transport"); } catch { out("no transport"); }
      new Worker(URL.createObjectURL(new Blob(['try { new WebTransport("https://127.0.0.1:${udpPort}/x").ready.catch(() => {}); } catch {}'], { type: "text/javascript" })));
    </script>`),
  };
  const udpPage = await renderPage(new URL(`${ORIGIN}/udp`), opts).catch(() => undefined);
  await sleep(1_500);
  udp.close();
  const said = /<p id="out">([^<]*)<\/p>/.exec(udpPage?.html ?? "")?.[1].trim() ?? "";
  check("WebRTC and WebTransport are gone from the page, its frames and its popups, and no UDP leaves around the proxy", datagrams === 0 && !said.includes("made"), `${datagrams} datagram(s) reached a local UDP port; the page said "${said}"`);

  process.env.SKYLINE_TEST_SECRET = "do-not-leak-1";
  process.env.FLY_API_TOKEN = "do-not-leak-2";
  const env = browserEnv();
  const probe = await launchBrowser({ noSandbox });
  const pid = probe.process()?.pid;
  const seenEnv = pid ? execSync(`ps eww -p ${pid} || true`).toString() : "";
  await probe.close();
  delete process.env.SKYLINE_TEST_SECRET;
  delete process.env.FLY_API_TOKEN;
  check("secrets in the environment never reach the browser", !("SKYLINE_TEST_SECRET" in env) && !("FLY_API_TOKEN" in env) && "PATH" in env && !!pid && !seenEnv.includes("do-not-leak"), pid ? `browser ${pid}` : "no browser");

  const gone = new AbortController();
  setTimeout(() => gone.abort(), 400);
  t0 = Date.now();
  check("a capture nobody is waiting for any more is stopped", (await codeOf(renderPage(new URL(`${ORIGIN}/spin`), { ...opts, signal: gone.signal }))) === "timeout" && Date.now() - t0 < 6_000, `${Date.now() - t0} ms`);

  for (let i = 0; i < 20 && browsers() > before; i++) await sleep(250);
  check("no browser is left running", browsers() <= before, `${browsers()} processes, ${before} before`);

  await new Promise<void>((r) => {
    origin.close(() => r());
    origin.closeAllConnections();
  });
  rmSync(tls.dir, { recursive: true, force: true });
}

async function main() {
  await proxyAlone();
  await behindTheBrowser();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall egress checks passed");
  process.exit(failed ? 1 : 0);
}
main();
