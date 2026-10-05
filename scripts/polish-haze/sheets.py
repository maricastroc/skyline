"""Visual polish round 1 (low haze), BEFORE × AFTER boards: python3 scripts/polish-haze/sheets.py
(after node scripts/polish-haze/shoot.mjs). BEFORE = the audit's captures of the same views.
Writes docs/screenshots/polish-haze/sheets/."""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

B = "docs/screenshots/polish-audit"
A = "docs/screenshots/polish-haze/after"
O = "docs/screenshots/polish-haze/sheets"
os.makedirs(O, exist_ok=True)
NAME = {"hn": "Hacker News", "reference": "Wikipedia", "saas": "Linear", "news": "Guardian", "shop": "IKEA",
        "oldweb": "Paul Graham", "media": "NASA", "institution": "GOV.UK"}
EIGHT = list(NAME)
# C4 haze band (fraction of the frame height where land starts / ends dissolving), most hazed first.
BAND = {"hn": (0.53, 0.90), "oldweb": (0.53, 0.90), "reference": (0.55, 0.92), "shop": (0.62, 0.96),
        "institution": (0.63, 0.96), "news": (0.64, 0.97), "saas": (0.69, 1.00), "media": (0.69, 1.00)}
before = lambda view, p: f"{B}/{view}/{p}.png"
after = lambda view, p: f"{A}/{view}/{p}.png"
board = lambda out, cols, tw, items, crop=None: subprocess.run(
    ["python3", "scripts/polish-audit/board.py", f"{O}/{out}", str(cols), str(tw), *([f"crop={crop}"] if crop else []), *items], check=True)
pair = lambda view, p, extra="": [f"{before(view, p)}:{NAME[p]}{extra} · BEFORE", f"{after(view, p)}:{NAME[p]}{extra} · AFTER"]

# H1 · City day, the 8 cities, same framing.
for k, half in enumerate((EIGHT[:4], EIGHT[4:])):
    board(f"H1-city-day-{k + 1}.jpg", 4, 900, [f"-:City dia · BEFORE (kit-v12, névoa em retícula) × AFTER (névoa baixa)"] + sum((pair("city", p) for p in half), []))

# H2 · 1:1 crops where the problem was strongest.
board("H2-dense-1to1.jpg", 2, 1100, sum((pair("city", p) for p in ("hn", "oldweb", "reference")), []), crop="700,0,1800,640")

# H3 · open pages: whole frame, then the top band at 1:1.
board("H3-open-pages.jpg", 2, 1100, sum((pair("city", p) for p in ("saas", "media")), []))
board("H3b-open-pages-top-1to1.jpg", 2, 1100, sum((pair("city", p) for p in ("saas", "media")), []), crop="0,0,1440,640")

# H4 · night.
board("H4-night.jpg", 4, 900, ["-:City noite · BEFORE × AFTER"] + sum((pair("night", p) for p in ("reference", "saas", "hn", "news")), []))

# H5 · thumbnails: colour, then grey + blur (what survives as hierarchy).
TW, TH, GAP, LH = 300, 188, 8, 24
f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15)
sh = Image.new("RGB", (130 + 8 * (TW + GAP), 4 * (TH + GAP) + LH), (16, 16, 20))
d = ImageDraw.Draw(sh)
rows = [("BEFORE", before, False), ("AFTER", after, False), ("BEFORE cinza", before, True), ("AFTER cinza", after, True)]
for c, p in enumerate(EIGHT):
    d.text((130 + c * (TW + GAP) + 2, 4), NAME[p], fill=(255, 207, 90), font=f)
for r, (label, src, grey) in enumerate(rows):
    y = LH + r * (TH + GAP)
    d.text((6, y + TH // 2 - 8), label, fill=(255, 255, 255), font=f)
    for c, p in enumerate(EIGHT):
        im = Image.open(src("city", p)).convert("RGB").resize((TW, TH), Image.LANCZOS)
        if grey:
            im = im.convert("L").filter(ImageFilter.GaussianBlur(2.2)).convert("RGB")
        sh.paste(im, (130 + c * (TW + GAP), y))
sh.save(f"{O}/H5-thumbs.jpg", quality=90)
print(f"{O}/H5-thumbs.jpg", sh.size)

# H6 · skyline and landmarks crossing the haze: each crop at its own box (2880×1800 source pixels).
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
BIG = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 26)
def rows_board(out, title, rows, h):
    """rows: [(label, [(file, box, caption), ...])] — every crop scaled to height h."""
    tiles = [[(Image.open(fp).convert("RGB").crop(box), cap) for fp, box, cap in cells] for _, cells in rows]
    tiles = [[(im.resize((round(im.width * h / im.height), h), Image.LANCZOS), cap) for im, cap in r] for r in tiles]
    W = max(sum(im.width for im, _ in r) + 10 * (len(r) - 1) for r in tiles)
    sheet = Image.new("RGB", (W, 50 + len(rows) * (h + 40)), (16, 16, 20))
    dd = ImageDraw.Draw(sheet)
    dd.text((6, 10), title, fill=(255, 255, 255), font=BIG)
    y = 50
    for r in tiles:
        x = 0
        for im, cap in r:
            dd.text((x + 4, y + 6), cap, fill=(255, 207, 90), font=F)
            sheet.paste(im, (x, y + 34))
            x += im.width + 10
        y += h + 40
    sheet.save(f"{O}/{out}", quality=88)
    print(f"{O}/{out}", sheet.size)

MARKS = [("reference", (1150, 0, 2050, 700), "torre do relógio"), ("shop", (1300, 0, 2200, 700), "torre TABLES &"),
         ("saas", (1300, 0, 2200, 700), "torre THE PRODUCT"), ("news", (1300, 0, 2620, 700), "torres de vidro"),
         ("oldweb", (1000, 0, 2300, 560), "fileira de trás"), ("hn", (700, 0, 2000, 560), "fileira de trás")]
rows_board("H6-skyline-landmarks.jpg", "Skyline e marcos atravessando a névoa · BEFORE × AFTER (1:1 ou próximo)",
           [(p, [(before("city", p), box, f"{NAME[p]} · {what} · BEFORE"), (after("city", p), box, f"{NAME[p]} · {what} · AFTER")]) for p, box, what in MARKS], 560)

# H7 · C4 still orders the air: the top band of the 8, most hazed page first (C4 band in the label).
order = sorted(EIGHT, key=lambda q: BAND[q])
rows_board("H7-c4-order.jpg", "A C4 continua ordenando o ar: faixa de cima das 8, da página mais enevoada para a mais aberta",
           [(p, [(before("city", p), (0, 0, 2880, 900), f"{NAME[p]} · faixa C4 {BAND[p][0]:.2f}→{BAND[p][1]:.2f} · BEFORE"),
                 (after("city", p), (0, 0, 2880, 900), f"{NAME[p]} · AFTER")]) for p in order], 300)
