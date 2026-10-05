"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { rgbToCss } from "@/lib/city/palette";
import { blockName, compWords } from "@/lib/pixelcity/kit-city";
import { usePixelCity } from "./usePixelCity";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

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
  const { kit, error, loading } = usePixelCity(url);
  const city = kit?.city ?? null;
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
            <b>{host}</b> {city.grammar.time} · {city.grammar.style} · {kit!.structures} bldg
          </div>
          <ol className="px-influences">
            {[...kit!.map.blocks]
              .sort((a, b) => b.lots - a.lots)
              .slice(0, 5)
              .map((b) => (
                <li key={b.t}>
                  <span className="what">{blockName(b)}</span> <span className="eff">→ {b.lots} lots, {compWords(kit!, b.t)}</span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
