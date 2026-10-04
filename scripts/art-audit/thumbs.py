"""Art-direction audit thumbnails: python3 scripts/art-audit/thumbs.py
Small tiles of every page in City, Street and Overview, labelled and unlabelled (letters, key in
docs/screenshots/art-audit/sheets/thumbs-key.txt), plus a 'squint' row (grey + blur: what is left
without colour and detail)."""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

S = "docs/screenshots/art-audit"
PAGES = [("shop", "IKEA"), ("oldweb", "Paul Graham"), ("directory", "craigslist"), ("institution", "GOV.UK"),
         ("reference", "Wikipedia"), ("media", "NASA"), ("saas", "Linear"), ("docs", "Python Docs")]
VIEWS = [("city", "City"), ("street", "Street"), ("wide", "Overview")]
TW, TH, GAP = 240, 150, 6
font = ImageFont.load_default(size=14)
head = ImageFont.load_default(size=16)

def tile(view, pid, squint=False):
    im = Image.open(f"{S}/{view}/{pid}.png").convert("RGB")
    if squint:
        im = ImageOps.grayscale(im).filter(ImageFilter.GaussianBlur(10)).convert("RGB")
    return im.resize((TW, TH), Image.LANCZOS)

def sheet(out, order, labels, rows):
    LH = 20
    W = 90 + len(order) * (TW + GAP)
    H = len(rows) * (TH + LH + GAP) + 4
    sh = Image.new("RGB", (W, H), (16, 16, 20))
    d = ImageDraw.Draw(sh)
    for r, (view, name, squint) in enumerate(rows):
        y = r * (TH + LH + GAP)
        d.text((4, y + LH + TH // 2 - 8), name, fill=(255, 255, 255), font=head)
        for c, pid in enumerate(order):
            x = 90 + c * (TW + GAP)
            d.text((x + 2, y + 2), labels[c], fill=(255, 207, 90), font=font)
            sh.paste(tile(view, pid, squint), (x, y + LH))
    sh.save(out, quality=88)
    print(out, sh.size)

rows = [(v, n, False) for v, n in VIEWS] + [("city", "City grey", True), ("wide", "Overv. grey", True)]
ids = [p for p, _ in PAGES]
sheet(f"{S}/sheets/thumbs-labelled.jpg", ids, [n for _, n in PAGES], rows)
rnd = random.Random(2026)
shuffled = ids[:]
rnd.shuffle(shuffled)
letters = "ABCDEFGH"
sheet(f"{S}/sheets/thumbs-blind.jpg", shuffled, list(letters), rows)
with open(f"{S}/sheets/thumbs-key.txt", "w") as f:
    for l, pid in zip(letters, shuffled):
        f.write(f"{l} {dict(PAGES)[pid]}\n")
