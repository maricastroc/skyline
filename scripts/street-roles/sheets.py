"""C1 street roles, sheets: python3 scripts/street-roles/sheets.py
(after node scripts/street-roles/shoot.mjs before after roles). Writes docs/screenshots/street-roles/sheets/."""
import random
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

S = "docs/screenshots/street-roles"
O = f"{S}/sheets"
NAME = {"shop": "IKEA", "oldweb": "Paul Graham", "directory": "craigslist", "institution": "GOV.UK", "reference": "Wikipedia",
        "reference-2": "Wikipedia 2", "media": "NASA", "saas": "Linear", "docs": "Python Docs"}
EIGHT = ["shop", "oldweb", "directory", "institution", "reference", "media", "saas", "docs"]
VIEW = {"city": "City", "street": "Street", "wide": "Overview"}
img = lambda variant, view, p: f"{S}/{variant}/{view}/{p}.png"
sheet = lambda out, cols, tw, items: subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{out}", str(cols), str(tw), *items], check=True)

# A/B/C: before × after, two pages per row.
for letter, view in (("A", "city"), ("B", "street"), ("C", "wide")):
    items = []
    for k in range(0, 8, 2):
        items.append(f"-:{VIEW[view]} · {NAME[EIGHT[k]]} (before / after) · {NAME[EIGHT[k + 1]]} (before / after)")
        for p in EIGHT[k:k + 2]:
            items += [f"{img('before', view, p)}:{NAME[p]} · before (kit-v9)", f"{img('after', view, p)}:{NAME[p]} · after (C1)"]
    sheet(f"{letter}-before-after-{view}.jpg", 4, 720, items)

# D: the street-role map (debug=streets), Overview.
sheet("D-roles.jpg", 4, 720, [f"{img('roles', 'wide', p)}:{NAME[p]} · street roles" for p in EIGHT])

# E: Paul Graham × Wikipedia; F: Wikipedia × Wikipedia 2.
pair = lambda a, b: [x for p in (a, b) for v in ("city", "street", "wide") for x in (f"{img('before', v, p)}:{NAME[p]} · {VIEW[v]} before", f"{img('after', v, p)}:{NAME[p]} · {VIEW[v]} after")]
sheet("E-paul-graham-vs-wikipedia.jpg", 6, 520, ["-:Paul Graham vs Wikipedia · before / after", *pair("oldweb", "reference")])
sheet("F-wikipedia-family.jpg", 4, 720, ["-:Wikipedia vs Wikipedia 2 · after (C1) and street roles",
                                        *[f"{img(v, w, p)}:{NAME[p]} · {VIEW[w]}{' roles' if v == 'roles' else ''}" for p in ("reference", "reference-2") for v, w in (("after", "city"), ("after", "street"), ("after", "wide"), ("roles", "wide"))]])

# G: thumbnails. Blind (after only, shuffled, key in thumbs-key.txt) and labelled before / after.
TW, TH, GAP, LH = 240, 150, 6, 20
font = ImageFont.load_default(size=14)
head = ImageFont.load_default(size=16)
def tile(variant, view, p, grey=False):
    im = Image.open(img(variant, view, p)).convert("RGB")
    if grey:
        im = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(10)).convert("RGB")
    return im.resize((TW, TH), Image.LANCZOS)
def thumbs(out, order, labels, rows):
    sh = Image.new("RGB", (110 + len(order) * (TW + GAP), len(rows) * (TH + LH + GAP) + 4), (16, 16, 20))
    d = ImageDraw.Draw(sh)
    for r, (variant, view, name, grey) in enumerate(rows):
        y = r * (TH + LH + GAP)
        d.text((4, y + LH + TH // 2 - 8), name, fill=(255, 255, 255), font=head)
        for c, p in enumerate(order):
            x = 110 + c * (TW + GAP)
            d.text((x + 2, y + 2), labels[c], fill=(255, 207, 90), font=font)
            sh.paste(tile(variant, view, p, grey), (x, y + LH))
    sh.save(f"{O}/{out}", quality=88)
    print(f"{O}/{out}", sh.size)
order = EIGHT[:]
random.Random(1).shuffle(order)
thumbs("G-thumbs-blind-after.jpg", order, list("ABCDEFGH"),
       [("after", "city", "City", False), ("after", "street", "Street", False), ("after", "wide", "Overview", False),
        ("after", "city", "City grey", True), ("after", "wide", "Overv. grey", True)])
with open(f"{O}/thumbs-key.txt", "w") as f:
    f.writelines(f"{l} {NAME[p]}\n" for l, p in zip("ABCDEFGH", order))
thumbs("H-thumbs-before-after.jpg", EIGHT, [NAME[p] for p in EIGHT],
       [("before", "city", "City before", False), ("after", "city", "City after", False),
        ("before", "wide", "Overv. before", False), ("after", "wide", "Overv. after", False),
        ("before", "wide", "Ov. grey bef.", True), ("after", "wide", "Ov. grey aft.", True)])
print("SHEETS DONE")
