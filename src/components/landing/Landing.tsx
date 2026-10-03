"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureErrorPayload } from "@/lib/acquisition/errors";

export interface Step {
  key: string;
  text: string;
  at: number;
  done: boolean;
}

const EXAMPLES: Array<{ label: string; url: string; note: string }> = [
  { label: "wikipedia.org", url: "https://en.wikipedia.org/wiki/Brutalist_architecture", note: "deep, text-heavy" },
  { label: "news.ycombinator.com", url: "https://news.ycombinator.com", note: "tables, 1990s" },
  { label: "gov.uk", url: "https://www.gov.uk", note: "semantic" },
  { label: "stripe.com", url: "https://stripe.com", note: "marketing" },
  { label: "sample", url: "sample:lumen", note: "offline" },
];

export function Landing({
  busy,
  leaving,
  steps,
  error,
  initial,
  onSubmit,
}: {
  busy: boolean;
  leaving: boolean;
  steps: Step[];
  error: CaptureErrorPayload | null;
  initial: string;
  onSubmit: (url: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!busy) input.current?.focus();
  }, [busy]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!busy && value.trim()) onSubmit(value.trim());
  };

  return (
    <div className={`landing ${leaving ? "landing--leaving" : ""}`}>
      <div className="landing-inner">
        <div className="landing-eyebrow">
          <span className="brand-mark" aria-hidden /> Skyline · DOM survey instrument
        </div>
        <h1 className="landing-title">
          Turn any website
          <br />
          into a city.
        </h1>

        <form className="landing-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="url">
            Website address
          </label>
          <input
            id="url"
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://example.com"
            spellCheck={false}
            autoComplete="url"
            inputMode="url"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !value.trim()}>
            {busy ? "Surveying…" : "Build the city"}
          </button>
        </form>

        {busy || steps.length ? (
          <ol className="steps" aria-live="polite">
            {steps.map((s) => (
              <li key={s.key} className={s.done ? "done" : "active"}>
                <span className="mark">{s.done ? "■" : "□"}</span>
                <span className="text">{s.text}</span>
                <span className="at num">{(s.at / 1000).toFixed(2)}s</span>
              </li>
            ))}
          </ol>
        ) : error ? (
          <div className="capture-error" role="alert">
            <div className="code">
              {error.code.replace(/_/g, " ")}
              {error.status ? ` · HTTP ${error.status}` : ""}
            </div>
            <h2>{error.title}</h2>
            <p>{error.detail}</p>
            {error.hint && <p className="hint">{error.hint}</p>}
          </div>
        ) : (
          <p className="landing-lede">
            Paste a public address. Its real HTML becomes a model city: sections are blocks, headings are towers, images are
            billboards, nesting is elevation. Then walk through it — or take it apart, node by node.
          </p>
        )}

        <div className="examples">
          <span>Try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              disabled={busy}
              onClick={() => {
                setValue(ex.url);
                onSubmit(ex.url);
              }}
            >
              {ex.label}
              <em>{ex.note}</em>
            </button>
          ))}
        </div>
      </div>
      <footer className="landing-foot">
        Static HTML capture · public HTTPS pages only · nothing from the page is executed
      </footer>
    </div>
  );
}
