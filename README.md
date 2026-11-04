# Jeddah Central — Interactive Demo

Bilingual (EN/AR) pitch demo for Jeddah Central Development Company: a marketing mini-site plus a
cinematic 3D Experience of the masterplan. React 19, Vite, TypeScript (strict), Three.js, GSAP,
Lenis and plain CSS.

> **R3 is technically complete and awaiting the user's visual review.** The simple Destination
> projector and all thirteen remaining marketing routes are implemented and verified in React.
> This is not user visual approval. Home remains approved at `3ffa2ee`. After Destination
> baseline `69486cd`, the user clarified the map interaction: select a district, lift that map
> piece and project its image/content card. This supersedes both the flat diagram and the
> abandoned orbitable-city prototype. The user then authorised the remaining pages with
> “when you're done do the other pages as well.” Landmarks, Invest, News and Legal are now
> complete as React routes. The canonical [projector review](docs/R3_PROJECTOR_REVIEW.md) and
> [remaining-pages review](docs/R3_PAGES_REVIEW.md) record current checks, measurements and screenshots.
> Earlier reports describe their committed baselines, not final verification of these changes.
> The latest [handoff](docs/CLAUDE_HANDOFF.md) and [rebuild plan](docs/CINEMATIC_REBUILD_PLAN.md)
> record the exact stopping point. The local R3 completion commit follows baseline
> `69486cd`; read `git log -3` for its hash. Never push. For a full teammate handoff, use
> [CLAUDE_CONTINUE_PROMPT.md](docs/CLAUDE_CONTINUE_PROMPT.md). Next is user visual review, then
> R4 hardening and Guided Tour. Preserve Home and the separate original 3D Experience.

## Setup

Requires Node 24.

```bash
npm install
npm run dev            # local dev server
```

| Script                  | What it does                                                               |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                                                 |
| `npm run build`         | Review build → `dist/` (placeholder markers **visible**, `?debug` allowed) |
| `npm run build:pitch`   | Pitch build → `dist-pitch/` (markers **hidden**, `?debug` ignored)         |
| `npm run preview`       | Serve `dist/` locally                                                      |
| `npm run preview:pitch` | Serve `dist-pitch/` locally                                                |
| `npm run lint`          | ESLint (type-aware)                                                        |
| `npm run format`        | Prettier                                                                   |
| `npm run images`        | Rebuild the self-hosted official AVIF/WebP library and typed size table    |

Both builds are fully self-contained and run offline. Routing uses the URL hash (`#/experience`),
so any static server works with no rewrite rules. Opening `index.html` straight from disk
(`file://`) is not supported: browsers block ES modules there. Use the pitch launcher below,
`npm run preview:pitch`, or any static server.

## Pitch day

One-time preparation on the pitch machine: install [Node.js](https://nodejs.org) (LTS), copy this
folder over, then run `npm install` and `npm run build:pitch` once.

**Display:** the pitch targets 60 fps at 1080p on an Apple M1. Historical 3D measurements below
do not establish performance of R2 Home; use its current review report. When the Mac is connected
to the TV, set System Settings › Displays › (the TV) › Resolution to **1920 × 1080**. The launcher
also forces Chrome to render at 1× pixel density, so even a HiDPI "looks like 1080p" mode renders
at 1080p (pass `--hidpi` to opt out on a stronger machine). TVs upscale 1080p cleanly; smooth
motion matters more on a big screen than resolution. Adaptive quality stays on as a safety net.

On the day, **double-click**:

- macOS: `start-pitch.command` (the first time, right-click › Open to get past Gatekeeper)
- Windows: `start-pitch.bat`

It serves `dist-pitch/` on `localhost` (no internet needed) and opens Chrome, or Edge if Chrome
is missing, full-screen in kiosk mode at the 3D Experience. A separate browser profile is used,
so personal tabs, extensions and translation prompts never appear. Exit with **Cmd+Q** (Mac) or
**Alt+F4** (Windows); the local server stops with it.

For rehearsals or other entry points, run the script directly:

```bash
node scripts/pitch.mjs              # kiosk, 3D Experience
node scripts/pitch.mjs --tour       # kiosk, autostart the Guided Tour (Phase 6)
node scripts/pitch.mjs --no-kiosk   # normal window
node scripts/pitch.mjs --no-browser # serve only (open the printed address yourself)
node scripts/pitch.mjs --hidpi      # full pixel density (stronger machines only)
```

## URL flags

Flags work in the query string or after the hash: `?debug#/experience` or `#/experience?debug`.

| Flag                         | Effect                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `?lang=en` / `?lang=ar`      | Force the language for this visit (not persisted)         |
| `?debug`                     | FPS panel, tier/view buttons (ignored in the pitch build) |
| `?quality=high\|medium\|low` | Lock the 3D quality tier (disables adaptive quality)      |
| `?tour=1`                    | Autostart the Guided Tour (Phase 6)                       |

## App architecture (React)

The marketing app is fully migrated to React 19 under the cinematic rebuild
(`docs/CINEMATIC_REBUILD_PLAN.md`).

- `src/main.tsx`, `src/app/App.tsx`: HashRouter, shell (header, footer, skip link, AR draft badge)
  and document titles.
- `src/app/RouteView.tsx`: resolves the hash against `src/router/routes.ts` (same validation and
  titles as before) and crossfades between pages.
  - A newer navigation cancels a pending one.
  - A page change resets scroll before the new page mounts, so legacy ScrollTriggers initialise
    at the arriving page's coordinates; in-place query updates preserve the viewport.
  - A route with `view` is a React page.
  - A route with `load` is a retained imperative page hosted by `LegacyPage`
    (mount, `update` for in-place deep links, unmount).
  - The original 3D Experience and 404 use this adapter.
  - Home, Destination, Landmarks, Invest, News and Legal now use React `view` routes.
    The retained original 3D Experience and 404 still use the legacy adapter. Unreferenced
    imperative marketing modules and the former flat DistrictAtlas files have been removed.
- `src/app/SmoothScroll.tsx`: Lenis smooth scroll on GSAP's ticker, synced with ScrollTrigger.
  It's off under reduced motion and on the immersive 3D route.
- `src/app/i18n.tsx`: `useI18n()` re-renders on language change; typed `t()` and declarative
  DOM bindings remain available to legacy pages.
  - `onBeforeLangChange()` captures scroll/layout before the document's language, direction and
    font change. Destination, LandmarkPageShell and EditorialPage restore scroll after layout
    settles and unsubscribe on cleanup. Their split-text hero copy remounts when the language
    or route content changes. New story/legal routes reset scroll and focus by content identity;
    language-only updates do not trigger a page reset.

### Motion system (`src/motion/`)

- `choreography.ts`: the one motion language. Every animated element is tagged
  `data-motion="heading | lines | rise | fade | image | counter"`. Headings rise letter by letter (EN) or
  word by word (AR) from line masks. Every element gets an intro and an outro.
- `SceneStack.tsx` / `<Scene>`: a pinned film strip of full-screen official renders, driven by
  one scrubbed timeline.
  - Each scene pushes in slowly, and its copy enters, holds and leaves.
  - Scenes arrive via `dissolve` (horizon-line opening), `zoom` (fly into the previous render's
    `focus` point) or `wipe` (gold scan line, in reading direction).
  - Scenes that aren't active are `inert`.
  - Narrow screens and reduced motion stack every scene in normal flow with all copy retained.
- `Reveal.tsx`: the same intro/outro language for normal-flow sections.
- `#/lab`: a hidden route proving the primitives (absent from pitch builds).

R2 includes Previous/Next scene controls in the keyboard tab order and a spoken scene status.
Active/inert state follows the rendered timeline, including scrub smoothing. Keyboard focus on
a district card positions the filmstrip to reveal that card. Live reduced-motion changes clear
the pin, manual reveal transforms and inactive `inert` states. Verification and limitations
belong in the R2 review, not the historical Home scroll report.

Cinema header styling ends when the pinned stage leaves the viewport. Mobile uses a solid
header, and normal-flow mobile/reduced-motion scenes use stronger image shading for readable copy.

## Project structure

```
src/
  main.tsx             bootstrap: fonts, styles, i18n, React app
  app/                 React shell, routing adapter, Lenis, i18n hooks, Copy, OfficialPicture
  config.ts            build switches (.env / .env.pitch) and URL flags
  router/              hash router, route table, Page interface
  i18n/                en.json, ar.json, i18n.ts (t(), setLang(), DOM binding)
  components/          retained imperative UI components used by the legacy pages
  pages/home/          React cinematic Home and session opening (R2)
  pages/destination/   React Destination and lift-and-project district map
  pages/landmarks/     React collection, shared hero/shell and data-driven landmark stories
  pages/invest/        React sectors, recognition and front-end-only interest form
  pages/news/          React news index and data-driven local story pages
  pages/legal/         React placeholder policy pages
  pages/editorial/     shared React editorial shell, hero and actions
  pages/experience/    immersive map and stadium UI
  data/                content structure: ids, i18n keys, links, map layout (no copy lives here)
    landmarks.ts       positions, footprints, camera shots, fact keys
    districts.ts       outlines, label positions, highlight colours
    destination.ts     official district/attraction image IDs and approved fact selection
    projectorMap.ts    matched official map imagery, boundary paths and projection anchors
    attractions.ts     positions (only the three named in the brief)
  styles/              tokens.css, base.css, layout.css, components/*.css
  assets/patterns/     original roshan-inspired lattice tile
  motion/              SceneStack, Reveal, shared intro/hold/outro choreography
  experience/          the 3D Experience (lazy-loaded on its immersive route)
    Experience.ts      renderer, scene, camera, frame loop, resize, dispose
    config/scene.ts    ART DIRECTION: sun, sky, light, haze, sea, post, coast (all look values)
    config/views.ts    camera limits, spawn map and reference views
    config/masterplan.ts  land shape (waterfront, peninsula, marina) and building massing
    core/              Renderer, Composer (post chain), Quality (tiers + adaptive), Debug
    world/             Environment (sky/sun/IBL), Atmosphere (haze), Sea, PlanarReflection,
                       Terrain (natural coast), ContextCity, Facade, ShoreField
      masterplan/      MasterplanShape (land SDF), ground, district buildings, landscape,
                       breakwaters, pier + cruise terminal, district highlighting
      landmarks/       LandmarkModel (contract + GLB adapter), Stadium, OperaHouse,
                       Oceanarium, Museum, registry (Landmarks.ts)
    interaction/       Controls, CameraDirector (flights), Markers (HTML), MapInteraction
    shaders/           GLSL: sea, atmosphere, facade, district, lattice
  pages/experience/ui/ SidePanel (overview, detail, lists)
public/brand/          official light SVG and blue/gold PNG; original placeholders retained
public/images/jcdc/   optimised, self-hosted official concept renders
public/images/jcdc-map/  local official background/masterplan images for the projector
assets/official-images.json  source URLs and provenance for the image pipeline
assets/destination-map.json  official map image/boundary provenance and source ID mapping
scripts/images.mjs    responsive AVIF/WebP generation and src/data/officialImages.ts output
scripts/pitch.mjs      zero-dependency pitch launcher (see Pitch day)
```

## 3D quality and performance

Three tiers (`src/experience/core/Quality.ts`):

| Tier   | Render cap         | Shadows | MSAA | Bloom      | Water reflections |
| ------ | ------------------ | ------- | ---- | ---------- | ----------------- |
| High   | 2560×1440 (≤2×DPR) | 4096    | 4×   | ½-res blur | yes               |
| Medium | 1920×1080          | 2048    | 2×   | ⅓-res blur | no                |
| Low    | 1280×720           | off     | off  | off        | no                |

The starting tier comes from the GPU name (software renderers → Low, integrated Intel → Medium,
everything else → High). While running, if frames average slower than ~50 fps, render resolution
drops in steps (×0.85, ×0.7), then the tier drops. It never climbs back a tier on its own, because
visible oscillation would be worse than a slightly softer image. `?quality=` or the debug panel
locks a tier.

Output is always the full display resolution; a 4K TV gets a 1440p render upscaled. Measured on
the pitch M1 at 1080p, the earlier 3D phase recorded 60 fps on the spawn map and during camera
flights. These are historical Experience results, not new R2 Home measurements.

Budget notes:

- Sun shadows are fitted once around the masterplan in light space and never re-render during
  camera moves (the sun and the world are static).
- Experience UI uses opaque glass, not `backdrop-filter`: blurring over a canvas that redraws
  every frame cost ~4 fps.
- Reflections render only the waterfront layer (`config/layers.ts`) at half resolution.

## 3D art direction

Every look value lives in `src/experience/config/scene.ts` (sun bearing and elevation, sky
model and grading, light colours, haze density, sea colours and glitter, bloom, vignette). Change
values there and reload; no other file needs touching. Reference views for checking the look are
in `config/views.ts` and selectable from the `?debug` panel.

## Editing content

All visible text lives in `src/i18n/en.json` and `src/i18n/ar.json`. Keys are type-checked
against `en.json`, and a key missing from `ar.json` fails the build.

React pages use `useI18n()` and `<Copy k="…" />`. `Copy` separates review markers from display
copy without changing their translation keys. Legacy pages retain declarative DOM bindings,
which update live on language switch:

```html
<h1 data-i18n="pages.home.heading"></h1>
<button data-i18n-attr="aria-label:a11y.openMenu;title:a11y.openMenu"></button>
```

### Placeholder markers

Copy that is unconfirmed carries an inline marker: `[TBC: …]`, `[DRAFT …]` or `[AR DRAFT …]`.
Markers stay visible in `npm run build` so reviewers can see them, and are stripped automatically
in `npm run build:pitch`. To confirm a piece of copy, edit the string and delete its marker.

Facts flagged in code rather than on screen:

- Area: 5.7 million m² (some official pages say 5.6). `[TBC: confirm with JCDC]`
- Stadium capacity: not displayed until confirmed.

### Map content

- **Landmarks, districts, attractions:** `src/data/*.ts` hold positions (world metres; the
  waterfront runs along x ≈ −60, the sea is west), district outlines and colours, and camera
  framing. Names and descriptions are i18n keys. District descriptions and attraction copy are
  marked `[DRAFT — client to approve]`.
- **Land shape and massing:** `src/experience/config/masterplan.ts` (peninsula, marina basin,
  breakwaters, beach extent, parks, plazas, per-district building profiles). The layout is
  stylised and plausible, not surveyed. Building massing is illustrative only.

### Replacing a procedural landmark with a GLB model

1. Put the file in `public/models/`, e.g. `public/models/opera-house.glb`. Model origin at
   ground level in the centre of the site, metres as units, facing as on the site.
2. In `src/experience/world/landmarks/Landmarks.ts`, change one line:

   ```ts
   'opera-house': gltfLandmark('opera-house', 'models/opera-house.glb', { height: 60 }),
   ```

   and import `gltfLandmark` from `./LandmarkModel`. The GLTF loader is fetched only when a GLB
   is used. Materials get the shared haze automatically, and the picking proxy resizes to the
   model.

### Stadium interior (Phase 5)

The exterior lives at `#/experience/stadium`. Its **Enter the stadium** button follows the
east-side passage into the bowl. **Back to map** or Escape returns through the passage; requests
made during a flight replace the current request. Cold interior links skip the flight:

- `#/experience/stadium/inside` — arrival view
- `#/experience/stadium/pitch`
- `#/experience/stadium/seating`
- `#/experience/stadium/roof`
- `#/experience/stadium/vip`
- `#/experience/stadium/concourse`
- `#/experience/stadium/sports-park`

Hotspot metadata (translation keys, anchors and viewpoints) is in `src/data/stadium.ts`. Draft
copy is in `stadium.*` in both language files. Dimensions, tier profiles, entry waypoints and
the camera's clearance calculation share `src/experience/config/stadium.ts`. If an official
stadium GLB replaces the original model, align these waypoints and profiles with its actual
openings before using the interior routes.

`CameraDirector.flyAlong()` follows position and look-at curves. `StadiumNavigation` owns
entry/exit state, reversal, interior controls, lens framing and shadow fits. The wider interior
lens and panel offset follow RTL without mirroring the scene. Enclosed views omit occluded city
and water passes; a distant bowl proxy keeps the map inexpensive. Interior depth shaders are
warmed behind the loading screen. The map and stadium shadow fits keep separate static targets,
baked while loading and reused on entry/exit. Changing shadow resolution invalidates both targets.

See [the Phase 5 review](docs/PHASE_5_REVIEW.md) for measurements, checks, open items and every review screenshot path.

## Marketing pages (Phase 2 and the cinematic rebuild)

The marketing pages combine panoramic official JCDC imagery, oversized typography and spacious
editorial rhythm. Masar supplies a layout/motion reference; implementation is original and uses
Jeddah Central’s blue/gold identity.
The user authorised official JCDC imagery and content for this phase. No Masar assets or code
were copied. The later approved rebuild moves the app to React and Lenis, removes the decorative
sculptures, and presents official JCDC architectural renders throughout Home. These are concepts
of the proposed architecture, not photographs of completed buildings. The original interactive
3D destination remains available on its own route through the `LegacyPage` adapter.

- `#/` — React cinematic Home: 14 scenes covering the destination, landmark exteriors and
  interiors, district links, sustainability, a 3D Experience CTA, recognition and investment;
  News follows in normal flow. The user approved R2 on 4 November 2026, commit `3ffa2ee`.
- `#/destination` — official `central-plaza` hero, district lift-and-project map, three
  attraction stories, layered sustainability and closing CTAs. `#/destination?district=marina`
  preselects a district. The current projector refinement uses matched official concept-map
  imagery and boundary data; technical checks pass and user visual review is pending.
- `#/landmarks` and `#/landmarks/{stadium,opera-house,oceanarium,museum}` — React collection
  and data-driven architectural stories, official image pairs, supplied facts and related links.
  The stadium CTA opens `#/experience/stadium/inside` directly; capacity remains absent.
- `#/invest` — sector selection, destination rationale, recognition and the demonstration form.
- `#/news` and `#/news/{pif,forum,stadium}` — locally readable summaries with optional source links.
- `#/legal/{privacy,terms,cookies}` — placeholder legal text requiring client approval.

Edit marketing text in `marketing.*` in both dictionaries. `src/data/marketing.ts` defines image
IDs, sector/type IDs and dated news metadata; `src/data/officialImages.ts` is the generated size
table. `src/pages/home/` holds the approved React Home; Destination, Landmarks, Invest, News
and Legal each have their own React page directory. `src/pages/editorial/` provides the shared
normal-flow shell/hero for Invest, News and Legal. The unreferenced imperative marketing modules
have been removed. `marketing.css` remains because retained 404/shared styles still depend on it.
Active page styles include
`home.css`, `motion.css`, `destination.css`, `destination-projector.css`, `landmarks.css`,
`editorial.css`, `journal.css` and the investment page's component stylesheet.
The React `Copy` component renders review markers in a separate small line while keeping them
in the same translation string; the pitch build strips them as usual. Language changes preserve map
selection and form values. New reveals and counters respect reduced motion.

The investment form is **front-end only**. It validates required fields, email and optional phone,
announces errors and focuses the first invalid control. Success explicitly states that no data
was sent or stored; entered values are cleared immediately. Sector buttons preselect the form’s
sector. A production form service, approved consent/legal text and delivery/error handling remain
outside this demo.

All images, logos and fonts are local. R1 expanded the library to **39 official renders** with
responsive AVIF sources and WebP fallbacks. Edit `assets/official-images.json`, run
`npm run images`, and use `OfficialPicture` for React imagery. The pipeline preserves composition
without upscaling; generated dimensions live in `src/data/officialImages.ts`. Exact origins,
sizes, verified social profiles and news dates are recorded in
[SOURCE_ASSETS.md](docs/SOURCE_ASSETS.md). External social and news-source links load only when
followed. Home does not mount a WebGL canvas; its 3D calls to action open the retained Experience.

The approved 5.7 million m² area and omission of stadium capacity remain in effect. The approved
Opera House total (2,400, with the supplied theatre breakdown) is retained; the current official
page’s headline and breakdown conflict, so obtain client confirmation before changing it.
News is a dated local snapshot rather than a live feed. See [PHASE_2_REVIEW.md](docs/PHASE_2_REVIEW.md)
for verification results, limitations and every review screenshot path.

### Editorial motion after the React migration

The former imperative `src/pages/marketing/` templates, form binding and `TextReveal.ts` have
been removed after route migration. React pages now use `Reveal.tsx`, shared choreography and
scoped editorial/landmark hero hooks. Headings split by English letter or Arabic word; reduced
motion leaves the full content readable. Historical reports retain the earlier implementation's
results and must not be used as proof of current-page behavior.

### Cinematic Home (R2 approved, `3ffa2ee`)

`src/pages/home/Home.tsx` declares 14 scenes across 16 timeline units: the district chapter spans
three units while the other scenes use one each. `Opening.tsx` provides the first-visit brand
opening, which any input skips. `src/motion/SceneStack.tsx` controls the full-screen stage,
slow image pushes, zoom-throughs, horizon openings, scan-line wipes, copy and counter timelines.
`Reveal.tsx` animates normal-flow News and the Home footer. Lenis and ScrollTrigger share GSAP's ticker.
The 3D Experience disables Lenis and retains its own camera controls.

The district filmstrip contains six linked cards with official architectural renders, selected
in `src/data/home.ts`. Tab focus brings each card into view; Previous/Next controls move between
chapters and support normal keyboard button activation. Sustainability combines its official
background with two depth layers showing Ribbon Park and coral exhibits. Both layouts become
normal-flow content on narrow screens and under reduced motion.

Copy remains in both dictionaries, including `marketing.scroll.*`. Language changes rebuild
split text; Arabic animates by word to preserve joined letters. The implementation restores
scroll after rebuilding the pin, tracks the rendered scene for interaction state, and clears
manual transforms and inert sections when motion changes live. Full descriptions and approved
figures remain in the mobile layout. See the R2 evidence report for verified behavior and limits.
The mobile header has a solid background; mobile and reduced-motion scenes use deeper shading
behind their full copy. Desktop cinema header styling stops at the end of the pinned stage.

The earlier `HomeJourney`, `homeJourney` data, native-scroll sculpture presentation and embedded
Home WebGL preview are superseded. Their completed historical report is
[HOME_SCROLL_REVIEW.md](docs/HOME_SCROLL_REVIEW.md); its screenshots and performance results
describe that earlier implementation. [R2_HOME_REVIEW.md](docs/R2_HOME_REVIEW.md) is the canonical
review record for this completed phase. Preserve the historical reports without
treating them as R2 QA evidence.

### Cinematic Destination and lift-and-project refinement

`src/pages/destination/Destination.tsx` builds a normal-flow React story using GSAP, Lenis and
the shared reveal system. Its official `central-plaza` opening differs from Home's aerial.
Approved area, shoreline and public-beach facts come from the shared destination statistics.

The current `ProjectorMap.tsx` uses matched official JCDC background/masterplan images with
district image pieces clipped by SVG boundary paths. Selecting a district lifts its piece and
reveals one image/content card connected by an original projection beam. GSAP animates that
short interaction; there is no orbit control, city renderer or persistent WebGL loop. Narrow
screens place the card in document flow. The former flat diagram and uncommitted 3D-city
prototype are absent from the active implementation; the former flat diagram source/style
files were removed. The original immersive Experience remains on its separate route.

Map files are self-hosted under `public/images/jcdc-map/`. `src/data/projectorMap.ts` holds
paths and anchors; [assets/destination-map.json](assets/destination-map.json) records official
image URLs, source district identifiers and geographic boundary content. The click/lift/card
interaction is original code; no website JavaScript was copied. This is a concept masterplan,
with illustrative district boundaries, rather than a surveyed map.

Official card images remain selected in `src/data/destination.ts`. The `district` query stays inside the hash, for example
`#/destination?district=marina`; supported values are `central`, `marina`, `beach`, `sports-park`,
`culture` and `wellness`. Unknown values use Central. Keep the concept-map qualification.

The waterfront story presents Entertainment Pier, Public Beach and Cruise Terminal with their
official concept images. Sustainability pairs Ribbon Park and coral-exhibit imagery with four
accordion themes. Closing CTAs continue to the retained 3D Experience and the landmark pages.
New prose and revised beach/culture/attraction summaries remain drafts; the approved beach
length is displayed as a separate fact rather than embedded in draft copy.

The committed Destination baseline `69486cd` passed focused validation for EN/AR hero/atlas/lower-story translation and scroll
preservation, keyboard CTA focus, cold district links in production and development StrictMode,
and the lower landmark CTA. Language snapshots now run before the document font/dir swap;
scroll restoration waits for layout. The router also resets scroll before mounting a different
page, fixing legacy reveal initialisation when leaving the lower Destination CTA.

[R3 Destination review](docs/R3_DESTINATION_REVIEW.md) records the earlier baseline. The current
[R3 projector review](docs/R3_PROJECTOR_REVIEW.md) records the completed lift/card interaction,
beam/focus refinements, lifecycle evidence, production timing and pitch checks. The rest of
Destination's story and the approved Home are retained. All thirteen other marketing routes
are also complete; [R3 pages review](docs/R3_PAGES_REVIEW.md) supplies their actual verification,
measurements and screenshot paths rather than inheriting old Phase 2 results.

`npm run lint`, `npm run build` and `npm run build:pitch` pass. Recorded production checks cover
EN/AR routing and text, keyboard focus, the front-end form, mobile/reduced motion, mixed SPA
lifecycle, the retained stadium and local pitch assets. Measured scroll/interaction timing is
near 60 fps on the pitch M1; the reports qualify each trace and its limits.

R3 awaits user visual review, not further marketing migration. The next phase is R4 hardening:
Safari/Edge, real touch/TV validation, native Arabic review and the remaining accessibility/
performance issues in the reports. Guided Tour follows R4. Use the
[full continuation prompt](docs/CLAUDE_CONTINUE_PROMPT.md) for the current state and next steps.

## Brand tokens

`src/styles/tokens.css` holds five brand colours (`--jcdc-primary`, `--jcdc-secondary`,
`--jcdc-accent`, `--jcdc-sand`, `--jcdc-ink`). Primary blue `#0076a9` and secondary gold
`#cc9f53` were observed in JCDC’s public stylesheet; confirm them against the brand manual.
Coral, sand and ink remain placeholders marked `[TBC: replace with official JCDC hex]`. Semantic
colours are mixed from the brand tokens, so replacing them restyles the site. `--color-highlight` darkens the secondary colour for AA
text contrast. Re-check it if the official secondary colour is much darker or lighter.

Fonts: IBM Plex Sans (Latin) and IBM Plex Sans Arabic, self-hosted via `@fontsource` packages and
bundled into the build. The family swaps automatically on `<html lang="ar">`.

The marketing header and footer use `public/brand/official-logo-light.svg` and
`official-logo-dark.png`, genuine assets from the official site. A native dark vector was not
available, so its original PNG is preserved. The original `logo-en.svg` / `logo-ar.svg`
placeholders are retained as fallback assets. No official logo was redrawn
or recoloured.

## Arabic review list

There is no native reviewer on the project yet, so **every Arabic string is a draft**
(`ar.json › _meta`). Review builds show an “AR DRAFT” badge while in Arabic. Phrases I am least
sure of:

| Key                                                                                           | Draft                                  | Concern                                                       |
| --------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| `nav.exploreIn3d`                                                                             | استكشف بتقنية ثلاثية الأبعاد           | Long for a button; “استكشف ثلاثياً” or “جولة ثلاثية الأبعاد”? |
| `landmarks.oceanarium.name`                                                                   | الأحياء المائية ومزرعة المرجان         | Check JCDC’s official Arabic name for the Oceanarium          |
| `pages.invest.lead`                                                                           | …والعافية…                             | “العافية” vs “الصحة والعافية” for _wellness_                  |
| `footer.pifCompany`                                                                           | إحدى شركات صندوق الاستثمارات العامة    | Match PIF’s official lockup wording                           |
| `meta.siteName`                                                                               | وسط جدة                                | Confirm brand name usage in Arabic                            |
| (all)                                                                                         | Western digits (9.5, 2,400)            | Confirm JCDC’s numeral convention for Arabic copy             |
| `districts.*.name`                                                                            | المنطقة المركزية، المرسى، …            | Official Arabic district names                                |
| `stats.area.value`                                                                            | 5.7 مليون م²                           | “م²” vs “متر مربع”                                            |
| `stats.phase1.label`                                                                          | الموعد المستهدف لإنجاز المرحلة الأولى  | Long for a stat label                                         |
| `stadium.hotspots.seating.*`                                                                  | المدرجات                               | Review stadium terminology and all draft hotspot bodies       |
| `stadium.hotspots.concourse.*`                                                                | الممر الداخلي                          | Confirm the preferred term for the concourse / entry passage  |
| `stadium.hotspots.vip.*`                                                                      | كبار الشخصيات والضيافة                 | Confirm hospitality naming and tone                           |
| `stadium.enter`, `stadium.back`, `stadium.inside*`, `stadium.explore`, `stadium.markersLabel` | ادخل إلى الملعب، العودة إلى الخريطة، … | Native review of navigation and arrival copy                  |
| `stadium.hotspots.*.body`                                                                     | جميع النصوص الوصفية لنقاط الاهتمام     | Review every narrative draft with a native Arabic reviewer    |

Additional 3D close-view copy requiring native Arabic review: `places.*`, especially
`places.beach.body`, `places.central.body`, `places.backDistrict` and `places.controls`.
The spaces and furniture are illustrative; review the draft tone without implying approved
amenities or public access. Close-view links are `#/experience/places/beach-promenade` and
`#/experience/places/central-square`.

Additional marketing copy requiring Arabic review:

| Key                                                                     | Review needed                                                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `marketing.home.*`, `marketing.destination.*`                           | Headlines, tone and natural line breaks; all creative copy remains draft.                                       |
| `marketing.landmarks.*`                                                 | Official landmark/district names, theatre terminology and industrial heritage wording.                          |
| `marketing.invest.*`, `marketing.form.*`                                | Sector and investor classifications; validation, consent, privacy and demo success wording.                     |
| `marketing.news.*`                                                      | All paraphrased story titles, body text, categories and Gregorian date presentation.                            |
| `marketing.sustainability.*`                                            | Coral restoration, public realm, cooling and mobility terminology.                                              |
| `marketing.common.imageAlt.*`                                           | Accurate Arabic descriptions of concept renders, including aquarium interiors.                                  |
| `marketing.legal.*`                                                     | All placeholder policy language must be replaced with client-approved Arabic legal text.                        |
| `marketing.scroll.navigation`, `marketing.scroll.chapters.*`            | Native review of cinematic chapter labels and keyboard navigation wording.                                      |
| `marketing.cinema.*`                                                    | Previous/Next scene controls, navigation label, spoken scene status and position wording.                       |
| `marketing.destination.*` (R3 additions)                                | Atlas/navigation labels, selected-district status and index, waterfront/sustainability prose, and closing CTAs. |
| `marketing.destination.mapLabel`, `marketing.destination.atlasLabel`    | Updated concept-masterplan and projector interaction naming.                                                    |
| `marketing.destination.mapLead`, `marketing.destination.mapNote`        | Lift-and-project instructions and official concept imagery/illustrative-boundary qualification.                 |
| `districts.beach.summary`, `districts.culture.summary`                  | Revised descriptions without a number in draft prose or unverified landmark-location claims.                    |
| `attractions.publicBeach.summary`, `attractions.cruiseTerminal.summary` | Revised tone without current-access or marina-connection promises.                                              |
