# directory — links / navigation

URL: https://www.craigslist.org/about/sites

## Extracted facts

- nodes 1057, elements 1781, regions 8, districts 5, site name “craigslist > sites”
- structure: size 0.77, depth 0.08, breadth 0.73, regularity 1.00, sections 0.25
- content: text 0.45, imagery 0.00, links 1.00, headings 1.00, interactivity 0.00, forms 0.00
- style: serif 0.42 / sans 0.53 / mono 0.05, roundness 0.25, airiness 0.02, ornament 0.45, darkness 0.00, legacy 0.00, 6 hues
- grammar: **classic** (2nd modern, share 0.17), verticality 0.51, natural time day (captures forced to day)
  - light page, cool hue 264° → daylight
  - architecture: classic (0.93), serif type 42%
  - 73 buildings, 68% lot coverage (text density 0.45, whitespace 0.02)
  - verticality 0.51 (DOM depth 0.08)
  - traffic 1.00 (links), billboards 0.00 (images), parks 0.14 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 0.1% | 0 | craigslist | brand `div#logo` | B1 the hero region → landmark (no <h1> on the page: the site name is its monument); B2 11 chars, 0.0 links/100 chars, 0 images → text |
| 1 | major | links | 7.8% | 4 | Alberta | features `div.colmask` | B1 district with 7.8% of the page (≥ 4%) → major; B2 7.2 links per 100 chars → links |
| 2 | major | links | 15.1% | 4 | Austria | features `div.colmask` | B1 district with 15.1% of the page (≥ 4%) → major; B2 9.5 links per 100 chars → links |
| 3 | major | links | 9.8% | 4 | Bangladesh | features `div.colmask` | B1 district with 9.8% of the page (≥ 4%) → major; B2 9.0 links per 100 chars → links |
| 4 | major | links | 6.9% | 4 | Argentina | features `div.colmask` | B1 district with 6.9% of the page (≥ 4%) → major; B2 7.0 links per 100 chars → links |
| 5 | minor | links | 13.8% | 10 |  | nav `div.box` | B1 region outside the majors (13.8%) → minor; B2 kind "nav" → links |
| 6 | minor | links | 2.1% | 4 | Egypt | features `div.colmask` | B1 region outside the majors (2.1%) → minor; B2 8.3 links per 100 chars → links |
| 7 | support | links | 0.6% | 0 |  | footer `footer.cl-footer-tx` | B1 footer → support; B2 kind "footer" → links |

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “craigslist”: civic 3f dome classic
- block 1 (1,2) **market** ← major links “Alberta”: corner 3f mansard classic, corner 3f flat classic, corner 4f gable classic, corner 4f terrace modern, rows 4f gable classic, rows 4f terrace modern, rows 3f gable classic, rows 3f gable classic
- block 2 (2,1) **market** ← major links “Austria”: corner 4f mansard classic, corner 3f flat classic, corner 4f mansard classic, corner 4f gable classic, rows 3f flat modern, rows 4f gable classic, rows 3f gable classic, rows 3f gable classic
- block 3 (2,2) **market** ← major links “Bangladesh”: corner 4f terrace modern, corner 2f mansard classic, corner 4f flat classic, corner 3f mansard classic, rows 3f gable classic, rows 4f gable classic, rows 3f gable classic, rows 3f terrace modern
- block 4 (0,1) **market** ← major links “Argentina”: corner 3f flat modern, corner 3f gable classic, corner 4f mansard classic, corner 4f mansard classic, rows 3f gable classic, rows 3f gable classic, rows 3f gable classic, rows 3f gable classic
- block 5 (1,0) lots ×12: rows/gable×6, rows/terrace×2, walkup/flat×2, walkup/gable×1, walkup/mansard×1; floors 5 4 1 4 4 1 6 4 1 5 3 1
- block 6 (0,2) lots ×12: rows/gable×8, walkup/flat×3, walkup/gable×1; floors 6 4 1 5 4 1 6 4 2 5 4 1
- block 7 (2,0) lots ×12: rows/gable×8, walkup/flat×3, walkup/mansard×1; floors 5 3 1 6 2 1 4 3 1 6 4 2
- block 8 (1,3) lots ×12: rows/gable×5, walkup/flat×2, rows/flat×3, walkup/mansard×2; floors 6 2 2 5 2 1 6 2 2 4 3 1
- block 9 (3,1) lots ×8: rows/gable×6, walkup/mansard×1, walkup/gable×1; floors 6 4 1 4 3 2 4 3
- block 10 (2,3) lots ×8: walkup/mansard×1, rows/gable×5, walkup/flat×2; floors 1 4 3 1 5 4 1 6
- block 11 (3,2) lots ×8: rows/gable×5, walkup/gable×2, walkup/mansard×1; floors 4 1 5 3 1 4 3 1
- block 12 (0,0) lots ×12: rows/gable×6, walkup/flat×3, walkup/mansard×1, rows/terrace×1, rows/flat×1; floors 5 2 2 5 4 1 5 2 1 6 4 1
- block 13 (0,3) lots ×12: rows/flat×1, rows/gable×7, walkup/gable×1, walkup/flat×1, walkup/mansard×2; floors 6 4 1 6 2 1 5 2 1 6 3 1
- block 14 (3,0) lots ×12: rows/gable×8, walkup/flat×1, walkup/mansard×2, walkup/terrace×1; floors 6 3 1 5 2 2 5 2 2 5 3 1
- block 15 (3,3) lots ×12: rows/gable×8, walkup/mansard×2, walkup/gable×2; floors 6 4 1 5 4 1 5 3 1 5 3 1

## Summary

```json
{
 "blocks": [
  "civic",
  "market",
  "market",
  "market",
  "market",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots",
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "market": 4,
  "lots": 11
 },
 "families": {
  "civic": 1,
  "corner": 16,
  "rows": 96,
  "walkup": 40
 },
 "roofs": {
  "dome": 1,
  "mansard": 21,
  "flat": 27,
  "gable": 96,
  "terrace": 8
 },
 "styles": {
  "classic": 134,
  "modern": 19
 },
 "grounds": {
  "lobby": 1,
  "shop": 108,
  "cafe": 44
 },
 "signage": {
  "plaque": 1,
  "shop": 85,
  "blade": 27,
  "none": 40
 },
 "buildings": 153,
 "floors": {
  "min": 1,
  "max": 6,
  "mean": 3.2222222222222223
 },
 "distinctLotPrograms": 20,
 "lots": 120,
 "landmark": "civic"
}
```
