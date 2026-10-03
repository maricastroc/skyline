import { readFile } from "node:fs/promises";
import path from "node:path";
import { KitView, type KitSource } from "@/components/pixel/KitView";
import type { TimeOfDay } from "@/lib/pixelcity/grammar";
import type { ProfileName } from "@/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage, type Perturbation } from "@/lib/pixelcity/kit/real-page";
import { realPage as realPageV2 } from "@/lib/pixelcity/kit-v2/real-page";
import { realPage as realPageV3 } from "@/lib/pixelcity/kit-v3/real-page";
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
 *   ?v=1 first kit · ?v=2 massing pass with cycled minors · ?v=3 semantic allocation pass (all
 *   frozen) · default: allocation + semantic hygiene
 */
export default async function KitPage({ searchParams }: PageProps<"/pixel/kit">) {
  const sp = await searchParams;
  const profile = one(sp.profile) as ProfileName;
  const time = one(sp.time);
  const seed = Number(one(sp.seed));
  const v = one(sp.v) === "1" ? 1 : one(sp.v) === "2" ? 2 : one(sp.v) === "3" ? 3 : 4;
  const common = {
    time: time === "night" || time === "golden" || time === "day" ? (time as TimeOfDay) : undefined,
    people: one(sp.people) === "voxel" ? ("voxel" as const) : ("sprite" as const),
    view: one(sp.view) === "street" ? ("street" as const) : one(sp.view) === "close" ? ("close" as const) : ("city" as const),
    flat: one(sp.flat) === "1",
    seed: Number.isFinite(seed) && seed > 0 ? seed : undefined,
    provenance: one(sp.debug) === "provenance",
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
    const page = realPage(snap, perturbation);
    return <KitView {...common} fp={page.fp} source={{ v: 4, profile: page.plan }} />;
  }
  const name = PROFILES.includes(profile) ? profile : "mixed";
  const source: KitSource = v === 1 ? { v: 1 } : v === 2 ? { v: 2, profile: name } : v === 3 ? { v: 3, profile: name } : { v: 4, profile: name };
  return <KitView {...common} fp={vacantFingerprint()} source={source} />;
}
