# R2 — Cinematic Home review

Completed 4 November 2026. Implementation and technical checks are complete; user visual review
is pending. This report covers the React Home continuation from Claude's R1 commit `764fa6d`.
The earlier `HOME_SCROLL_REVIEW.md` documents the superseded sculpture design.

## What was completed

Claude completed R0 (React/Lenis foundation) and R1 (39 official architectural renders), then
stopped during R2 Home refinement and language-switch testing. This continuation preserves his
React Home and his `lenis.resize()` fix before restoring scroll after a language change.

- Fourteen full-screen scenes span sixteen timeline units. The six-district filmstrip receives
  three units; other scenes receive one each. The sequence covers the destination, approved
  figures, exterior/detail pairs for all four landmarks, districts, sustainability, the retained
  3D Experience, and investment/recognition. News and the footer follow in normal flow.
- A session opening resolves the official logo, draws a brass horizon and parts the screen.
  It lasts about 2.7 seconds, skips on input, and is omitted under reduced motion.
- One GSAP timeline controls image pushes, zoom-throughs, horizon openings, scan-line wipes,
  text entrances/exits and counters. Scrolling backward reverses the sequence. English headings
  split into letters; Arabic headings split into words to preserve joined script.
- The district filmstrip uses six linked official renders. Keyboard focus brings the selected
  card fully into view. Sustainability includes two separate image layers, showing Ribbon Park
  and coral exhibits, with different parallax depths.
- Bilingual Previous/Next buttons and a spoken chapter status make the pinned scenes reachable
  by keyboard. Interactive/inert state follows the rendered timeline, including scrub smoothing.
- Narrow screens use normal flow and retain every description, figure and district card.
  Stronger full-frame shading and a solid mobile header keep copy readable over bright renders.
  Reduced motion removes the pin, opening and Lenis. Live preference changes clear scene
  transforms, opacity, visibility and inert state; interrupted counters restore approved values.
- Header appearance follows the full scene stack, including the viewport after its pin ends,
  then returns to the editorial header over News/footer. Scene images, including inline gallery
  images, begin decoding ahead of their transitions.
- The former vanilla Home/journey files were removed. Other marketing pages and the original
  Three.js Experience remain behind the existing legacy adapter for R3. No dependency was added
  in this continuation; official assets remain local with R1 provenance.

## Verification

Production `dist/` was served locally with Vite preview. Browser QA used the installed Google
Chrome 156.0.8078.80 on Apple M1, macOS 27.0.1, with Metal GPU rendering enabled. Desktop captures
and timing use 1920×1080 CSS pixels at device scale 1. Mobile captures use 390×844.

| Check                                                        | Result                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `npm run lint`                                               | Clean                                                                              |
| `npm run build`                                              | Clean                                                                              |
| `npm run build:pitch`                                        | Clean                                                                              |
| `git diff --check`                                           | Clean                                                                              |
| All fourteen settled scenes, EN/AR                           | Pass; no horizontal overflow or broken loaded images                               |
| Zoom, wipe, horizon and landmark-detail transitions          | Captured and visually inspected in EN/AR                                           |
| Language switch in early/middle/late scenes                  | Exact scroll position and active scene retained                                    |
| Previous/Next keyboard activation and all six district cards | Pass; focused cards fully visible                                                  |
| Live reduced-motion switch during a horizon transition       | Pass; pin removed, all scenes visible and non-inert                                |
| Reduced motion during a counter entrance                     | Approved final quantities restored                                                 |
| Mobile EN/AR                                                 | Full content, all figures, district cards, menu and Escape pass                    |
| Cold reduced-motion EN/AR                                    | Normal flow, no opening, no pin, readable content                                  |
| Sixteen Home/Invest cycles and rapid hash changes            | One Home/pin on return; no Home/pin after leaving                                  |
| Stadium `inside` and `pitch` deep links                      | Existing Experience ready; one canvas, Lenis disabled                              |
| Leave Experience for Invest                                  | Canvas removed; required-field validation still works                              |
| Opening EN/AR                                                | Logo/reveal inspected; wheel works; input skips; opening stays skipped for session |
| Pitch EN/AR, including stadium entry/exit                    | No draft/TBC markers, debug panel or review scroller hook                          |
| Runtime network restricted to localhost                      | All tested pitch assets load; zero external page requests                          |
| WebGL-disabled browser                                       | Home remains available; Experience shows its fallback                              |

Console: **clean** — no warnings or errors in the final main, supplementary or layout runs.
No page exceptions were recorded. The main run recorded no failed requests.

An earlier live reduced-motion check failed because hidden visibility styles survived the
manual horizon transform cleanup. Cleanup now clears visibility and opacity too; the repeated
check passes. An earlier mobile assertion inherited the preceding test's reduced-motion
emulation; the harness now resets that preference before testing mobile flow. The final mobile
captures also prompted the stronger grade and solid header, which were separately rechecked.

## Performance and lifecycle evidence

The final warmed full-page scroll recorded **960 frames over 16,002.6 ms: 59.99 fps**, mean
**16.67 ms**, 95th percentile **18.70 ms**, worst **18.80 ms**, with **zero frames above 33 ms**.
The preceding warmed run also measured 60.00 fps and an 18.80 ms worst frame. The page was in
the foreground at 1920×1080, device scale 1, with images decoded before timing. This is Home
scroll timing, not a new stadium-flight or full-tour performance claim.

An earlier run before complete image warmup measured 59.81 fps with a 50 ms maximum and two
frames above 33 ms. The final trace is explicitly warmed; comprehensive cold-decode timing
remains part of R4. Inline district and sustainability images now share the ahead-of-scene
decode path with backgrounds.

Across sixteen Home/Invest cycles with explicit garbage collection, JS heap grew from
15.18 MiB to 15.88 MiB; the last six readings stayed within 0.10 MiB. Home had zero canvases
throughout. The pin spacer was removed on each exit and recreated once on return. This shows
no canvas/pin accumulation in the tested cycles; it does not measure decoded bitmap/GPU memory
or prove that every possible leak is absent. The separate stadium enter/leave regression also
returned the canvas count to zero.

Raw evidence is local and gitignored:

- `review/phase-R2/validation.json` — scene, language, keyboard, mobile, lifecycle and first warmed trace.
- `review/phase-R2/extras.json` — opening, native wheel, pitch/local-only requests and WebGL fallback.
- `review/phase-R2/final-layout.json` — final mobile/reduced layouts, header boundaries and final trace.
- `review/phase-R2/counter-cleanup.json` — interrupted-counter restoration.
- `review/phase-R2/qa/` — external Playwright scripts and execution/build/lint logs. They use
  `playwright-core` outside the project and the local installed Chrome; no QA package was added.

## Open items

- User approval of appearance, pace, cropping and transition character is pending.
- All Arabic remains a draft. The README review list includes the new `marketing.cinema.*`
  controls/status wording. Native review is still required.
- Safari, Edge, actual TV output and physical touch-device testing were not run in this phase.
  Screen-reader output was not audited with VoiceOver; keyboard behavior was exercised.
- Cold image-decode timing and broader browser/accessibility/performance hardening remain R4.
- Other marketing pages retain their prior implementation until R3. Guided Tour Phase 6 is
  still pending. Do not begin either automatically before the user's go-ahead.
- The official imagery shows architectural concepts; the interactive Three.js landmarks are
  still original placeholders pending official models. Existing TBC/draft content remains
  visible in review and is stripped in pitch.

## Review screenshots

All desktop PNGs below are 1920×1080. Mobile PNGs are 390×844. Review assets are gitignored.
The complete file list follows; scene numbers match the fourteen-scene storyboard. Contact sheets
for a quick visual review are also available:

- `review/phase-R2/contact-scenes-en.jpg`
- `review/phase-R2/contact-scenes-ar.jpg`
- `review/phase-R2/contact-details-en.jpg`
- `review/phase-R2/contact-details-ar.jpg`
- `review/phase-R2/contact-mobile-en.jpg`
- `review/phase-R2/contact-mobile-ar.jpg`

| View                        | English                                              | Arabic                                               |
| --------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| district-film-end           | `review/phase-R2/district-film-end-en.png`           | `review/phase-R2/district-film-end-ar.png`           |
| footer                      | `review/phase-R2/footer-en.png`                      | `review/phase-R2/footer-ar.png`                      |
| mobile-all-stats            | `review/phase-R2/mobile-all-stats-en.png`            | `review/phase-R2/mobile-all-stats-ar.png`            |
| mobile-district-end         | `review/phase-R2/mobile-district-end-en.png`         | `review/phase-R2/mobile-district-end-ar.png`         |
| mobile-menu                 | `review/phase-R2/mobile-menu-en.png`                 | `review/phase-R2/mobile-menu-ar.png`                 |
| mobile-scene-1              | `review/phase-R2/mobile-scene-1-en.png`              | `review/phase-R2/mobile-scene-1-ar.png`              |
| mobile-scene-11             | `review/phase-R2/mobile-scene-11-en.png`             | `review/phase-R2/mobile-scene-11-ar.png`             |
| mobile-scene-12             | `review/phase-R2/mobile-scene-12-en.png`             | `review/phase-R2/mobile-scene-12-ar.png`             |
| mobile-scene-14             | `review/phase-R2/mobile-scene-14-en.png`             | `review/phase-R2/mobile-scene-14-ar.png`             |
| mobile-scene-2              | `review/phase-R2/mobile-scene-2-en.png`              | `review/phase-R2/mobile-scene-2-ar.png`              |
| mobile-scene-3              | `review/phase-R2/mobile-scene-3-en.png`              | `review/phase-R2/mobile-scene-3-ar.png`              |
| mobile-sustainability-facts | `review/phase-R2/mobile-sustainability-facts-en.png` | `review/phase-R2/mobile-sustainability-facts-ar.png` |
| news-cards                  | `review/phase-R2/news-cards-en.png`                  | `review/phase-R2/news-cards-ar.png`                  |
| news                        | `review/phase-R2/news-en.png`                        | `review/phase-R2/news-ar.png`                        |
| opening-horizon             | `review/phase-R2/opening-horizon-en.png`             | `review/phase-R2/opening-horizon-ar.png`             |
| opening-logo                | `review/phase-R2/opening-logo-en.png`                | `review/phase-R2/opening-logo-ar.png`                |
| pitch-hero                  | `review/phase-R2/pitch-hero-en.png`                  | `review/phase-R2/pitch-hero-ar.png`                  |
| pitch-overview              | `review/phase-R2/pitch-overview-en.png`              | `review/phase-R2/pitch-overview-ar.png`              |
| reduced                     | `review/phase-R2/reduced-en.png`                     | `review/phase-R2/reduced-ar.png`                     |
| scene-01                    | `review/phase-R2/scene-01-en.png`                    | `review/phase-R2/scene-01-ar.png`                    |
| scene-02                    | `review/phase-R2/scene-02-en.png`                    | `review/phase-R2/scene-02-ar.png`                    |
| scene-03                    | `review/phase-R2/scene-03-en.png`                    | `review/phase-R2/scene-03-ar.png`                    |
| scene-04                    | `review/phase-R2/scene-04-en.png`                    | `review/phase-R2/scene-04-ar.png`                    |
| scene-05                    | `review/phase-R2/scene-05-en.png`                    | `review/phase-R2/scene-05-ar.png`                    |
| scene-06                    | `review/phase-R2/scene-06-en.png`                    | `review/phase-R2/scene-06-ar.png`                    |
| scene-07                    | `review/phase-R2/scene-07-en.png`                    | `review/phase-R2/scene-07-ar.png`                    |
| scene-08                    | `review/phase-R2/scene-08-en.png`                    | `review/phase-R2/scene-08-ar.png`                    |
| scene-09                    | `review/phase-R2/scene-09-en.png`                    | `review/phase-R2/scene-09-ar.png`                    |
| scene-10                    | `review/phase-R2/scene-10-en.png`                    | `review/phase-R2/scene-10-ar.png`                    |
| scene-11                    | `review/phase-R2/scene-11-en.png`                    | `review/phase-R2/scene-11-ar.png`                    |
| scene-12                    | `review/phase-R2/scene-12-en.png`                    | `review/phase-R2/scene-12-ar.png`                    |
| scene-13                    | `review/phase-R2/scene-13-en.png`                    | `review/phase-R2/scene-13-ar.png`                    |
| scene-14                    | `review/phase-R2/scene-14-en.png`                    | `review/phase-R2/scene-14-ar.png`                    |
| transition-horizon          | `review/phase-R2/transition-horizon-en.png`          | `review/phase-R2/transition-horizon-ar.png`          |
| transition-interior         | `review/phase-R2/transition-interior-en.png`         | `review/phase-R2/transition-interior-ar.png`         |
| transition-wipe             | `review/phase-R2/transition-wipe-en.png`             | `review/phase-R2/transition-wipe-ar.png`             |
| transition-zoom             | `review/phase-R2/transition-zoom-en.png`             | `review/phase-R2/transition-zoom-ar.png`             |
