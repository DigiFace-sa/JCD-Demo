# Blender public-space kit — review

5 November 2026. Builds on the public-space close views in `c67267f`.

## Result

Nine original Blender models now furnish Beach and Central: a timber bench, cushioned lounger,
curved fabric parasol, café table, café chair, recessed stone planter with low planting,
shielded street lamp, timber pavilion and arched stone arcade bay. Their frames, cushions,
scalloped canopy hems, ribs, planting, rounded edges and stone profiles are modelled geometry.

The kit uses baked ambient occlusion in linear vertex colours and the existing self-hosted
PBR textures. The same public-space links and bilingual panels remain available:

- `#/experience/places/beach-promenade`
- `#/experience/places/central-square`

Zoom reaches closer, with a 28 m minimum orbit radius and a 10 m camera floor. This is an
architectural close view, not a first-person walking simulation. The new designs remain
illustrative; they do not establish approved JCDC amenities. Existing pedestrians and the
surrounding city massing retain their simplified style.

## Implementation

- `scripts/blender/public_realm.py` builds and bakes all models, separates them during the AO
  bake, returns their origins to ground level, and exports near/far variants in a single GLB.
- `PublicRealmKit.ts` validates every asset/surface part. Materials are assigned by object name,
  retaining the established Blender-to-web convention and local Draco decoder.
- `PublicRealm.ts` instances the reusable parts. Distant views use simplified geometry; full
  detail appears within 100 m of each area's centre. Ground planes remain independent of that
  switch. Main shadows stay static while the user zooms.
- Both detail variants are drawn behind the loading screen. The first probe exposed a large
  pipeline preparation hitch; the warm-up now exercises these instanced/depth draws before
  revealing the scene. Cold deep links also prepare their requested view and static shadows
  before starting the visible loop. The presentation measurements below still show a startup
  delay; these steps do not establish a hitch-free first frame.
- The projected PBR material now uses Three's transformed normal, including instance rotation
  and non-uniform scale. Sampled surface detail preserves the underlying curved/bevelled
  normal rather than replacing it with a flat axis normal.
- Materials and geometry are released when leaving, including when the GLB completes late.
  The new furniture remains offline-capable and uses no new third-party model downloads.
- No new UI strings or destination facts were introduced. The existing Arabic draft copy
  still needs native review.

Asset: **777,312 bytes** (759.1 KiB), **52 parts** across both levels.
Template triangles: **43,536 near**, **15,208 far**. These are library counts; instancing multiplies rendered triangles.

Regenerate with the Blender command in README, then rebuild Vite. Keep the loader's part table
in sync if adding assets or materials; keep layout footprints in `config/publicRealm.ts` aligned
with the model dimensions. No other landmark models were regenerated.

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
- Late GLB test: leave while the furniture model request is delayed; no canvas or scene returns.

Console/page errors: clean.
Capture requests: clean.

`npm run lint`, `npm run build`, `npm run build:pitch`, `git diff --check`: passed.

Mixed navigation sampling (includes interrupted stadium legs): 1260 frames; 19.84 ms average, 33.5 ms p95, 66.6 ms worst.
Forced-GC JS heap, final eight exit cycles: 64.5–68.2 MB. This is not total process/GPU memory.

Production review build, Apple M1, installed Chrome/Metal, High locked, DPR 1, 1920×1080.
Each stationary row contains eight debug-panel samples after settling:

| View                         | FPS range | Draw calls | Triangles |
| ---------------------------- | --------- | ---------- | --------- |
| beach-promenade-day          | 39.8–60.0 | 154        | 932k      |
| beach-promenade-detail-day   | 59.9–60.1 | 135        | 993k      |
| central-square-day           | 60.0–60.0 | 103        | 649k      |
| central-square-detail-day    | 59.8–60.2 | 90         | 764k      |
| overview-day                 | 31.0–54.1 | 85         | 590k      |
| beach-promenade-night        | 36.9–58.0 | 155        | 933k      |
| beach-promenade-detail-night | 38.7–60.0 | 136        | 994k      |
| central-square-night         | 46.5–58.3 | 105        | 650k      |
| central-square-detail-night  | 59.8–60.0 | 92         | 764k      |
| overview-night               | 50.2–55.9 | 86         | 590k      |

Cold-load presentation samples (120 rAF gaps after start, final build):

| Visit    | Average  | First gap | Worst    |
| -------- | -------- | --------- | -------- |
| en day   | 26.68 ms | 666.7 ms  | 666.7 ms |
| en night | 22.77 ms | 515.9 ms  | 515.9 ms |
| ar day   | 22.22 ms | 550.0 ms  | 550.0 ms |
| ar night | 22.08 ms | 533.4 ms  | 533.4 ms |

A first-presentation gap of roughly half a second remains despite warm-up and preparing the
requested cold view behind the loader. Resolving this presentation delay is an open performance
item; it is not treated as part of the frame-rate guarantee.

These measurements do **not** establish sustained 60 fps. The previous phase's same-session A/B
measurements also varied on the overview with the detailed spaces hidden. This phase retains
its full sample ranges rather than reporting only the faster windows. The connected-TV pitch
performance check remains open; adaptive quality remains available during normal use.

## Visual review and limits

The contact sheets and full-size furniture views were inspected after capture. The full set
shows English/Arabic, Day/Night, both public spaces and the returned overview, plus mobile
Night views. The furniture captures use the live scene with its normal material/lighting path.
They reposition the existing camera through an external QA script; no special production
camera mode or image retouching was added.

- Client visual review remains necessary; these are illustrative designs and assets.
- People, surrounding massing and some environmental detail remain simplified. This pass is
  not a photorealistic reconstruction of the destination.
- Native Arabic, Safari/Edge, physical touch devices and connected-TV checks remain open.
- Wider site polish and Guided Tour remain separate phases.

## Review screenshots

Individual desktop files: 1920×1080. Mobile: 520×900. Contact sheets are labelled collages.
All files are local and gitignored.

- [review/phase-3d/blender/beach-promenade-day-ar.png](../review/phase-3d/blender/beach-promenade-day-ar.png)
- [review/phase-3d/blender/beach-promenade-day-en.png](../review/phase-3d/blender/beach-promenade-day-en.png)
- [review/phase-3d/blender/beach-promenade-detail-day-ar.png](../review/phase-3d/blender/beach-promenade-detail-day-ar.png)
- [review/phase-3d/blender/beach-promenade-detail-day-en.png](../review/phase-3d/blender/beach-promenade-detail-day-en.png)
- [review/phase-3d/blender/beach-promenade-detail-night-ar.png](../review/phase-3d/blender/beach-promenade-detail-night-ar.png)
- [review/phase-3d/blender/beach-promenade-detail-night-en.png](../review/phase-3d/blender/beach-promenade-detail-night-en.png)
- [review/phase-3d/blender/beach-promenade-furniture-day-ar.png](../review/phase-3d/blender/beach-promenade-furniture-day-ar.png)
- [review/phase-3d/blender/beach-promenade-furniture-day-en.png](../review/phase-3d/blender/beach-promenade-furniture-day-en.png)
- [review/phase-3d/blender/beach-promenade-furniture-night-ar.png](../review/phase-3d/blender/beach-promenade-furniture-night-ar.png)
- [review/phase-3d/blender/beach-promenade-furniture-night-en.png](../review/phase-3d/blender/beach-promenade-furniture-night-en.png)
- [review/phase-3d/blender/beach-promenade-mobile-ar.png](../review/phase-3d/blender/beach-promenade-mobile-ar.png)
- [review/phase-3d/blender/beach-promenade-mobile-en.png](../review/phase-3d/blender/beach-promenade-mobile-en.png)
- [review/phase-3d/blender/beach-promenade-night-ar.png](../review/phase-3d/blender/beach-promenade-night-ar.png)
- [review/phase-3d/blender/beach-promenade-night-en.png](../review/phase-3d/blender/beach-promenade-night-en.png)
- [review/phase-3d/blender/central-square-day-ar.png](../review/phase-3d/blender/central-square-day-ar.png)
- [review/phase-3d/blender/central-square-day-en.png](../review/phase-3d/blender/central-square-day-en.png)
- [review/phase-3d/blender/central-square-detail-day-ar.png](../review/phase-3d/blender/central-square-detail-day-ar.png)
- [review/phase-3d/blender/central-square-detail-day-en.png](../review/phase-3d/blender/central-square-detail-day-en.png)
- [review/phase-3d/blender/central-square-detail-night-ar.png](../review/phase-3d/blender/central-square-detail-night-ar.png)
- [review/phase-3d/blender/central-square-detail-night-en.png](../review/phase-3d/blender/central-square-detail-night-en.png)
- [review/phase-3d/blender/central-square-furniture-day-ar.png](../review/phase-3d/blender/central-square-furniture-day-ar.png)
- [review/phase-3d/blender/central-square-furniture-day-en.png](../review/phase-3d/blender/central-square-furniture-day-en.png)
- [review/phase-3d/blender/central-square-furniture-night-ar.png](../review/phase-3d/blender/central-square-furniture-night-ar.png)
- [review/phase-3d/blender/central-square-furniture-night-en.png](../review/phase-3d/blender/central-square-furniture-night-en.png)
- [review/phase-3d/blender/central-square-mobile-ar.png](../review/phase-3d/blender/central-square-mobile-ar.png)
- [review/phase-3d/blender/central-square-mobile-en.png](../review/phase-3d/blender/central-square-mobile-en.png)
- [review/phase-3d/blender/central-square-night-ar.png](../review/phase-3d/blender/central-square-night-ar.png)
- [review/phase-3d/blender/central-square-night-en.png](../review/phase-3d/blender/central-square-night-en.png)
- [review/phase-3d/blender/contact-01.png](../review/phase-3d/blender/contact-01.png)
- [review/phase-3d/blender/contact-02.png](../review/phase-3d/blender/contact-02.png)
- [review/phase-3d/blender/contact-03.png](../review/phase-3d/blender/contact-03.png)
- [review/phase-3d/blender/contact-04.png](../review/phase-3d/blender/contact-04.png)
- [review/phase-3d/blender/overview-day-ar.png](../review/phase-3d/blender/overview-day-ar.png)
- [review/phase-3d/blender/overview-day-en.png](../review/phase-3d/blender/overview-day-en.png)
- [review/phase-3d/blender/overview-night-ar.png](../review/phase-3d/blender/overview-night-ar.png)
- [review/phase-3d/blender/overview-night-en.png](../review/phase-3d/blender/overview-night-en.png)

Scripts, model/screenshot manifests, raw measurements and logs are archived under `review/phase-3d/blender/qa/`.
