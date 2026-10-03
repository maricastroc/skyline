/**
 * Construction choreography: when each part of a city rises, and what the caption says
 * meanwhile. Presentation only — it re-times the existing parts, never adds or changes them.
 *
 * Order: lots → streets → structures (in reading order) → the landmark → signs & real
 * images → trees and street furniture → lights. Every number in a caption is a count of
 * something in this city or its page; nothing is decorative.
 */
import type { NormalizedDocument } from "../model/types";
import { Surf, type Part, type PixelCity } from "./types";

export interface BuildStage {
  key: "survey" | "lots" | "streets" | "structures" | "landmark" | "signs" | "trees" | "lights" | "done";
  /** Seconds after the city's data arrives. */
  at: number;
  label: string;
  detail?: string;
}

export interface BuildPlan {
  /** New build delay per part, aligned with `city.parts`. */
  delays: number[];
  stages: BuildStage[];
  /** Windows and lamps switch on over [lightsAt, lightsAt + 0.7]. */
  lightsAt: number;
  /** Traffic starts. */
  lifeAt: number;
  done: number;
}

const T = { lots: [0.25, 1.0], streets: [0.75, 1.45], structures: [1.3, 3.3], landmark: [3.1, 3.65], signs: [3.5, 4.1], trees: [3.9, 4.5], lights: 4.55, done: 5.4 } as const;

type Kind = "slab" | "road" | "glow" | "sign" | "landmark" | "scenery" | "structure";

function kindOf(p: Part, landmark: number): Kind {
  if (p.surf === Surf.ROAD) return "road";
  if (p.mesh === "box" && p.h <= 0.2 && p.y <= 0.2) return "slab";
  if (p.mesh === "glow") return "glow";
  if (p.mesh === "sign" || p.mesh === "image") return "sign";
  if (landmark >= 0 && p.node === landmark) return "landmark";
  if (p.node < 0) return "scenery";
  return "structure";
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

export function planConstruction(city: PixelCity, doc: NormalizedDocument | null): BuildPlan {
  const landmarkB = city.buildings.find((b) => b.kind === "landmark");
  const landmark = landmarkB?.node ?? -1;
  const kinds = city.parts.map((p) => kindOf(p, landmark));
  const [ex, ez] = city.entrance;
  const dist = (p: Part) => Math.hypot(p.x - ex, p.z - ez);
  let far = 1;
  for (const p of city.parts) far = Math.max(far, dist(p));
  let dMin = Infinity;
  let dMax = -Infinity;
  let yMax = 0.01;
  city.parts.forEach((p, i) => {
    if (kinds[i] === "structure") {
      dMin = Math.min(dMin, p.delay);
      dMax = Math.max(dMax, p.delay);
    }
    if (kinds[i] === "landmark") yMax = Math.max(yMax, p.y + p.h);
  });
  const span = (r: readonly [number, number], t: number) => r[0] + (r[1] - r[0]) * Math.min(1, Math.max(0, t));

  const delays = city.parts.map((p, i) => {
    switch (kinds[i]) {
      case "slab":
        return span(T.lots, dist(p) / far);
      case "road":
        return span(T.streets, dist(p) / far);
      case "structure":
        return span(T.structures, dMax > dMin ? (p.delay - dMin) / (dMax - dMin) : 0);
      case "landmark":
        return span(T.landmark, p.y / yMax);
      case "sign":
        return span(T.signs, dist(p) / far);
      case "scenery":
        return span(T.trees, dist(p) / far);
      case "glow":
        return T.lights - 0.05;
    }
  });

  const districts = city.zones.filter((z) => z.role === "district").length;
  const hero = city.zones.find((z) => z.role === "entrance");
  const stages: BuildStage[] = [];
  if (doc) stages.push({ key: "survey", at: 0, label: `${plural(doc.stats.elements, "element", "elements")} surveyed` });
  stages.push({ key: "lots", at: T.lots[0], label: districts ? `Laying ${plural(districts, "district", "districts")}` : "Clearing the lot" });
  if (city.roads.length) stages.push({ key: "streets", at: T.streets[0], label: `Paving ${plural(city.roads.length, "street", "streets")}` });
  stages.push({ key: "structures", at: T.structures[0], label: `Building ${plural(city.buildings.length, "structure", "structures")}` });
  if (landmarkB) stages.push({ key: "landmark", at: T.landmark[0], label: "Raising the landmark", detail: hero?.title });
  if (city.images.length) stages.push({ key: "signs", at: T.signs[0], label: `Hanging ${plural(city.images.length, "real image", "real images")}` });
  else if (city.signs.length) stages.push({ key: "signs", at: T.signs[0], label: `Painting ${plural(city.signs.length, "sign", "signs")}` });
  const t = city.palette.time;
  stages.push({ key: "lights", at: T.lights, label: t === "night" ? "Lighting the city" : t === "golden" ? "Golden hour" : "Opening the streets" });
  stages.push({ key: "done", at: T.done, label: "" });
  return { delays, stages, lightsAt: T.lights, lifeAt: T.lights + 0.2, done: T.done };
}
