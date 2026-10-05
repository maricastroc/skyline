interface PostcardOptions {
  name: string;
  host: string;
  accent: string;
  display: string;
  mono: string;
  displayWeight: string;
  upper: boolean;
}

export async function makePostcard(source: HTMLCanvasElement, o: PostcardOptions): Promise<Blob | null> {
  const scale = Math.max(2, Math.round(2400 / source.width));
  const out = document.createElement("canvas");
  out.width = source.width * scale;
  out.height = source.height * scale;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, out.width, out.height);

  const W = out.width;
  const H = out.height;
  const m = Math.round(H * 0.055);
  const g = ctx.createRadialGradient(0, H, 0, 0, H, H * 0.9);
  g.addColorStop(0, "rgba(8,8,12,0.62)");
  g.addColorStop(0.5, "rgba(8,8,12,0.25)");
  g.addColorStop(1, "rgba(8,8,12,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  await document.fonts.ready;
  const big = Math.round(H * 0.075);
  const small = Math.round(H * 0.024);
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = small;
  ctx.fillStyle = "#f6f4ef";
  ctx.font = `${o.displayWeight} ${big}px ${o.display}`;
  ctx.fillText(o.upper ? o.name.toUpperCase() : o.name, m, H - m - small * 1.9);
  ctx.font = `400 ${small}px ${o.mono}`;
  ctx.fillStyle = "rgba(246,244,239,0.78)";
  ctx.fillText(o.host, m, H - m);
  ctx.textAlign = "right";
  ctx.fillText("Skyline", W - m, H - m);
  const logo = new Image();
  logo.src = "/logo.svg";
  try {
    await logo.decode();
    const s = small * 1.7;
    ctx.drawImage(logo, W - m - ctx.measureText("Skyline").width - small * 0.45 - s, H - m - s * 0.78, s, s);
  } catch {}

  return new Promise((resolve) => out.toBlob((b) => resolve(b), "image/png"));
}
