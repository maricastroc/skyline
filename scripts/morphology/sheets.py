import subprocess, sys, os

S, O = "docs/morphology/shots", "docs/morphology/sheets"
name, rest = sys.argv[1], sys.argv[2:]
cells, arm, label = [], None, None
for a in rest:
    if "=" in a:
        arm, label = a.split("=", 1)
        continue
    before, after = f"{S}/baseline/{a}.jpg", f"{S}/{arm}/{a}.jpg"
    if not os.path.exists(after):
        print("missing", after)
        continue
    cells += [f"{before}:{a} · antes", f"{after}:{a} · {label}"]
subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{name}.jpg", "4", "720", *cells], check=True)
