import type { SiteFingerprint } from "../../fingerprint/fingerprint";
import { normalize } from "../../model/normalize";
import type { DomSnapshot, SnapshotNode } from "../../snapshot/types";
import type { Plan, Territory } from "./plan";
import { structureOf } from "./structure";

const el = (tag: string, o: Partial<SnapshotNode> = {}, children: SnapshotNode[] = []): SnapshotNode => ({ tag, text: 0, ...o, children });

export function headedListsPage(sizes: number[]): DomSnapshot {
  let n = 0;
  const link = () => el("a", { text: 10, sample: `item ${n}`, own: `item ${n}`, attrs: { href: `/i/${n++}` } });
  const ul = (k: number) => el("ul", {}, Array.from({ length: k }, () => el("li", {}, [link()])));
  const body = sizes.length === 1 ? [ul(sizes[0])] : sizes.flatMap((k, i) => [el("h4", { text: 8, sample: `Group ${i}`, own: `Group ${i}` }), ul(k)]);
  const root = el("body", {}, [el("main", {}, body)]);
  const count = (x: SnapshotNode): number => 1 + x.children.reduce((s, c) => s + count(c), 0);
  return { version: 1, source: { requestedUrl: "https://fixture.test/", finalUrl: "https://fixture.test/", strategy: "static", fetchedAt: "", status: 200, bytes: 0, durationMs: 0, redirects: [] }, document: { title: "Fixture" }, styles: { colors: [] }, stats: { elementCount: count(root), maxDepth: 6, truncated: false }, root, warnings: [] };
}

export function groupFixture(sizes: number[], identity: SiteFingerprint): Plan {
  const items = sizes.reduce((a, b) => a + b, 0);
  const t: Territory = {
    key: "fixture|main|",
    region: -1,
    kind: "observed",
    source: "observed",
    label: `${sizes.length} group(s), ${items} items`,
    weight: 1,
    rawWeight: 1,
    repeat: 0,
    metrics: { chars: 1200, links: 120, images: 0, controls: 0, descendants: 260, inTables: 0, items: 0 },
    tier: 1,
    order: 1,
    mix: [{ comp: "parcelled", share: 1 }],
    content: "links",
    why: ["fixture"],
    structure: structureOf(normalize(headedListsPage(sizes)), [0], []),
  };
  return { identity, territories: [t], hero: -1 };
}
