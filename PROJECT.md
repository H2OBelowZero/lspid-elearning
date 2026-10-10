# E-Learning for LSPID (mySDLR) — Project Reference

> One-file reference for the whole project: what it is, how it is built and shipped, every page and link in the site, and the visual language / UI-UX rules it follows.
> Generated from a full read of the repository (HTML, CSS, JS, Android project, installer, config). Counts are measured, not estimated.

---

## 1. What this is

A **static, framework-free e-learning website** of supplementary digital learning resources for **LSPID learners** (learners with special-care / severe-to-profound intellectual disability — the content follows South African **CAPS / SID** curricula). The brand wordmark is **mySDLR — "my Supplementary Digital Learning Resources"**.

It is a library of teacher/learner documents (policies, annual teaching plans, lesson plans, workbooks, assessment tools, slide decks) wrapped in a friendly, highly accessible browsing interface. It is delivered three ways from the same source tree:

| Channel | What it is | Location |
|---|---|---|
| **Website** | Static site on Netlify — `https://lspid-elearning.netlify.app/` | repo root |
| **Android app** | WebView shell. Two flavors: `lite` (loads the live site) and `full` (the whole site packed inside the APK, 100% offline) | [android/](android/) |
| **Windows installer** | Zip payload + PowerShell installer that copies the site to the PC and adds shortcuts; opens in the default browser | [installer/](installer/) |

**Audience:** LSPID teachers and learners, often on low-end devices and weak connections. That drives the design: offline-first assets, no frameworks, large touch targets, a built-in reading/accessibility toolkit, and a calm, tactile look.

---

## 2. Tech stack at a glance

- **Pure static HTML + one shared CSS file + two small vanilla JS files.** No bundler, no framework, no package.json, no runtime dependencies.
- **1,235 HTML pages** = 1 home + 1 `get-app.html` + 449 section/index pages + 784 generated document-viewer pages.
- **Fonts self-hosted** (Baloo 2, Lexend) so site and offline app look identical without a connection.
- **Hosting:** Netlify (site id in [.netlify/state.json](.netlify/state.json)); [_headers](_headers) sets the APK MIME type; [.netlifyignore](.netlifyignore) keeps `installer/`, `android/`, `.agents/`, `.claude/`, dev tooling off the host.
- **Local preview:** [.devserver.js](.devserver.js) — zero-dependency Node static server, default `http://localhost:8843` (wired up in [.claude/launch.json](.claude/launch.json) as `lspid-elearning`).
- **Android:** Kotlin, single `MainActivity` hosting a `WebView`; Gradle/AGP; `minSdk 21`, `targetSdk 34`, package `com.lspid.elearning`.
- **Source documents** (the actual teaching material): ~471 PDFs, ~274 DOCX, ~191 PPTX, 7 legacy DOC, 2 XLSX, plus thousands of extracted images (`_view/media/…`).

### Git history (11 commits)
Initial commit → site + Android app → release signing / WebView blank-page fix → slow-device "false offline" fix → WebView remote debugging → shareable app link with device detection → removed `@view-transition` (froze WebViews) → WhatsApp / native share + copy-link → local QR generation → **retheme to the mySDLR logo palette + fully offline Android build** → **self-host Baloo 2 & Lexend**.

---

## 3. Repository layout

```
cyber-e-learning/
├── index.html                  Home (10 tiles + hero banner)
├── get-app.html                "Get the App" — device-aware download / QR / share page
├── PROJECT.md                  (this file)
├── README.md                   (one-line stub)
├── css/
│   ├── css.css                 THE design system (≈1,470 lines, 14 sections) — used by all 1,235 pages
│   └── reset.css               Light reset (zeroes margins, sets HTML5 sectioning elements to block)
├── assets/
│   ├── motion.js               Reveal-on-scroll, sticky-header condense, pointer spotlight, emoji drift
│   └── a11y.js                 Reading & accessibility toolkit (self-mounting floating panel)
├── fonts/                      baloo2-latin(.woff2 / -ext), lexend-latin(.woff2 / -ext)
├── img/                        logo.png (wordmark), favicon.svg, LSPID icon.(png|svg), + 2 legacy pngs
├── downloads/lspid-elearning.apk   ≈ 840 KB — the "lite" Android shell (APK files are git-ignored)
│
├── Annual Teaching Plans/      ─┐
├── DCAPS POLICY DOCUMENT FROM GRADE R-5/   │  CONTENT SECTIONS
├── ECD (LSPID)/                │  (each folder = an index.html of tiles
├── Grade 1/ Grade 2/ Grade 3/  │   → sub-folders → leaf folder with the
├── year1/ year2/ year3/ year4/ ─┘   source files + a generated _view/ folder)
│
├── android/                    Android Studio / Gradle project (see §9)
├── installer/                  Install.bat, install.ps1, READ ME FIRST.txt, payload.zip (≈1.5 GB)
│
├── .devserver.js  .netlifyignore  _headers  .gitignore
├── .claude/  .agents/  .serena/  skills-lock.json     AI-tooling config (not part of the product)
```

### Content-folder anatomy (every leaf)
```
<Section>/<…>/<Leaf folder>/
├── index.html                  Tile page listing the documents in this folder
├── <Document>.pdf | .docx | .pptx | .doc | .xlsx     Original source file
└── _view/
    ├── <Document>.pdf.html     Generated in-site viewer page for that file
    └── media/<Document>/…      Images extracted from Word/PowerPoint files
```

> **Important:** the script that generated the `_view/` pages and the `index.html` tiles is **not in the repo**. Pages are hand-maintained static output; new documents need their viewer page and tile created in the same pattern.

---

## 4. Site map

Navigation is a strict tree: **Home → Section → … → Leaf folder → Document viewer.** Every page carries a breadcrumb back up the chain. Relative links throughout (works on web, `file://`-style installs, and the Android virtual origin).

### 4.1 Home — [index.html](index.html)
Hero banner ("Welcome to E-Learning for LSPID!", eyebrow "Learning made reachable", emoji strip 🎓 🌈 🚀 📚 ⭐) with a **"📲 Get this app on your phone"** button → `get-app.html` (uses the native share sheet where available). Below: ten tiles.

| # | Tile | Link |
|---|---|---|
| 1 | 🗓️ Annual Teaching Plans | [Annual Teaching Plans/](Annual%20Teaching%20Plans/index.html) |
| 2 | ⚖️ DCAPS Policy Document From Grade R-5 | [DCAPS POLICY DOCUMENT FROM GRADE R-5/](DCAPS%20POLICY%20DOCUMENT%20FROM%20GRADE%20R-5/index.html) |
| 3 | 🧸 ECD (LSPID) | [ECD (LSPID)/](ECD%20(LSPID)/index.html) |
| 4–6 | 🎓 Grade 1 · Grade 2 · Grade 3 | `Grade 1/` · `Grade 2/` · `Grade 3/` |
| 7–10 | 🎓 Year 1 · Year 2 · Year 3 · Year 4 | `year1/` … `year4/` |

### 4.2 Get the App — [get-app.html](get-app.html)
Single page, three mutually-exclusive panels chosen by user-agent:
- **Android** → "Download for Android" button → `downloads/lspid-elearning.apk` + install-from-unknown-source guidance.
- **iOS** → explains the app is Android-only; button to open the website.
- **Desktop** → QR code (generated in-page with `qrcode-generator` from jsDelivr, falling back to the `api.qrserver.com` image API) + "Download the APK file".
- Always: **Share** row — 💬 WhatsApp (`wa.me`), 📤 native Web Share (when supported), 🔗 Copy link (clipboard, falls back to `prompt()`).

### 4.3 Section trees
Counts in `(n)` are **documents reachable beneath that node**. Total documents across the site: **784** (471 PDF · 223 Word · 90 Slides).

#### Annual Teaching Plans — 34 docs
```
Annual Teaching Plans/
├── Grade R              → English HL · Life Skills · Mathematics (Term 1-4 each, 1 PDF each)
├── Grade R LSPID Programme → 2 × "2024 Annual Teaching Plan" (PDF)
├── Grade 1              → English HL · Life Skills · Mathematics
├── Grade 2              → Language · Life Skills · Mathematics
├── Grade 3              → English HL · Life Skills · Mathematics
├── Grade 4
│   ├── Fundamentals     → Creative Art · FAL English · Life Skills · Mathematics · Natural Science · Physical Education
│   └── Electives        → Ancillary Health Care · Beauty & Nail Technology · Bricklaying & Plastering · Hospitality Studies
└── Grade 5              (same Fundamentals + Electives as Grade 4)
```
Each leaf = one ATP document (PDF, with a `.docx` source alongside).

#### DCAPS Policy Document From Grade R-5 — 22 docs
```
├── Fundamentals (8)  CAPS SID: Creative Arts · English FAL · Life Skills · Life Skills–PE · Mathematics · Mathematics Lesson Plans · Natural Sciences · Grade R-5 Eng HL
└── Electives (14)    CAPS SID: Hospitality · Ancillary Health Care · Beauty & Nail · Agricultural Studies · Art & Crafts · Bricklaying & Plastering · Consumer Studies/Needlework · Hairdressing & Beauty Care · Maintenance · Motor Mechanics · Office Administration · Plumbing · Welding · Woodworking & Timber
```

#### ECD (LSPID) — 11 docs
```
├── Index                      (LSPID index)
├── SPID Policy                (LSPID Policy, 21 Sept 2017)
├── SIP Learning Programme     (Revised PID document, 2017)
├── Daily Routines Booklet     (2024)
├── Lesson Plans / Term 1-4    (Term 1&2 lesson plan, Term 3&4 lesson plan 2024-25 …)
├── Weekly Planner             (3 weekly plans)
└── Assessment / Assessment Tools   (Record of Learner Performance)
```

#### Grade 1 — 60 docs
```
Grade 1/
├── Assessment Policy          (2)
├── Big Books Grade 1          (4 PDFs — Term 1 … Term 4)
├── Lesson Activities          → English · Life Skills · Mathematics (1 each)
├── Lesson Plan                → English · Life Skills · Mathematics → Term 1 … Term 4 → week-block plans (e.g. "Week 1-3")
├── Overview                   → English · Life Skills · Mathematics
├── Power Point Presentation   → English · Life Skills · Mathematics
└── Subject Policy             → English · Life Skills · Mathematics
```

#### Grade 2 — 249 docs (largest early-grade section)
```
Grade 2/
├── Grade 2 Year 1 Curriculum/                    ┐ identical structure;
│   ├── Annual Teaching Plan   → Language · Life Skills · Mathematics (Term 1-4)
│   ├── Assessment             → Assessment Tasks · Assessment Tools (Rubric) · Assessment Plan · Assessment Policy · Recording Tools
│   ├── Classroom Activities   → Language · Life Skills · Mathematics → Term 1 … Term 4
│   ├── D-CAPS Policy          (21 CAPS SID documents)
│   ├── Lesson Plans           → Language · Life Skills · Mathematics → Term 1 … Term 4 (weekly)
│   ├── Subject Policy         → English · Life Skills · Mathematics
│   └── "English Yrs 1"        (loose document tile)
└── Grade 2 Year 2 Curriculum/                    ┘ different content, same shape ("English Yrs 2")
```

#### Grade 3 — 112 docs
```
Grade 3/
├── Year 1/  Assessment (Policy; Tasks & Tools → Checklist · Rubric)
│            Classroom Activities → Language · Life Skills · Mathematics → Term 1-4  (Maths split by strand:
│                                   Data Handling · Measurement · Numbers/Operations/Relationships · Patterns/Functions/Algebra · Space & Shapes)
│            Lesson Plans → Language (14 "L P n") · Mathematics
│            Subject Policy → English · Life Skills · Mathematics
└── Year 2/  Assessment (Tasks & Tools · Subject Policies · Life Skills assessments)
             Classroom Activities → same as Year 1
             Lesson Plans → Language · Life Skills · Mathematics
```

#### Year 1 – Year 4 — 296 docs (the "vocational / skills" track)
Every year page has exactly two tiles — **🧩 Fundamentals** and **🛠️ Skills** — each a grid of subject tiles (16 under Fundamentals, 17 under Skills; Skills adds 🪚 Woodwork). Subject tiles are the same in every year; **content is filled in unevenly** — an empty subject shows a *"New adventures are coming soon!"* page (78 such pages, `Coming soon` tag).

Document count per subject (F = Fundamentals, S = Skills; `·` = coming-soon page, `–` = no tile):

| Subject | Y1 F | Y2 F | Y3 F | Y4 F | Y1 S | Y2 S | Y3 S | Y4 S |
|---|---|---|---|---|---|---|---|---|
| 💅 Beauty | · | · | · | · | 1 | 4 | 3 | 2 |
| ✂️ Art & Crafts | · | · | 2 | 3 | 2 | 3 | 2 | 6 |
| 🎨 Creative Arts | 4 | 4 | 4 | 3 | · | · | · | · |
| 💻 Cyber | · | · | · | · | · | · | · | · |
| 📖 English | 15 | 4 | 13 | · | · | · | · | · |
| 🍎 Food | · | · | · | · | 1 | · | · | · |
| 💇 Hairdressing | · | · | · | · | · | · | 4 | · |
| 🛠️ Maintenance | · | · | · | · | 26 | 66 | 22 | 20 |
| 🔢 Mathematics | 2 | · | 2 | 2 | · | · | · | · |
| 🔬 Natural Science | · | 10 | 4 | 5 | · | · | · | · |
| 🗂️ Office Administration | · | · | · | · | 4 | 4 | 5 | 4 |
| 📁 Physical Education | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 🧠 Personal & Social Well-being | 1 | 1 | 1 | 1 | · | · | · | · |
| 🔧 Welding | · | · | 4 | 3 | · | 7 | 5 | · |
| 🛒 Wholesale | · | · | · | · | 1 | 3 | 2 | 2 |
| 📒 Workbook | · | · | · | · | · | · | · | · |
| 🪚 Woodwork | – | – | – | – | · | · | 1 | · |

Notable deep structures:
- **Skills → Maintenance** is the richest subject: Year 1 = one term of 8 trades (Overview, Woodwork, Building & Plastering, Metalwork, Electricity, Mechanical, Plumbing, Painting/Waterproofing/Glazing, Flooring); Year 2 = full-year trade modules **plus** a "Digital Lessons Term 1-4" week-by-week set; Year 3 = four "Digital Lessons" terms; Year 4 = three term-content folders + "Y4 Term 1".
- **English (Fundamentals)** = term folders of *Formal / Informal workbooks, memos and study notes* (Y1 T1–T4, Y2 T1, Y3 T1–T3).
- **Natural Science** = per-term "Presentation" / "Digital Lessons" folders + learner & teacher guides.
- **Welding** (Skills Y2/Y3) = term PowerPoints, learner's guides, activity sheets.

---

## 5. Page templates (the only four kinds)

All pages share the same shell: skip-link → floating header (logo + breadcrumb) → `<main id="main-content">` → footer ("Made with 💛 for LSPID learners – Back to Home") → `motion.js` (sync, in `<head>`) + `a11y.js` (deferred). `lang="en"`, light/dark `theme-color` and `color-scheme: light dark`.

| Template | Used by | Main content |
|---|---|---|
| **Home** | `index.html` | `.home-banner` hero + `.ag-courses_box` tile grid |
| **Listing** | 449 `index.html` pages | `.page-hero` (icon plate · H1 · 5-colour rule · "← Back to …" pill) + `.ag-courses_box` grid of tiles. Tiles are either **containers** (folder emoji → next index) or **documents** (📄 PDF · 📝 Word · 📊 Slides, tagged `PDF`/`DOCX`/`DOC`/`PPTX`) |
| **Empty state** | 78 subject pages | `.page-hero` + `.empty-state` ("🚧✨ New adventures are coming soon! … We're busy preparing fun *X* lessons.") + 🏠 Back to Home button |
| **Document viewer** | 784 `_view/*.html` | `.doc-view` toolbar (← Back · kind badge + name · **Save a copy**) over a double-bezel stage containing: **PDF** → `<iframe>` (471) · **Word** → converted `.doc-prose` article (218; 5 legacy `.doc` show a "can't display, save a copy" notice) · **PowerPoint** → `.deck` list of `.slide` cards with title, bullets, images, tables, collapsible speaker notes (88–90) · spreadsheets → `.sheet` table |

### URL & naming conventions
- Folder names are the human labels (often ALL-CAPS, with spaces) and are URL-encoded in links (`Grade%201/…`). Viewer pages are named `<original filename>.<ext>.html`.
- Breadcrumbs mirror the folder path; the current page is the orange badge.
- Link-graph check: **all 1,235 pages are reachable from `index.html`; 0 broken internal links.**

---

## 6. Visual language

*Design intent (from the CSS header): a warm, tactile, accessible interface for a public-sector special-needs education portal. Dials: DESIGN_VARIANCE 5 · MOTION_INTENSITY 4 · VISUAL_DENSITY 4. **Accessibility constraints outrank aesthetic preference throughout.***

### 6.1 Brand & colour
The palette is sampled from the **mySDLR logo**: lowercase blue "my", then **S** pink-red, **D** green, **L** yellow, **R** orange, beside an orange circular badge holding play / music / message icons.

| Role | Token | Light | Dark |
|---|---|---|---|
| Primary (logo "my" blue) | `--color-purple`* | `#1398d6` | `#4fbdf0` |
| Primary dark (links, headings) | `--color-purple-dark` | `#0b6fa8` | `#86d3f7` |
| Primary deep | `--color-purple-deep` | `#084e78` | `#b6e5fb` |
| Logo blue | `--color-blue` | `#2aa9e0` | — |
| S pink-red | `--color-pink` / `--color-red` | `#e8365d` | — |
| D green | `--color-green` | `#7ac142` | — |
| L yellow | `--color-yellow` | `#fdb813` | — |
| R orange | `--color-orange` | `#f58220` | — |
| Badge (buttons, "you are here") | `--badge-top → --badge-bottom` | `#fbb116 → #f47b20`, ink `#3a1c00` | same |
| Ink / soft / faint | `--ink*` | `#1c2a3a / #4a5b70 / #6b7c92` | `#eef5fb / #b5c5d6 / #8497ad` |
| Paper / sunk | `--paper*` | `#fff / #f3f9fd` | `#15232f / #101b26` |
| Page gradient | `--bg-top → --bg-bottom` | `#eaf6fc → #fff4e2` | `#0c1620 → #142230` |

\* The token keeps its legacy name `--color-purple` (the site was originally violet `#7c4dff`) so every rule follows the retheme; it now means **primary blue**.

- **Signature device — the logo stripe:** `--logo-stripe`, a 5-segment gradient (blue · pink · green · yellow · orange). Used as the 4 px bar along the bottom of the header and as the 76×5 px rule under every page title.
- **Tints** (`--tint-*`) are pale washes of each brand colour for plates, chips and card corner glows (translucent in dark mode).
- **Background:** layered radial glows (blue top-left, orange top-right, blue bottom) over the vertical gradient, `background-attachment: fixed`, plus one fixed 3 %-opacity SVG noise "grain" plate.
- **Dark mode** (`prefers-color-scheme: dark`) re-grounds everything on a warm navy-charcoal, lightens the brand blues, strengthens shadows, and switches the focus ring to yellow. The logo gets a white plate in dark mode because its tagline is dark ink.

### 6.2 Typography
| Use | Family | Weights | Notes |
|---|---|---|---|
| Headings, tile titles, doc names | **Baloo 2** (rounded, friendly) | 500–800 | `text-wrap: balance`, −0.012em tracking, colour = primary dark |
| Body / UI | **Lexend** (designed for reading fluency) | 300–700 | base 16 px, line-height 1.55 |

Both are **self-hosted woff2** (latin + latin-ext subsets, `font-display: swap`). Fallbacks: Segoe UI Rounded / Comic Sans / Verdana. Fluid sizes with `clamp()` (e.g. page title `1.7rem → 2.7rem`, home H1 `1.9rem → 3.1rem`). All sizes flow through `--font-scale`, `--line-scale`, `--letter-scale` so the accessibility panel can rescale the whole site.

### 6.3 Shape, depth & the "double-bezel" motif
- **Pills & plates:** header, breadcrumb items, buttons, footer and chips are fully rounded (`999px`). Icons always sit on their own rounded-square "plate" (62 px on tiles, 92 px in page heroes) instead of floating naked.
- **Double bezel (the core component pattern):** an outer translucent *shell* (`--shell`, hairline border, `7px` padding) wraps an inner *core* surface. Used by home banner, tiles, empty state, and the document stage. **Concentric radii** are enforced: outer `30 px` → inner `23 px` (outer − shell padding). Radii scale: `30 / 23 / 18 / 12`.
- **Elevation:** three layered, low-opacity, blue-tinted shadow stacks (`--shadow-1/2/3`) plus a 1 px white `inset` top highlight — never a single hard black drop shadow.
- **Hairlines:** `rgba(14,62,100,.10/.17)` borders define edges rather than heavy outlines.
- **Colour wash on tiles:** each card has a large soft radial glow in its top-right corner; the colour rotates by position (`nth-child(6n+…)`: orange → green → pink → blue → blue → yellow) so grids feel varied without per-card styling. The glow grows on hover.

### 6.4 Iconography & imagery
- **Emoji are the icon system** — chosen per subject/folder (📖 English · 🔢 Maths · 🌱 Life Skills · 🔬 Science · 💅 Beauty · 🛠️ Maintenance · 🔧 Welding · 🛒 Wholesale · 🧸 ECD · ⚖️ Policy · 📄/📝/📊 file types …). Zero icon-font or SVG-sprite dependencies; marked `aria-hidden` (the text label carries meaning).
- Home banner emoji strip is split into individual glyphs that **drift** on staggered offsets.
- Logo is a raster wordmark (`img/logo.png`, 440×124, shown at 44 px height); `favicon.svg` / `LSPID icon.*` for the icon.
- Arrow glyphs (`←` back, `→` forward, `↓` download) live in small circular plates inside buttons and nudge on hover.

### 6.5 Motion
Principles (stated in [assets/motion.js](assets/motion.js)): **only `transform` and `opacity` animate · no scroll listeners (IntersectionObserver only) · motion is opt-in progressive enhancement · content never depends on JS to be visible.**

| Behaviour | Detail |
|---|---|
| Reveal on scroll | Banner, hero parts, tiles, empty state, footer fade/slide up 20 px (banner/icon also de-blur). Batch stagger 55 ms, capped 330 ms. A 1.4 s failsafe reveals anything on screen if the observer never fires. |
| Sticky header "island" | 1 px sentinel + observer toggles `.is-stuck` → tighter padding, deeper shadow, `scale(.985)`. |
| Pointer spotlight | On fine-pointer hover devices only: a soft blue radial highlight follows the cursor inside a tile (one delegated `pointermove`, coalesced in `rAF`). |
| Hover / press | Tiles lift 6 px, icon tilts −5° and scales; buttons lift 2 px, press to `scale(.975)`; arrow plates slide. |
| Easing tokens | `--ease-out-quint (.22,1,.36,1)` · `--ease-smooth (.32,.72,0,1)` · `--ease-spring (.34,1.4,.64,1)`. **No `linear` / `ease-in-out` anywhere.** Durations `.18s / .34s / .62s`. |
| Reduced motion | Honours the OS `prefers-reduced-motion` **and** the in-page "Reduce Motion" toggle, live. Both collapse to static and force-reveal content. |

### 6.6 Component inventory (all in [css/css.css](css/css.css))
`skip-link` · `site-header` (floating pill + logo stripe) · `breadcrumb` (link pills + orange current badge) · `page-hero` (+ icon plate, 5-colour rule, back pill) · `home-banner` (double-bezel gradient hero, eyebrow pill, drifting emojis) · `ag-courses_box/item/link` (tile grid, double bezel, wash, spotlight, tag) · `empty-state` · `btn-home` (orange badge button with arrow plate) · `share-btn` (+ WhatsApp-green primary) · `site-footer` (pill) · `doc-view` (toolbar, stage, frame, media, notice) · `doc-prose` (Word body, 82 ch measure) · `deck/slide` · `sheet` · accessibility FAB + panel.

CSS sections: 1 Tokens · 2 Motion primitives · 3 Skip link · 4 Layout · 5 Header · 6 Page hero · 7 Home banner · 8 Card grid · 9 Empty state · 10 Buttons · 11 Footer · 12 Responsive · 13 Accessibility toolkit · 14 Document viewer.

---

## 7. UI / UX behaviour

### 7.1 Navigation model
- **Drill-down tiles, not menus.** One decision per screen; large tiles with icon + short title.
- **Always-present orientation:** sticky header with logo (→ Home) and a full breadcrumb; a "← Back to *parent*" pill in every page hero; "Back to Home" in the footer.
- **Predictable file handling:** tapping a document tile keeps the learner **inside the site** (breadcrumb + Back intact). Every viewer offers **Save a copy** for the original `.pdf/.docx/.pptx`.
- **Honest empty states:** unfinished subjects say so in friendly language instead of 404ing or hiding.
- **Format hints:** tile icon + uppercase tag (`PDF`, `DOCX`, `PPTX`, `DOC`, `Coming soon`) tell users what they are opening.

### 7.2 Responsive behaviour
| Breakpoint | Change |
|---|---|
| default | Tile grid `repeat(auto-fill, minmax(232px, 1fr))`, 20 px gap, container `min(1220px, 92%)` |
| ≤ 979 px | `minmax(200px, 1fr)`, 16 px gap |
| ≤ 639 px | **Single column; tiles become horizontal rows** (icon left, title right, 52 px icon); header stacks vertically with a 26 px radius; viewer toolbar stacks and centres buttons; PDF frame `72vh` |
Viewers: PDF frame `min(1180px, 82vh)`, min 460 px; tables/slides scroll horizontally inside their own wrapper.

### 7.3 Accessibility toolkit — [assets/a11y.js](assets/a11y.js)
Self-mounting on **every** page (no HTML needed). A round orange **🧩 button (bottom-left, 60 px)** opens a dialog panel (`Esc` closes, focus returns to the button). Preferences persist in `localStorage` (`lspid-a11y-prefs-v1`) and fall back gracefully if storage is blocked.

| Control | Effect |
|---|---|
| 🅱️ Bionic Reading | Bolds the first ~half of each word (1 letter for ≤3-letter words); reversible, skips the panel itself |
| 🔤 Dyslexia-Friendly | Comic-Sans-first stack, wider letter/word spacing, 1.8 line-height, 42 ch paragraphs |
| 🔲 High Contrast | Black/white/yellow (`#ffe066`) palette, 2 px white outlines instead of shadows, grain & washes off |
| 🖱️ Big Cursor | 40 px custom SVG cursor |
| 📏 Reading Ruler | 40 px highlighted band that follows the mouse |
| 🎧 Speak Card Names on Hover | Speech synthesis reads a tile title on hover/focus |
| 🐢 Reduce Motion | Kills all animation/transition + force-reveals content |
| 🔊 Read This Page | Reads `#main-content` aloud (Play/Stop) |
| 🔠 Text Size | −2 … +4 steps (×0.1) → 80 %–140 % |
| ↕️ Line Spacing | 0 … 4 steps (×0.15) |
| ↺ Reset everything | — |

Built-in baseline: skip-link, visible `:focus-visible` ring (3 px navy / yellow in dark), semantic landmarks + `aria-current`, `aria-label`ed nav/dialog, `hidden` enforced with `!important`, `lang="en"`, native links/buttons so everything is keyboard-reachable. (Primary tiles/buttons are large; the small panel steppers are 29 px.)

### 7.4 Device & connectivity strategy
- No framework, no web-font requests, no CDN for core pages → works offline once installed.
- Viewer pages degrade gracefully (Word/PPT rendered as readable HTML so reading tools work; "Save a copy" for fidelity).
- `get-app.html` is the single place that reaches out (QR library CDN, WhatsApp link).

---

## 8. JavaScript behaviour summary
| File | Loaded | Responsibility |
|---|---|---|
| [assets/motion.js](assets/motion.js) | sync in `<head>` (so `.js-motion` lands before first paint) | Reveal observer, header-stuck sentinel, spotlight, emoji split/drift, live reaction to reduce-motion toggle / OS change |
| [assets/a11y.js](assets/a11y.js) | `defer` | Skip-link injection, toolbar UI, all reading tools, preference persistence |
| inline in `index.html` | — | Upgrades "Get this app" button to `navigator.share` when available |
| inline in `get-app.html` | — | OS detection, panel switch, QR generation, share/copy handlers |

---

## 9. Android app — [android/](android/)

- **Package** `com.lspid.elearning`, Kotlin, AppCompat `DayNight.NoActionBar` (the site draws its own header). Colours: brand `#1398D6`, dark `#0C1620`.
- **Flavors**

| | `lite` | `full` |
|---|---|---|
| App name | E-Learning for LSPID | **mySDLR** |
| `applicationId` | `com.lspid.elearning` | `com.lspid.elearning.full` |
| Content | Loads `APP_BASE_URL` (release: `https://lspid-elearning.netlify.app/`; debug: `http://localhost:8843/`) | Whole site copied into `assets/site/` by the `syncSiteAssets` Gradle task and served from the virtual origin `https://appassets.androidplatform.net/` — **fully offline** |
- **How `MainActivity` behaves**
  - One `WebView`, JS + DOM storage on, Safe Browsing off (cheaper on weak devices), progress spinner during loads.
  - **Offline bundle:** `shouldInterceptRequest` streams `assets/site/<path>` (folders → `index.html`) with correct MIME types; a real https origin keeps relative links, `fetch()` and storage working.
  - **Documents:** WebView can't show PDF/Office files, so on viewer pages an injected script swaps the PDF iframe for an **"Open document"** button; PDF/DOC/DOCX/PPT/PPTX/XLS/XLSX links are copied to cache and opened in the phone's own viewer via `FileProvider` (friendly toast if no app can open it).
  - `target="_blank"` links are handed to the system browser via a throwaway WebView (avoids OEM blank-page bug).
  - Only genuine main-frame errors show `offline.html` ("📡 No connection"); superseded/aborted loads (`ERROR_UNKNOWN`) are ignored — this fixed a "frozen / false offline" bug on slow phones.
  - Hardware Back = WebView history, then exit. In the offline build the "Get this app" button is hidden.
- **Build:** release is minified/shrunk and signed only when `keystore.properties` exists (git-ignored). Bundle assets stored uncompressed for fast installs. Debug builds enable WebView remote debugging; `adb reverse tcp:8843 tcp:8843` reaches the dev server from a USB device.

---

## 10. Windows installer — [installer/](installer/)
- [Install.bat](installer/Install.bat) → runs [install.ps1](installer/install.ps1) (WinForms folder picker) → extracts `payload.zip` (≈1.5 GB of site content) to `…\E-Learning for LSPID`, creates **Desktop + Start Menu shortcuts**; re-running offers an in-place update.
- Guards Windows' 260-char path limit (longest content path = 174 chars → install folder must stay short).
- Opens in the user's default browser; no server needed; follows OS light/dark.
- [READ ME FIRST.txt](installer/READ%20ME%20FIRST.txt) documents the viewer behaviour for end users. *(Its note that "an internet connection makes fonts look nicer" is now out of date — fonts are self-hosted.)*

---

## 11. Dev workflow
```bash
node .devserver.js          # http://localhost:8843  (PORT env var overrides)
```
No build step for the site. Deploy = publish the repo root to Netlify (ignore list above). Android: open `android/` in Android Studio or run `gradlew assembleLiteRelease` / `assembleFullRelease`; copy the lite APK to `downloads/lspid-elearning.apk` for the Get-the-App page.

---

## 12. Observations & housekeeping (things worth knowing)

1. **21 orphaned legacy stylesheets.** Every section folder contains its own `css/css.css` + `reset.css` (the old violet `#7c4dff` theme). **No page references them** — all 1,235 pages use the root `css/css.css`. Safe to delete.
2. **Generator not in repo.** `_view/` pages and tile indexes were produced by a script that isn't checked in; headers/footers are duplicated in every file, so a global header tweak means a bulk find-and-replace.
3. **78 "Coming soon" pages.** Biggest gaps: **Cyber** and **Workbook** (empty in all 4 years), Fundamentals Beauty/Food/Hairdressing/Maintenance/Office Admin/Wholesale, and Skills Creative Arts/English/Maths/Natural Science/PSW.
4. **Possible mis-filed content** (titles don't match their folder): Year 3 & 4 *Fundamentals → Welding* and *Art & Crafts* contain "NS Year N Teachers Guide" files; Grade 2 Year 1 *Life Skills Term 1* has a doc titled "…Grade 2 **Year 2**"; Grade 2 *D-CAPS Policy* lists "Beauty and Nail Technology" twice. Year 1 Fundamentals → English has 4 term folders but Year 2 only Term 1.
5. **Folder-name typos baked into URLs:** `Fundamaentals`, `MATHAMETHICS`/`MATHAMETICS`, `ANCILLARY HEALTHY CARE`, `ASSESMENT TASKS`, `CREATIVR ARTS`, `Tearm`. Renaming needs matching link updates (and re-bundling the Android assets).
6. **Junk tracked in git:** `debug.log` in *Annual Teaching Plans/* and *DCAPS…/*, Office lock files (`~$….xlsx`) in *ECD (LSPID)/ASSESSMENT/ASSESSMENT TOOLS/*, `.DS_Store`, `.claude/scheduled_tasks.lock`.
7. **Stale/unused CSS & assets:** `.site-logo__icon` / `.site-logo__text` (pre-logo-image header), `img/TECHNOLOGY.png`, `img/special content.png`, `img/LSPID icon.*` aren't used by the pages.
8. **`PROJECT.md` ships.** It isn't in `.netlifyignore` or the Android sync exclude list, so it is published to Netlify and bundled into the `full` APK (tiny, but add it to both lists if you'd rather not).
9. **`get-app.html` isn't fully offline:** the QR library comes from jsDelivr (with a remote-API fallback). Irrelevant inside the app, where the page is hidden/unused.
