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
  text: number;
  sample?: string;
  own?: string;
  position?: "fixed" | "sticky";
  bg?: string;
  image?: string;
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
    siteName?: string;
  };
  styles: {
    colors: Array<{ hex: string; weight: number }>;
    signals?: StyleSignals;
  };
  stats: {
    elementCount: number;
    maxDepth: number;
    truncated: boolean;
  };
  root: SnapshotNode;
  warnings: CaptureWarning[];
}
