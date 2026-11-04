# R3 — Destination review

Completed 4 November 2026. **User visual review is pending.** This report covers the
Destination redesign, delivered as a page-sized part of R3. Home was approved at `3ffa2ee`
and its scene/layout implementation is preserved.

## Implementation

- React `src/pages/destination/Destination.tsx` replaces the vanilla Destination template.
  The page uses normal document flow, a continuous ink/sand surface, the official
  `central-plaza` hero, a timed text intro, scroll-driven image depth and copy outro.
- Approved area, shoreline and public-beach facts reuse `DESTINATION_STATS` through
  `src/data/destination.ts`; counters use the shared motion system.
- `DistrictAtlas.tsx` projects the existing district polygons into a schematic SVG atlas with
  animated edge traces, six stable keyboard targets, matching list controls, selected state,
  spoken selection feedback and official district-render details. District counters use an
  isolated left-to-right number group so numerator/total order stays correct in Arabic. The atlas stays explicitly
  illustrative, with no invented building inventory or surveyed-boundary claim.
- District selection lives in `#/destination?district=<id>`. Valid links select the district
  and cold links arrive at the atlas; invalid values fall back to Central. Selection preserves
  viewport/focus, and browser Back/Forward uses the same query state.
- Three editorial attraction stories use Entertainment Pier, Public Beach and Cruise Terminal
  concept renders. Public Beach's approved length is a separate fact, outside draft prose.
- Sustainability layers `ribbon-park-tall` and `coral` imagery beside the approved public-realm
  figure and four accessible accordion themes. Coral imagery depicts an Oceanarium exhibit
  concept; it is not evidence of physical reef-restoration work.
- Closing CTAs open the retained Experience and landmark pages. New UI/prose lives in both
  dictionaries. Shared beach/culture district and public-beach/cruise summaries were revised
  to remove numbers from drafts and unsupported landmark-location, access or marina promises.
- The old vanilla Destination template, district-map class and obsolete styling were removed.
  `Copy` now accepts an optional ID for heading relationships. Official images remain local,
  with provenance in `assets/official-images.json` and `docs/SOURCE_ASSETS.md`.
  No Home scene/layout or 3D-engine change is part of this scope; no dependency was added.

## Verification

Production `dist/` was served on localhost; installed Google Chrome 156.0.8078.80 used Metal
on Apple M1, macOS 27.0.1. Desktop captures use 1920×1080 at DPR 1; mobile uses 390×844.
The final main run passed all **16 checks**; the focused run passed all **12 checks**.
Both recorded **zero console warnings/errors and zero page exceptions**. The main run also
recorded zero failed requests and zero external runtime requests. Raw evidence is listed below.

| Check                                                                      | Result                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run lint`, `npm run build`, `npm run build:pitch`, `git diff --check` | Clean                                                 |
| Desktop EN/AR, all six atlas districts through map and list                | Pass; loaded images valid, no horizontal overflow     |
| Cold valid/invalid district query; browser Back/Forward                    | Pass; selected district and viewport retained         |
| SVG Enter/Space, list activation and focus retention                       | Pass                                                  |
| Hero/atlas/lower-story EN↔AR copy and scroll continuity                    | Pass in focused retest; exact translated text checked |
| Hero CTA keyboard arrival and next Tab within atlas                        | Pass                                                  |
| Cold district links in production and dev StrictMode, EN/AR                | Pass; atlas selected and focused                      |
| Four sustainability themes and accessible expanded/inert state             | Pass in EN/AR                                         |
| Mobile content, district controls, menu and Escape                         | Pass in EN/AR; no horizontal overflow                 |
| Reduced motion cold/live; Lenis off and parallax cleared                   | Pass in EN/AR                                         |
| Sixteen route cycles and rapid route changes                               | Pass; no Destination canvas or pin accumulation       |
| Stadium interior/pitch deep links and return                               | Pass; existing canvas disposed on return              |
| Closing CTA keyboard path to Landmarks                                     | Pass in EN/AR                                         |
| Pitch EN/AR with runtime requests restricted to localhost                  | Pass; markers/debug absent and zero external requests |

The initial language test failed at the Public Beach story: scroll moved **4157.5 → 4237 px**.
A later focused test caught a smaller atlas shift when HTML direction/font changed before the
old language listener captured position. `onBeforeLangChange()` now snapshots it before that
change; restoration waits two animation frames. Hero split text is keyed by language, and
localised district heights refresh the scroller/trigger positions. The focused repeat verifies
both translated text and preserved scroll in both directions.

The closing keyboard CTA also exposed **`TypeError: Cannot read properties of undefined
(reading 'end')`** in legacy Landmarks, mapped to `ScrollTrigger.js:1366`. The incoming legacy
page created its once-only reveals at the departing page's deep scroll position. `RouteView`
now resets scroll after the outgoing fade and before mounting a different page. The same-page
query behavior stays intact. The reproduction and the EN/AR keyboard retests pass after this fix.

Focused checks also confirmed the atlas arrival focus fix. Native keyboard focus reveals CTA
buttons immediately, without waiting for their scroll entrance animation.

Evidence is local and gitignored:

- `review/phase-R3-destination/validation.json` — final main run, screenshots, timing and cycles.
- `review/phase-R3-destination/targeted-validation.json` — actual translations, focus, dev and CTA checks.
- `review/phase-R3-destination/counter-validation.json` — final EN/AR district-number isolation and refreshed review/pitch atlas stills.
- `review/phase-R3-destination/first-validation.json` — original language failure, retained for comparison.
- `review/phase-R3-destination/qa/` — external Playwright scripts, execution/build/lint logs and the
  Landmarks error reproduction. Playwright remains outside project dependencies.

## Performance and lifecycle evidence

The warmed production foreground scroll recorded **720 frames over 12,000.4 ms:
59.998 fps**, mean **16.667 ms**, p95 **18.70 ms**, worst **18.70 ms**, and **zero frames
above 33 ms**, at 1920×1080/DPR 1. Images were decoded and the page traversed before timing.
This is a warmed Destination scroll trace, not cold image-decode, stadium-flight or Guided
Tour evidence. Comprehensive cold-decode and physical TV checks remain part of hardening.

Sixteen route cycles with forced GC recorded heap **15,149,164 → 15,753,398 bytes**
(14.45 → 15.02 MiB). The last six samples spanned **82,064 bytes / 0.078 MiB**.
Every exit recorded **zero canvases and zero pin spacers**. ScrollTrigger counts were
`null` because the library was not exposed to that probe; no trigger-count conclusion is
claimed. Bitmap decode memory and GPU memory were not measured.

## Review screenshots

Contact sheets:

- `review/phase-R3-destination/contact-desktop-en.jpg`
- `review/phase-R3-destination/contact-desktop-ar.jpg`
- `review/phase-R3-destination/contact-mobile-en.jpg`
- `review/phase-R3-destination/contact-mobile-ar.jpg`

Actual PNGs currently present: **60 files / 30 EN–AR pairs**. Desktop, transition,
reduced-motion and pitch files are 1920×1080; `mobile-*` files are 390×844. They include settled content, live motion frames, mobile, reduced motion and pitch states.
The EN/AR renders and contact sheets were visually inspected; user approval remains pending.

| View                          | English                                                            | Arabic                                                             |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| atlas-beach                   | `review/phase-R3-destination/atlas-beach-en.png`                   | `review/phase-R3-destination/atlas-beach-ar.png`                   |
| atlas-central                 | `review/phase-R3-destination/atlas-central-en.png`                 | `review/phase-R3-destination/atlas-central-ar.png`                 |
| atlas-culture                 | `review/phase-R3-destination/atlas-culture-en.png`                 | `review/phase-R3-destination/atlas-culture-ar.png`                 |
| atlas-marina                  | `review/phase-R3-destination/atlas-marina-en.png`                  | `review/phase-R3-destination/atlas-marina-ar.png`                  |
| atlas-sports-park             | `review/phase-R3-destination/atlas-sports-park-en.png`             | `review/phase-R3-destination/atlas-sports-park-ar.png`             |
| atlas-trace                   | `review/phase-R3-destination/atlas-trace-en.png`                   | `review/phase-R3-destination/atlas-trace-ar.png`                   |
| atlas-wellness                | `review/phase-R3-destination/atlas-wellness-en.png`                | `review/phase-R3-destination/atlas-wellness-ar.png`                |
| attraction-cruise-terminal    | `review/phase-R3-destination/attraction-cruise-terminal-en.png`    | `review/phase-R3-destination/attraction-cruise-terminal-ar.png`    |
| attraction-entertainment-pier | `review/phase-R3-destination/attraction-entertainment-pier-en.png` | `review/phase-R3-destination/attraction-entertainment-pier-ar.png` |
| attraction-public-beach       | `review/phase-R3-destination/attraction-public-beach-en.png`       | `review/phase-R3-destination/attraction-public-beach-ar.png`       |
| continue                      | `review/phase-R3-destination/continue-en.png`                      | `review/phase-R3-destination/continue-ar.png`                      |
| facts                         | `review/phase-R3-destination/facts-en.png`                         | `review/phase-R3-destination/facts-ar.png`                         |
| footer                        | `review/phase-R3-destination/footer-en.png`                        | `review/phase-R3-destination/footer-ar.png`                        |
| hero                          | `review/phase-R3-destination/hero-en.png`                          | `review/phase-R3-destination/hero-ar.png`                          |
| hero-scroll-mid               | `review/phase-R3-destination/hero-scroll-mid-en.png`               | `review/phase-R3-destination/hero-scroll-mid-ar.png`               |
| mobile-atlas                  | `review/phase-R3-destination/mobile-atlas-en.png`                  | `review/phase-R3-destination/mobile-atlas-ar.png`                  |
| mobile-beach                  | `review/phase-R3-destination/mobile-beach-en.png`                  | `review/phase-R3-destination/mobile-beach-ar.png`                  |
| mobile-continue               | `review/phase-R3-destination/mobile-continue-en.png`               | `review/phase-R3-destination/mobile-continue-ar.png`               |
| mobile-district               | `review/phase-R3-destination/mobile-district-en.png`               | `review/phase-R3-destination/mobile-district-ar.png`               |
| mobile-hero                   | `review/phase-R3-destination/mobile-hero-en.png`                   | `review/phase-R3-destination/mobile-hero-ar.png`                   |
| mobile-menu                   | `review/phase-R3-destination/mobile-menu-en.png`                   | `review/phase-R3-destination/mobile-menu-ar.png`                   |
| mobile-sustainability         | `review/phase-R3-destination/mobile-sustainability-en.png`         | `review/phase-R3-destination/mobile-sustainability-ar.png`         |
| pitch-atlas                   | `review/phase-R3-destination/pitch-atlas-en.png`                   | `review/phase-R3-destination/pitch-atlas-ar.png`                   |
| reduced-atlas                 | `review/phase-R3-destination/reduced-atlas-en.png`                 | `review/phase-R3-destination/reduced-atlas-ar.png`                 |
| reduced-hero                  | `review/phase-R3-destination/reduced-hero-en.png`                  | `review/phase-R3-destination/reduced-hero-ar.png`                  |
| sustainability                | `review/phase-R3-destination/sustainability-en.png`                | `review/phase-R3-destination/sustainability-ar.png`                |
| sustainability-theme-1        | `review/phase-R3-destination/sustainability-theme-1-en.png`        | `review/phase-R3-destination/sustainability-theme-1-ar.png`        |
| sustainability-theme-2        | `review/phase-R3-destination/sustainability-theme-2-en.png`        | `review/phase-R3-destination/sustainability-theme-2-ar.png`        |
| sustainability-theme-3        | `review/phase-R3-destination/sustainability-theme-3-en.png`        | `review/phase-R3-destination/sustainability-theme-3-ar.png`        |
| sustainability-theme-4        | `review/phase-R3-destination/sustainability-theme-4-en.png`        | `review/phase-R3-destination/sustainability-theme-4-ar.png`        |

## Open items and next scope

- User review of the visual direction, transition pace and crops is pending. The local phase
  commit records the completed implementation; do not start the next page automatically.
- Native Arabic review remains necessary for new Destination navigation/prose and all four
  revised summaries; the README lists them. Western digits remain subject to client confirmation.
- Safari/Edge, real touch devices and the pitch TV have not been established by this Chrome run.
  Source image limits remain: the pier is 1087×618 and stadium-villages 1200×656.
- The map is schematic, all project images are architectural concepts, brand/legal approvals
  remain open, and the original 3D geography stays illustrative.
- Home remains approved. Landmarks, Invest, News and Legal React migrations are later R3 parts;
  broader accessibility/performance/cross-browser hardening is R4. Guided Tour remains pending.
