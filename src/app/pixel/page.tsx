import { PixelApp, type Variants } from "@/components/pixel/PixelApp";
import { vacantFingerprint } from "@/lib/pixelcity/vacant-fingerprint";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pick = <T extends string>(v: string | undefined, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);

export default async function PixelPage({ searchParams }: PageProps<"/pixel">) {
  const sp = await searchParams;
  const url = one(sp.url);
  const at = one(sp.at);
  const variants: Variants = {
    ui: pick(one(sp.ui), ["grotesk", "editorial", "bitmap"] as const, "grotesk"),
    home: pick(one(sp.home), ["refined", "vacant", "blueprint"] as const, "vacant"),
    cv: pick(one(sp.cv), ["meta", "minimal", "bare"] as const, "meta"),
  };
  return <PixelApp initialUrl={url ?? null} initialAt={at ?? null} vacantFp={vacantFingerprint()} variants={variants} />;
}
