"""C4 atmosphere, sheets: python3 scripts/atmosphere/sheets.py
(after node scripts/atmosphere/shoot.mjs before after). Writes docs/screenshots/atmosphere/sheets/."""
import os
import random
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

S = "docs/screenshots/atmosphere"
O = f"{S}/sheets"
os.makedirs(O, exist_ok=True)
NAME = {"shop": "IKEA", "oldweb": "Paul Graham", "directory": "craigslist", "institution": "GOV.UK", "reference": "Wikipedia",
        "reference-2": "Wikipedia 2", "media": "NASA", "saas": "Linear", "docs": "Python Docs"}
EIGHT = ["shop", "oldweb", "directory", "institution", "reference", "media", "saas", "docs"]
VIEW = {"city": "City day", "night": "City night", "street": "Street day"}
img = lambda variant, view, p: f"{S}/{variant}/{view}/{p}.png"
sheet = lambda out, cols, tw, items: subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{out}", str(cols), str(tw), *items], check=True)

for letter, view in (("A", "city"), ("B", "night"), ("C", "street")):
    items = []
    for k in range(0, 8, 2):
        items.append(f"-:{VIEW[view]} · {NAME[EIGHT[k]]} (before / after) · {NAME[EIGHT[k + 1]]} (before / after)")
        for p in EIGHT[k:k + 2]:
            items += [f"{img('before', view, p)}:{NAME[p]} · before (kit-v11)", f"{img('after', view, p)}:{NAME[p]} · after (C4)"]
    sheet(f"{letter}-before-after-{view}.jpg", 4, 720, items)

# D: day × night, after: the same environment at two hours.
items = []
for k in range(0, 8, 4):
    items.append("-:after (C4) · day")
    items += [f"{img('after', 'city', p)}:{NAME[p]} · day" for p in EIGHT[k:k + 4]]
    items.append("-:after (C4) · night")
    items += [f"{img('after', 'night', p)}:{NAME[p]} · night" for p in EIGHT[k:k + 4]]
sheet("D-day-night.jpg", 4, 720, items)

# E: the sky / skyline band of City (top 45% of the frame): before, after day, after night.
crop = (0, 0, 2880, 810)
tw, th, gap = 360, 101, 6
f16 = ImageFont.load_default(size=16)
f14 = ImageFont.load_default(size=13)
rows = [("before", "city", "before (kit-v11) · day"), ("after", "city", "after (C4) · day"), ("before", "night", "before · night"), ("after", "night", "after (C4) · night")]
sh = Image.new("RGB", (190 + 8 * (tw + gap), 24 + len(rows) * (th + gap)), (16, 16, 20))
d = ImageDraw.Draw(sh)
for c, p in enumerate(EIGHT):
    d.text((190 + c * (tw + gap) + 2, 4), NAME[p], fill=(255, 207, 90), font=f16)
for r, (variant, view, label) in enumerate(rows):
    y = 24 + r * (th + gap)
    d.text((4, y + th // 2 - 8), label, fill=(255, 255, 255), font=f14)
    for c, p in enumerate(EIGHT):
        sh.paste(Image.open(img(variant, view, p)).convert("RGB").crop(crop).resize((tw, th), Image.LANCZOS), (190 + c * (tw + gap), y))
sh.save(f"{O}/E-sky.jpg", quality=90)
print(f"{O}/E-sky.jpg", sh.size)

# F: Wikipedia × Wikipedia 2.
sheet("F-wikipedia-family.jpg", 3, 960, ["-:Wikipedia vs Wikipedia 2 · after (C4)",
                                        *[f"{img('after', v, p)}:{NAME[p]} · {VIEW[v]}" for p in ("reference", "reference-2") for v in ("city", "night", "street")]])

# G / H: City thumbnails, blind (after) and before / after.
TW, TH, GAP, LH = 240, 150, 6, 20
def tile(variant, view, p, grey=False):
    im = Image.open(img(variant, view, p)).convert("RGB")
    if grey:
        im = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(10)).convert("RGB")
    return im.resize((TW, TH), Image.LANCZOS)
def thumbs(out, order, labels, spec):
    sh = Image.new("RGB", (120 + len(order) * (TW + GAP), len(spec) * (TH + LH + GAP) + 4), (16, 16, 20))
    d = ImageDraw.Draw(sh)
    for r, (variant, view, name, grey) in enumerate(spec):
        y = r * (TH + LH + GAP)
        d.text((4, y + LH + TH // 2 - 8), name, fill=(255, 255, 255), font=f16)
        for c, p in enumerate(order):
            x = 120 + c * (TW + GAP)
            d.text((x + 2, y + 2), labels[c], fill=(255, 207, 90), font=f14)
            sh.paste(tile(variant, view, p, grey), (x, y + LH))
    sh.save(f"{O}/{out}", quality=88)
    print(f"{O}/{out}", sh.size)
order = EIGHT[:]
random.Random(4).shuffle(order)
thumbs("G-thumbs-blind-after.jpg", order, list("ABCDEFGH"),
       [("after", "city", "City day", False), ("after", "night", "City night", False), ("after", "city", "day grey", True)])
with open(f"{O}/thumbs-key.txt", "w") as f:
    f.writelines(f"{l} {NAME[p]}\n" for l, p in zip("ABCDEFGH", order))
thumbs("H-thumbs-before-after.jpg", EIGHT, [NAME[p] for p in EIGHT],
       [("before", "city", "day before", False), ("after", "city", "day after", False),
        ("before", "night", "night before", False), ("after", "night", "night after", False)])
print("SHEETS DONE")
