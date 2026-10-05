import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = "docs/screenshots/polish-audit"
O = f"{S}/sheets"
os.makedirs(O, exist_ok=True)
NAME = {"hn": "Hacker News", "reference": "Wikipedia", "saas": "Linear", "news": "Guardian", "shop": "IKEA",
        "oldweb": "Paul Graham", "media": "NASA", "institution": "GOV.UK"}
EIGHT = ["hn", "reference", "saas", "news", "shop", "oldweb", "media", "institution"]
VIEW = {"city": "City · dia", "night": "City · noite", "street": "Street · dia", "wide": "Wide · dia (Street zoom 0.55)"}
img = lambda view, p: f"{S}/{view}/{p}.png"
sheet = lambda out, cols, tw, items: subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{out}", str(cols), str(tw), *items], check=True)

for letter, view in (("A", "city"), ("B", "street"), ("C", "night"), ("D", "wide")):
    sheet(f"{letter}-{view}.jpg", 4, 900, [f"-:{VIEW[view]} · kit atual (= kit-v12), seed 7, sem overlays",
                                           *[f"{img(view, p)}:{NAME[p]}" for p in EIGHT]])

TW, TH, GAP, LH = 300, 188, 8, 22
f = ImageFont.load_default(size=15)
sh = Image.new("RGB", (8 * TW + 7 * GAP, 2 * (TH + LH) + GAP), (16, 16, 20))
d = ImageDraw.Draw(sh)
for c, p in enumerate(EIGHT):
    im = Image.open(img("city", p)).convert("RGB").resize((TW, TH), Image.LANCZOS)
    g = im.convert("L").filter(ImageFilter.GaussianBlur(2.2)).convert("RGB")
    for r, t in enumerate((im, g)):
        x, y = c * (TW + GAP), r * (TH + LH + GAP)
        d.text((x + 2, y + 3), NAME[p], fill=(255, 207, 90), font=f)
        sh.paste(t, (x, y + LH))
sh.save(f"{O}/E-thumbs.jpg", quality=90)
print(f"{O}/E-thumbs.jpg", sh.size)
