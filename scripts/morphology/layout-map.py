import json, sys, colorsys
from PIL import Image, ImageDraw, ImageFont

out, title = sys.argv[1], sys.argv[2]
ids = sys.argv[3:]
S, B, GAP, PAD, TOP = 13, 14, 2.2, 26, 54
side = int((4 * B + 3 * GAP) * S)
W = PAD + len(ids) * (side + 330 + PAD)
H = TOP + side + PAD
img = Image.new("RGB", (W, H), (16, 16, 22))
d = ImageDraw.Draw(img)
font = ImageFont.load_default(size=15)
small = ImageFont.load_default(size=12)
big = ImageFont.load_default(size=20)
d.text((PAD, 14), title, fill=(255, 214, 110), font=big)
for n, pid in enumerate(ids):
    data = json.load(open(f"docs/morphology/layout/{pid}.json"))
    ox = PAD + n * (side + 330 + PAD)
    order = [t["index"] for t in sorted(data["territories"], key=lambda t: -t["lots"])]
    hue = {t: (k * 0.61803) % 1 for k, t in enumerate(order)}
    d.text((ox, TOP - 22), pid, fill=(235, 235, 235), font=font)
    for p in data["pieces"]:
        i, j = p["block"]
        bx = ox + (i * (B + GAP) + 7) * S
        bz = TOP + (j * (B + GAP) + 7) * S
        r, g, b = colorsys.hsv_to_rgb(hue[p["territory"]], 0.42, 0.62 if p["ensemble"] % 2 else 0.86)
        box = [bx + p["x0"] * S + 1, bz + p["z0"] * S + 1, bx + p["x1"] * S - 1, bz + p["z1"] * S - 1]
        d.rectangle(box, fill=(int(r * 255), int(g * 255), int(b * 255)), outline=(255, 255, 255) if p["first"] else (20, 20, 26), width=2 if p["first"] else 1)
        cx, cz = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        if p["dominants"]:
            k = p["dominants"]
            for q in range(k):
                x = cx - (k - 1) * 6 + q * 12
                d.polygon([(x, cz - 13), (x + 5, cz - 8), (x, cz - 3), (x - 5, cz - 8)], fill=(20, 20, 26))
        if p["units"] and p["type"] != "lot":
            d.text((cx - 5, cz + 1), str(p["units"]), fill=(20, 20, 26), font=small)
    y = TOP
    lx = ox + side + 16
    d.text((lx, y), "territory · land · groups · count · ensembles", fill=(150, 150, 160), font=small)
    y += 18
    for t in sorted(data["territories"], key=lambda t: -t["lots"])[:14]:
        r, g, b = colorsys.hsv_to_rgb(hue[t["index"]], 0.42, 0.86)
        d.rectangle([lx, y + 2, lx + 12, y + 14], fill=(int(r * 255), int(g * 255), int(b * 255)))
        what = f'{t["controls"]} controls' if t["groupKind"] == "controls" else f'{t["items"]} items'
        d.text((lx + 18, y), f'{t["kind"]} {t["fabric"]} · {t["lots"]} · {t["groups"]}g · {what} · {t["ensembles"]}e', fill=(230, 230, 230), font=small)
        y += 17
img.save(out, quality=90)
print(out, img.size)
