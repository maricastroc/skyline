"""Visual polish round 2 (placeholder assets), study boards:
python3 scripts/polish-assets/sheets-study.py (after node scripts/polish-assets/shoot-study.mjs hvac / screen). Writes docs/screenshots/polish-assets/sheets/."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = "docs/screenshots/polish-assets/studies"
O = "docs/screenshots/polish-assets/sheets"
os.makedirs(O, exist_ok=True)
F = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 20)
BIG = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 26)
V = {"hvac": [("cur", "atual"), ("a", "A · condensador"), ("b", "B · ventilador frontal"), ("c", "C · cercado técnico")],
     "screen": [("cur", "atual"), ("a", "A · tela apagada"), ("b", "B · LED modular"), ("c", "C · outdoor estruturado")]}


def board(out, title, asset, rows, h):
    """rows: [(label, case, box)] — one row per case, one column per variant, crops at height h."""
    cells = []
    for label, case, box in rows:
        r = []
        for v, vl in V[asset]:
            im = Image.open(f"{D}/{asset}/{v}/{case}.png").convert("RGB")
            if box:
                im = im.crop(box)
            r.append((im.resize((round(im.width * h / im.height), h), Image.LANCZOS), f"{label} · {vl}"))
        cells.append(r)
    W = max(sum(im.width for im, _ in r) + 10 * (len(r) - 1) for r in cells)
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


def thumbs(out, title, asset, cases):
    """City frames at 300 px: colour, then grey + blur, per variant (does the asset add noise?)."""
    TW, TH, GAP, LH = 300, 188, 8, 24
    cols = len(V[asset])
    sh = Image.new("RGB", (150 + cols * (TW + GAP), 40 + len(cases) * 2 * (TH + GAP) + LH), (16, 16, 20))
    d = ImageDraw.Draw(sh)
    d.text((6, 6), title, fill=(255, 255, 255), font=F)
    for c, (_, vl) in enumerate(V[asset]):
        d.text((150 + c * (TW + GAP) + 2, 40), vl, fill=(255, 207, 90), font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15))
    y = 40 + LH
    for label, case in cases:
        for grey in (False, True):
            d.text((6, y + TH // 2 - 8), label + (" · cinza" if grey else ""), fill=(255, 255, 255), font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 15))
            for c, (v, _) in enumerate(V[asset]):
                im = Image.open(f"{D}/{asset}/{v}/{case}.png").convert("RGB").resize((TW, TH), Image.LANCZOS)
                if grey:
                    im = im.convert("L").filter(ImageFilter.GaussianBlur(2.2)).convert("RGB")
                sh.paste(im, (150 + c * (TW + GAP), y))
            y += TH + GAP
    sh.save(f"{O}/{out}", quality=90)
    print(f"{O}/{out}", sh.size)


# ── HVAC ──
board("P1-hvac-city.jpg", "Ar-condicionado de cobertura · City (recortes 1:1 das capturas @2x)", "hvac", [
    ("Paul Graham", "pg-city", (300, 380, 1200, 940)),
    ("Hacker News", "hn-city", (600, 400, 1600, 1000)),
    ("IKEA", "ikea-city", (600, 900, 1500, 1460)),
    ("GOV.UK", "govuk-city", (200, 300, 1500, 1100)),
], 420)
board("P2-hvac-street.jpg", "Ar-condicionado de cobertura · Street (1:1)", "hvac", [
    ("Hacker News · frente para a câmera", "hn-street", (60, 380, 480, 640)),
    ("Hacker News · frente oposta", "hn-street", (1150, 1380, 1600, 1660)),
    ("Paul Graham", "pg-street", (0, 100, 1300, 900)),
], 360)
board("P3-hvac-night.jpg", "Ar-condicionado de cobertura · noite (City, 1:1)", "hvac", [("Paul Graham", "pg-night", (300, 380, 1200, 940))], 420)
thumbs("P4-hvac-thumbs.jpg", "Ar-condicionado · thumbnails da City (ruído?)", "hvac", [("Paul Graham", "pg-city"), ("IKEA", "ikea-city"), ("GOV.UK", "govuk-city")])

# ── screen without content ──
board("Q1-screen-street.jpg", "Tela de fachada sem conteúdo · Street (1:1), dia e noite", "screen", [
    ("Guardian · dia", "guardian-street", (1100, 880, 1900, 1440)),
    ("Guardian · noite", "guardian-street-night", (1100, 880, 1900, 1440)),
    ("Linear · dia", "linear-street", (1900, 1000, 2880, 1750)),
    ("Linear · outro prédio", "linear-street", (150, 1150, 750, 1700)),
], 380)
board("Q2-screen-city.jpg", "Tela de fachada sem conteúdo · City (1:1), dia e noite", "screen", [
    ("Guardian · dia", "guardian-city", (1150, 950, 2500, 1650)),
    ("Guardian · noite", "guardian-night", (1150, 950, 2500, 1650)),
    ("Linear · dia", "linear-city", (900, 1050, 2300, 1650)),
    ("Linear · noite", "linear-night", (900, 1050, 2300, 1650)),
], 380)
thumbs("Q3-screen-thumbs.jpg", "Tela sem conteúdo · thumbnails da City (ruído?)", "screen", [("Guardian", "guardian-city"), ("Linear", "linear-city"), ("Guardian noite", "guardian-night")])

# ── R · the two recommendations against the current asset ──
def pairs(out, title, rows, h):
    """rows: [(caption_cur, file_cur, caption_new, file_new, box)]."""
    cells = []
    for c0, f0, c1, f1, box in rows:
        r = []
        for cap, f in ((c0, f0), (c1, f1)):
            im = Image.open(f).convert("RGB").crop(box)
            r.append((im.resize((round(im.width * h / im.height), h), Image.LANCZOS), cap))
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


h = lambda v, c: f"{D}/hvac/{v}/{c}.png"
s = lambda v, c: f"{D}/screen/{v}/{c}.png"
pairs("R1-recommended-hvac.jpg", "Recomendação · ar-condicionado A (condensador) × atual", [
    ("Paul Graham City · atual", h("cur", "pg-city"), "Paul Graham City · A", h("a", "pg-city"), (300, 380, 1200, 940)),
    ("Hacker News Street · atual", h("cur", "hn-street"), "Hacker News Street · A", h("a", "hn-street"), (60, 380, 480, 640)),
    ("IKEA City · atual", h("cur", "ikea-city"), "IKEA City · A", h("a", "ikea-city"), (600, 900, 1500, 1460)),
], 420)
pairs("R2-recommended-screen.jpg", "Recomendação · tela sem conteúdo C (outdoor estruturado) × atual", [
    ("Guardian Street dia · atual", s("cur", "guardian-street"), "Guardian Street dia · C", s("c", "guardian-street"), (1100, 880, 1900, 1440)),
    ("Guardian Street noite · atual", s("cur", "guardian-street-night"), "Guardian Street noite · C", s("c", "guardian-street-night"), (1100, 880, 1900, 1440)),
    ("Linear Street (fachada na sombra) · atual", s("cur", "linear-street"), "Linear Street · C", s("c", "linear-street"), (1900, 1000, 2880, 1750)),
    ("Guardian City · atual", s("cur", "guardian-city"), "Guardian City · C", s("c", "guardian-city"), (1150, 950, 2500, 1650)),
], 400)
