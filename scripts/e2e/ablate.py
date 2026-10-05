import json, statistics as st
m = json.load(open("docs/e2e/metrics.json")); ids = m["ids"]; B = m["breakdown"]
pairs = [f"{ids[i]}~{ids[j]}" for i in range(len(ids)) for j in range(i + 1, len(ids))]
def rank(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0] * len(xs)
    for k, i in enumerate(o): r[i] = k
    return r
def rho(a, b):
    ra, rb = rank(a), rank(b); ma, mb = st.mean(ra), st.mean(rb)
    n = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)); d = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5
    return n / d
sem = [st.mean(B[p]["semantics"].values()) for p in pairs]
def layer(L, drop=()):
    return [st.mean([v for k, v in B[p][L].items() if k not in drop]) for p in pairs]
cases = [
    ("massing", ()), ("massing", ("landmark", "landmarkFloors")), ("massing", ("roof",)), ("massing", ("family",)),
    ("surface", ()), ("surface", ("use",)), ("surface", ("body", "crown", "base")), ("surface", ("roof", "occupied")),
    ("territory", ()), ("territory", ("comp",)), ("composition", ()), ("composition", ("compPieces",)),
    ("expression", ()), ("expression", ("style", "frame", "awning")),
]
print("layer        dropped                       page mean   ρ(semantics)")
for L, drop in cases:
    v = layer(L, drop)
    print(f"{L:12} {('-' if not drop else ','.join(drop)):30} {st.mean(v):.3f}       {rho(sem, v):.2f}")

KEY = {"semantics": ("kind", "content"), "territory": ("comp", "rank"), "composition": ("compPieces", "piece"), "massing": ("family", "floors", "landmark"), "surface": ("use", "ground", "body", "roof"), "expression": ("style", "frame", "opening")}
print("\nkey components only               page mean   ρ(semantics key)   ρ with previous layer (key)")
semk = [st.mean([B[p]["semantics"][k] for k in KEY["semantics"]]) for p in pairs]
prev = semk
for L in m["layers"]:
    v = [st.mean([B[p][L][k] for k in KEY[L]]) for p in pairs]
    print(f"{L:12} {','.join(KEY[L]):22} {st.mean(v):.3f}       {rho(semk, v):.2f}              {rho(prev, v):.2f}")
    prev = v

print("\nsemantic subset vs territory / massing / surface (ρ)")
ter = [st.mean(B[p]["territory"].values()) for p in pairs]
mas = [st.mean(B[p]["massing"].values()) for p in pairs]
sur = [st.mean(B[p]["surface"].values()) for p in pairs]
subsets = {
    "structure the plan reads (kind, content, dominance, weightEntropy, regions, hero)": ("kind", "content", "dominance", "weightEntropy", "regions", "hero"),
    "page-wide fingerprint (size, depth, breadth, regularity, sections, textDensity, imagery, linkDensity, headings, interactivity, forms)": ("size", "depth", "breadth", "regularity", "sections", "textDensity", "imagery", "linkDensity", "headings", "interactivity", "forms"),
    "content make-up only": ("content",),
    "region kinds only": ("kind",),
}
for name, keys in subsets.items():
    v = [st.mean([B[p]["semantics"][k] for k in keys]) for p in pairs]
    print(f"  {rho(v, ter):.2f} / {rho(v, mas):.2f} / {rho(v, sur):.2f}   {name}")
