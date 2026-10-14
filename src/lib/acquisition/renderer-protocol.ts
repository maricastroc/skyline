import crypto from "node:crypto";
import type { CaptureErrorCode } from "./errors";
import type { RenderedPage } from "./render-page";

export const PROTOCOL = 1;
export const TIME_HEADER = "x-skyline-time";
export const SIGNATURE_HEADER = "x-skyline-signature";
export const MIN_SECRET_CHARS = 32;
export const MAX_SKEW_MS = 90_000;
export const MAX_REQUEST_BYTES = 32_768;
export const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
export const VIEWPORT = { width: 1440, height: 900 };

export const MAX_URL_CHARS = 4_096;
export const MAX_ADDRESS_CHARS = 20_000;
const MAX_HTML_CHARS = 4 * 1024 * 1024;
const MAX_CSS_CHARS = 1024 * 1024;
const MAX_INJECTED_SHEETS = 2_000;

export interface RenderRequest {
  url: string;
  viewport?: { width: number; height: number };
  client?: string;
}

export type RendererFailure = CaptureErrorCode | "busy" | "unauthorized" | "bad_request" | "not_found";

export interface RendererHealth {
  v: number;
  ok: boolean;
  chrome?: string;
  sandbox?: boolean;
  active?: number;
  capacity?: number;
  queued?: number;
  platformApi?: boolean;
}

const digest = (body: string) => crypto.createHash("sha256").update(body).digest("hex");

export function signRequest(secret: string, time: number, method: string, path: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(`${time}\n${method.toUpperCase()}\n${path}\n${digest(body)}`).digest("hex");
}

export function signedHeaders(secret: string, method: string, path: string, body: string, now = Date.now()): Record<string, string> {
  return { [TIME_HEADER]: String(now), [SIGNATURE_HEADER]: signRequest(secret, now, method, path, body) };
}

export function verifyRequest(secret: string, given: { time: unknown; signature: unknown }, method: string, path: string, body: string, now = Date.now()): boolean {
  const time = Number(given.time);
  if (!Number.isSafeInteger(time) || Math.abs(now - time) > MAX_SKEW_MS) return false;
  const expected = Buffer.from(signRequest(secret, time, method, path, body));
  const actual = Buffer.from(String(given.signature ?? ""));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function clampViewport(v: unknown): { width: number; height: number } {
  const o = (v ?? {}) as { width?: unknown; height?: unknown };
  const side = (n: unknown, min: number, max: number, fallback: number) => (typeof n === "number" && Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : fallback);
  return { width: side(o.width, 320, 1920, VIEWPORT.width), height: side(o.height, 480, 1200, VIEWPORT.height) };
}

export function toWire(page: RenderedPage): RenderedPage {
  const headers: Record<string, string> = {};
  for (const name of ["content-type", "cf-mitigated"]) if (typeof page.headers[name] === "string") headers[name] = page.headers[name].slice(0, 200);
  const short = (list: string[], items: number, max: number) => list.filter((s) => s.length <= max).slice(0, items);
  return {
    ...page,
    headers,
    redirects: short(page.redirects, 20, MAX_URL_CHARS),
    stylesheets: short(page.stylesheets.filter((u) => u.startsWith("https://")), 50, MAX_URL_CHARS),
    injectedCss: page.injectedCss.slice(0, MAX_INJECTED_SHEETS),
    refused: short(page.refused, 50, 200),
  };
}

const isCount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const isText = (s: unknown, max: number): s is string => typeof s === "string" && s.length <= max;
const isTexts = (list: unknown, items: number, max: number): list is string[] => Array.isArray(list) && list.length <= items && list.every((s) => isText(s, max));

export function fromWire(value: unknown): RenderedPage | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (!isText(p.html, MAX_HTML_CHARS) || !isText(p.finalUrl, MAX_ADDRESS_CHARS)) return null;
  if (!isCount(p.status) || p.status < 100 || p.status > 599 || !isCount(p.durationMs)) return null;
  if (!isTexts(p.redirects, 20, MAX_URL_CHARS) || !isTexts(p.stylesheets, 50, MAX_URL_CHARS) || !isTexts(p.refused, 50, 200)) return null;
  if (!isTexts(p.injectedCss, MAX_INJECTED_SHEETS, MAX_CSS_CHARS) || p.injectedCss.reduce((n, css) => n + css.length, 0) > MAX_CSS_CHARS * 2) return null;
  if (!isCount(p.requests) || !isCount(p.placeholders)) return null;
  if (p.settled !== "quiet" && p.settled !== "deadline") return null;
  if (!p.headers || typeof p.headers !== "object") return null;

  const headers: Record<string, string> = {};
  for (const name of ["content-type", "cf-mitigated"]) {
    const v = (p.headers as Record<string, unknown>)[name];
    if (isText(v, 200)) headers[name] = v;
  }

  let layout: RenderedPage["layout"];
  if (p.layout !== undefined && p.layout !== null) {
    const l = p.layout as Record<string, unknown>;
    if (!isCount(l.width) || !isCount(l.height) || !isCount(l.viewport)) return null;
    layout = { width: l.width, height: l.height, viewport: l.viewport };
  }

  const e = (p.egress ?? {}) as Record<string, unknown>;
  return {
    html: p.html,
    finalUrl: p.finalUrl,
    status: p.status,
    headers,
    redirects: p.redirects,
    durationMs: p.durationMs,
    stylesheets: p.stylesheets,
    injectedCss: p.injectedCss,
    requests: p.requests,
    refused: p.refused,
    placeholders: p.placeholders,
    settled: p.settled,
    layout,
    egress: { connections: isCount(e.connections) ? e.connections : 0, refused: isCount(e.refused) ? e.refused : 0, bytes: isCount(e.bytes) ? e.bytes : 0 },
  };
}
