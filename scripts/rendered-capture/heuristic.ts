import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isMarkupWithoutWords } from "../../src/lib/snapshot/parse-html";
import type { DomSnapshot, SnapshotNode } from "../../src/lib/snapshot/types";
import { DATASET } from "./dataset";

const PAIRS = "docs/rendered-capture/snapshots";
const CORPUS = "docs/real-pages/snapshots";
const load = (f: string) => JSON.parse(readFileSync(f, "utf8")) as DomSnapshot;
const walk = (n: SnapshotNode, fn: (n: SnapshotNode) => void) => {
  fn(n);
  for (const c of n.children) walk(c, fn);
};

export interface Signals {
  elements: number;
  text: number;
  kb: number;
  bytes: number;
  flagged: boolean;
  skeletons: number;
  emptyMain: boolean;
  consent: number;
}
const SKELETON = /skeleton|shimmer|placeholder|spinner|loading|ghost/i;
const CONSENT = /consent|cookie|onetrust|gdpr|didomi|usercentrics|truste/i;

export function signals(s: DomSnapshot): Signals {
  let text = 0;
  let skeletons = 0;
  let mainText = -1;
  const sum = (n: SnapshotNode): number => n.text + n.children.reduce((a, c) => a + sum(c), 0);
  let consent = 0;
  const skip = (n: SnapshotNode) => {
    if ([n.id ?? "", ...(n.classes ?? [])].some((c) => CONSENT.test(c))) return void (consent += sum(n));
    n.children.forEach(skip);
  };
  skip(s.root);
  walk(s.root, (n) => {
    text += n.text;
    if (n.classes?.some((c) => SKELETON.test(c)) || (n.id && SKELETON.test(n.id))) skeletons++;
    if (mainText < 0 && (n.tag === "main" || n.attrs?.role === "main")) mainText = sum(n);
  });
  return {
    elements: s.stats.elementCount,
    text,
    kb: Math.round(s.source.bytes / 1024),
    bytes: s.source.bytes,
    flagged: s.warnings.some((w) => w.code === "spa_shell"),
    skeletons,
    emptyMain: mainText === 0,
    consent,
  };
}

const perElement = (g: Signals) => g.text / Math.max(g.elements, 1);
const perKb = (g: Signals) => g.text / Math.max(g.kb, 1);
const RULES: Record<string, (g: Signals & { flagged0: boolean }) => boolean> = {
  "before (looksLikeSpaShell as it was)": (g) => g.flagged0,
  "+ markup without words (≥ 60 elements, < 2 chars per element, < 2 chars per KB) — ADOPTED": (g) => g.flagged0 || isMarkupWithoutWords(g.elements, g.text, g.bytes),
  "+ few chars per element alone (≥ 60 elements, < 2 chars each)": (g) => g.flagged0 || (g.elements >= 60 && perElement(g) < 2),
  "+ few chars per KB alone (< 2)": (g) => g.flagged0 || perKb(g) < 2,
  "+ skeleton names (≥ 30% of the elements)": (g) => g.flagged0 || g.skeletons / Math.max(g.elements, 1) >= 0.3,
  "+ any page under 1,000 chars (too wide, for contrast)": (g) => g.flagged0 || g.text < 1000,
};

interface Case {
  id: string;
  group: string;
  s: Signals & { flagged0: boolean };
  rendered?: { elements: number; text: number; regions: number };
  regions?: number;
  incomplete: boolean | null;
  how?: string;
}
const measured = new Map<string, { static?: number; rendered?: number }>();
if (existsSync("docs/rendered-capture/compare.json")) {
  const rows = JSON.parse(readFileSync("docs/rendered-capture/compare.json", "utf8")).rows as Array<{ entry: { id: string }; static: { ok: boolean; m?: { regions: number } }; rendered: { ok: boolean; m?: { regions: number } } }>;
  for (const r of rows) measured.set(r.entry.id, { static: r.static.m?.regions, rendered: r.rendered.m?.regions });
}
const before = (s: DomSnapshot, g: Signals) => {
  const mounts = new Set(["root", "app", "__next", "___gatsby", "__nuxt", "svelte", "main-app", "application"]);
  const hasMount = s.root.children.some((c) => (c.id && mounts.has(c.id)) || c.tag === "app-root" || c.tag.includes("-"));
  return (g.text < 120 && g.elements < 60) || (hasMount && g.text < 400 && g.elements < 120) || (g.flagged && g.elements < 120);
};

const cases: Case[] = [];
for (const e of DATASET) {
  const a = `${PAIRS}/${e.id}-static.json`;
  const b = `${PAIRS}/${e.id}-rendered.json`;
  if (!existsSync(a)) continue;
  const sa = load(a);
  const g = signals(sa);
  const s = { ...g, flagged0: before(sa, g) };
  if (!existsSync(b)) {
    cases.push({ id: e.id, group: e.group, s, incomplete: null });
    continue;
  }
  const r = signals(load(b));
  const m = measured.get(e.id) ?? {};
  const structure = (m.static ?? 99) <= 1 && (m.rendered ?? 0) >= 4;
  const [w0, w1] = [s.text - s.consent, r.text - r.consent];
  const words = w1 >= 3 * Math.max(w0, 1) && w1 - w0 >= 1500;
  cases.push({ id: e.id, group: e.group, s, regions: m.static, rendered: { elements: r.elements, text: w1, regions: m.rendered ?? -1 }, incomplete: structure || words, how: [structure ? "structure" : "", words ? "words" : ""].filter(Boolean).join("+") });
}
for (const f of readdirSync(CORPUS).filter((f) => f.endsWith(".json") && !f.includes(".rejected"))) {
  const sc = load(`${CORPUS}/${f}`);
  const g = signals(sc);
  cases.push({ id: `corpus:${f.replace(".json", "")}`, group: "corpus", s: { ...g, flagged0: before(sc, g) }, incomplete: false });
}

const pad = (v: unknown, n: number) => String(v).padStart(n);
console.log(`${"page".padEnd(22)} ${"group".padEnd(8)} ${pad("el", 6)} ${pad("text", 7)} ${pad("KB", 5)} ${pad("ch/el", 6)} ${pad("ch/KB", 6)} ${pad("skel", 4)} ${pad("reg", 3)} flag │ ${pad("el*", 6)} ${pad("text*", 7)} ${pad("reg*", 4)}  as served`);
for (const c of cases)
  console.log(
    `${c.id.padEnd(22)} ${c.group.padEnd(8)} ${pad(c.s.elements, 6)} ${pad(c.s.text, 7)} ${pad(c.s.kb, 5)} ${pad(perElement(c.s).toFixed(1), 6)} ${pad(perKb(c.s).toFixed(1), 6)} ${pad(c.s.skeletons, 4)} ${pad(c.regions ?? "-", 3)} ${c.s.flagged0 ? " yes" : "  no"} │ ${pad(c.rendered?.elements ?? "-", 6)} ${pad(c.rendered?.text ?? "-", 7)} ${pad(c.rendered?.regions ?? "-", 4)}  ${c.incomplete === null ? "unknown (no rendered capture)" : c.incomplete ? `INCOMPLETE (${c.how})` : "complete"}`,
  );

const known = cases.filter((c) => c.incomplete !== null);
const incomplete = known.filter((c) => c.incomplete);
const complete = known.filter((c) => !c.incomplete);
console.log(`\n${incomplete.length} incomplete as served, ${complete.length} complete (of which ${complete.filter((c) => c.group === "corpus").length} from the frozen corpus)\n`);
for (const [name, rule] of Object.entries(RULES)) {
  const caught = incomplete.filter((c) => rule(c.s));
  const missed = incomplete.filter((c) => !rule(c.s));
  const wasted = complete.filter((c) => rule(c.s));
  console.log(`${name}\n   catches ${caught.length}/${incomplete.length}${missed.length ? `, misses ${missed.map((c) => c.id).join(", ")}` : ""}\n   opens a browser for nothing on ${wasted.length}/${complete.length}${wasted.length ? `: ${wasted.map((c) => c.id).join(", ")}` : ""}`);
}
