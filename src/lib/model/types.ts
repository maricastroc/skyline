import type { MediaReport } from "../snapshot/media";
import type { StyleSignals } from "../snapshot/style-signals";
import type { CaptureWarning, DomSnapshot } from "../snapshot/types";

export type NodeRole =
  | "root"
  | "header"
  | "nav"
  | "main"
  | "footer"
  | "aside"
  | "section"
  | "article"
  | "form"
  | "list"
  | "table"
  | "container"
  | "item"
  | "heading"
  | "text"
  | "image"
  | "media"
  | "link"
  | "button"
  | "control"
  | "cluster"
  | "inline"
  | "icon";

export const NodeFlag = {
  FIXED: 1,
  STICKY: 2,
  LANDMARK: 4,
  OWN_CONTENT: 8,
  ARIA_HIDDEN: 16,
} as const;

export interface NNode {
  id: number;
  parent: number;
  /** Nodes are in pre-order: the subtree of node i is exactly [i, end). */
  end: number;
  level: number;
  children: number[];

  tag: string;
  role: NodeRole;
  selector: string;
  label?: string;
  snippet?: string;
  names?: string;
  linkLabels?: string[];
  heading?: number;

  domDepth: number;
  wrappers: number;
  absorbed: number;

  chars: number;
  links: number;
  images: number;
  incidentalImages?: number;
  controls: number;
  childCount: number;
  descendants: number;

  ownChars: number;

  selfWeight: number;
  weight: number;
  flags: number;

  tint?: string;
  image?: { src: string; alt?: string; priority: number; proxy?: string };
  link?: { kind: "anchor" | "internal" | "external"; target?: number; path?: string };
  cluster?: { tag: string; count: number };
}

export interface NormalizedDocument {
  version: 1;
  source: DomSnapshot["source"];
  document: DomSnapshot["document"];
  colors: Array<{ hex: string; weight: number }>;
  style?: StyleSignals;
  nodes: NNode[];
  stats: {
    elements: number;
    maxDomDepth: number;
    images: number;
    links: number;
    headings: number;
    forms: number;
    buttons: number;
    districts: number;
    kept: number;
    pruned: number;
  };
  warnings: CaptureWarning[];
  media?: MediaReport;
}
