import { accessSync, constants, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { localChromePath, setBrowserDriver } from "../src/lib/acquisition/local-browser";
import { MIN_SECRET_CHARS } from "../src/lib/acquisition/renderer-protocol";
import { cordonSelf } from "./platform";
import { createRenderer } from "./service";
import { createUsage, type Pause } from "./usage";

const log = (line: Record<string, unknown>) => console.log(JSON.stringify({ t: new Date().toISOString(), ...line }));
const int = (name: string, fallback: number, min: number, max: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

const PLATFORM_SOCKET = process.env.SKYLINE_PLATFORM_SOCKET || "/.fly/api";
const STOP_FOR_GOOD = 75;

if (process.argv.includes("--cordon")) {
  void cordonSelf(process.env.SKYLINE_RENDERER_CORDON_TOKEN, process.env.FLY_APP_NAME, process.env.FLY_MACHINE_ID).then((result) => {
    log({ event: "cordon", result });
    process.exit(0);
  });
} else {
  main();
}

function main() {
  const secret = process.env.SKYLINE_RENDERER_SECRET ?? "";
  delete process.env.SKYLINE_RENDERER_SECRET;
  if (process.env.SKYLINE_RENDERER_CORDON_TOKEN) log({ event: "warning", detail: "the cordon token reached the service process" });
  delete process.env.SKYLINE_RENDERER_CORDON_TOKEN;
  if (secret.length < MIN_SECRET_CHARS) {
    log({ event: "fatal", error: `SKYLINE_RENDERER_SECRET needs at least ${MIN_SECRET_CHARS} characters` });
    process.exit(1);
  }
  if (!localChromePath()) {
    log({ event: "fatal", error: "no Chrome found (set CHROME_PATH)" });
    process.exit(1);
  }

  setBrowserDriver(puppeteer);

  const platformApi = (() => {
    try {
      accessSync(PLATFORM_SOCKET, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  })();
  if (platformApi) log({ event: "warning", detail: "the host's machine API socket is writable by the service user" });

  const usage = createUsage(
    process.env.SKYLINE_RENDERER_USAGE_FILE || null,
    {
      monthlySeconds: int("SKYLINE_RENDERER_MONTHLY_HOURS", 50, 0, 744) * 3600,
      dailyCaptures: int("SKYLINE_RENDERER_DAILY_CAPTURES", 100, 1, 100_000),
      bootSeconds: int("SKYLINE_RENDERER_BOOT_SECONDS", 5, 0, 120),
    },
    Date.now,
    log,
  );
  usage.boot();
  setInterval(() => {
    usage.tick();
    const paused = usage.paused();
    if (paused) onPaused(paused);
  }, 5_000).unref();

  let exiting = false;
  const exit = (code: number, why: string) => {
    if (exiting) return;
    exiting = true;
    log({ event: "exiting", why, code, usage: usage.snapshot() });
    void renderer.close().finally(() => {
      usage.tick();
      process.exit(code);
    });
    setTimeout(() => process.exit(code), 6_000).unref();
  };

  const onPaused = (why: Pause) => {
    const code = why === "daily" ? 0 : STOP_FOR_GOOD;
    const leave = () => (renderer.activity().busy ? setTimeout(leave, 1_000).unref() : exit(code, `paused: ${why}`));
    setTimeout(leave, 1_000).unref();
  };

  const noSandbox = process.env.SKYLINE_RENDERER_NO_SANDBOX === "1";
  const renderer = createRenderer({
    secret,
    noSandbox,
    platformApi,
    concurrency: int("SKYLINE_RENDERER_CONCURRENCY", 2, 1, 8),
    queue: int("SKYLINE_RENDERER_QUEUE", 4, 0, 32),
    log,
    usage,
    onPaused,
  });

  const idleSeconds = int("SKYLINE_RENDERER_IDLE_EXIT_SECONDS", 0, 0, 3600);
  const wakeSeconds = Math.min(int("SKYLINE_RENDERER_WAKE_SECONDS", 30, 1, 3600), idleSeconds || 3600);
  const bootedAt = Date.now();
  if (idleSeconds > 0) {
    setInterval(() => {
      const a = renderer.activity();
      const now = Date.now();
      const quiet = now - a.lastRender >= idleSeconds * 1000 && now - a.lastHealth >= Math.min(20, idleSeconds) * 1000 && now - bootedAt >= wakeSeconds * 1000;
      if (!a.busy && quiet) exit(0, "idle");
    }, 2_000).unref();
  }

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

  process.on("SIGTERM", () => exit(0, "SIGTERM"));
  process.on("SIGINT", () => exit(0, "SIGINT"));
  process.on("unhandledRejection", (err) => log({ event: "unhandled", error: String(err instanceof Error ? err.message : err).slice(0, 200) }));

  void renderer.listen(int("PORT", 8080, 1, 65535), process.env.HOST ?? "0.0.0.0").then((port) => {
    log({ event: "listening", port, sandbox: !noSandbox, chrome: localChromePath(), platformApi, idleSeconds, usage: usage.snapshot() });
    const paused = usage.paused();
    if (paused) onPaused(paused);
  });
}
