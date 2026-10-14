import http from "node:http";

export function cordonSelf(socketPath: string, app: string | undefined, machine: string | undefined, timeoutMs = 10_000): Promise<string> {
  if (!app || !machine) return Promise.resolve("no machine identity");
  return new Promise((done) => {
    const req = http.request({ socketPath, method: "POST", path: `/v1/apps/${encodeURIComponent(app)}/machines/${encodeURIComponent(machine)}/cordon`, headers: { "content-type": "application/json" }, timeout: timeoutMs }, (res) => {
      res.resume();
      res.on("end", () => done(`HTTP ${res.statusCode}`));
    });
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", (err) => done(`failed: ${err.message.slice(0, 80)}`));
    req.end();
  });
}
