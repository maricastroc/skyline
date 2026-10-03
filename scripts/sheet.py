"""Contact sheets for the direction round: python3 scripts/sheet.py OUT.jpg COLS "file:label" ..."""
import sys
from PIL import Image, ImageDraw, ImageFont

out, cols, items = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W = 1440  # each tile is drawn at 1x (1440×900)
H = 900
gap, pad = 16, 56
font = ImageFont.load_default(size=26)
rows = (len(items) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W + (cols - 1) * gap, rows * (H + pad) + (rows - 1) * gap), (16, 16, 20))
d = ImageDraw.Draw(sheet)
for i, it in enumerate(items):
    f, label = it.split(":", 1)
    im = Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)
    x = (i % cols) * (W + gap)
    y = (i // cols) * (H + pad + gap)
    d.text((x + 4, y + 14), label, fill=(255, 207, 90), font=font)
    sheet.paste(im, (x, y + pad))
scale = min(1.0, 4300 / sheet.width)
if scale < 1:
    sheet = sheet.resize((int(sheet.width * scale), int(sheet.height * scale)), Image.LANCZOS)
sheet.save(out, quality=86)
print(out, sheet.size)
