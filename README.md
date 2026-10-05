<h1 align="center">
  <br>
  <img src="public/logo.svg" alt="Skyline" width="40">
  <br>
  Skyline
  <br>
</h1>

<h4 align="center">Every website has a skyline. Paste any public URL and walk through its real structure, rebuilt as an isometric pixel-art city.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/React_Three_Fiber-20232A?style=for-the-badge&logo=react&logoColor=white" alt="React Three Fiber" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-from-page-to-city">Page → City</a> •
  <a href="#-safe-capture">Safe Capture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#ℹ%EF%B8%8F-how-to-run-the-application">How To Run</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  Not a screenshot dressed up as a city — the page's own structure, measured and rebuilt. Every part of the page becomes a district: its land is proportional to how much of the page it takes up, and the kind of content decides how the district is built.
</p>

<br/>

## 🌆 Every page becomes a city

<p align="center">
  <img src="docs/screenshots/readme/home.jpg" alt="Skyline's home: an empty plot at night inside a lit pixel-art city, waiting for an address" width="800" />
</p>

- **A list becomes a row of shopfronts, an index becomes low stacks, a media showcase becomes a tower of screens, and the hero becomes the landmark.** The reading order of the page is the order the land is laid out, from the centre outwards.
- **Nothing is decided by hostname.** Regions are inferred from tag, position, size, content and class names, so two pages with the same shape get the same kind of city, whoever made them.
- **Nothing is invented.** Every building can be traced back to the part of the page it came from, and the app shows you which one.

<br/>

## ✨ Features

|                              |                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🏗️ Live Construction**     | The page appears in a panel while the city rises; each part of the page lights up as its district is built and the numbers grow with it. **Skip** (or Esc, Space, Enter) jumps to the end.        |
| **🗺️ One Zoomable City**     | Drag to move, scroll from the whole district down to street level, Q/E or Shift+drag to rotate. There is no separate explore mode: the city you watched being built is the one you walk around.    |
| **🏢 From the Page**         | Click any building for a compact card with the part of the page it came from — a cropped excerpt of the real page, not a description of it.                                                        |
| **❓ Why This City?**        | A drawer with the site, four metrics, and the page's largest parts with what each one became. Point at a part (in the drawer or in the city) and a line ties the two together.                     |
| **🌤️ Page-Driven Atmosphere** | Light, haze and environment are derived from signals in the page itself, so a dense news site and a quiet portfolio don't share the same evening.                                                  |
| **🪧 Doto Signs**            | Shop signs and billboards are lettered in Doto, the same bitmap face as the home screen.                                                                                                          |
| **📮 Postcard**              | Save the current view as an image. **H** hides the interface for a clean shot.                                                                                                                     |
| **🔗 Deep Links**            | `/pixel?url=…` builds a site directly, and `?at=references` (or any other part name) opens the city already focused on that district.                                                             |
| **⚠️ Clear Feedback**        | Typed addresses are checked before anything is fetched; an invalid one gets a bold title, one hint line and a highlighted field, cleared as soon as you edit. Blocked sites say why they're blocked. |
| **📱 Narrow Screens**        | A small-screen layout: icon-only controls that never wrap, and a home and drawer sized for phones.                                                                                                                     |

<br/>

## 🖼️ Screenshots

<table>
  <tr>
    <td align="center" width="50%"><strong>Construction</strong></td>
    <td align="center" width="50%"><strong>The city</strong></td>
  </tr>
  <tr>
    <td valign="top"><img src="docs/screenshots/readme/build.jpg" alt="Construction: the page in a side panel, its parts lighting up as the city rises" /></td>
    <td valign="top"><img src="docs/screenshots/readme/city.jpg" alt="The finished pixel-art city of a real website" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><strong>Why this city?</strong></td>
  </tr>
  <tr>
    <td colspan="2" valign="top"><img src="docs/screenshots/readme/why.jpg" alt="The Why this city drawer: the page's largest parts, how much land each got and what each became" /></td>
  </tr>
</table>

<br/>

## 🧰 Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/React_Three_Fiber-20232A?style=for-the-badge&logo=react&logoColor=white" alt="React Three Fiber" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
</p>

| Category           | Technologies                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| **Framework**      | Next.js 16 (App Router), React 19                                      |
| **Language**       | TypeScript 5                                                           |
| **Rendering**      | Three.js, React Three Fiber, drei, postprocessing                      |
| **State**          | Zustand                                                                |
| **Styling**        | Tailwind CSS v4, Doto · Instrument Serif · Instrument Sans · Geist    |
| **Capture**        | parse5 (static HTML parsing), ipaddr.js (socket-level SSRF guard)      |
| **Testing**        | `tsx` check scripts over a corpus of real pages, Puppeteer captures    |
| **Tooling**        | ESLint                                                                 |

<br/>

## 📝 Project Description

Skyline reads the real structure of a public web page and rebuilds it as an isometric pixel-art city. It isn't a visual filter over a screenshot: the server captures the page, reduces it to structure and metrics, and the client turns that structure into territory, buildings, streets and street life.

Each part of the page — hero, navigation, feed, index, references, footer — becomes a district. How much land it gets follows how much of the page it occupies; what kind of district it becomes follows what kind of content it holds. The result is that a news front page, a documentation site and a product landing page produce recognisably different cities, and you can always ask the city why.

**Additional features:**

- **The home is a city too:** the landing screen is the one empty plot of a kit city at night — _"Give this plot an address."_ — with Apple, Hacker News, Linear and The Guardian as one-click examples.
- **Page map:** the page redrawn from what the pipeline already knows — reading order, headings, links, real images, colours and type — without inventing content. It is the page you watch light up during construction, and the source of the cropped excerpt on every building card.
- **Real images through a signed proxy:** images from the page are served through an HMAC-signed asset route, so the proxy can't be used as an open relay.
- **Short-lived cache and rate limiting:** a page captured in the last 5 minutes is answered from cache, and captures are rate-limited per client.

<br/>

## 🧱 From page to city

The pipeline is split between a server that captures and a client that builds:

```
URL ─▶ /api/capture ─▶ static capture ─▶ DomSnapshot ─▶ normalize() ─▶ NormalizedDocument
                                                                              │ (client)
   analyzeSemantics ─▶ computeFingerprint ─▶ planFromPage ─▶ generateKitDistrict ─▶ PixelScene
   (regions)           (visual identity)     (territories)   (kit city)              (three.js)
```

- **Semantics** — page regions (hero, navigation, feed, index, references, footer…) are inferred from tag, position, size, content and class names, never from the hostname.
- **Allocation** — territories fill 256 lots in reading order, from the centre outwards, with land proportional to each one's weight.
- **City** — composition, massing, program, façades, streets, street life and atmosphere all come from the kit ([`src/lib/pixelcity/kit`](src/lib/pixelcity/kit)). The foundation and art-direction layers are frozen and checked by tests.
- **Page map** — the page redrawn from the same data the city was built from, so the two always agree.

<br/>

## 🔒 Safe capture

Fetching arbitrary URLs on a server is the riskiest thing this app does, so the capture is built defensively:

- **The client never receives HTML** — only structure and metrics.
- **SSRF is closed at the socket level** — DNS is resolved and validated, the connection goes to the validated IP, and every redirect is validated again ([`net-guard.ts`](src/lib/acquisition/net-guard.ts), [`safe-fetch.ts`](src/lib/acquisition/safe-fetch.ts)).
- **Signed image proxy** — real images are served only for URLs the server signed itself ([`signing.ts`](src/lib/acquisition/signing.ts)).
- **No evasion** — sites behind a bot challenge (Cloudflare and the like) or a login are refused with an explanation. Skyline doesn't try to get around them.

<br/>

## 🛠️ Engineering challenges

The hardest part was making the city **mean something** without cheating. A city that looks good is easy to fake with a hostname lookup; a city that reflects the page needed a semantic layer that works from structure alone, an allocation that keeps land honest to each part's weight, and a building kit expressive enough that a list, an index and a media wall read as different places from the street. Every stage is checked by its own script against a corpus of real, frozen page snapshots ([`docs/real-pages/snapshots`](docs/real-pages/snapshots)), from news and documentation to shops and the old web.

The second one was **changing the look without breaking the meaning.** Once the semantic and architectural base was right, it was frozen as a versioned kit, and so was the art direction built on top of it. The freeze checks regenerate those layers and compare them byte by byte with the recorded kits, so visual polish can move freely while the cities underneath stay exactly the same — and any older kit version can still be rendered side by side at `/pixel/kit?v=<n>`.

<br/>

## ℹ️ How to run the application?

> Clone the repository:

```bash
git clone https://github.com/maricastroc/skyline
```

> Install the dependencies:

```bash
npm install
```

> Start the service:

```bash
npm run dev
```

> ⏩ Access [http://localhost:3000](http://localhost:3000) (it redirects to `/pixel`), paste a URL and press **Build**.
> Direct link: `http://localhost:3000/pixel?url=https://news.ycombinator.com`.

> Run the frozen-layer checks (byte-for-byte against the recorded kits):

```bash
npm run test:foundation && npm run test:art-direction && npm run test:polish
```

> Run one pipeline stage over the real-page corpus (also `test:hygiene`, `test:surface`, `test:openings`, `test:composition`, `test:program`, `test:streets`, `test:life`, `test:atmosphere`):

```bash
npm run test:allocation
```

> Run capture → normalization in the terminal and print a summary:

```bash
npm run probe -- https://news.ycombinator.com
```

### 🧭 Routes

| Route                         | What it is                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `/pixel`                      | The product                                                                                        |
| `/pixel/kit?page=<id>&v=<n>`  | The city of a frozen snapshot (`docs/real-pages/snapshots`), in any frozen kit version             |
| `/pixel/compare`              | Several cities under the same camera                                                               |
| `/maquette`                   | The 3D maquette from the first version                                                             |

### 📚 Documentation

| Document                                                                |                                         |
| ----------------------------------------------------------------------- | --------------------------------------- |
| [PIXEL_FOUNDATION_V1.md](docs/PIXEL_FOUNDATION_V1.md)                   | Semantic and architectural base (frozen) |
| [PIXEL_ART_DIRECTION_V1.md](docs/PIXEL_ART_DIRECTION_V1.md)             | Streets, street life and atmosphere (frozen) |
| [PIXEL_VISUAL_POLISH_V1.md](docs/PIXEL_VISUAL_POLISH_V1.md)             | Haze and assets                         |
| [PIXEL_PRODUCT_COMMUNICATION.md](docs/PIXEL_PRODUCT_COMMUNICATION.md)   | Page → city in the interface            |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)                                 | Capture, security and the original maquette |

### ⚠️ Known limits

- **SPAs:** the static capture only sees the HTML the server sends; `captureRenderedPage` is ready for a browser worker (`SKYLINE_RENDERER_URL`).
- **Blocked sites:** pages behind a bot challenge or a login are refused with an explanation.
- **In-memory state:** rate limiting, cache and the signing secret live per process. With more than one instance, set `SKYLINE_ASSET_SECRET` and use a shared store.

<br/>

## 📄 License

Released under the MIT License. You're free to use, study, fork and build on this code — **as long as the original copyright and license notice are kept**. Reuse it and learn from it; don't strip the attribution and present it as your own.

© 2026 [**Mariana Castro**](https://marianacastro.dev)

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
