import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";

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
  "--no-first-run",
  "--no-default-browser-check",
  "--mute-audio",
];

export async function launchLocalBrowser(opts: { noSandbox?: boolean } = {}): Promise<Browser> {
  const executablePath = localChromePath();
  if (!executablePath) throw new Error("no local Chrome (set CHROME_PATH)");
  const spec = "puppeteer-core";
  const puppeteer = ((await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ spec)) as typeof import("puppeteer-core")).default;
  return puppeteer.launch({ executablePath, headless: true, args: opts.noSandbox ? [...ARGS, "--no-sandbox"] : ARGS });
}
