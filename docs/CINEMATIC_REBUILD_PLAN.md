# Cinematic rebuild: plan

Status: **proposed. Awaiting approval before any code changes.**

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

1. **Only real architecture.** Every building on screen is an official JCDC render. The
   procedural sculptures and decorative ornaments are removed. No invented imagery, no fake 3D
   replicas.
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

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript strict, Vite | Requested; component model for scenes |
| Animation | GSAP 3.15 + `@gsap/react` (`useGSAP`), ScrollTrigger, SplitText | Already in use; `useGSAP` handles cleanup |
| Smooth scroll | Lenis, driven from GSAP's ticker | Approved; inertial scroll synced with ScrollTrigger |
| Routing | `react-router` HashRouter | Standard; keeps hash URLs (offline and pitch-safe) and deep links |
| i18n | Existing `en.json`/`ar.json` + typed `t()`, exposed through a `useI18n()` context | No rewrite of copy; language switch re-renders |
| 3D | Existing Three.js `Experience` mounted by an `<ExperienceRoute>` wrapper | Reused, not rewritten |
| Styling | Existing tokens and CSS (scoped per component) | Brand tokens stay the single source |

**New dependencies:** `react`, `react-dom`, `@vitejs/plugin-react`, `@gsap/react`, `lenis` and
`react-router`. Each one is justified above.

## Motion system (the primitives)

| Primitive | Intro | Outro |
|---|---|---|
| `<Scene>` | Pinned full-screen stage that owns a scroll timeline (0–1) | Hands over to the next scene via a transition |
| `<SplitHeading>` | Letters (EN) or words (AR) rise from line masks | Lift out upward through the mask |
| `<RevealLines>` | Body copy unveils line by line | Fades and drifts up |
| `<CinemaImage>` | Official render opens from a clipped frame, settling from 1.15× | Continues drifting (parallax), then scales and dims as the scene exits |
| `<Parallax>` | Depth layers move at different rates within a scene | — |
| `<Counter>` | Approved figures count up | Hold |

**Scene transitions,** a small consistent set:

- **Dissolve-through:** the outgoing scene scales back to about 0.92, darkens and loses
  contrast. The incoming scene opens from a thin horizontal light line (the "horizon") expanding
  to full screen. This is the default cut.
- **Zoom-through:** the camera pushes into one part of the current render (for example the
  stadium in the masterplan) until it fills the screen, cutting to that landmark's own render.
  Used for masterplan → landmarks.
- **Wipe with scan line:** a thin gold scan line sweeps across and reveals the next scene behind
  it, a futuristic accent. Used sparingly, at chapter boundaries.

Reduced motion means no pinning or scrubbing, with simple fades; content stays readable in
normal flow. Every primitive implements both modes.

## Home storyboard (all imagery official)

| # | Scene | Render(s) | Motion |
|---|---|---|---|
| 0 | Intro | Official logo | The logo resolves on a horizon line, which opens into scene 1 |
| 1 | The destination | Masterplan aerial | Slow camera push; the title splits in; on scroll the title lifts out and the camera keeps pushing |
| 2 | A waterfront city | Waterfront | Dissolve-through; approved stats count up over the render |
| 3–6 | Four landmarks | Stadium, Opera House, Oceanarium, Museum | Zoom-through from the masterplan, then one full-screen scene per landmark (render, name, one-line story, links); dissolve between them |
| 7 | Six districts | Official district renders | Horizontal filmstrip within a pinned scene; each district enters and exits |
| 8 | Sustainability | Ribbon park, coral, sustainability hero | Layered parallax; the 40% public realm figure |
| 9 | Invest | Marina at sunset | Wipe with scan line; CTA |
| 10 | News and footer | News imagery | Calm editorial reveals; the footer settles in |

## Phases (stop and report after each, with EN/AR stills)

- **R0 Foundations.**
  - React and Vite migration, Lenis + ScrollTrigger integration, router, i18n context,
    header/footer shell, and the 3D Experience wrapper (working exactly as now).
  - Build the motion primitives on a hidden `#/lab` route to prove each one at 60 fps.
  - Remove the sculptures.
- **R1 Official assets.**
  - Collect more official renders from the jeddahcentral.com landmark and district pages, with
    provenance in `docs/SOURCE_ASSETS.md`.
  - Generate responsive AVIF/WebP sizes (1280 / 1920 / 2560) and preload the next scene.
- **R2 Home.** The full cinematic storyboard above.
- **R3 Other pages.** Destination (with the district map), the four landmark pages, Invest
  (with the form), News, and Legal, on the same system.
- **R4 Hardening.**
  - Performance (fps traces of every transition), accessibility, keyboard and focus inside
    pinned scenes, reduced motion, RTL, mobile and the pitch build.
  - Delete the legacy vanilla marketing code.

The Guided Tour (Phase 6) follows after R4.

## Risks and how they're handled

- **Image weight.** Full-screen renders are heavy. Mitigation: responsive sizes, lazy loading
  with preloading of the next scene, and decode before reveal.
- **Long pinned pages and accessibility.** Mitigation: the chapter navigation, the keyboard
  moving between scenes, and correct focus.
- **Smooth scroll vs native expectations.** Lenis keeps native scrollbars and keyboard and
  anchor behaviour, and is disabled under reduced motion.
- **Migration regressions.** The 3D Experience is wrapped, not rewritten. The old pages stay
  until each React page reaches parity.
