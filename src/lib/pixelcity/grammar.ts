import type { SiteFingerprint } from "../fingerprint/fingerprint";

export type TimeOfDay = "day" | "golden" | "night";
export type ArchStyle = "classic" | "modern" | "soft" | "retro" | "tech";

export interface CityGrammar {
  time: TimeOfDay;
  style: ArchStyle;
  secondary: ArchStyle;
  secondaryShare: number;

  units: number;
  coverage: number;
  avenue: number;
  streetLevels: number;
  verticality: number;
  towers: number;
  parks: number;
  trees: number;
  traffic: number;
  billboards: number;
  neon: number;
  industry: number;
  repetition: number;
  roundness: number;
  ornament: number;

  notes: string[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function deriveGrammar(fp: SiteFingerprint): CityGrammar {
  const notes: string[] = [];
  const primary = fp.hues[0];

  let time: TimeOfDay = "day";
  if (fp.darkness > 0.5) {
    time = "night";
    notes.push(`dark page background → night`);
  } else if (primary && primary.h >= 18 && primary.h <= 85 && primary.c > 0.08) {
    time = "golden";
    notes.push(`warm primary hue ${Math.round(primary.h)}° → golden hour`);
  } else notes.push(`light page, ${primary ? `cool hue ${Math.round(primary.h)}°` : "no brand hue"} → daylight`);

  const styles: Record<ArchStyle, number> = {
    classic: fp.type.serif * 2.2,
    modern: fp.type.sans * 0.6 + fp.ornament * 0.3 + fp.imagery * 0.15,
    soft: fp.roundness * 1.1 + fp.airiness * 0.45 + fp.ornament * 0.25,
    retro: fp.legacy * 1.8,
    tech: fp.type.mono * 2.2 + fp.darkness * 0.25 * (1 - fp.roundness),
  };
  const ranked = (Object.entries(styles) as Array<[ArchStyle, number]>).sort((a, b) => b[1] - a[1]);
  const [style, s1] = ranked[0];
  const [secondary, s2] = ranked[1];
  notes.push(
    `architecture: ${style} (${s1.toFixed(2)})` +
      (fp.type.serif > 0.2 ? `, serif type ${Math.round(fp.type.serif * 100)}%` : "") +
      (fp.legacy > 0.3 ? `, legacy HTML` : "") +
      (fp.roundness > 0.4 ? `, rounded UI` : ""),
  );

  const units = Math.round(10 + 110 * Math.pow(fp.size, 1.35) * (0.55 + 0.6 * fp.textDensity));
  const coverage = Math.max(0.32, Math.min(0.92, 0.42 + 0.3 * fp.textDensity + 0.18 * fp.size - 0.5 * fp.airiness));
  notes.push(`${units} buildings, ${Math.round(coverage * 100)}% lot coverage (text density ${fp.textDensity.toFixed(2)}, whitespace ${fp.airiness.toFixed(2)})`);

  const avenue = fp.airiness > 0.55 || fp.linkDensity > 0.6 ? 3 : 2;
  const streetLevels = 1 + Math.round(clamp01(fp.airiness * 1.6 + fp.breadth * 0.8 + (1 - fp.textDensity) * 0.4));
  const verticality = clamp01(0.2 + 0.4 * fp.depth + 0.25 * fp.size + 0.2 * fp.textDensity - 0.25 * fp.airiness);
  notes.push(`verticality ${verticality.toFixed(2)} (DOM depth ${fp.depth.toFixed(2)})`);

  const parks = clamp01(fp.airiness * 0.9 + (1 - coverage) * 0.4);
  const traffic = clamp01(fp.linkDensity * 1.1);
  const billboards = clamp01(fp.imagery);
  const neon = clamp01(fp.darkness * 0.5 + fp.interactivity * 0.4 + fp.ornament * 0.3);
  const industry = clamp01(fp.forms * 0.35 + fp.legacy * 0.5 + fp.type.mono * 0.6);
  notes.push(`traffic ${traffic.toFixed(2)} (links), billboards ${billboards.toFixed(2)} (images), parks ${parks.toFixed(2)} (whitespace)`);

  return {
    time,
    style,
    secondary,
    secondaryShare: s1 > 0 ? clamp01((s2 / s1) * 0.35) : 0,
    units,
    coverage,
    avenue,
    streetLevels,
    verticality,
    towers: clamp01(0.25 + fp.headings * 1.2),
    parks,
    trees: clamp01(parks * 0.85 + (style === "classic" ? 0.2 : 0)),
    traffic,
    billboards,
    neon,
    industry,
    repetition: fp.regularity,
    roundness: fp.roundness,
    ornament: fp.ornament,
    notes,
  };
}
