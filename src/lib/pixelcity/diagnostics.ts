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
