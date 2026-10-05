"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { BillboardImage, RGB } from "@/lib/city/types";
import { ATLAS } from "./materials";

export interface AtlasOptions {
  pixelate?: [number, number];
}

export function useAtlas(images: BillboardImage[], paper: RGB, options: AtlasOptions = {}): THREE.CanvasTexture {
  const pixelate = options.pixelate;
  const pw = pixelate?.[0] ?? 0;
  const ph = pixelate?.[1] ?? 0;
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS.size;
    canvas.height = ATLAS.size;
    const g = canvas.getContext("2d")!;
    g.fillStyle = `rgb(${paper.map((v) => Math.round(v * 235)).join(",")})`;
    g.fillRect(0, 0, ATLAS.size, ATLAS.size);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (pw > 0) {
      t.generateMipmaps = false;
      t.minFilter = THREE.NearestFilter;
      t.magFilter = THREE.NearestFilter;
    } else {
      t.anisotropy = 8;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
    }
    return t;
  }, [paper, pw]);

  useEffect(() => {
    let cancelled = false;
    const canvas = texture.image as HTMLCanvasElement;
    const g = canvas.getContext("2d")!;
    const queue = [...images];
    let active = 0;

    const draw = (img: HTMLImageElement, slot: number) => {
      const col = slot % ATLAS.cols;
      const row = Math.floor(slot / ATLAS.cols);
      const x = col * ATLAS.slotW;
      const y = row * ATLAS.slotH;
      const sr = img.naturalWidth / img.naturalHeight;
      const dr = ATLAS.slotW / ATLAS.slotH;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      if (sr > dr) sw = sh * dr;
      else sh = sw / dr;
      const sx = (img.naturalWidth - sw) / 2;
      const sy = (img.naturalHeight - sh) / 2;
      if (pw > 0) {
        const small = document.createElement("canvas");
        small.width = pw;
        small.height = ph;
        const sg = small.getContext("2d")!;
        sg.imageSmoothingQuality = "high";
        sg.drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);
        g.imageSmoothingEnabled = false;
        g.drawImage(small, 0, 0, pw, ph, x, y, ATLAS.slotW, ATLAS.slotH);
      } else g.drawImage(img, sx, sy, sw, sh, x, y, ATLAS.slotW, ATLAS.slotH);
      texture.needsUpdate = true;
    };

    const next = () => {
      while (!cancelled && active < 6 && queue.length) {
        const item = queue.shift()!;
        active++;
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          active--;
          if (!cancelled && img.naturalWidth > 0) draw(img, item.slot);
          next();
        };
        img.onerror = () => {
          active--;
          next();
        };
        img.src = item.src;
      }
    };
    next();
    return () => {
      cancelled = true;
    };
  }, [images, texture, pw, ph]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
