// Dev probe: run the server pipeline (acquire → normalize → city) for a URL and print a summary.
// Usage: npx tsx scripts/probe.ts https://example.com
import { fetchStaticPage } from "../src/lib/acquisition/static-fetch";
import { normalizeInputUrl } from "../src/lib/acquisition/url-policy";
import { CaptureError } from "../src/lib/acquisition/errors";
import { normalize } from "../src/lib/model/normalize";
import { generateCity } from "../src/lib/city/generate";
import { LUMEN_SAMPLE_HTML } from "../src/lib/fixtures/lumen";
import { buildSnapshot, parsePage } from "../src/lib/snapshot/parse-html";

async function main() {
  for (const input of process.argv.slice(2)) {
    const t0 = Date.now();
    try {
      const snap =
        input === "sample:lumen"
          ? buildSnapshot(parsePage(LUMEN_SAMPLE_HTML, "https://lumen.example/"), { requestedUrl: input, finalUrl: "https://lumen.example/", strategy: "sample", status: 200, bytes: 0, durationMs: 0, redirects: [] })
          : await fetchStaticPage(normalizeInputUrl(input));
      const doc = normalize(snap);
      const city = generateCity(doc);
      const roles: Record<string, number> = {};
      for (const n of doc.nodes) roles[n.role] = (roles[n.role] ?? 0) + 1;
      const kinds: Record<string, number> = {};
      for (const s of city.structures) kinds[s.mesh] = (kinds[s.mesh] ?? 0) + 1;
      console.log(`\n■ ${input} → ${snap.source.finalUrl} (${Date.now() - t0}ms, ${(snap.source.bytes / 1024).toFixed(0)}KB)`);
      console.log("  title:", snap.document.title, "| warnings:", snap.warnings.map((w) => w.code).join(",") || "-");
      console.log("  stats:", JSON.stringify(doc.stats));
      console.log("  roles:", JSON.stringify(roles));
      console.log("  structures:", city.structures.length, JSON.stringify(kinds), "images:", city.images.length, "arcs:", city.arcs.length);
      console.log("  size:", city.size.w.toFixed(0), "x", city.size.d.toFixed(0), "maxH", city.maxHeight.toFixed(1), "palette:", city.palette.source.join(","), city.palette.css.accent);
      console.log("  districts:", doc.nodes[0].children.map((c) => `${doc.nodes[c].selector}[${doc.nodes[c].role}]`).join("  "));
      if (process.env.TREE) {
        const show = (i: number, ind: string, depth: number) => {
          const n = doc.nodes[i];
          console.log(`${ind}${n.selector} (${n.role}${n.heading ? n.heading : ""}) w=${n.weight} chars=${n.ownChars}${n.wrappers ? ` wr=${n.wrappers}` : ""}${n.label ? ` "${n.label.slice(0, 30)}"` : ""}`);
          if (depth < Number(process.env.TREE)) for (const c of n.children) show(c, ind + "  ", depth + 1);
        };
        show(0, "  ", 0);
      }
    } catch (e) {
      if (e instanceof CaptureError) console.log(`\n■ ${input} → ERROR ${e.code}: ${JSON.stringify(e.toPayload())}`);
      else throw e;
    }
  }
}
main();
