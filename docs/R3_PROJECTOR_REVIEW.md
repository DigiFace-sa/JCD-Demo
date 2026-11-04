# R3 — District projector review

4 November 2026. **Functional checks, final beam tracking, production timing and pitch verification
passed.** This report
covers the user's clarified interaction: one click lifts a district and projects its image and
content. It builds on Destination baseline `69486cd`; Home remains approved at `3ffa2ee`.

## Implementation and provenance

- `ProjectorMap.tsx` uses matched official JCDC background/masterplan images, clipping a piece
  for each district with geographic boundary paths. Selection lifts that piece, reveals one
  official-image/content card and draws an original projection beam. Selecting the active
  district replays the interaction. This adds no city orbit controls or WebGL renderer.
- `src/data/projectorMap.ts` stores image paths, boundary paths and projection anchors.
  `assets/destination-map.json` records retrieval on 4 November 2026, the official
  [Destination source](https://www.jeddahcentral.com/en/jeddah-central-destination), source
  district identifiers, image URLs and the shared 1440×773 coordinate space. The two images
  are self-hosted as `public/images/jcdc-map/background.webp` and `masterplan.webp`.
  Interaction code is original; no external website JavaScript is copied or required at runtime.
- The concept imagery and district boundaries retain their illustrative qualification. This
  is not a surveyed or navigable city model. The earlier flat diagram was removed; the
  uncommitted heavy 3D prototype was abandoned outside the repository.
- The six district buttons retain stable DOM order, translated names and pressed states.
  Selection stays in `#/destination?district=<id>` with Central as the invalid-value fallback.
  Existing EN/AR selection feedback, official district images and the separate Experience CTA
  are retained. On narrow screens the card sits below the map in normal flow.
- GSAP owns the short lift/card transition. Reduced motion applies the selected raised pose
  and readable card immediately. Animation context, pending frame, ResizeObserver and local
  redraw listener have cleanup paths. The surrounding hero, facts, attraction stories,
  sustainability themes and closing CTAs retain the Destination story.
- Latest source refinement reads the actual rendered pin position for the beam, uses the same
  `70rem` media query as CSS, and gives focus outlines non-scaling strokes. These changes are
  implemented and covered by the final focused production check.

## Recorded verification

Evidence: `review/phase-R3-projector/qa/checks.json`. **All 16 grouped checks passed** in the
recorded production-preview run. Installed headful Chrome used Metal on the pitch M1; desktop
captures are 1920×1080 at DPR 1 and mobile captures 390×844. The test script was external to
the project, under `/tmp/jcd-projector-qa/verify.mjs`.

| Grouped check                           | Recorded result                                                  |
| --------------------------------------- | ---------------------------------------------------------------- |
| Hero CTA arrival                        | Explorer receives focus                                          |
| Six district selections, EN and AR      | Pressed state, actual raised piece and visible card agree        |
| SVG keyboard activation, EN and AR      | Space/Enter work; focus and scroll retained                      |
| Active-tile replay, EN and AR           | Intermediate lift captured, then settled selected state restored |
| Rapid selections, EN and AR             | URL and visible state finish at the last requested district      |
| Browser Back                            | Previous district restored                                       |
| Cold district link                      | Requested district shown, explorer reached, no canvas            |
| Invalid district                        | Falls back to Central                                            |
| Live reduced motion and language switch | Selected district/card remain usable                             |
| Mobile EN and AR                        | Card uses normal flow; no horizontal overflow                    |
| Sixteen SPA enter/leave cycles          | One projector on entry; no projector or canvas on exit           |

Console: **clean in this recorded run**. The harness collected zero console warnings/errors,
page exceptions or non-aborted failed requests; its `issues` array is empty. Navigation
`ERR_ABORTED` requests are deliberately excluded by the harness. This evidence predates the
last beam-position/media-query/non-scaling-stroke changes. The final focused retest also passed,
with an empty issues array in `review/phase-R3-pages/qa/final.json`.

The final check samples the beam during the lift in both languages: its anchor stayed within
one CSS pixel of the rendered pin. Focus outlines use non-scaling strokes. This checks tracking
and focus treatment; it is not a comprehensive contrast audit.

`npm run lint`, `npm run build` and `npm run build:pitch` passed after the final source changes.
Pitch runtime checks passed in EN and AR: local map images load, `?debug` adds no debug panel,
review markers are absent, and the Destination → Invest → News path requests no external assets.
This is local-only request evidence, rather than a network-disconnection simulation.

## Production timing

Headful Chrome/Metal on Apple M1, 1920×1080, DPR 1; a single QA browser, no screenshots during
measurement. Each trace lasts about twelve seconds after loading/settling. The map trace
changes district every 750 ms; the page trace scrolls through the Destination story.

| Trace                    | Frames | Mean FPS | Mean frame |     p95 |   Worst | Frames >25 / >33 ms |
| ------------------------ | -----: | -------: | ---------: | ------: | ------: | ------------------: |
| District lift selections |    720 |   59.998 |  16.667 ms | 18.6 ms | 18.7 ms |               0 / 0 |
| Destination page scroll  |    720 |   59.998 |  16.667 ms | 18.6 ms | 18.7 ms |               0 / 0 |

These are browser animation-frame measurements of the warmed production page, not GPU timings,
TV output measurements, cold-start guarantees or a fresh benchmark of the retained 3D engine.
The map has no canvas or quality-tier renderer. Raw timings are in `review/phase-R3-pages/qa/final.json`.

## Lifecycle evidence and limits

`review/phase-R3-projector/qa/lifecycle.json` contains 16 forced-GC heap samples taken after
SPA exits to Legal. Heap went from **7,068,091 to 7,480,851 bytes** (6.741 → 7.134 MiB), a
**412,760-byte** increase. The final five samples ranged from **7,341,228 to 7,480,851 bytes**,
a span of **139,623 bytes / 0.133 MiB**.

The recorded exits had no projector DOM or canvas, and re-entry had exactly one projector.
This shows successful DOM teardown with modest heap variation over the sampled cycles; it
does **not** guarantee an absence of leaks. Listener counts, decoded-bitmap memory and GPU
memory were not measured. No frame-time result is inferred from these lifecycle samples.

## Review screenshots

The set contains **24 files / 12 EN–AR pairs**. Desktop, mid-lift, pitch and reduced-motion
stills are 1920×1080; mobile supplements are 390×844. Earlier `first-*` prototypes are excluded.
The final focused pass replaced the two mid-lift captures and added the refined/focused Central
and pitch views below. The three contact sheets and representative full-size renders were inspected at closeout.

| View                  | English                                            | Arabic                                             |
| --------------------- | -------------------------------------------------- | -------------------------------------------------- |
| Central               | `review/phase-R3-projector/central-en.png`         | `review/phase-R3-projector/central-ar.png`         |
| Marina                | `review/phase-R3-projector/marina-en.png`          | `review/phase-R3-projector/marina-ar.png`          |
| Beach                 | `review/phase-R3-projector/beach-en.png`           | `review/phase-R3-projector/beach-ar.png`           |
| Sports Park           | `review/phase-R3-projector/sports-park-en.png`     | `review/phase-R3-projector/sports-park-ar.png`     |
| Culture & Creativity  | `review/phase-R3-projector/culture-en.png`         | `review/phase-R3-projector/culture-ar.png`         |
| Wellness              | `review/phase-R3-projector/wellness-en.png`        | `review/phase-R3-projector/wellness-ar.png`        |
| Mid-lift              | `review/phase-R3-projector/mid-lift-en.png`        | `review/phase-R3-projector/mid-lift-ar.png`        |
| Reduced motion        | `review/phase-R3-projector/reduced-en.png`         | `review/phase-R3-projector/reduced-ar.png`         |
| Mobile map            | `review/phase-R3-projector/mobile-map-en.png`      | `review/phase-R3-projector/mobile-map-ar.png`      |
| Mobile card           | `review/phase-R3-projector/mobile-card-en.png`     | `review/phase-R3-projector/mobile-card-ar.png`     |
| Refined Central/focus | `review/phase-R3-projector/refined-central-en.png` | `review/phase-R3-projector/refined-central-ar.png` |
| Pitch                 | `review/phase-R3-projector/pitch-en.png`           | `review/phase-R3-projector/pitch-ar.png`           |

## Remaining review

Native Arabic review is required for `marketing.destination.mapLabel`, `mapLead`, `mapNote`
and `atlasLabel`, alongside the existing draft copy. Real touch hardware, Safari/Edge and the
pitch TV remain outside this Chrome result. Preserve the approved Home and the separate 3D
Experience. Other React page migrations have their own evidence; this map's checks do not
establish their correctness. User visual review follows technical closeout.

Contact sheets inspected:

- `review/phase-R3-projector/contact-01.png`
- `review/phase-R3-projector/contact-02.png`
- `review/phase-R3-projector/contact-03.png`

The final `review/phase-R3-pages/qa/reduced.json` explicitly reloads cold district/invalid URLs,
checks actual language and selected pose, and replaces the two reduced-motion map stills. This
corrects the earlier harness assumption that a hash-only `goto` is a cold navigation. Current
stills have the language matching their filenames. Final source checks also include the shared
Home-return header fix documented in the pages report. Technical closeout is complete; the final diff check passed and the completed R3 phase is committed locally. No push or deployment occurred.
