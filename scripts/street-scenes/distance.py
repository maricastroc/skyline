import itertools, sys
import numpy as np
sys.path.insert(0, "scripts/e2e")
from visual_lib import features, comps

DIR = sys.argv[1] if len(sys.argv) > 1 else "docs/screenshots/street-scenes/before"
CITIES = ["apple", "hn", "news", "saas"]
NAME = {"apple": "Apple", "hn": "HN", "news": "Guardian", "saas": "Linear"}
for view in ["city", "street", "corner", "shop", "square", "lobby"]:
    f = {c: features(f"{DIR}/{c}-{view}.png") for c in CITIES}
    d = {(a, b): float(comps(f[a], f[b]).mean()) for a, b in itertools.combinations(CITIES, 2)}
    print(f"{view:7s} mean {np.mean(list(d.values())):.3f} min {min(d.values()):.3f}  " + "  ".join(f"{NAME[a]}×{NAME[b]} {v:.3f}" for (a, b), v in d.items()))
