import subprocess, sys, os

S, O = "docs/morphology/shots", "docs/morphology/sheets"
name, width = sys.argv[1], sys.argv[2]
arms = [a.split("=", 1) for a in sys.argv[3].split(",")]
suffix = sys.argv[4] if len(sys.argv) > 5 and sys.argv[4].startswith("-") else ""
pages = sys.argv[5:] if suffix else sys.argv[4:]
cells = []
for p in pages:
    for arm, label in arms:
        f = f"{S}/{arm}/{p}{suffix}.jpg"
        if not os.path.exists(f):
            print("missing", f)
            f = "-"
        cells.append(f"{f}:{p} · {label}")
subprocess.run(["python3", "scripts/surface/sheet.py", f"{O}/{name}.jpg", str(len(arms)), width, *cells], check=True)
