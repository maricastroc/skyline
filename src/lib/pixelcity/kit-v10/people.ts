// FROZEN: art direction C1, street roles (the street-role kit). Do not edit.
import { h01 } from "../hash";

export const PEOPLE_ATLAS = { w: 256, h: 128, cw: 8, ch: 12 } as const;
export const PERSON_VARIANTS = 48;
export type Pose = "stand" | "walkA" | "walkB" | "sit";
const POSES: Pose[] = ["stand", "walkA", "walkB", "sit"];
export const PERSON_H = 0.39;
export const PERSON_W = (PERSON_H * PEOPLE_ATLAS.cw) / PEOPLE_ATLAS.ch;

export function personRect(variant: number, pose: Pose, flip = false): [number, number, number, number] {
  const idx = (variant % PERSON_VARIANTS) * POSES.length + POSES.indexOf(pose);
  const cols = PEOPLE_ATLAS.w / PEOPLE_ATLAS.cw;
  const x = (idx % cols) * PEOPLE_ATLAS.cw;
  const y = Math.floor(idx / cols) * PEOPLE_ATLAS.ch;
  return flip ? [x + PEOPLE_ATLAS.cw, y, -PEOPLE_ATLAS.cw, PEOPLE_ATLAS.ch] : [x, y, PEOPLE_ATLAS.cw, PEOPLE_ATLAS.ch];
}

const SKIN = ["#f2cfae", "#e0b088", "#b98256", "#8a5a3a", "#5e3b26"];
const HAIR = ["#2b1d15", "#5a3a22", "#c89a4c", "#8d8d8d", "#161616", "#b2462a", "#e8d7a5"];
const TOPS = ["#e2483d", "#2f6fd6", "#f3c13a", "#2fa46a", "#f4f1ea", "#1f2230", "#d9579c", "#ef8a2c", "#6b5bd1", "#46b3c9"];
const BOTTOMS = ["#2c3d63", "#202226", "#6b5a45", "#3f4a3a", "#7a7f8a", "#4a2f5a"];
const SHOES = ["#1b1b1f", "#5a3824", "#e9e6df"];

export interface Look {
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "bald" | "cap";
  top: string;
  bottom: string;
  shoes: string;
  skirt: boolean;
  bag: string | null;
}

export function lookOf(variant: number): Look {
  const r = (k: number) => h01(variant * 31 + 7, k);
  const pick = <T,>(list: T[], k: number) => list[Math.floor(r(k) * list.length) % list.length];
  const hs = r(3);
  return {
    skin: pick(SKIN, 1),
    hair: pick(HAIR, 2),
    hairStyle: hs < 0.45 ? "short" : hs < 0.75 ? "long" : hs < 0.87 ? "cap" : "bald",
    top: pick(TOPS, 4),
    bottom: pick(BOTTOMS, 5),
    shoes: pick(SHOES, 6),
    skirt: r(7) < 0.22,
    bag: r(8) < 0.3 ? pick(["#8a5a32", "#1f2230", "#d9579c", "#f3c13a"], 9) : null,
  };
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawPeopleAtlas(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, PEOPLE_ATLAS.w, PEOPLE_ATLAS.h);
  for (let v = 0; v < PERSON_VARIANTS; v++)
    for (const pose of POSES) {
      const [x, y] = personRect(v, pose);
      drawPerson(g, x + 1, y + 1, lookOf(v), pose);
    }
}

function drawPerson(g: CanvasRenderingContext2D, ox: number, oy: number, L: Look, pose: Pose) {
  const px = (x: number, y: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(ox + x, oy + y, 1, 1);
  };
  const row = (y: number, x0: number, x1: number, c: string) => {
    for (let x = x0; x <= x1; x++) px(x, y, c);
  };
  const topD = shade(L.top, 0.72);
  const botD = shade(L.bottom, 0.72);
  const sit = pose === "sit";
  const dy = sit ? 2 : 0;

  if (L.hairStyle === "bald") row(0 + dy, 2, 3, L.skin);
  else if (L.hairStyle === "cap") {
    row(0 + dy, 1, 4, L.top);
    px(5, 1 + dy, L.top);
  } else row(0 + dy, 1, 4, L.hair);
  row(1 + dy, 1, 4, L.skin);
  row(2 + dy, 2, 4, L.skin);
  if (L.hairStyle === "short" || L.hairStyle === "long") px(1, 1 + dy, L.hair);
  if (L.hairStyle === "long") {
    px(1, 2 + dy, L.hair);
    px(1, 3 + dy, L.hair);
  }
  row(3 + dy, 1, 4, L.top);
  row(4 + dy, 1, 4, L.top);
  row(5 + dy, 1, 4, L.top);
  px(4, 4 + dy, topD);
  px(4, 5 + dy, topD);
  const swing = pose === "walkA" ? 1 : pose === "walkB" ? -1 : 0;
  px(0, 3 + dy, L.top);
  px(0, 4 + dy + Math.max(0, swing), L.skin);
  px(5, 3 + dy, topD);
  px(5, 4 + dy + Math.max(0, -swing), L.skin);
  if (L.bag && !sit) {
    px(5, 5 + dy, L.bag);
    px(5, 6 + dy, L.bag);
  }
  if (sit) {
    row(6 + dy, 1, 5, L.bottom);
    px(5, 7 + dy, botD);
    px(5, 8 + dy, L.shoes);
    px(4, 8 + dy, L.shoes);
    return;
  }
  if (L.skirt) {
    row(6, 1, 4, L.bottom);
    row(7, 0, 5, L.bottom);
    px(2, 8, L.skin);
    px(3, 8, L.skin);
    px(2 - (swing > 0 ? 1 : 0), 9, L.skin);
    px(3 + (swing < 0 ? 1 : 0), 9, L.skin);
  } else {
    row(6, 1, 4, L.bottom);
    if (swing === 0) {
      for (const y of [7, 8, 9]) {
        px(1, y, L.bottom);
        px(2, y, L.bottom);
        px(3, y, botD);
        px(4, y, botD);
      }
    } else {
      const a = swing > 0 ? 0 : 1;
      const b = swing > 0 ? 4 : 3;
      for (const y of [7, 8, 9]) {
        px(a + (y === 7 ? 1 : 0), y, L.bottom);
        px(a + 1, y, L.bottom);
        px(b - (y === 7 ? 1 : 0), y, botD);
        px(b, y, botD);
      }
    }
  }
  const lx = swing > 0 ? 0 : 1;
  const rx = swing > 0 ? 4 : swing < 0 ? 3 : 3;
  px(lx, 10, L.shoes);
  px(lx + 1, 10, L.shoes);
  px(rx, 10, L.shoes);
  px(rx + 1, 10, L.shoes);
}
