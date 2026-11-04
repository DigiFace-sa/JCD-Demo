# Beach and Central close views — review

5 November 2026. This phase builds on the approved 3D work in `fa58b0c`.

## Result

The Beach and Central district panels now offer **Take a closer look**. The overview also lists
both close views, and their 3D markers appear while approaching the districts. Shareable links:

- `#/experience/places/beach-promenade`
- `#/experience/places/central-square`

The beach has a timber promenade, shaded loungers, benches, planted palms, inland gardens,
open timber pavilions and a small walking crowd. Central has a paved square, planted seating,
slatted arcades, glazed frontage, table clusters, a shallow reflective rill and pedestrians.
Warm, restrained lighting supports both spaces after dark.

These are original, illustrative public-space designs. They are not confirmed amenities or
additional official attractions. Narrative copy is marked as draft in both languages.

## Interaction and implementation

- Zoom, orbit and pan work inside safe local envelopes. Central's eye position stays within
  the reserved square, keeping neighbouring towers out of the line of sight; portrait framing
  is higher. Beach navigation stays clear of inland building footprints.
- Panel collapse and language switching preserve the user's zoom and orbit while compensating
  for the covered side of the screen. Ground clicks inside close views keep the current view;
  users return through Back to district, Back to map, Escape or browser navigation.
- Close-view transitions use a sampled aerial Bézier arc, lifting above the urban fabric before
  descending into the destination. The final pose is constrained before the flight, keeping
  the arrival continuous. Repeated requests cancel through the existing camera director.
  Transitional limits retain a
  close starting radius, so returning to the map does not snap to the map's zoom minimum.
- Furniture and pedestrians use instancing. Local furniture is culled beyond its useful viewing
  distance; crowds update near the camera and freeze under reduced motion. Character geometry
  is intentionally simple at architectural-model scale.
- Building/planting reservations and the ground-cover field share the new pockets. Existing
  Blender vegetation supplies the planted trees and palms.
- A separate static shadow target sharpens close views without overwriting the map/stadium
  caches. It refits on arrival, never continuously during orbit.
- The sea now uses a modest grid rather than a single enormous quad. A close-view/return test
  exposed clipping artifacts on Metal; subdivision removed them with one draw call retained.

Editing: `src/data/places.ts` owns the close-view content structure and framing;
`src/experience/config/publicRealm.ts` owns footprint/limit values;
`src/experience/world/masterplan/PublicRealm.ts` builds the illustrative detail.
All new UI copy is in `places.*` in both translation files; native review is flagged in README.

## Validation

- Both district CTAs enter close views; Back returns to parent district; Escape returns to map.
- Keyboard Enter activates close-view list item.
- Language switch preserves close view and translates panel; night switch completes.
- Pixel comparison: pedestrians animate, then freeze under reduced motion.
- Rapid stadium/place navigation settles at the final request.
- Close zoom/tilt remains above the camera floor.
- Five map/place/stadium flights sampled on High at 1080p.
- 16 alternating close-view enter/leave cycles: no Experience canvas after exit.
- Unknown close-view id falls through to 404.
- Pitch EN/AR close links: no debug, review note or draft markers.

Console/page errors: clean.
Capture requests: clean.

Mixed navigation sampling (includes interrupted stadium legs): 1499 frames, 16.67 ms average, 17.3 ms p95, 17.8 ms worst.

Five additional completed routes were checked at 520×900 in Arabic, including both stadium
portal directions: no camera samples inside masterplan building footprints below roof height.

- `places/central-square`: 227 frames, 16.67 ms average, 17.7 ms worst.
- `map`: 230 frames, 16.67 ms average, 17.8 ms worst.
- `places/beach-promenade`: 230 frames, 16.66 ms average, 17.8 ms worst.
- `stadium/inside`: 457 frames, 16.67 ms average, 17.7 ms worst.
- `places/central-square`: 455 frames, 16.67 ms average, 17.7 ms worst.

Forced-GC JS heap, final eight exit cycles: 51.4–58.0 MB. This does not measure total process/GPU memory.

Stationary samples use production review builds, installed Chrome/Metal on Apple M1,
High locked, DPR 1, 1920×1080. Values below are eight debug-panel windows per view after settling.

| View                         | FPS range | Draw calls | Triangles |
| ---------------------------- | --------- | ---------- | --------- |
| beach-promenade-day          | 59.9–60.1 | 145        | 830k      |
| beach-promenade-detail-day   | 60.0–60.1 | 134        | 739k      |
| central-square-day           | 59.9–60.1 | 92         | 570k      |
| central-square-detail-day    | 60.0–60.0 | 85         | 551k      |
| overview-day                 | 60.0–60.1 | 85         | 590k      |
| beach-promenade-night        | 45.9–60.0 | 146        | 831k      |
| beach-promenade-detail-night | 60.0–60.0 | 135        | 740k      |
| central-square-night         | 58.0–60.0 | 94         | 571k      |
| central-square-detail-night  | 50.0–60.1 | 87         | 552k      |
| overview-night               | 52.0–56.2 | 86         | 590k      |

The three contact sheets and full-size close/mobile views were visually inspected. Central's
arrival is clear, the returned overview has a clean sea horizon, and the bilingual panels fit
the captured viewports. These remain stylised architectural views, not photorealistic assets.

Checks: `npm run lint`, `npm run build`, `npm run build:pitch` and `git diff --check`.

QA initially found an occluded Central Arabic/mobile arrival, a sea clipping artifact on return,
a close-radius snap on exit and a flight crossing a tower. The final camera envelope, segmented
sea, transitional limits and aerial arcs address these cases. Mobile captures now wait for the
actual flight to settle rather than relying on a fixed delay. Diagnostic captures are kept under `review/phase-3d-life/qa/`.

## Performance repeats and limits

The capture pass included slower night samples. They are retained in the table above rather
than discarded. An isolated repeat measured Central detail at 59.9–60.1 fps, Beach at
42.6–60.1 fps and the overview at 40.6–58.0 fps. The additional mobile route test held about
60 fps on every completed route. This does not establish sustained 60 fps for every desktop run.

A same-session A/B check against the previous committed build (`fa58b0c`) follows below. Both
use the same overview, Night, High, DPR 1 and Chrome/Metal. Raw evidence is in `compare.json`;
there is no adaptive quality reduction in these measurements.

| Build    | Raw-frame average | p95     | Worst   |
| -------- | ----------------- | ------- | ------- |
| baseline | 19.20 ms          | 33.4 ms | 50.3 ms |
| current  | 18.97 ms          | 33.4 ms | 50.0 ms |
| baseline | 19.23 ms          | 33.4 ms | 50.3 ms |
| current  | 19.01 ms          | 33.4 ms | 50.1 ms |

## Open review items

- Client visual review of the new spaces; their layouts and furniture remain illustrative.
- Sustained pitch-hardware performance: the final desktop night runs varied, including on the
  previous committed build. Validate with the connected TV and normal presentation workload.
- Native Arabic review, including close-view narrative and controls.
- Safari/Edge, real touch hardware and the connected TV remain untested in this pass.
- Pedestrians and surrounding city massing retain the simplified architectural-preview style.
- Guided Tour remains a separate phase.

## Review screenshots

Desktop: 1920×1080, EN/AR, Day/Night. Mobile: 520×900, EN/AR, Night. Files are local and gitignored.

- [review/phase-3d-life/beach-promenade-day-ar.png](../review/phase-3d-life/beach-promenade-day-ar.png)
- [review/phase-3d-life/beach-promenade-day-en.png](../review/phase-3d-life/beach-promenade-day-en.png)
- [review/phase-3d-life/beach-promenade-detail-day-ar.png](../review/phase-3d-life/beach-promenade-detail-day-ar.png)
- [review/phase-3d-life/beach-promenade-detail-day-en.png](../review/phase-3d-life/beach-promenade-detail-day-en.png)
- [review/phase-3d-life/beach-promenade-detail-night-ar.png](../review/phase-3d-life/beach-promenade-detail-night-ar.png)
- [review/phase-3d-life/beach-promenade-detail-night-en.png](../review/phase-3d-life/beach-promenade-detail-night-en.png)
- [review/phase-3d-life/beach-promenade-mobile-ar.png](../review/phase-3d-life/beach-promenade-mobile-ar.png)
- [review/phase-3d-life/beach-promenade-mobile-en.png](../review/phase-3d-life/beach-promenade-mobile-en.png)
- [review/phase-3d-life/beach-promenade-night-ar.png](../review/phase-3d-life/beach-promenade-night-ar.png)
- [review/phase-3d-life/beach-promenade-night-en.png](../review/phase-3d-life/beach-promenade-night-en.png)
- [review/phase-3d-life/central-square-day-ar.png](../review/phase-3d-life/central-square-day-ar.png)
- [review/phase-3d-life/central-square-day-en.png](../review/phase-3d-life/central-square-day-en.png)
- [review/phase-3d-life/central-square-detail-day-ar.png](../review/phase-3d-life/central-square-detail-day-ar.png)
- [review/phase-3d-life/central-square-detail-day-en.png](../review/phase-3d-life/central-square-detail-day-en.png)
- [review/phase-3d-life/central-square-detail-night-ar.png](../review/phase-3d-life/central-square-detail-night-ar.png)
- [review/phase-3d-life/central-square-detail-night-en.png](../review/phase-3d-life/central-square-detail-night-en.png)
- [review/phase-3d-life/central-square-mobile-ar.png](../review/phase-3d-life/central-square-mobile-ar.png)
- [review/phase-3d-life/central-square-mobile-en.png](../review/phase-3d-life/central-square-mobile-en.png)
- [review/phase-3d-life/central-square-night-ar.png](../review/phase-3d-life/central-square-night-ar.png)
- [review/phase-3d-life/central-square-night-en.png](../review/phase-3d-life/central-square-night-en.png)
- [review/phase-3d-life/contact-01.png](../review/phase-3d-life/contact-01.png)
- [review/phase-3d-life/contact-02.png](../review/phase-3d-life/contact-02.png)
- [review/phase-3d-life/contact-03.png](../review/phase-3d-life/contact-03.png)
- [review/phase-3d-life/overview-day-ar.png](../review/phase-3d-life/overview-day-ar.png)
- [review/phase-3d-life/overview-day-en.png](../review/phase-3d-life/overview-day-en.png)
- [review/phase-3d-life/overview-night-ar.png](../review/phase-3d-life/overview-night-ar.png)
- [review/phase-3d-life/overview-night-en.png](../review/phase-3d-life/overview-night-en.png)

Raw evidence and runnable scripts are archived under `review/phase-3d-life/qa/`.
