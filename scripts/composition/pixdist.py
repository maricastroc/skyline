import sys, json, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "e2e"))
import numpy as np
from visual_lib import features, comps
view, files = sys.argv[1], sys.argv[2:]
med = np.array(json.load(open("docs/e2e/visual.json"))["views"][view]["componentMedians"])
for a, b in zip(files[::2], files[1::2]):
    print(f"{float((comps(features(a), features(b)) / med).mean()):.3f}  {a} ~ {b}")
