# Semantic allocation — generated tables

BEFORE = kit-v2 (massing pass, cycled minors). AFTER = kit (territories). Seed 7, day, same 14 frozen pages. Elements = the AFTER partition of each page (regions, container remainders, page remainder).

## A. Allocation fidelity

faithful = Σ min(area share, weight share) (1 = land exactly ∝ weight). ρ = Spearman(weight, area) over elements ≥ 0.5%. over = max area/weight among them.

| page | faithful B | faithful A | ρ B | ρ A | over B | over A |
|---|---|---|---|---|---|---|
| reference | 0.68 | **0.99** | 0.22 | 0.98 | 15.48× | 1.16× |
| docs | 0.24 | **0.99** | -0.48 | 1.00 | 24.46× | 1.07× |
| app | 0.38 | **0.98** | 0.62 | 0.99 | 12.25× | 1.37× |
| saas | 0.46 | **0.99** | -0.26 | 1.00 | 12.91× | 1.16× |
| shop | 0.26 | **1.00** | 0.20 | 1.00 | 21.83× | 1.23× |
| news | 0.80 | **0.99** | 0.49 | 0.95 | 1.81× | 1.10× |
| portfolio | 0.36 | **0.98** | 0.80 | 0.97 | 26.72× | 1.33× |
| forum | 0.10 | **1.00** | -0.50 | 1.00 | 93.56× | 1.00× |
| institution | 0.52 | **0.99** | 0.45 | 1.00 | 9.36× | 1.02× |
| oldweb | 0.93 | **1.00** | – | – | 0.93× | 1.00× |
| media | 0.59 | **0.99** | 0.22 | 0.98 | 9.88× | 1.21× |
| directory | 0.45 | **0.99** | -0.55 | 1.00 | 34.87× | 1.31× |
| reference-2 | 0.56 | **0.99** | 0.15 | 0.99 | 4.62× | 1.18× |
| saas-2 | 0.67 | **1.00** | 0.72 | 1.00 | 5.62× | 1.01× |
| **mean** | 0.50 | **0.99** | 0.16 | 0.99 | | |

### Extremes

| page | element | weight | area B | area A | buildings B | buildings A |
|---|---|---|---|---|---|---|
| reference | references “References” | 11.7% | 6.9% | 11.7% | 8 | 13 |
| reference | footer “” | 1.5% | 2.9% | 1.6% | 6 | 3 |
| docs | section “Itertool Functions¶” | 50.3% | 7.1% | 50.4% | 2 | 11 |
| docs | footer “” | 0.2% | 17.9% | 0.4% | 33 | 1 |
| app | feed “Feed” | 39.8% | 6.5% | 39.8% | 2 | 51 |
| app | footer “” | 2.4% | 29.3% | 2.3% | 54 | 6 |
| saas | showcase “Build, review, and ship” | 26.2% | 7.0% | 26.2% | 2 | 10 |
| saas | footer “” | 5.1% | 13.4% | 5.1% | 24 | 7 |
| shop | pricing “Living on a student budg” | 74.7% | 7.2% | 74.6% | 2 | 111 |
| shop | footer “” | 10.6% | 30.4% | 10.5% | 50 | 13 |
| news | remainder “” | 16.7% | 0.0% | 16.8% | 0 | 8 |
| news | footer “” | 2.3% | 2.7% | 2.3% | 5 | 3 |
| portfolio | features “Build a Spotify Connecte” | 18.6% | 6.2% | 18.4% | 2 | 9 |
| portfolio | footer “” | 2.4% | 65.0% | 2.3% | 120 | 5 |
| forum | showcase “I got targeted: Trying t” | 96.4% | 7.2% | 96.5% | 2 | 35 |
| forum | footer “” | 0.9% | 85.5% | 0.8% | 152 | 2 |
| institution | footer “” | 23.8% | 17.9% | 23.8% | 33 | 30 |
| oldweb | remainder “page” | 99.9% | 92.7% | 100.0% | 164 | 32 |
| media | footer “” | 21.4% | 7.9% | 21.5% | 15 | 25 |
| directory | remainder “page” | 43.9% | 0.0% | 43.8% | 0 | 56 |
| directory | footer “” | 0.6% | 20.8% | 0.8% | 40 | 2 |
| reference-2 | references “References” | 18.8% | 6.9% | 18.8% | 8 | 13 |
| reference-2 | footer “” | 1.3% | 6.1% | 1.6% | 12 | 4 |
| saas-2 | footer “” | 26.2% | 17.9% | 26.2% | 33 | 33 |

## B. Contiguity

score = weight-averaged share of each element's land in its largest connected piece (lot grid, 4-neighbours; lots facing across a street are neighbours). split ≥5% = elements with ≥ 5% of the page in more than one piece.

| page | score B | score A | split ≥5% B | split ≥5% A |
|---|---|---|---|---|
| reference | 0.75 | **1.00** | 1 | 0 |
| docs | 0.97 | **1.00** | 0 | 0 |
| app | 0.93 | **1.00** | 0 | 0 |
| saas | 0.90 | **1.00** | 1 | 0 |
| shop | 0.92 | **1.00** | 1 | 0 |
| news | 0.55 | **1.00** | 0 | 0 |
| portfolio | 1.00 | **1.00** | 0 | 0 |
| forum | 1.00 | **1.00** | 0 | 0 |
| institution | 0.63 | **1.00** | 1 | 0 |
| oldweb | 1.00 | **1.00** | 0 | 0 |
| media | 0.68 | **1.00** | 1 | 0 |
| directory | 0.77 | **1.00** | 1 | 0 |
| reference-2 | 0.88 | **1.00** | 1 | 0 |
| saas-2 | 0.51 | **1.00** | 2 | 0 |

## C. Stability (perturbation → change)

owner = share of lots whose owner changed; shift = land-weighted centroid move of surviving owners (tiles); block / decision = the validation round's distances.

| page | perturbation | owner B | owner A | shift B | shift A | block B | block A | decision B | decision A |
|---|---|---|---|---|---|---|---|---|---|
| reference | text-10 | 0.00 | 0.02 | 0.0 | 0.2 | 0.00 | 0.03 | 0.00 | 0.05 |
| reference | text+10 | 0.04 | 0.02 | 0.0 | 0.1 | 0.00 | 0.05 | 0.00 | 0.05 |
| reference | links-10 | 0.04 | 0.06 | 0.0 | 0.6 | 0.00 | 0.06 | 0.00 | 0.08 |
| reference | drop-secondary | 0.00 | 0.02 | 0.0 | 0.3 | 0.00 | 0.01 | 0.00 | 0.05 |
| docs | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.01 |
| docs | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.01 |
| docs | links-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.01 |
| docs | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| app | text-10 | 0.31 | 0.27 | 0.1 | 0.1 | 0.11 | 0.16 | 0.18 | 0.13 |
| app | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| app | links-10 | 0.00 | 0.08 | 0.0 | 0.8 | 0.03 | 0.04 | 0.02 | 0.06 |
| app | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| saas | text-10 | 0.00 | 0.00 | 0.0 | 0.1 | 0.00 | 0.02 | 0.00 | 0.02 |
| saas | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.01 | 0.00 | 0.03 |
| saas | links-10 | 0.54 | 0.11 | 2.4 | 2.9 | 0.02 | 0.08 | 0.02 | 0.10 |
| saas | drop-secondary | 0.00 | 0.03 | 0.0 | 0.7 | 0.00 | 0.04 | 0.00 | 0.09 |
| shop | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| shop | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| shop | links-10 | 0.00 | 0.01 | 0.0 | 0.2 | 0.00 | 0.00 | 0.00 | 0.02 |
| shop | drop-secondary | 0.00 | 0.01 | 0.0 | 0.2 | 0.00 | 0.00 | 0.00 | 0.02 |
| news | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.02 |
| news | text+10 | 0.00 | 0.01 | 0.0 | 0.1 | 0.00 | 0.00 | 0.00 | 0.02 |
| news | links-10 | 0.56 | 0.34 | 5.6 | 3.4 | 0.02 | 0.05 | 0.00 | 0.06 |
| news | drop-secondary | 0.00 | 0.12 | 0.0 | 1.2 | 0.00 | 0.05 | 0.00 | 0.07 |
| portfolio | text-10 | 0.00 | 0.01 | 0.0 | 0.1 | 0.00 | 0.00 | 0.00 | 0.01 |
| portfolio | text+10 | 0.00 | 0.01 | 0.0 | 0.1 | 0.00 | 0.00 | 0.00 | 0.00 |
| portfolio | links-10 | 0.69 | 0.50 | 0.0 | 8.4 | 0.07 | 0.07 | 0.19 | 0.08 |
| portfolio | drop-secondary | 0.06 | 0.69 | 1.5 | 12.5 | 0.04 | 0.11 | 0.03 | 0.10 |
| forum | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| forum | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.03 | 0.00 | 0.02 | 0.00 |
| forum | links-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.03 | 0.00 | 0.02 | 0.02 |
| forum | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| institution | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.03 | 0.00 | 0.03 | 0.01 |
| institution | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.02 | 0.01 | 0.03 | 0.01 |
| institution | links-10 | 0.00 | 0.05 | 0.0 | 0.8 | 0.00 | 0.01 | 0.00 | 0.05 |
| institution | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| oldweb | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| oldweb | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| oldweb | links-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| oldweb | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| media | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| media | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| media | links-10 | 0.00 | 0.04 | 0.0 | 0.4 | 0.01 | 0.02 | 0.01 | 0.03 |
| media | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| directory | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| directory | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| directory | links-10 | 0.00 | 0.01 | 0.0 | 0.1 | 0.00 | 0.00 | 0.00 | 0.03 |
| directory | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| reference-2 | text-10 | 0.00 | 0.01 | 0.0 | 0.1 | 0.00 | 0.01 | 0.00 | 0.04 |
| reference-2 | text+10 | 0.10 | 0.02 | 0.0 | 0.1 | 0.00 | 0.02 | 0.00 | 0.06 |
| reference-2 | links-10 | 0.10 | 0.05 | 0.1 | 0.7 | 0.00 | 0.05 | 0.00 | 0.10 |
| reference-2 | drop-secondary | 0.00 | 0.03 | 0.0 | 0.5 | 0.00 | 0.01 | 0.00 | 0.05 |
| saas-2 | text-10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |
| saas-2 | text+10 | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.01 | 0.00 | 0.00 |
| saas-2 | links-10 | 0.00 | 0.04 | 0.0 | 0.6 | 0.00 | 0.03 | 0.00 | 0.09 |
| saas-2 | drop-secondary | 0.00 | 0.00 | 0.0 | 0.0 | 0.00 | 0.00 | 0.00 | 0.00 |

| summary (56 runs) | BEFORE | AFTER |
|---|---|---|
| owner change mean / max | 0.04 / 0.69 | 0.05 / 0.69 |
| runs with owner change > 25% | 4 | 4 |
| block ≤ 0.01 | 46 | 36 |
| block ≤ 0.04 | 53 | 45 |
| block max | 0.11 | 0.16 |
| centroid shift mean (tiles) | 0.17 | 0.63 |

### Removing one small region (0.5–5% of the page), everything else constant

48 removals present in both generators (regions that were briefs in BEFORE). owner = share of OTHER regions' lots whose owner changed.

| | BEFORE | AFTER |
|---|---|---|
| owner change mean / max | 0.51 / 0.84 | 0.15 / 0.35 |
| removals that change > 25% of the rest | 46 | 6 |
| block mean / max | 0.03 / 0.10 | 0.04 / 0.08 |

| page | region | weight | owner B | owner A | block B | block A |
|---|---|---|---|---|---|---|
| reference | references “References” | 1.5% | 0.54 | 0.10 | 0.04 | 0.05 |
| reference | infobox “Infobox” | 1.6% | 0.53 | 0.10 | 0.04 | 0.04 |
| reference | gallery “Gallery” | 1.5% | 0.51 | 0.08 | 0.04 | 0.04 |
| reference | section “Construction sequenc” | 3.6% | 0.51 | 0.17 | 0.04 | 0.04 |
| reference | section “Other examples” | 2.4% | 0.51 | 0.12 | 0.04 | 0.05 |
| reference | section “Notable collapses” | 2.9% | 0.50 | 0.16 | 0.04 | 0.05 |
| reference | references “Bibliography” | 1.7% | 0.49 | 0.11 | 0.04 | 0.05 |
| reference | nav “” | 2.1% | 0.55 | 0.16 | 0.05 | 0.08 |
| reference | form “Search” | 0.5% | 0.56 | 0.04 | 0.05 | 0.03 |
| reference | footer “” | 1.5% | 0.49 | 0.14 | 0.04 | 0.06 |
| docs | features “Table of Contents” | 0.7% | 0.51 | 0.00 | 0.02 | 0.00 |
| docs | features “Table of Contents” | 0.8% | 0.47 | 0.01 | 0.02 | 0.00 |
| docs | nav “” | 0.9% | 0.50 | 0.02 | 0.02 | 0.00 |
| app | nav “” | 3.2% | 0.01 | 0.14 | 0.10 | 0.07 |
| app | footer “” | 2.4% | 0.01 | 0.17 | 0.06 | 0.07 |
| saas | section “Changelog” | 2.2% | 0.48 | 0.06 | 0.02 | 0.04 |
| saas | testimonials “Testimonials” | 1.4% | 0.47 | 0.04 | 0.02 | 0.03 |
| saas | nav “” | 2.0% | 0.48 | 0.08 | 0.02 | 0.04 |
| shop | form “Search” | 1.3% | 0.51 | 0.00 | 0.07 | 0.01 |
| news | showcase “Russell T DaviesOn f” | 2.3% | 0.63 | 0.26 | 0.03 | 0.06 |
| news | section “In focus” | 2.3% | 0.62 | 0.22 | 0.02 | 0.04 |
| news | showcase “More features” | 4.1% | 0.84 | 0.35 | 0.07 | 0.04 |
| news | showcase “More sport” | 3.0% | 0.62 | 0.24 | 0.02 | 0.03 |
| news | showcase “More opinion” | 3.0% | 0.61 | 0.24 | 0.02 | 0.03 |
| news | showcase “More top stories” | 3.2% | 0.61 | 0.25 | 0.02 | 0.03 |
| news | showcase “Climate crisis & env” | 2.5% | 0.61 | 0.20 | 0.02 | 0.03 |
| news | showcase “What to watch” | 2.7% | 0.60 | 0.20 | 0.02 | 0.04 |
| news | showcase “What to listen to” | 2.6% | 0.59 | 0.20 | 0.02 | 0.03 |
| news | showcase “What to read” | 2.9% | 0.59 | 0.22 | 0.02 | 0.03 |
| news | showcase “What to play” | 2.9% | 0.59 | 0.23 | 0.02 | 0.03 |
| news | showcase “More culture” | 2.5% | 0.58 | 0.21 | 0.02 | 0.03 |
| news | showcase “Food” | 2.7% | 0.58 | 0.22 | 0.02 | 0.03 |
| news | showcase “Fashion & beauty” | 2.4% | 0.57 | 0.22 | 0.02 | 0.03 |
| news | showcase “Relationships” | 2.7% | 0.57 | 0.25 | 0.02 | 0.03 |
| news | showcase “Health & fitness” | 2.3% | 0.55 | 0.23 | 0.02 | 0.03 |
| news | showcase “More lifestyle” | 2.7% | 0.55 | 0.27 | 0.02 | 0.03 |
| news | features “Astrology I went to ” | 1.4% | 0.55 | 0.15 | 0.02 | 0.03 |
| news | showcase “Take part” | 2.3% | 0.54 | 0.26 | 0.02 | 0.03 |
| news | showcase “Newsletters” | 2.5% | 0.54 | 0.29 | 0.02 | 0.04 |
| news | footer “” | 2.3% | 0.53 | 0.32 | 0.02 | 0.04 |
| institution | section “Help us improve GOV.” | 3.6% | 0.51 | 0.11 | 0.02 | 0.05 |
| institution | nav “” | 3.8% | 0.47 | 0.13 | 0.04 | 0.05 |
| media | section “Image Of The Day” | 2.7% | 0.45 | 0.12 | 0.02 | 0.08 |
| media | section “NASA History” | 2.9% | 0.45 | 0.11 | 0.02 | 0.08 |
| media | brand “NASA” | 0.9% | 0.47 | 0.03 | 0.02 | 0.03 |
| media | form “Search” | 1.1% | 0.50 | 0.05 | 0.03 | 0.03 |
| directory | features “Egypt” | 2.1% | 0.35 | 0.04 | 0.03 | 0.04 |
| directory | footer “” | 0.6% | 0.33 | 0.02 | 0.04 | 0.03 |

## D. Differentiation

| metric (min / mean / max) | seed only B | seed only A | siblings B | siblings A | different pages B | different pages A |
|---|---|---|---|---|---|---|
| block | 0.02 / 0.03 / 0.06 | 0.01 / 0.03 / 0.05 | 0.07 / 0.14 / 0.21 | 0.13 / 0.28 / 0.42 | 0.06 / 0.19 / 0.34 | 0.03 / 0.33 / 0.53 |
| decision | 0.00 / 0.02 / 0.04 | 0.01 / 0.04 / 0.14 | 0.13 / 0.26 / 0.38 | 0.13 / 0.38 / 0.63 | 0.13 / 0.40 / 0.66 | 0.23 / 0.55 / 0.83 |

page difference / seed noise (means): block B 5.8× → A 12.6×; decision B 16.6× → A 12.3×

closest different pages (block): B docs×institution 0.06, directory×reference 0.10, media×saas 0.11, directory×oldweb 0.11, docs×oldweb 0.11 · A forum×oldweb 0.03, app×docs 0.16, directory×docs 0.16, reference×shop 0.18, institution×shop 0.19

closest different pages (decision): B institution×saas 0.13, institution×shop 0.14, media×saas 0.14, media×shop 0.15, docs×institution 0.15 · A forum×saas 0.23, institution×media 0.24, docs×institution 0.29, media×saas 0.30, app×institution 0.30

### Block distance matrix (AFTER)

| | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | reference-2 | saas-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reference | · | 0.23 | 0.27 | 0.38 | 0.18 | 0.25 | 0.24 | 0.44 | 0.26 | 0.44 | 0.31 | 0.25 | 0.13 | 0.24 |
| docs | 0.23 | · | 0.16 | 0.42 | 0.24 | 0.25 | 0.29 | 0.46 | 0.26 | 0.46 | 0.34 | 0.16 | 0.25 | 0.31 |
| app | 0.27 | 0.16 | · | 0.44 | 0.25 | 0.24 | 0.30 | 0.44 | 0.27 | 0.45 | 0.37 | 0.21 | 0.28 | 0.36 |
| saas | 0.38 | 0.42 | 0.44 | · | 0.44 | 0.35 | 0.34 | 0.22 | 0.42 | 0.22 | 0.34 | 0.50 | 0.37 | 0.42 |
| shop | 0.18 | 0.24 | 0.25 | 0.44 | · | 0.25 | 0.25 | 0.50 | 0.19 | 0.50 | 0.31 | 0.21 | 0.18 | 0.20 |
| news | 0.25 | 0.25 | 0.24 | 0.35 | 0.25 | · | 0.30 | 0.33 | 0.29 | 0.34 | 0.28 | 0.32 | 0.26 | 0.31 |
| portfolio | 0.24 | 0.29 | 0.30 | 0.34 | 0.25 | 0.30 | · | 0.35 | 0.33 | 0.35 | 0.39 | 0.29 | 0.24 | 0.36 |
| forum | 0.44 | 0.46 | 0.44 | 0.22 | 0.50 | 0.33 | 0.35 | · | 0.50 | 0.03 | 0.38 | 0.52 | 0.48 | 0.49 |
| institution | 0.26 | 0.26 | 0.27 | 0.42 | 0.19 | 0.29 | 0.33 | 0.50 | · | 0.51 | 0.20 | 0.25 | 0.25 | 0.25 |
| oldweb | 0.44 | 0.46 | 0.45 | 0.22 | 0.50 | 0.34 | 0.35 | 0.03 | 0.51 | · | 0.39 | 0.53 | 0.48 | 0.50 |
| media | 0.31 | 0.34 | 0.37 | 0.34 | 0.31 | 0.28 | 0.39 | 0.38 | 0.20 | 0.39 | · | 0.36 | 0.35 | 0.30 |
| directory | 0.25 | 0.16 | 0.21 | 0.50 | 0.21 | 0.32 | 0.29 | 0.52 | 0.25 | 0.53 | 0.36 | · | 0.28 | 0.25 |
| reference-2 | 0.13 | 0.25 | 0.28 | 0.37 | 0.18 | 0.26 | 0.24 | 0.48 | 0.25 | 0.48 | 0.35 | 0.28 | · | 0.25 |
| saas-2 | 0.24 | 0.31 | 0.36 | 0.42 | 0.20 | 0.31 | 0.36 | 0.49 | 0.25 | 0.50 | 0.30 | 0.25 | 0.25 | · |

### Decision distance matrix (AFTER)

| | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | reference-2 | saas-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reference | · | 0.56 | 0.53 | 0.66 | 0.63 | 0.61 | 0.55 | 0.75 | 0.48 | 0.74 | 0.54 | 0.49 | 0.13 | 0.55 |
| docs | 0.56 | · | 0.44 | 0.50 | 0.49 | 0.77 | 0.50 | 0.54 | 0.29 | 0.80 | 0.38 | 0.67 | 0.55 | 0.56 |
| app | 0.53 | 0.44 | · | 0.41 | 0.50 | 0.52 | 0.31 | 0.55 | 0.30 | 0.76 | 0.35 | 0.51 | 0.52 | 0.57 |
| saas | 0.66 | 0.50 | 0.41 | · | 0.41 | 0.42 | 0.35 | 0.23 | 0.39 | 0.61 | 0.30 | 0.79 | 0.61 | 0.63 |
| shop | 0.63 | 0.49 | 0.50 | 0.41 | · | 0.68 | 0.46 | 0.50 | 0.36 | 0.82 | 0.34 | 0.79 | 0.59 | 0.64 |
| news | 0.61 | 0.77 | 0.52 | 0.42 | 0.68 | · | 0.57 | 0.59 | 0.67 | 0.72 | 0.58 | 0.68 | 0.56 | 0.73 |
| portfolio | 0.55 | 0.50 | 0.31 | 0.35 | 0.46 | 0.57 | · | 0.47 | 0.33 | 0.76 | 0.35 | 0.76 | 0.52 | 0.61 |
| forum | 0.75 | 0.54 | 0.55 | 0.23 | 0.50 | 0.59 | 0.47 | · | 0.47 | 0.47 | 0.43 | 0.83 | 0.71 | 0.71 |
| institution | 0.48 | 0.29 | 0.30 | 0.39 | 0.36 | 0.67 | 0.33 | 0.47 | · | 0.77 | 0.24 | 0.63 | 0.47 | 0.48 |
| oldweb | 0.74 | 0.80 | 0.76 | 0.61 | 0.82 | 0.72 | 0.76 | 0.47 | 0.77 | · | 0.72 | 0.83 | 0.76 | 0.81 |
| media | 0.54 | 0.38 | 0.35 | 0.30 | 0.34 | 0.58 | 0.35 | 0.43 | 0.24 | 0.72 | · | 0.74 | 0.50 | 0.49 |
| directory | 0.49 | 0.67 | 0.51 | 0.79 | 0.79 | 0.68 | 0.76 | 0.83 | 0.63 | 0.83 | 0.74 | · | 0.51 | 0.73 |
| reference-2 | 0.13 | 0.55 | 0.52 | 0.61 | 0.59 | 0.56 | 0.52 | 0.71 | 0.47 | 0.76 | 0.50 | 0.51 | · | 0.56 |
| saas-2 | 0.55 | 0.56 | 0.57 | 0.63 | 0.64 | 0.73 | 0.61 | 0.71 | 0.48 | 0.81 | 0.49 | 0.73 | 0.56 | · |

## E. Landmark

| page | BEFORE | AFTER |
|---|---|---|
| reference | civic @1,1 full ≤4f | clocktower @1,1 full 10–14f (gateway) |
| docs | stepped @1,1 full ≥20f | none |
| app | stepped @1,1 full ≥20f | none |
| saas | stepped @1,1 full ≥20f | podiumTower @1,1 full ≥20f (showcase) |
| shop | stepped @1,1 full ≥20f | podiumTower @1,1 full 15–19f (showcase) |
| news | civic @1,1 full ≤4f | none |
| portfolio | stepped @1,1 full ≥20f | clocktower @1,1 full 10–14f (gateway) |
| forum | stepped @1,1 full ≥20f | clocktower @1,1 quad 5–9f (gateway) |
| institution | stepped @1,1 full ≥20f | civic @1,1 half ≤4f (statement) |
| oldweb | clocktower @1,1 full 10–14f | none |
| media | stepped @1,1 full ≥20f | civic @1,1 half ≤4f (statement) |
| directory | civic @1,1 full ≤4f | none |

Pages with a landmark: BEFORE 12/12, AFTER 7/12. Largest group of pages sharing the SAME landmark (family + placement + massing): BEFORE 8/12, AFTER 2/12.

Largest group sharing family + placement + massing: BEFORE 8/12 (stepped @1,1 full ≥20f: docs, app, saas, shop, portfolio, forum, institution, media) · AFTER 5/12 (none: docs, app, news, oldweb, directory). Distinct combinations: BEFORE 3, AFTER 6.

Groups AFTER: none → docs, app, news, oldweb, directory · clocktower @1,1 full 10–14f → reference, portfolio · civic @1,1 half ≤4f → institution, media · podiumTower @1,1 full ≥20f → saas · podiumTower @1,1 full 15–19f → shop · clocktower @1,1 quad 5–9f → forum

### Style independence (landmark family under four forced styles)

| page | styles | BEFORE | AFTER |
|---|---|---|---|
| reference | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:clocktower mono:clocktower legacy:clocktower rounded:clocktower |
| docs | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:none mono:none legacy:none rounded:none |
| app | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:none mono:none legacy:none rounded:none |
| saas | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:podiumTower mono:podiumTower legacy:podiumTower rounded:podiumTower |
| shop | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:podiumTower mono:podiumTower legacy:podiumTower rounded:podiumTower |
| news | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:none mono:none legacy:none rounded:none |
| portfolio | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:clocktower mono:clocktower legacy:clocktower rounded:clocktower |
| forum | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:clocktower mono:clocktower legacy:clocktower rounded:clocktower |
| institution | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:civic mono:civic legacy:civic rounded:civic |
| oldweb | serif:retro mono:retro legacy:retro rounded:retro | serif:clocktower mono:clocktower legacy:clocktower rounded:clocktower | serif:none mono:none legacy:none rounded:none |
| media | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:civic mono:civic legacy:civic rounded:civic |
| directory | serif:classic mono:tech legacy:retro rounded:soft | serif:civic mono:narrowTower legacy:clocktower rounded:stepped | serif:none mono:none legacy:none rounded:none |

Pages whose landmark family changes with style alone: BEFORE 11/12, AFTER 0/12.

## F. Semantic coverage

AFTER land by source: a named region / a container's own content (remainder) / content outside every region (page). BEFORE: composed blocks of majors / lots of minor briefs / fallback / unattributed (yards between lots). Speaking blocks: BEFORE = composed blocks; AFTER = blocks owned entirely by one named region.

| page | faithful B | faithful A | B major / minor / fallback / other | A region / remainder / page | speaking blocks B | A |
|---|---|---|---|---|---|---|
| reference | 0.68 | 0.99 | 37.5% / 52.9% / 0.0% / 9.6% | 80.5% / 15.2% / 4.3% | 6/16 | 4/16 |
| docs | 0.24 | 0.99 | 25.0% / 63.2% / 0.0% / 11.8% | 94.9% / 3.9% / 1.2% | 4/16 | 12/16 |
| app | 0.38 | 0.98 | 37.5% / 52.9% / 0.0% / 9.6% | 80.5% / 19.1% / 0.4% | 6/16 | 6/16 |
| saas | 0.46 | 0.99 | 31.3% / 58.1% / 0.0% / 10.7% | 91.8% / 7.8% / 0.4% | 5/16 | 10/16 |
| shop | 0.26 | 1.00 | 12.5% / 73.9% / 0.0% / 13.6% | 94.1% / 0.4% / 5.5% | 2/16 | 13/16 |
| news | 0.80 | 0.99 | 31.3% / 58.1% / 0.0% / 10.7% | 75.4% / 22.3% / 2.3% | 5/16 | 1/16 |
| portfolio | 0.36 | 0.98 | 31.3% / 58.1% / 0.0% / 10.7% | 80.5% / 16.0% / 3.5% | 5/16 | 5/16 |
| forum | 0.10 | 1.00 | 12.5% / 73.9% / 0.0% / 13.6% | 99.2% / 0.4% / 0.4% | 2/16 | 14/16 |
| institution | 0.52 | 0.99 | 25.0% / 63.2% / 0.0% / 11.8% | 94.5% / 4.7% / 0.8% | 4/16 | 7/16 |
| oldweb | 0.93 | 1.00 | 6.3% / 0.0% / 79.0% / 14.8% | 0.0% / 0.0% / 100.0% | 1/16 | 0/16 |
| media | 0.59 | 0.99 | 37.5% / 52.9% / 0.0% / 9.6% | 87.5% / 5.5% / 7.0% | 6/16 | 6/16 |
| directory | 0.45 | 0.99 | 31.3% / 58.1% / 0.0% / 10.7% | 56.3% / 0.0% / 43.8% | 5/16 | 4/16 |
| reference-2 | 0.56 | 0.99 | 37.5% / 52.9% / 0.0% / 9.6% | 78.9% / 17.6% / 3.5% | 6/16 | 4/16 |
| saas-2 | 0.67 | 1.00 | 25.0% / 63.2% / 0.0% / 11.8% | 91.4% / 2.0% / 6.6% | 4/16 | 8/16 |

## Monotonicity (one element's weight changed, the rest rescaled)

### shop · pricing “Living on a student budget” (actual 74.7%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 5.0% | 13 | 5.1% | 13 | 1 | 7.2% | 2 |
| 10.0% | 26 | 10.2% | 16 | 1 | 7.2% | 2 |
| 20.0% | 51 | 19.9% | 30 | 1 | 7.2% | 2 |
| 40.0% | 102 | 39.8% | 60 | 1 | 7.2% | 2 |
| 70.0% | 180 | 70.3% | 104 | 1 | 7.2% | 2 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER yes, BEFORE constant (ignores weight)

### institution · feed “Benefits” (actual 22.2%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 5.0% | 13 | 5.1% | 4 | 1 | 4.4% | 1 |
| 10.0% | 26 | 10.2% | 10 | 1 | 4.4% | 1 |
| 20.0% | 51 | 19.9% | 22 | 1 | 4.4% | 1 |
| 40.0% | 103 | 40.2% | 52 | 1 | 4.4% | 1 |
| 70.0% | 179 | 69.9% | 90 | 1 | 4.4% | 1 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER yes, BEFORE constant (ignores weight)

### reference · features “History” (actual 10.2%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 5.0% | 13 | 5.1% | 4 | 1 | 6.9% | 1 |
| 10.0% | 26 | 10.2% | 7 | 1 | 6.9% | 1 |
| 20.0% | 51 | 19.9% | 10 | 1 | 6.9% | 1 |
| 40.0% | 102 | 39.8% | 12 | 1 | 6.9% | 1 |
| 70.0% | 179 | 69.9% | 21 | 1 | 6.9% | 1 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER yes, BEFORE constant (ignores weight)

### forum · footer “” (actual 0.9%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 0.2% | 0 | 0.0% | 0 | 0 | 85.5% | 152 |
| 0.5% | 1 | 0.4% | 1 | 1 | 85.5% | 152 |
| 1.0% | 2 | 0.8% | 2 | 1 | 85.5% | 152 |
| 2.0% | 5 | 2.0% | 5 | 1 | 85.5% | 152 |
| 5.0% | 13 | 5.1% | 7 | 1 | 85.5% | 152 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER yes, BEFORE constant (ignores weight)

### saas · section “Changelog” (actual 2.2%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 0.2% | 1 | 0.4% | 0 | 1 | 12.9% | 24 |
| 0.5% | 2 | 0.8% | 0 | 1 | 12.9% | 24 |
| 1.0% | 3 | 1.2% | 1 | 1 | 12.9% | 24 |
| 2.0% | 5 | 2.0% | 1 | 1 | 12.9% | 24 |
| 5.0% | 13 | 5.1% | 4 | 1 | 12.9% | 24 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER yes, BEFORE constant (ignores weight)

### news · nav “” (actual 7.9%)

| weight | AFTER lots | AFTER land | AFTER buildings | AFTER pieces | BEFORE land | BEFORE buildings |
|---|---|---|---|---|---|---|
| 0.2% | 0 | 0.0% | 0 | 0 | 13.3% | 13 |
| 0.5% | 1 | 0.4% | 0 | 1 | 13.3% | 13 |
| 1.0% | 2 | 0.8% | 1 | 1 | 13.3% | 13 |
| 2.0% | 5 | 2.0% | 4 | 1 | 13.3% | 13 |
| 5.0% | 13 | 5.1% | 2 | 1 | 13.3% | 13 |

monotone land: AFTER yes, BEFORE constant (ignores weight) · monotone buildings: AFTER **no**, BEFORE constant (ignores weight)

