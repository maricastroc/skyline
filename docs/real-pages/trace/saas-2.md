# saas-2 — product / SaaS landing

URL: https://vercel.com/

## Extracted facts

- nodes 415, elements 823, regions 12, districts 4, site name “Vercel”
- structure: size 0.63, depth 0.54, breadth 0.26, regularity 0.93, sections 0.57
- content: text 0.34, imagery 1.00, links 0.58, headings 0.27, interactivity 0.61, forms 0.00
- style: serif 0.10 / sans 0.38 / mono 0.52, roundness 0.60, airiness 0.10, ornament 0.87, darkness 1.00, legacy 0.00, 6 hues
- grammar: **tech** (2nd soft, share 0.26), verticality 0.62, natural time night (captures forced to day)
  - dark page background → night
  - architecture: tech (1.24), rounded UI
  - 54 buildings, 59% lot coverage (text density 0.34, whitespace 0.10)
  - verticality 0.62 (DOM depth 0.54)
  - traffic 0.63 (links), billboards 1.00 (images), parks 0.25 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | media | 10.6% | 0 | Vercel | hero `section.relative` | B1 the hero region → landmark (contains the page's <h1> “Agentic Infrastructure”); B2 24 images, 24.0 per 1000 chars → media |
| 1 | major | links | 13.5% | 0 | Introduction | section `div.fixed` | B1 district with 13.5% of the page (≥ 4%) → major; B2 9.7 links per 100 chars → links |
| 2 | major | media | 11.2% | 12 | Build agents | showcase `section.mt-40` | B1 district with 11.2% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 3 | major | text | 6.6% | 0 | Recently | section `section.mt-40` | B1 district with 6.6% of the page (≥ 4%) → major; B2 422 chars, 0.7 links/100 chars, 2 images → text |
| 4 | minor | text | 0.5% | 0 | Vercel | brand `a#marketing-header-logo.cursor-pointer` | B1 region outside the majors (0.5%) → minor; B2 0 chars, 1.0 links/100 chars, 0 images → text |
| 5 | minor | links | 19.9% | 10 |  | nav `nav.flex` | B1 region outside the majors (19.9%) → minor; B2 kind "nav" → links |
| 6 | minor | text | 3.2% | 0 | Built by you | section `section.mt-53` | B1 region outside the majors (3.2%) → minor; B2 93 chars, 1.0 links/100 chars, 0 images → text |
| 7 | support | links | 26.2% | 0 |  | footer `footer.max-w-[var(--ds-page-width-with-m` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- cta “Deploy now”: inside the landmark
- showcase “Showcase”: inside the landmark
- section “”: inside major “Recently shipped”

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark media “Vercel”: narrowTower 21f flat tech
- block 1 (1,2) **market** ← major links “Introduction”: corner 4f flat tech, corner 3f crown tech, corner 4f crown tech, corner 4f terrace soft, walkup 4f flat tech, walkup 4f terrace soft, walkup 3f flat tech, walkup 3f flat tech
- block 2 (2,1) **towers** ← major media “Build agents”: podiumTower 14f crown tech, asymmetric 5f crown tech
- block 3 (2,2) **slabs** ← major text “Recently”: slab 7f terrace soft, slab 9f terrace soft
- block 4 (0,1) lots ×12: apartments/terrace×2, rows/crown×1, corner/flat×1, walkup/flat×6, rows/flat×2; floors 2 6 4 2 2 6 3 1 3 5 2 1
- block 5 (1,0) lots ×12: corner/flat×1, rows/gable×2, corner/crown×1, walkup/flat×4, walkup/crown×3, rows/flat×1; floors 2 6 3 1 3 5 4 2 2 5 3 1
- block 6 (0,2) lots ×12: apartments/terrace×1, rows/flat×1, apartments/flat×1, walkup/flat×5, rows/gable×1, rows/crown×1, walkup/crown×2; floors 3 6 3 1 3 6 4 2 3 6 4 1
- block 7 (2,0) lots ×12: corner/crown×1, rows/flat×1, apartments/terrace×1, walkup/flat×5, rows/gable×1, walkup/crown×1, rows/crown×1, walkup/terrace×1; floors 2 5 3 2 1 6 3 1 3 6 4 2
- block 8 (1,3) lots ×12: corner/crown×2, rows/crown×1, walkup/flat×3, apartments/terrace×1, rows/flat×2, apartments/flat×1, walkup/terrace×1, walkup/crown×1; floors 3 5 4 1 1 6 4 1 3 5 3 1
- block 9 (3,1) lots ×8: corner/flat×2, rows/crown×1, walkup/flat×3, rows/flat×1, walkup/crown×1; floors 3 6 3 1 2 7 3 1
- block 10 (2,3) lots ×8: corner/flat×2, rows/flat×2, walkup/terrace×2, walkup/flat×1, walkup/crown×1; floors 1 5 3 1 2 6 4 2
- block 11 (3,2) lots ×8: apartments/flat×1, rows/flat×2, corner/flat×1, walkup/crown×1, walkup/flat×3; floors 3 6 3 1 2 5 3 2
- block 12 (0,0) lots ×12: corner/flat×1, rows/crown×1, corner/crown×1, walkup/flat×2, rows/flat×2, walkup/crown×3, walkup/terrace×1, apartments/flat×1; floors 2 5 4 1 3 5 3 1 2 6 4 1
- block 13 (0,3) lots ×12: apartments/flat×1, rows/flat×1, corner/crown×1, walkup/flat×5, apartments/terrace×1, rows/crown×2, walkup/crown×1; floors 3 7 4 2 2 6 3 1 2 7 3 1
- block 14 (3,0) lots ×12: corner/crown×2, rows/crown×1, walkup/crown×2, walkup/flat×4, rows/gable×2, walkup/terrace×1; floors 3 6 3 1 1 6 3 1 3 6 3 2
- block 15 (3,3) lots ×12: corner/flat×2, rows/flat×3, walkup/terrace×1, walkup/crown×5, apartments/flat×1; floors 3 6 4 1 3 5 4 1 3 6 4 2

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
  "narrowTower": 1,
  "corner": 22,
  "walkup": 73,
  "podiumTower": 1,
  "asymmetric": 1,
  "slab": 2,
  "apartments": 12,
  "rows": 33
 },
 "roofs": {
  "flat": 80,
  "crown": 42,
  "terrace": 17,
  "gable": 6
 },
 "styles": {
  "tech": 115,
  "soft": 30
 },
 "grounds": {
  "lobby": 1,
  "shop": 82,
  "cafe": 19,
  "arcade": 1,
  "homes": 42
 },
 "signage": {
  "plaque": 43,
  "shop": 58,
  "blade": 7,
  "screen": 1,
  "billboard": 1,
  "painted": 2,
  "none": 33
 },
 "buildings": 145,
 "floors": {
  "min": 1,
  "max": 21,
  "mean": 3.510344827586207
 },
 "distinctLotPrograms": 31,
 "lots": 132,
 "landmark": "narrowTower"
}
```
