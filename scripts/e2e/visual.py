import json, os, itertools
import numpy as np
from PIL import Image

ROOT = os.environ.get("E2E_ROOT", "docs/screenshots/e2e/")
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

def load(variant, view):
    out = {}
    for p in PAGES:
        path = f"{ROOT}{variant}/{p}-{view}.png"
        if os.path.exists(path): out[p] = features(path)
    return out

res = {"pages": PAGES, "views": {}}
for view in VIEWS:
    base = load("normal", view)
    ids = [p for p in PAGES if p in base]
    if len(ids) < 3: continue
    pairs = list(itertools.combinations(ids, 2))
    C = {pr: comps(base[pr[0]], base[pr[1]]) for pr in pairs}
    med = np.median(np.array(list(C.values())), axis=0); med[med == 0] = 1
    D = lambda f, g: float((comps(f, g) / med).mean())
    M = [[0.0 for _ in ids] for _ in ids]
    for i, a in enumerate(ids):
        for j, b in enumerate(ids):
            if i != j: M[i][j] = float(((C[(a, b)] if (a, b) in C else C[(b, a)]) / med).mean())
    entry = {"ids": ids, "matrix": M, "componentMedians": med.tolist()}
    page = [M[i][j] for i in range(len(ids)) for j in range(i + 1, len(ids))]
    entry["pageMean"] = float(np.mean(page))
    for variant in ["seed8", "classic", "modern", "v5", "v4"]:
        other = load(variant, view)
        same = [D(base[p], other[p]) for p in ids if p in other]
        if same: entry[f"{variant}SamePage"] = {"mean": float(np.mean(same)), "max": float(np.max(same)), "per": {p: D(base[p], other[p]) for p in ids if p in other}}
        if len(other) >= 3 and variant in ("classic", "modern", "v5", "v4"):
            oi = [p for p in ids if p in other]
            pm = [D(other[a], other[b]) for a, b in itertools.combinations(oi, 2)]
            entry[f"{variant}PageMean"] = float(np.mean(pm))
            entry[f"{variant}Matrix"] = [[0.0 if a == b else D(other[a], other[b]) for b in oi] for a in oi]
            entry[f"{variant}Ids"] = oi
    res["views"][view] = entry
    s = entry
    print(f"{view:6} page {s['pageMean']:.2f}" + "".join(f" · {v} same-page {s[v + 'SamePage']['mean']:.2f}" for v in ["seed8", "classic", "modern", "v5", "v4"] if v + "SamePage" in s) + "".join(f" · {v} page-page {s[v + 'PageMean']:.2f}" for v in ["classic", "modern", "v5", "v4"] if v + "PageMean" in s))
json.dump(res, open(os.environ.get("E2E_VISUAL", "docs/e2e/visual.json"), "w"), indent=1)
