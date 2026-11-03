# Cinematic rebuild: plan

Status: **R0, R1 and R2 complete. R2 awaits the user's visual review; the local phase commit records this completion.**

Claude completed R0 in `e057133` and R1 in `764fa6d`, then stopped while refining the React Home.
Codex completed the implementation refinements and validation. The canonical
[R2_HOME_REVIEW.md](R2_HOME_REVIEW.md) supplies verified checks, performance measurements,
screenshots and remaining issues. Visual sign-off belongs to the user; R3 starts only after
their go-ahead. Performance numbers belong in that evidence report rather than this plan.
`HOME_SCROLL_REVIEW.md` is a completed historical report for the superseded vanilla Home with
sculptures; it is not the current Home report.

## Direction

The client feedback was that floating decorative objects look unprofessional. The site must
be cinematic, smooth and premium, and must show the real architecture JCDC is building. Every
element animates in and out, and sections hand over to each other like film cuts, not page
scrolls.

**Decisions taken (by the user):**

- **React:** the whole app moves to React.
- **Smooth scroll:** Lenis.
- **Imagery:** official JCDC renders only.
- **3D Experience:** kept as it is (placeholder landmarks), to be replaced when official 3D files
  arrive.

## Principles

1. **Official architecture on the marketing site.** Use JCDC's official architectural concept
   renders, self-hosted for offline use. These are not photographs of completed buildings.
   Floating decorative sculptures are removed. The existing illustrative 3D Experience is
   retained separately until official model files arrive.
2. **One motion language.** A small set of primitives, used consistently. There are no one-off
   effects and nothing "floating here and there."
3. **Intro, hold, outro for everything.** Text, images and UI enter as they arrive, hold while
   read, and leave as the next content takes over. All of it is scrubbed to scroll, so it
   reverses perfectly when scrolling back up.
4. **Cinema pacing.** Slow, weighted easing. One idea per screen. Generous dwell time.
5. **Performance is a feature.** 60 fps at 1080p on the pitch M1, measured, not assumed.
   Animate transform, opacity and clip-path only. Blur appears only where it was measured.
6. **Bilingual by construction.** RTL mirrors the layout and motion direction. Arabic text
   animates by word, never by letter.

## Stack

| Layer         | Choice                                                                            | Why                                                               |
| ------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| UI            | React 19 + TypeScript strict, Vite                                                | Requested; component model for scenes                             |
| Animation     | GSAP 3.15 + `@gsap/react` (`useGSAP`), ScrollTrigger, SplitText                   | Already in use; `useGSAP` handles cleanup                         |
| Smooth scroll | Lenis, driven from GSAP's ticker                                                  | Approved; inertial scroll synced with ScrollTrigger               |
| Routing       | `react-router` HashRouter                                                         | Standard; keeps hash URLs (offline and pitch-safe) and deep links |
| i18n          | Existing `en.json`/`ar.json` + typed `t()`, exposed through a `useI18n()` context | No rewrite of copy; language switch re-renders                    |
| 3D            | Existing Three.js `Experience` hosted by `LegacyPage` in `src/app/RouteView.tsx`  | Reused, not rewritten                                             |
| Styling       | Existing tokens and CSS (scoped per component)                                    | Brand tokens stay the single source                               |

**Approved dependency migration:** `react`, `react-dom`, `@vitejs/plugin-react`, `@gsap/react`,
`lenis` and `react-router` are installed under R0. R1 adds the development image processor
`sharp`. This user approval supersedes the old native-only/no-new-dependency guidance; it does
not authorise unrelated additions.

## Motion system (the primitives)

| Current primitive          | Intro                                                      | Outro                                         |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `<SceneStack>` / `<Scene>` | Pinned full-screen stage and shared scrubbed timeline      | Hands over to the next scene via a transition |
| `data-motion="heading"`    | Letters (EN) or words (AR) rise from line masks            | Lift out and fade                             |
| `data-motion="lines"`      | Body copy unveils line by line                             | Fades and drifts up                           |
| `data-motion="image"`      | Official render opens from a clipped frame and slight zoom | Drifts and fades as it leaves                 |
| `data-depth`               | Optional layers move at different rates within a scene     | —                                             |
| `data-motion="counter"`    | Approved quantities count up; dates rise without counting  | Leaves with its scene                         |
| `<Reveal>`                 | Shared motion for normal-flow sections                     | Scrubbed exit near the viewport top           |

These tags and their timings are defined in `src/motion/choreography.ts`; there are no separate
`SplitHeading`, `RevealLines`, `CinemaImage`, `Parallax` or `Counter` React components.

**Scene transitions,** a small consistent set:

- **Dissolve-through:** the outgoing scene scales back to about 0.92, darkens and loses
  contrast. The incoming scene opens from a thin horizontal light line (the "horizon") expanding
  to full screen. This is the default cut.
- **Zoom-through:** the camera pushes into one part of the current render (for example the
  stadium in the masterplan) until it fills the screen, cutting to that landmark's own render.
  Used for masterplan → landmarks.
- **Wipe with scan line:** a thin gold scan line sweeps across and reveals the next scene behind
  it, a futuristic accent. Used sparingly, at chapter boundaries.

Reduced motion removes pinning, scrubbing and the opening animation. Narrow screens also use
normal flow, retaining every description and figure. Live preference changes explicitly clear
manual reveal transforms and inactive `inert` states. Verified behavior belongs in the R2 review.

## Home storyboard (14 scenes across 16 timeline units)

| #    | Scene                           | Render(s)                                        | Motion                                                                                            |
| ---- | ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| —    | Session opening                 | Official logo                                    | The logo resolves on a horizon line; any input skips it                                           |
| 1    | The destination                 | Masterplan aerial                                | Slow camera push; the title splits in; on scroll the title lifts out and the camera keeps pushing |
| 2    | A waterfront city               | Waterfront                                       | Zoom-through; approved stats count up over the render                                             |
| 3–4  | Stadium exterior and detail     | Stadium aerial, seating bowl                     | Scan-line wipe, then zoom-through                                                                 |
| 5–6  | Opera House exterior and detail | Opera House, rehearsal theatre                   | Horizon openings                                                                                  |
| 7–8  | Oceanarium exterior and detail  | Night exterior, vortex exhibit                   | Scan-line wipe, then horizon opening                                                              |
| 9–10 | Museum exterior and detail      | Museum, Makers' Souk public forum                | Horizon openings                                                                                  |
| 11   | Six districts                   | Hub background and six official district renders | Scan-line wipe; linked horizontal filmstrip across three timeline units                           |
| 12   | Sustainability                  | Sustainability, Ribbon Park and coral exhibits   | Horizon opening; two depth layers, public realm figure and pillars                                |
| 13   | 3D Experience invitation        | Stadium night exterior                           | Horizon opening; link to the retained Experience                                                  |
| 14   | Invest and recognition          | Marina at sunset                                 | Scan-line wipe; CTA and recognition list                                                          |
| —    | News and footer                 | Local official imagery                           | Normal-flow editorial reveals after the pinned stage                                              |

The district chapter has six linked official-image cards; keyboard focus positions the filmstrip
to reveal the selected card. Its three-unit duration makes the 14 scenes span 16 units in total.
Sustainability adds Ribbon Park and coral exhibit images at separate parallax depths.

Previous/Next scene controls stay in the tab order with a spoken scene status. Active/inert
state follows the rendered master timeline, including scrub smoothing. Mobile normal flow and
live reduced-motion teardown retain every description, figure and district link. Final checks,
performance numbers and limitations are supplied by the R2 review rather than inferred here.

Mobile uses a solid header, and mobile/reduced-motion normal-flow scenes deepen image shading
behind their complete copy. Desktop cinema header styling ends with the pinned stage, keeping
the later News/footer and other routes on their normal header treatment.

## Phases (stop and report after each, with EN/AR stills)

- **R0 Foundations — complete, `e057133`.**
  - React and Vite migration, Lenis + ScrollTrigger integration, router, i18n context,
    header/footer shell, and the 3D Experience wrapper (working exactly as now).
  - Motion primitives on a hidden `#/lab` route; historical review stills in `review/phase-R0/`.
  - Remove the sculptures.
- **R1 Official assets — complete, `764fa6d`.**
  - Collected 39 official renders from the jeddahcentral.com landmark and district pages, with
    provenance in `docs/SOURCE_ASSETS.md`.
  - Responsive AVIF sizes (1280 / 1920 / 2560 where the source supports them), native-width
    variants and a WebP fallback; `npm run images` regenerates the library without upscaling.
- **R2 Home — complete; awaiting user visual review.** Implementation and validation cover
  EN/AR scenes, keyboard navigation, language changes, live reduced motion, mobile content,
  routing/lifecycle, pitch/offline behavior and fallback. `R2_HOME_REVIEW.md` is the canonical
  evidence record; the local phase commit records this completion. R3 requires the user's go-ahead.
- **R3 Other pages — pending.** Destination (with the district map), the four landmark pages, Invest
  (with the form), News, and Legal, on the same system.
- **R4 Hardening — pending.**
  - Performance (fps traces of every transition), accessibility, keyboard and focus inside
    pinned scenes, reduced motion, RTL, mobile and the pitch build.
  - Delete the legacy vanilla marketing code.

The Guided Tour (Phase 6) follows after R4.

Keep the existing phase rules: local commit only when a phase is complete, never push or
publish, save relevant 1920×1080 UI stills in both English and Arabic under the phase review
folder, report actual checks and limitations, then wait for the user's visual review. Retain
the offline pitch, Apple M1/1080p budget, typed bilingual copy and Arabic review list.

## Risks and how they're handled

- **Image weight.** Full-screen renders are heavy. Mitigation: responsive sizes, lazy loading
  with preloading of the next scene, and decode before reveal.
- **Long pinned pages and accessibility.** Mitigation: the chapter navigation, the keyboard
  moving between scenes, and correct focus.
- **Smooth scroll vs native expectations.** Lenis keeps native scrollbars and keyboard and
  anchor behaviour, and is disabled under reduced motion.
- **Migration regressions.** The 3D Experience is wrapped, not rewritten. The old pages stay
  until each React page reaches parity.
