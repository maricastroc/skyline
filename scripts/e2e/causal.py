import json, statistics as st
m = json.load(open("docs/e2e/metrics.json")); v = json.load(open("docs/e2e/visual.json"))
ids = m["ids"]; B = m["breakdown"]
def rank(xs):
    o = sorted(range(len(xs)), key=lambda i: xs[i]); r = [0] * len(xs)
    for k, i in enumerate(o): r[i] = k
    return r
def rho(a, b):
    ra, rb = rank(a), rank(b); ma, mb = st.mean(ra), st.mean(rb)
    n = sum((x - ma) * (y - mb) for x, y in zip(ra, rb)); d = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** 0.5
    return n / d
pairs = [(a, b) for i, a in enumerate(ids) for b in ids[i + 1:]]
key = lambda a, b: f"{a}~{b}" if f"{a}~{b}" in B else f"{b}~{a}"
PLAN = ("kind", "content", "dominance", "weightEntropy", "regions", "hero")
layer = {L: [st.mean(B[key(a, b)][L].values()) for a, b in pairs] for L in m["layers"]}
layer["semantics (plan structure)"] = [st.mean([B[key(a, b)]["semantics"][k] for k in PLAN]) for a, b in pairs]
style = m["styleOf"]
for view, e in v["views"].items():
    vi = e["ids"]; M = e["matrix"]
    px = [M[vi.index(a)][vi.index(b)] for a, b in pairs]
    print(f"== {view}")
    print("  ρ(pixels, layer): " + " · ".join(f"{L} {rho(layer[L], px):.2f}" for L in ["semantics", "semantics (plan structure)", "territory", "composition", "massing", "surface", "expression"]))
    for alt in ("v4", "v5", "classic"):
        if f"{alt}Matrix" in e:
            ai = e[f"{alt}Ids"]; AM = e[f"{alt}Matrix"]
            apx = [AM[ai.index(a)][ai.index(b)] for a, b in pairs]
            print(f"  {alt:7} page↔page {st.mean(apx):.2f} · ρ(semantics plan) {rho(layer['semantics (plan structure)'], apx):.2f} · ρ(massing) {rho(layer['massing'], apx):.2f} · ρ(surface) {rho(layer['surface'], apx):.2f}")
    if "seed8SamePage" in e:
        sd = e["seed8SamePage"]["per"]; smax = max(sd.values())
        within = [(a, b, round(d, 2)) for (a, b), d in zip(pairs, px) if d <= smax]
        print(f"  seed noise mean {st.mean(sd.values()):.2f} max {smax:.2f} (max from {max(sd, key=sd.get)}) · page pairs ≤ seed max: {len(within)}/91 {within}")
    for s in ("classic", "modern"):
        if f"{s}SamePage" in e:
            per = {p: d for p, d in e[f"{s}SamePage"]["per"].items() if style[p] != s}
            print(f"  style → {s}: mean {st.mean(per.values()):.2f} over {len(per)} pages not already {s} (max {max(per.values()):.2f} {max(per, key=per.get)})")
    order = sorted(zip(px, pairs))
    print("  closest: " + ", ".join(f"{a}~{b} {d:.2f}" for d, (a, b) in order[:5]))
    print("  farthest: " + ", ".join(f"{a}~{b} {d:.2f}" for d, (a, b) in order[-5:]))
