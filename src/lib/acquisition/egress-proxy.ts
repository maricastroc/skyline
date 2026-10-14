import dns from "node:dns";
import http from "node:http";
import net from "node:net";
import ipaddr from "ipaddr.js";
import { CaptureError } from "./errors";
import { isPublicAddress } from "./net-guard";
import { assertFetchableUrl } from "./url-policy";

export type EgressRefusal =
  | "plain_http"
  | "port"
  | "forbidden_host"
  | "private_address"
  | "dns_failed"
  | "connect_failed"
  | "connection_limit"
  | "byte_limit";

export interface EgressLimits {
  maxConnections: number;
  maxOpen: number;
  maxBytes: number;
  connectMs: number;
  idleMs: number;
  lookupMs: number;
  lookups: number;
}

export interface EgressOptions {
  resolve?: (host: string) => Promise<string[]>;
  dial?: (address: string, port: number) => net.Socket;
  limits?: Partial<EgressLimits>;
}

export interface EgressStats {
  attempts: number;
  connections: number;
  bytes: number;
  refusedCount: number;
  refused: Array<{ target: string; reason: EgressRefusal }>;
}

export interface EgressProxy {
  port: number;
  check(host: string): Promise<EgressRefusal | undefined>;
  stats(): EgressStats;
  refusalFor(host: string): EgressRefusal | undefined;
  close(): Promise<void>;
}

export const EGRESS_LIMITS: EgressLimits = {
  maxConnections: 250,
  maxOpen: 64,
  maxBytes: 64 * 1024 * 1024,
  connectMs: 4_000,
  idleMs: 15_000,
  lookupMs: 5_000,
  lookups: 8,
};

const REFUSALS = new Set<string>(["plain_http", "port", "forbidden_host", "private_address", "dns_failed", "connect_failed", "connection_limit", "byte_limit"]);
const MAX_ADDRESSES = 3;
const MAX_LOGGED = 100;
const MAX_REASONS = 500;

const resolver = new dns.promises.Resolver({ timeout: 2_000, tries: 2 });
const systemResolve = async (host: string): Promise<string[]> => {
  const [v4, v6] = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
  const found = [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
  if (found.length) return found;
  throw v4.status === "rejected" ? v4.reason : new Error("no addresses");
};
const systemDial = (address: string, port: number) => net.connect({ host: address, port });

export async function startEgressProxy(opts: EgressOptions = {}): Promise<EgressProxy> {
  const limits = { ...EGRESS_LIMITS, ...opts.limits };
  const resolve = opts.resolve ?? systemResolve;
  const dial = opts.dial ?? systemDial;
  const sockets = new Set<net.Socket>();
  const refused: EgressStats["refused"] = [];
  const reasons = new Map<string, EgressRefusal>();
  let attempts = 0;
  let connections = 0;
  let open = 0;
  let bytes = 0;
  let refusedCount = 0;
  let closed = false;
  let resolving = 0;
  const waiting: Array<() => void> = [];

  const record = (target: string, reason: EgressRefusal) => {
    refusedCount++;
    if (refused.length < MAX_LOGGED) refused.push({ target: target.slice(0, 160), reason });
    const host = hostOf(target);
    if (host && (reasons.size < MAX_REASONS || reasons.has(host))) reasons.set(host, reason);
  };

  const resolveBounded = async (host: string): Promise<string[]> => {
    if (resolving >= limits.lookups) await new Promise<void>((go) => waiting.push(go));
    resolving++;
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([resolve(host), new Promise<never>((_, fail) => (timer = setTimeout(() => fail(new Error("lookup timed out")), limits.lookupMs)))]);
    } finally {
      clearTimeout(timer);
      resolving--;
      waiting.shift()?.();
    }
  };

  const lookup = async (host: string): Promise<string[] | EgressRefusal> => {
    let addresses: string[];
    try {
      addresses = ipaddr.isValid(host) ? [host] : await resolveBounded(host);
    } catch {
      return "dns_failed";
    }
    if (addresses.length === 0) return "dns_failed";
    return addresses.some((a) => !isPublicAddress(a)) ? "private_address" : addresses;
  };

  const admit = (name: string): string | EgressRefusal => {
    try {
      const url = new URL(`https://${name}/`);
      assertFetchableUrl(url);
      return url.hostname.replace(/^\[|\]$/g, "");
    } catch (err) {
      return err instanceof CaptureError && err.code === "private_address" ? "private_address" : "forbidden_host";
    }
  };
  const isRefusal = (v: string | string[]): v is EgressRefusal => typeof v === "string" && REFUSALS.has(v);

  const connectTo = (address: string) =>
    new Promise<net.Socket | null>((done) => {
      const socket = dial(address, 443);
      const timer = setTimeout(() => {
        socket.destroy();
        done(null);
      }, limits.connectMs);
      socket.once("connect", () => {
        clearTimeout(timer);
        done(socket);
      });
      socket.once("error", () => {
        clearTimeout(timer);
        socket.destroy();
        done(null);
      });
    });

  const tunnel = async (target: string, client: net.Socket, head: Buffer) => {
    sockets.add(client);
    client.on("error", () => undefined);
    client.on("close", () => sockets.delete(client));
    const refuse = (reason: EgressRefusal, status: number) => {
      record(target, reason);
      client.end(`HTTP/1.1 ${status} Refused\r\nconnection: close\r\n\r\n`);
    };

    attempts++;
    const m = /^(\[[0-9a-f:.]+\]|[^:[\]\s]+):(\d{1,5})$/i.exec(target);
    if (!m) return refuse("forbidden_host", 400);
    if (m[2] !== "443") return refuse("port", 403);

    const host = admit(m[1]);
    if (isRefusal(host)) return refuse(host, 403);

    if (attempts > limits.maxConnections || open >= limits.maxOpen) return refuse("connection_limit", 429);
    if (bytes >= limits.maxBytes) return refuse("byte_limit", 429);

    const addresses = await lookup(host);
    if (isRefusal(addresses)) return refuse(addresses, addresses === "dns_failed" ? 502 : 403);
    if (closed || client.destroyed) return void client.destroy();

    let upstream: net.Socket | null = null;
    for (const address of [...addresses].sort((a, b) => Number(net.isIPv6(a)) - Number(net.isIPv6(b))).slice(0, MAX_ADDRESSES)) {
      upstream = await connectTo(address);
      if (upstream || closed || client.destroyed) break;
    }
    if (closed || client.destroyed) {
      upstream?.destroy();
      return void client.destroy();
    }
    if (!upstream) return refuse("connect_failed", 502);

    const remote = upstream;
    connections++;
    open++;
    sockets.add(remote);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      open--;
      client.destroy();
      remote.destroy();
      sockets.delete(client);
      sockets.delete(remote);
    };
    const count = (n: number) => {
      bytes += n;
      if (bytes > limits.maxBytes) {
        record(target, "byte_limit");
        end();
      }
    };
    remote.on("error", end).on("close", end).setTimeout(limits.idleMs, end);
    client.on("close", end).setTimeout(limits.idleMs, end);
    client.on("data", (chunk: Buffer) => count(chunk.length));
    remote.on("data", (chunk: Buffer) => count(chunk.length));

    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) {
      count(head.length);
      remote.write(head);
    }
    client.pipe(remote);
    remote.pipe(client);
  };

  const server = http.createServer((req, res) => {
    attempts++;
    record(String(req.url ?? ""), "plain_http");
    res.writeHead(403, { connection: "close" }).end();
  });
  server.on("connect", (req, socket, head) => void tunnel(String(req.url ?? ""), socket as net.Socket, head).catch(() => socket.destroy()));
  server.on("upgrade", (_req, socket) => socket.destroy());
  server.on("clientError", (_err, socket) => socket.destroy());

  await new Promise<void>((ready, failed) => {
    server.once("error", failed);
    server.listen(0, "127.0.0.1", ready);
  });

  return {
    port: (server.address() as net.AddressInfo).port,
    check: async (name) => {
      const host = admit(name);
      if (isRefusal(host)) return host;
      const addresses = await lookup(host);
      return isRefusal(addresses) ? addresses : undefined;
    },
    stats: () => ({ attempts, connections, bytes, refusedCount, refused: [...refused] }),
    refusalFor: (host) => reasons.get(host.toLowerCase().replace(/^\[|\]$/g, "")),
    close: () =>
      new Promise<void>((done) => {
        closed = true;
        for (const go of waiting.splice(0)) go();
        for (const s of sockets) s.destroy();
        sockets.clear();
        const timer = setTimeout(done, 1_000);
        server.close(() => {
          clearTimeout(timer);
          done();
        });
        server.closeAllConnections();
      }),
  };
}

function hostOf(target: string): string | null {
  const connect = /^(\[[0-9a-f:.]+\]|[^:[\]\s/]+):\d{1,5}$/i.exec(target);
  if (connect) return connect[1].toLowerCase().replace(/^\[|\]$/g, "");
  try {
    return new URL(target).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }
}
