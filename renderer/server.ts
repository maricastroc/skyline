import { accessSync, constants, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { localChromePath, setBrowserDriver } from "../src/lib/acquisition/local-browser";
import { MIN_SECRET_CHARS } from "../src/lib/acquisition/renderer-protocol";
import { createRenderer } from "./service";

const log = (line: Record<string, unknown>) => console.log(JSON.stringify({ t: new Date().toISOString(), ...line }));
const int = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

const secret = process.env.SKYLINE_RENDERER_SECRET ?? "";
delete process.env.SKYLINE_RENDERER_SECRET;
if (secret.length < MIN_SECRET_CHARS) {
  log({ event: "fatal", error: `SKYLINE_RENDERER_SECRET needs at least ${MIN_SECRET_CHARS} characters` });
  process.exit(1);
}
if (!localChromePath()) {
  log({ event: "fatal", error: "no Chrome found (set CHROME_PATH)" });
  process.exit(1);
}

setBrowserDriver(puppeteer);

const PLATFORM_SOCKETS = ["/.fly/api"];
const platformApi = PLATFORM_SOCKETS.some((path) => {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
});
if (platformApi) log({ event: "warning", detail: "the host's machine API socket is writable by the service user" });

const noSandbox = process.env.SKYLINE_RENDERER_NO_SANDBOX === "1";
const renderer = createRenderer({
  secret,
  noSandbox,
  platformApi,
  concurrency: int("SKYLINE_RENDERER_CONCURRENCY", 2, 1, 8),
  queue: int("SKYLINE_RENDERER_QUEUE", 4, 0, 32),
  log,
});

const STALE_MS = 5 * 60_000;
const LEFTOVERS = ["puppeteer_dev_chrome_profile-", "org.chromium.Chromium.", ".org.chromium.Chromium."];
const sweep = () => {
  try {
    for (const name of readdirSync(tmpdir())) {
      if (!LEFTOVERS.some((prefix) => name.startsWith(prefix))) continue;
      const path = join(tmpdir(), name);
      if (Date.now() - statSync(path).mtimeMs > STALE_MS) rmSync(path, { recursive: true, force: true });
    }
  } catch (err) {
    log({ event: "sweep_failed", error: String(err instanceof Error ? err.message : err).slice(0, 120) });
  }
};
setInterval(sweep, 60_000).unref();

const stop = (signal: string) => {
  log({ event: "stopping", signal });
  void renderer.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 6_000).unref();
};
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
process.on("unhandledRejection", (err) => log({ event: "unhandled", error: String(err instanceof Error ? err.message : err).slice(0, 200) }));

void renderer.listen(int("PORT", 8080, 1, 65535), process.env.HOST ?? "0.0.0.0").then((port) => log({ event: "listening", port, sandbox: !noSandbox, chrome: localChromePath() }));
