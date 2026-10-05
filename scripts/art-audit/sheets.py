import subprocess
from PIL import Image, ImageDraw, ImageFont

S = "docs/screenshots/art-audit"
O = f"{S}/sheets"
NAME = {"shop": "IKEA", "oldweb": "Paul Graham", "directory": "craigslist", "institution": "GOV.UK", "reference": "Wikipedia",
        "reference-2": "Wikipedia 2", "media": "NASA", "saas": "Linear", "docs": "Python Docs"}
A = ["shop", "oldweb", "directory", "institution"]
B = ["reference", "media", "saas", "docs"]
LABEL = {"city": "City", "street": "Street", "wide": "Overview", "flat": "flat", "own": "own time"}
row = lambda v, ps: [f"{S}/{v}/{p}.png:{NAME[p]} · {LABEL[v]}" for p in ps]
sheet = lambda out, cols, tw, items: subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{out}", str(cols), str(tw), *items], check=True)

sheet("A-main-board.jpg", 4, 720, ["-:CITY · day, seed 7, same camera", *row("city", A), "-:STREET · focus 0,0", *row("street", A),
                                   "-:CITY", *row("city", B), "-:STREET", *row("street", B)])
sheet("C-overview.jpg", 4, 720, row("wide", A + B))
sheet("D-flat.jpg", 4, 720, row("flat", A + B))
sheet("E-own-time.jpg", 4, 720, row("own", A + B))
fam = lambda ps: [x for p in ps for v in ("city", "street", "wide") for x in row(v, [p])]
sheet("G-family.jpg", 3, 960, ["-:FAMILY · Wikipedia (Suspension bridge) vs Wikipedia 2 (Lighthouse)", *fam(["reference", "reference-2"]),
                               "-:CONTRAST · IKEA vs Paul Graham", *fam(["shop", "oldweb"])])

box, tw, th = (1100, 560, 1900, 1060), 400, 250
font = ImageFont.load_default(size=16)
sh = Image.new("RGB", (4 * tw + 3 * 8, 2 * (th + 24) + 8), (16, 16, 20))
d = ImageDraw.Draw(sh)
for k, p in enumerate(A + B):
    im = Image.open(f"{S}/street/{p}.png").convert("RGB").crop(box).resize((tw, th), Image.LANCZOS)
    x, y = (k % 4) * (tw + 8), (k // 4) * (th + 32)
    d.text((x + 3, y + 3), f"{NAME[p]} · Street, central crossing", fill=(255, 207, 90), font=font)
    sh.paste(im, (x, y + 24))
sh.save(f"{O}/F-street-layer.jpg", quality=88)
subprocess.run(["python3", "scripts/art-audit/thumbs.py"], check=True)
print("SHEETS DONE")
