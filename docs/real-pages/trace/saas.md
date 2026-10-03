# saas — product / SaaS landing

URL: https://linear.app/

## Extracted facts

- nodes 781, elements 2160, regions 12, districts 6, site name “Linear”
- structure: size 0.81, depth 0.71, breadth 0.20, regularity 0.46, sections 0.85
- content: text 0.35, imagery 1.00, links 0.10, headings 0.09, interactivity 1.00, forms 0.00
- style: serif 0.00 / sans 1.00 / mono 0.00, roundness 0.30, airiness 0.51, ornament 0.85, darkness 1.00, legacy 0.00, 6 hues
- grammar: **modern** (2nd soft, share 0.27), verticality 0.63, natural time night (captures forced to day)
  - dark page background → night
  - architecture: modern (1.00)
  - 73 buildings, 42% lot coverage (text density 0.35, whitespace 0.51)
  - verticality 0.63 (DOM depth 0.71)
  - traffic 0.11 (links), billboards 1.00 (images), parks 0.69 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | media | 14.4% | 0 | Linear | hero `div` | B1 the hero region → landmark (contains the page's <h1> “The product development system for teams …”); B2 42 images, 39.7 per 1000 chars → media |
| 1 | major | media | 19.2% | 10 | Intake and | logos `section.b-30Va_root` | B1 district with 19.2% of the page (≥ 4%) → major; B2 kind "logos" → media |
| 2 | major | media | 11.8% | 1 | Planning and | showcase `section.b-30Va_root` | B1 district with 11.8% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 3 | major | media | 9.3% | 4 | AI and | showcase `section.b-30Va_root` | B1 district with 9.3% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 4 | major | media | 26.2% | 15 | Build review | showcase `section.b-30Va_root` | B1 district with 26.2% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 5 | minor | links | 2.0% | 9 |  | nav `nav.TZTsQG_menuRoot` | B1 region outside the majors (2.0%) → minor; B2 kind "nav" → links |
| 6 | minor | text | 0.2% | 0 | Linear | brand `a.TZTsQG_logoLink` | B1 region outside the majors (0.2%) → minor; B2 0 chars, 1.0 links/100 chars, 0 images → text |
| 7 | minor | text | 2.2% | 0 | Changelog | section `div.hide-mobile` | B1 region outside the majors (2.2%) → minor; B2 1008 chars, 0.5 links/100 chars, 0 images → text |
| 8 | minor | text | 1.4% | 3 | Testimonials | testimonials `div.NAY0wa_inner` | B1 region outside the majors (1.4%) → minor; B2 kind "testimonials" → text |
| 9 | support | links | 5.1% | 0 |  | footer `footer.Jmh1Wq_footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- showcase “Faster app launch”: inside the landmark

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark media “Linear”: stepped 21f crown modern
- block 1 (1,2) **towers** ← major media “Intake and”: podiumTower 14f flat modern, asymmetric 4f terrace modern
- block 2 (2,1) **towers** ← major media “Planning and”: podiumTower 14f flat modern, asymmetric 5f terrace modern
- block 3 (2,2) **towers** ← major media “AI and”: podiumTower 14f flat soft, asymmetric 4f flat modern
- block 4 (0,1) **towers** ← major media “Build review”: podiumTower 14f flat soft, asymmetric 5f terrace modern
- block 5 (1,0) lots ×12: rows/flat×3, apartments/terrace×2, corner/terrace×1, apartments/flat×1, walkup/terrace×3, walkup/flat×2; floors 3 3 3 3 2 3 3 4 3 1 3 3
- block 6 (0,2) lots ×12: apartments/terrace×3, apartments/flat×2, walkup/flat×3, rows/flat×2, walkup/terrace×2; floors 4 4 1 3 3 4 4 2 4 2 4 4
- block 7 (2,0) lots ×12: walkup/terrace×2, rows/flat×1, apartments/terrace×2, corner/flat×1, apartments/flat×1, rows/terrace×1, walkup/flat×3, rows/gable×1; floors 1 3 2 4 3 1 3 3 4 4 2 4
- block 8 (1,3) lots ×12: corner/terrace×2, apartments/terrace×3, walkup/flat×3, rows/gable×1, apartments/flat×1, rows/flat×1, walkup/terrace×1; floors 3 3 4 1 3 2 4 3 2 3 2 3
- block 9 (3,1) lots ×8: apartments/flat×2, walkup/terrace×1, rows/flat×1, corner/flat×1, walkup/flat×2, rows/terrace×1; floors 4 2 3 1 3 4 1 4
- block 10 (2,3) lots ×8: corner/flat×2, apartments/flat×1, walkup/terrace×2, rows/flat×1, walkup/flat×1, apartments/terrace×1; floors 1 3 3 1 4 3 4 4
- block 11 (3,2) lots ×8: walkup/flat×3, rows/flat×2, corner/flat×1, corner/terrace×1, apartments/flat×1; floors 2 4 2 3 3 1 3 3
- block 12 (0,0) lots ×12: corner/flat×1, apartments/terrace×3, walkup/terrace×2, rows/flat×1, walkup/flat×3, rows/terrace×1, apartments/flat×1; floors 3 3 2 3 3 3 4 1 3 3 4 3
- block 13 (0,3) lots ×12: walkup/flat×3, rows/flat×3, corner/terrace×1, corner/flat×1, apartments/terrace×2, walkup/terrace×2; floors 2 4 2 4 3 1 3 2 3 4 1 4
- block 14 (3,0) lots ×12: corner/terrace×2, apartments/terrace×3, walkup/terrace×2, rows/flat×1, apartments/flat×1, walkup/flat×2, rows/gable×1; floors 3 4 3 1 3 3 3 3 2 3 2 4
- block 15 (3,3) lots ×12: apartments/flat×3, walkup/flat×2, rows/flat×1, apartments/terrace×2, walkup/terrace×3, rows/terrace×1; floors 4 2 4 2 4 3 1 4 3 4 4 2

## Summary

```json
{
 "blocks": [
  "civic",
  "towers",
  "towers",
  "towers",
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
  "lots"
 ],
 "blockHist": {
  "civic": 1,
  "towers": 4,
  "lots": 11
 },
 "families": {
  "stepped": 1,
  "podiumTower": 4,
  "asymmetric": 4,
  "rows": 24,
  "apartments": 35,
  "corner": 14,
  "walkup": 47
 },
 "roofs": {
  "crown": 1,
  "flat": 70,
  "terrace": 55,
  "gable": 3
 },
 "styles": {
  "modern": 103,
  "soft": 26
 },
 "grounds": {
  "lobby": 3,
  "shop": 64,
  "cafe": 16,
  "homes": 46
 },
 "signage": {
  "plaque": 47,
  "billboard": 4,
  "screen": 4,
  "shop": 44,
  "none": 24,
  "blade": 6
 },
 "buildings": 129,
 "floors": {
  "min": 1,
  "max": 21,
  "mean": 3.4108527131782944
 },
 "distinctLotPrograms": 33,
 "lots": 120,
 "landmark": "stepped"
}
```
