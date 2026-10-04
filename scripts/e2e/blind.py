"""Blind sheets: python3 scripts/e2e/blind.py — writes docs/screenshots/e2e/sheets/blind-<view>.jpg with
tiles in a shuffled order labelled only by a letter, and docs/e2e/blind-key.json (open it only after judging)."""
import json, random, os
from PIL import Image, ImageDraw, ImageFont
PAGES = "reference,docs,app,saas,shop,news,portfolio,forum,institution,oldweb,media,directory,reference-2,saas-2".split(",")
out = "docs/screenshots/e2e/sheets/"; os.makedirs(out, exist_ok=True)
rng = random.Random(20261003)
order = PAGES[:]; rng.shuffle(order)
letters = "ABCDEFGHIJKLMN"
key = {letters[i]: p for i, p in enumerate(order)}
font = ImageFont.load_default(size=40)
for view in ["city", "street", "close", "flat"]:
    tw, th = 720, 450; cols = 5; rows = (len(order) + cols - 1) // cols
    s = Image.new("RGB", (cols * tw + (cols - 1) * 8, rows * th + (rows - 1) * 8), (16, 16, 20)); d = ImageDraw.Draw(s)
    for i, p in enumerate(order):
        im = Image.open(f"docs/screenshots/e2e/normal/{p}-{view}.png").convert("RGB").resize((tw, th), Image.LANCZOS)
        x = (i % cols) * (tw + 8); y = (i // cols) * (th + 8)
        s.paste(im, (x, y)); d.rectangle([x, y, x + 56, y + 52], fill=(16, 16, 20)); d.text((x + 12, y + 4), letters[i], fill=(255, 207, 90), font=font)
    s.save(f"{out}blind-{view}.jpg", quality=86)
json.dump(key, open("docs/e2e/blind-key.json", "w"), indent=1)
print("blind sheets written; key in docs/e2e/blind-key.json")
