"""Boards with accented labels: python3 scripts/polish-audit/board.py OUT.jpg COLS TILE_W [crop=x0,y0,x1,y1] "file:label" ... ("-:label" = row heading).
crop is in source pixels (2880×1800 captures); omitted = whole frame."""
import sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
out, cols, tw = args[0], int(args[1]), int(args[2])
items = args[3:]
crop = None
if items and items[0].startswith("crop="):
    crop = tuple(int(v) for v in items[0][5:].split(","))
    items = items[1:]
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
def load(f):
    im = Image.open(f).convert("RGB")
    return im.crop(crop) if crop else im
first = next(load(i.split(":", 1)[0]) for i in items if not i.startswith("-:"))
th = round(tw * first.height / first.width)
gap = 10
font = ImageFont.truetype(FONT, max(16, tw // 30))
big = ImageFont.truetype(FONT, max(20, tw // 26))
pad = font.size + 14
cells, row = [], []
for it in items:
    if it.startswith("-:"):
        if row: cells.append(row); row = []
        cells.append(it[2:]); continue
    row.append(it)
    if len(row) == cols: cells.append(row); row = []
if row: cells.append(row)
H = sum((th + pad + gap) if isinstance(r, list) else big.size + 18 for r in cells)
sheet = Image.new("RGB", (cols * tw + (cols - 1) * gap, H), (16, 16, 20))
d = ImageDraw.Draw(sheet)
y = 0
for r in cells:
    if isinstance(r, str):
        d.text((6, y + 8), r, fill=(255, 255, 255), font=big); y += big.size + 18; continue
    for i, it in enumerate(r):
        f, label = it.split(":", 1)
        im = load(f).resize((tw, th), Image.LANCZOS)
        x = i * (tw + gap)
        d.text((x + 4, y + 6), label, fill=(255, 207, 90), font=font)
        sheet.paste(im, (x, y + pad))
    y += th + pad + gap
sheet.save(out, quality=88)
print(out, sheet.size)
