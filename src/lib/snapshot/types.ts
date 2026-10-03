/**
 * DomSnapshot — the first intermediate representation.
 *
 * Produced by any acquisition strategy (static fetch today, a real browser later) and
 * consumed only by `normalize()`. It carries structure and measurements, never markup:
 * nothing in here can be executed or injected by the client.
 */

import type { StyleSignals } from "./style-signals";

export type AcquisitionStrategy = "static" | "rendered" | "sample";

export type SnapshotAttr =
  | "href"
  | "src"
  | "alt"
  | "role"
  | "type"
  | "width"
  | "height"
  | "aria-label"
  | "aria-hidden"
  | "hidden"
  | "name"
  | "title";

export interface SnapshotNode {
  tag: string;
  id?: string;
  classes?: string[];
  attrs?: Partial<Record<SnapshotAttr, string>>;
  /** Characters of the element's own text (whitespace collapsed). */
  text: number;
  /** Short text sample for elements that are usually labels (headings, buttons, links). */
  sample?: string;
  /** First characters of the element's own (direct) text. */
  own?: string;
  /** Positioning hint, from inline style, class names or simple CSS rules. */
  position?: "fixed" | "sticky";
  /** Background color (#rrggbb) from bgcolor, inline style or a simple CSS rule. */
  bg?: string;
  /** Resolved absolute image URL (img/picture/lazy attributes). */
  image?: string;
  /** Layout box in CSS px. Only rendered captures have it. */
  box?: { x: number; y: number; w: number; h: number };
  children: SnapshotNode[];
}

export interface CaptureWarning {
  code: "spa_shell" | "truncated" | "few_elements" | "noscript_heavy" | "rendered_unavailable";
  message: string;
}

export interface DomSnapshot {
  version: 1;
  source: {
    requestedUrl: string;
    finalUrl: string;
    strategy: AcquisitionStrategy;
    fetchedAt: string;
    status: number;
    bytes: number;
    durationMs: number;
    redirects: string[];
  };
  document: {
    title: string;
    lang?: string;
    description?: string;
    themeColor?: string;
    ogImage?: string;
    /** og:site_name / application-name, when the page declares one. */
    siteName?: string;
  };
  styles: {
    /** Colors found in CSS/attributes, most frequent first, as #rrggbb with weights. */
    colors: Array<{ hex: string; weight: number }>;
    /** Global style signals (radius, spacing, typography, darkness…). */
    signals?: StyleSignals;
  };
  stats: {
    /** Elements seen in <body> before any pruning. */
    elementCount: number;
    maxDepth: number;
    truncated: boolean;
  };
  root: SnapshotNode;
  warnings: CaptureWarning[];
}
