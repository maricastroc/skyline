# portfolio — portfolio

URL: https://brittanychiang.com/

## Extracted facts

- nodes 167, elements 396, regions 27, districts 4, site name “Brittany Chiang”
- structure: size 0.49, depth 0.54, breadth 0.26, regularity 0.68, sections 0.37
- content: text 0.80, imagery 0.64, links 0.29, headings 0.63, interactivity 0.13, forms 0.00
- style: serif 0.00 / sans 0.96 / mono 0.04, roundness 0.50, airiness 0.40, ornament 0.29, darkness 0.98, legacy 0.00, 6 hues
- grammar: **soft** (2nd modern, share 0.33), verticality 0.60, natural time night (captures forced to day)
  - dark page background → night
  - architecture: soft (0.80), rounded UI
  - 53 buildings, 54% lot coverage (text density 0.80, whitespace 0.40)
  - verticality 0.60 (DOM depth 0.54)
  - traffic 0.32 (links), billboards 0.64 (images), parks 0.55 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | links | 9.8% | 0 | Brittany | hero `header.lg:sticky` | B1 the hero region → landmark (contains the page's <h1> “Brittany Chiang”); B2 5.9 links per 100 chars → links |
| 1 | major | text | 6.0% | 0 | About | section `section#about.scroll-mt-16` | B1 district with 6.0% of the page (≥ 4%) → major; B2 927 chars, 0.2 links/100 chars, 0 images → text |
| 2 | major | text | 42.1% | 0 | Experience | section `section#experience.scroll-mt-16` | B1 district with 42.1% of the page (≥ 4%) → major; B2 1917 chars, 0.6 links/100 chars, 0 images → text |
| 3 | major | media | 21.0% | 0 | Projects | section `section#projects.scroll-mt-16` | B1 district with 21.0% of the page (≥ 4%) → major; B2 4 images, 4.0 per 1000 chars → media |
| 4 | major | media | 14.6% | 4 | Writing | showcase `section#writing.scroll-mt-16` | B1 district with 14.6% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 5 | support | links | 2.4% | 0 |  | footer `p` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- section “Brittany Chiang”: inside the landmark
- brand “Brittany Chiang”: inside the landmark
- nav “”: inside the landmark
- section “Senior Frontend Engineer, Accessibility · Klaviyo”: inside major “Experience”
- section “Senior Frontend Engineer, Accessibility · Klaviyo”: inside major “Experience”
- section “Senior Frontend Engineer, Accessibility · Klaviyo”: inside major “Experience”
- section “Senior Frontend Engineer, Accessibility · Klaviyo”: inside major “Experience”
- section “Lead Engineer · Upstatement Senior Engineer Engineer”: inside major “Experience”
- section “Lead Engineer · Upstatement Senior Engineer Engineer”: inside major “Experience”
- section “Lead Engineer · Upstatement Senior Engineer Engineer”: inside major “Experience”
- section “UI Engineer Co-op · Apple”: inside major “Experience”
- section “UI Engineer Co-op · Apple”: inside major “Experience”
- section “Developer · Scout Studio”: inside major “Experience”
- section “Developer · Scout Studio”: inside major “Experience”
- section “Software Engineer Co-op · Starry”: inside major “Experience”
- section “Software Engineer Co-op · Starry”: inside major “Experience”
- section “Creative Technologist Co-op · MullenLowe U.S.”: inside major “Experience”
- section “Creative Technologist Co-op · MullenLowe U.S.”: inside major “Experience”
- section “Build a Spotify Connected App”: inside major “Projects”
- features “Build a Spotify Connected App”: inside major “Projects”

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark links “Brittany”: stepped 21f terrace soft
- block 1 (1,2) **court** ← major text “About”: courtyard 5f terrace soft
- block 2 (2,1) **court** ← major text “Experience”: courtyard 5f terrace soft
- block 3 (2,2) **towers** ← major media “Projects”: podiumTower 14f flat modern, asymmetric 4f terrace soft
- block 4 (0,1) **towers** ← major media “Writing”: podiumTower 14f flat modern, asymmetric 5f terrace soft
- block 5 (1,0) lots ×12: walkup/flat×4, walkup/terrace×8; floors 1 2 1 1 2 1 2 2 1 1 1 1
- block 6 (0,2) lots ×12: walkup/terrace×8, walkup/flat×4; floors 1 2 1 1 2 1 2 2 2 1 2 1
- block 7 (2,0) lots ×12: walkup/terrace×5, walkup/flat×7; floors 1 1 1 2 1 1 1 1 2 1 2 2
- block 8 (1,3) lots ×12: walkup/terrace×5, walkup/flat×7; floors 2 1 2 1 1 1 1 1 2 1 1 1
- block 9 (3,1) lots ×8: walkup/flat×5, walkup/terrace×3; floors 2 2 1 1 1 2 1 1
- block 10 (2,3) lots ×8: walkup/terrace×5, walkup/flat×3; floors 1 1 1 1 1 2 1 2
- block 11 (3,2) lots ×8: walkup/flat×6, walkup/terrace×2; floors 2 1 1 1 1 1 1 2
- block 12 (0,0) lots ×12: walkup/flat×4, walkup/terrace×8; floors 1 1 2 1 2 1 1 1 1 2 2 1
- block 13 (0,3) lots ×12: walkup/flat×5, walkup/terrace×7; floors 2 2 1 2 1 1 1 1 1 2 1 1
- block 14 (3,0) lots ×12: walkup/terrace×9, walkup/flat×3; floors 2 1 1 1 1 2 1 1 2 1 1 1
- block 15 (3,3) lots ×12: walkup/flat×3, walkup/terrace×9; floors 2 2 1 1 2 1 1 1 1 1 1 2

## Summary

```json
{
 "blocks": [
  "civic",
  "court",
  "court",
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
  "court": 2,
  "towers": 2,
  "lots": 11
 },
 "families": {
  "stepped": 1,
  "courtyard": 2,
  "podiumTower": 2,
  "asymmetric": 2,
  "walkup": 120
 },
 "roofs": {
  "terrace": 74,
  "flat": 53
 },
 "styles": {
  "soft": 91,
  "modern": 36
 },
 "grounds": {
  "lobby": 3,
  "shop": 89,
  "cafe": 35
 },
 "signage": {
  "plaque": 3,
  "screen": 2,
  "billboard": 2,
  "none": 120
 },
 "buildings": 127,
 "floors": {
  "min": 1,
  "max": 21,
  "mean": 1.7874015748031495
 },
 "distinctLotPrograms": 8,
 "lots": 120,
 "landmark": "stepped"
}
```
