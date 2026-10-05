// FROZEN: art direction C1, street roles (the street-role kit). Do not edit.
import { mix } from "../../city/palette";
import type { RGB } from "../../city/types";
import { Surf } from "../types";
import type { Kit } from "./core";

export type VehicleType = "sedan" | "hatch" | "taxi" | "van" | "truck" | "bus";

const tyre: RGB = [0.09, 0.09, 0.1];
const white: RGB = [0.97, 0.96, 0.92];

function wheels(kit: Kit, xs: number[], w: number, r = 0.085) {
  for (const x of xs)
    for (const s of [-1, 1]) {
      const z = s > 0 ? w / 2 - 0.05 : -w / 2 - 0.02;
      kit.cyl(x, r, z, r * 2, 0.07, r * 2, tyre, { rotX: Math.PI / 2 });
    }
}

function lights(kit: Kit, L: number, w: number, y: number) {
  for (const s of [-1, 1]) {
    kit.glow(L / 2 + 0.005, y, (s * w) / 3, 0.02, 0.05, 0.08, [1, 0.95, 0.75], kit.night ? 2 : 0.4);
    kit.glow(-L / 2 - 0.005, y, (s * w) / 3, 0.02, 0.05, 0.08, [1, 0.15, 0.12], kit.night ? 1.6 : 0.5);
  }
}

export function vehicle(kit: Kit, x: number, z: number, rot: number, type: VehicleType, color: RGB, label?: string) {
  const glass = mix(kit.palette.glass, [0.1, 0.12, 0.18], 0.35);
  kit.frame(
    x,
    z,
    rot,
    () => {
      if (type === "bus") {
        const L = 2.5;
        const w = 0.62;
        kit.box(0, 0.1, 0, L, 0.58, w, color);
        kit.span(-L / 2 + 0.25, L / 2 - 0.1, 0.36, 0.56, -w / 2 - 0.01, w / 2 + 0.01, glass, Surf.STORE, { lit: kit.night ? 0.9 : 0 });
        kit.span(L / 2 - 0.02, L / 2 + 0.005, 0.3, 0.62, -w / 2 + 0.05, w / 2 - 0.05, glass);
        kit.box(0, 0.68, 0, L - 0.2, 0.04, w - 0.12, mix(color, white, 0.4));
        kit.glow(L / 2 + 0.01, 0.6, 0, 0.01, 0.06, 0.4, [1, 0.75, 0.2], kit.night ? 2 : 0.8);
        wheels(kit, [-L / 2 + 0.45, L / 2 - 0.45], w, 0.1);
        lights(kit, L, w, 0.2);
        return;
      }
      if (type === "truck") {
        const w = 0.56;
        kit.box(-0.35, 0.12, 0, 1.25, 0.62, w, white);
        kit.span(-0.97, 0.27, 0.32, 0.4, -w / 2 - 0.005, w / 2 + 0.005, color);
        if (label) kit.sign(label, -0.35, 0.44, w / 2 + 0.01, { bg: white, fg: color, texel: 0.03, maxW: 1.1 });
        kit.box(0.5, 0.1, 0, 0.42, 0.42, w - 0.02, color);
        kit.span(0.62, 0.72, 0.3, 0.48, -w / 2 + 0.02, w / 2 - 0.02, glass);
        wheels(kit, [-0.75, 0.5], w);
        lights(kit, 1.42, w, 0.22);
        return;
      }
      if (type === "van") {
        const L = 1.05;
        const w = 0.5;
        kit.box(-0.05, 0.1, 0, L - 0.1, 0.46, w, color);
        kit.box(L / 2 - 0.12, 0.1, 0, 0.2, 0.3, w - 0.02, color);
        kit.span(L / 2 - 0.2, L / 2 - 0.08, 0.32, 0.5, -w / 2 + 0.03, w / 2 - 0.03, glass);
        kit.span(-0.2, 0.3, 0.36, 0.48, -w / 2 - 0.005, w / 2 + 0.005, glass);
        wheels(kit, [-0.32, 0.32], w);
        lights(kit, L, w, 0.2);
        return;
      }
      const L = type === "hatch" ? 0.78 : 0.95;
      const w = 0.46;
      kit.box(0, 0.1, 0, L, 0.15, w, color);
      const cl = L * (type === "hatch" ? 0.62 : 0.5);
      const cx = type === "hatch" ? -0.06 : -0.04;
      kit.box(cx, 0.25, 0, cl, 0.14, w - 0.04, glass);
      kit.box(cx, 0.39, 0, cl - 0.06, 0.03, w - 0.06, type === "taxi" ? mix(color, white, 0.1) : color);
      if (type === "taxi") {
        kit.box(cx, 0.42, 0, 0.16, 0.06, 0.1, white);
        kit.glow(cx, 0.43, 0, 0.17, 0.03, 0.11, [1, 0.85, 0.3], kit.night ? 1.4 : 0.3);
      }
      wheels(kit, [-L * 0.3, L * 0.32], w);
      lights(kit, L, w, 0.18);
    },
    0.04,
  );
}
