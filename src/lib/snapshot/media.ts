import type { SnapshotNode } from "./types";

export type ImageVerdict = "content" | "spacer" | "icon" | "repeated" | "named-ui";
export const INCIDENTAL: ImageVerdict[] = ["spacer", "icon", "repeated", "named-ui"];

export interface MediaReport {
  total: number;
  content: number;
  incidental: number;
  byReason: Record<ImageVerdict, number>;
}

const UI_WORD = /(^|[^a-z])(avatar|icon|emoji|sprite|spinner|badge|bullet|spacer|pixel)s?([^a-z]|$)/i;

const sourceOf = (s: SnapshotNode) => s.image ?? s.attrs?.src ?? (s.attrs?.role === "img" && s.attrs?.["aria-label"] ? `inline:${s.attrs["aria-label"]}` : undefined);

export function countSources(root: SnapshotNode): Map<string, number> {
  const m = new Map<string, number>();
  const walk = (n: SnapshotNode) => {
    const src = n.image ?? n.attrs?.src;
    if (src) m.set(src, (m.get(src) ?? 0) + 1);
    for (const c of n.children) walk(c);
  };
  walk(root);
  return m;
}

export function imageVerdict(s: SnapshotNode, sources: Map<string, number>): ImageVerdict {
  const w = Number(s.attrs?.width);
  const h = Number(s.attrs?.height);
  const dims = [w, h].filter((v) => Number.isFinite(v) && v > 0);
  const described = Boolean(s.attrs?.alt?.trim() || s.attrs?.["aria-label"]?.trim() || s.attrs?.title?.trim());
  const src = sourceOf(s);
  const repeats = src ? (sources.get(src) ?? 1) : 1;
  const inline = !s.image && s.attrs?.role === "img";
  if (dims.length && Math.min(...dims) <= 2) return "spacer";
  if (dims.length && Math.max(...dims) <= 32 && (!described || repeats >= 3 || inline)) return "icon";
  if (!dims.length && !described && repeats >= 5) return "repeated";
  const file = (s.image ?? s.attrs?.src ?? "").split(/[/?#]/).filter(Boolean).slice(-1)[0] ?? "";
  if (!dims.length && UI_WORD.test(`${(s.classes ?? []).join(" ")} ${file}`)) return "named-ui";
  return "content";
}

export const emptyReport = (): MediaReport => ({ total: 0, content: 0, incidental: 0, byReason: { content: 0, spacer: 0, icon: 0, repeated: 0, "named-ui": 0 } });
