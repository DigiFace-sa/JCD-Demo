# Phase 5 — stadium implementation review

Implementation is ready for visual review. No work on Phase 6 has started. No push was made.

## What changed

- An original, procedural stadium interior: stepped terraces across three tiers, radial aisles,
  vomitory openings, shader-coloured instanced seat-back silhouettes, a marked pitch and goals,
  structural roof trusses, a concourse ring and warm hospitality glazing. No capacity is stated.
- A physical opening in the east facade and a covered passage. The existing podium cap was a
  solid disc above the pitch; it is now an annulus so it no longer conceals the field.
- A position/look-at Catmull–Rom flight lasting about 3.8 seconds. Back to map traverses the
  passage in reverse. Requests cancel the active flight, preserve its actual pose and let only
  the latest request restore UI and controls. Mid-passage replacements use the actual camera
  position to choose a safe route.
- Interior orbit limits, stepped-bowl clearance, constrained stand views and a wider interior
  lens. The panel shifts framing in RTL without mirroring the scene. Reduced motion makes
  flights and lens changes near-instant.
- Six anchored hotspot buttons, bilingual draft descriptions, an Enter CTA and Back to map.
  Hidden markers leave the tab order. The panel fades and becomes inert during flights; Escape
  and the toolbar remain available. Marker visibility accounts for terraces, walls and the
  passage ceiling.
- Validated `#/experience/stadium/inside` and the six hotspot routes: `pitch`, `seating`, `roof`,
  `vip`, `concourse`, `sports-park`. Cold links land directly at the requested viewpoint.
  `#/experience/stadium` remains exterior focus. Other landmarks keep their preview panels.
- Occluded city/water passes are skipped inside. A distant bowl proxy keeps map rendering
  inexpensive. The map and stadium have separately cached static shadow targets, warmed while
  loading and invalidated when shadow resolution changes. Instanced GPU buffers are disposed.
- The Three.js engine and scene code now build as separate lazy chunks, keeping the build free
  of the new chunk-size warning. No project dependency was added.

## Geometry budget

The detailed stadium has **68,520 triangles** and **23 main-pass mesh draws**. Its interior contributes **66,662 triangles / 15 draws**, within the proposed extra-geometry budget. The distant stadium is **2,114 triangles / 9 draws**. These are technical model counts, not a capacity claim. Shadow and post-processing draws are separate.

## Production measurements

Installed Chrome, ANGLE Metal on the Apple M1, 1920×1080, device pixel ratio 1. High was locked
at full resolution. Views settled for five seconds before eight samples at 0.6-second intervals.
No screenshots were taken while measuring. FPS values below average the debug-panel samples;
the sample range and worst frame expose short dips.

| Tier / view        | Mean sampled FPS | Sample range | Worst frame |
| ------------------ | ---------------: | -----------: | ----------: |
| high / inside      |             59.8 |    58.0–60.1 |     33.3 ms |
| high / pitch       |             60.0 |    60.0–60.1 |     17.7 ms |
| high / seating     |             60.0 |    60.0–60.0 |     17.8 ms |
| high / roof        |             60.0 |    59.9–60.1 |     17.7 ms |
| high / vip         |             60.0 |    60.0–60.0 |     17.8 ms |
| high / concourse   |             60.0 |    59.9–60.1 |     17.8 ms |
| high / sports-park |             59.0 |    52.0–60.0 |     34.3 ms |
| high / map         |             60.0 |    60.0–60.0 |     17.7 ms |
| medium / inside    |             60.1 |    60.1–60.1 |     17.7 ms |
| low / inside       |             60.0 |    60.0–60.0 |     17.8 ms |

Flight samples include a settling period after the flight so arrival costs are counted.

| Run / move | Average FPS | 95th percentile frame | Worst frame |
| ---------- | ----------: | --------------------: | ----------: |
| 1 / inside |        59.8 |               18.6 ms |     32.7 ms |
| 1 / map    |        58.9 |               18.6 ms |     34.2 ms |
| 2 / inside |        59.3 |               18.6 ms |     33.5 ms |
| 2 / map    |        60.0 |               18.7 ms |     18.8 ms |

**Performance qualification:** typical playback is around 60 fps, but this is not a locked-60
claim. Short stationary sample windows dipped below the target and isolated flight frames took
about 33–34 ms. A live TV rehearsal and further headroom remain open. An earlier first-return
run reached 116 ms; prewarming and cached shadow targets removed that large spike from the final
measurements. Raw samples are in `review/phase-5/performance.json`.

## Disposal and robustness

**18 full enter/leave cycles**, plus **5 rapid mid-load cycles**. Every full cycle left **zero canvases**. After waiting for the router fade to complete and forcing GC in separate tasks, the last five heap samples were **8.04–8.09 MB**. The measurements levelled off after warm-up. Heap measurements do not constitute a direct VRAM measurement. Both cached shadow targets are explicitly disposed with the scene.

- Rapid hash changes settle at the last interior request.
- Exit reversal settles at roof.
- Language switch preserves current hotspot.
- Collapse and Escape return work.
- Cold hotspot deep link opens immediately.
- Interior keyboard orbit and zoom stay responsive.
- Invalid hotspot and non-stadium hotspot URLs show 404.
- 520×900 Arabic interior has no horizontal overflow.
- Keyboard activation of anchored pitch marker.
- Flight-hidden markers leave the tab order.
- Rapid concourse replacement reaches final pitch request.
- Repeated stand orbit stays inside the bowl safety envelope.
- Reduced-motion entry completes in 15 ms.
- Pitch launcher: no debug, placeholder markers or external requests.
- WebGL-disabled launch reached `data-state="fallback"`.
- `npm run lint`, `npm run build` and `npm run build:pitch`: passed, with no final warnings.
- Normal and pitch QA console: clean.

The first QA harness run hit `strict mode violation: locator('.lang-toggle') resolved to 2
elements`; scoping the selector to `.experience` corrected it. A frozen-frame capture initially
timed out because its poller also used requestAnimationFrame; timer polling corrected the capture.
These harness failures are not hidden as successful checks.

## Open items and limits

- Strict 60 fps on every frame is not yet demonstrated; the short dips above remain visible in
  the measurements. Repeat on the actual TV before the pitch.
- The geometry is an illustrative original, not an official stadium design. An official GLB
  needs matching passage waypoints, dimensions and collision profiles before replacing it.
- Every Arabic addition and every hotspot narrative needs native/client approval; the README
  review list is updated. Capacity remains omitted.
- Mobile is functional, with a bottom sheet; portrait framing remains a polish item.
- Safari, Edge and a physical-TV rehearsal were not run in this phase. Guided Tour, marketing
  pages and the remaining polish are still scheduled for their later phases.
- `npm install` reported 12 moderate dependency vulnerabilities. No forced dependency upgrade
  was applied as part of the stadium work.

## Review screenshots

All required stills below are 1920×1080. They were inspected locally, including contact sheets.
The mid-flight stills freeze actual rendered frames. Artifacts stay in the gitignored `review/`
folder; the local source commit does not contain the PNGs.

| View                | English                                                                                                              | Arabic                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Exterior approach   | [review/phase-5/exterior-approach-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/exterior-approach-en.png)     | [review/phase-5/exterior-approach-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/exterior-approach-ar.png)     |
| Mid-tunnel          | [review/phase-5/mid-tunnel-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/mid-tunnel-en.png)                   | [review/phase-5/mid-tunnel-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/mid-tunnel-ar.png)                   |
| Bowl arrival        | [review/phase-5/bowl-arrival-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/bowl-arrival-en.png)               | [review/phase-5/bowl-arrival-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/bowl-arrival-ar.png)               |
| Pitch               | [review/phase-5/hotspot-pitch-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-pitch-en.png)             | [review/phase-5/hotspot-pitch-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-pitch-ar.png)             |
| Seating Bowl        | [review/phase-5/hotspot-seating-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-seating-en.png)         | [review/phase-5/hotspot-seating-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-seating-ar.png)         |
| Roof                | [review/phase-5/hotspot-roof-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-roof-en.png)               | [review/phase-5/hotspot-roof-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-roof-ar.png)               |
| VIP & Hospitality   | [review/phase-5/hotspot-vip-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-vip-en.png)                 | [review/phase-5/hotspot-vip-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-vip-ar.png)                 |
| Concourse           | [review/phase-5/hotspot-concourse-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-concourse-en.png)     | [review/phase-5/hotspot-concourse-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-concourse-ar.png)     |
| Sports Park         | [review/phase-5/hotspot-sports-park-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-sports-park-en.png) | [review/phase-5/hotspot-sports-park-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/hotspot-sports-park-ar.png) |
| Back to map, midway | [review/phase-5/back-to-map-midway-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/back-to-map-midway-en.png)   | [review/phase-5/back-to-map-midway-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/back-to-map-midway-ar.png)   |

Supplementary screenshots:

- [review/phase-5/contact-en.png](/Users/trqorganji/Desktop/JCD/review/phase-5/contact-en.png) — 1920×1080 contact sheet.
- [review/phase-5/contact-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/contact-ar.png) — 1920×1080 contact sheet.
- [review/phase-5/mobile-ar.png](/Users/trqorganji/Desktop/JCD/review/phase-5/mobile-ar.png) — 520×900.

Raw evidence and replay scripts: `review/phase-5/{performance,leaks,validation,additional,geometry,stills}.json`
and `review/phase-5/qa/`. Playwright remains outside the project in `/tmp/jcd-phase5-qa`.

Next phase: Guided Tour, after the user’s review and explicit go-ahead.
