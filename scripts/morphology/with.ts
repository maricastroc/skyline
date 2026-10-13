import { NO_EXPERIMENTS, parseExperiments, type Experiment } from "../../src/lib/semantics/experiments";

const [flags, script] = process.argv.slice(2);
const on = [...parseExperiments(flags)];
for (const e of on) (NO_EXPERIMENTS as Set<Experiment>).add(e);
console.log(`experiments forced on for this run: ${on.join(", ")}`);
process.argv.splice(2, 2);
import(new URL(`../../${script}`, import.meta.url).href);
