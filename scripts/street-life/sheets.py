import random
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

S = "docs/screenshots/street-life"
import os
O = f"{S}/sheets"
os.makedirs(O, exist_ok=True)
NAME = {"shop": "IKEA", "oldweb": "Paul Graham", "directory": "craigslist", "institution": "GOV.UK", "reference": "Wikipedia",
        "reference-2": "Wikipedia 2", "media": "NASA", "saas": "Linear", "docs": "Python Docs"}
EIGHT = ["shop", "oldweb", "directory", "institution", "reference", "media", "saas", "docs"]
VIEW = {"city": "City", "street": "Street", "wide": "Overview"}
img = lambda variant, view, p: f"{S}/{variant}/{view}/{p}.png"
sheet = lambda out, cols, tw, items: subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{out}", str(cols), str(tw), *items], check=True)

for letter, view in (("A", "city"), ("B", "street"), ("C", "wide")):
    items = []
    for k in range(0, 8, 2):
        items.append(f"-:{VIEW[view]} · {NAME[EIGHT[k]]} (before / after) · {NAME[EIGHT[k + 1]]} (before / after)")
        for p in EIGHT[k:k + 2]:
            items += [f"{img('before', view, p)}:{NAME[p]} · before (kit-v10, C1)", f"{img('after', view, p)}:{NAME[p]} · after (C3)"]
    sheet(f"{letter}-before-after-{view}.jpg", 4, 720, items)

box, tw, th, gap = (1100, 560, 1900, 1060), 400, 250, 8
font = ImageFont.load_default(size=16)
big = ImageFont.load_default(size=20)
sh = Image.new("RGB", (4 * tw + 3 * gap, 4 * (th + 24 + gap) + 2 * 34), (16, 16, 20))
d = ImageDraw.Draw(sh)
y = 0
for variant, title in (("before", "BEFORE (kit-v10): the same street layer in every page"), ("after", "AFTER (C3): street life from the frontage, the street role and the page")):
    d.text((4, y + 6), title, fill=(255, 255, 255), font=big)
    y += 34
    for k, p in enumerate(EIGHT):
        im = Image.open(img(variant, "street", p)).convert("RGB").crop(box).resize((tw, th), Image.LANCZOS)
        x = (k % 4) * (tw + gap)
        yy = y + (k // 4) * (th + 24 + gap)
        d.text((x + 3, yy + 3), f"{NAME[p]} · central crossing", fill=(255, 207, 90), font=font)
        sh.paste(im, (x, yy + 24))
    y += 2 * (th + 24 + gap)
sh.save(f"{O}/D-same-crossing.jpg", quality=88)
print(f"{O}/D-same-crossing.jpg", sh.size)

sheet("E-wikipedia-family.jpg", 3, 960, ["-:Wikipedia vs Wikipedia 2 · after (C3)",
                                        *[f"{img('after', v, p)}:{NAME[p]} · {VIEW[v]}" for p in ("reference", "reference-2") for v in ("city", "street", "wide")]])
sheet("F-seed.jpg", 4, 720, ["-:Same page, seed 7 / seed 8 (Street): the seed moves things, never how much",
                             *[x for p in ("shop", "oldweb", "media", "docs") for x in (f"{img('after', 'street', p)}:{NAME[p]} · seed 7", f"{img('seed8', 'street', p)}:{NAME[p]} · seed 8")]])

TW, TH, GAP, LH = 240, 150, 6, 20
f14 = ImageFont.load_default(size=14)
f16 = ImageFont.load_default(size=16)
def tile(variant, view, p, grey=False, crop=None):
    im = Image.open(img(variant, view, p)).convert("RGB")
    if crop:
        im = im.crop(crop)
    if grey:
        im = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(10)).convert("RGB")
    return im.resize((TW, TH), Image.LANCZOS)
def thumbs(out, order, labels, rows):
    sh = Image.new("RGB", (110 + len(order) * (TW + GAP), len(rows) * (TH + LH + GAP) + 4), (16, 16, 20))
    d = ImageDraw.Draw(sh)
    for r, (variant, view, name, grey, crop) in enumerate(rows):
        y = r * (TH + LH + GAP)
        d.text((4, y + LH + TH // 2 - 8), name, fill=(255, 255, 255), font=f16)
        for c, p in enumerate(order):
            x = 110 + c * (TW + GAP)
            d.text((x + 2, y + 2), labels[c], fill=(255, 207, 90), font=f14)
            sh.paste(tile(variant, view, p, grey, crop), (x, y + LH))
    sh.save(f"{O}/{out}", quality=88)
    print(f"{O}/{out}", sh.size)
order = EIGHT[:]
random.Random(3).shuffle(order)
thumbs("G-thumbs-blind-after.jpg", order, list("ABCDEFGH"),
       [("after", "city", "City", False, None), ("after", "street", "Street", False, None), ("after", "street", "Crossing", False, box),
        ("after", "wide", "Overview", False, None), ("after", "city", "City grey", True, None)])
with open(f"{O}/thumbs-key.txt", "w") as f:
    f.writelines(f"{l} {NAME[p]}\n" for l, p in zip("ABCDEFGH", order))
thumbs("H-thumbs-before-after.jpg", EIGHT, [NAME[p] for p in EIGHT],
       [("before", "city", "City before", False, None), ("after", "city", "City after", False, None),
        ("before", "street", "Street before", False, None), ("after", "street", "Street after", False, None),
        ("before", "street", "Cross. before", False, box), ("after", "street", "Cross. after", False, box)])
print("SHEETS DONE")
