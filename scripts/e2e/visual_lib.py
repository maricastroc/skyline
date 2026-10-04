"""Image features and component distances shared by visual.py and the composition checks."""

import json, os, itertools
import numpy as np
from PIL import Image

ROOT = "docs/screenshots/e2e/"
PAGES = "reference,docs,app,saas,shop,news,portfolio,forum,institution,oldweb,media,directory,reference-2,saas-2".split(",")
VIEWS = ["city", "street", "close", "flat"]

def features(path):
    im = Image.open(path).convert("RGB").resize((720, 450), Image.BILINEAR)
    a = np.asarray(im).astype(np.float32) / 255.0
    hsv = np.asarray(im.convert("HSV")).astype(np.float32) / 255.0
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    hb = np.minimum((h * 12).astype(int), 11); sb = np.minimum((s * 3).astype(int), 2); vb = np.minimum((v * 4).astype(int), 3)
    col = np.bincount((hb * 12 + sb * 4 + vb).ravel(), minlength=144).astype(np.float64); col /= col.sum()
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    thumb = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).resize((32, 20), Image.BOX)).astype(np.float64) / 255.0
    gx = np.zeros_like(lum); gy = np.zeros_like(lum)
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]; gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    mag = np.hypot(gx, gy)
    mb = np.digitize(mag.ravel(), [0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64])
    gm = np.bincount(mb, minlength=8).astype(np.float64); gm /= gm.sum()
    ang = (np.arctan2(gy, gx) % np.pi).ravel(); m = mag.ravel()
    ob = np.minimum((ang / np.pi * 8).astype(int), 7)
    go = np.bincount(ob[m > 0.02], weights=m[m > 0.02], minlength=8).astype(np.float64); go /= max(go.sum(), 1e-9)
    return {"col": col, "thumb": thumb, "gm": gm, "go": go}

def comps(f, g):
    return np.array([0.5 * np.abs(f["col"] - g["col"]).sum(), np.abs(f["thumb"] - g["thumb"]).mean(), 0.5 * np.abs(f["gm"] - g["gm"]).sum(), 0.5 * np.abs(f["go"] - g["go"]).sum()])

