/**
 * Content media vs incidental imagery.
 *
 * Every element the model counts as an image (an <img>, a <picture>, an element with an
 * inline background image, or anything with role="img") gets one verdict. The question is
 * only about the page: does this image carry content, or is it there for layout, decoration or
 * interface? Rules, in order (the first that applies decides):
 *
 *   spacer    a declared width or height of 2 px or less: layout spacers, tracking pixels
 *   icon      largest declared side ≤ 32 px AND (it has no text alternative, OR the same image
 *             repeats ≥ 3 times on the page, OR it is an inline vector graphic): bullets, UI
 *             icons, avatars at icon size. A small image with its own description that appears
 *             once (a described thumbnail, a flag in a list) stays content.
 *   repeated  no declared size, no text alternative, and the same image ≥ 5 times on the page:
 *             bullets, separators, rating stars
 *   named-ui  no declared size, and its class or file name is interface vocabulary (avatar,
 *             icon, emoji, sprite, spinner, badge, bullet, spacer, pixel)
 *   content   everything else
 *
 * A text alternative is a non-empty alt, aria-label or title. alt="" is the HTML convention
 * for "decorative", which is why it counts as no alternative. Nothing here depends on any
 * particular site.
 */
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

/** How many times each image source appears on the page. */
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
