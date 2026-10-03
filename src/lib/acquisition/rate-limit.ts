/**
 * In-memory token bucket per client key. Best effort: per process, resets on restart.
 * Good enough to stop a single tab from hammering the fetcher; swap for a shared store
 * (Redis/Upstash) when deployed on multiple instances.
 */
interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();

export function takeToken(key: string, capacity = 8, refillPerSec = 0.2): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 1000) * refillPerSec);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value as string);
  return true;
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}

/** Tiny LRU for capture results. */
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
