# forum — forum / community

URL: https://lobste.rs/

## Extracted facts

- nodes 460, elements 787, regions 6, districts 1, site name “Lobsters”
- structure: size 0.62, depth 0.21, breadth 0.22, regularity 0.15, sections 0.74
- content: text 0.38, imagery 1.00, links 0.92, headings 0.81, interactivity 0.00, forms 0.00
- style: serif 0.06 / sans 0.88 / mono 0.06, roundness 0.27, airiness 0.10, ornament 0.29, darkness 0.35, legacy 0.00, 1 hues
- grammar: **modern** (2nd soft, share 0.19), verticality 0.49, natural time golden (captures forced to day)
  - warm primary hue 29° → golden hour
  - architecture: modern (0.76)
  - 55 buildings, 59% lot coverage (text density 0.38, whitespace 0.10)
  - verticality 0.49 (DOM depth 0.21)
  - traffic 1.00 (links), billboards 1.00 (images), parks 0.26 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | links | 2.0% | 0 | Lobsters | hero `header#header` | B1 the hero region → landmark (contains the page's <h1> “Lobsters”); B2 6.0 links per 100 chars → links |
| 1 | major | media | 96.4% | 16 | I got | showcase `ol.stories` | B1 district with 96.4% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 2 | support | links | 0.9% | 0 |  | footer `footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- brand “Lobsters”: inside the landmark
- nav “”: inside the landmark

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark links “Lobsters”: stepped 20f crown modern
- block 1 (1,2) **towers** ← major media “I got”: podiumTower 13f flat modern, asymmetric 4f terrace modern
- block 2 (2,1) lots ×8: walkup/flat×6, walkup/terrace×2; floors 2 1 1 2 1 2 1 1
- block 3 (2,2) lots ×12: walkup/terrace×5, walkup/flat×7; floors 1 1 2 1 1 1 1 1 1 1 1 1
- block 4 (0,1) lots ×12: walkup/terrace×3, walkup/flat×9; floors 1 1 2 2 1 1 1 1 1 1 1 1
- block 5 (1,0) lots ×12: walkup/flat×6, walkup/terrace×6; floors 1 2 1 1 2 1 2 2 1 1 1 1
- block 6 (0,2) lots ×12: walkup/terrace×5, walkup/flat×7; floors 1 1 1 1 2 1 2 2 2 1 2 1
- block 7 (2,0) lots ×12: walkup/terrace×6, walkup/flat×6; floors 1 1 1 2 1 1 1 1 1 1 2 2
- block 8 (1,3) lots ×12: walkup/terrace×6, walkup/flat×6; floors 2 1 2 1 1 1 1 1 2 1 1 1
- block 9 (3,1) lots ×8: walkup/flat×6, walkup/terrace×2; floors 2 2 1 1 1 2 1 1
- block 10 (2,3) lots ×8: walkup/flat×6, walkup/terrace×2; floors 1 1 1 1 1 2 1 2
- block 11 (3,2) lots ×8: walkup/flat×7, walkup/terrace×1; floors 2 1 1 1 1 1 1 1
- block 12 (0,0) lots ×12: walkup/flat×6, walkup/terrace×6; floors 1 1 1 1 2 1 1 1 1 1 2 1
- block 13 (0,3) lots ×12: walkup/flat×7, walkup/terrace×5; floors 2 2 1 2 1 1 1 1 1 2 1 1
- block 14 (3,0) lots ×12: walkup/terrace×6, walkup/flat×6; floors 2 1 1 1 1 2 1 1 2 1 1 1
- block 15 (3,3) lots ×12: walkup/flat×6, walkup/terrace×6; floors 2 2 1 1 1 1 1 1 1 1 1 1

## Summary

```json
{
 "blocks": [
  "civic",
  "towers",
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
  "towers": 1,
  "lots": 14
 },
 "families": {
  "stepped": 1,
  "podiumTower": 1,
  "asymmetric": 1,
  "walkup": 152
 },
 "roofs": {
  "crown": 1,
  "flat": 92,
  "terrace": 62
 },
 "styles": {
  "modern": 133,
  "soft": 22
 },
 "grounds": {
  "lobby": 1,
  "shop": 111,
  "cafe": 43
 },
 "signage": {
  "plaque": 1,
  "billboard": 1,
  "screen": 1,
  "none": 152
 },
 "buildings": 155,
 "floors": {
  "min": 1,
  "max": 20,
  "mean": 1.4645161290322581
 },
 "distinctLotPrograms": 8,
 "lots": 152,
 "landmark": "stepped"
}
```
