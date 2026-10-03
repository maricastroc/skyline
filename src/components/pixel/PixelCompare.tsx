"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { rgbToCss } from "@/lib/city/palette";
import { usePixelCity } from "./usePixelCity";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

/**
 * The test for this round: N cities, same camera, domains hidden. If they don't read as
 * different places at a glance, the grammar isn't doing its job.
 */
export function PixelCompare({ urls, reveal: initialReveal, azimuth = 45 }: { urls: string[]; reveal: boolean; azimuth?: number }) {
  const [reveal, setReveal] = useState(initialReveal);
  return (
    <div className="px-compare">
      <header>
        <span>Same camera · {urls.length} cities · domains {reveal ? "shown" : "hidden"}</span>
        <button className="px-btn ghost" onClick={() => setReveal((r) => !r)}>
          {reveal ? "Hide domains" : "Reveal"}
        </button>
      </header>
      <div className="px-panels" style={{ "--n": urls.length } as React.CSSProperties}>
        {urls.map((u, i) => (
          <Panel key={u} url={u} letter={String.fromCharCode(65 + i)} reveal={reveal} azimuth={azimuth} />
        ))}
      </div>
    </div>
  );
}

function Panel({ url, letter, reveal, azimuth }: { url: string; letter: string; reveal: boolean; azimuth: number }) {
  const { city, error, loading } = usePixelCity(url);
  let host = url;
  try {
    host = new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <div className="px-panel" data-ready={city ? "1" : "0"}>
      {city && <PixelScene city={city} interactive={false} view={{ azimuth, zoom: 1, pan: [0, 0] }} />}
      <div className="px-letter">{letter}</div>
      {city && (
        <a className="px-btn px-explore" href={`/pixel?url=${encodeURIComponent(url)}`}>
          Explore →
        </a>
      )}
      {loading && <div className="px-loading">building…</div>}
      {error && <div className="px-loading">{error.title}</div>}
      {reveal && city && (
        <div className="px-reveal" style={{ "--px-accent": rgbToCss(city.palette.accents[0]) } as React.CSSProperties}>
          <div className="px-chip">
            <b>{host}</b> {city.grammar.time} · {city.grammar.style} · {city.buildings.length} bldg
          </div>
          <ol className="px-influences">
            {city.influences.slice(0, 5).map((f, i) => (
              <li key={i}>
                <span className="what">{f.what}</span> <span className="eff">→ {f.effect}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
