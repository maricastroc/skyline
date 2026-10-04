/**
 * Diagnostic harness (end-to-end differentiation validation). Nothing in production calls this;
 * it only lets a validation run vary ONE input while holding the page fixed.
 *
 * forceStyle: the same page in another architectural style. Only the fingerprint fields that
 * vote for the style change (typography, legacy markup, roundness, ornament); structure, content,
 * colours, darkness (time of day) and every page signal stay as they are, so territories,
 * compositions and massing heights see the same page.
 */
import type { SiteFingerprint } from "../fingerprint/fingerprint";
import type { ArchStyle } from "./grammar";

export const STYLES: ArchStyle[] = ["classic", "retro", "modern", "soft", "tech"];

export function forceStyle(fp: SiteFingerprint, style: ArchStyle): SiteFingerprint {
  return {
    ...fp,
    type: { serif: style === "classic" ? 1 : 0, sans: style === "modern" ? 1 : 0, mono: style === "tech" ? 1 : 0 },
    legacy: style === "retro" ? 1 : 0,
    roundness: style === "soft" ? 1 : 0,
    ornament: 0,
  };
}
