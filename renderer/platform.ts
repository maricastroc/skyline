export const MACHINES_API = ["http://_api.internal:4280", "https://api.machines.dev"];
export const ADDRESSES_API = ["https://api.machines.dev", "http://_api.internal:4280"];

type Answer = { status: number; body: unknown } | string;

async function call(base: string, method: string, path: string, token: string, timeoutMs: number): Promise<Answer> {
  try {
    const res = await fetch(new URL(path, base), { method, headers: { authorization: token.startsWith("FlyV1 ") ? token : `Bearer ${token}`, "content-type": "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    return `failed: ${String(cause instanceof Error ? cause.message : cause).slice(0, 80)}`;
  }
}

const said = (answer: Answer) => (typeof answer === "string" ? answer : `HTTP ${answer.status}`);
const done = (answer: Answer) => typeof answer !== "string" && answer.status >= 200 && answer.status < 300;

export async function cordonSelf(token: string | undefined, app: string | undefined, machine: string | undefined, endpoints: readonly string[] = MACHINES_API, timeoutMs = 10_000): Promise<string> {
  if (!app || !machine) return "no machine identity";
  if (!token) return "no cordon token";
  const tried: string[] = [];
  for (const base of endpoints) {
    const answer = await call(base, "POST", `/v1/apps/${encodeURIComponent(app)}/machines/${encodeURIComponent(machine)}/cordon`, token, timeoutMs);
    tried.push(`${new URL(base).host} ${said(answer)}`);
    if (done(answer)) break;
  }
  return tried.join("; ");
}

export async function releasePublicIps(token: string | undefined, app: string | undefined, endpoints: readonly string[] = ADDRESSES_API, timeoutMs = 10_000): Promise<string> {
  if (!app) return "no app identity";
  if (!token) return "no address token";
  const tried: string[] = [];
  for (const base of endpoints) {
    const host = new URL(base).host;
    const listed = await call(base, "GET", `/v1/apps/${encodeURIComponent(app)}/ip_assignments`, token, timeoutMs);
    const ips = done(listed) ? (listed as { body: { ips?: unknown } }).body?.ips : undefined;
    if (!Array.isArray(ips)) {
      tried.push(`${host} list ${done(listed) ? "unreadable" : said(listed)}`);
      continue;
    }
    const ingress = ips.filter((a): a is { ip: string } => !!a && typeof a.ip === "string" && !a.egress).map((a) => a.ip);
    if (!ingress.length) return [...tried, `${host} nothing to release`].join("; ");
    const released: string[] = [];
    let all = true;
    for (const ip of ingress) {
      const answer = await call(base, "DELETE", `/v1/apps/${encodeURIComponent(app)}/ip_assignments/${encodeURIComponent(ip)}`, token, timeoutMs);
      released.push(`${ip} ${said(answer)}`);
      all &&= done(answer);
    }
    tried.push(`${host} ${released.join(", ")}`);
    if (all) break;
  }
  return tried.join("; ");
}
