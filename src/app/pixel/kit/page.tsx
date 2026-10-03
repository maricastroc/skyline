import { KitView } from "@/components/pixel/KitView";
import type { ProfileName } from "@/lib/pixelcity/kit/district";
import { vacantFingerprint } from "@/lib/pixelcity/vacant-fingerprint";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const PROFILES: ProfileName[] = ["mixed", "portal", "product", "reference"];

/**
 * Detail-kit prototype: a district built only from the procedural kit.
 *   ?view=city|street|close  ?time=day|night  ?people=sprite|voxel
 *   ?profile=mixed|portal|product|reference  ?flat=1 (silhouette test)  ?v=1 (frozen first kit)
 */
export default async function KitPage({ searchParams }: PageProps<"/pixel/kit">) {
  const sp = await searchParams;
  const profile = one(sp.profile) as ProfileName;
  const time = one(sp.time);
  return (
    <KitView
      fp={vacantFingerprint()}
      time={time === "night" || time === "golden" || time === "day" ? time : undefined}
      people={one(sp.people) === "voxel" ? "voxel" : "sprite"}
      view={one(sp.view) === "street" ? "street" : one(sp.view) === "close" ? "close" : "city"}
      profile={PROFILES.includes(profile) ? profile : "mixed"}
      flat={one(sp.flat) === "1"}
      version={one(sp.v) === "1" ? 1 : 2}
    />
  );
}
