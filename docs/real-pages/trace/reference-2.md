# reference-2 — long article / reference

URL: https://en.wikipedia.org/wiki/Lighthouse

## Extracted facts

- nodes 800, elements 3040, regions 18, districts 8, site name “Wikipedia”
- structure: size 0.87, depth 0.67, breadth 0.28, regularity 1.00, sections 0.77
- content: text 0.91, imagery 0.41, links 0.81, headings 0.12, interactivity 0.59, forms 1.00
- style: serif 0.49 / sans 0.47 / mono 0.04, roundness 0.13, airiness 0.12, ornament 0.45, darkness 0.00, legacy 0.00, 6 hues
- grammar: **classic** (2nd modern, share 0.16), verticality 0.84, natural time day (captures forced to day)
  - light page, cool hue 262° → daylight
  - architecture: classic (1.08), serif type 49%
  - 110 buildings, 79% lot coverage (text density 0.91, whitespace 0.12)
  - verticality 0.84 (DOM depth 0.67)
  - traffic 0.89 (links), billboards 0.41 (images), parks 0.19 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | links | 10.9% | 0 | Wikipedia | hero `header.mw-body-header` | B1 the hero region → landmark (contains the page's <h1> “Lighthouse”); B2 11.7 links per 100 chars → links |
| 1 | major | text | 14.3% | 6 | History | features `section#mwIQ` | B1 district with 14.3% of the page (≥ 4%) → major; B2 10999 chars, 1.5 links/100 chars, 6 images → text |
| 2 | major | text | 6.6% | 3 | Technology | features `section#mwAVE` | B1 district with 6.6% of the page (≥ 4%) → major; B2 6322 chars, 0.9 links/100 chars, 2 images → text |
| 3 | major | text | 7.5% | 4 | Building | features `section#mwAcc` | B1 district with 7.5% of the page (≥ 4%) → major; B2 7206 chars, 1.0 links/100 chars, 6 images → text |
| 4 | major | links | 18.8% | 2 | References | references `section#mwArM` | B1 district with 18.8% of the page (≥ 4%) → major; B2 kind "references" → links |
| 5 | major | structured | 15.0% | 0 | External | section `section#mwBMo` | B1 district with 15.0% of the page (≥ 4%) → major; B2 96% of its elements in tables → structured |
| 6 | minor | links | 1.8% | 10 |  | nav `nav.vector-main-menu-landmark` | B1 region outside the majors (1.8%) → minor; B2 kind "nav" → links |
| 7 | minor | text | 0.0% | 0 | Wikipedia | brand `img.mw-logo-wordmark` | B1 region outside the majors (0.0%) → minor; B2 0 chars, 0.0 links/100 chars, 1 images → text |
| 8 | minor | action | 0.4% | 0 | Search | form `div#p-search.vector-search-box-vue` | B1 region outside the majors (0.4%) → minor; B2 kind "form" → action |
| 9 | minor | action | 0.3% | 0 | Search | form `form#searchform.cdx-search-input` | B1 region outside the majors (0.3%) → minor; B2 kind "form" → action |
| 10 | minor | links | 5.8% | 28 | Contents | toc `nav#mw-panel-toc.mw-table-of-contents-co` | B1 region outside the majors (5.8%) → minor; B2 kind "toc" → links |
| 11 | minor | text | 2.4% | 3 | Maintenance | features `section#mwAlY` | B1 region outside the majors (2.4%) → minor; B2 1203 chars, 1.8 links/100 chars, 0 images → text |
| 12 | minor | media | 2.3% | 4 | See also | showcase `section#mwApU` | B1 region outside the majors (2.3%) → minor; B2 kind "showcase" → media |
| 13 | support | links | 1.3% | 0 |  | footer `div.mw-footer-container` | B1 footer → support; B2 kind "footer" → links |
| 14 | minor | action | 0.3% | 0 | Search | form `div.vector-search-box-vue` | B1 region outside the majors (0.3%) → minor; B2 kind "form" → action |

Skipped regions:
- toc “Contents”: B1 5.8% but beyond the 5 largest districts → minor
- directory “Links”: inside major “External links”
- form “Search”: B1 wrapper: ≥ 80% of its parent region, which is already a minor

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark links “Wikipedia”: civic 3f dome classic
- block 1 (1,2) **court** ← major text “History”: courtyard 5f mansard classic
- block 2 (2,1) **court** ← major text “Technology”: courtyard 6f mansard classic
- block 3 (2,2) **court** ← major text “Building”: courtyard 6f mansard modern
- block 4 (0,1) **market** ← major links “References”: corner 4f flat modern, corner 4f gable classic, corner 5f mansard classic, corner 5f mansard classic, walkup 4f mansard classic, walkup 4f mansard classic, walkup 4f mansard classic, walkup 4f mansard classic
- block 5 (1,0) **court** ← major structured “External”: courtyard 5f mansard classic
- block 6 (0,2) lots ×12: rows/gable×3, corner/mansard×1, kiosk/flat×2, kiosk/mansard×1, apartments/flat×1, walkup/mansard×2, kiosk/gable×1, walkup/flat×1; floors 4 3 2 2 6 4 5 2 3 4 4 3
- block 7 (2,0) lots ×12: kiosk/flat×3, rows/gable×3, apartments/flat×2, corner/gable×1, walkup/gable×1, walkup/mansard×1, kiosk/mansard×1; floors 2 5 4 5 1 3 3 3 3 3 6 5
- block 8 (1,3) lots ×12: corner/gable×1, walkup/flat×2, kiosk/flat×3, rows/gable×1, kiosk/mansard×1, rows/flat×1, apartments/mansard×1, walkup/gable×1, walkup/mansard×1; floors 5 1 3 4 2 3 3 5 5 3 1 3
- block 9 (3,1) lots ×8: rows/gable×2, corner/gable×1, kiosk/mansard×1, kiosk/gable×1, apartments/gable×1, walkup/gable×1, walkup/flat×1; floors 5 3 3 2 5 5 3 2
- block 10 (2,3) lots ×8: kiosk/mansard×1, rows/gable×2, corner/mansard×1, kiosk/flat×1, kiosk/gable×1, apartments/flat×1, walkup/mansard×1; floors 2 3 2 2 3 6 4 5
- block 11 (3,2) lots ×8: walkup/mansard×1, kiosk/gable×2, rows/gable×2, corner/flat×1, kiosk/mansard×1, apartments/mansard×1; floors 2 3 3 2 2 2 5 4
- block 12 (0,0) lots ×12: corner/gable×1, walkup/flat×2, kiosk/flat×2, rows/gable×1, walkup/mansard×2, kiosk/mansard×1, kiosk/gable×1, rows/terrace×1, apartments/flat×1; floors 3 1 3 4 4 2 3 5 4 4 2 2
- block 13 (0,3) lots ×12: rows/flat×1, corner/gable×1, kiosk/gable×1, kiosk/mansard×3, rows/gable×2, apartments/flat×1, walkup/mansard×2, walkup/flat×1; floors 5 4 3 3 5 4 3 1 2 5 2 3
- block 14 (3,0) lots ×12: kiosk/flat×1, rows/gable×3, apartments/flat×1, corner/flat×1, walkup/mansard×2, kiosk/mansard×3, apartments/terrace×1; floors 4 6 3 3 1 3 3 2 4 3 5 4
- block 15 (3,3) lots ×12: corner/gable×1, walkup/mansard×2, kiosk/mansard×2, rows/gable×2, walkup/flat×2, kiosk/flat×1, apartments/gable×1, kiosk/gable×1; floors 5 2 3 4 3 2 3 5 4 4 2 3

## Summary

```json
{
 "blocks": [
  "civic",
  "court",
  "court",
  "court",
  "market",
  "court",
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
  "court": 4,
  "market": 1,
  "lots": 10
 },
 "families": {
  "civic": 1,
  "courtyard": 4,
  "corner": 14,
  "walkup": 30,
  "rows": 24,
  "kiosk": 36,
  "apartments": 12
 },
 "roofs": {
  "dome": 1,
  "mansard": 43,
  "flat": 34,
  "gable": 41,
  "terrace": 2
 },
 "styles": {
  "classic": 108,
  "modern": 13
 },
 "grounds": {
  "lobby": 9,
  "shop": 43,
  "cafe": 19,
  "arcade": 33,
  "homes": 17
 },
 "signage": {
  "plaque": 22,
  "shop": 68,
  "blade": 7,
  "screen": 5,
  "none": 12,
  "billboard": 7
 },
 "buildings": 121,
 "floors": {
  "min": 1,
  "max": 6,
  "mean": 3.4545454545454546
 },
 "distinctLotPrograms": 44,
 "lots": 108,
 "landmark": "civic"
}
```
