import { readFile } from "node:fs/promises";
import path from "node:path";
import { KitView, type KitSource } from "@/components/pixel/KitView";
import type { ArchStyle, TimeOfDay } from "@/lib/pixelcity/grammar";
import type { ProfileName } from "@/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage, type Perturbation } from "@/lib/pixelcity/kit/real-page";
import { realPage as realPageV2 } from "@/lib/pixelcity/kit-v2/real-page";
import { realPage as realPageV3 } from "@/lib/pixelcity/kit-v3/real-page";
import { realPage as realPageV4 } from "@/lib/pixelcity/kit-v4/real-page";
import { realPage as realPageV5 } from "@/lib/pixelcity/kit-v5/real-page";
import { realPage as realPageV6 } from "@/lib/pixelcity/kit-v6/real-page";
import { realPage as realPageV7 } from "@/lib/pixelcity/kit-v7/real-page";
import { realPage as realPageV8 } from "@/lib/pixelcity/kit-v8/real-page";
import { realPage as realPageV9 } from "@/lib/pixelcity/kit-v9/real-page";
import { forceStyle, STYLES } from "@/lib/pixelcity/diagnostics";
import { groupFixture } from "@/lib/pixelcity/kit/fixtures";
import { vacantFingerprint } from "@/lib/pixelcity/vacant-fingerprint";
import type { DomSnapshot } from "@/lib/snapshot/types";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PROFILES: ProfileName[] = ["mixed", "portal", "product", "reference"];

/**
 * Detail-kit prototype: a district built only from the procedural kit.
 *   ?view=city|street|close  ?time=day|night  ?people=sprite|voxel  ?flat=1 (silhouette test)
 *   ?profile=mixed|portal|product|reference
 *   ?page=<id> (a frozen real page, docs/real-pages/snapshots)  &perturb=text-10|…  &seed=<n>
 *   ?debug=provenance (territories in debug colours + legend; current generator)
 *   ?debug=surface (click a building: its anatomy, why each zone, what is absent and why)
 *   ?debug=streets (art direction C1: every street in its role's colour + legend; current generator)
 *   ?v=1 first kit · ?v=2 massing pass with cycled minors · ?v=3 semantic allocation pass ·
 *   ?v=4 semantic hygiene pass · ?v=5 architectural surface grammar · ?v=6 openings depth ·
 *   ?v=7 intra-territory composition · ?v=8 simple-index program experiment ·
 *   ?v=9 semantic / architectural foundation v1 (all frozen) · default: current
 *   ?style=classic|retro|modern|soft|tech (diagnostic: the same page forced into a style)
 *   ?groups=60,60 (fixture: one parcelled territory whose content is in groups of these sizes)
 */
export default async function KitPage({ searchParams }: PageProps<"/pixel/kit">) {
  const sp = await searchParams;
  const profile = one(sp.profile) as ProfileName;
  const time = one(sp.time);
  const seed = Number(one(sp.seed));
  const v = one(sp.v) === "1" ? 1 : one(sp.v) === "2" ? 2 : one(sp.v) === "3" ? 3 : one(sp.v) === "4" ? 4 : one(sp.v) === "5" ? 5 : one(sp.v) === "6" ? 6 : one(sp.v) === "7" ? 7 : one(sp.v) === "8" ? 8 : one(sp.v) === "9" ? 9 : 10;
  const common = {
    time: time === "night" || time === "golden" || time === "day" ? (time as TimeOfDay) : undefined,
    people: one(sp.people) === "voxel" ? ("voxel" as const) : ("sprite" as const),
    view: one(sp.view) === "street" ? ("street" as const) : one(sp.view) === "close" ? ("close" as const) : ("city" as const),
    flat: one(sp.flat) === "1",
    seed: Number.isFinite(seed) && seed > 0 ? seed : undefined,
    provenance: one(sp.debug) === "provenance",
    inspect: one(sp.debug) === "surface",
    streets: one(sp.debug) === "streets",
    focus: (() => {
      const f = one(sp.focus)?.split(",").map(Number);
      return f && f.length === 2 && f.every(Number.isFinite) ? ([f[0], f[1]] as [number, number]) : undefined;
    })(),
    zoom: Number.isFinite(Number(one(sp.zoom))) && Number(one(sp.zoom)) > 0 ? Number(one(sp.zoom)) : undefined,
  };
  const id = one(sp.page);
  if (id && /^[a-z0-9-]+$/.test(id)) {
    const file = path.join(process.cwd(), "docs/real-pages/snapshots", `${id}.json`);
    const snap = JSON.parse(await readFile(file, "utf8")) as DomSnapshot;
    const pt = one(sp.perturb) as Perturbation;
    const perturbation = PERTURBATIONS.includes(pt) ? pt : "none";
    if (v === 2) {
      const page = realPageV2(snap, perturbation);
      // Only what the generator reads crosses to the client.
      const { identity, majors, minors } = page.profile;
      return <KitView {...common} fp={page.fp} source={{ v: 2, profile: { identity, majors, minors } }} />;
    }
    if (v === 3) {
      const page = realPageV3(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 3, profile: page.plan }} />;
    }
    if (v === 4) {
      const page = realPageV4(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 4, profile: page.plan }} />;
    }
    if (v === 5) {
      const page = realPageV5(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 5, profile: page.plan }} />;
    }
    if (v === 6) {
      const page = realPageV6(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 6, profile: page.plan }} />;
    }
    if (v === 7) {
      const page = realPageV7(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 7, profile: page.plan }} />;
    }
    if (v === 8) {
      const page = realPageV8(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 8, profile: page.plan }} />;
    }
    if (v === 9) {
      const page = realPageV9(snap, perturbation);
      return <KitView {...common} fp={page.fp} source={{ v: 9, profile: page.plan }} />;
    }
    const page = realPage(snap, perturbation);
    // Diagnostic (end-to-end validation): the same page forced into another style.
    const st = one(sp.style) as ArchStyle;
    if (STYLES.includes(st)) return <KitView {...common} fp={forceStyle(page.fp, st)} source={{ v: 10, profile: { ...page.plan, identity: forceStyle(page.plan.identity, st) } }} />;
    return <KitView {...common} fp={page.fp} source={{ v: 10, profile: page.plan }} />;
  }
  // Fixture (intra-territory composition): one parcelled territory, its content in groups of these sizes.
  const groups = one(sp.groups)?.split(",").map(Number);
  if (groups && groups.length && groups.every((g) => Number.isInteger(g) && g > 0)) return <KitView {...common} fp={vacantFingerprint()} source={{ v: 10, profile: groupFixture(groups, vacantFingerprint()) }} />;
  const name = PROFILES.includes(profile) ? profile : "mixed";
  const source: KitSource = v === 1 ? { v: 1 } : v === 2 ? { v: 2, profile: name } : v === 3 ? { v: 3, profile: name } : v === 4 ? { v: 4, profile: name } : v === 5 ? { v: 5, profile: name } : v === 6 ? { v: 6, profile: name } : v === 7 ? { v: 7, profile: name } : v === 8 ? { v: 8, profile: name } : v === 9 ? { v: 9, profile: name } : { v: 10, profile: name };
  return <KitView {...common} fp={vacantFingerprint()} source={source} />;
}
