# docs — technical documentation

URL: https://docs.python.org/3/library/itertools.html

## Extracted facts

- nodes 323, elements 4954, regions 11, districts 1, site name “Python documentation”
- structure: size 0.96, depth 0.33, breadth 0.35, regularity 1.00, sections 0.32
- content: text 0.60, imagery 0.03, links 0.07, headings 0.03, interactivity 0.07, forms 1.00
- style: serif 0.00 / sans 0.92 / mono 0.08, roundness 0.15, airiness 0.07, ornament 0.15, darkness 0.88, legacy 0.00, 6 hues
- grammar: **modern** (2nd tech, share 0.22), verticality 0.68, natural time night (captures forced to day)
  - dark page background → night
  - architecture: modern (0.60)
  - 105 buildings, 74% lot coverage (text density 0.60, whitespace 0.07)
  - verticality 0.68 (DOM depth 0.33)
  - traffic 0.08 (links), billboards 0.03 (images), parks 0.17 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 0.0% | 0 | Python | brand `a.nav-logo` | B1 the hero region → landmark (no <h1> on the page: the site name is its monument); B2 0 chars, 1.0 links/100 chars, 1 images → text |
| 1 | major | links | 7.1% | 9 | Feed | feed `tbody` | B1 district with 7.1% of the page (≥ 4%) → major; B2 kind "feed" → links |
| 2 | major | text | 50.3% | 0 | Itertool | section `section#itertool-functions` | B1 district with 50.3% of the page (≥ 4%) → major; B2 18162 chars, 0.3 links/100 chars, 0 images → text |
| 3 | major | text | 34.8% | 0 | Itertools | section `section#itertools-recipes` | B1 district with 34.8% of the page (≥ 4%) → major; B2 12004 chars, 0.0 links/100 chars, 0 images → text |
| 4 | minor | links | 0.8% | 4 | Table of | features `nav.menu` | B1 region outside the majors (0.8%) → minor; B2 3.1 links per 100 chars → links |
| 5 | minor | links | 0.9% | 1 |  | nav `div.related` | B1 region outside the majors (0.9%) → minor; B2 kind "nav" → links |
| 6 | minor | links | 0.7% | 4 | Table of | features `div.sphinxsidebarwrapper` | B1 region outside the majors (0.7%) → minor; B2 3.2 links per 100 chars → links |
| 7 | support | links | 0.2% | 0 |  | footer `div.footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- section “itertools — Functions creating iterators for efficient looping¶”: B1 container: 97% of the page, opened into 1 child region(s)
- main “”: B1 container: 96% of the page, opened into 1 child region(s)
- section “itertools — Functions creating iterators for efficient looping¶”: B1 container: 96% of the page, opened into 3 child region(s)
- section “itertools — Functions creating iterators for efficient looping¶”: contains the landmark or a major (a wrapper)
- section “itertools — Functions creating iterators for efficient looping¶”: contains the landmark or a major (a wrapper)

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “Python”: stepped 21f crown modern
- block 1 (1,2) **market** ← major links “Feed”: corner 4f flat modern, corner 3f terrace modern, corner 4f terrace modern, corner 4f crown tech, rows 4f flat modern, rows 5f crown tech, rows 3f flat modern, rows 3f flat modern
- block 2 (2,1) **slabs** ← major text “Itertool”: slab 7f flat modern, slab 9f flat modern
- block 3 (2,2) **slabs** ← major text “Itertools”: slab 7f crown tech, slab 9f crown tech
- block 4 (0,1) lots ×12: rows/flat×6, corner/terrace×1, walkup/flat×5; floors 2 2 3 2 2 3 2 1 3 2 1 1
- block 5 (1,0) lots ×12: rows/flat×2, corner/crown×1, rows/terrace×4, walkup/flat×4, walkup/crown×1; floors 2 3 2 1 3 2 3 2 2 2 2 1
- block 6 (0,2) lots ×12: rows/terrace×2, corner/flat×1, rows/flat×4, walkup/flat×2, walkup/terrace×3; floors 3 3 1 1 3 3 3 2 3 2 3 2
- block 7 (2,0) lots ×12: rows/terrace×2, corner/flat×1, rows/flat×4, walkup/flat×4, walkup/terrace×1; floors 2 2 2 2 2 2 2 2 3 3 3 2
- block 8 (1,3) lots ×12: rows/terrace×2, corner/terrace×1, walkup/flat×4, rows/flat×4, walkup/terrace×1; floors 3 2 3 1 2 2 3 1 3 2 2 1
- block 9 (3,1) lots ×8: rows/flat×4, corner/terrace×1, walkup/flat×2, walkup/terrace×1; floors 3 3 2 1 2 3 2 1
- block 10 (2,3) lots ×8: rows/flat×3, corner/flat×1, walkup/terrace×1, walkup/flat×2, rows/terrace×1; floors 2 1 2 1 3 3 2 2
- block 11 (3,2) lots ×8: rows/flat×4, corner/flat×1, walkup/terrace×1, walkup/flat×2; floors 3 3 2 1 2 1 2 2
- block 12 (0,0) lots ×12: rows/flat×3, corner/terrace×1, rows/terrace×3, walkup/flat×3, walkup/crown×1, walkup/terrace×1; floors 2 2 3 1 3 2 2 1 2 3 3 1
- block 13 (0,3) lots ×12: rows/flat×3, corner/flat×1, rows/terrace×3, walkup/flat×3, walkup/terrace×2; floors 3 3 2 2 2 2 2 1 2 3 2 1
- block 14 (3,0) lots ×12: rows/terrace×3, corner/terrace×1, walkup/terrace×1, rows/flat×3, walkup/flat×3, walkup/crown×1; floors 3 3 2 1 2 3 2 1 3 2 2 2
- block 15 (3,3) lots ×12: rows/flat×3, corner/flat×1, walkup/flat×3, rows/terrace×3, walkup/terrace×2; floors 3 3 3 1 3 2 3 1 3 2 3 2

## Summary

```json
{
 "blocks": [
  "civic",
  "market",
  "slabs",
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
  "slabs": 2,
  "lots": 12
 },
 "families": {
  "stepped": 1,
  "corner": 16,
  "rows": 70,
  "slab": 4,
  "walkup": 54
 },
 "roofs": {
  "crown": 9,
  "flat": 92,
  "terrace": 44
 },
 "styles": {
  "modern": 123,
  "tech": 22
 },
 "grounds": {
  "lobby": 1,
  "shop": 99,
  "cafe": 41,
  "arcade": 4
 },
 "signage": {
  "plaque": 1,
  "shop": 84,
  "blade": 23,
  "painted": 4,
  "none": 33
 },
 "buildings": 145,
 "floors": {
  "min": 1,
  "max": 21,
  "mean": 2.5310344827586206
 },
 "distinctLotPrograms": 23,
 "lots": 132,
 "landmark": "stepped"
}
```
