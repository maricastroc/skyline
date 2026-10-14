import ipaddr from "ipaddr.js";

interface Bucket {
  tokens: number;
  updated: number;
}

export type TakeToken = (key: string, capacity?: number, refillPerSec?: number, cost?: number) => boolean;

export function tokenBuckets(): TakeToken {
  const buckets = new Map<string, Bucket>();
  return (key, capacity = 8, refillPerSec = 0.2, cost = 1) => {
    const now = Date.now();
    const b = buckets.get(key) ?? { tokens: capacity, updated: now };
    b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 1000) * refillPerSec);
    b.updated = now;
    if (b.tokens < cost) {
      buckets.set(key, b);
      return false;
    }
    b.tokens -= cost;
    buckets.set(key, b);
    if (buckets.size > 5000) buckets.delete(buckets.keys().next().value as string);
    return true;
  };
}

export const takeToken = tokenBuckets();

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return networkOf(fwd || req.headers.get("x-real-ip") || "local");
}

export function networkOf(address: string): string {
  if (!ipaddr.isValid(address)) return address;
  const parsed = ipaddr.parse(address);
  if (parsed.kind() !== "ipv6") return parsed.toString();
  const v6 = parsed as ipaddr.IPv6;
  if (v6.isIPv4MappedAddress()) return v6.toIPv4Address().toString();
  return `${v6.parts.slice(0, 4).map((part) => part.toString(16)).join(":")}::/64`;
}

export class Lru<V> {
  private map = new Map<string, { v: V; at: number }>();
  constructor(private max: number, private ttlMs: number) {}
  get(k: string): V | undefined {
    const hit = this.map.get(k);
    if (!hit) return undefined;
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(k);
      return undefined;
    }
    this.map.delete(k);
    this.map.set(k, hit);
    return hit.v;
  }
  set(k: string, v: V) {
    this.map.delete(k);
    this.map.set(k, { v, at: Date.now() });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
}
