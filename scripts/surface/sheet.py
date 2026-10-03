"""Contact sheets for the surface grammar pass.
python3 scripts/surface/sheet.py OUT.jpg COLS TILE_W "file:label" ... ("-:label" = a row heading spanning the row)."""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols, tw, items = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
first = next(Image.open(i.split(":", 1)[0]) for i in items if not i.startswith("-:"))
th = round(tw * first.height / first.width)
gap = 10
font = ImageFont.load_default(size=max(16, tw // 26))
big = ImageFont.load_default(size=max(20, tw // 24))
pad = font.size + 14
cells, row = [], []
for it in items:
    if it.startswith("-:"):
        if row: cells.append(row); row = []
        cells.append(it[2:])
        continue
    row.append(it)
    if len(row) == cols: cells.append(row); row = []
if row: cells.append(row)
H = sum((th + pad + gap) if isinstance(r, list) else big.size + 18 for r in cells)
sheet = Image.new("RGB", (cols * tw + (cols - 1) * gap, H), (16, 16, 20))
d = ImageDraw.Draw(sheet)
y = 0
for r in cells:
    if isinstance(r, str):
        d.text((6, y + 8), r.replace("—", "·"), fill=(255, 255, 255), font=big); y += big.size + 18; continue
    for i, it in enumerate(r):
        f, label = it.split(":", 1)
        im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
        x = i * (tw + gap)
        d.text((x + 4, y + 6), label.replace("—", "·"), fill=(255, 207, 90), font=font)
        sheet.paste(im, (x, y + pad))
    y += th + pad + gap
sheet.save(out, quality=85)
print(out, sheet.size)
