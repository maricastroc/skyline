import { PixelApp } from "@/components/pixel-v1/PixelApp";

export default async function PixelV1Page({ searchParams }: PageProps<"/pixel/v1">) {
  const sp = await searchParams;
  const url = Array.isArray(sp.url) ? sp.url[0] : sp.url;
  return <PixelApp initialUrl={url ?? null} />;
}
