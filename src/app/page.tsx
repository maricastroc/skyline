import { redirect } from "next/navigation";

/** The pixel city is the app; `/?url=…` keeps working and lands there. The maquette is at /maquette. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v ? [v] : []) qs.append(k, x);
  const q = qs.toString();
  redirect(q ? `/pixel?${q}` : "/pixel");
}
