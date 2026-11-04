# R3 — Remaining marketing pages review

Completed technical review, 4 November 2026. **The remaining marketing pages are implemented,
verified and ready for user visual review.** This report records the actual production-browser
checks, follow-ups, timings, lifecycle samples and inspected screenshots.
The Destination lift-and-project map has its own report, `R3_PROJECTOR_REVIEW.md`.

## Scope and implementation

After approving Home and commissioning Destination, the user authorised the rest of the site:
“when you're done do the other pages as well.” This scope migrates thirteen marketing routes
to React, keeping the approved Home and original Three.js Experience:

| Route group         | Routes                                                                                           | Implementation                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Landmark collection | `#/landmarks`                                                                                    | Official Stadium night hero, four architectural features and an investment invitation                                                |
| Landmark stories    | `#/landmarks/stadium`, `#/landmarks/opera-house`, `#/landmarks/oceanarium`, `#/landmarks/museum` | Shared data-driven exterior hero, existing narrative/facts, official detail-image pairs, Experience invitation and related landmarks |
| Investment          | `#/invest`                                                                                       | Five existing sectors, destination rationale, recognition and front-end interest form                                                |
| News                | `#/news`, `#/news/pif`, `#/news/forum`, `#/news/stadium`                                         | Local dated editorial summaries, official illustrative imagery and optional original-source links                                    |
| Legal               | `#/legal/privacy`, `#/legal/terms`, `#/legal/cookies`                                            | Clearly marked placeholder policies and in-place policy navigation                                                                   |

`src/pages/landmarks/` supplies the collection, data-driven detail page and shared hero/shell.
`src/pages/editorial/Editorial.tsx` supplies the normal-flow shell, hero and actions used by
Invest, News and Legal. Each route is now a React `view`. The legacy adapter remains for the
original Experience and 404; unreferenced imperative marketing modules were removed.
`marketing.css` remains because retained shared/404 styles still need it.

Pages use self-hosted official concept renders, the existing typed dictionaries, original
layout/interaction code and the approved dark ink/brass identity. No facts, testimonials or
property inventory were added for this migration. Stadium capacity remains absent; its CTAs
open `#/experience/stadium/inside`. The supplied Opera House facts are retained. Existing
news metadata is a local snapshot, rather than a live feed.

Scoped GSAP contexts own the hero/text/image motion and revert it for reduced motion or
unmount. Narrow-screen heroes skip image parallax. Landmark detail content is keyed by id;
news and legal pages pass a route-content key into the editorial shell. These changes reset
scroll and focus for a new story/document/landmark while preserving language-only position.
Language capture runs through `onBeforeLangChange()`, before the document font/direction swap,
and restoration settles after fonts and two animation frames. Related-news reveals rebuild
when the excluded current story changes. News-card keyboard focus keeps the whole card visible.

The investment form remains entirely front-end. Its implementation validates required fields,
email syntax and an optional phone value; sector CTAs preselect the registration sector.
The demonstration success state explicitly explains that data was not submitted or stored and
clears entered values. Backend delivery, approved consent/legal text and production error
handling remain outside this demo. Success/reset and locale persistence passed the corrected
follow-up described below.

## Verified evidence

The main browser pass used the production review build at `http://127.0.0.1:4173/`, installed
Chrome with Metal GPU rendering enabled, and desktop 1920×1080 at device scale 1. The primary
agent inspected desktop contact sheets `contact-01.png` through `contact-06.png`.

Raw evidence: `review/phase-R3-pages/qa/checks.json` records **thirty completed grouped
scenarios**, zero recorded application issues, and forty-eight desktop screenshots:

| Completed check                             | Recorded result                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Thirteen routes in English and Arabic       | 26 route/content/layout/screenshot scenarios passed                                         |
| Actual H1 copy                              | Matches the corresponding translated dictionary title after whitespace/marker normalisation |
| Desktop layout                              | No horizontal document overflow in the tested views                                         |
| Loaded image validity                       | No completed image with zero natural width was found                                        |
| Marketing canvas count                      | Zero canvases on the tested marketing routes                                                |
| Landmark-to-landmark in-place navigation    | Scroll resets to top and the current H1 receives focus                                      |
| Stadium and other landmark Experience links | Stadium interior and non-stadium exterior targets present                                   |
| EN/AR position continuity                   | Landmark, editorial article and investment-form scroll positions preserved                  |
| Sector CTA                                  | Hospitality is preselected and registration sector control receives focus                   |
| Empty form submit                           | Accessible error state and first-invalid-field focus passed                                 |

The completed `review/phase-R3-pages/qa/followup.json` adds **eight passing grouped scenarios**,
including two repeats of the sector/empty-submit checks. Together the files record thirty-six
unique scenario names and seventy-five unique screenshots. The new follow-up coverage is:

- Invalid email and optional phone errors, form values/consent retained across language changes,
  valid-submit success focus, cleared values and reset to a blank form.
- Same-page news/legal navigation resets scroll and focuses the current heading.
- Six representative routes at 390×844 in both languages: Landmarks, Stadium, Invest, News,
  the PIF news story and Privacy. These layout/route/form groups passed without horizontal overflow.
- Live reduced motion removes the Invest hero transform; Stadium remains readable when reached
  with reduced motion active, including an Arabic switch.
- Unknown landmark and news-story ids still resolve to the retained 404.

Both evidence files' `issues` arrays are empty. Their harness records application page
exceptions, browser warnings/errors and failed requests, except requests cancelled by navigation.
**Application console: clean across the main, follow-up, final runtime, extras, cold reduced-motion
and final Home-return runs.** Each completed evidence file has an empty issues array.

The first run stopped in the valid-submit scenario with an immediate success-heading focus
assertion: `AssertionError [ERR_ASSERTION]: false !== true`. The form intentionally schedules
focus for the next animation frame. The corrected harness waits for that focus rather than
reading it in the same task. Source lifecycle refinements, including the related-news reveal
key and route-key ScrollTrigger refresh, were rebuilt before the follow-up. The corrected run
now records all eight follow-up groups as passed in `qa/followup.json`; no application focus
failure remains in that repeated scenario.

## Final runtime and source checks

`review/phase-R3-pages/qa/final.json` records four passing runtime groups, zero issues, and five
approximately twelve-second timing traces. Its projector-specific beam/focus assertions and
six projector screenshots belong to `R3_PROJECTOR_REVIEW.md`. The page-specific runtime checks
confirmed:

- The Stadium hero CTA opens the retained `#/experience/stadium/inside` route, reaches ready
  state and shows one WebGL canvas. EN/AR stills were captured. Returning to the site removes
  the canvas.
- Home survives the return from other pages, with `data-editorial`, `data-landmarks` and
  `data-destination` cleared from the body. EN/AR Home regression stills were captured.
- The pitch build loads the local official map and retained React Invest/News pages. The tested
  EN/AR destination and investment views contain no visible TBC/draft markers or debug panel.
  No external page requests were observed across those pitch paths. This records the tested
  request trace; it does not imply that external source/social links were clicked offline.

| Check                                                                          | Recorded result                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Final review build                                                             | Passed; `/tmp/jcd-marketing-qa/build.log` ends with a successful Vite build  |
| Final source lint                                                              | Passed; `/tmp/jcd-marketing-qa/lint.log` contains no findings                |
| Final pitch build                                                              | Passed; `/tmp/jcd-marketing-qa/pitch.log` ends with a successful pitch build |
| Valid form values, email/phone errors, locale persistence, success focus/reset | Passed in the corrected follow-up                                            |
| Same-page news/legal focus and scroll                                          | Passed                                                                       |
| 390×844 EN/AR mobile routes and form                                           | Six representative routes passed in both languages                           |
| Live reduced motion and reduced-motion Stadium arrival                         | Passed for the tested Invest/Stadium states                                  |
| Unknown landmark/story 404                                                     | Passed                                                                       |
| Stadium CTA entry and canvas disposal on exit                                  | Passed in the current build                                                  |
| Home body-style cleanup after returning from the Experience                    | Passed                                                                       |
| Pitch runtime markers/debug/local asset requests                               | Passed for the tested routes/languages                                       |
| Application console/page exceptions                                            | Clean through the completed main, follow-up and final runs                   |

## Current-build frame timing

Measurements use installed Chrome with Metal, Apple M1, a 1920×1080 viewport and device scale 1.
Each trace runs for about twelve seconds after a page-settle wait. The harness records animation
frame intervals while applying full-page Lenis/native scrolling, or changing district selection
repeatedly. These are representative page/input traces, not fresh stadium-flight measurements,
a full Guided Tour trace, or a comprehensive cold-versus-warmed decode benchmark.

| Trace                    | Frames | Mean fps | Mean ms | 95th percentile ms | Worst ms | Frames >25 ms | Frames >33 ms |
| ------------------------ | ------ | -------- | ------- | ------------------ | -------- | ------------- | ------------- |
| District lift selections | 720    | 59.998   | 16.67   | 18.60              | 18.70    | 0             | 0             |
| Destination page scroll  | 720    | 59.998   | 16.67   | 18.60              | 18.70    | 0             | 0             |
| Landmarks page scroll    | 719    | 59.914   | 16.69   | 18.50              | 32.80    | 1             | 0             |
| Invest page scroll       | 720    | 59.999   | 16.67   | 18.30              | 18.80    | 0             | 0             |
| News page scroll         | 720    | 59.995   | 16.67   | 18.60              | 18.80    | 0             | 0             |

The Landmarks trace includes one 32.8 ms frame; it should not be described as a perfectly locked
60 fps run. None of the five measured traces contains a frame above 33 ms. The district and
Destination rows provide shared context; their canonical interaction evidence remains in the
projector report. Raw values, including exact durations, are in `qa/final.json`.

## Additional checks and lifecycle

`qa/extras.json` adds seven passing groups: all four official-image landmark galleries in both
languages, related-news rebuilding across all three same-page stories, mobile form controls/error
focus, and sixteen mixed marketing SPA cycles. `qa/reduced.json` adds cold reduced-motion Invest
heroes in EN/AR and actual reloaded map deep-link/invalid-fallback checks. All issues arrays are empty.

The sixteen mixed cycles visit Stadium detail → Invest → News story → Legal. Each exit had no
old landmark, Invest or article DOM, no canvas or pin spacer, and exactly one editorial shell.
Forced-GC heap was **7,629,864 → 7,830,128 bytes**; the final five samples ranged from
**7,712,940 to 7,830,128 bytes**, a **117,188-byte** span. Together with the separate projector
cycles this supports DOM/JS cleanup across the new page types. It does not measure decoded-image,
GPU memory or all listeners, and does not guarantee the absence of leaks.

Final visual inspection found Home's header could keep its solid light background after returning
from another route: its stage bounds were first read while the main entrance transform was active.
`RouteView` now refreshes ScrollTrigger after that transform clears, and the SceneStack stage
tracker updates on refresh. `qa/home-return.json` passes six focused EN/AR checks: Legal/Invest
returns restore the cinema header, top position and one pin; leaving Home clears stage and keeps
Destination's requested district. Both Home regression stills were replaced. Home art direction
and scene choreography remain as approved. Timing traces above preceded this one-off route-end
refresh; the settled scroll/selection animation code measured in them is unchanged.

The initial cold-link harness used some hash-only `goto` changes, which can remain in the same
document. The final reduced-motion pass explicitly reloads and verifies language/selection.
Two mislabeled reduced-map captures were replaced. The form focus harness was also corrected
to await its scheduled animation frame; no application focus failure remained in follow-up.

All individual captures were inspected through six desktop and seven supplemental contact sheets,
with representative full-size map, mobile, hero, success and 3D frames opened separately. The
inspection found no blocking clipping, broken images or horizontal overflow in the reviewed new
views. This is engineering visual inspection; the user's aesthetic sign-off is still outstanding.
Final lint, review build and pitch build pass after the header fix. The final diff check passed, and the completed R3 phase is committed locally (read `git log -3` for its hash). No push or deployment is part of this work.

## Limits and remaining review

- All Arabic remains draft and requires native review, including existing marketing/form/legal
  wording. Western digits remain the current convention pending client confirmation.
- Legal content and production consent are placeholders. The form is a local demonstration;
  no backend, delivery or production data handling has been implemented.
- Architectural imagery depicts official concepts. Marketing renders are not event photographs
  or evidence of completed construction; retained interactive landmarks remain original models.
- Broader Safari/Edge, TV output, physical touch-device and screen-reader review is not established
  by this desktop evidence snapshot. R4 hardening and Guided Tour work remain separate.
- User visual review of these new pages is pending. The approved Home is retained as the visual
  baseline; its earlier report does not certify the new routes.

## Current screenshot inventory

**102 individual files / 51 EN–AR pairs** are listed below. Desktop images are 1920×1080;
mobile supplements are 390×844. Review assets are gitignored. Current captures supersede earlier
frames under the same names. The 24 projector-map captures belong to the separate map report.

| View                             | English                                                         | Arabic                                                          |
| -------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| gallery-museum                   | `review/phase-R3-pages/gallery-museum-en.png`                   | `review/phase-R3-pages/gallery-museum-ar.png`                   |
| gallery-oceanarium               | `review/phase-R3-pages/gallery-oceanarium-en.png`               | `review/phase-R3-pages/gallery-oceanarium-ar.png`               |
| gallery-opera-house              | `review/phase-R3-pages/gallery-opera-house-en.png`              | `review/phase-R3-pages/gallery-opera-house-ar.png`              |
| gallery-stadium                  | `review/phase-R3-pages/gallery-stadium-en.png`                  | `review/phase-R3-pages/gallery-stadium-ar.png`                  |
| home-regression                  | `review/phase-R3-pages/home-regression-en.png`                  | `review/phase-R3-pages/home-regression-ar.png`                  |
| invest-content                   | `review/phase-R3-pages/invest-content-en.png`                   | `review/phase-R3-pages/invest-content-ar.png`                   |
| invest-form-errors               | `review/phase-R3-pages/invest-form-errors-en.png`               | `review/phase-R3-pages/invest-form-errors-ar.png`               |
| invest-hero                      | `review/phase-R3-pages/invest-hero-en.png`                      | `review/phase-R3-pages/invest-hero-ar.png`                      |
| invest-rationale                 | `review/phase-R3-pages/invest-rationale-en.png`                 | `review/phase-R3-pages/invest-rationale-ar.png`                 |
| invest-recognition               | `review/phase-R3-pages/invest-recognition-en.png`               | `review/phase-R3-pages/invest-recognition-ar.png`               |
| invest-success                   | `review/phase-R3-pages/invest-success-en.png`                   | `review/phase-R3-pages/invest-success-ar.png`                   |
| landmarks-content                | `review/phase-R3-pages/landmarks-content-en.png`                | `review/phase-R3-pages/landmarks-content-ar.png`                |
| landmarks-hero                   | `review/phase-R3-pages/landmarks-hero-en.png`                   | `review/phase-R3-pages/landmarks-hero-ar.png`                   |
| landmarks-museum-content         | `review/phase-R3-pages/landmarks-museum-content-en.png`         | `review/phase-R3-pages/landmarks-museum-content-ar.png`         |
| landmarks-museum-hero            | `review/phase-R3-pages/landmarks-museum-hero-en.png`            | `review/phase-R3-pages/landmarks-museum-hero-ar.png`            |
| landmarks-oceanarium-content     | `review/phase-R3-pages/landmarks-oceanarium-content-en.png`     | `review/phase-R3-pages/landmarks-oceanarium-content-ar.png`     |
| landmarks-oceanarium-hero        | `review/phase-R3-pages/landmarks-oceanarium-hero-en.png`        | `review/phase-R3-pages/landmarks-oceanarium-hero-ar.png`        |
| landmarks-opera-house-content    | `review/phase-R3-pages/landmarks-opera-house-content-en.png`    | `review/phase-R3-pages/landmarks-opera-house-content-ar.png`    |
| landmarks-opera-house-hero       | `review/phase-R3-pages/landmarks-opera-house-hero-en.png`       | `review/phase-R3-pages/landmarks-opera-house-hero-ar.png`       |
| landmarks-stadium-content        | `review/phase-R3-pages/landmarks-stadium-content-en.png`        | `review/phase-R3-pages/landmarks-stadium-content-ar.png`        |
| landmarks-stadium-hero           | `review/phase-R3-pages/landmarks-stadium-hero-en.png`           | `review/phase-R3-pages/landmarks-stadium-hero-ar.png`           |
| legal-cookies-hero               | `review/phase-R3-pages/legal-cookies-hero-en.png`               | `review/phase-R3-pages/legal-cookies-hero-ar.png`               |
| legal-privacy-hero               | `review/phase-R3-pages/legal-privacy-hero-en.png`               | `review/phase-R3-pages/legal-privacy-hero-ar.png`               |
| legal-terms-hero                 | `review/phase-R3-pages/legal-terms-hero-en.png`                 | `review/phase-R3-pages/legal-terms-hero-ar.png`                 |
| mobile-form                      | `review/phase-R3-pages/mobile-form-en.png`                      | `review/phase-R3-pages/mobile-form-ar.png`                      |
| mobile-form-errors               | `review/phase-R3-pages/mobile-form-errors-en.png`               | `review/phase-R3-pages/mobile-form-errors-ar.png`               |
| mobile-invest-content            | `review/phase-R3-pages/mobile-invest-content-en.png`            | `review/phase-R3-pages/mobile-invest-content-ar.png`            |
| mobile-invest-hero               | `review/phase-R3-pages/mobile-invest-hero-en.png`               | `review/phase-R3-pages/mobile-invest-hero-ar.png`               |
| mobile-landmarks-content         | `review/phase-R3-pages/mobile-landmarks-content-en.png`         | `review/phase-R3-pages/mobile-landmarks-content-ar.png`         |
| mobile-landmarks-hero            | `review/phase-R3-pages/mobile-landmarks-hero-en.png`            | `review/phase-R3-pages/mobile-landmarks-hero-ar.png`            |
| mobile-landmarks-stadium-content | `review/phase-R3-pages/mobile-landmarks-stadium-content-en.png` | `review/phase-R3-pages/mobile-landmarks-stadium-content-ar.png` |
| mobile-landmarks-stadium-hero    | `review/phase-R3-pages/mobile-landmarks-stadium-hero-en.png`    | `review/phase-R3-pages/mobile-landmarks-stadium-hero-ar.png`    |
| mobile-legal-privacy-hero        | `review/phase-R3-pages/mobile-legal-privacy-hero-en.png`        | `review/phase-R3-pages/mobile-legal-privacy-hero-ar.png`        |
| mobile-news-content              | `review/phase-R3-pages/mobile-news-content-en.png`              | `review/phase-R3-pages/mobile-news-content-ar.png`              |
| mobile-news-hero                 | `review/phase-R3-pages/mobile-news-hero-en.png`                 | `review/phase-R3-pages/mobile-news-hero-ar.png`                 |
| mobile-news-pif-content          | `review/phase-R3-pages/mobile-news-pif-content-en.png`          | `review/phase-R3-pages/mobile-news-pif-content-ar.png`          |
| mobile-news-pif-hero             | `review/phase-R3-pages/mobile-news-pif-hero-en.png`             | `review/phase-R3-pages/mobile-news-pif-hero-ar.png`             |
| news-content                     | `review/phase-R3-pages/news-content-en.png`                     | `review/phase-R3-pages/news-content-ar.png`                     |
| news-forum-content               | `review/phase-R3-pages/news-forum-content-en.png`               | `review/phase-R3-pages/news-forum-content-ar.png`               |
| news-forum-hero                  | `review/phase-R3-pages/news-forum-hero-en.png`                  | `review/phase-R3-pages/news-forum-hero-ar.png`                  |
| news-hero                        | `review/phase-R3-pages/news-hero-en.png`                        | `review/phase-R3-pages/news-hero-ar.png`                        |
| news-pif-content                 | `review/phase-R3-pages/news-pif-content-en.png`                 | `review/phase-R3-pages/news-pif-content-ar.png`                 |
| news-pif-hero                    | `review/phase-R3-pages/news-pif-hero-en.png`                    | `review/phase-R3-pages/news-pif-hero-ar.png`                    |
| news-stadium-content             | `review/phase-R3-pages/news-stadium-content-en.png`             | `review/phase-R3-pages/news-stadium-content-ar.png`             |
| news-stadium-hero                | `review/phase-R3-pages/news-stadium-hero-en.png`                | `review/phase-R3-pages/news-stadium-hero-ar.png`                |
| reduced-invest                   | `review/phase-R3-pages/reduced-invest-en.png`                   | `review/phase-R3-pages/reduced-invest-ar.png`                   |
| reduced-stadium                  | `review/phase-R3-pages/reduced-stadium-en.png`                  | `review/phase-R3-pages/reduced-stadium-ar.png`                  |
| related-forum                    | `review/phase-R3-pages/related-forum-en.png`                    | `review/phase-R3-pages/related-forum-ar.png`                    |
| related-pif                      | `review/phase-R3-pages/related-pif-en.png`                      | `review/phase-R3-pages/related-pif-ar.png`                      |
| related-stadium                  | `review/phase-R3-pages/related-stadium-en.png`                  | `review/phase-R3-pages/related-stadium-ar.png`                  |
| retained-stadium-inside          | `review/phase-R3-pages/retained-stadium-inside-en.png`          | `review/phase-R3-pages/retained-stadium-inside-ar.png`          |

Contact sheets inspected by the primary agent:

- `review/phase-R3-pages/contact-01.png`
- `review/phase-R3-pages/contact-02.png`
- `review/phase-R3-pages/contact-03.png`
- `review/phase-R3-pages/contact-04.png`
- `review/phase-R3-pages/contact-05.png`
- `review/phase-R3-pages/contact-06.png`
- `review/phase-R3-pages/contact-new-01.png`
- `review/phase-R3-pages/contact-new-02.png`
- `review/phase-R3-pages/contact-new-03.png`
- `review/phase-R3-pages/contact-new-04.png`
- `review/phase-R3-pages/contact-new-05.png`
- `review/phase-R3-pages/contact-new-06.png`
- `review/phase-R3-pages/contact-new-07.png`
