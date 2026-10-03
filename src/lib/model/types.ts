import type { MediaReport } from "../snapshot/media";
import type { StyleSignals } from "../snapshot/style-signals";
import type { CaptureWarning, DomSnapshot } from "../snapshot/types";

/**
 * NormalizedDocument — the second intermediate representation.
 *
 * A pruned, classified, budgeted version of the DOM that the city generator consumes.
 * Nodes are stored flat in pre-order: the subtree of node `i` is exactly `[i, nodes[i].end)`.
 * That single property makes subtree queries (destruction, integrity, highlighting) O(range).
 */

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
  /** Exclusive end of this node's pre-order subtree range. */
  end: number;
  /** Depth in the normalized tree (root = 0). */
  level: number;
  children: number[];

  tag: string;
  role: NodeRole;
  selector: string;
  label?: string;
  /** First characters of the text this node renders itself (own + absorbed inline). */
  snippet?: string;
  /** id + class names, lowercased, space separated — for semantic heuristics. */
  names?: string;
  /** Labels of links that were absorbed into this node (“new | past | comments”). */
  linkLabels?: string[];
  heading?: number;

  /** Depth in the original DOM (html = 0, body = 1). */
  domDepth: number;
  /** Single-child wrappers collapsed into this node. */
  wrappers: number;
  /** Original elements merged into this node (inline text, pruned leaves, wrappers). */
  absorbed: number;

  /** Metrics of the ORIGINAL subtree — what the inspector shows. */
  chars: number;
  links: number;
  images: number;
  /** Of `images`, those judged incidental imagery (see snapshot/media.ts). */
  incidentalImages?: number;
  controls: number;
  childCount: number;
  descendants: number;

  /** Characters of text this node renders itself (own + absorbed), used for building size. */
  ownChars: number;

  selfWeight: number;
  weight: number;
  flags: number;

  /** The element's own background color on the page (#rrggbb). */
  tint?: string;
  image?: { src: string; alt?: string; priority: number; proxy?: string };
  link?: { kind: "anchor" | "internal" | "external"; target?: number; path?: string };
  cluster?: { tag: string; count: number };
}

export interface NormalizedDocument {
  version: 1;
  source: DomSnapshot["source"];
  document: DomSnapshot["document"];
  /** Raw site colors, most significant first. Harmonized later by the city stage. */
  colors: Array<{ hex: string; weight: number }>;
  /** Global style signals, when the capture could read CSS. */
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
  /** Image census: content media vs incidental imagery, by reason. */
  media?: MediaReport;
}
