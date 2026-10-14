import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";

type Driver = typeof import("puppeteer-core").default;

const DEFAULT_CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export function localChromePath(): string | null {
  const candidates = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : DEFAULT_CHROME;
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function isLocalRendererEnabled(): boolean {
  if (process.env.SKYLINE_LOCAL_RENDERER !== "1") return false;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) return false;
  return localChromePath() !== null;
}

const ARGS = [
  "--disable-quic",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-extensions",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--disable-features=DnsOverHttps,AutofillServerCommunication",
  "--no-pings",
  "--no-first-run",
  "--no-default-browser-check",
  "--mute-audio",
  "--js-flags=--max-old-space-size=768",
];

const PRIVATE_ENV = /SECRET|TOKEN|PASSW|CREDENTIAL|PRIVATE|AUTH|_KEY$|^KEY|^(SKYLINE|VERCEL|FLY|AWS|GOOGLE|GITHUB|NPM)_/i;

export function browserEnv(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter((e): e is [string, string] => typeof e[1] === "string" && !PRIVATE_ENV.test(e[0])));
}

export interface LaunchOptions {
  noSandbox?: boolean;
  proxyPort?: number;
  args?: string[];
}

let driver: Driver | null = null;

export function setBrowserDriver(d: Driver): void {
  driver = d;
}

export async function launchBrowser(opts: LaunchOptions = {}): Promise<Browser> {
  const executablePath = localChromePath();
  if (!executablePath) throw new Error("no Chrome (set CHROME_PATH)");
  const spec = "puppeteer-core";
  const puppeteer = driver ?? ((await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ spec)) as typeof import("puppeteer-core")).default;
  const args = [...ARGS];
  if (opts.proxyPort) args.push(`--proxy-server=http://127.0.0.1:${opts.proxyPort}`, "--proxy-bypass-list=<-loopback>", "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1");
  if (opts.noSandbox) args.push("--no-sandbox");
  return puppeteer.launch({ executablePath, headless: true, pipe: true, env: browserEnv(), args: [...args, ...(opts.args ?? [])] });
}

export function killBrowser(browser: Browser | null): void {
  const child = browser?.process();
  if (!browser || !child?.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  void browser.disconnect().catch(() => undefined);
}
