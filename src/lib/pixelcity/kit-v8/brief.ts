// FROZEN: detail kit after the simple-index program experiment (baseline of the narrow-lot institutional pass). Do not edit.
import { mix } from "../../city/palette";
import type { ArchStyle, CityGrammar } from "../grammar";
import type { GamePalette } from "../palette";
import type { Awning, Family, Ground, Program, Signage, Topside } from "./buildings";
import type { Kit } from "./core";
import { rhythm, type RoofFamily } from "./massing";

export type Role = "landmark" | "major" | "minor" | "support";
export type Content = "text" | "links" | "media" | "action" | "structured";

export interface Brief {
  role: Role;
  content: Content;
  weight: number;
  repeat: number;
  label?: string;
}

const AWNING: Record<ArchStyle, Awning[]> = {
  classic: ["solid", "solid", "stripes"],
  retro: ["stripes", "stripes", "solid"],
  modern: ["canopy", "canopy", "solid"],
  soft: ["solid", "stripes", "canopy"],
  tech: ["canopy", "none", "none"],
};
const TOPSIDE: Record<ArchStyle, Topside[]> = {
  classic: ["hvac", "bare", "hvac"],
  retro: ["tank", "tank", "hvac"],
  modern: ["terrace", "solar", "hvac"],
  soft: ["garden", "terrace", "garden"],
  tech: ["solar", "hvac", "hvac"],
};
const ROOF: Record<ArchStyle, RoofFamily[]> = {
  classic: ["mansard", "mansard", "gable", "flat"],
  retro: ["flat", "flat", "gable"],
  modern: ["flat", "flat", "terrace"],
  soft: ["terrace", "flat", "terrace"],
  tech: ["flat", "flat", "crown"],
};

export function programFor(b: Brief, g: CityGrammar, p: GamePalette, kit: Kit, i: number, corner = false): Program {
  const r = (k: number) => kit.rand(i * 31 + 7, k);
  const ratio = Math.min(1, g.secondaryShare / 0.35);
  const share2 = 0.15 + 0.35 * Math.pow(ratio, 4);
  const [sa, sb] = [g.style, g.secondary].sort();
  const pa = sa === g.style ? 1 - share2 : share2;
  const style: ArchStyle = r(1) < pa ? sa : sb;
  const pick = <T>(list: T[], k: number) => list[Math.floor(r(k) * list.length) % list.length];
  const wall = pick(p.walls[style], 2);
  const accent = p.accents[(i + Math.floor(r(3) * 4)) % p.accents.length];
  const roofColor = style === "classic" ? pick(p.roofs.classic, 4) : style === "retro" ? mix(pick(p.roofs.retro, 4), [0.9, 0.9, 0.9], 0.25) : pick(p.roofs[style], 4);
  const vert = 0.6 + g.verticality * 0.9;
  const floorsBase = b.role === "landmark" ? 12 : b.role === "major" ? 4 + Math.round(b.weight * 10) : b.role === "support" ? 1 : 2 + Math.round(Math.log2(1 + b.weight * 40));
  const floors = Math.max(1, Math.round(floorsBase * vert + (r(5) - 0.5) * 2));
  const base = { seed: 100 + i * 17, style, wall, accent, roofColor, label: b.label, awning: pick(AWNING[style], 6), topside: pick(TOPSIDE[style], 7) };
  const roof = pick(ROOF[style], 8);
  let family: Family;
  let ground: Ground;
  let signage: Signage;
  let facade: Program["facade"] = "framed";
  let bay = 0;
  switch (b.content) {
    case "links":
      family = b.repeat >= 3 ? "rows" : corner ? "corner" : "walkup";
      ground = r(9) < 0.25 ? "cafe" : "shop";
      signage = r(10) < 0.35 ? "blade" : "shop";
      bay = 1;
      break;
    case "media":
      family = b.weight > 0.06 ? "asymmetric" : corner ? "corner" : "walkup";
      ground = r(9) < 0.5 ? "lobby" : "shop";
      signage = r(10) < 0.55 ? "screen" : "billboard";
      facade = style === "classic" || style === "retro" ? "framed" : "curtain";
      bay = 2;
      break;
    case "action":
      family = b.weight < 0.02 ? "kiosk" : corner ? "corner" : "walkup";
      ground = style === "classic" ? "arcade" : "cafe";
      signage = "shop";
      bay = 2;
      break;
    case "structured":
      family = b.weight > 0.05 ? "shed" : "walkup";
      ground = family === "shed" ? "docks" : "lobby";
      signage = "painted";
      facade = "bands";
      break;
    default:
      family = b.weight > 0.08 ? "lshape" : style === "soft" || b.repeat >= 3 ? "apartments" : corner ? "corner" : "walkup";
      ground = corner ? "shop" : "homes";
      signage = corner ? "shop" : "plaque";
      bay = style === "classic" ? 0 : r(11) < 0.5 ? 0 : 1;
  }
  if (b.role === "support") {
    family = "walkup";
    signage = "none";
  }
  const tall = style === "classic" || (style === "retro" && r(12) < 0.4);
  return {
    ...base,
    family,
    floors,
    roof: family === "rows" && style !== "modern" && style !== "tech" ? "gable" : roof,
    facade,
    rhythm: rhythm({ brick: style === "retro" || (style === "classic" && r(13) < 0.5), bay, tall }),
    ground,
    ground2: corner ? (r(14) < 0.5 ? "shop" : "cafe") : undefined,
    signage,
    corner: corner ? (style === "classic" ? "turret" : style === "soft" ? "round" : "square") : undefined,
    units: b.repeat >= 3 ? Math.min(6, 2 + Math.round(b.repeat / 8)) : undefined,
  };
}
