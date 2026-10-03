// Print SiteFingerprints side by side: npm run fingerprint -- <url…>
import { fetchStaticPage } from "../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../src/lib/acquisition/url-policy";
import { normalize } from "../src/lib/model/normalize";
import { computeFingerprint } from "../src/lib/fingerprint/fingerprint";

async function main() {
const rows: Record<string, string[]> = {};
const heads: string[] = [];
for (const u of process.argv.slice(2)) {
  try {
    const snap = await fetchStaticPage(normalizeInputUrl(u));
    const doc = normalize(snap);
    const fp = computeFingerprint(doc);
    heads.push(new URL(snap.source.finalUrl).hostname.replace(/^www\./, "").slice(0, 16));
    for (const [k, v] of Object.entries(fp)) {
      if (k === "hues" || k === "seed" || k === "background") continue;
      const val = typeof v === "number" ? v.toFixed(2) : Object.entries(v as Record<string, number>).map(([a, b]) => `${a[0]}${b.toFixed(1)}`).join(" ");
      (rows[k] ??= []).push(val);
    }
    (rows["hues"] ??= []).push(fp.hues.slice(0, 3).map((h) => Math.round(h.h)).join(","));
    (rows["bgL"] ??= []).push(fp.background ? fp.background.l.toFixed(2) : "-");
    if (process.env.RAW) console.log(u, JSON.stringify(doc.style));
  } catch (e) {
    heads.push(`ERR ${u.slice(8, 22)}`);
    for (const k of Object.keys(rows)) rows[k].push("-");
    console.error(u, (e as Error).message);
  }
}
console.log("".padEnd(14) + heads.map((h) => h.padEnd(17)).join(""));
for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(14) + v.map((x) => x.padEnd(17)).join(""));
}
main();
