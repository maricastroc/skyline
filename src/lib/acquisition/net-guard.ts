import dns from "node:dns";
import type { LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { CaptureError } from "./errors";

export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const addr = ipaddr.process(address);
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.range() !== "unicast") return false;
    const embedded = ["64:ff9b::/96", "64:ff9b:1::/48", "2002::/16", "2001::/32", "2001:db8::/32"];
    return !embedded.some((cidr) => v6.match(ipaddr.parseCIDR(cidr) as [ipaddr.IPv6, number]));
  }
  return addr.range() === "unicast";
}

// SSRF guard at the socket: every resolved address must be public, and the connection goes to the address checked here.
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = (addresses as dns.LookupAddress[]) ?? [];
    if (list.length === 0) {
      const e = Object.assign(new Error("no addresses"), { code: "ENOTFOUND" });
      return callback(e, "", 0);
    }
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (bad) return callback(new CaptureError("private_address", hostname) as unknown as NodeJS.ErrnoException, "", 0);

    const wantAll = typeof options === "object" && options !== null && (options as dns.LookupOptions).all;
    const family = typeof options === "object" && options ? (options as dns.LookupOptions).family : undefined;
    const pool = family === 4 || family === 6 ? list.filter((a) => a.family === family) : list;
    const chosen = pool.length ? pool : list;
    if (wantAll) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, chosen);
    return callback(null, chosen[0].address, chosen[0].family);
  });
};
