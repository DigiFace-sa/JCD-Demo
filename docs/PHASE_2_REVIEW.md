# Phase 2 — marketing website review

Home and the supporting marketing pages are implemented and ready for visual review. The user
requested this work after the stadium phase, moving Phase 2 ahead of the Guided Tour. No work
on Phases 6 or 7 was included. This is a local build; no push or deployment was made.

## What changed

- **15 marketing pages:** Home, Destination, the landmark index, four landmark details, Invest,
  the news index, three local news stories and three placeholder legal pages. The 404 now uses
  the same visual system. All previous StubPage routes have been replaced.
- **Home:** panoramic official masterplan hero, large staggered typography, transparent header,
  editorial introduction, animated approved counters, landmark cards, district links, live 3D,
  sustainability, recognition, investment CTA, news and footer. The header becomes solid on
  scroll and has no backdrop blur over WebGL.
- **JCDC identity and imagery:** genuine official white SVG and blue/gold PNG logos, blue/gold
  observed in the public stylesheet, and 13 optimised self-hosted WebP concept renders totalling
  **5,361,834 bytes**. Fonts remain the agreed self-hosted IBM Plex families. The supplied dark
  logo is a PNG; no vector was fabricated. Masar informed layout and rhythm only.
- **Destination:** a keyboard- and pointer-operated SVG district explorer projects the same
  illustrative polygons used in 3D, with raised plates, abstract massing and landmark symbols.
  District selection survives language changes. Home links can preselect a district through
  the hash query. The diagram explicitly identifies its illustrative status.
- **Landmarks:** shared editorial templates with official renders, verified descriptions,
  existing approved facts, related landmarks and 3D links. The stadium opens directly inside
  the existing bowl experience. Other landmarks retain their exterior 3D views.
- **Invest:** five sectors, rationale, recognition and accessible front-end form validation.
  Errors announce themselves and focus the first invalid field. Sector buttons preselect the
  form. Success clears entries and explicitly explains that nothing was sent or stored.
- **News:** dated local summaries of three verified official stories, readable offline, with
  optional links to their sources. Their images are labelled concept renders, not event photos.
- **EN/AR:** 189 matching new marketing string keys, responsive RTL layout, translated image
  descriptions, form errors and success text. Creative copy carries approval markers; all Arabic
  remains draft. Review markers have a small separate line and disappear in the pitch build.
- **Motion/lifecycle:** GSAP entrances, scroll reveals and counters respect reduced motion.
  Home loads its non-interactive scene only near the live section, pauses it offscreen and
  disposes it on navigation. Visibility changes resume only a previously running scene.
  Missing WebGL leaves an official marina image visible. No project dependency was added.

Source URLs, imagery provenance, identity observations and content exceptions are recorded in
[SOURCE_ASSETS.md](SOURCE_ASSETS.md). The approved area and capacity restrictions remain in effect.

## Verification

- `npm run lint`: clean.
- `npm run build`: clean review build.
- `npm run build:pitch`: clean pitch build.
- `git diff --check`: clean.
- **Console: clean** on the normal desktop route sweep, interaction checks and GPU lifecycle run.
- **32 desktop route checks:** the 15 pages plus 404 in both languages, with no horizontal
  overflow or broken loaded images. Stills inspected individually and through contact sheets.
- **12 functional scenarios passed:** deferred WebGL loading, approved counters, district deep
  link/pointer/keyboard/language state, EN/AR form validation/success/reset/sector selection,
  related-landmark focus and scroll, invalid routes, mobile navigation at 375 and 520 px in each
  language, and reduced motion. Extra crop checks verify the news, sustainability, attraction
  and form image ratios. Separator-only phone input is rejected; formatted international input
  is accepted. Form errors translate in place.
- **Offline pitch:** all 15 pages in both languages were opened with external requests blocked.
  No external asset request occurred. No review markers or debug panel appeared, including the
  Home live preview. The WebGL-disabled Home image fallback and Experience fallback both worked.
- **Stadium link:** the marketing CTA reached `#/experience/stadium/inside` with the existing
  Experience ready. Returning to Home removed the full Experience canvas.
- **Lifecycle:** 16 Home live-preview enter/leave cycles and four rapid exits during loading.
  Every exit left **zero canvases**. Forced-GC JavaScript heap rose from **26.56 MB** to
  **27.63 MB** during warm-up; the last five samples spanned only **0.062 MB**. No continued
  growth trend was observed in that tail. This is a JS heap/disposal check, not a GPU-memory
  measurement. The offscreen scene stayed stopped after a visibility-change event.

Screenshot review caught source height attributes overriding editorial image crops; this was
fixed and the final stills regenerated. Archived review scripts from the previous phase were
also being scanned by ESLint; `review/` is now explicitly ignored. No lint error was suppressed
in application code.

## Home live-preview performance

Installed Chrome, ANGLE Metal on the Apple M1, **1920×1080 page viewport**, device pixel ratio 1.
The embedded scene occupies its own shorter section, so its render dimensions are listed below.
Each tier settled for five seconds, then eight debug samples were taken at 0.6-second intervals;
no screenshots were taken during sampling. Tier labels and moving camera coordinates were
verified. These are steady-state samples, not a claim about first shader compilation or the
entire full-screen 3D Experience. The stadium phase has its own measurements.

| Language / tier | Actual render size | Mean sampled FPS | Sample range | Worst sampled frame |
| --------------- | ------------------ | ---------------: | -----------: | ------------------: |
| EN / high       | 1920×772           |             60.0 |    60.0–60.0 |             17.6 ms |
| EN / medium     | 1920×772           |             60.0 |    59.9–60.1 |             17.6 ms |
| EN / low        | 1514×609           |             60.0 |    60.0–60.0 |             17.6 ms |
| AR / high       | 1920×773           |             60.0 |    60.0–60.0 |             17.6 ms |

Raw results are in `review/phase-2/performance.json`, `functional.json`, `sweep.json`, `gpu.json`,
`layout.json` and `offline.json`. `gpu.json` retains the initial diagnostic performance probe;
use `performance.json` for the final tier-verified figures. Reproducible scripts are archived
under `review/phase-2/qa/` and use the external Playwright installation, not a project dependency.

## Open items

- Native Arabic review and client approval of marked marketing copy and legal text remain.
  The README Arabic review list has been expanded. Western digits remain the agreed draft choice.
- A brand manual and native dark vector would replace the observed website colours and PNG.
  Coral, sand and ink retain their original placeholder-token status.
- The form intentionally has no delivery service. A production service and approved privacy /
  consent text are future work. Local news is a dated snapshot rather than a live feed.
- Retain **5.7 million m²**, keep stadium capacity absent, and confirm the approved Opera House
  figures before changing them; the current official headline and theatre breakdown conflict.
- The district diagram and original 3D geometry remain illustrative. The context city is still
  boxy at close range. Official renders and the original 3D interpretation are clearly identified.
- Chrome was exercised here. Safari/Edge, the broader accessibility pass, Guided Tour and final
  polish remain in the planned later phases.

## Review screenshots

All primary stills are **1920×1080**. Mobile supplements are **375×812**. Contact sheets are
labelled separately and have variable height. Static editorial captures use reduced motion
for settled compositions; normal motion, counters and live camera drift were checked separately.
Every screenshot is local and gitignored under `review/phase-2/`.

| View                 | English                                                                                     | Arabic                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| cookies              | [review/phase-2/cookies-en.png](../review/phase-2/cookies-en.png)                           | [review/phase-2/cookies-ar.png](../review/phase-2/cookies-ar.png)                           |
| destination-detail   | [review/phase-2/destination-detail-en.png](../review/phase-2/destination-detail-en.png)     | [review/phase-2/destination-detail-ar.png](../review/phase-2/destination-detail-ar.png)     |
| destination          | [review/phase-2/destination-en.png](../review/phase-2/destination-en.png)                   | [review/phase-2/destination-ar.png](../review/phase-2/destination-ar.png)                   |
| destination-selected | [review/phase-2/destination-selected-en.png](../review/phase-2/destination-selected-en.png) | [review/phase-2/destination-selected-ar.png](../review/phase-2/destination-selected-ar.png) |
| home-districts       | [review/phase-2/home-districts-en.png](../review/phase-2/home-districts-en.png)             | [review/phase-2/home-districts-ar.png](../review/phase-2/home-districts-ar.png)             |
| home                 | [review/phase-2/home-en.png](../review/phase-2/home-en.png)                                 | [review/phase-2/home-ar.png](../review/phase-2/home-ar.png)                                 |
| home-footer          | [review/phase-2/home-footer-en.png](../review/phase-2/home-footer-en.png)                   | [review/phase-2/home-footer-ar.png](../review/phase-2/home-footer-ar.png)                   |
| home-invest          | [review/phase-2/home-invest-en.png](../review/phase-2/home-invest-en.png)                   | [review/phase-2/home-invest-ar.png](../review/phase-2/home-invest-ar.png)                   |
| home-landmarks       | [review/phase-2/home-landmarks-en.png](../review/phase-2/home-landmarks-en.png)             | [review/phase-2/home-landmarks-ar.png](../review/phase-2/home-landmarks-ar.png)             |
| home-live-3d         | [review/phase-2/home-live-3d-en.png](../review/phase-2/home-live-3d-en.png)                 | [review/phase-2/home-live-3d-ar.png](../review/phase-2/home-live-3d-ar.png)                 |
| home-news            | [review/phase-2/home-news-en.png](../review/phase-2/home-news-en.png)                       | [review/phase-2/home-news-ar.png](../review/phase-2/home-news-ar.png)                       |
| home-overview        | [review/phase-2/home-overview-en.png](../review/phase-2/home-overview-en.png)               | [review/phase-2/home-overview-ar.png](../review/phase-2/home-overview-ar.png)               |
| home-recognition     | [review/phase-2/home-recognition-en.png](../review/phase-2/home-recognition-en.png)         | [review/phase-2/home-recognition-ar.png](../review/phase-2/home-recognition-ar.png)         |
| home-sustainability  | [review/phase-2/home-sustainability-en.png](../review/phase-2/home-sustainability-en.png)   | [review/phase-2/home-sustainability-ar.png](../review/phase-2/home-sustainability-ar.png)   |
| home-webgl-fallback  | [review/phase-2/home-webgl-fallback-en.png](../review/phase-2/home-webgl-fallback-en.png)   | [review/phase-2/home-webgl-fallback-ar.png](../review/phase-2/home-webgl-fallback-ar.png)   |
| invest-detail        | [review/phase-2/invest-detail-en.png](../review/phase-2/invest-detail-en.png)               | [review/phase-2/invest-detail-ar.png](../review/phase-2/invest-detail-ar.png)               |
| invest               | [review/phase-2/invest-en.png](../review/phase-2/invest-en.png)                             | [review/phase-2/invest-ar.png](../review/phase-2/invest-ar.png)                             |
| invest-errors        | [review/phase-2/invest-errors-en.png](../review/phase-2/invest-errors-en.png)               | [review/phase-2/invest-errors-ar.png](../review/phase-2/invest-errors-ar.png)               |
| invest-success       | [review/phase-2/invest-success-en.png](../review/phase-2/invest-success-en.png)             | [review/phase-2/invest-success-ar.png](../review/phase-2/invest-success-ar.png)             |
| landmarks            | [review/phase-2/landmarks-en.png](../review/phase-2/landmarks-en.png)                       | [review/phase-2/landmarks-ar.png](../review/phase-2/landmarks-ar.png)                       |
| museum               | [review/phase-2/museum-en.png](../review/phase-2/museum-en.png)                             | [review/phase-2/museum-ar.png](../review/phase-2/museum-ar.png)                             |
| news                 | [review/phase-2/news-en.png](../review/phase-2/news-en.png)                                 | [review/phase-2/news-ar.png](../review/phase-2/news-ar.png)                                 |
| news-forum           | [review/phase-2/news-forum-en.png](../review/phase-2/news-forum-en.png)                     | [review/phase-2/news-forum-ar.png](../review/phase-2/news-forum-ar.png)                     |
| news-pif             | [review/phase-2/news-pif-en.png](../review/phase-2/news-pif-en.png)                         | [review/phase-2/news-pif-ar.png](../review/phase-2/news-pif-ar.png)                         |
| news-stadium         | [review/phase-2/news-stadium-en.png](../review/phase-2/news-stadium-en.png)                 | [review/phase-2/news-stadium-ar.png](../review/phase-2/news-stadium-ar.png)                 |
| not-found            | [review/phase-2/not-found-en.png](../review/phase-2/not-found-en.png)                       | [review/phase-2/not-found-ar.png](../review/phase-2/not-found-ar.png)                       |
| oceanarium           | [review/phase-2/oceanarium-en.png](../review/phase-2/oceanarium-en.png)                     | [review/phase-2/oceanarium-ar.png](../review/phase-2/oceanarium-ar.png)                     |
| opera-house          | [review/phase-2/opera-house-en.png](../review/phase-2/opera-house-en.png)                   | [review/phase-2/opera-house-ar.png](../review/phase-2/opera-house-ar.png)                   |
| pitch-home           | [review/phase-2/pitch-home-en.png](../review/phase-2/pitch-home-en.png)                     | [review/phase-2/pitch-home-ar.png](../review/phase-2/pitch-home-ar.png)                     |
| privacy              | [review/phase-2/privacy-en.png](../review/phase-2/privacy-en.png)                           | [review/phase-2/privacy-ar.png](../review/phase-2/privacy-ar.png)                           |
| stadium-detail       | [review/phase-2/stadium-detail-en.png](../review/phase-2/stadium-detail-en.png)             | [review/phase-2/stadium-detail-ar.png](../review/phase-2/stadium-detail-ar.png)             |
| stadium              | [review/phase-2/stadium-en.png](../review/phase-2/stadium-en.png)                           | [review/phase-2/stadium-ar.png](../review/phase-2/stadium-ar.png)                           |
| terms                | [review/phase-2/terms-en.png](../review/phase-2/terms-en.png)                               | [review/phase-2/terms-ar.png](../review/phase-2/terms-ar.png)                               |
| mobile-destination   | [review/phase-2/mobile-destination-en.png](../review/phase-2/mobile-destination-en.png)     | [review/phase-2/mobile-destination-ar.png](../review/phase-2/mobile-destination-ar.png)     |
| mobile-home          | [review/phase-2/mobile-home-en.png](../review/phase-2/mobile-home-en.png)                   | [review/phase-2/mobile-home-ar.png](../review/phase-2/mobile-home-ar.png)                   |
| mobile-invest        | [review/phase-2/mobile-invest-en.png](../review/phase-2/mobile-invest-en.png)               | [review/phase-2/mobile-invest-ar.png](../review/phase-2/mobile-invest-ar.png)               |
| mobile-menu          | [review/phase-2/mobile-menu-en.png](../review/phase-2/mobile-menu-en.png)                   | [review/phase-2/mobile-menu-ar.png](../review/phase-2/mobile-menu-ar.png)                   |
| mobile-news-pif      | [review/phase-2/mobile-news-pif-en.png](../review/phase-2/mobile-news-pif-en.png)           | [review/phase-2/mobile-news-pif-ar.png](../review/phase-2/mobile-news-pif-ar.png)           |
| contact-details      | [review/phase-2/contact-details-en.png](../review/phase-2/contact-details-en.png)           | [review/phase-2/contact-details-ar.png](../review/phase-2/contact-details-ar.png)           |
| contact-home         | [review/phase-2/contact-home-en.png](../review/phase-2/contact-home-en.png)                 | [review/phase-2/contact-home-ar.png](../review/phase-2/contact-home-ar.png)                 |
| contact-pages        | [review/phase-2/contact-pages-en.png](../review/phase-2/contact-pages-en.png)               | [review/phase-2/contact-pages-ar.png](../review/phase-2/contact-pages-ar.png)               |
