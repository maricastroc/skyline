// FROZEN: detail kit after the surface grammar pass (baseline of the openings depth pass). Do not edit.
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
  perturbed?: string;
}

export function realPage(snapshot: DomSnapshot, perturbation: Perturbation = "none"): RealPage {
  const { snap, note } = perturb(snapshot, perturbation);
  const doc = normalize(snap);
  const sem = analyzeSemantics(doc, { contentMedia: true, explicitFooter: true });
  const fp = computeFingerprint(doc);
  return { doc, sem, fp, plan: planFromPage(doc, sem, fp), perturbed: note };
}

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
      const k = p === "text-10" ? 0.9 : 1.1;
      walk(snap.root, (n) => (n.text = Math.round(n.text * k)));
      return { snap, note: `own text of every element ×${k}` };
    }
    case "links-10": {
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
