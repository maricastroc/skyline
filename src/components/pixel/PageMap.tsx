"use client";

import { memo, type CSSProperties } from "react";
import type { PageMapData, PMBlock } from "@/lib/pixelcity/page-map";

export type BlockState = "idle" | "active" | "dim" | "unread" | "read";

const MIN: Record<PMBlock["form"], number> = { bar: 15, hero: 70, list: 44, toc: 54, archive: 36, text: 30, media: 46, grid: 40, box: 40, form: 17, footer: 28, quotes: 30, rest: 7 };
const CHROME_H = 18;

function heights(blocks: PMBlock[], H: number): number[] {
  const mins = blocks.map((b) => MIN[b.form] * (b.form === "rest" ? 1 : b.lots > 0 || b.weight > 0.001 ? 1 : 0.8));
  const sumMin = mins.reduce((s, v) => s + v, 0);
  if (sumMin >= H) return mins.map((m) => (m * H) / sumMin);
  let lo = 0;
  let hi = H * 20;
  for (let i = 0; i < 40; i++) {
    const S = (lo + hi) / 2;
    const tot = blocks.reduce((s, b, k) => s + Math.max(mins[k], b.weight * S), 0);
    if (tot > H) hi = S;
    else lo = S;
  }
  return blocks.map((b, k) => Math.max(mins[k], b.weight * lo));
}

const indentOf = (s: string) => {
  const m = /^(\d+(?:\.\d+)*)\s/.exec(s);
  return m ? m[1].split(".").length - 1 : 0;
};

export const PageMap = memo(function PageMap({
  data,
  width,
  height,
  stateOf,
  onHover,
  tagOf,
  className,
  style,
}: {
  data: PageMapData;
  width: number;
  height: number;
  stateOf?: (t: number) => BlockState;
  onHover?: (t: number | null) => void;
  tagOf?: (b: PMBlock) => string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const th = data.theme;
  const hs = heights(data.blocks, height - CHROME_H);
  const vars = {
    "--pm-bg": th.bg,
    "--pm-fg": th.fg,
    "--pm-muted": th.muted,
    "--pm-link": th.link,
    "--pm-accent": th.accent,
    "--pm-rule": th.rule,
    "--pm-head": th.serif ? "Georgia, 'Times New Roman', serif" : th.mono ? "ui-monospace, Menlo, monospace" : "var(--font-geist), Verdana, system-ui, sans-serif",
    "--pm-text": th.mono ? "ui-monospace, Menlo, monospace" : "var(--font-geist), Verdana, system-ui, sans-serif",
    width,
    height,
    ...style,
  } as CSSProperties;
  return (
    <div className={`pm${className ? ` ${className}` : ""}`} data-dark={th.dark ? "1" : "0"} style={vars} onMouseLeave={() => onHover?.(null)}>
      <div className="pm-chrome">
        <i />
        <i />
        <i />
        <span>{data.host}</span>
      </div>
      <div className="pm-page">
        {data.blocks.map((b, k) => {
          const st = stateOf?.(b.t) ?? "idle";
          const tag = tagOf?.(b);
          return (
            <div key={b.t} className="pm-block" data-form={b.form} data-kind={b.kind} data-state={st} data-pm-t={b.t} style={{ height: hs[k] }} onMouseEnter={() => onHover?.(b.t)}>
              <Block b={b} h={hs[k]} />
              {tag ? <span className="pm-tag">{tag}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

function Greek({ n }: { n?: number }) {
  return <div className="pm-greek" style={n ? { maxHeight: n * 5 } : undefined} />;
}

function Img({ src, alt }: { src: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ""} loading="eager" />;
}

function Block({ b, h }: { b: PMBlock; h: number }) {
  const tintStyle = b.tint ? ({ background: b.tint, color: contrastText(b.tint) } as CSSProperties) : undefined;
  switch (b.form) {
    case "bar":
      return (
        <div className="pm-bar" style={tintStyle}>
          {b.label && b.kind === "brand" ? <b>{b.label}</b> : null}
          {b.brand ? <b>{b.brand}</b> : null}
          {b.lines.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      );
    case "footer":
      return (
        <div className="pm-footer" style={tintStyle}>
          {b.lines.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      );
    case "hero":
      return (
        <div className="pm-hero">
          <h1>{b.label}</h1>
          {b.snippet ? <p>{b.snippet}</p> : null}
          {b.lines.length ? (
            <div className="pm-buttons">
              {b.lines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          ) : null}
          {b.images[0] && h > 110 ? (
            <div className="pm-heroimg">
              <Img {...b.images[0]} />
            </div>
          ) : null}
        </div>
      );
    case "toc":
      return (
        <div className="pm-toc">
          {b.label ? <h4>{b.label}</h4> : null}
          {b.lines.map((l, i) => (
            <div key={i} style={{ paddingLeft: indentOf(l) * 7 }}>
              {l}
            </div>
          ))}
        </div>
      );
    case "archive":
      return (
        <div className="pm-archive">
          {b.label ? <h3>{b.label}</h3> : null}
          <ol>
            {b.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
          <Greek />
        </div>
      );
    case "list": {
      const meta = b.lines.length > 0 && h / b.lines.length > 17;
      return (
        <div className="pm-list">
          {b.label ? <h3>{b.label}</h3> : null}
          <ol>
            {b.lines.map((l, i) => (
              <li key={i}>
                <span className="n">{i + 1}.</span> {l}
                {meta ? <span className="meta" /> : null}
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "media":
      return (
        <div className="pm-media">
          {b.label ? <h3>{b.label}</h3> : null}
          <div className="pm-thumbs">
            {(b.images.length ? b.images : [null, null, null]).slice(0, 4).map((im, i) => (
              <figure key={i}>
                {im ? <Img {...im} /> : <span className="ph" />}
                {b.lines[i] ? <figcaption>{b.lines[i]}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      );
    case "grid":
      return (
        <div className="pm-grid">
          {b.label ? <h3>{b.label}</h3> : null}
          <div className="pm-cards">
            {b.lines.slice(b.label && b.lines[0] && b.label.startsWith(b.lines[0].slice(0, 12)) ? 1 : 0, 9).map((l, i) => (
              <div key={i} className="card">
                {b.images[i] && h > 70 ? <Img {...b.images[i]} /> : null}
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "box":
      return (
        <div className="pm-boxwrap">
          {b.kind !== "infobox" && b.label ? <h3>{b.label}</h3> : null}
          <div className="pm-box" style={b.tint ? { background: b.tint } : undefined}>
            {b.kind === "infobox" ? <b>{b.lines[1] ?? b.label}</b> : null}
            {b.images[0] && b.kind === "infobox" ? <Img {...b.images[0]} /> : null}
            {b.lines.slice(b.kind === "infobox" ? 2 : 0, 6).map((l, i) => (
              <div key={i} className="row">
                <span className="k" />
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "form":
      return (
        <div className="pm-form">
          <span className="input">{b.lines[0] ?? b.label ?? ""}</span>
          {b.lines[1] ? <span className="btn">{b.lines[1]}</span> : null}
        </div>
      );
    case "quotes":
      return (
        <div className="pm-quotes">
          {b.lines.slice(0, 3).map((l, i) => (
            <q key={i}>{l}</q>
          ))}
        </div>
      );
    case "rest":
      return <div className="pm-rest" />;
    default:
      return (
        <div className="pm-text">
          {b.label ? <h3 data-level={b.level ?? 2}>{b.label}</h3> : null}
          {b.images[0] && h > 46 ? (
            <span className="pm-float">
              <Img {...b.images[0]} />
            </span>
          ) : null}
          {b.snippet ? <p>{b.snippet}</p> : null}
          <Greek />
        </div>
      );
  }
}

function contrastText(hex: string) {
  const v = parseInt(hex.slice(1), 16);
  const l = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return l > 0.6 ? "#111" : "#fff";
}
