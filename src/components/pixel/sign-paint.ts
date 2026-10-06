import { drawGlyph, GLYPH_H } from "../../lib/pixelcity/pixel-font";
import type { RGB } from "../../lib/city/types";
import type { SignSpec } from "../../lib/pixelcity/types";

const css = (rgb: RGB) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;

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
