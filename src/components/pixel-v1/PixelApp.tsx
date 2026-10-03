"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { rgbToCss } from "@/lib/city/palette";
import { usePixelCity } from "./usePixelCity";

const PixelScene = dynamic(() => import("./PixelScene"), { ssr: false });

const EXAMPLES = [
  ["wikipedia", "https://en.wikipedia.org/wiki/Brutalist_architecture"],
  ["hacker news", "https://news.ycombinator.com"],
  ["linear", "https://linear.app"],
  ["portfolio", "https://brittanychiang.com"],
  ["guardian", "https://www.theguardian.com/international"],
];

export function PixelApp({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [draft, setDraft] = useState(initialUrl ?? "");
  const { city, doc, error, loading } = usePixelCity(url);
  const [hudHidden, setHudHidden] = useState(false);
  const [debug, setDebug] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const go = useCallback((u: string) => {
    setPicked(null);
    setUrl(u);
    try {
      window.history.replaceState(null, "", `/pixel/v1?url=${encodeURIComponent(u)}`);
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "KeyH") setHudHidden((v) => !v);
      if (e.code === "KeyG") setDebug((v) => !v);
      if (e.code === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!url || (!city && !loading)) {
    return (
      <div className="px-start">
        <div className="px-start-inner">
          <h1 className="px-title">SKYLINE</h1>
          <p className="px-sub">Turn any website into a tiny living city.</p>
          <form
            className="px-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) go(draft.trim());
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://example.com" spellCheck={false} />
            <button className="px-btn" type="submit">
              Build
            </button>
          </form>
          {error && <p className="px-error">{error.title} — {error.detail}</p>}
          <div className="px-examples">
            {EXAMPLES.map(([label, u]) => (
              <button key={u} onClick={() => go(u)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!city || !doc) return <div className="px-loading">building the city…</div>;

  const accent = rgbToCss(city.palette.accents[0]);
  let host = "";
  try {
    host = new URL(doc.source.finalUrl).hostname.replace(/^www\./, "");
  } catch {}
  const node = picked !== null ? doc.nodes[picked] : hovered !== null ? doc.nodes[hovered] : null;

  return (
    <div style={{ position: "absolute", inset: 0, "--px-accent": accent } as React.CSSProperties}>
      <PixelScene city={city} lines={360} onPick={setPicked} onHover={(n) => setHovered(n)} />
      {!hudHidden && (
        <>
          <button className="px-chip" style={{ left: 12, top: 12, cursor: "pointer" }} onClick={() => setUrl(null)} title="Build another city">
            <b>◆</b> {host}
          </button>
          {node && (
            <div className="px-card" style={{ left: 12, bottom: 40 }}>
              <h3>{node.selector}</h3>
              {node.label && <div style={{ marginBottom: 6 }}>“{node.label.slice(0, 60)}”</div>}
              <dl>
                <dt>depth</dt>
                <dd>{node.domDepth}</dd>
                <dt>chars</dt>
                <dd>{node.chars.toLocaleString("en")}</dd>
                <dt>links</dt>
                <dd>{node.links}</dd>
                <dt>children</dt>
                <dd>{node.childCount}</dd>
              </dl>
            </div>
          )}
          <div className="px-hint">drag pan · scroll zoom · Q/E rotate · click inspect · G grammar · H hide</div>
          {debug && <Debug city={city} />}
        </>
      )}
    </div>
  );
}

function Debug({ city }: { city: NonNullable<ReturnType<typeof usePixelCity>["city"]> }) {
  const fp = city.fingerprint;
  const rows = Object.entries(fp).filter(([, v]) => typeof v === "number" && v <= 1) as Array<[string, number]>;
  return (
    <div className="px-debug">
      <div style={{ marginBottom: 6 }}>fingerprint → grammar</div>
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        {city.grammar.notes.map((n) => (
          <div key={n}>· {n}</div>
        ))}
      </div>
    </div>
  );
}
