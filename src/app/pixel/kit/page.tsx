import { readFile } from "node:fs/promises";
import path from "node:path";
import { KitView } from "@/components/pixel/KitView";
import type { ArchStyle, TimeOfDay } from "@/lib/pixelcity/grammar";
import type { ProfileName } from "@/lib/pixelcity/kit/district";
import { PERTURBATIONS, realPage, type Perturbation } from "@/lib/pixelcity/kit/real-page";
import { forceStyle, STYLES } from "@/lib/pixelcity/diagnostics";
import { groupFixture } from "@/lib/pixelcity/kit/fixtures";
import { vacantFingerprint } from "@/lib/pixelcity/vacant-fingerprint";
import type { DomSnapshot } from "@/lib/snapshot/types";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PROFILES: ProfileName[] = ["mixed", "portal", "product", "reference"];

export default async function KitPage({ searchParams }: PageProps<"/pixel/kit">) {
  const sp = await searchParams;
  const profile = one(sp.profile) as ProfileName;
  const time = one(sp.time);
  const seed = Number(one(sp.seed));
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
    const page = realPage(snap, perturbation);
    const st = one(sp.style) as ArchStyle;
    if (STYLES.includes(st)) return <KitView {...common} fp={forceStyle(page.fp, st)} profile={{ ...page.plan, identity: forceStyle(page.plan.identity, st) }} />;
    return <KitView {...common} fp={page.fp} profile={page.plan} />;
  }
  const groups = one(sp.groups)?.split(",").map(Number);
  if (groups && groups.length && groups.every((g) => Number.isInteger(g) && g > 0)) return <KitView {...common} fp={vacantFingerprint()} profile={groupFixture(groups, vacantFingerprint())} />;
  return <KitView {...common} fp={vacantFingerprint()} profile={PROFILES.includes(profile) ? profile : "mixed"} />;
}
