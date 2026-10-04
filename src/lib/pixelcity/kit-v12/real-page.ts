// FROZEN: art direction v1, final baseline (C1 street roles, C3 street life, C4 atmosphere). Do not edit.
/**
 * Real-page validation: a frozen DomSnapshot → the facts the kit grammar reads.
 *
 *   snapshot ─(perturb?)─▶ normalize ─▶ analyzeSemantics ─▶ computeFingerprint ─▶ planFromPage
 *
 * Perturbations are small, page-level edits used by the invariance tests: they change the
 * snapshot (never the derived facts), so every downstream stage reacts to them as it would to
 * a slightly different page.
 */
import { computeFingerprint, type SiteFingerprint } from "../../fingerprint/fingerprint";
import { normalize } from "../../model/normalize";
import type { NormalizedDocument } from "../../model/types";
import { analyzeSemantics, type Semantics } from "../../semantics/analyze";
import type { DomSnapshot, SnapshotNode } from "../../snapshot/types";
import { planFromPage, type Plan } from "./plan";

export type Perturbation = "none" | "text-10" | "text+10" | "links-10" | "drop-secondary";
export const PERTURBATIONS: Perturbation[] = ["text-10", "text+10", "links-10", "drop-secondary"];

export interface RealPage {
  doc: NormalizedDocument;
  sem: Semantics;
  fp: SiteFingerprint;
  plan: Plan;
  /** What the perturbation actually changed, in words. */
  perturbed?: string;
}

export function realPage(snapshot: DomSnapshot, perturbation: Perturbation = "none"): RealPage {
  const { snap, note } = perturb(snapshot, perturbation);
  const doc = normalize(snap);
  // Content media only: incidental imagery (spacers, icons, avatars…) does not make a region media.
  // An explicit footer is the footer at any size (so it stays chrome however large it grows).
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true });
  const fp = computeFingerprint(doc);
  return { doc, sem, fp, plan: planFromPage(doc, sem, fp), perturbed: note };
}

/* ───────────────────────── perturbations ───────────────────────── */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function walk(n: SnapshotNode, fn: (n: SnapshotNode, parent: SnapshotNode | null) => void, parent: SnapshotNode | null = null) {
  fn(n, parent);
  for (const c of n.children) walk(c, fn, n);
}
const textOf = (n: SnapshotNode): number => n.text + n.children.reduce((s, c) => s + textOf(c), 0);

function perturb(s: DomSnapshot, p: Perturbation): { snap: DomSnapshot; note?: string } {
  if (p === "none") return { snap: s };
  const snap = clone(s);
  switch (p) {
    case "text-10":
    case "text+10": {
      // Every element's own text, ±10% (as if each paragraph were a little shorter/longer).
      const k = p === "text-10" ? 0.9 : 1.1;
      walk(snap.root, (n) => (n.text = Math.round(n.text * k)));
      return { snap, note: `own text of every element ×${k}` };
    }
    case "links-10": {
      // Remove every tenth link (document order), with its subtree.
      let i = 0;
      let removed = 0;
      walk(snap.root, (n) => {
        n.children = n.children.filter((c) => {
          if (c.tag !== "a") return true;
          if (i++ % 10 !== 9) return true;
          removed++;
          return false;
        });
      });
      return { snap, note: `${removed} of ${i} links removed (every tenth)` };
    }
    case "drop-secondary": {
      // Remove the smallest section-like element that still holds 1–6% of the page's text:
      // a secondary block a redesign could plausibly drop.
      const total = textOf(snap.root) || 1;
      let best: { n: SnapshotNode; parent: SnapshotNode; share: number } | null = null;
      walk(snap.root, (n, parent) => {
        if (!parent || !/^(section|article|aside)$/.test(n.tag)) return;
        const share = textOf(n) / total;
        if (share >= 0.01 && share <= 0.06 && (!best || share < best.share)) best = { n, parent, share };
      });
      if (!best) return { snap, note: "no section-like element with 1–6% of the text: unchanged" };
      const b = best as { n: SnapshotNode; parent: SnapshotNode; share: number };
      b.parent.children = b.parent.children.filter((c) => c !== b.n);
      return { snap, note: `removed <${b.n.tag}${b.n.id ? `#${b.n.id}` : ""}${b.n.classes?.[0] ? `.${b.n.classes[0]}` : ""}> (${(b.share * 100).toFixed(1)}% of the text)` };
    }
  }
}
