import { readFileSync, writeFileSync } from "node:fs";
import { generateKitDistrict, LINES, newTrace } from "../../src/lib/pixelcity/kit/district";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { facing, type LifeSide } from "../../src/lib/pixelcity/kit/street-life";

const PAGES = (process.env.PAGES ?? "apple,hn,news,saas").split(",");
const mid = (k: number) => (LINES[k] + LINES[k + 1]) / 2;
const at = (s: LifeSide, off: number): [number, number] => {
  const f = facing(s.block[0], s.block[1], s.side);
  return f.axis === "x" ? [mid(f.span), LINES[f.line] + off] : [LINES[f.line] + off, mid(f.span)];
};
const share = (s: LifeSide, kind: string) => s.front.filter((f) => f.kind === kind).length / Math.max(1, s.front.length);
const out: Record<string, Record<string, string>> = {};
for (const id of PAGES) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")));
  const t = newTrace();
  generateKitDistrict(p.fp, { profile: p.plan, trace: t });
  const sides = t.life!.sides;
  const seen = sides.filter((s) => s.side === 0 || s.side === 1);
  let corner: [number, number] = [0, 0];
  let best = -1;
  for (const a of [1, 2, 3])
    for (const b of [1, 2, 3]) {
      let f = 0;
      for (const s of sides) {
        const g = facing(s.block[0], s.block[1], s.side);
        if ((g.axis === "x" && g.line === b && (g.span === a - 1 || g.span === a)) || (g.axis === "z" && g.line === a && (g.span === b - 1 || g.span === b))) f += s.footfall;
      }
      if (f > best) [best, corner] = [f, [LINES[a], LINES[b]]];
    }
  const pick = (score: (s: LifeSide) => number) => seen.reduce((m, s) => (score(s) > score(m) ? s : m), seen[0]);
  const shop = pick((s) => s.footfall * (0.2 + share(s, "storefront")));
  const square = pick((s) => share(s, "square") * 2 + share(s, "civic") + s.footfall * 0.1);
  const lobby = pick((s) => share(s, "lobby") * 2 + s.footfall * 0.1);
  const f = (xz: [number, number]) => xz.map((v) => v.toFixed(1)).join(",");
  out[id] = {
    city: "view=city",
    street: `view=street&focus=${f(corner)}`,
    corner: `view=close&focus=${f(corner)}`,
    shop: `view=close&focus=${f(at(shop, 1))}`,
    square: `view=close&focus=${f(at(square, -4))}`,
    lobby: `view=close&focus=${f(at(lobby, 1))}`,
  };
  for (const kind of ["loading", "bikes", "works"] as const) {
    const st = t.stories?.find((x) => x.kind === kind);
    if (st) out[id][kind] = `view=close&focus=${f([st.x, st.z])}`;
  }
  const t2 = newTrace();
  const all = generateKitDistrict(p.fp, { profile: p.plan, trace: t2 });
  const foci = all.parts.slice(...t2.scene!.foci!);
  const first = (ps: typeof foci, ok: (q: (typeof foci)[number]) => boolean) => ps.find(ok);
  const shots: Array<[string, (typeof foci)[number] | undefined]> = [
    ["door", first(foci, (q) => q.mesh === "glow" && q.w === 0.1)],
    ["taxi", first(foci, (q) => q.mesh === "sprite")],
  ];
  for (const [name, q] of shots) if (q) out[id][name] = `view=close&focus=${f([q.x, q.z])}`;
  console.log(id, t.grammar?.time, JSON.stringify(out[id]));
}
writeFileSync("scripts/street-scenes/cameras.json", JSON.stringify(out, null, 1) + "\n");
