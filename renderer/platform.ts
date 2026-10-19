export const MACHINES_API = ["http://_api.internal:4280", "https://api.machines.dev"];

export async function cordonSelf(token: string | undefined, app: string | undefined, machine: string | undefined, endpoints: readonly string[] = MACHINES_API, timeoutMs = 10_000): Promise<string> {
  if (!app || !machine) return "no machine identity";
  if (!token) return "no cordon token";
  const authorization = token.startsWith("FlyV1 ") ? token : `Bearer ${token}`;
  const tried: string[] = [];
  for (const base of endpoints) {
    const url = new URL(`/v1/apps/${encodeURIComponent(app)}/machines/${encodeURIComponent(machine)}/cordon`, base);
    const result = await fetch(url, { method: "POST", headers: { authorization, "content-type": "application/json" }, signal: AbortSignal.timeout(timeoutMs) }).then(
      async (res) => {
        await res.body?.cancel();
        return `HTTP ${res.status}`;
      },
      (err: unknown) => {
        const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
        return `failed: ${String(cause instanceof Error ? cause.message : cause).slice(0, 80)}`;
      },
    );
    tried.push(`${url.host} ${result}`);
    if (result.startsWith("HTTP 2")) break;
  }
  return tried.join("; ");
}
