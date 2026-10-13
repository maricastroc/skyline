import type { AcquisitionStrategy, CaptureWarning } from "./types";

export interface CaptureCaveat {
  kind: "caveat" | "note";
  code: CaptureWarning["code"] | "rendered";
  line: string;
  detail: string;
}

const ORDER: CaptureWarning["code"][] = ["spa_shell", "truncated", "noscript_heavy", "few_elements"];

const LINE: Record<CaptureWarning["code"], string> = {
  spa_shell: "Scaffolding only: this page builds itself in the browser",
  truncated: "Only the first part of the page was read",
  noscript_heavy: "This page asks for JavaScript to show its content",
  few_elements: "A very small page",
  rendered_unavailable: "Scaffolding only: this page builds itself in the browser",
};

export function captureCaveat(doc: { warnings: CaptureWarning[]; source: { strategy: AcquisitionStrategy } }, asked = false): CaptureCaveat | null {
  const first = ORDER.map((code) => doc.warnings.find((w) => w.code === code)).find(Boolean);
  if (first) {
    if (first.code === "spa_shell" && doc.source.strategy === "rendered")
      return {
        kind: "caveat",
        code: first.code,
        line: "Little to read, even in a browser",
        detail: "This page was opened in a browser and still has almost no text: what it shows is drawn on a canvas, or waits for someone to sign in or to act.",
      };
    const failed = doc.warnings.find((w) => w.code === "rendered_unavailable");
    return { kind: "caveat", code: first.code, line: LINE[first.code], detail: failed ? `${first.message} ${failed.message}` : first.message };
  }
  if (doc.source.strategy === "rendered" && asked)
    return {
      kind: "note",
      code: "rendered",
      line: "Explored in more detail",
      detail: "This city was built from the page the way a browser shows it, following how it is arranged on screen: what sits side by side and how large each item is. It is another reading of the page, so the city can differ from the standard one.",
    };
  if (doc.source.strategy === "rendered")
    return {
      kind: "note",
      code: "rendered",
      line: "Read in a browser",
      detail: "This page assembles itself with JavaScript, so it was opened in a browser and read once it settled.",
    };
  return null;
}
