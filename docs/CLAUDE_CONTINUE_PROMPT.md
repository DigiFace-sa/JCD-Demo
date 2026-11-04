# Claude Code continuation prompt — Jeddah Central

You are continuing an existing project in `/Users/trqorganji/Desktop/JCD`. Read this document,
the current sections of `README.md`, and the two R3 review reports before changing anything.
When documentation and code disagree, the code is the truth. Preserve existing work.

## The user's request and the design decisions

This is Brandship's bilingual Jeddah Central pitch demo. It runs locally and offline on an
entry-level Apple M1 Mac connected to a 1080p TV. The intended pace is calm, cinematic and
premium, with a connected dark ink background, brass accents, official JCDC concept imagery,
large light typography, React, GSAP and Lenis.

The user approved Home on 4 November 2026. **Do not redesign or rebuild Home.** Masar was a
design/motion reference. Never copy Masar's code, images or models. The user authorised using
JCDC's own images and content; official architectural concept renders are already self-hosted.
Do not describe them as photographs of completed buildings.

For Destination the user clarified, twice:

> “bro, make it simple.. don't over do it.. … an interactive map … when clicked … the part …
> animate above and shows the content like a projector … creative and animated but simple”

**This means click → lift one district → project its image and description.** The implemented
map follows that direction. Do not revive the abandoned heavy rotatable Three.js city or
replace the map with another schematic rectangle diagram. The separate existing full 3D
Experience is retained and is a different feature.

The latest user also explicitly said:

> “when you're done do the other pages as well. and before the usage is finished just send a
> full prompt for claude like before so he can handle it”

That authorised the remaining marketing-page migrations and their routine fixes. They have
been implemented. **Do not ask for that permission again or restart those migrations.** This
file is the requested detailed continuation prompt.

## Snapshot and evidence

Snapshot date: **4 November 2026**. R3 covers Destination's simple projector map plus the
remaining marketing pages. Source, production builds and technical checks are complete. User visual approval of these
new pages has not been inferred; only Home is already approved.

Use these canonical reports for actual results and every screenshot path:

- `docs/R2_HOME_REVIEW.md`: approved Home's earlier comprehensive evidence.
- `docs/R3_DESTINATION_REVIEW.md`: committed initial Destination baseline, historical now.
- `docs/R3_PROJECTOR_REVIEW.md`: the current district interaction and map evidence.
- `docs/R3_PAGES_REVIEW.md`: the current other pages, form, timing, lifecycle and regressions.

Review screenshots and raw JSON/scripts live under gitignored `review/phase-R3-projector/`
and `review/phase-R3-pages/`. Keep these on disk. They are intentionally excluded from git.
R3 contains 24 map stills and 102 other-page stills, all paired EN/AR; desktop captures are
1920×1080 at DPR 1, mobile supplements 390×844. Reports list the paths and contact sheets.

Relevant commit history:

| Commit                            | State                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `b5696b4`                         | Stadium interior, path flights and hotspots                                         |
| `0a33fa7`                         | Original imperative marketing pages, now replaced                                   |
| `e057133`                         | R0 React/Lenis foundation                                                           |
| `764fa6d`                         | R1 official image library/provenance/pipeline                                       |
| `3ffa2ee`                         | R2 Home, approved by the user                                                       |
| `69486cd`                         | Initial R3 Destination cinematic baseline                                           |
| Latest local R3 completion commit | Projector map + all remaining React marketing pages; read `git log -3` for its hash |

Do not reset, discard or overwrite user edits. Check `git status --short` and `git log -3` at
takeover. Codex is making the completed R3 local commit at closeout; if no such commit exists,
preserve the working changes and read the final-closeout note and reports before proceeding.
**Never push or publish.**

## What is implemented now

### Destination

- `src/pages/destination/Destination.tsx`: cinematic official-image hero, approved destination
  facts, district explorer, named attractions, sustainability accordion and closing CTAs.
- `ProjectorMap.tsx`: lightweight SVG/DOM map; **no canvas, orbit camera or continuous renderer**.
  Official masterplan pieces are clipped to six district paths. One selection rises 22 SVG
  units, reveals a floating image/content card, and draws a soft beam to that card. Re-clicking
  the active district replays the transition. GSAP contexts cancel/revert on changes/unmount.
- The beam reads the actual rendered pin rectangle each animation update, so it follows the
  moving district. ResizeObserver and a local redraw event keep the card connection aligned.
  Both are cleaned up; pending animation frames are cancelled.
- Desktop card placement uses inline-end, mirroring in Arabic while the geography stays fixed.
  Below `70rem` the card goes below the map in document flow. The JS/CSS breakpoint agrees.
- SVG tiles support Enter/Space, translated accessible names and pressed states. Stable DOM
  order preserves focus; the text button list provides the same selection. Focus strokes use
  `vector-effect: non-scaling-stroke`. Selection changes have a polite spoken status.
- Reduced motion immediately applies the raised selected piece and readable content card.
- `#/destination?district=central|marina|beach|sports-park|culture|wellness` selects a district.
  Invalid values use Central. A fresh deep link arrives at the explorer with its focus moved.
- `src/data/projectorMap.ts` holds aligned image paths, district paths and anchors in the
  official 1440×773 coordinate space. `assets/destination-map.json` records primary-source
  provenance and retrieval. Local imagery is in `public/images/jcdc-map/` (two WebPs).
- Primary source: `https://www.jeddahcentral.com/en/jeddah-central-destination`.
  Only image/geographic content was reused; interaction JS/CSS is original.
- The former `DistrictAtlas.tsx` and `destination-atlas.css` were deleted. Abandoned uncommitted
  Three.js prototypes were moved outside the repo to `/tmp/jcd-projector-qa/abandoned-3d/`.
  They are not a future task or part of the retained Experience.

### Landmarks

- `src/pages/landmarks/Landmarks.tsx`: index with official night stadium hero, four alternating
  architectural features, links to details/3D and an Invest invitation.
- `Landmark.tsx`: shared data-driven template for stadium, opera-house, oceanarium and museum.
  Official exterior hero, existing narrative/facts, two official interior/detail renders,
  Experience invitation and three related landmarks.
- `LandmarkHero.tsx`: shared shell/hero/action, scoped intro and transform-only image parallax.
  `LandmarkContent` is keyed by landmark id, since these routes share a router page id. Actual
  id changes reset scroll/focus; language changes preserve scroll.
- Stadium CTAs go directly to `#/experience/stadium/inside`. Other landmarks retain exterior
  deep links. Stadium capacity is absent. Existing approved Opera House facts remain.
- Scoped CSS: `src/styles/components/landmarks.css`.

### Invest

- `src/pages/invest/Invest.tsx`: official marina hero, five official-image sector cards,
  existing rationale/fact counters, recognition strip and registration section.
- Sector buttons preselect the registration sector, scroll to it, then focus its select.
  The hero CTA focuses the name field. Reopening from success restores the form first.
- `InterestForm.tsx`: controlled React fields; required name, email, company, sector, investor
  type and consent. Phone/message optional. Email uses native validity. Approved phone regex:
  `/^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s()-]{7,22}$/`.
- Translated linked field errors, alert summary, first-invalid focus and live error correction.
  Focus is intentionally scheduled on the next animation frame; browser tests must await it.
- Form values, consent and errors survive language changes. It stays outside language-keyed
  text/Reveal wrappers. Form height changes refresh Lenis and ScrollTrigger.
- Successful demonstration clears entered values immediately, focuses the success heading
  and supports a fresh enquiry. **No backend, network submission or form-data storage.**
- Scoped CSS: `src/styles/components/invest.css`.

### News, stories and Legal

- `src/pages/news/News.tsx`, `NewsStory.tsx`: three existing verified dated summaries, official
  concept imagery, original source links and related stories. Data is in `data/marketing.ts`.
  Related-card Reveal is keyed by excluded story, so same-page story changes rebuild contexts.
- `src/pages/legal/Legal.tsx`: privacy, terms and cookies routes with honest placeholder copy
  and active policy navigation. Do not invent production legal wording.
- `src/pages/editorial/Editorial.tsx`: shared editorial shell, official-image hero and actions.
  News story/legal document changes pass `routeKey`, resetting scroll and focus only when
  content changes. Language or reduced-motion toggles must not trigger a route reset.
- Scoped CSS: `editorial.css` and `journal.css`. Mobile omits hero image parallax; reduced
  motion clears GSAP transforms and retains all content. RTL also mirrors directional grading.

### Shared architecture and important fixes

- All marketing routes now use lazy React `view` imports in `src/router/routes.ts`.
  The 13 routes after Destination are Landmarks index + four details, Invest, News index +
  three stories, and three legal documents. Home and Destination already use React too.
- The five unreferenced imperative `src/pages/marketing/*` page/template/form/motion modules
  were deleted. `marketing.css` remains for shared/404 styles; do not delete it wholesale.
- `LegacyPage` in `src/app/RouteView.tsx` still hosts the original Three.js Experience and 404.
  The Experience updates deep links in place, including all stadium hotspots.
- `onBeforeLangChange()` captures scroll **before** the document direction/font changes.
  Destination/editorial/landmark shells wait for layout/fonts and restore scroll after two
  animation frames. Never capture this with the after-change event: it caused real jumps.
- Hero split-text subtrees are keyed by language/content. Otherwise SplitText cleanup can
  restore text in the previous language. Preserve this fix.
- Router resets scroll before mounting a different page, avoiding once-only ScrollTrigger
  initialisation at the departing page's lower scroll position. Same-page queries keep scroll.
- Final screenshot inspection found Home's header could stay light after a route return,
  because stage bounds were read while the main outlet still had its entrance transform.
  `RouteView` now refreshes ScrollTrigger after that transform clears, and SceneStack's stage
  tracker runs on refresh. This preserves the approved Home visuals; it is not a redesign.
- Lenis is driven by GSAP's ticker, disabled for immersive routes and reduced motion.
  `window.__lenis` exists only in review builds for QA positioning, never pitch builds.

## Verification already performed

Use the reports/raw JSON for exact grouped checks and limits. Do not rerun entire suites
without a new change, failure or unresolved concern that justifies it.

- Projector: 16 grouped production checks passed, plus final beam tracking/focus and pitch
  checks. All six districts, rapid/repeated selections, keyboard, history, reduced motion,
  mobile, actual cold deep links/invalid fallback and lifecycle are covered.
- Other pages: 26 EN/AR desktop route scenarios plus same-page/locale/form tests; follow-up
  covers form success/reset, mobile, live reduced motion and 404. Additional checks cover
  every landmark gallery, related-news context changes, mobile form fields and recognition.
- Production traces on M1/Chrome Metal, 1920×1080, DPR 1, one QA browser, twelve seconds each:

| Trace               | Mean FPS | Worst frame | Frames over 33 ms |
| ------------------- | -------: | ----------: | ----------------: |
| District selections |   59.998 |     18.7 ms |                 0 |
| Destination scroll  |   59.998 |     18.7 ms |                 0 |
| Landmarks scroll    |   59.914 |     32.8 ms |                 0 |
| Invest scroll       |   59.999 |     18.8 ms |                 0 |
| News scroll         |   59.995 |     18.8 ms |                 0 |

These are warmed browser RAF traces, not cold-start/TV/GPU timing guarantees. Landmarks had
one frame above 25 ms. Timing preceded the final header-refresh fix, which runs at route
entrance completion rather than during these settled scroll/selection traces.

- Projector: 16 SPA enter/leave cycles; no duplicate maps or canvas on exits. Forced-GC heap
  7,068,091 → 7,480,851 bytes, final-five range 139,623 bytes.
- Mixed marketing: 16 cycles through Stadium detail → Invest → News story → Legal. No old
  page/canvas/pin-spacer remains after exit; exactly one editorial shell. Heap
  7,629,864 → 7,830,128 bytes, final-five range 117,188 bytes. This is DOM/JS evidence, not a
  guarantee of no bitmap/GPU/listener leaks.
- New Stadium CTA opens the original inside-bowl 3D route; EN/AR captures saved; exit releases
  the canvas. The retained engine was not re-benchmarked or redesigned here.
- Pitch runtime: map/Invest/News use local assets, no debug UI or review markers. Requests
  were monitored; a physical network disconnect was not simulated.
- All recorded app console/page-error arrays are empty. Navigation ERR_ABORTED is ignored
  where the harness deliberately changes routes; other failed requests were collected.
- `npm run lint`, `npm run build`, `npm run build:pitch` and `git diff --check` are required
  at final closeout. Read the final note/reports for the exact most recent run.

## Commands and QA tooling

Stack: Node24, Vite8, TypeScript6 strict, React19, GSAP3.15, Lenis, Three0.187. No new QA
dependency was added to the project. Run `npm install` only if dependencies actually need it.

```sh
npm run dev
npm run lint
npm run build
npm run build:pitch
npm run preview -- --host 127.0.0.1 --port 4173
node scripts/pitch.mjs --no-browser
```

Useful routes:

```text
http://localhost:5173/#/destination?district=sports-park
http://localhost:5173/#/landmarks
http://localhost:5173/#/landmarks/stadium
http://localhost:5173/#/invest
http://localhost:5173/#/news
http://localhost:5173/#/legal/privacy
http://localhost:5173/#/experience/stadium/inside
```

Existing servers were serving dev5173, review4173 and pitch4321. Verify live processes/CWD
before starting duplicates or stopping anything; do not trust historical process IDs.

External Playwright import: `/tmp/jcd-phase5-qa/node_modules/playwright-core/index.mjs`.
Installed Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
For real-GPU tests use headful Chrome with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`.
Use one QA browser and no screenshot/build processes during timing. Headless RAF can mislead.
For heap evidence also use `--js-flags=--expose-gc --enable-precise-memory-info`, force GC and
run at least fifteen SPA cycles; full page reloads do not test component teardown.

Scripts/logs were created under `/tmp/jcd-projector-qa/` and `/tmp/jcd-marketing-qa/`; copies
are saved into each phase's `review/.../qa/` folder. In QA, `page.goto` that only changes a hash
does not cold-load the app or reapply the query-string language. Use reload/new page for a cold
test, and assert `document.documentElement.lang` before naming a language screenshot.

## Constraints to preserve

- Typed, modular strict TypeScript; no visible hard-coded copy. Every string lives in
  `src/i18n/en.json` and `ar.json`. Arabic remains a draft and requires native review.
- Review builds show draft/TBC markers; `build:pitch` hides them and ignores debug flags.
- No invented project facts or statistics. Keep 5.7 million m²; omit stadium capacity; retain
  the approved Opera House breakdown pending client confirmation. Existing verified official
  news summaries/source links are already data-driven. Mark new draft prose/TBCs honestly.
- Logical CSS properties and RTL-aware arrows; do not mirror the map/3D geography.
- Self-hosted assets and hash routing for offline/static-server use. No remote fonts/CDNs.
- GSAP contexts, observers, events and RAF/tweens require cleanup. No backdrop-filter over
  the Experience canvas. No shadows refitted per camera frame.
- Motion must respect reduced-motion changes live. No bounce/elastic or decorative floating
  sculptures. Quality and clarity matter more than adding effects.
- End a completed phase with honest results, open issues, inspected EN/AR 1920×1080 stills
  under `review/phase-…`, every screenshot path in the report, and a local commit. Never push.

## What remains, in order

1. Let the user review the new Destination/map and other pages. Apply concrete feedback with
   focused checks; preserve the approved Home and the clarified simple interaction.
2. R4 hardening from `docs/CINEMATIC_REBUILD_PLAN.md`: Safari and Edge, real touch/mobile,
   actual pitch TV/output, wider accessibility/contrast/keyboard audit, cold-start and offline
   resilience, remaining shared-style cleanup and README finalisation. These are open checks,
   not existing failures. Do not claim they were run in Chrome QA.
3. Original Phase 6 Guided Tour remains unimplemented: data-driven shots, 2.5–3 minutes total,
   district highlights/landmark and waterfront fly-bys/stadium entry/hotspots/map return/end
   card, bilingual captions and play/pause/next/previous/exit. Manual input pauses; language
   switch does not restart; `?tour=1` and launcher `--tour` autostart. Reuse existing scene,
   camera director, stadium path APIs and selection hooks. Read the current Experience source
   and original tour brief before implementation; do not build a second renderer.
4. Original Phase 7 polish remains: first-visit loader refinement, silent-placeholder audio
   wiring muted by default, performance tiers, final accessibility/cross-browser and pitch QA.

Content/asset dependencies remain: native Arabic review, final official brand guidance/models,
approved legal copy and a future production form service if requested. Existing procedural
3D landmarks are illustrative placeholders and visually differ from the official marketing
renders. Replacing those with official models is separate work.

## Final closeout note

The final Home-return fix passed six focused EN/AR checks. Review and pitch builds and lint
passed after that source change; final diff checks are clean. Raw evidence/scripts/logs were
copied into the two gitignored QA folders. Codex completed R3 and made a local completion
commit after writing this prompt; obtain its hash with `git log -3`. Nothing was pushed or
published. The exact stopping point is **R3 complete and awaiting user visual review**, followed
by R4 hardening and then Guided Tour. No marketing-page implementation is left half finished.
