# Generated tables

Adapter constants: MAJOR_SHARE 0.04, MAX_MAJORS 5, CONTAINER_SHARE 0.5, content rules {"tableShare":0.3,"imagesPerK":2,"minImages":3,"linksPer100":2.5,"minControls":3}. Seed 7, day.

## Pages

| id | style (2nd) | vert | majors (content:label) | minors | blocks (non-lot) | landmark | buildings | floors mean/max | distinct lot programs |
|---|---|---|---|---|---|---|---|---|---|
| reference | classic (modern 0.15) | 0.81 | ★links:Wikipedia, links:Contents, text:History, media:Longest, links:References, structured:External | 17 | civic, market, court, towers, market, court | civic | 129 | 3.9/15 | 50/108 |
| docs | modern (tech 0.22) | 0.68 | ★text:Python, links:Feed, text:Itertool, text:Itertools | 4 | civic, market, slabs, slabs | stepped | 145 | 2.5/21 | 23/132 |
| app | soft (modern 0.31) | 0.79 | ★text:GitHub, media:Navigation, links:section, structured:Latest, media:Repository, links:About | 2 | civic, towers, market, slabs, towers, market | stepped | 131 | 3.3/22 | 16/108 |
| saas | modern (soft 0.27) | 0.63 | ★media:Linear, media:Intake and, media:Planning and, media:AI and, media:Build review | 5 | civic, towers, towers, towers, towers | stepped | 129 | 3.4/21 | 33/120 |
| shop | modern (soft 0.26) | 0.74 | ★media:IKEA, structured:Living on a | 3 | civic, slabs | stepped | 155 | 2.8/22 | 28/152 |
| news | classic (soft 0.33) | 0.66 | ★links:Latest news, media:News, media:More, media:Sport, text:Most popular | 22 | civic, towers, towers, towers, court | civic | 128 | 3.7/14 | 34/120 |
| portfolio | soft (modern 0.33) | 0.60 | ★links:Brittany, text:About, text:Experience, media:Projects, media:Writing | 1 | civic, court, court, towers, towers | stepped | 127 | 1.8/21 | 8/120 |
| forum | modern (soft 0.19) | 0.49 | ★links:Lobsters, media:I got | 1 | civic, towers | stepped | 155 | 1.5/20 | 8/152 |
| institution | modern (soft 0.19) | 0.52 | ★text:Welcome to, links:Popular on, media:Services and, text:Government | 4 | civic, market, towers, slabs | stepped | 145 | 2.8/20 | 31/132 |
| oldweb | retro (modern 0.15) | 0.52 | ★text:Essays | 1 | civic | clocktower | 165 | 3.3/12 | 22/164 |
| media | modern (soft 0.31) | 0.46 | ★text:NASA, links:Suggested, media:NASA Image, media:Artemis II, media:Discover, action:Was this | 7 | civic, market, towers, towers, towers, plaza | stepped | 125 | 3.3/20 | 41/108 |
| directory | classic (modern 0.17) | 0.51 | ★text:craigslist, links:Alberta, links:Austria, links:Bangladesh, links:Argentina | 3 | civic, market, market, market, market | civic | 153 | 3.2/6 | 20/120 |
| reference-2 | classic (modern 0.16) | 0.84 | ★links:Wikipedia, text:History, text:Technology, text:Building, links:References, structured:External | 9 | civic, court, court, court, market, court | civic | 121 | 3.5/6 | 44/108 |
| saas-2 | tech (soft 0.26) | 0.62 | ★media:Vercel, links:Introduction, media:Build agents, text:Recently | 4 | civic, market, towers, slabs | narrowTower | 145 | 3.5/21 | 31/132 |

## Block-morphology distance (per block: coverage, mean/max/std height; 0 = same)

| | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | reference-2 | saas-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reference | · | 0.22 | 0.22 | 0.24 | 0.28 | 0.12 | 0.27 | 0.34 | 0.22 | 0.17 | 0.23 | 0.10 | 0.07 | 0.19 |
| docs | 0.22 | · | 0.15 | 0.15 | 0.14 | 0.22 | 0.15 | 0.17 | 0.06 | 0.11 | 0.17 | 0.19 | 0.22 | 0.18 |
| app | 0.22 | 0.15 | · | 0.12 | 0.23 | 0.20 | 0.19 | 0.23 | 0.15 | 0.16 | 0.18 | 0.18 | 0.21 | 0.19 |
| saas | 0.24 | 0.15 | 0.12 | · | 0.22 | 0.14 | 0.14 | 0.22 | 0.13 | 0.18 | 0.11 | 0.25 | 0.27 | 0.21 |
| shop | 0.28 | 0.14 | 0.23 | 0.22 | · | 0.28 | 0.17 | 0.12 | 0.18 | 0.18 | 0.21 | 0.26 | 0.26 | 0.30 |
| news | 0.12 | 0.22 | 0.20 | 0.14 | 0.28 | · | 0.26 | 0.29 | 0.19 | 0.18 | 0.21 | 0.15 | 0.16 | 0.20 |
| portfolio | 0.27 | 0.15 | 0.19 | 0.14 | 0.17 | 0.26 | · | 0.14 | 0.18 | 0.19 | 0.16 | 0.28 | 0.30 | 0.29 |
| forum | 0.34 | 0.17 | 0.23 | 0.22 | 0.12 | 0.29 | 0.14 | · | 0.20 | 0.18 | 0.27 | 0.28 | 0.33 | 0.33 |
| institution | 0.22 | 0.06 | 0.15 | 0.13 | 0.18 | 0.19 | 0.18 | 0.20 | · | 0.13 | 0.13 | 0.19 | 0.23 | 0.14 |
| oldweb | 0.17 | 0.11 | 0.16 | 0.18 | 0.18 | 0.18 | 0.19 | 0.18 | 0.13 | · | 0.19 | 0.11 | 0.18 | 0.18 |
| media | 0.23 | 0.17 | 0.18 | 0.11 | 0.21 | 0.21 | 0.16 | 0.27 | 0.13 | 0.19 | · | 0.26 | 0.26 | 0.21 |
| directory | 0.10 | 0.19 | 0.18 | 0.25 | 0.26 | 0.15 | 0.28 | 0.28 | 0.19 | 0.11 | 0.26 | · | 0.09 | 0.16 |
| reference-2 | 0.07 | 0.22 | 0.21 | 0.27 | 0.26 | 0.16 | 0.30 | 0.33 | 0.23 | 0.18 | 0.26 | 0.09 | · | 0.19 |
| saas-2 | 0.19 | 0.18 | 0.19 | 0.21 | 0.30 | 0.20 | 0.29 | 0.33 | 0.14 | 0.18 | 0.21 | 0.16 | 0.19 | · |

## Massing distance (building heightmaps, 0.5-tile cells; 0 = same massing)

| | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | reference-2 | saas-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reference | · | 0.47 | 0.48 | 0.48 | 0.63 | 0.36 | 0.50 | 0.60 | 0.49 | 0.37 | 0.53 | 0.34 | 0.35 | 0.46 |
| docs | 0.47 | · | 0.33 | 0.39 | 0.45 | 0.47 | 0.37 | 0.38 | 0.19 | 0.36 | 0.44 | 0.39 | 0.48 | 0.35 |
| app | 0.48 | 0.33 | · | 0.34 | 0.55 | 0.43 | 0.38 | 0.42 | 0.32 | 0.38 | 0.48 | 0.41 | 0.50 | 0.44 |
| saas | 0.48 | 0.39 | 0.34 | · | 0.52 | 0.34 | 0.36 | 0.40 | 0.35 | 0.39 | 0.35 | 0.44 | 0.54 | 0.42 |
| shop | 0.63 | 0.45 | 0.55 | 0.52 | · | 0.62 | 0.45 | 0.38 | 0.47 | 0.53 | 0.56 | 0.56 | 0.58 | 0.57 |
| news | 0.36 | 0.47 | 0.43 | 0.34 | 0.62 | · | 0.54 | 0.54 | 0.42 | 0.37 | 0.47 | 0.39 | 0.46 | 0.42 |
| portfolio | 0.50 | 0.37 | 0.38 | 0.36 | 0.45 | 0.54 | · | 0.32 | 0.40 | 0.45 | 0.39 | 0.47 | 0.52 | 0.50 |
| forum | 0.60 | 0.38 | 0.42 | 0.40 | 0.38 | 0.54 | 0.32 | · | 0.39 | 0.48 | 0.49 | 0.51 | 0.60 | 0.51 |
| institution | 0.49 | 0.19 | 0.32 | 0.35 | 0.47 | 0.42 | 0.40 | 0.39 | · | 0.36 | 0.39 | 0.40 | 0.50 | 0.30 |
| oldweb | 0.37 | 0.36 | 0.38 | 0.39 | 0.53 | 0.37 | 0.45 | 0.48 | 0.36 | · | 0.45 | 0.28 | 0.41 | 0.36 |
| media | 0.53 | 0.44 | 0.48 | 0.35 | 0.56 | 0.47 | 0.39 | 0.49 | 0.39 | 0.45 | · | 0.51 | 0.59 | 0.47 |
| directory | 0.34 | 0.39 | 0.41 | 0.44 | 0.56 | 0.39 | 0.47 | 0.51 | 0.40 | 0.28 | 0.51 | · | 0.36 | 0.40 |
| reference-2 | 0.35 | 0.48 | 0.50 | 0.54 | 0.58 | 0.46 | 0.52 | 0.60 | 0.50 | 0.41 | 0.59 | 0.36 | · | 0.49 |
| saas-2 | 0.46 | 0.35 | 0.44 | 0.42 | 0.57 | 0.42 | 0.50 | 0.51 | 0.30 | 0.36 | 0.47 | 0.40 | 0.49 | · |

## Decision distance (block kinds, families, roofs, styles; 0 = same mix)

| | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | reference-2 | saas-2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reference | · | 0.56 | 0.46 | 0.54 | 0.55 | 0.23 | 0.57 | 0.60 | 0.50 | 0.49 | 0.48 | 0.28 | 0.13 | 0.53 |
| docs | 0.56 | · | 0.35 | 0.23 | 0.25 | 0.56 | 0.47 | 0.26 | 0.15 | 0.47 | 0.29 | 0.50 | 0.57 | 0.36 |
| app | 0.46 | 0.35 | · | 0.35 | 0.39 | 0.42 | 0.27 | 0.43 | 0.32 | 0.51 | 0.35 | 0.43 | 0.50 | 0.42 |
| saas | 0.54 | 0.23 | 0.35 | · | 0.19 | 0.45 | 0.35 | 0.23 | 0.13 | 0.51 | 0.14 | 0.58 | 0.56 | 0.38 |
| shop | 0.55 | 0.25 | 0.39 | 0.19 | · | 0.45 | 0.35 | 0.17 | 0.14 | 0.43 | 0.15 | 0.64 | 0.55 | 0.39 |
| news | 0.23 | 0.56 | 0.42 | 0.45 | 0.45 | · | 0.41 | 0.48 | 0.45 | 0.46 | 0.38 | 0.40 | 0.32 | 0.45 |
| portfolio | 0.57 | 0.47 | 0.27 | 0.35 | 0.35 | 0.41 | · | 0.25 | 0.35 | 0.50 | 0.32 | 0.66 | 0.63 | 0.48 |
| forum | 0.60 | 0.26 | 0.43 | 0.23 | 0.17 | 0.48 | 0.25 | · | 0.16 | 0.41 | 0.24 | 0.66 | 0.66 | 0.45 |
| institution | 0.50 | 0.15 | 0.32 | 0.13 | 0.14 | 0.45 | 0.35 | 0.16 | · | 0.43 | 0.16 | 0.56 | 0.55 | 0.30 |
| oldweb | 0.49 | 0.47 | 0.51 | 0.51 | 0.43 | 0.46 | 0.50 | 0.41 | 0.43 | · | 0.47 | 0.56 | 0.56 | 0.47 |
| media | 0.48 | 0.29 | 0.35 | 0.14 | 0.15 | 0.38 | 0.32 | 0.24 | 0.16 | 0.47 | · | 0.63 | 0.56 | 0.40 |
| directory | 0.28 | 0.50 | 0.43 | 0.58 | 0.64 | 0.40 | 0.66 | 0.66 | 0.56 | 0.56 | 0.63 | · | 0.26 | 0.58 |
| reference-2 | 0.13 | 0.57 | 0.50 | 0.56 | 0.55 | 0.32 | 0.63 | 0.66 | 0.55 | 0.56 | 0.56 | 0.26 | · | 0.57 |
| saas-2 | 0.53 | 0.36 | 0.42 | 0.38 | 0.39 | 0.45 | 0.48 | 0.45 | 0.30 | 0.47 | 0.40 | 0.58 | 0.57 | · |

## Seed control (same page, seed 7 vs 8/9/10: block / mass / decision)

| page | 8 | 9 | 10 |
|---|---|---|---|
| reference | 0.03 / 0.21 / 0.03 | 0.04 / 0.27 / 0.02 | 0.05 / 0.20 / 0.02 |
| docs | 0.04 / 0.19 / 0.04 | 0.03 / 0.20 / 0.01 | 0.04 / 0.18 / 0.03 |
| app | 0.03 / 0.17 / 0.02 | 0.03 / 0.19 / 0.02 | 0.03 / 0.20 / 0.03 |
| saas | 0.02 / 0.20 / 0.03 | 0.02 / 0.25 / 0.02 | 0.02 / 0.23 / 0.04 |
| shop | 0.03 / 0.45 / 0.02 | 0.03 / 0.37 / 0.01 | 0.03 / 0.28 / 0.02 |
| news | 0.03 / 0.22 / 0.03 | 0.04 / 0.27 / 0.04 | 0.04 / 0.23 / 0.03 |
| portfolio | 0.02 / 0.17 / 0.01 | 0.02 / 0.17 / 0.01 | 0.02 / 0.18 / 0.02 |
| forum | 0.02 / 0.16 / 0.02 | 0.02 / 0.20 / 0.00 | 0.02 / 0.20 / 0.02 |
| institution | 0.04 / 0.19 / 0.04 | 0.03 / 0.21 / 0.02 | 0.04 / 0.21 / 0.04 |
| oldweb | 0.02 / 0.19 / 0.03 | 0.03 / 0.22 / 0.01 | 0.03 / 0.20 / 0.02 |
| media | 0.03 / 0.25 / 0.01 | 0.03 / 0.34 / 0.03 | 0.03 / 0.29 / 0.03 |
| directory | 0.04 / 0.23 / 0.03 | 0.04 / 0.27 / 0.01 | 0.04 / 0.24 / 0.01 |
| reference-2 | 0.05 / 0.24 / 0.04 | 0.05 / 0.29 / 0.02 | 0.05 / 0.23 / 0.03 |
| saas-2 | 0.05 / 0.20 / 0.03 | 0.06 / 0.24 / 0.02 | 0.04 / 0.20 / 0.04 |

## Noise floor vs page differences (min / mean / max)

| metric | seed only | sibling pages | different pages |
|---|---|---|---|
| block | 0.02 / 0.03 / 0.06 | 0.07 / 0.14 / 0.21 | 0.06 / 0.19 / 0.34 |
| mass | 0.16 / 0.23 / 0.45 | 0.35 / 0.39 / 0.42 | 0.19 / 0.43 / 0.63 |
| decision | 0.00 / 0.02 / 0.04 | 0.13 / 0.26 / 0.38 | 0.13 / 0.40 / 0.66 |

## Perturbations (block / mass / decision distance; what changed)

| page | perturbation | block | mass | decision | changed |
|---|---|---|---|---|---|
| reference | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| reference | text+10 (own text of every element ×1.1) | 0.00 | 0.01 | 0.00 | 1 minor weight/repeat changes |
| reference | links-10 (70 of 700 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | 1 minor weight/repeat changes |
| reference | drop-secondary (removed <section#mwAZY> (1.2% of the text)) | 0.00 | 0.00 | 0.00 | 1 minor weight/repeat changes |
| docs | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| docs | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| docs | links-10 (12 of 125 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | — |
| docs | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| app | text-10 (own text of every element ×0.9) | 0.11 | 0.20 | 0.18 | minors 2 → 1 |
| app | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| app | links-10 (18 of 187 links removed (every tenth)) | 0.03 | 0.06 | 0.02 | blocks civic+towers+market+slabs+towers+market → civic+towers+market+slabs+court+market; majors [text:GitHub media:Navigation links:section structured:Latest media:Repository links:About] → [text:GitHub media:Navigation links:section structured:Latest text:Repository links:About]; 1 minor weight/repeat changes |
| app | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| saas | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| saas | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| saas | links-10 (7 of 74 links removed (every tenth)) | 0.02 | 0.18 | 0.02 | minors 5 → 4 |
| saas | drop-secondary (removed <section#customers.hide-laptop> (3.8% of the text)) | 0.00 | 0.00 | 0.00 | — |
| shop | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| shop | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| shop | links-10 (14 of 149 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | — |
| shop | drop-secondary (removed <section.vbpjg77> (1.6% of the text)) | 0.00 | 0.00 | 0.00 | — |
| news | text-10 (own text of every element ×0.9) | 0.00 | 0.01 | 0.00 | — |
| news | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | 1 minor weight/repeat changes |
| news | links-10 (34 of 342 links removed (every tenth)) | 0.02 | 0.11 | 0.00 | minors 22 → 21 |
| news | drop-secondary (removed <section#in-pictures.dcr-cavc6m> (1.4% of the text)) | 0.00 | 0.00 | 0.00 | — |
| portfolio | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| portfolio | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| portfolio | links-10 (4 of 40 links removed (every tenth)) | 0.07 | 0.27 | 0.19 | minor content “footer” links→text; 1 minor weight/repeat changes |
| portfolio | drop-secondary (removed <section#writing.scroll-mt-16> (4.7% of the text)) | 0.04 | 0.06 | 0.03 | blocks civic+court+court+towers+towers → civic+court+court+towers; majors [links:Brittany text:About text:Experience media:Projects media:Writing] → [links:Brittany text:About text:Experience media:Projects]; 1 minor weight/repeat changes |
| forum | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| forum | text+10 (own text of every element ×1.1) | 0.03 | 0.10 | 0.02 | blocks civic+towers → civic+slabs; majors [links:Lobsters media:I got] → [links:Lobsters text:I got] |
| forum | links-10 (25 of 254 links removed (every tenth)) | 0.03 | 0.09 | 0.02 | blocks civic+towers → civic+slabs; majors [links:Lobsters media:I got] → [links:Lobsters text:I got] |
| forum | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| institution | text-10 (own text of every element ×0.9) | 0.03 | 0.07 | 0.03 | blocks civic+market+towers+slabs → civic+market+towers+market; majors [text:Welcome to links:Popular on media:Services and text:Government] → [text:Welcome to links:Popular on media:Services and links:Government] |
| institution | text+10 (own text of every element ×1.1) | 0.02 | 0.06 | 0.03 | blocks civic+market+towers+slabs → civic+slabs+towers+slabs; majors [text:Welcome to links:Popular on media:Services and text:Government] → [text:Welcome to text:Popular on media:Services and text:Government] |
| institution | links-10 (8 of 81 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | 1 minor weight/repeat changes |
| institution | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| oldweb | text-10 (own text of every element ×0.9) | 0.00 | 0.01 | 0.00 | — |
| oldweb | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| oldweb | links-10 (24 of 240 links removed (every tenth)) | 0.00 | 0.01 | 0.00 | — |
| oldweb | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| media | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| media | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| media | links-10 (6 of 67 links removed (every tenth)) | 0.01 | 0.03 | 0.01 | minor content “Image Of The” links→text; 3 minor weight/repeat changes |
| media | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| directory | text-10 (own text of every element ×0.9) | 0.00 | 0.01 | 0.00 | — |
| directory | text+10 (own text of every element ×1.1) | 0.00 | 0.01 | 0.00 | — |
| directory | links-10 (73 of 734 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | — |
| directory | drop-secondary (no section-like element with 1–6% of the text: unchanged) | 0.00 | 0.00 | 0.00 | — |
| reference-2 | text-10 (own text of every element ×0.9) | 0.00 | 0.01 | 0.00 | — |
| reference-2 | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | 1 minor weight/repeat changes |
| reference-2 | links-10 (86 of 865 links removed (every tenth)) | 0.00 | 0.01 | 0.00 | 3 minor weight/repeat changes |
| reference-2 | drop-secondary (removed <section#mwBL4> (1.2% of the text)) | 0.00 | 0.00 | 0.00 | — |
| saas-2 | text-10 (own text of every element ×0.9) | 0.00 | 0.00 | 0.00 | — |
| saas-2 | text+10 (own text of every element ×1.1) | 0.00 | 0.00 | 0.00 | — |
| saas-2 | links-10 (16 of 166 links removed (every tenth)) | 0.00 | 0.00 | 0.00 | 2 minor weight/repeat changes |
| saas-2 | drop-secondary (removed <section.flex> (1.2% of the text)) | 0.00 | 0.00 | 0.00 | — |

## Fingerprint sensitivity (block-morphology distance after moving one field by 0.25)

| field | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory | max |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| size | 0.01* | 0.01* | 0.01* | 0.01* | 0.01* | 0.01* | 0.00* | 0.01* | 0.01* | 0.01* | 0.02* | 0.01* | 0.02 |
| depth | 0.02* | 0.01* | 0.01* | 0.02* | 0.01* | 0.01* | 0.02* | 0.01* | 0.02* | 0.01* | 0.01* | 0.02* | 0.02 |
| breadth | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| regularity | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| sections | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| textDensity | 0.01* | 0.01* | 0.02* | 0.01* | 0.01* | 0.02* | 0.01* | 0.00* | 0.01* | 0.01* | 0.01* | 0.01* | 0.02 |
| imagery | 0.00* | 0.00* | 0.00* | 0.00* | 0.00 | 0.00 | 0.00* | 0.00 | 0.00 | 0.00 | 0.00* | 0.00* | 0.00 |
| linkDensity | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| headings | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| interactivity | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| forms | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| roundness | 0.00* | 0.01* | 0.02* | 0.02* | 0.02* | 0.01* | 0.05* | 0.00* | 0.00* | 0.00 | 0.01* | 0.00* | 0.05 |
| airiness | 0.01* | 0.01* | 0.01* | 0.02* | 0.01* | 0.08* | 0.01* | 0.01* | 0.01* | 0.01* | 0.03* | 0.01* | 0.08 |
| ornament | 0.00* | 0.00* | 0.00 | 0.00 | 0.00 | 0.07* | 0.00 | 0.00 | 0.00 | 0.00* | 0.00 | 0.00* | 0.07 |
| darkness | 0.00 | 0.00* | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00* | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| legacy | 0.00* | 0.01* | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.01* | 0.01* | 0.00* | 0.00 | 0.00 | 0.01 |
| colorfulness | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| type.serif | 0.00* | 0.10* | 0.00* | 0.00* | 0.00* | 0.01* | 0.00* | 0.09* | 0.01* | 0.00* | 0.01* | 0.00* | 0.10 |
| type.mono | 0.00* | 0.06* | 0.07* | 0.00* | 0.00* | 0.00 | 0.02* | 0.08* | 0.06* | 0.00* | 0.08* | 0.01* | 0.08 |
| hues | 0.00* | 0.00 | 0.00* | 0.00 | 0.00* | 0.00 | 0.00 | 0.00* | 0.00 | 0.00* | 0.00* | 0.00* | 0.00 |

\* the grammar changed: 
- reference size: vert 0.81→0.74
- reference depth: vert 0.81→0.71
- reference textDensity: vert 0.81→0.76
- reference imagery: share 0.15→0.16
- reference roundness: 2nd modern→soft, share 0.15→0.18
- reference airiness: vert 0.81→0.74
- reference ornament: share 0.15→0.17
- reference legacy: 2nd modern→retro
- reference type.serif: share 0.15→0.06
- reference type.mono: 2nd modern→tech, share 0.15→0.21
- reference hues: time day→golden
- docs size: vert 0.68→0.61
- docs depth: vert 0.68→0.78
- docs textDensity: vert 0.68→0.63
- docs imagery: share 0.22→0.20
- docs roundness: 2nd tech→soft, share 0.22→0.30
- docs airiness: vert 0.68→0.61
- docs ornament: share 0.22→0.19
- docs darkness: share 0.22→0.19
- docs legacy: 2nd tech→retro, share 0.22→0.26
- docs type.serif: style modern→classic, 2nd tech→modern, share 0.22→0.29
- docs type.mono: style modern→tech, 2nd tech→modern, share 0.22→0.17
- app size: vert 0.79→0.73
- app depth: vert 0.79→0.69
- app textDensity: vert 0.79→0.84
- app imagery: share 0.31→0.30
- app roundness: style soft→modern, 2nd modern→soft, share 0.31→0.28
- app airiness: share 0.31→0.28, vert 0.79→0.73
- app type.serif: share 0.31→0.26
- app type.mono: style soft→tech, 2nd modern→soft, share 0.31→0.28
- app hues: time day→golden
- saas size: vert 0.63→0.57
- saas depth: vert 0.63→0.53
- saas textDensity: vert 0.63→0.68
- saas imagery: share 0.27→0.28
- saas roundness: style modern→soft, 2nd soft→modern, share 0.27→0.34
- saas airiness: share 0.27→0.23, vert 0.63→0.69
- saas type.serif: share 0.27→0.32
- saas type.mono: share 0.27→0.32
- shop size: vert 0.74→0.68
- shop depth: vert 0.74→0.64
- shop textDensity: vert 0.74→0.79
- shop roundness: style modern→soft, 2nd soft→modern, share 0.26→0.35
- shop airiness: share 0.26→0.30, vert 0.74→0.68
- shop type.serif: share 0.26→0.30
- shop type.mono: share 0.26→0.30
- shop hues: time golden→day
- news size: vert 0.66→0.60
- news depth: vert 0.66→0.56
- news textDensity: vert 0.66→0.71
- news roundness: 2nd soft→modern, share 0.33→0.26
- news airiness: style classic→soft, 2nd soft→classic, share 0.33→0.32, vert 0.66→0.60
- news ornament: style classic→soft, 2nd soft→classic
- news type.serif: share 0.33→0.21
- portfolio size: vert 0.60→0.66
- portfolio depth: vert 0.60→0.50
- portfolio textDensity: vert 0.60→0.55
- portfolio imagery: share 0.33→0.31
- portfolio roundness: style soft→modern, 2nd modern→soft, share 0.33→0.24
- portfolio airiness: share 0.33→0.29, vert 0.60→0.53
- portfolio type.serif: share 0.33→0.26
- portfolio type.mono: 2nd modern→tech
- forum size: vert 0.49→0.43
- forum depth: vert 0.49→0.59
- forum textDensity: vert 0.49→0.54
- forum roundness: share 0.19→0.31
- forum airiness: share 0.19→0.24, vert 0.49→0.43
- forum darkness: time golden→night
- forum legacy: 2nd soft→retro, share 0.19→0.21
- forum type.serif: style modern→classic, 2nd soft→modern, share 0.19→0.31
- forum type.mono: style modern→tech, 2nd soft→modern, share 0.19→0.29
- forum hues: time golden→day
- institution size: vert 0.52→0.58
- institution depth: vert 0.52→0.62
- institution textDensity: vert 0.52→0.47
- institution roundness: share 0.19→0.32
- institution airiness: share 0.19→0.25, vert 0.52→0.46
- institution legacy: 2nd soft→retro
- institution type.serif: 2nd soft→classic, share 0.19→0.31
- institution type.mono: style modern→tech, 2nd soft→modern, share 0.19→0.35
- oldweb size: vert 0.52→0.46
- oldweb depth: vert 0.52→0.62
- oldweb textDensity: vert 0.52→0.57
- oldweb airiness: vert 0.52→0.46
- oldweb ornament: share 0.15→0.16
- oldweb legacy: share 0.15→0.19
- oldweb type.serif: share 0.15→0.12
- oldweb type.mono: share 0.15→0.12
- oldweb hues: time day→golden
- media size: vert 0.46→0.39
- media depth: vert 0.46→0.56
- media textDensity: vert 0.46→0.51
- media imagery: share 0.31→0.33
- media roundness: style modern→soft, 2nd soft→modern, share 0.31→0.28
- media airiness: style modern→soft, 2nd soft→modern, share 0.31→0.34, vert 0.46→0.39
- media type.serif: style modern→soft, 2nd soft→modern
- media type.mono: style modern→tech, share 0.31→0.23
- media hues: time day→golden
- directory size: vert 0.51→0.45
- directory depth: vert 0.51→0.61
- directory textDensity: vert 0.51→0.56
- directory imagery: share 0.17→0.18
- directory roundness: 2nd modern→soft, share 0.17→0.25
- directory airiness: 2nd modern→soft, share 0.17→0.19, vert 0.51→0.45
- directory ornament: share 0.17→0.20
- directory type.serif: 2nd modern→soft, share 0.17→0.09
- directory type.mono: 2nd modern→tech, share 0.17→0.25
- directory hues: time day→golden

## Brief-level sensitivity (block-morphology distance)

| change | reference | docs | app | saas | shop | news | portfolio | forum | institution | oldweb | media | directory |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| major weights ×1.25 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| minor weights ×1.25 | 0.00 | 0.04 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.03 | 0.00 | 0.01 | 0.00 |
| all repeats +3 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.01 | 0.03 | 0.03 | 0.01 |
| minor order reversed | 0.04 | 0.02 | 0.03 | 0.02 | 0.01 | 0.02 | 0.00 | 0.00 | 0.03 | 0.00 | 0.02 | 0.03 |
| first minor removed | 0.05 | 0.02 | 0.10 | 0.02 | 0.06 | 0.03 | NaN | NaN | 0.04 | NaN | 0.02 | 0.07 |
| major content → text | 0.03 | 0.02 | 0.09 | 0.11 | 0.00 | 0.08 | 0.05 | 0.03 | 0.05 | 0.00 | 0.13 | 0.03 |

## Collapse: distinct facts → one decision

| decision | from (region kind → content) |
|---|---|
| block:civic | brand→text, hero→links, hero→media, hero→text |
| block:market | features→links, feed→links, references→links, section→links, toc→links |
| block:court | features→text, section→structured, section→text |
| block:towers | gallery→media, logos→media, section→media, showcase→media |
| block:slabs | pricing→structured, section→structured, section→text |
| block:plaza | section→action |
| lot family rows | features/links/rep, nav/links/rep, toc/links/rep |
| lot family corner | brand/text, features/media/rep, gallery/media/rep, nav/links, page/links, references/links, section/links, section/media, section/text, showcase/media/rep |
| lot family kiosk | form/action |
| lot family shed | section/structured |
| lot family walkup | brand/text, features/media/rep, footer/links, gallery/media/rep, infobox/structured, nav/links, page/links, references/links, section/links, section/media, section/text, showcase/media/rep |
| lot family apartments | brand/text, features/text/rep, section/text, testimonials/text/rep |
