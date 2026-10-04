#!/bin/bash
# Narrow-lot institutional pass, visual check: BEFORE = kit-v8 (?v=8), AFTER = current.
#   BASE=http://localhost:3000 bash scripts/program/narrow-visual.sh
set -e
export OUT=docs/screenshots/program/narrow/raw
R=$OUT; O=docs/screenshots/program/narrow
mkdir -p $R
for v in before after; do q=$([ $v = before ] && echo "&v=8" || echo "")
  node scripts/kit.mjs \
    "gov-street-$v=page=institution&view=street&focus=-24.5,-6$q" "gov-close-$v=page=institution&view=close&focus=-25,-5.5$q" \
    "gov-close-night-$v=page=institution&view=close&focus=-25,-5.5&time=night$q" \
    "gov-soft-close-$v=page=institution&view=close&focus=-25,13$q" "gov-soft-close-night-$v=page=institution&view=close&focus=-25,13&time=night$q" \
    "pg-street-$v=page=oldweb&view=street&focus=-24,-24$q" "pg-close-$v=page=oldweb&view=close&focus=-24.5,-24.5$q" \
    "pg-street-night-$v=page=oldweb&view=street&focus=-24,-24&time=night$q" \
    "cl-street-$v=page=directory&view=street&focus=-24,31$q" "cl-close-$v=page=directory&view=close&focus=-24.5,31.5$q" \
    "gu-close-$v=page=news&view=close&focus=-6,33$q" "gh-street-$v=page=app&view=street&focus=-5,10$q" \
    "wp-archive-close-$v=page=reference&view=close&focus=9.4,-3$q" \
    "gov-street-seed8-$v=page=institution&view=street&focus=-24.5,-6&seed=8$q" \
    "pg-flat-$v=page=oldweb&flat=1$q" "cl-flat-$v=page=directory&flat=1$q" "gov-flat-$v=page=institution&flat=1$q"
done
mkdir -p $R/crops $O/sheets
python3 - <<'PY'
from PIL import Image
R = "docs/screenshots/program/narrow/raw/"
def crop(src, dst, x, y, w):  # 2000-wide display coordinates, 16:10 box
    im = Image.open(R + src + ".png"); s = im.width / 2000
    im.crop((int(x * s), int(y * s), int((x + w) * s), int((y + w / 1.6) * s))).save(R + "crops/" + dst + ".png")
for v in ["before", "after"]:
    crop(f"gov-close-{v}", f"gov-row-right-{v}", 1440, 420, 560)
    crop(f"gov-close-{v}", f"gov-row-left-{v}", 0, 380, 700)
    crop(f"gov-close-night-{v}", f"gov-row-right-night-{v}", 1440, 420, 560)
    crop(f"pg-close-{v}", f"pg-portal-{v}", 420, 520, 700)
    crop(f"cl-close-{v}", f"cl-row-{v}", 0, 330, 900)
PY
S() { python3 scripts/sheet.py "$@"; }
S $O/sheets/A-wide-control.jpg 2 "$R/wp-archive-close-before.png:Wide institutional (Wikipedia archive bars) - BEFORE (kit-v8)" "$R/wp-archive-close-after.png:AFTER (identical)" "$R/gu-close-before.png:Guardian grid modules (free-standing, 3 tiles) - BEFORE" "$R/gu-close-after.png:AFTER (identical)" "$R/gh-street-before.png:GitHub (institutional rows of 3.4-4.6 tile units) - BEFORE" "$R/gh-street-after.png:AFTER (identical)"
S $O/sheets/B-govuk.jpg 2 "$R/gov-street-before.png:GOV.UK Street - BEFORE (kit-v8)" "$R/gov-street-after.png:GOV.UK Street - AFTER" "$R/gov-close-before.png:GOV.UK Close - BEFORE" "$R/gov-close-after.png:GOV.UK Close - AFTER" "$R/crops/gov-row-left-before.png:Row of about 1.1-tile units - BEFORE: a portal per unit" "$R/crops/gov-row-left-after.png:AFTER: one marked entrance + plaque, plain doors" "$R/crops/gov-row-right-before.png:Other row - BEFORE" "$R/crops/gov-row-right-after.png:AFTER"
S $O/sheets/C-govuk-night-soft.jpg 2 "$R/gov-close-night-before.png:GOV.UK Close night - BEFORE" "$R/gov-close-night-after.png:AFTER: one lit entrance per row" "$R/gov-soft-close-before.png:GOV.UK soft rows - BEFORE" "$R/gov-soft-close-after.png:AFTER" "$R/gov-soft-close-night-before.png:soft rows, night - BEFORE" "$R/gov-soft-close-night-after.png:AFTER"
S $O/sheets/D-paulgraham.jpg 2 "$R/pg-street-before.png:Paul Graham (retro) Street - BEFORE" "$R/pg-street-after.png:AFTER" "$R/pg-close-before.png:Close - BEFORE" "$R/pg-close-after.png:AFTER" "$R/pg-street-night-before.png:Street night - BEFORE" "$R/pg-street-night-after.png:AFTER"
S $O/sheets/E-craigslist.jpg 2 "$R/cl-street-before.png:craigslist (classic) Street - BEFORE" "$R/cl-street-after.png:AFTER" "$R/cl-close-before.png:Close - BEFORE" "$R/cl-close-after.png:AFTER" "$R/crops/cl-row-before.png:Row - BEFORE: a PAGE plaque per unit" "$R/crops/cl-row-after.png:AFTER: one per row"
S $O/sheets/F-flat.jpg 2 "$R/pg-flat-before.png:Paul Graham flat - BEFORE" "$R/pg-flat-after.png:AFTER" "$R/cl-flat-before.png:craigslist flat - BEFORE" "$R/cl-flat-after.png:AFTER" "$R/gov-flat-before.png:GOV.UK flat - BEFORE" "$R/gov-flat-after.png:AFTER"
# Image distances (end-to-end normalisation: 1.0 = the median distance between two different pages).
for v in street close flat; do python3 scripts/composition/pixdist.py $v $(for f in $R/*-$v-before.png; do echo $f ${f%-before.png}-after.png; done); done
python3 scripts/composition/pixdist.py close $R/gov-close-night-before.png $R/gov-close-night-after.png $R/gov-soft-close-before.png $R/gov-soft-close-after.png $R/gov-soft-close-night-before.png $R/gov-soft-close-night-after.png $R/wp-archive-close-before.png $R/wp-archive-close-after.png
python3 scripts/composition/pixdist.py street $R/pg-street-night-before.png $R/pg-street-night-after.png $R/gov-street-seed8-before.png $R/gov-street-seed8-after.png $R/gov-street-before.png $R/gov-street-seed8-before.png
