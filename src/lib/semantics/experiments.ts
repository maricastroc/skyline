export const EXPERIMENTS = ["reading", "forum", "market"] as const;
export type Experiment = (typeof EXPERIMENTS)[number];
export type Experiments = ReadonlySet<Experiment>;

export const NO_EXPERIMENTS: Experiments = new Set();

export function parseExperiments(value: string | null | undefined): Experiments {
  if (!value) return NO_EXPERIMENTS;
  const asked = value.split(",").map((s) => s.trim()).filter((s) => s && s !== "none");
  const unknown = asked.filter((s) => !(EXPERIMENTS as readonly string[]).includes(s));
  if (unknown.length) console.warn(`skyline: unknown experiment ignored: ${unknown.join(", ")}`);
  return new Set(EXPERIMENTS.filter((e) => asked.includes(e)));
}
