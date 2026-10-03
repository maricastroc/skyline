import { PixelCompare } from "@/components/pixel/PixelCompare";

const DEFAULTS = ["https://en.wikipedia.org/wiki/Brutalist_architecture", "https://news.ycombinator.com", "https://linear.app"];

export default async function ComparePage({ searchParams }: PageProps<"/pixel/compare">) {
  const sp = await searchParams;
  const u = sp.u;
  const urls = (Array.isArray(u) ? u : u ? [u] : DEFAULTS).slice(0, 4);
  const az = Number(Array.isArray(sp.az) ? sp.az[0] : sp.az);
  return <PixelCompare urls={urls} reveal={sp.reveal === "1"} azimuth={Number.isFinite(az) ? az : 45} />;
}
