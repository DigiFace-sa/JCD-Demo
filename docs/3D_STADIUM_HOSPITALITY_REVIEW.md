# Stadium hospitality and pitch clarity — review

5 November 2026. Continues the approved stadium and the Blender public-space kit in `7fabbb1`.

## Result and how to explore

Selecting **VIP & Hospitality** now enters an original Blender lounge with upholstered sofas
and armchairs, stone tables, rugs, a timber bar, planting, pendants and cove lighting. Drag or
use arrow keys to look around from the indoor viewpoint; scroll/pinch zooms the lens. The eye
stays fixed, keeping the user clear of furniture and walls. **View the pitch** returns through
the open sliding bay to the field.

The pitch has a sharper colour texture, finer turf detail, clearer markings and round Blender
goal frames with side/roof/back net surfaces. The broadside viewpoint makes the field easier
to read. Shift-drag or two fingers can pan along it; closer zoom supports examining either end.

- Room: `#/experience/stadium/vip`
- Field: `#/experience/stadium/pitch`
- Bowl: `#/experience/stadium/inside`

The room is an illustrative design. Its geometry does not establish approved JCDC amenities,
seating capacity or official architecture. Existing narrative draft markers and the review-only
provenance note remain in place. No new destination facts were added.

## Model and implementation

The GLB contains **38,680 template triangles**, **12 parts**, and **239,340 bytes**. The goal frame/net pair is placed at both ends.

- Generator: `scripts/blender/stadium_lounge.py`. Output: `public/models/stadium-interior.glb`.
  It reuses the public-space geometry/bake helpers, now import-safe and configurable. The
  separate public-space GLB was not regenerated or changed in this phase.
- `StadiumDetails.ts` assigns self-hosted PBR materials and uses baked linear vertex-colour AO.
  Glazing remains very light so the field view stays clear; a sliding bay is left open for entry.
- `VIP_LOUNGE` and `VIP_PASSAGE` in the stadium config align the room, terrace opening and
  doorway flight. The west hospitality strip and a local section of the upper rows are removed
  where the room replaces them, rather than intersecting furniture with the old bowl.
- `Controls.fixedEye` steers the gaze instead of moving the eye. The room's zoom changes FOV;
  its close near plane restores on exit. Normal orbit/pan remains available over the pitch.
- `StadiumNavigation` classifies the actual room position as well as the last completed zone,
  so interrupted exit requests still use the doorway. Immediate map resets clear room state.
- The field colour texture is 2048 px wide; the repeating normal map is small and independent
  of the markings. Existing playing-field footprint conventions are retained. Goals use curved
  frames and filtered shader threads, avoiding dense rope geometry.
- Async room/goal loading joins the stadium's ready promise. Disposing during a pending model
  request releases the eventual model; leaving also frees its geometry, materials and context.
- The shared primary panel link restores **Enter the stadium** on the exterior after a room
  visit. New functional strings are in both JSON files; native Arabic review is flagged in README.

## Validation

- VIP look-around rotates the gaze, zoom narrows FOV, eye stays fixed and near plane is 0.08 m.
- Live Arabic and night switches preserve the room eye.
- View the pitch exits through the suite doorway and restores the bowl near plane.
- All VIP/bowl/roof/concourse/park transitions and Back to map settle.
- Immediate map reset from VIP does not leave stale room state.
- Rapid room, hotspot and public-space requests settle at the final VIP request.
- Low/Medium/High switching inside the room completes.
- Reduced-motion VIP/Pitch navigation completes.
- Four completed room/field flights sampled on High at 1080p.
- 16 enter/leave cycles: no Experience canvas after exit; forced-GC heaps recorded.
- Leaving during a delayed lounge GLB does not revive the scene.
- Pitch EN/AR room links omit debug/review/draft markers and show the field CTA.
- Pitch keyboard pan travelled 46.5 m and close zoom stayed above ground.
- Exterior Enter the stadium CTA restores its inside link after a VIP visit.

Final `npm run lint`, `npm run build`, `npm run build:pitch` and `git diff --check`: passed.
Console/page errors: clean.
Capture requests: clean.

Four completed room/field flights, High, 1080p: **879 frames**, **16.93 ms average**, **17.7 ms p95**, **34.4 ms worst**. These were sampled after the live Arabic/Night switches.

Forced-GC JS heap over the final eight exit cycles: **107.9–117.4 MB**, without sustained growth. The QA helper retains the last disposed instance for inspection. This is not a total process/GPU memory measurement.

Stationary production-build samples use installed Chrome/Metal on Apple M1, High locked,
1920×1080, DPR 1. Each row contains eight debug-panel windows after settling:

| View        | FPS range | Draw calls | Triangles |
| ----------- | --------- | ---------- | --------- |
| vip-day     | 42.0–56.0 | 55         | 213k      |
| pitch-day   | 59.8–60.2 | 61         | 214k      |
| vip-night   | 47.9–60.2 | 55         | 213k      |
| pitch-night | 59.9–60.1 | 61         | 214k      |

The field held around 60 fps in this run; the room varied below the target. These results do
not establish sustained 60 fps or a stutter-free startup. The initial-presentation delay and
connected-TV performance remain open; the previous phase's broader performance limitations
are recorded in `3D_BLENDER_KIT_REVIEW.md`. No adaptive reduction was used for the High measurements.

## Visual review and remaining limits

The four contact sheets and full-size room/goal views were inspected. The set covers room
arrival, bar and window directions, field/goal close-ups, bowl integration and a mid-doorway
entry frame in both languages and lighting modes. Supplemental views use the normal live-scene
camera controls through an external QA helper; there is no image retouching or special shipped
capture mode. Mobile Night EN/AR captures are 520×900 with the panels open.

- Client visual approval remains necessary. Furniture and the surrounding stadium still have
  a simplified architectural-preview style; this is not a photorealistic or official reconstruction.
- The room's measured frame rate, initial presentation and connected-TV 60 fps need further work.
- Portrait field framing shows a section of the pitch; pan/zoom and panel collapse support exploring it.
- Native Arabic review is needed for the three new functional strings and the existing narratives.
- Safari/Edge and real touch hardware have not been tested here. Guided Tour remains separate.

## Review screenshots

There are 28 desktop stills at 1920×1080, four mobile stills at 520×900 and four contact sheets.
Files are local and gitignored; every main review path is listed below.

- [review/phase-3d/stadium-hospitality/bowl-day-ar.png](../review/phase-3d/stadium-hospitality/bowl-day-ar.png)
- [review/phase-3d/stadium-hospitality/bowl-day-en.png](../review/phase-3d/stadium-hospitality/bowl-day-en.png)
- [review/phase-3d/stadium-hospitality/bowl-night-ar.png](../review/phase-3d/stadium-hospitality/bowl-night-ar.png)
- [review/phase-3d/stadium-hospitality/bowl-night-en.png](../review/phase-3d/stadium-hospitality/bowl-night-en.png)
- [review/phase-3d/stadium-hospitality/contact-01.png](../review/phase-3d/stadium-hospitality/contact-01.png)
- [review/phase-3d/stadium-hospitality/contact-02.png](../review/phase-3d/stadium-hospitality/contact-02.png)
- [review/phase-3d/stadium-hospitality/contact-03.png](../review/phase-3d/stadium-hospitality/contact-03.png)
- [review/phase-3d/stadium-hospitality/contact-04.png](../review/phase-3d/stadium-hospitality/contact-04.png)
- [review/phase-3d/stadium-hospitality/goal-day-ar.png](../review/phase-3d/stadium-hospitality/goal-day-ar.png)
- [review/phase-3d/stadium-hospitality/goal-day-en.png](../review/phase-3d/stadium-hospitality/goal-day-en.png)
- [review/phase-3d/stadium-hospitality/goal-night-ar.png](../review/phase-3d/stadium-hospitality/goal-night-ar.png)
- [review/phase-3d/stadium-hospitality/goal-night-en.png](../review/phase-3d/stadium-hospitality/goal-night-en.png)
- [review/phase-3d/stadium-hospitality/pitch-day-ar.png](../review/phase-3d/stadium-hospitality/pitch-day-ar.png)
- [review/phase-3d/stadium-hospitality/pitch-day-en.png](../review/phase-3d/stadium-hospitality/pitch-day-en.png)
- [review/phase-3d/stadium-hospitality/pitch-mobile-ar.png](../review/phase-3d/stadium-hospitality/pitch-mobile-ar.png)
- [review/phase-3d/stadium-hospitality/pitch-mobile-en.png](../review/phase-3d/stadium-hospitality/pitch-mobile-en.png)
- [review/phase-3d/stadium-hospitality/pitch-night-ar.png](../review/phase-3d/stadium-hospitality/pitch-night-ar.png)
- [review/phase-3d/stadium-hospitality/pitch-night-en.png](../review/phase-3d/stadium-hospitality/pitch-night-en.png)
- [review/phase-3d/stadium-hospitality/vip-bar-day-ar.png](../review/phase-3d/stadium-hospitality/vip-bar-day-ar.png)
- [review/phase-3d/stadium-hospitality/vip-bar-day-en.png](../review/phase-3d/stadium-hospitality/vip-bar-day-en.png)
- [review/phase-3d/stadium-hospitality/vip-bar-night-ar.png](../review/phase-3d/stadium-hospitality/vip-bar-night-ar.png)
- [review/phase-3d/stadium-hospitality/vip-bar-night-en.png](../review/phase-3d/stadium-hospitality/vip-bar-night-en.png)
- [review/phase-3d/stadium-hospitality/vip-day-ar.png](../review/phase-3d/stadium-hospitality/vip-day-ar.png)
- [review/phase-3d/stadium-hospitality/vip-day-en.png](../review/phase-3d/stadium-hospitality/vip-day-en.png)
- [review/phase-3d/stadium-hospitality/vip-entry-day-ar.png](../review/phase-3d/stadium-hospitality/vip-entry-day-ar.png)
- [review/phase-3d/stadium-hospitality/vip-entry-day-en.png](../review/phase-3d/stadium-hospitality/vip-entry-day-en.png)
- [review/phase-3d/stadium-hospitality/vip-entry-night-ar.png](../review/phase-3d/stadium-hospitality/vip-entry-night-ar.png)
- [review/phase-3d/stadium-hospitality/vip-entry-night-en.png](../review/phase-3d/stadium-hospitality/vip-entry-night-en.png)
- [review/phase-3d/stadium-hospitality/vip-mobile-ar.png](../review/phase-3d/stadium-hospitality/vip-mobile-ar.png)
- [review/phase-3d/stadium-hospitality/vip-mobile-en.png](../review/phase-3d/stadium-hospitality/vip-mobile-en.png)
- [review/phase-3d/stadium-hospitality/vip-night-ar.png](../review/phase-3d/stadium-hospitality/vip-night-ar.png)
- [review/phase-3d/stadium-hospitality/vip-night-en.png](../review/phase-3d/stadium-hospitality/vip-night-en.png)
- [review/phase-3d/stadium-hospitality/vip-window-day-ar.png](../review/phase-3d/stadium-hospitality/vip-window-day-ar.png)
- [review/phase-3d/stadium-hospitality/vip-window-day-en.png](../review/phase-3d/stadium-hospitality/vip-window-day-en.png)
- [review/phase-3d/stadium-hospitality/vip-window-night-ar.png](../review/phase-3d/stadium-hospitality/vip-window-night-ar.png)
- [review/phase-3d/stadium-hospitality/vip-window-night-en.png](../review/phase-3d/stadium-hospitality/vip-window-night-en.png)

Evidence, scripts, build/Blender logs and model/screenshot manifests are under `review/phase-3d/stadium-hospitality/qa/`. `checks-base.mjs` matches the full run; `additional.mjs` records the later pan and exterior-CTA checks.
