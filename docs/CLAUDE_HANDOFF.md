# Claude Code takeover — Jeddah Central Home scroll experience

You are Claude Code continuing the existing local project. Read this entire file before editing.
This is a continuation, not a new website build. Preserve the existing implementation and the
user’s work. The user requested this handoff because parallel Codex agents reached their usage
limit. No new Home-scroll commit has been made yet.

## Current objective and exact stopping point

The latest product request is to turn Home into a full **scroll-based experience**:

- cinematic / futuristic intro and transitions;
- connected sections, one continuous background and colours that blend between chapters;
- actual 3D items appearing in sections;
- keep Jeddah Central identity, bilingual EN/AR, native scrolling, offline operation and M1 speed.

**The implementation is written and working. Core functional QA passes. Stop point: final visual
review, one intro visual concern, screenshot archiving, the phase review report, final checks and
local commit remain.** Do not rebuild the page or start the Guided Tour.

The user’s immediate instruction was: “if the usage is almost done, send me a full detailed prompt
of what you did and where you stopped so i can give it to your teammate claude code so he can
continue while the usage resets.” This file is that prompt and the current source of takeover state.

## Workspace and running previews

- Repository: `/Users/trqorganji/Desktop/JCD`
- Branch: `main`
- Shell: zsh; macOS / Apple M1; Node 24; npm.
- Current committed baseline: `0a33fa7` — Phase 2 marketing pages.
- Previous commit: `b5696b4` — Phase 5 stadium.
- **All current Home-scroll changes are uncommitted. Preserve them.**
- Review preview: `http://127.0.0.1:4173/?lang=en#/` and `?lang=ar#/`.
- Dev: `http://127.0.0.1:5173/`.
- Pitch server: `http://127.0.0.1:4321/?lang=en#/`.
- Use the explicit IPv4 addresses: another process also listens on IPv6 localhost:5173.
- Existing review preview PID was 96743; dev IPv4 PID 96203; pitch PID 98811. Verify before using
  process IDs. Don’t kill unrelated Chrome or user processes.
- Review server serves `dist/`; pitch server serves `dist-pitch/`. Both respond to rebuilt files.

## Read these first

1. This file.
2. `README.md`, especially “Marketing pages” and the new “Home scroll experience” subsection.
3. `docs/CODEX_HANDOFF.md` for historical constraints and full project context. Its body is an old
   Phase 4 handoff; the code and current top notes supersede stale status statements.
4. `docs/PHASE_2_REVIEW.md`, `docs/PHASE_5_REVIEW.md`, `docs/SOURCE_ASSETS.md`.
5. The new/changed implementation files listed below.

`README.md` and the top of `CODEX_HANDOFF.md` already reference a planned
`docs/HOME_SCROLL_REVIEW.md`. **That report does not exist yet. Creating it is an outstanding task.**

## Project rules that still apply

- Work in phases. Finish this Home refinement, report results and open issues, list review
  screenshots, make a **local** git commit only once complete, then stop for the user’s review.
- **Never push or publish.** No hosting or deployment task is authorised.
- Don’t ask for approval again to finish this already-authorised Home work.
- Every visible UI string goes in `src/i18n/en.json` and `ar.json`; use the existing typed i18n.
- Arabic is a draft. Keep the review badge and README Arabic review list.
- Preserve the review/pitch marker system. `build` shows markers; `build:pitch` strips them and
  ignores `?debug`.
- No invented JCDC facts or numbers. Keep area **5.7 million m²** and omit stadium capacity.
  Creative marketing copy needs `[DRAFT — client to approve]`; unknown facts need `[TBC: …]`.
- The user explicitly authorised official JCDC images, identity and content in a later request.
  This supersedes the historical no-client-images restriction. All assets are local; provenance
  is in `docs/SOURCE_ASSETS.md`. No Masar assets/code were copied.
- No project dependency was added for this enhancement. Keep it that way unless genuinely needed.
- Strict TypeScript and existing disposal conventions; no console noise or leaked canvases.
- Respect reduced motion, keyboard access and RTL. Reposition 3D for layout; don’t mirror geometry
  or official imagery.
- Run `npm run lint`, `npm run build`, `npm run build:pitch` before finishing.
- Review screenshots must be 1920×1080 EN and AR wherever UI is visible, under the phase review
  folder. Review files are gitignored.

## Existing site before this enhancement

Phase 2 already delivered 15 marketing pages: Home, Destination, landmark index, four landmark
pages, Invest, news index, three news stories and three legal placeholders. It has an interactive
SVG district map, accessible front-end-only investment form, official self-hosted concept renders,
blue/gold identity and original 3D Experience links. The stadium interior and tunnel flights work.
Don’t regress these pages. Guided Tour (Phase 6) and broader polish (Phase 7) remain pending.

Stack: Vite 8, TypeScript 6, Three.js 0.187, GSAP 3.15 / ScrollTrigger, plain CSS, hash routing.
Fonts are self-hosted IBM Plex Sans and IBM Plex Sans Arabic. Primary blue `#0076a9` and gold
`#cc9f53` were observed on JCDC’s public website; other brand tokens retain their placeholder status.

## What is implemented now

### Shared atmosphere and native scroll story

Home has one deep Red Sea base with blue/gold light fields, a faint original roshan texture and a
thin horizon contour. The colours blend across chapters; photo and live-scene edges dissolve into
the shared background. The footer shares this atmosphere. There is no wheel interception or
replacement smooth-scroll library.

Desktop normal-motion flow:

1. Short brand/orbit intro, nominally 2.1 seconds. Wheel, touch, keyboard or pointer input skips it
   and completes the title entrance.
2. Official masterplan opening in a 160svh track; the fullscreen hero holds while scroll drives
   the image zoom/parallax and copy departure.
3. Editorial destination overview and the existing approved counters.
4. Pinned horizontal landmark gallery. Native vertical scroll advances the cards. Keyboard focus
   on a card moves the page to its corresponding gallery position.
5. Districts, full original masterplan preview, sustainability, investment/recognition, news.
6. A chapter rail shows progress and jumps to chapters.

Mobile retains a normal vertical landmark grid and a compact progress label. Reduced motion
removes intro, pinning, parallax and reveals; content stays in normal flow and sculptures use
static poses. Runtime reduced-motion changes were tested, not just a cold reduced-motion load.

Supporting marketing pages received a shared paper surface and softened hero endings; their
content/layout were otherwise preserved. Their hero credit was adjusted to remain readable.

### 3D sculptures

One transparent, fixed decorative canvas carries four original design objects:

- coastal folded ribbons;
- a stadium-inspired architectural study;
- terraced district plates and abstract massing;
- a branching coral sculpture.

They are artistic objects, **not official project models**. Warm ivory, brass and deep ink/blue
finishes replace the first overly bright cyan prototype. The ribbon’s large disc base was removed,
and frame continuity was corrected to eliminate torn-looking twists.

Total: **13,988 triangles / 11 material batches across all objects**. Settled chapters render
2–3 draws; adjacent crossfades at most 6. No shadows, bloom or continuous animation loop. The
canvas is capped at 1500×1080 and 1× DPR; the actual desktop canvas measured 1037×842.

The sculpture renderer warms after a **2400ms startup timer**, to avoid interrupting the intro.
It renders when scroll state changes and yields while the heavier full masterplan is visible.
The latter remains lazy-loaded in its own section. Constructor/warm-up and pending timer disposal
are guarded against route changes. No WebGL gives CSS contour ornaments and the existing image
fallback rather than a broken page.

## Exact files and responsibilities

New:

- `src/data/homeJourney.ts` — eight chapter IDs, translated labels, sculpture choice, opacity,
  viewport X/Y positions and blue/gold light strengths. All are visual parameters, not facts.
- `src/pages/marketing/scroll/HomeJourney.ts` — GSAP/matchMedia choreography, intro, progress,
  native-scroll state, responsive hero/gallery pins, card focus handling, WebGL boot and teardown.
- `src/pages/marketing/scroll/HomeSculptures.ts` — Three.js renderer, materials, procedural models,
  compile warm-up, resize and resource disposal. No RAF of its own.
- `src/styles/components/home-journey.css` — unified atmosphere, new Home presentation, sculpture
  stage, intro/progress and responsive/reduced-motion styles.

Changed:

- `src/pages/marketing/Home.ts` — wrappers, chapter IDs/hooks, intro/stage/progress markup.
- `src/pages/marketing/MarketingPage.ts` — binds `bindHomeJourney()` on Home; the old generic Home
  reveal system is excluded to avoid competing transforms. Other marketing pages keep it.
- `src/i18n/en.json`, `ar.json` — 9 new keys under `marketing.scroll.*`.
- `src/styles/index.css` — imports new stylesheet after marketing.css.
- `README.md`, `docs/CODEX_HANDOFF.md` — current implementation notes / review-list updates.

Useful hooks:

```text
.home-journey
.home-journey[data-motion="full"|"reduced"]
[data-scroll-chapter="hero|overview|landmarks|districts|experience|sustainability|invest|news"]
.home-sculptures[data-state="ready"|"fallback"]
.home-sculptures__canvas
.journey-intro[hidden]
.home-landmarks__stage
[data-chapter-link]
```

`HomeSculptures.setState({chapter, progress, visible, rtl, reduced})` does not render automatically.
`chapter` is continuous 0..3 and crossfades adjacent models; `progress` 0..1 adds a small pose sweep.
Root calls `render()` only when needed. Invest keeps model 3; News fades to opacity 0, preventing
an unwanted rapid 3→2→1→0 sequence. Full-scene visibility uses a 128px header clearance so coral
isn’t incorrectly hidden by a sliver of the previous section behind the header.

## Completed verification — actual results

External Playwright is installed at `/tmp/jcd-phase5-qa/node_modules/playwright-core`.
Chrome is `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
Use headful Chrome with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`. Headless RAF can
be misleading on this machine. QA tools are outside the repo, under `/tmp/jcd-home-scroll-qa/`.

### Functional run

`review/home-scroll/checks.json`: **13 scenarios passed**:

- EN/AR desktop chapter layout/captures, no horizontal overflow/broken loaded images;
- scroll cue and main CTA hit targets;
- language changes preserve scroll; native Home/End works;
- mobile 375×812 EN/AR and menu/Escape;
- reduced-motion content and controls EN/AR;
- WebGL-disabled fallback EN/AR;
- continuous native-scroll timing.

Console, page errors and failed requests: **empty**.

`review/home-scroll/final.json`: **8 additional scenarios passed**:

- keyboard reveals all four gallery cards in EN and AR;
- runtime reduced-motion changes remove pins in EN and AR;
- two constructed-scene exits after the deferred-startup change;
- four exits during the startup delay leave zero canvases;
- keyboard skips intro and completes title entrance;
- pitch hides debug and marker text.

Console: **empty**.

### Performance

The final full-page warm native-scroll measurement in `checks.json` was:

- Apple M1 / Chrome Metal; viewport 1920×1080; DPR 1; `quality=high`;
- 12,000.2 ms, 720 frames;
- mean **59.999 fps**, mean frame 16.667 ms, p95 **16.8 ms**, worst **17.7 ms**;
- **zero frames over 33 ms**;
- sculpture render 1037×842; full embedded preview 1920×896.

This is a warmed, 12-second full-page scroll, not a guarantee about every cold startup frame.
No screenshots or second QA browser were running during measurement. The preview height was
reduced from 1040 px to 896 px after an initial run showed five dropped frames; the final run above
is the tier-locked result. Last pose/opacity/footer-only tuning happened after this measurement.

### Disposal

`review/home-scroll/lifecycle-initial.json` contains **16 constructed-scene enter/leave cycles**,
every exit with zero canvases. Forced-GC heap: 9,845,325 bytes initially →10,585,755 last; the final
five samples spanned 54,500 bytes and levelled off. This run preceded moving boot to the 2400 ms
startup timer. The two final constructed exits and four delayed-startup exits above validate the
new timing too. This is JS heap/DOM disposal evidence, not a direct GPU-memory measurement.

### Checks/builds

- `npm run build` passed after the last pose/footer tuning; current `dist/` reflects that tuning.
- `npm run lint` was clean immediately before the last data/CSS-only tuning; run it once finally.
- `npm run build:pitch` passed before those last pose/footer tweaks. **Rebuild pitch at closeout**
  so `dist-pitch/` exactly matches current source.
- `git diff --check` clean at handoff.

Logs:

```text
/tmp/jcd-home-scroll-build.log
/tmp/jcd-home-scroll-lint.log
/tmp/jcd-home-scroll-pitch.log
/tmp/jcd-home-scroll-qa/check.log
/tmp/jcd-home-scroll-qa/final.log
/tmp/jcd-home-scroll-qa/poses.log
```

## Outstanding visual concern — inspect this first

The intro behaviour and skip checks pass, but **the saved `intro-en.png` / `intro-ar.png` stills
look like an empty deep-blue panel with the header**, rather than showing the centre logo/orbit.
Even a capture triggered while computed logo opacity exceeded 0.75 produced this. The visual
intro is therefore **not signed off**. Don’t claim it looks correct based only on DOM assertions.

Investigate actual playback and capture timing. A possible cause worth checking is interpolating
`clip-path: none` to an inset shape using `gsap.to`; give the intro an explicit initial
`clip-path: inset(0% 0% 0% 0%)` or use `fromTo` if appropriate. That cause is a hypothesis, not
confirmed. Also inspect the gap between logo fade-out and wipe completion. Capture a short
sequence of real frames, inspect them, and replace the blank intro stills when fixed.

Other representative renders were inspected: hero, overview, EN/AR gallery, districts,
sustainability and footer. The final coral position was raised so its base no longer overlaps
the sustainability feature headings; the landmark sculpture was dimmed and raised, and News
now has no sculpture to obstruct reading. Full contact-sheet review remains.

## Screenshots and QA script locations

Temporary current output: `review/home-scroll/` (gitignored).
There are 53 PNGs: **48 current paired EN/AR stills**, plus 5 obsolete early `first-*-en.png`
prototypes. Exclude those five prototypes from the final review set.

Current paired bases:

```text
districts, experience, fallback-overview, footer, gallery-enter, gallery-leave,
hero, intro, invest, landmarks, news, opening, overview, pitch, reduced-motion,
supporting-transition, sustainability, transition-hero-overview,
mobile-districts, mobile-hero, mobile-invest, mobile-menu, mobile-overview,
mobile-sustainability
```

Desktop stills are 1920×1080; mobile supplements 375×812. Every base has `-en.png` and `-ar.png`.
`poses.mjs` last refreshed gallery, sustainability, news and footer after final placement tuning.

Scripts:

- `/tmp/jcd-home-scroll-qa/check.mjs` — primary sweep/performance/disposal/mobile/fallback.
  The successful run used `--quick --skip-lifecycle`; the 16-cycle data was preserved separately.
- `/tmp/jcd-home-scroll-qa/final.mjs` — keyboard, runtime preferences, final exit checks, pitch.
- `/tmp/jcd-home-scroll-qa/poses.mjs` — final pose/frame recaptures.
- `/tmp/jcd-home-scroll-qa/contact.mjs` — prepared contact-sheet helper; inspect/adapt its filename
  selection before using. It has not produced a final review sheet yet.

Copies of these scripts and their logs have also been saved under `review/home-scroll/qa/`
so they survive temporary-directory cleanup; the Playwright dependency remains outside the project.

The first QA harness mistakenly waited for `.journey-intro[hidden]` to be _visible_ and timed out.
That was fixed to `waitFor({state:'attached'})`, then the successful final runs above were made.
Do not mistake those earlier harness timeouts for a page crash. Two auxiliary agents later hit
usage limits; an independent static-code-review agent did not deliver a review. Do your own review.

## Next actions, in order

1. Preserve uncommitted changes; inspect the implementation and current browser experience.
2. Investigate/fix the intro visual concern above and inspect genuine rendered frames. Replace
   blank EN/AR intro stills. Also look for caption overlap, clipping, harsh seams or excessive
   texture; fix observed issues, keeping the current direction and budget.
3. Assemble the final screenshots under **`review/phase-2/scroll/`** to follow the project phase
   convention. Copy the 48 current paired files, excluding obsolete `first-*` files; replace any
   frames made stale by your changes. Archive result JSONs and external scripts there as needed.
4. Generate contact sheets and inspect them, particularly Arabic, mobile, gallery transitions,
   the sculptural overlays and footer. Don’t claim screenshots you haven’t looked at.
5. Create **`docs/HOME_SCROLL_REVIEW.md`**: what changed, exact measured numbers with limits,
   honest check results, open items, and **every final screenshot path**. All primary UI views
   need both languages. Existing README/handoff links should then resolve.
6. Run final lint/review build/pitch build and `git diff --check`. Do not rerun the entire long
   QA suite unless changes justify it. For intro-only CSS changes, target intro/reduced-motion/
   skip and relevant screenshots. For lifecycle/render changes, repeat the relevant cycles or
   performance run. Keep results attributable to the code actually measured.
7. Make a **local** commit when this refinement is complete; never push. Report preview links,
   changes, verification, remaining Arabic/native/browser review and screenshot/report links.
8. Stop for the user’s visual review. Do not automatically start Phase 6 Guided Tour or Phase 7.

Open project items after this iteration: native Arabic review (including new vertical chapter
labels), brand manual/dark logo vector, approved legal text/production form service, and planned
Safari/Edge/final accessibility checks. The original map layout remains illustrative and the
context city remains boxy close up. None of these authorises an unrelated redesign now.
