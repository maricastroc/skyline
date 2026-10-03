import ipaddr from "ipaddr.js";
import { CaptureError } from "./errors";
import { isPublicAddress } from "./net-guard";

const FORBIDDEN_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".private",
  ".test",
  ".invalid",
  ".example",
  ".onion",
  ".arpa",
];

/**
 * Turns what a person types ("example.com", " https://Example.com/a ") into a URL we are
 * willing to fetch, or throws a CaptureError explaining why not.
 * This is purely syntactic; DNS-level checks happen in net-guard at connect time.
 */
export function normalizeInputUrl(input: string): URL {
  const raw = (input ?? "").trim();
  if (!raw || raw.length > 2048) throw new CaptureError("invalid_url");

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new CaptureError("invalid_url");
  }
  assertFetchableUrl(url);
  url.hash = "";
  return url;
}

/** Applied to the input URL and to every redirect hop. */
export function assertFetchableUrl(url: URL): void {
  if (url.protocol !== "https:") throw new CaptureError("unsupported_scheme");
  if (url.username || url.password) throw new CaptureError("forbidden_host", "credentials in URL");
  if (url.port && url.port !== "443") throw new CaptureError("forbidden_host", `port ${url.port}`);

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new CaptureError("invalid_url");

  // IP literals: allowed only if public. URL() normalises odd forms (0x7f.1, 2130706433…)
  // into dotted quads, and wraps IPv6 in brackets.
  const bare = host.startsWith("[") ? host.slice(1, -1) : host;
  if (ipaddr.isValid(bare)) {
    if (!isPublicAddress(bare)) throw new CaptureError("private_address");
    return;
  }

  if (host === "localhost" || FORBIDDEN_SUFFIXES.some((s) => host.endsWith(s)))
    throw new CaptureError("forbidden_host", host);
  if (!host.includes(".")) throw new CaptureError("forbidden_host", "single-label host");
  if (!/^[a-z0-9.-]+$/.test(host)) throw new CaptureError("invalid_url");
}
