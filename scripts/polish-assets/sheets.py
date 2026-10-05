"""Visual polish round 2 (rooftop condensers, structured billboards), BEFORE × AFTER boards:
python3 scripts/polish-assets/sheets.py (after node scripts/polish-assets/shoot.mjs).
BEFORE = ?v=12 (kit-v12, = polishAssets: false), AFTER = the current kit. Writes docs/screenshots/polish-assets/round/."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = "docs/screenshots/polish-assets"
O = f"{D}/round"
os.makedirs(O, exist_ok=True)
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
F = ImageFont.truetype(FONT, 20)
BIG = ImageFont.truetype(FONT, 26)
SM = ImageFont.truetype(FONT, 15)
img = lambda v, c: f"{D}/{v}/{c}.png"


def pairs(out, title, rows, h):
    """rows: [(label, case, box)] — BEFORE and AFTER side by side, crops (source pixels) at height h."""
    cells = []
    for label, case, box in rows:
        r = []
        for v, vl in (("before", "BEFORE"), ("after", "AFTER")):
            im = Image.open(img(v, case)).convert("RGB")
            if box:
                im = im.crop(box)
            r.append((im.resize((round(im.width * h / im.height), h), Image.LANCZOS), f"{label} · {vl}"))
        cells.append(r)
    W = max(sum(im.width for im, _ in r) + 10 for r in cells)
    sheet = Image.new("RGB", (W, 50 + len(cells) * (h + 40)), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    d.text((6, 10), title, fill=(255, 255, 255), font=BIG)
    y = 50
    for r in cells:
        x = 0
        for im, cap in r:
            d.text((x + 4, y + 6), cap, fill=(255, 207, 90), font=F)
            sheet.paste(im, (x, y + 34))
            x += im.width + 10
        y += h + 40
    sheet.save(f"{O}/{out}", quality=88)
    print(f"{O}/{out}", sheet.size)


# ── rooftop plant ──
pairs("A1-hvac-city.jpg", "Ar-condicionado · City · recortes 1:1 (BEFORE = kit-v12)", [
    ("Paul Graham", "pg-city", (300, 380, 1200, 940)),
    ("IKEA", "ikea-city", (600, 900, 1500, 1460)),
    ("Guardian", "guardian-city", (1500, 1350, 2400, 1800)),
], 460)
pairs("A2-hvac-street.jpg", "Ar-condicionado · Street · recortes 1:1", [
    ("Paul Graham", "pg-street", (150, 300, 1450, 1100)),
    ("IKEA", "ikea-street", (0, 400, 1300, 1200)),
    ("Guardian", "guardian-text", (0, 1050, 1000, 1700)),
], 460)
pairs("A3-hvac-night.jpg", "Ar-condicionado · noite (City, 1:1)", [("Guardian", "guardian-night", (1500, 1350, 2400, 1800))], 460)

# ── billboards ──
pairs("B1-billboard-street-blank.jpg", "Billboard SEM conteúdo · Street · 1:1, dia e noite", [
    ("Guardian · dia", "guardian-blank", (1100, 880, 1900, 1440)),
    ("Guardian · noite", "guardian-blank-night", (1100, 880, 1900, 1440)),
    ("Linear · dia (fachada na sombra)", "linear-blank", (1900, 1000, 2880, 1750)),
    ("Linear · noite", "linear-blank-night", (1900, 1000, 2880, 1750)),
], 420)
pairs("B2-billboard-street-text.jpg", "Billboard COM conteúdo da página · Street · 1:1, dia e noite", [
    ("Guardian · \"RUSSELL T\" · dia", "guardian-text", (1350, 250, 2050, 750)),
    ("Guardian · noite", "guardian-text-night", (1350, 250, 2050, 750)),
    ("Linear · \"AI AND\" (fileira) · dia", "linear-text", (1500, 300, 2880, 1200)),
    ("Linear · noite", "linear-text-night", (1500, 300, 2880, 1200)),
], 420)
pairs("B3-billboard-city.jpg", "Billboards · City · 1:1, dia e noite (com e sem conteúdo)", [
    ("Guardian · praça (sem conteúdo e com)", "guardian-city", (1150, 950, 2500, 1650)),
    ("Guardian · noite", "guardian-night", (1150, 950, 2500, 1650)),
    ("Guardian · fundo (com texto)", "guardian-city", (1500, 100, 2100, 500)),
    ("Linear · praça", "linear-city", (900, 1050, 2300, 1650)),
    ("Linear · noite", "linear-night", (900, 1050, 2300, 1650)),
], 380)
pairs("B4-guardian-whole.jpg", "Guardian · o quadro inteiro (repetição dos billboards estruturados?)", [
    ("Guardian · City dia", "guardian-city", None),
    ("Guardian · City noite", "guardian-night", None),
], 700)

# ── thumbnails: noise and repetition ──
TW, TH, GAP, LH = 300, 188, 8, 24
cases = [("Paul Graham", "pg-city"), ("IKEA", "ikea-city"), ("Guardian", "guardian-city"), ("Guardian noite", "guardian-night"), ("Linear", "linear-city"), ("Linear noite", "linear-night")]
sh = Image.new("RGB", (150 + len(cases) * (TW + GAP), 62 + 4 * (TH + GAP)), (16, 16, 20))
d = ImageDraw.Draw(sh)
d.text((6, 6), "Thumbnails da City · ruído / repetição", fill=(255, 255, 255), font=F)
for c, (label, _) in enumerate(cases):
    d.text((150 + c * (TW + GAP) + 2, 40), label, fill=(255, 207, 90), font=SM)
for r, (v, grey, lab) in enumerate((("before", False, "BEFORE"), ("after", False, "AFTER"), ("before", True, "BEFORE cinza"), ("after", True, "AFTER cinza"))):
    y = 62 + r * (TH + GAP)
    d.text((6, y + TH // 2 - 8), lab, fill=(255, 255, 255), font=SM)
    for c, (_, case) in enumerate(cases):
        im = Image.open(img(v, case)).convert("RGB").resize((TW, TH), Image.LANCZOS)
        if grey:
            im = im.convert("L").filter(ImageFilter.GaussianBlur(2.2)).convert("RGB")
        sh.paste(im, (150 + c * (TW + GAP), y))
sh.save(f"{O}/C1-thumbs.jpg", quality=90)
print(f"{O}/C1-thumbs.jpg", sh.size)
