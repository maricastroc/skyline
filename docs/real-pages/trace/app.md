# app — dashboard / app

URL: https://github.com/sveltejs/svelte

## Extracted facts

- nodes 417, elements 1447, regions 29, districts 2, site name “GitHub”
- structure: size 0.73, depth 1.00, breadth 0.26, regularity 0.64, sections 1.00
- content: text 0.20, imagery 0.96, links 0.37, headings 0.24, interactivity 1.00, forms 0.00
- style: serif 0.00 / sans 0.70 / mono 0.30, roundness 0.60, airiness 0.13, ornament 1.00, darkness 0.00, legacy 0.00, 5 hues
- grammar: **soft** (2nd modern, share 0.31), verticality 0.79, natural time day (captures forced to day)
  - light page, cool hue 260° → daylight
  - architecture: soft (0.97), rounded UI
  - 58 buildings, 55% lot coverage (text density 0.20, whitespace 0.13)
  - verticality 0.79 (DOM depth 1.00)
  - traffic 0.41 (links), billboards 0.96 (images), parks 0.29 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 0.4% | 0 | GitHub | brand `a.Primer_Brand__Link-module__Link___lF11` | B1 the hero region → landmark (no <h1> on the page: the site name is its monument); B2 39 chars, 1.0 links/100 chars, 0 images → text |
| 1 | major | media | 28.5% | 0 | Navigation | section `div.position-relative` | B1 district with 28.5% of the page (≥ 4%) → major; B2 10 images, 6.3 per 1000 chars → media |
| 2 | major | links | 4.2% | 0 |  | section `div.OverviewContent-module__Box_1__MPS0U` | B1 district with 4.2% of the page (≥ 4%) → major; B2 4.0 links per 100 chars → links |
| 3 | major | structured | 42.2% | 0 | Latest | section `div` | B1 district with 42.2% of the page (≥ 4%) → major; B2 91% of its elements in tables → structured |
| 4 | major | media | 7.9% | 0 | Repository | section `div.OverviewRepoFiles-module__Box_1__OXe` | B1 district with 7.9% of the page (≥ 4%) → major; B2 3 images, 2.6 per 1000 chars → media |
| 5 | major | links | 7.1% | 6 | About | features `div.CodeViewSidebar-module__borderGrid__` | B1 district with 7.1% of the page (≥ 4%) → major; B2 3.9 links per 100 chars → links |
| 6 | minor | links | 3.2% | 9 |  | nav `nav.UnderlineNav` | B1 region outside the majors (3.2%) → minor; B2 kind "nav" → links |
| 7 | support | links | 2.4% | 0 |  | footer `footer.footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- section “Latest commit”: B1 container: 63% of the page, opened into 2 child region(s)
- section “Latest commit”: B1 container: 55% of the page, opened into 2 child region(s)
- section “Latest commit”: B1 container: 50% of the page, opened into 2 child region(s)
- section “Navigation Menu”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- showcase “Showcase”: inside major “Navigation Menu”
- section “”: inside major “Navigation Menu”
- section “Latest commit”: contains the landmark or a major (a wrapper)
- section “Latest commit”: contains the landmark or a major (a wrapper)
- section “”: inside major “section”
- section “”: inside major “section”
- section “Latest commit”: contains the landmark or a major (a wrapper)
- feed “Feed”: inside major “Latest commit”
- section “Repository files navigation”: inside major “Repository files navigation”
- section “Repository files navigation”: inside major “Repository files navigation”
- toc “Contents”: inside major “Repository files navigation”
- section “What is Svelte?”: inside major “Repository files navigation”
- section “What is Svelte?”: inside major “Repository files navigation”

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “GitHub”: stepped 22f terrace soft
- block 1 (1,2) **towers** ← major media “Navigation”: podiumTower 15f flat soft, asymmetric 5f terrace soft
- block 2 (2,1) **market** ← major links “section”: corner 5f terrace soft, corner 4f terrace soft, corner 4f flat modern, corner 5f flat soft, walkup 4f flat modern, walkup 4f flat modern, walkup 4f terrace soft, walkup 3f terrace soft
- block 3 (2,2) **slabs** ← major structured “Latest”: slab 7f terrace modern, slab 9f terrace modern
- block 4 (0,1) **towers** ← major media “Repository”: podiumTower 15f flat modern, asymmetric 5f terrace soft
- block 5 (1,0) **market** ← major links “About”: corner 3f flat soft, corner 5f terrace modern, corner 4f terrace soft, corner 3f flat soft, rows 5f gable soft, rows 3f gable soft, rows 5f gable soft, rows 5f gable soft
- block 6 (0,2) lots ×12: rows/terrace×1, walkup/terrace×6, rows/flat×1, rows/gable×4; floors 4 2 3 1 5 2 4 2 5 1 5 2
- block 7 (2,0) lots ×12: rows/gable×5, walkup/flat×4, rows/flat×1, walkup/terrace×2; floors 3 1 4 2 3 1 3 2 4 2 5 2
- block 8 (1,3) lots ×12: rows/gable×4, walkup/terrace×2, walkup/flat×4, rows/flat×2; floors 5 1 5 1 3 1 4 1 5 1 3 1
- block 9 (3,1) lots ×8: rows/gable×3, walkup/terrace×2, walkup/flat×2, rows/flat×1; floors 4 2 4 1 3 2 3 2
- block 10 (2,3) lots ×8: rows/gable×3, walkup/flat×2, walkup/terrace×2, rows/terrace×1; floors 3 1 3 1 4 2 4 2
- block 11 (3,2) lots ×8: rows/flat×1, walkup/flat×3, rows/gable×3, walkup/terrace×1; floors 5 1 3 1 4 1 4 2
- block 12 (0,0) lots ×12: rows/gable×5, walkup/terrace×5, walkup/flat×1, rows/flat×1; floors 3 1 4 1 5 1 4 1 4 2 5 1
- block 13 (0,3) lots ×12: rows/flat×2, walkup/flat×3, rows/gable×3, rows/terrace×1, walkup/terrace×3; floors 5 2 4 2 3 1 3 1 4 2 4 2
- block 14 (3,0) lots ×12: rows/gable×6, walkup/terrace×4, walkup/flat×2; floors 5 1 3 1 3 2 3 1 5 1 4 2
- block 15 (3,3) lots ×12: rows/gable×5, walkup/terrace×5, walkup/flat×1, rows/flat×1; floors 5 2 4 1 4 1 4 1 4 1 4 2

## Summary

```json
{
 "blocks": [
  "civic",
  "towers",
  "market",
  "slabs",
  "towers",
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
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "towers": 2,
  "market": 2,
  "slabs": 1,
  "lots": 10
 },
 "families": {
  "stepped": 1,
  "podiumTower": 2,
  "asymmetric": 2,
  "corner": 8,
  "walkup": 58,
  "slab": 2,
  "rows": 58
 },
 "roofs": {
  "terrace": 46,
  "flat": 40,
  "gable": 45
 },
 "styles": {
  "soft": 96,
  "modern": 35
 },
 "grounds": {
  "lobby": 2,
  "shop": 92,
  "cafe": 36,
  "arcade": 1
 },
 "signage": {
  "plaque": 1,
  "billboard": 2,
  "screen": 2,
  "shop": 52,
  "blade": 18,
  "painted": 2,
  "none": 54
 },
 "buildings": 131,
 "floors": {
  "min": 1,
  "max": 22,
  "mean": 3.312977099236641
 },
 "distinctLotPrograms": 16,
 "lots": 108,
 "landmark": "stepped"
}
```
