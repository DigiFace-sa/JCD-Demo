# Home scroll experience: review

Phase 2 refinement. The Home page is now one continuous, native-scroll story: a brand intro,
the official masterplan opening, the destination overview, a pinned landmark gallery, districts,
the 3D Experience feature, sustainability, investment and news. Every chapter sits on one shared
Red Sea atmosphere, with four original 3D sculptures appearing between them. Architecture and
hooks are described in README › "Home scroll experience".

Measured on the pitch machine: Apple M1, Chrome with Metal, 1920×1080, DPR 1.

## Changes in this closing pass

1. **Intro was effectively invisible (fixed).** It played, but the logo was a small 9rem mark
   that faded out 0.3 s before the panel wipe began. Most frames showed an empty blue panel,
   which is why the earlier stills looked blank.
   - The logo is now 15rem.
   - Its exit and the wipe start together at 1.3 s.
   - The wipe uses an explicit `fromTo` from `inset(0% 0% 0% 0%)`.
   - The orbit ends at 0.85 opacity.

   Verified on real captured frame sequences, EN and AR.

2. **Sculpture pop-in (fixed).** The deferred renderer used to appear abruptly about 2.4 s after
   load. The canvas now crossfades in from the CSS ornament.
3. **Landmark sculpture enclosed the "Explore the landmarks" link (fixed).** It's moved into the
   top corner (`homeJourney.ts`, landmarks x 0.985, y 0.06).
4. **Coral sat on the "Register your interest" CTA in Invest (fixed).** The Invest chapter now
   fades the coral out (opacity 0) in place.
5. **Mobile:**
   - **Sculptures over body text (fixed).** They sat above copy at 0.4 opacity. Below 70rem
     they now pass behind content.
   - **Progress pill over CTAs (fixed).** It collided with chapter CTAs at the bottom and moved
     to the top, centred under the header, with a physical `left` so RTL stays centred.
   - **Menu "see-through" still.** This was a capture taken mid-fade, not a bug: the settled menu
     panel is solid. It's recaptured settled.

No dependency, i18n key or content change.

## Verification

| Check                                                           | Result                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run lint`                                                  | clean                                                                         |
| `npm run build` / `npm run build:pitch`                         | pass (both rebuilt from final source)                                         |
| `git diff --check`                                              | clean                                                                         |
| Intro frame sequences EN/AR (14 frames each, 80 ms apart)       | logo and orbit visible from about 0.8 s, wipe reveals the hero, console clean |
| Keyboard reveals all four gallery cards, EN and AR              | pass                                                                          |
| Runtime reduced-motion switch removes pins, EN and AR           | pass                                                                          |
| Two constructed-scene exits; four exits during deferred startup | pass, 0 canvases left                                                         |
| Keyboard skips intro and completes title entrance               | pass                                                                          |
| Pitch build hides debug panel and placeholder markers           | pass                                                                          |
| Mobile 375×812 EN/AR: horizontal overflow, menu Escape          | 0 px overflow, menu closes                                                    |
| Console / page errors in all reruns                             | none                                                                          |

The interaction checks above are a rerun of the earlier `final.mjs` suite against the final build
(`review/phase-2/scroll/qa/rerun/final.json`).

From the earlier session, **not rerun** because this pass didn't touch that code:

- the 13-scenario sweep (`qa/checks.json`): layout, hit targets, language-switch scroll
  preservation, Home/End, WebGL-disabled fallback;
- the 16-cycle lifecycle run (`qa/lifecycle-initial.json`). The heap levelled off at about
  10.6 MB with 0 canvases after every exit. That's JS heap and DOM evidence, not a GPU-memory
  measurement.

### Performance, final build

A warmed 12-second scroll from top to bottom, `quality=high`. The sculpture canvas is
1037×842.

| Run | Frames | Mean fps | p95     | Worst   | Frames > 33 ms |
| --- | ------ | -------- | ------- | ------- | -------------- |
| 1   | 719    | 59.92    | 16.8 ms | 33.3 ms | 1              |
| 2   | 720    | 60.00    | 17.1 ms | 17.7 ms | 0              |

Run 1 (`qa/perf-final.json`) had one dropped frame; run 2 had none. Both are warmed scrolls, so
they don't guarantee every cold-start frame.

## Screenshots

All are under `review/phase-2/scroll/` (gitignored). Desktop stills are 1920×1080 and mobile
stills are 375×812. **Every view exists as `-en.png` and `-ar.png`.**

Desktop:

- `intro`: logo and orbit, captured from the frame sequence
- `hero`
- `opening`
- `transition-hero-overview`
- `overview`
- `landmarks`
- `gallery-enter`
- `gallery-leave`
- `districts`
- `experience`
- `sustainability`
- `invest`
- `news`
- `footer`
- `supporting-transition`: a supporting page's paper surface
- `reduced-motion`
- `fallback-overview`: WebGL disabled
- `pitch`: pitch build

Mobile:

- `mobile-hero`
- `mobile-overview`
- `mobile-districts`
- `mobile-sustainability`
- `mobile-invest`
- `mobile-menu`

Contact sheets (inspected):

- `contact-en-1.png`, `contact-en-2.png`, `contact-en-3.png`
- `contact-ar-1.png`, `contact-ar-2.png`, `contact-ar-3.png`
- `contact-en-mobile.png`, `contact-ar-mobile.png`

Refreshed after this pass:

- intro, landmarks, gallery-enter, gallery-leave, sustainability, invest, news, footer;
- all mobile views.

The rest are from the earlier session; the code they show didn't change. QA scripts, logs and
JSON results are in `review/phase-2/scroll/qa/`. The obsolete `first-*` prototype stills were
left out.

## Open items

- **Mobile progress pill:** it's fixed under the header, so it briefly crosses a section's top
  line while scrolling. It can be hidden or auto-hidden on phones if preferred.
- **Review badge on mobile:** the orange "AR DRAFT" badge covers bottom content on mobile. It's
  only in review builds and is absent from the pitch build.
- **Native Arabic review:** still pending, including the new chapter labels.
- **Sculptures:** these are original artistic objects, not official project models.
- **Still outstanding:** Safari and Edge checks, a final accessibility pass, the brand manual
  and dark logo vector, approved legal text, and a production form service.
