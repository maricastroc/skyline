# media — media-heavy

URL: https://www.nasa.gov/images/

## Extracted facts

- nodes 228, elements 592, regions 23, districts 3, site name “NASA”
- structure: size 0.56, depth 0.46, breadth 0.19, regularity 0.49, sections 0.62
- content: text 0.24, imagery 1.00, links 0.32, headings 0.49, interactivity 1.00, forms 1.00
- style: serif 0.02 / sans 0.73 / mono 0.24, roundness 0.30, airiness 0.46, ornament 0.66, darkness 0.00, legacy 0.00, 6 hues
- grammar: **modern** (2nd soft, share 0.31), verticality 0.46, natural time day (captures forced to day)
  - light page, cool hue 260° → daylight
  - architecture: modern (0.79)
  - 45 buildings, 36% lot coverage (text density 0.24, whitespace 0.46)
  - verticality 0.46 (DOM depth 0.46)
  - traffic 0.36 (links), billboards 1.00 (images), parks 0.67 (whitespace)

## Brief

| # | role | content | weight | repeat | label | region | why |
|---|---|---|---|---|---|---|---|
| 0 | landmark | text | 3.5% | 0 | NASA | hero `div.hds-topic-hero` | B1 the hero region → landmark (contains the page's <h1> “NASA Images”); B2 112 chars, 0.0 links/100 chars, 1 images → text |
| 1 | major | links | 7.6% | 0 | Suggested | section `div.hds-search-panel-mobile` | B1 district with 7.6% of the page (≥ 4%) → major; B2 7.0 links per 100 chars → links |
| 2 | major | media | 19.4% | 7 | NASA Image | gallery `div.padding-0` | B1 district with 19.4% of the page (≥ 4%) → major; B2 kind "gallery" → media |
| 3 | major | media | 13.3% | 10 | Artemis II | gallery `div.hds-gallery-preview` | B1 district with 13.3% of the page (≥ 4%) → major; B2 kind "gallery" → media |
| 4 | major | media | 7.9% | 4 | Discover | showcase `div.padding-x-0` | B1 district with 7.9% of the page (≥ 4%) → major; B2 kind "showcase" → media |
| 5 | major | action | 5.1% | 0 | Was this | section `div#pum-872473.pum` | B1 district with 5.1% of the page (≥ 4%) → major; B2 4 controls → action |
| 6 | minor | text | 0.9% | 0 | NASA | brand `a#mobile-header-logo.usa-logo` | B1 region outside the majors (0.9%) → minor; B2 0 chars, 1.0 links/100 chars, 1 images → text |
| 7 | minor | action | 1.1% | 0 | Search | form `form.hds-search` | B1 region outside the majors (1.1%) → minor; B2 kind "form" → action |
| 8 | minor | links | 4.7% | 0 |  | section `div.hds-module` | B1 region outside the majors (4.7%) → minor; B2 6.0 links per 100 chars → links |
| 9 | minor | text | 4.8% | 0 | Image Of The | section `div.grid-row` | B1 region outside the majors (4.8%) → minor; B2 361 chars, 1.1 links/100 chars, 1 images → text |
| 10 | minor | links | 2.7% | 0 | Image Of The | section `div.grid-col-12` | B1 region outside the majors (2.7%) → minor; B2 3.0 links per 100 chars → links |
| 11 | minor | text | 2.9% | 0 | NASA History | section `div.width-full` | B1 region outside the majors (2.9%) → minor; B2 251 chars, 0.4 links/100 chars, 1 images → text |
| 12 | support | links | 21.4% | 0 |  | footer `footer.usa-footer` | B1 footer → support; B2 kind "footer" → links |

Skipped regions:
- section “NASA Images”: B1 container: 57% of the page, opened into 1 child region(s)
- section “NASA Images”: B1 container: 57% of the page, opened into 5 child region(s)
- section “”: B1 4.7% but beyond the 5 largest districts → minor
- section “Image Of The Day”: B1 4.8% but beyond the 5 largest districts → minor
- form “Search”: inside major “Suggested Searches”
- section “Suggested Searches”: inside major “Suggested Searches”
- section “NASA Images”: contains the landmark or a major (a wrapper)
- section “NASA Images”: contains the landmark or a major (a wrapper)
- nav “”: B1 wrapper: ≥ 80% of its parent region, which is already a minor
- section “NASA Images”: inside the landmark
- section “Was this page helpful?”: inside major “Was this page helpful?”
- section “”: inside major “Was this page helpful?”
- form “Form”: inside major “Was this page helpful?”

## Block and building decisions (blocks in priority order: centre first)

- block 0 (1,1) **civic** ← landmark text “NASA”: stepped 20f crown modern
- block 1 (1,2) **market** ← major links “Suggested”: corner 3f flat modern, corner 3f terrace modern, corner 4f terrace modern, corner 4f terrace soft, walkup 4f flat modern, walkup 4f terrace soft, walkup 3f flat modern, walkup 3f flat modern
- block 2 (2,1) **towers** ← major media “NASA Image”: podiumTower 13f flat modern, asymmetric 4f terrace modern
- block 3 (2,2) **towers** ← major media “Artemis II”: podiumTower 13f flat soft, asymmetric 3f flat modern
- block 4 (0,1) **towers** ← major media “Discover”: podiumTower 13f flat soft, asymmetric 4f terrace modern
- block 5 (1,0) **plaza** ← major action “Was this”: kiosk 2f flat modern, kiosk 2f flat modern
- block 6 (0,2) lots ×12: apartments/terrace×2, kiosk/flat×2, corner/flat×2, walkup/flat×3, walkup/terrace×3; floors 2 3 3 3 4 3 2 3 4 4 5 3
- block 7 (2,0) lots ×12: corner/terrace×1, walkup/flat×4, apartments/terrace×2, kiosk/flat×2, walkup/terrace×3; floors 3 1 2 4 3 4 2 3 1 2 4 5
- block 8 (1,3) lots ×12: corner/terrace×3, walkup/flat×4, apartments/terrace×2, kiosk/terrace×1, apartments/flat×1, walkup/terrace×1; floors 5 2 4 1 1 3 4 3 4 2 1 2
- block 9 (3,1) lots ×8: kiosk/flat×1, corner/terrace×1, corner/flat×2, walkup/flat×2, apartments/flat×1, kiosk/terrace×1; floors 4 5 4 2 3 2 1 3
- block 10 (2,3) lots ×8: corner/flat×3, apartments/terrace×1, walkup/flat×2, kiosk/terrace×1, walkup/terrace×1; floors 3 3 2 3 1 3 3 5
- block 11 (3,2) lots ×8: apartments/flat×1, corner/flat×2, walkup/terrace×1, walkup/flat×3, kiosk/terrace×1; floors 5 3 2 1 2 2 4 4
- block 12 (0,0) lots ×12: corner/flat×2, corner/terrace×1, walkup/terrace×4, kiosk/flat×1, walkup/flat×2, apartments/flat×1, kiosk/terrace×1; floors 2 2 1 2 4 4 4 2 3 1 3 2
- block 13 (0,3) lots ×12: corner/flat×3, corner/terrace×1, walkup/terrace×4, kiosk/flat×1, walkup/flat×2, apartments/terrace×1; floors 5 5 3 4 1 2 2 3 4 4 3 1
- block 14 (3,0) lots ×12: corner/terrace×3, kiosk/terrace×1, walkup/flat×3, apartments/terrace×1, walkup/terrace×3, kiosk/flat×1; floors 3 3 3 3 2 4 1 1 4 4 4 3
- block 15 (3,3) lots ×12: corner/flat×2, walkup/flat×4, kiosk/terrace×2, walkup/terrace×4; floors 4 2 2 3 4 3 3 3 1 2 3 4

## Summary

```json
{
 "blocks": [
  "civic",
  "market",
  "towers",
  "towers",
  "towers",
  "plaza",
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
  "towers": 3,
  "plaza": 1,
  "lots": 10
 },
 "families": {
  "stepped": 1,
  "corner": 30,
  "walkup": 57,
  "podiumTower": 3,
  "asymmetric": 3,
  "kiosk": 18,
  "apartments": 13
 },
 "roofs": {
  "crown": 1,
  "flat": 67,
  "terrace": 57
 },
 "styles": {
  "modern": 93,
  "soft": 32
 },
 "grounds": {
  "lobby": 3,
  "shop": 61,
  "cafe": 34,
  "homes": 27
 },
 "signage": {
  "plaque": 28,
  "shop": 64,
  "blade": 12,
  "screen": 3,
  "billboard": 3,
  "none": 15
 },
 "buildings": 125,
 "floors": {
  "min": 1,
  "max": 20,
  "mean": 3.304
 },
 "distinctLotPrograms": 41,
 "lots": 108,
 "landmark": "stepped"
}
```
