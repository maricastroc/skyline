#!/bin/bash
# End-to-end sheets: bash scripts/e2e/sheets.sh
set -e
cd "$(dirname "$0")/../.."
E=docs/screenshots/e2e; S=$E/sheets; mkdir -p $S
SH="python3 scripts/surface/sheet.py"
nm() { case $1 in reference) echo "Wikipedia (Suspension bridge)";; reference-2) echo "Wikipedia (Lighthouse)";; docs) echo "Python Docs";; shop) echo IKEA;; saas) echo Linear;; saas-2) echo Vercel;; institution) echo GOV.UK;; media) echo NASA;; oldweb) echo "Paul Graham";; app) echo GitHub;; news) echo Guardian;; forum) echo lobste.rs;; directory) echo craigslist;; portfolio) echo portfolio;; esac; }
P=(shop docs reference reference-2 saas saas-2 institution media oldweb portfolio app news forum directory)
for v in city street close flat; do
  args=(); for p in "${P[@]}"; do args+=("$E/normal/$p-$v.png:$(nm $p)"); done
  case $v in city) L=A;; street) L=B;; close) L=C;; flat) L=D;; esac
  $SH $S/$L-$v-matrix.jpg 5 700 "${args[@]}"
done
# E. page vs seed
args=()
for p in shop docs reference oldweb; do args+=("-:$(nm $p) · seed 7 / seed 8 (same page)"); for v in city street; do args+=("$E/normal/$p-$v.png:$v seed 7" "$E/seed8/$p-$v.png:$v seed 8"); done; done
$SH $S/E-page-vs-seed.jpg 4 700 "${args[@]}"
# F. page vs style
args=()
for p in shop docs reference oldweb; do args+=("-:$(nm $p) · own style / classic / modern (same page)"); for v in street close; do args+=("$E/normal/$p-$v.png:$v own" "$E/classic/$p-$v.png:$v classic" "$E/modern/$p-$v.png:$v modern"); done; done
$SH $S/F-page-vs-style.jpg 6 600 "${args[@]}"
# G. ablations: surface grammar off (kit-v4) and openings off (kit-v5), street
args=()
for p in shop docs reference oldweb; do args+=("-:$(nm $p) · street: no surface grammar (kit-v4) / no openings (kit-v5) / full"); args+=("$E/v4/$p-street.png:kit-v4" "$E/v5/$p-street.png:kit-v5" "$E/normal/$p-street.png:now"); done
$SH $S/G-ablations.jpg 3 900 "${args[@]}"
echo SHEETS DONE
# H / I: most similar and most different pairs
python3 - <<'PY'
import subprocess
E = "docs/screenshots/e2e"
def sheet(out, groups, views):
    args = []
    for a, b, note in groups:
        args.append(f"-:{a} ~ {b} · {note}")
        for v in views: args += [f"{E}/normal/{a}-{v}.png:{a} {v}", f"{E}/normal/{b}-{v}.png:{b} {v}"]
    subprocess.run(["python3", "scripts/surface/sheet.py", out, str(2 * len(views)), "560", *args], check=True)
sheet(f"{E}/sheets/H-most-similar.jpg", [
    ("reference", "reference-2", "expected: two Wikipedia articles"),
    ("saas", "saas-2", "expected: two SaaS landing pages"),
    ("directory", "oldweb", "massing convergence: two link lists"),
    ("forum", "institution", "palette convergence: same style, different structure"),
    ("portfolio", "media", "close in semantics and in the city"),
], ["city", "street", "flat"])
sheet(f"{E}/sheets/I-most-different.jpg", [
    ("shop", "directory", "most different (semantics p99, city p99)"),
    ("shop", "oldweb", "semantics p74, city p98"),
    ("docs", "shop", "semantics p87, city p97"),
], ["city", "street", "close"])
PY
