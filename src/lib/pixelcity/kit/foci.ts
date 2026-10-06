import type { RGB } from "../../city/types";
import type { Kit } from "./core";
import { curbSpace, hits, obstacles, skyline, type Box } from "./curb";
import { laneOffset, SIDEWALK_H } from "./street";
import type { Focus, StreetLife } from "./street-life";
import { vehicle } from "./vehicles";

const WARM: RGB = [1, 0.84, 0.58];
const ENTRANCE = new Set(["lobby", "civic", "storefront", "arcade"]);

export function lifeFoci(kit: Kit, life: StreetLife, foci: Focus[], lines: number[], B: number, S: number) {
  const solid = obstacles(kit.parts);
  const { seen, height } = skyline(kit.parts);
  const { at, curbOf, segment, curbSide } = curbSpace(kit, life, lines, B, S);
  const point = (f: Focus, z: number) => at(f.side, () => kit.toWorld(f.u, 0, z));
  const facade = (f: Focus) => {
    for (let z = 0.2; z > -2.5; z -= 0.1) {
      const [x, , wz] = point(f, z);
      if (height(x, wz) <= 0.8) continue;
      const [ox, , oz] = point(f, z + 0.25);
      const over = height(ox, oz);
      return { z, y: over > 0.3 && over < 0.9 ? over - SIDEWALK_H - 0.2 : 0.6 };
    }
    return null;
  };
  const doors = foci
    .filter((f) => ENTRANCE.has(f.kind) && f.side.footfall >= 0.45)
    .map((f, i) => {
      const [x, , z] = point(f, 0.4);
      return { f, i, key: (seen(x, z) ? 2 : 0) + (f.kind === "lobby" || f.kind === "civic" ? 1 : 0) + f.side.footfall + kit.rand(f.side.salt, 400 + i) * 0.3 };
    })
    .sort((a, b) => b.key - a.key)
    .slice(0, Math.min(8, Math.round(foci.length * 0.25)));
  const lit: Focus[] = [];
  for (const { f } of doors) {
    const hit = facade(f);
    if (hit === null) continue;
    at(
      f.side,
      () => {
        kit.glow(f.u, hit.y, hit.z + 0.15, 0.1, 0.04, 0.06, WARM, kit.night ? 1.4 : 0.15);
      },
      SIDEWALK_H,
    );
    lit.push(f);
  }
  const stands = lit.filter((f) => (f.kind === "lobby" || f.kind === "civic") && (f.side.role === "primary" || f.side.role === "street"));
  let taxis = 0;
  for (const f of stands) {
    if (taxis >= Math.min(3, Math.round(stands.length * 0.4))) break;
    const g = segment(f.side);
    const side = curbSide(f.side);
    const off = g ? laneOffset(g.role, side) : null;
    if (off === null) continue;
    const [wx, , wz] = point(f, 0);
    const along = f.side.axis === "x" ? wx : wz;
    const c = lines[f.side.line] + off;
    const box: Box = f.side.axis === "x" ? { x0: along - 0.55, x1: along + 0.55, z0: c - 0.28, z1: c + 0.28 } : { x0: c - 0.28, x1: c + 0.28, z0: along - 0.55, z1: along + 0.55 };
    if (hits(solid, box)) continue;
    const zt = curbOf(f.side);
    const wait = at(f.side, () => kit.toWorld(f.u + 0.45, 0, zt - 0.14));
    if (hits(solid, { x0: wait[0] - 0.12, x1: wait[0] + 0.12, z0: wait[2] - 0.12, z1: wait[2] + 0.12 })) continue;
    solid.push(box);
    const [x, z] = f.side.axis === "x" ? [along, c] : [c, along];
    vehicle(kit, x, z, f.side.axis === "x" ? (side > 0 ? 0 : Math.PI) : side > 0 ? -Math.PI / 2 : Math.PI / 2, "taxi", [0.98, 0.78, 0.18]);
    at(f.side, () => kit.person(f.u + 0.45, zt - 0.14, { variant: Math.floor(kit.rand(f.side.salt, 410) * 48), pose: "stand", flip: kit.faces(f.u + 0.45, zt - 0.14, f.u + 0.45, zt + 1) }), SIDEWALK_H);
    taxis++;
  }
  return { doors: lit.length, taxis };
}
