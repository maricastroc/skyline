# shop — e-commerce

URL: https://www.ikea.com/us/en/cat/tables-chairs-fu002/

## Extracted facts

- nodes 603, elements 1668, regions 7, districts 1, site name “IKEA”
- structure: size 0.76, depth 0.96, breadth 0.13, regularity 0.50, sections 1.00
- content: text 0.32, imagery 1.00, links 0.26, headings 0.22, interactivity 1.00, forms 0.50
- style: serif 0.00 / sans 1.00 / mono 0.00, roundness 0.32, airiness 0.38, ornament 0.85, darkness 0.00, legacy 0.00, 6 hues
- grammar: **modern** (2nd soft, share 0.26), verticality 0.74, natural time golden (captures forced to day)
  - warm primary hue 53° → golden hour
  - architecture: modern (1.01)
  - 66 buildings, 46% lot coverage (text density 0.32, whitespace 0.38)
  - verticality 0.74 (DOM depth 0.96)
  - traffic 0.28 (links), billboards 1.00 (images), parks 0.56 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | media | 7.3% | 10 | IKEA | hero `div.plp-navigation-slot-wrapper` | B1 the hero region → landmark (contains the page's <h1> “Tables & chairs”); B2 13 images, 13.0 per 1000 chars → media |
| 1 | major | structured | 74.7% | 5 | Living on a | pricing `div.g1su26hm` | B1 district with 74.7% of the page (≥ 4%) → major; B2 kind "pricing" → structured |
| 2 | minor | text | 0.2% | 0 | IKEA | brand `a.hnf-link` | B1 region outside the majors (0.2%) → minor; B2 0 chars, 1.0 links/100 chars, 1 images → text |
| 3 | minor | action | 1.3% | 0 | Search | form `form.search-box-form` | B1 region outside the majors (1.3%) → minor; B2 kind "form" → action |
| 4 | support | links | 10.6% | 0 |  | footer `footer.hnf-footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- showcase “Showcase”: inside the landmark

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark media “IKEA”: stepped 22f crown modern
- block 1 (1,2) **slabs** ← major structured “Living on a”: slab 7f flat modern, slab 9f flat modern
- block 2 (2,1) lots ×8: corner/flat×2, kiosk/terrace×2, walkup/terrace×2, walkup/flat×1, kiosk/flat×1; floors 3 4 2 3 4 2 2 3
- block 3 (2,2) lots ×12: walkup/terrace×2, corner/flat×1, kiosk/terrace×2, walkup/flat×3, kiosk/flat×2, apartments/terrace×2; floors 2 2 5 1 2 4 1 3 3 1 3 4
- block 4 (0,1) lots ×12: walkup/terrace×1, corner/terrace×1, kiosk/flat×4, walkup/flat×5, apartments/terrace×1; floors 1 3 5 2 3 4 1 3 4 1 2 3
- block 5 (1,0) lots ×12: walkup/flat×4, apartments/terrace×1, kiosk/terrace×2, walkup/terrace×3, kiosk/flat×2; floors 1 3 3 1 3 3 2 3 3 1 2 4
- block 6 (0,2) lots ×12: walkup/terrace×3, corner/flat×1, kiosk/flat×2, walkup/flat×4, kiosk/terrace×2; floors 2 3 3 1 3 4 2 3 5 1 3 4
- block 7 (2,0) lots ×12: walkup/terrace×3, corner/flat×1, kiosk/terrace×3, walkup/flat×4, kiosk/flat×1; floors 1 2 3 2 2 4 1 3 4 2 3 5
- block 8 (1,3) lots ×12: walkup/terrace×1, corner/terrace×1, kiosk/terrace×2, walkup/flat×4, apartments/terrace×2, kiosk/flat×2; floors 2 2 4 1 2 4 2 2 5 1 2 4
- block 9 (3,1) lots ×8: walkup/flat×4, corner/terrace×1, kiosk/flat×2, walkup/terrace×1; floors 2 3 4 1 2 5 1 3
- block 10 (2,3) lots ×8: kiosk/flat×1, walkup/flat×3, corner/flat×1, kiosk/terrace×2, walkup/terrace×1; floors 3 1 2 3 1 3 4 2
- block 11 (3,2) lots ×8: apartments/flat×1, kiosk/flat×3, walkup/flat×3, corner/terrace×1; floors 3 4 1 2 4 1 2 4
- block 12 (0,0) lots ×12: walkup/flat×4, corner/terrace×1, kiosk/terrace×3, kiosk/flat×1, walkup/terrace×1, apartments/terrace×1, apartments/flat×1; floors 1 2 4 1 3 3 1 2 4 2 3 3
- block 13 (0,3) lots ×12: walkup/flat×4, corner/flat×1, kiosk/terrace×2, apartments/terrace×1, kiosk/flat×2, walkup/terrace×2; floors 2 3 4 2 2 4 1 2 3 2 2 4
- block 14 (3,0) lots ×12: walkup/terrace×4, corner/terrace×1, kiosk/terrace×3, walkup/flat×3, kiosk/flat×1; floors 2 3 3 1 2 4 1 2 5 1 2 4
- block 15 (3,3) lots ×12: walkup/flat×2, corner/flat×1, kiosk/flat×3, walkup/terrace×5, kiosk/terrace×1; floors 2 3 4 1 3 3 1 3 4 1 3 4

## Summary

```json
{
 "blocks": [
  "civic",
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
  "lots",
  "lots",
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "slabs": 1,
  "lots": 14
 },
 "families": {
  "stepped": 1,
  "slab": 2,
  "corner": 14,
  "kiosk": 51,
  "walkup": 77,
  "apartments": 10
 },
 "roofs": {
  "crown": 1,
  "flat": 87,
  "terrace": 67
 },
 "styles": {
  "modern": 120,
  "soft": 35
 },
 "grounds": {
  "lobby": 1,
  "arcade": 2,
  "shop": 48,
  "cafe": 69,
  "homes": 35
 },
 "signage": {
  "plaque": 36,
  "painted": 2,
  "shop": 67,
  "none": 50
 },
 "buildings": 155,
 "floors": {
  "min": 1,
  "max": 22,
  "mean": 2.793548387096774
 },
 "distinctLotPrograms": 28,
 "lots": 152,
 "landmark": "stepped"
}
```
