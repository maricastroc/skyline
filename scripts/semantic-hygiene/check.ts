import { readFileSync } from "node:fs";
import { computeFingerprint } from "../../src/lib/fingerprint/fingerprint";
import { normalize } from "../../src/lib/model/normalize";
import { planFromPage, type Plan } from "../../src/lib/pixelcity/kit/plan";
import { analyzeSemantics } from "../../src/lib/semantics/analyze";
import { chromeFactors } from "../../src/lib/semantics/hygiene";
import { countSources, imageVerdict } from "../../src/lib/snapshot/media";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

const el = (tag: string, o: Partial<SnapshotNode> = {}, children: SnapshotNode[] = []): SnapshotNode => ({ tag, text: 0, ...o, children });
const txt = (tag: string, chars: number, sample?: string) => el(tag, { text: chars, sample, own: sample });
const img = (w: number | null, h: number | null, alt?: string, src = "https://example.test/i.png", classes?: string[]) => el("img", { image: src, classes, attrs: { src, ...(alt !== undefined ? { alt } : {}), ...(w ? { width: String(w) } : {}), ...(h ? { height: String(h) } : {}) } });
const link = (chars: number, href = "/x") => el("a", { text: chars, sample: "link", attrs: { href } });
const count = (n: SnapshotNode): number => 1 + n.children.reduce((s, c) => s + count(c), 0);
function page(body: SnapshotNode[]): DomSnapshot {
  const root = el("body", {}, body);
  return {
    version: 1,
    source: { requestedUrl: "https://example.test/", finalUrl: "https://example.test/", strategy: "static", fetchedAt: "", status: 200, bytes: 0, durationMs: 0, redirects: [] },
    document: { title: "Test page" },
    styles: { colors: [] },
    stats: { elementCount: count(root), maxDepth: 8, truncated: false },
    root,
    warnings: [],
  };
}
const planOf = (snap: DomSnapshot): { plan: Plan; sem: ReturnType<typeof analyzeSemantics> } => {
  const doc = normalize(snap);
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true });
  return { plan: planFromPage(doc, sem, computeFingerprint(doc)), sem };
};
const para = (n: number) => Array.from({ length: n }, (_, i) => txt("p", 420 + i * 7));
const section = (title: string, kids: SnapshotNode[]) => el("section", {}, [txt("h2", title.length, title), ...kids]);
const mediaShare = (plan: Plan, pred: (t: Plan["territories"][number]) => boolean) => {
  const ts = plan.territories.filter(pred);
  const w = ts.reduce((s, t) => s + t.weight, 0) || 1;
  return ts.reduce((s, t) => s + t.weight * (t.mix.find((m) => m.comp === "media")?.share ?? 0), 0) / w;
};

{
  const src = (i: number) => `https://example.test/u/${i}.png`;
  const many = el("section", {}, [txt("h2", 12, "Latest posts"), ...Array.from({ length: 24 }, (_, i) => el("div", { classes: ["row"] }, [img(16, 16, "", src(i % 9)), link(48), txt("span", 30)]))]);
  const a = planOf(page([el("main", {}, [many, section("About", para(2))])]));
  const kinds = a.sem.regions.map((r) => r.kind);
  check("many small decorative / repeated images do not make a region media", !kinds.some((k) => k === "gallery" || k === "showcase" || k === "logos") && mediaShare(a.plan, () => true) < 0.15, `kinds ${[...new Set(kinds)].join(",")}, media share ${mediaShare(a.plan, () => true).toFixed(2)}`);
  const photos = el("section", {}, [txt("h2", 7, "Gallery"), ...Array.from({ length: 6 }, (_, i) => el("figure", {}, [img(800, 600, `Photo ${i}`, `https://example.test/p/${i}.jpg`), txt("figcaption", 40)]))]);
  const b = planOf(page([el("main", {}, [photos, section("About", para(2))])]));
  check("a region of real photographs is still media-heavy", mediaShare(b.plan, (t) => t.label === "Gallery") >= 0.5, `media share of the gallery ${mediaShare(b.plan, (t) => t.label === "Gallery").toFixed(2)}`);
  const root = el("div", {}, [img(1, 1), ...Array.from({ length: 6 }, () => img(null, null, undefined, "https://example.test/dot.gif")), img(null, null, "Ana", "https://example.test/a.png", ["avatar"]), img(24, 24, "Brazil", "https://example.test/br.png"), img(640, 480, "")]);
  const s = countSources(root);
  const v = root.children.map((c) => imageVerdict(c, s));
  check("verdicts: spacer, repeated, named-ui, described small image, large decorative image", v[0] === "spacer" && v[1] === "repeated" && v[7] === "named-ui" && v[8] === "content" && v[9] === "content", v.join(" "));
}

{
  const footerShare = (perColumn: number, text = 0) => {
    const cols = Array.from({ length: 4 }, (_, c) => el("div", { classes: ["col"] }, [txt("h3", 10, `Column ${c}`), el("ul", {}, Array.from({ length: perColumn }, () => el("li", {}, [link(16)])))]));
    const { plan } = planOf(page([el("main", {}, Array.from({ length: 6 }, (_, k) => section(`S${k}`, para(4)))), el("footer", { classes: ["site-footer"] }, [...cols, ...(text ? [txt("p", text)] : []), txt("p", 30, "© 2026 Example. All rights reserved.")])]));
    const f = plan.territories.find((t) => t.kind === "footer");
    return { urban: f?.weight ?? NaN, raw: f?.rawWeight ?? NaN };
  };
  const series = [2, 4, 8, 16, 32, 64].map((n) => footerShare(n));
  const mono = series.every((x, i) => i === 0 || x.urban >= series[i - 1].urban - 1e-9);
  check("a footer is detected at every size of the series", series.every((x) => Number.isFinite(x.raw)), series.map((x) => `${(x.raw * 100).toFixed(0)}%→${(x.urban * 100).toFixed(0)}%`).join(" "));
  check("a growing repetitive footer never dominates: urban < 1/2, below raw, monotone, the gap widens", mono && series.every((x) => x.urban < 0.5 && x.urban <= x.raw + 1e-9) && series[5].raw - series[5].urban > series[0].raw - series[0].urban);
  const withText = footerShare(16, 1600);
  check("adding real content inside the footer still raises its weight", withText.urban > series[3].urban, `${(series[3].urban * 100).toFixed(1)}% → ${(withText.urban * 100).toFixed(1)}%`);
  const shares = [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99].map((S) => chromeFactors(S).after);
  check("chrome share S → S/(1+S): never dominates, monotone, ≈ S when small", shares.every((v, i) => v < 0.5 && (i === 0 || v > shares[i - 1])) && Math.abs(shares[0] - 0.01) < 0.001, shares.map((v) => v.toFixed(3)).join(" "));
}

{
  const leaves = [section("Alpha", para(3)), section("Beta", para(3)), section("Gamma", para(3))];
  const nested = section("Wrap", [section("Wrap", [section("Wrap", [section("Wrap", leaves)])])]);
  const a = planOf(page([el("main", {}, [nested])]));
  const rem = a.plan.territories.filter((t) => t.source === "remainder");
  check("nested wrappers without own content produce no remainder territories", rem.length <= 1, `${rem.length} remainder(s), ${a.plan.territories.length} territories, ${a.plan.hygiene?.merges.length} merges`);
  check("every leaf section survives the cleanup", ["Alpha", "Beta", "Gamma"].every((l) => a.plan.territories.some((t) => t.label === l)));
  const own = section("Intro", [txt("p", 900), txt("p", 800), section("Alpha", para(3)), section("Beta", para(3))]);
  const b = planOf(page([el("main", {}, [own, section("Other", para(2))])]));
  const kept = b.plan.territories.find((t) => t.source === "remainder" && t.label === "Intro");
  check("a wrapper's real own content is kept as its own territory", !!kept && kept.weight > 0.05, kept ? `${(kept.weight * 100).toFixed(1)}%` : "missing");
}

{
  const rows = Array.from({ length: 120 }, (_, i) => el("tr", {}, [el("td", {}, [img(1, 5, undefined, "https://example.test/s.gif")]), el("td", {}, [img(12, 12, undefined, "https://example.test/b.gif"), link(30 + (i % 7), `/e${i}`)])]));
  const snap = page([el("table", {}, [el("tr", {}, [el("td", {}, [img(400, 40, undefined, "https://example.test/title.gif")])]), el("tr", {}, [el("td", {}, [el("table", {}, rows)])])])]);
  const a = planOf(snap);
  const b = planOf(snap);
  check("a simple link page gets observed blocks (fallback), not a page-sized remainder", !!a.plan.hygiene?.fallback && a.plan.territories.some((t) => t.source === "observed"), `coverage ${((a.plan.hygiene?.coverage ?? 0) * 100).toFixed(0)}%`);
  check("…with no media caused by its spacers and bullets", mediaShare(a.plan, () => true) < 0.15, `media share ${mediaShare(a.plan, () => true).toFixed(2)}`);
  check("…and deterministically", JSON.stringify(a.plan.territories.map((t) => [t.key, t.weight, t.mix])) === JSON.stringify(b.plan.territories.map((t) => [t.key, t.weight, t.mix])));
}

{
  const files = ["src/lib/snapshot/media.ts", "src/lib/semantics/hygiene.ts"];
  const words = /\b(building|tower|landmark|roof|city|cities|lots?|urban|visual|district)\b/i;
  const hits = files.flatMap((f) =>
    readFileSync(f, "utf8")
      .replace(/sem\.districts/g, "")
      .split("\n")
      .map((l, i) => [f, i + 1, l] as const)
      .filter(([, , l]) => words.test(l)),
  );
  check("extraction / page-model modules never mention the city", hits.length === 0, hits.map(([f, i, l]) => `${f}:${i} ${l.trim().slice(0, 60)}`).join(" | "));
}

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
