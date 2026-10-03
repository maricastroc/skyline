# institution — institutional

URL: https://www.gov.uk/

## Extracted facts

- nodes 202, elements 374, regions 17, districts 3, site name “Welcome to GOV.UK”
- structure: size 0.48, depth 0.38, breadth 0.19, regularity 0.73, sections 0.76
- content: text 0.75, imagery 0.34, links 0.62, headings 1.00, interactivity 0.33, forms 0.50
- style: serif 0.00 / sans 0.99 / mono 0.01, roundness 0.14, airiness 0.39, ornament 0.43, darkness 0.20, legacy 0.00, 6 hues
- grammar: **modern** (2nd soft, share 0.19), verticality 0.52, natural time day (captures forced to day)
  - light page, cool hue 98° → daylight
  - architecture: modern (0.77)
  - 50 buildings, 54% lot coverage (text density 0.75, whitespace 0.39)
  - verticality 0.52 (DOM depth 0.38)
  - traffic 0.68 (links), billboards 0.34 (images), parks 0.53 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 5.0% | 0 | Welcome to | hero `div.govuk-width-container` | B1 the hero region → landmark (contains the page's <h1> “The best place to find government service…”); B2 77 chars, 0.0 links/100 chars, 0 images → text |
| 1 | major | links | 8.1% | 0 | Popular on | section `section.homepage-section` | B1 district with 8.1% of the page (≥ 4%) → major; B2 2.6 links per 100 chars → links |
| 2 | major | media | 36.1% | 0 | Services and | section `div.govuk-grid-row` | B1 district with 36.1% of the page (≥ 4%) → major; B2 4 images, 2.6 per 1000 chars → media |
| 3 | major | text | 18.0% | 0 | Government | section `div.govuk-grid-row` | B1 district with 18.0% of the page (≥ 4%) → major; B2 662 chars, 2.4 links/100 chars, 0 images → text |
| 4 | minor | links | 3.8% | 3 |  | nav `div.gem-c-layout-super-navigation-header` | B1 region outside the majors (3.8%) → minor; B2 kind "nav" → links |
| 5 | minor | text | 0.6% | 0 | Welcome to | brand `a#logo.govuk-header__homepage-link` | B1 region outside the majors (0.6%) → minor; B2 0 chars, 1.0 links/100 chars, 1 images → text |
| 6 | minor | text | 3.6% | 0 | Help us | section `div#survey-wrapper.govuk-grid-column-two` | B1 region outside the majors (3.6%) → minor; B2 149 chars, 0.7 links/100 chars, 0 images → text |
| 7 | support | links | 23.8% | 0 |  | footer `footer.gem-c-layout-footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- section “Services and information”: B1 container: 54% of the page, opened into 2 child region(s)
- form “Form”: inside the landmark
- section “Services and information”: contains the landmark or a major (a wrapper)
- section “Services and information”: inside major “Services and information”
- feed “Benefits”: inside major “Services and information”
- gallery “Featured”: inside major “Services and information”
- section “Government activity”: inside major “Government activity”
- features “Departments”: inside major “Government activity”
- section “More on GOV.UK”: inside major “Government activity”

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “Welcome to”: stepped 20f crown modern
- block 1 (1,2) **market** ← major links “Popular on”: corner 3f flat modern, corner 3f terrace modern, corner 4f terrace modern, corner 4f terrace soft, walkup 4f flat modern, walkup 4f terrace soft, walkup 3f flat modern, walkup 3f flat modern
- block 2 (2,1) **towers** ← major media “Services and”: podiumTower 13f flat modern, asymmetric 5f terrace modern
- block 3 (2,2) **slabs** ← major text “Government”: slab 7f terrace soft, slab 9f terrace soft
- block 4 (0,1) lots ×12: rows/gable×1, corner/terrace×1, corner/flat×1, walkup/flat×6, rows/flat×2, apartments/terrace×1; floors 3 2 4 2 3 2 3 1 4 1 2 1
- block 5 (1,0) lots ×12: rows/flat×1, apartments/terrace×2, corner/terrace×1, walkup/flat×5, rows/terrace×2, walkup/terrace×1; floors 3 3 3 1 4 2 4 2 3 2 3 1
- block 6 (0,2) lots ×12: rows/terrace×1, corner/flat×1, apartments/flat×1, walkup/flat×3, rows/flat×2, walkup/terrace×4; floors 4 3 2 1 4 2 4 2 4 2 4 1
- block 7 (2,0) lots ×12: rows/terrace×1, corner/flat×1, apartments/terrace×2, walkup/flat×3, rows/flat×2, walkup/terrace×3; floors 3 1 3 2 2 2 2 1 4 2 4 2
- block 8 (1,3) lots ×12: rows/terrace×1, corner/terrace×2, walkup/flat×4, rows/gable×1, apartments/flat×1, walkup/terrace×2, rows/flat×1; floors 4 1 4 1 2 2 4 1 4 1 3 1
- block 9 (3,1) lots ×8: rows/flat×2, corner/terrace×1, corner/flat×1, walkup/flat×3, walkup/terrace×1; floors 4 3 3 1 3 3 2 1
- block 10 (2,3) lots ×8: rows/flat×2, corner/flat×2, walkup/terrace×3, walkup/flat×1; floors 2 1 3 1 3 3 3 2
- block 11 (3,2) lots ×8: rows/flat×2, corner/flat×2, walkup/terrace×1, walkup/flat×3; floors 4 2 3 1 3 1 3 1
- block 12 (0,0) lots ×12: rows/flat×2, corner/terrace×2, walkup/flat×3, walkup/terrace×3, rows/terrace×1, apartments/flat×1; floors 3 1 4 1 4 2 3 1 3 3 4 1
- block 13 (0,3) lots ×12: rows/gable×1, corner/flat×1, corner/terrace×1, walkup/flat×4, rows/terrace×1, walkup/terrace×3, rows/flat×1; floors 4 3 3 2 3 2 3 1 3 3 3 1
- block 14 (3,0) lots ×12: rows/terrace×1, corner/terrace×2, walkup/terrace×3, rows/flat×2, walkup/flat×4; floors 4 2 2 1 2 3 3 1 4 2 3 1
- block 15 (3,3) lots ×12: rows/flat×2, corner/flat×2, walkup/terrace×5, rows/terrace×1, walkup/flat×2; floors 4 3 4 1 4 1 3 1 4 2 3 1

## Summary

```json
{
 "blocks": [
  "civic",
  "market",
  "towers",
  "slabs",
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
  "lots",
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "market": 1,
  "towers": 1,
  "slabs": 1,
  "lots": 12
 },
 "families": {
  "stepped": 1,
  "corner": 25,
  "walkup": 74,
  "podiumTower": 1,
  "asymmetric": 1,
  "slab": 2,
  "rows": 33,
  "apartments": 8
 },
 "roofs": {
  "crown": 1,
  "flat": 81,
  "terrace": 60,
  "gable": 3
 },
 "styles": {
  "modern": 123,
  "soft": 22
 },
 "grounds": {
  "lobby": 1,
  "shop": 73,
  "cafe": 27,
  "arcade": 2,
  "homes": 42
 },
 "signage": {
  "plaque": 43,
  "shop": 56,
  "blade": 9,
  "screen": 1,
  "billboard": 1,
  "painted": 2,
  "none": 33
 },
 "buildings": 145,
 "floors": {
  "min": 1,
  "max": 20,
  "mean": 2.8
 },
 "distinctLotPrograms": 31,
 "lots": 132,
 "landmark": "stepped"
}
```
