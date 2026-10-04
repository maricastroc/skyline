#!/bin/bash
# Simple-index experiment, visual check (program differentiation pass):
#   BASE=http://localhost:3000 bash scripts/program/visual.sh
# BEFORE = kit-v7 (?v=7), AFTER = current; same pages, seed 7, cameras on the changed frontages.
set -e
export OUT=docs/screenshots/program/raw
R=$OUT; O=docs/screenshots/program/sheets
mkdir -p $R/crops $O
for v in before after; do q=$([ $v = before ] && echo "&v=7" || echo "")
  node scripts/kit.mjs \
    "pg-street-$v=page=oldweb&view=street&focus=-24,-24$q" "pg-close-$v=page=oldweb&view=close&focus=-24.5,-24.5$q" \
    "cl-street-$v=page=directory&view=street&focus=-24,31$q" "cl-close-$v=page=directory&view=close&focus=-24.5,31.5$q" \
    "gov-street-$v=page=institution&view=street&focus=-24.5,-6$q" "gov-close-$v=page=institution&view=close&focus=-25,-5.5$q" \
    "gh-street-$v=page=app&view=street&focus=-5,10$q" "gh-close-$v=page=app&view=close&focus=-5,8$q" \
    "gu-close-$v=page=news&view=close&focus=6,30$q" \
    "pg-city-$v=page=oldweb$q" "cl-city-$v=page=directory$q" "gov-city-$v=page=institution$q" "lb-city-$v=page=forum$q" \
    "pg-flat-$v=page=oldweb&flat=1$q" "cl-flat-$v=page=directory&flat=1$q" "gov-flat-$v=page=institution&flat=1$q" "gh-flat-$v=page=app&flat=1$q" \
    "ikea-street-$v=page=shop&view=street&focus=0,0$q" "lb-street-$v=page=forum&view=street&focus=0,0$q" \
    "wp-street-$v=page=reference&view=street&focus=15,6$q" "wp2-street-$v=page=reference-2&view=street&focus=0,0$q"
done
# Seed noise of the same view (BEFORE, seed 8): the scale for the street differences.
node scripts/kit.mjs "pg-street-seed8=page=oldweb&view=street&focus=-24,-24&v=7&seed=8" "gov-street-seed8=page=institution&view=street&focus=-24.5,-6&v=7&seed=8" \
  "cl-street-seed8=page=directory&view=street&focus=-24,31&v=7&seed=8" "gh-street-seed8=page=app&view=street&focus=-5,10&v=7&seed=8"
python3 - <<'PY'
from PIL import Image
R = "docs/screenshots/program/raw/"
def crop(src, dst, x, y, w):  # 2000-wide display coordinates, 16:10 box
    im = Image.open(R + src + ".png"); s = im.width / 2000
    im.crop((int(x * s), int(y * s), int((x + w) * s), int((y + w / 1.6) * s))).save(R + "crops/" + dst + ".png")
for v in ["before", "after"]:
    crop(f"gov-close-{v}", f"gov-row-right-{v}", 1440, 420, 560)
    crop(f"gov-close-{v}", f"gov-row-left-{v}", 0, 380, 700)
    crop(f"pg-close-{v}", f"pg-portal-{v}", 420, 520, 700)
    crop(f"cl-close-{v}", f"cl-row-{v}", 0, 330, 900)
    crop(f"gh-street-{v}", f"gh-roofs-{v}", 960, 100, 680)
PY
S() { python3 scripts/sheet.py "$@"; }
for p in "pg:Paul Graham" "cl:craigslist" "gov:GOV.UK" "gh:GitHub"; do k=${p%%:*}; n=${p#*:}
  S $O/$k-street-close.jpg 2 "$R/$k-street-before.png:$n - Street BEFORE (kit-v7)" "$R/$k-street-after.png:$n - Street AFTER (simple index -> institutional)" "$R/$k-close-before.png:$n - Close BEFORE" "$R/$k-close-after.png:$n - Close AFTER"; done
S $O/E-narrow-lots.jpg 2 "$R/crops/gov-row-right-before.png:GOV.UK, units about 1.1 tiles - BEFORE: a shop per unit" "$R/crops/gov-row-right-after.png:AFTER: portal + steps + lamps + 'BENEFITS' plaque per unit" "$R/crops/gov-row-left-before.png:GOV.UK, other row - BEFORE" "$R/crops/gov-row-left-after.png:AFTER: the same plaque repeated on every unit" "$R/crops/cl-row-before.png:craigslist (classic) - BEFORE" "$R/crops/cl-row-after.png:AFTER: rusticated base, sparse windows, 'PAGE' plaque per unit" "$R/crops/pg-portal-before.png:Paul Graham (retro) - BEFORE: shops, awnings, fire escapes" "$R/crops/pg-portal-after.png:AFTER: closed banded base, one portal, sparse windows" "$R/crops/gh-roofs-before.png:GitHub (soft) - BEFORE: roof gardens, shopfronts" "$R/crops/gh-roofs-after.png:AFTER: gardens gone (roof not occupiable), HVAC, blank base"
S $O/F-controls.jpg 2 "$R/ikea-street-before.png:IKEA Street BEFORE" "$R/ikea-street-after.png:IKEA Street AFTER (identical)" "$R/lb-street-before.png:lobste.rs Street BEFORE" "$R/lb-street-after.png:lobste.rs Street AFTER (identical: declared fallback)" "$R/wp-street-before.png:Wikipedia Street BEFORE (language list, 1 building)" "$R/wp-street-after.png:Wikipedia Street AFTER" "$R/wp2-street-before.png:Wikipedia 2 Street BEFORE" "$R/wp2-street-after.png:Wikipedia 2 Street AFTER (identical)"
S $O/G-city.jpg 2 "$R/pg-city-before.png:Paul Graham City BEFORE" "$R/pg-city-after.png:Paul Graham City AFTER" "$R/cl-city-before.png:craigslist City BEFORE" "$R/cl-city-after.png:craigslist City AFTER" "$R/gov-city-before.png:GOV.UK City BEFORE" "$R/gov-city-after.png:GOV.UK City AFTER" "$R/lb-city-before.png:lobste.rs City BEFORE (control)" "$R/lb-city-after.png:lobste.rs City AFTER (identical)"
S $O/H-flat.jpg 2 "$R/pg-flat-before.png:Paul Graham flat BEFORE" "$R/pg-flat-after.png:Paul Graham flat AFTER (fire escapes and tanks gone)" "$R/cl-flat-before.png:craigslist flat BEFORE" "$R/cl-flat-after.png:craigslist flat AFTER" "$R/gov-flat-before.png:GOV.UK flat BEFORE" "$R/gov-flat-after.png:GOV.UK flat AFTER" "$R/gh-flat-before.png:GitHub flat BEFORE" "$R/gh-flat-after.png:GitHub flat AFTER"
S $O/I-grid.jpg 2 "$R/gu-close-before.png:Guardian 'most viewed' grid - BEFORE" "$R/gu-close-after.png:AFTER (grid modules, 3 tiles)"
# Image distances (end-to-end normalisation: 1.0 = the median distance between two different pages).
for v in street close city flat; do
  python3 scripts/composition/pixdist.py $v $(for p in pg cl gov gh; do [ -f $R/$p-$v-before.png ] && echo $R/$p-$v-before.png $R/$p-$v-after.png; done)
done
python3 scripts/composition/pixdist.py close $R/gu-close-before.png $R/gu-close-after.png
python3 scripts/composition/pixdist.py street $(for p in pg cl gov gh; do echo $R/$p-street-before.png $R/$p-street-seed8.png; done) \
  $(for c in ikea lb wp wp2; do echo $R/$c-street-before.png $R/$c-street-after.png; done)
