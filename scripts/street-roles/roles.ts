import { readFileSync } from "node:fs";
import { realPage } from "../../src/lib/pixelcity/kit/real-page";
import { planStreets, type StreetRole } from "../../src/lib/pixelcity/kit/street-roles";
import { allocate } from "../../src/lib/pixelcity/kit/territory";
import { DATASET } from "../real-pages/dataset";

const NAME: Record<string, string> = { shop: "IKEA", oldweb: "Paul Graham", directory: "craigslist", institution: "GOV.UK", reference: "Wikipedia", "reference-2": "Wikipedia 2", media: "NASA", saas: "Linear", docs: "Python Docs" };
const ROLES: StreetRole[] = ["primary", "street", "lane", "pedestrian"];
const SYM: Record<StreetRole, string> = { primary: "P", street: "s", lane: "l", pedestrian: "·" };
const order = [...Object.keys(NAME), ...DATASET.map((e) => e.id).filter((id) => !(id in NAME))];
const rows: string[] = ["page          inner (24): primary street lane pedestrian   outer (16): primary street lane pedestrian"];
const detail: string[] = [];
for (const id of order) {
  const p = realPage(JSON.parse(readFileSync(`docs/real-pages/snapshots/${id}.json`, "utf8")));
  const sp = planStreets(p.plan, allocate(p.plan));
  const n = (inner: boolean, r: StreetRole) => sp.segments.filter((s) => (s.line > 0 && s.line < 4) === inner && s.role === r).length;
  rows.push(`${(NAME[id] ?? id).padEnd(13)} ${ROLES.map((r) => String(n(true, r)).padStart(r === "primary" ? 20 : r.length + 1)).join("")}   ${ROLES.map((r) => String(n(false, r)).padStart(r === "primary" ? 20 : r.length + 1)).join("")}`);
  detail.push(`\n## ${NAME[id] ?? id} (${id})`);
  detail.push(`along x, lines 0–4: ${[0, 1, 2, 3, 4].map((l) => [0, 1, 2, 3].map((k) => SYM[sp.role("x", l, k)]).join("")).join(" | ")}`);
  detail.push(`along z, lines 0–4: ${[0, 1, 2, 3, 4].map((l) => [0, 1, 2, 3].map((k) => SYM[sp.role("z", l, k)]).join("")).join(" | ")}`);
  for (const s of sp.segments) detail.push(`  ${s.axis}${s.line}.${s.span} ${s.role.padEnd(10)} ${s.why}`);
}
console.log(rows.join("\n"));
console.log("\nP primary · s street · l lane · · pedestrian");
console.log(detail.join("\n"));
