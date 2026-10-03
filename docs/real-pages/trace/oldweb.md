# oldweb — old / simple HTML

URL: https://www.paulgraham.com/articles.html

## Extracted facts

- nodes 135, elements 2165, regions 1, districts 0, site name “Essays”
- structure: size 0.81, depth 0.25, breadth 0.07, regularity 1.00, sections 0.00
- content: text 0.10, imagery 1.00, links 0.32, headings 0.00, interactivity 0.00, forms 0.00
- style: serif 0.00 / sans 1.00 / mono 0.00, roundness 0.00, airiness 0.00, ornament 0.00, darkness 0.00, legacy 1.00, 0 hues
- grammar: **retro** (2nd modern, share 0.15), verticality 0.52, natural time day (captures forced to day)
  - light page, no brand hue → daylight
  - architecture: retro (1.80), legacy HTML
  - 60 buildings, 59% lot coverage (text density 0.10, whitespace 0.00)
  - verticality 0.52 (DOM depth 0.25)
  - traffic 0.35 (links), billboards 1.00 (images), parks 0.16 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 0.1% | 0 | Essays | brand `img` | B1 the hero region → landmark (no <h1> on the page: the site name is its monument); B2 0 chars, 0.0 links/100 chars, 1 images → text |
| 1 | minor | links | 2.0% | 0 |  | page `body` | FALLBACK: no minor region; the page as a whole, weight fixed at 2%; 4.5 links per 100 chars |

**Suspicious:**
- no minor regions: every lot uses one fallback brief built from the whole page

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “Essays”: clocktower 12f spire retro
- block 1 (1,2) lots ×12: corner/flat×1, corner/gable×2, corner/terrace×1, walkup/flat×6, walkup/terrace×1, walkup/gable×1; floors 3 3 4 4 4 4 3 3 3 4 2 4
- block 2 (2,1) lots ×8: corner/flat×3, corner/gable×1, walkup/flat×4; floors 4 4 4 4 3 4 3 3
- block 3 (2,2) lots ×12: corner/terrace×1, corner/flat×2, corner/gable×1, walkup/flat×6, walkup/terrace×2; floors 4 2 4 3 3 4 3 3 3 3 3 3
- block 4 (0,1) lots ×12: corner/flat×3, corner/gable×1, walkup/flat×8; floors 3 3 4 4 3 3 3 3 4 2 2 3
- block 5 (1,0) lots ×12: corner/flat×2, corner/terrace×1, corner/gable×1, walkup/gable×3, walkup/flat×4, walkup/terrace×1; floors 3 4 3 2 4 3 4 4 3 3 3 3
- block 6 (0,2) lots ×12: corner/gable×1, corner/flat×3, walkup/flat×4, walkup/gable×4; floors 4 4 2 3 4 4 4 4 4 3 4 4
- block 7 (2,0) lots ×12: corner/gable×1, corner/flat×3, walkup/flat×6, walkup/gable×2; floors 3 3 3 4 2 3 2 4 4 3 4 4
- block 8 (1,3) lots ×12: corner/gable×3, corner/flat×1, walkup/flat×7, walkup/gable×1; floors 4 2 4 3 2 3 4 2 4 2 3 3
- block 9 (3,1) lots ×8: corner/flat×3, corner/gable×1, walkup/flat×3, walkup/gable×1; floors 4 4 3 2 3 4 2 3
- block 10 (2,3) lots ×8: corner/flat×3, corner/gable×1, walkup/flat×3, walkup/gable×1; floors 2 2 3 3 3 4 3 4
- block 11 (3,2) lots ×8: corner/flat×3, corner/gable×1, walkup/flat×4; floors 4 3 3 3 3 2 3 4
- block 12 (0,0) lots ×12: corner/flat×2, corner/gable×2, walkup/flat×4, walkup/gable×3, walkup/terrace×1; floors 3 2 4 3 4 3 3 2 3 4 4 2
- block 13 (0,3) lots ×12: corner/flat×3, corner/gable×1, walkup/gable×4, walkup/flat×4; floors 4 4 3 4 2 3 3 2 3 4 3 3
- block 14 (3,0) lots ×12: corner/gable×4, walkup/flat×6, walkup/gable×1, walkup/terrace×1; floors 4 3 2 2 2 4 3 2 4 3 3 4
- block 15 (3,3) lots ×12: corner/flat×4, walkup/gable×5, walkup/flat×3; floors 4 4 4 3 4 2 3 3 4 3 3 4

## Summary

```json
{
 "blocks": [
  "civic",
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
  "lots",
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "lots": 15
 },
 "families": {
  "clocktower": 1,
  "corner": 60,
  "walkup": 104
 },
 "roofs": {
  "spire": 1,
  "flat": 108,
  "gable": 47,
  "terrace": 9
 },
 "styles": {
  "retro": 143,
  "modern": 22
 },
 "grounds": {
  "lobby": 1,
  "shop": 117,
  "cafe": 47
 },
 "signage": {
  "plaque": 1,
  "shop": 123,
  "blade": 41
 },
 "buildings": 165,
 "floors": {
  "min": 2,
  "max": 12,
  "mean": 3.278787878787879
 },
 "distinctLotPrograms": 22,
 "lots": 164,
 "landmark": "clocktower"
}
```
