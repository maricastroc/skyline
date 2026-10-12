import { existsSync, readFileSync, readdirSync } from "node:fs";
import { normalize } from "../../src/lib/model/normalize";
import { buildKitCity } from "../../src/lib/pixelcity/kit-city";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";

const PAIRS = "docs/rendered-capture/snapshots";
const CORPUS = "docs/real-pages/snapshots";
const [mode, ...only] = process.argv.slice(2);
const load = (f: string) => JSON.parse(readFileSync(f, "utf8")) as DomSnapshot;
const textOf = (n: SnapshotNode): number => n.text + n.children.reduce((s, c) => s + textOf(c), 0);
const countOf = (n: SnapshotNode): number => 1 + n.children.reduce((s, c) => s + countOf(c), 0);

const files: Array<{ id: string; file: string }> = [];
for (const f of readdirSync(PAIRS).filter((f) => /-(static|rendered)\.json$/.test(f))) files.push({ id: f.replace(".json", ""), file: `${PAIRS}/${f}` });
for (const f of readdirSync(CORPUS).filter((f) => f.endsWith(".json") && !f.includes(".rejected"))) files.push({ id: `corpus:${f.replace(".json", "")}`, file: `${CORPUS}/${f}` });
const chosen = files.filter((f) => !only.length || only.some((o) => f.id.includes(o)));

const OVERLAY_ROLE = /^(dialog|alertdialog)$/i;
const OVERLAY_NAME = /consent|cookie|onetrust|gdpr|cmp-|didomi|usercentrics|truste|modal|dialog|overlay|popup|pop-up|lightbox|newsletter|paywall|toast|snackbar|interstitial/i;
const WORDS = /cookie|consent|privacy preferences|accept all|reject all|manage preferences|sign up to continue|subscribe to|welcome modal|we value your privacy/i;
const CONSENT = /(^|[#.\s_-])(onetrust|ot-sdk|didomi|usercentrics|truste|cookie-?consent|cookieconsent|cookie-?banner|consent-?(banner|manager|sdk|modal)|gdpr)/i;

function overlays(root: SnapshotNode): Array<{ node: SnapshotNode; why: string }> {
  const out: Array<{ node: SnapshotNode; why: string }> = [];
  const visit = (n: SnapshotNode) => {
    const named = [n.id ?? "", ...(n.classes ?? [])].find((c) => OVERLAY_NAME.test(c));
    const why = n.attrs?.role && OVERLAY_ROLE.test(n.attrs.role) ? `role=${n.attrs.role}` : named ? `named “${named.slice(0, 40)}”` : n.position === "fixed" && textOf(n) > 80 && n.tag !== "header" && n.tag !== "nav" ? "position: fixed" : "";
    if (why && n.tag !== "body" && n.tag !== "html") return void out.push({ node: n, why });
    n.children.forEach(visit);
  };
  visit(root);
  return out;
}

if (mode === "transients") {
  console.log("page                     overlays  text share  elements share   in the city");
  for (const { id, file } of chosen) {
    if (!existsSync(file)) continue;
    const snap = load(file);
    const found = overlays(snap.root).filter((o) => countOf(o.node) >= 3 || textOf(o.node) >= 40);
    const total = Math.max(1, textOf(snap.root));
    const elements = Math.max(1, countOf(snap.root));
    const doc = normalize(snap);
    const kit = buildKitCity(doc);
    const land = kit.map.blocks.filter((b) => b.lots > 0 && WORDS.test(`${b.label ?? ""} ${b.lines.join(" ")} ${b.snippet ?? ""}`));
    const ranges = doc.nodes.map((n, i) => (CONSENT.test(n.selector) ? ([i, n.end] as const) : null)).filter((r): r is readonly [number, number] => !!r);
    const inside = (node: number) => ranges.some(([a, b]) => node >= a && node < b);
    const consentLots = kit.plan.territories.reduce((sum, t, i) => (t.region >= 0 && kit.sem.regions[t.region] && inside(kit.sem.regions[t.region].node) ? sum + kit.lots[i] : sum), 0);
    const consentWeight = ranges.length ? Math.max(...ranges.map(([a]) => doc.nodes[a].weight)) / (doc.nodes[0].weight || 1) : 0;
    if (consentLots > 0 || consentWeight > 0.01) console.log(`${id.padEnd(24)} CONSENT MANAGER: ${(consentWeight * 100).toFixed(1)}% of the page's weight → ${consentLots} lots (${((consentLots / 256) * 100).toFixed(1)}% of the city)`);
    if (!found.length && !land.length) continue;
    const t = found.reduce((s, o) => s + textOf(o.node), 0);
    const e = found.reduce((s, o) => s + countOf(o.node), 0);
    console.log(
      `${id.padEnd(24)} ${String(found.length).padStart(8)}  ${((t / total) * 100).toFixed(1).padStart(9)}%  ${((e / elements) * 100).toFixed(1).padStart(13)}%   ${
        land.length ? land.map((b) => `${b.lots} lots (${((b.lots / 256) * 100).toFixed(1)}%) “${(b.label ?? b.kind).slice(0, 34)}” as ${b.kind}`).join("; ") : "no district of its own"
      }`,
    );
    for (const o of found.slice(0, 4)) console.log(`${" ".repeat(26)}· <${o.node.tag}> ${o.why}, ${countOf(o.node)} elements, ${textOf(o.node)} chars${o.node.sample ? ` “${o.node.sample.slice(0, 50)}”` : ""}`);
  }
} else if (mode === "semantics") {
  for (const { id, file } of chosen) {
    if (!existsSync(file)) continue;
    const snap = load(file);
    const doc = normalize(snap);
    const kit = buildKitCity(doc);
    const total = doc.nodes[0].weight || 1;
    const typed = kit.sem.regions.filter((r) => !["page", "main", "section"].includes(r.kind));
    console.log(`\n■ ${id} — ${snap.stats.elementCount} elements, ${kit.sem.regions.length} regions`);
    for (const r of typed) {
      const n = doc.nodes[r.node];
      const t = kit.plan.territories.findIndex((x) => x.region === r.id);
      console.log(`   ${r.kind.padEnd(9)} ${((n.weight / total) * 100).toFixed(1).padStart(5)}% ${t >= 0 ? `${String(kit.lots[t]).padStart(3)} lots` : "  no land"} ${(r.title ?? "").slice(0, 26).padEnd(26)} ← ${r.evidence.join("; ").slice(0, 150)}`);
    }
  }
} else {
  console.log("usage: tsx scripts/rendered-capture/audit.ts transients|semantics [id ...]");
}
