import { SurfaceLabView } from "@/components/pixel/SurfaceLabView";
import type { ArchStyle, TimeOfDay } from "@/lib/pixelcity/grammar";
import { LAB_SETS, type LabSet } from "@/lib/pixelcity/kit/lab";
import { vacantFingerprint } from "@/lib/pixelcity/vacant-fingerprint";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STYLES: ArchStyle[] = ["classic", "retro", "modern", "soft", "tech"];

/**
 * Surface Grammar Lab: buildings in isolation, same camera and palette.
 *   ?set=programs|corners|roofs|styles|sizes  ?style=classic|retro|modern|soft|tech
 *   ?v=4 (before the surface grammar)  ?time=day|night  ?flat=1  ?focus=x,z  ?zoom=n  ?legend=1
 */
export default async function SurfaceLabPage({ searchParams }: PageProps<"/pixel/surface-lab">) {
  const sp = await searchParams;
  const set = (LAB_SETS as string[]).includes(one(sp.set) ?? "") ? (one(sp.set) as LabSet) : "programs";
  const style = (STYLES as string[]).includes(one(sp.style) ?? "") ? (one(sp.style) as ArchStyle) : "classic";
  const time = (["day", "night", "golden"] as string[]).includes(one(sp.time) ?? "") ? (one(sp.time) as TimeOfDay) : "day";
  const f = one(sp.focus)?.split(",").map(Number);
  const z = Number(one(sp.zoom));
  return (
    <SurfaceLabView
      fp={vacantFingerprint()}
      set={set}
      style={style}
      version={one(sp.v) === "4" ? 4 : 5}
      time={time}
      flat={one(sp.flat) === "1"}
      focus={f && f.length === 2 && f.every(Number.isFinite) ? [f[0], f[1]] : undefined}
      zoom={Number.isFinite(z) && z > 0 ? z : undefined}
      legend={one(sp.legend) === "1"}
    />
  );
}
