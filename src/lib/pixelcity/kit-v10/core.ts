// FROZEN: art direction C1, street roles (the street-role kit). Do not edit.
import type { RGB } from "../../city/types";
import { h01 } from "../hash";
import type { GamePalette } from "../palette";
import { textWidth } from "../pixel-font";
import { Surf, type Part, type SignSpec } from "../types";
import { lookOf, PERSON_H, PERSON_W, personRect, type Pose } from "./people";
import { NEUTRAL_SIGNALS, type Anatomy, type SurfaceSignals } from "./surface";

export type PeopleMode = "sprite" | "voxel";
export type KitPart = Omit<Part, "rotY" | "surf" | "lit" | "delay"> & Partial<Pick<Part, "rotY" | "surf" | "lit" | "delay">>;

const SIGN_ATLAS = { w: 512, h: 512 };

export class Kit {
  readonly parts: Part[] = [];
  readonly signs: SignSpec[] = [];
  readonly signAtlas = SIGN_ATLAS;
  readonly smoke: Array<[number, number, number]> = [];
  node = -1;
  surface: SurfaceSignals = NEUTRAL_SIGNALS;
  readonly anatomies: Anatomy[] = [];
  zones?: Array<string | null>;
  zone: string | null = null;
  private shelf = { x: 1, y: 1, h: 0 };
  private f = { x: 0, y: 0, z: 0, r: 0 };

  constructor(
    readonly palette: GamePalette,
    readonly seed: number,
    readonly people: PeopleMode = "sprite",
  ) {}

  get night() {
    return this.palette.time === "night";
  }

  rand(a: number, b = 0) {
    return h01(Math.round(a * 7919) + this.seed * 31, Math.round(b * 104729) + 13);
  }
  pick<T>(list: readonly T[], a: number, b = 0): T {
    return list[Math.floor(this.rand(a, b) * list.length) % list.length];
  }

  frame<T>(x: number, z: number, rot: number, fn: () => T, y = 0): T {
    const p = this.f;
    const c = Math.cos(p.r);
    const s = Math.sin(p.r);
    this.f = { x: p.x + x * c + z * s, y: p.y + y, z: p.z - x * s + z * c, r: p.r + rot };
    try {
      return fn();
    } finally {
      this.f = p;
    }
  }

  toWorld(x: number, y: number, z: number): [number, number, number] {
    const { x: fx, y: fy, z: fz, r } = this.f;
    return [fx + x * Math.cos(r) + z * Math.sin(r), fy + y, fz - x * Math.sin(r) + z * Math.cos(r)];
  }
  smokeAt(x: number, y: number, z: number) {
    this.smoke.push(this.toWorld(x, y, z));
  }

  part(q: KitPart): Part {
    const { x, y, z, r } = this.f;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const p: Part = {
      rotY: 0,
      surf: Surf.PLAIN,
      lit: 0,
      delay: 0,
      ...q,
      node: q.node ?? this.node,
    };
    p.x = x + q.x * c + q.z * s;
    p.z = z - q.x * s + q.z * c;
    p.y = y + q.y;
    p.rotY = (q.rotY ?? 0) + r;
    this.parts.push(p);
    this.zones?.push(this.zone);
    return p;
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, color: RGB, surf: number = Surf.PLAIN, extra: Partial<Part> = {}) {
    return this.part({ mesh: "box", node: this.node, x, y, z, w, h, d, color, surf, ...extra });
  }
  span(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: RGB, surf: number = Surf.PLAIN, extra: Partial<Part> = {}) {
    return this.box((x0 + x1) / 2, y0, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), color, surf, extra);
  }
  cyl(x: number, y: number, z: number, w: number, h: number, d: number, color: RGB, extra: Partial<Part> = {}) {
    return this.part({ mesh: "cyl", node: this.node, x, y, z, w, h, d, color, ...extra });
  }
  glow(x: number, y: number, z: number, w: number, h: number, d: number, color: RGB, strength = 1) {
    return this.part({ mesh: "glow", node: this.node, x, y, z, w, h, d, color, lit: strength });
  }

  sign(text: string, x: number, y: number, z: number, o: { bg: RGB; fg?: RGB; texel?: number; rotY?: number; vertical?: boolean; maxW?: number }) {
    const clean = text
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-!?&:/+#$]/g, "")
      .trim();
    if (!clean) return 0;
    let texel = o.texel ?? 0.075;
    const w = o.vertical ? 7 : textWidth(clean) + 4;
    const h = o.vertical ? clean.replace(/ /g, "").length * 6 + 3 : 9;
    if (o.maxW && !o.vertical && w * texel > o.maxW) texel = o.maxW / w;
    if (this.shelf.x + w + 1 > SIGN_ATLAS.w) this.shelf = { x: 1, y: this.shelf.y + this.shelf.h + 1, h: 0 };
    if (this.shelf.y + h + 1 > SIGN_ATLAS.h) return 0;
    const spec: SignSpec = { text: o.vertical ? `|${clean.replace(/ /g, "")}` : clean, bg: o.bg, fg: o.fg ?? [0.98, 0.97, 0.93], x: this.shelf.x, y: this.shelf.y, w, h };
    this.shelf.x += w + 1;
    this.shelf.h = Math.max(this.shelf.h, h);
    this.signs.push(spec);
    this.part({ mesh: "sign", node: this.node, x, y, z, w: w * texel, h: h * texel, d: 1, color: o.bg, rect: [spec.x, spec.y, spec.w, spec.h], lit: 1, rotY: o.rotY ?? 0 });
    return w * texel;
  }

  person(x: number, z: number, o: { variant: number; pose?: Pose; flip?: boolean; y?: number }) {
    const y = o.y ?? 0;
    const pose = o.pose ?? "stand";
    const shadow = this.palette.road.map((v) => v * 0.55) as RGB;
    if (pose !== "sit") this.box(x, y + 0.002, z, 0.17, 0.006, 0.1, shadow);
    if (this.people === "sprite") {
      this.part({ mesh: "sprite", node: this.node, x, y, z, w: PERSON_W, h: PERSON_H, d: 1, color: [1, 1, 1], rect: personRect(o.variant, pose, o.flip) });
      return;
    }
    const L = lookOf(o.variant);
    const rgb = (hex: string): RGB => {
      const n = parseInt(hex.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    const sit = pose === "sit";
    const legH = sit ? 0.06 : 0.14;
    this.box(x, y, z, 0.085, legH, 0.06, rgb(L.bottom));
    this.box(x, y + legH, z, 0.11, 0.13, 0.07, rgb(L.top));
    this.box(x, y + legH + 0.13, z, 0.075, 0.075, 0.075, rgb(L.skin));
    if (L.hairStyle !== "bald") this.box(x, y + legH + 0.19, z, 0.08, 0.03, 0.08, rgb(L.hairStyle === "cap" ? L.top : L.hair));
  }
}
