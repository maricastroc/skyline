import { drawGlyph, GLYPH_H } from "../../lib/pixelcity/pixel-font";
import type { RGB } from "../../lib/city/types";
import type { SignSpec } from "../../lib/pixelcity/types";

const css = (rgb: RGB) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;

// City signs use the 3×5 pixel font the kit measures them with; only "sans" boards use a canvas font.
export function paintSigns(g: CanvasRenderingContext2D, signs: SignSpec[]) {
  for (const s of signs) {
    g.fillStyle = css(s.bg);
    g.fillRect(s.x, s.y, s.w, s.h);
    g.fillStyle = css(s.bg.map((v) => v * 0.55) as RGB);
    g.fillRect(s.x, s.y, s.w, 1);
    g.fillRect(s.x, s.y + s.h - 1, s.w, 1);
    g.fillRect(s.x, s.y, 1, s.h);
    g.fillRect(s.x + s.w - 1, s.y, 1, s.h);
    g.fillStyle = css(s.fg);
    if (s.font === "sans") {
      paintBoard(g, s);
      continue;
    }
    const dot = (x: number, y: number) => g.fillRect(x, y, 1, 1);
    if (s.text.startsWith("|")) {
      const t = s.text.slice(1);
      for (let i = 0; i < t.length; i++) drawGlyph(t[i], s.x + 2, s.y + 2 + i * (GLYPH_H + 1), dot);
    } else {
      s.text.split("\n").forEach((line, li) => {
        const lw = line.length * 4 - 1;
        const ox = s.x + Math.floor((s.w - lw) / 2);
        for (let i = 0; i < line.length; i++) drawGlyph(line[i], ox + i * 4, s.y + 2 + li * (GLYPH_H + 1), dot);
      });
    }
  }
}

function paintBoard(g: CanvasRenderingContext2D, s: SignSpec) {
  const [head, ...rest] = s.text.split("\n");
  const family = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const fit = (text: string, weight: number, size: number, track: number) => {
    let px = size;
    for (;;) {
      g.font = `${weight} ${px}px ${family}`;
      g.letterSpacing = `${(px * track).toFixed(1)}px`;
      if (g.measureText(text).width <= s.w * 0.84 || px <= 6) return px;
      px -= 1;
    }
  };
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const cx = s.x + s.w / 2;
  const big = fit(head, 800, Math.round(s.h * 0.42), 0.02);
  const headY = s.y + s.h * (rest.length ? 0.5 : 0.66);
  g.fillText(head, cx, headY);
  if (rest.length) {
    if (s.accent) {
      g.fillStyle = css(s.accent);
      g.fillRect(cx - s.w * 0.36, Math.round(headY + big * 0.2), Math.round(s.w * 0.72), Math.max(2, Math.round(s.h * 0.035)));
      g.fillStyle = css(s.fg);
    }
    const small = fit(rest[0], 700, Math.round(s.h * 0.15), 0.16);
    g.fillText(rest.join(" "), cx, Math.round(headY + big * 0.2 + small * 1.75));
  }
  g.letterSpacing = "0px";
}
