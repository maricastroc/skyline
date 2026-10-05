import os
from PIL import Image, ImageDraw, ImageFont

S = "docs/screenshots/polish-audit"
O = f"{S}/evidence"
os.makedirs(O, exist_ok=True)
FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
BIG = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 30)
H = 560

BOARDS = {
    "G1-haze": ("G1 · a névoa desenhada como tela: retícula, prédios fantasma, o marco dentro da faixa", [
        ("city/reference", (1008, 86, 1800, 662), "Wikipedia · o salão do marco vira retícula vermelho/azul"),
        ("city/hn", (0, 0, 1440, 648), "Hacker News · metade de cima do quadro em retícula"),
        ("city/shop", (1100, 0, 2400, 700), "IKEA · a torre-marco e a sombra pontilhadas"),
    ]),
    "G2-confetti": ("G2 · a camada miúda em confete: árvores-pirulito, covas escuras, postes pretos, gente em pontos", [
        ("city/saas", (0, 547, 806, 1037), "Linear · praça: grade de copas iguais, covas e postes"),
        ("city/news", (1584, 648, 2448, 1296), "Guardian · praça cívica pontilhada"),
        ("city/media", (1728, 1368, 2880, 1800), "NASA · praça: o mesmo carimbo"),
    ]),
    "G3-ground": ("G3 · o chão sem material: piso chapado, grama neon, viela de lama, bordas duras, o tabuleiro", [
        ("city/institution", (0, 1238, 1008, 1800), "GOV.UK · pátio de grama neon, viela marrom"),
        ("city/saas", (288, 1008, 1008, 1440), "Linear · retângulo de grama colado no piso"),
        ("wide/saas", (0, 0, 1008, 504), "Linear (Wide) · fora do distrito: grade bege"),
        ("wide/hn", (0, 1296, 1008, 1800), "Hacker News (Wide) · vielas de terra, o vazio"),
    ]),
    "G4-placeholders": ("G4 · assets provisórios: o ar-condicionado-tanque e as telas de cor chapada", [
        ("city/oldweb", (360, 475, 1094, 922), "Paul Graham · um tanque em cada telhado plano"),
        ("street/hn", (360, 216, 1080, 648), "Hacker News (Street) · o mesmo tanque, de perto"),
        ("city/news", (1987, 806, 2592, 1267), "Guardian · telas sem conteúdo"),
        ("night/news", (1950, 800, 2500, 1300), "Guardian (noite) · retângulos pastel acesos"),
    ]),
    "G5-light": ("G5 · luz e volume: sombras serrilhadas, base sem contato, torres de vidro em grade, noite em manchas", [
        ("city/shop", (547, 806, 1440, 1382), "IKEA · sombras em escada irregular, bases sem contato"),
        ("city/news", (1380, 0, 1960, 432), "Guardian · vidro = caixa em grade"),
        ("night/news", (1238, 518, 1814, 1152), "Guardian (noite) · painéis em manchas"),
    ]),
}
for key, (title, crops) in BOARDS.items():
    tiles = []
    for src, box, label in crops:
        im = Image.open(f"{S}/{src}.png").convert("RGB").crop(box)
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        tiles.append((im, label))
    W = sum(t.width for t, _ in tiles) + 12 * (len(tiles) - 1)
    sheet = Image.new("RGB", (W, H + 100), (16, 16, 20))
    d = ImageDraw.Draw(sheet)
    d.text((8, 10), title, fill=(255, 255, 255), font=BIG)
    x = 0
    for im, label in tiles:
        d.text((x + 6, 58), label, fill=(255, 207, 90), font=FONT)
        sheet.paste(im, (x, 96))
        x += im.width + 12
    sheet.save(f"{O}/{key}.jpg", quality=88)
    print(f"{O}/{key}.jpg", sheet.size)
