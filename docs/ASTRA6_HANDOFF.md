# Astra6 handoff: realistic 3D Experience (Blender landmarks, Day/Night, greening)

Original handoff: 2026-11-04 by Claude. The continuation notes in §9 supersede the original
work-in-progress state below. Read the rules first.

## 1. Rules (from the client, non-negotiable)

- **Local git commits only. Never push.** Commit only the 3D files listed in §8, never the user's
  or Codex's own uncommitted files: `docs/CINEMATIC_REBUILD_PLAN.md`,
  `docs/CLAUDE_CONTINUE_PROMPT.md`, `src/motion/Reveal.tsx`, `src/pages/destination/Destination.tsx`.
- **Don't invent facts.** The landmarks are _illustrative placeholders_ built to match the official
  JCDC concept renders (we have no approval / no official 3D files). Keep `[TBC]` copy as is.
- **Performance budget:** 60 fps on the **High** tier at **1080p** on the client's **M1 Mac**.
- Respect `prefers-reduced-motion` and **RTL** (Arabic). Every UI string goes in both
  `src/i18n/en.json` and `src/i18n/ar.json`.
- End each phase with **EN and AR stills at 1920×1080, Day and Night**, saved in
  `review/phase-3d/`.
- If the look starts to feel dated or "game-like", stop and say so rather than pushing on.

## 2. What the client asked for (in order)

1. Make the 3D Experience realistic: real architecture instead of cubes. **Done for all four
   landmarks.**
2. "Do the rest" like the stadium: Opera House, Museum, Oceanarium. **Done** (tuning possible).
3. Preview in **Day** and **Night** ("dark mode with lights and stuff"). **Done.** Latest
   instruction: _"make sure the lights in night are realistic and visually fine"_. A
   realism pass is done (§5); keep checking it.
4. Refresh trees, palms and gardens with real models. **Done** (Blender vegetation).
5. **Latest:** _"fill the empty parts with green: trees, palms and grass. Must be realistic."_
   **In progress.** This is where I stopped (§6).

## 3. Blender pipeline

Blender is installed at `/Applications/Blender.app` (5.2 LTS). Everything runs headless; nobody
opens the UI:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scripts/blender/<name>.py
```

| Script                          | Output                                    | Notes                                                                                                                                                    |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/blender/lib.py`        | (shared)                                  | `Model` class: `quad`, `tri`, `poly(mat, pts, want)` (auto-orients to face `want`), `grid`, `box(..., skip=())`, `wall_x`, `wall_z`, `block`, `export()` |
| `scripts/blender/stadium.py`    | `public/models/stadium.glb` (~1 MB)       | Older, standalone (has its own copies of the helpers); dimensions mirror `src/experience/config/stadium.ts` and must stay in sync                        |
| `scripts/blender/opera.py`      | `public/models/opera-house.glb` (~315 KB) | Fluted stone halls, scalloped crowns, window slots, gold lattice bays, wave-arch entrance, lobby canopy                                                  |
| `scripts/blender/museum.py`     | `public/models/museum.glb` (~165 KB)      | Faceted metal "petal" pods, glazed gap slots, steel ribs, two stacks with white crowns, walkway, bronze drum                                             |
| `scripts/blender/oceanarium.py` | `public/models/oceanarium.glb` (~270 KB)  | Stone halls, five copper-lattice canopies on posts (real geometry, so shadows dapple), lattice cubes, decks and jetty over the water                     |
| `scripts/blender/vegetation.py` | `public/models/vegetation.glb` (~114 KB)  | `palm-a`, `palm-b`, `tree-olive`, `tree-shade`, `tree-jacaranda`, `shrub` (trunk plus alpha-card foliage)                                                |
| `scripts/blender/preview.py`    | PNG                                       | Clay look-dev render (colours not representative)                                                                                                        |

**How the models work. Don't break these conventions:**

- **Coordinates.** Scripts author in the web app's local metres (x east, y up, z south). `bl()`
  converts to Blender Z-up as `(x, -z, y)`.
- **Parts by material.** One object per material, named `<prefix>-<material>` (e.g.
  `opera-limestone`). The glTF export uses `export_materials="PLACEHOLDER"`, which **drops material
  names**, so the web app maps parts **by object name**
  (`src/experience/world/landmarks/shell.ts → loadShell(url, prefix, materials)`). A new
  material in Blender needs a matching key in the TS loader, or loading throws
  `unexpected part`.
- **Lighting is baked into vertex colours.**
  - Cycles AO is baked into `COLOR_0` with Metal GPU, then
    `colour = (ao*0.85 + 0.15) * per-face tint`.
  - Use **`FLOAT_COLOR`**: byte colours are sRGB and come out double-darkened.
  - No UVs are exported (`export_texcoords=False`).
- **Draco compression.** The decoder is vendored in `public/draco/`, which ESLint and Prettier
  ignore.
- **Hidden faces are skipped** (`skip=` on boxes) to save triangles.
- **Rebuilding.** After regenerating a GLB, run `npx vite build` again: `vite preview` serves
  `dist/`, so the new model doesn't appear until you rebuild.
- **Textures.**
  - `npm run textures` fetches CC0 Poly Haven sets into `public/textures/<set>/`. The sets are
    limestone, plaster, timber, paving and coral-stone (`assets/cc0-textures.json`).
  - `npm run vegetation:textures` draws the leaf, frond and bark textures with sharp
    (`scripts/vegetation-textures.mjs`).

## 4. Web side (three.js r187)

- **`landmarks/boxMapped.ts`**: the textured PBR material for architecture.
  - World-space box mapping, so no UVs are needed. The texture is divided by its mean colour,
    so the `tint` sets the colour exactly.
  - Normal maps via the `afterNormal` hook.
  - `night: { walls, tops, falloff, spacing }`:
    - `walls` is a warm wall wash that fades with height.
    - `spacing` gives realistic **uplight scallops**.
    - `tops` makes upward faces glow.
- **`landmarks/shell.ts`**: the generic GLB loader (Draco plus material-by-part).
  `stadium/StadiumShell.ts`, `OperaHouse.ts`, `Museum.ts` and `Oceanarium.ts` all use it. Each
  landmark returns a `loaded` promise, which `World.ready()` awaits before the shadow refresh and
  shader compile.
- **`landmarks/lattice.ts`** and `shaders/lattice.glsl`: a painted roshan lattice. It has
  `mapping: 'dome' | 'panel'`; the Opera's gold bays use `panel`.
- **Day/Night:**
  - `config/scene.ts → LIGHTING.day/night` holds the presets: sky, key light, hemisphere,
    exposure, `lights`, and the new `sky.floor` night airglow.
  - `world/NightLights.ts` is the registry. Anything that lights up registers through
    `atmosphere.night.material() / uniform() / custom()`.
  - `Environment.setMode()` re-grades the sky, rebakes the environment and haze, and refreshes
    the shadows.
  - UI: the sun/moon button in `pages/experience/ExperiencePage.ts`, with a curtain fade. The URL
    flag `?mode=day|night` sets the starting mode.
- **Night realism pass (this session):**
  - `shaders/facade.glsl`: each building gets its own lit-window share (some dark, some busy) and
    warm or cool-white window light. `FACADE.nightLitFraction` is now 0.14.
  - `world/CityStreets.ts` (new): the context city's street grid is painted on the terrain,
    darker asphalt by day and warm lamp-lit roads at night.
  - Landmarks:
    - Opera House: scalloped uplights.
    - Museum: a faint base uplight on the metal.
    - Oceanarium: canopy **undersides** glow, tops stay dark, as in the official night render.
  - The night sky is deep slate-blue instead of black.
- **Vegetation (`masterplan/Landscape.ts`):**
  - One `InstancedMesh` per variant, part and 320 m cell, with distance culling (`VIEW_RANGE`).
  - Foliage uses `alphaTest` plus `alphaToCoverage`, plus **`FOLIAGE_ALPHA`**: mip-compensated
    alpha that fixed distant palms rendering as bare trunks.
  - Night lamps along the promenades and park paths.
  - `LANDMARK_CLEARANCE` lets the Opera House garden reach the building: a rotated rectangle
    replaces the footprint circle.
- **Camera shots** (`src/data/landmarks.ts`) were moved so each landmark is front-lit by the
  late-afternoon sun from the west.

## 5. Look-dev values worth knowing

- Day: sun at bearing 258°, elevation 14°; exposure 0.5.
- Night: moon at 115°/34°; exposure 1.4; sky floor `[0.018, 0.024, 0.046]`.
- Glass glows to about 0.8–1.5 at night. Above that, windows clip to white, which looks fake.
- Wall wash 0.5–0.9 with `falloff` 6–11 m and `spacing` 6–9 m reads as real facade lighting.
  An even wash reads as orange cardboard.

## 6. Where I stopped: greening the empty land

I had just added these pieces:

- **`masterplan/OpenSpace.ts`** (new): knows every masterplan building footprint
  (`MasterplanBuildings.plots`, now exported) and the district street grids.
  - `lawn(x, z)` is 0 on streets and forecourts, 1 on open block land.
  - It also provides `distanceToBuilding`, `streets()` and so on.
- `Masterplan.ts` now builds the buildings first, then `OpenSpace`, then the ground and the
  landscape.
- **`MasterplanGround.ts`**: open block land is coloured lawn (with noise). Promenade, beach and
  plazas are unchanged.
- **`Landscape.ts`**:
  - `streetTrees()`: shade trees or palms along both verges of every district street, one
    species per street.
  - `blockGardens()`: clumps of olive, jacaranda and shade trees plus shrubs on open lawns.
  - Urban planting uses `URBAN_VIEW_RANGE = 1500` m.
- **Parks and plazas** (`config/masterplan.ts`):
  - Added the opera gardens park at (−290, −612), r 150, and the opera forecourt plaza.
  - Shrank the museum plaza (r 100) and the oceanarium plaza (r 85).

**Measured:** the Museum shot runs at 60 fps with about 1.41M triangles and 279 draw calls
(headless Chrome on this Mac, High, 1080p). The trees look good.

### Open issues and next steps (in order)

1. **Lawns are blotchy.** The ground mesh has 12 m cells (`MASTERPLAN.ground.cell`), so
   lawn/street edges blur into soft green patches. Fix it in a shader extension on the ground
   material: compute `lawn` per pixel from a small data texture, or analytically from the
   district grid plus a footprint mask, and keep crisp paved streets and forecourts. Also add a
   grass texture or detail noise so lawns aren't flat.
2. **Check every landmark shot and the overview, Day and Night**, after greening:
   - Is there too much green? Does it look like the official renders, which show landscaped
     but urban streets?
   - Are any trees inside buildings, plazas or on roads?
   - Is there green under the Oceanarium canopies (it shouldn't be) or on the peninsula paving?
3. **Still empty:** the beach and wellness strip, the peninsula root, around the marina, and the
   stadium plaza ring. Add palms and grass consistent with the renders: palm-lined promenades,
   mangroves at the Oceanarium edge (the official render shows mangroves; a shrub or tree
   variant could be added in `vegetation.py`).
4. **Performance pass.**
   - Measure the overview and all four landmark shots with the perf script (§7).
   - If the M1 dips below 60, try in this order:
     - lower `STREET_TREES.keep` or `BLOCK_GARDENS`;
     - reduce `URBAN_VIEW_RANGE`;
     - MSAA 2× on High;
     - cheaper far foliage (impostors).
   - The stadium shot was about 45–52 fps headless before; re-check it.
5. **Night check of the greening.** Trees are near-black silhouettes at night, which is fine.
   Consider a few lamp pools along the new streets (`addLamps`), but don't overdo the count.
6. **Small polish.**
   - Museum: the petal tops reflect a lot of sky blue.
   - Oceanarium: the cubes could be a touch less bright at night.
   - Opera: the arch soffit reads brownish by day.
7. **Show the illustrative note in review builds only.** Add "Illustrative 3D based on official
   concept renders" (this default was agreed earlier).
8. **Run lint and both builds:** `npm run lint`, `npm run build`, `npm run build:pitch`. Fix
   anything they report.
9. **Review stills**, EN plus AR, Day plus Night, 1920×1080, for:
   - the overview;
   - each landmark;
   - the stadium approach and the inside of the bowl;
   - a park close-up.

   Save them in `review/phase-3d/`. Earlier stills from this phase are already there.

10. **Local commit** of the 3D files only (§8). Then report to the client with the stills.

## 7. QA tooling (outside the repo, on this Mac)

- Serve the build with `npx vite build && npx vite preview --port 4173` (it was already running
  at `http://127.0.0.1:4173`).
- Playwright scripts are in `/tmp/jcd-3d/`. They use
  `/tmp/jcd-phase5-qa/node_modules/playwright-core` with real Chrome
  (`--use-angle=metal`, not headless), so the GPU is used:

  | Command                                                                     | What it captures                                                                                 |
  | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
  | `node exp.mjs <prefix> <hash> [<hash>...]`                                  | Screenshots of `#/experience/<hash>`, plus a debug-panel line with fps, draw calls and triangles |
  | `node lmclose.mjs <prefix> <landmark-id> <day\|night> <zoomSteps> [en\|ar]` | The landmark shot plus a zoomed close-up                                                         |
  | `node night.mjs <prefix> [hash] [mode]`                                     | The overview without the side panel                                                              |
  | `perf.mjs` / `perf2.mjs`                                                    | FPS sampling                                                                                     |

- URL flags: `?lang=en|ar&quality=high&debug&mode=day|night`.
- The first FPS reading after a shader change is often low (compile hitches); take a second
  reading.
- `/tmp` is wiped on reboot. If the scripts are gone, recreate them from the description above.

## 8. Files that belong to this 3D work (safe to commit)

- **New:**
  - `scripts/blender/*`, `scripts/textures.mjs`, `scripts/vegetation-textures.mjs`
  - `assets/cc0-textures.json`
  - `public/models/*`, `public/textures/*`, `public/draco/*`
  - `src/experience/world/CityStreets.ts`, `NightLights.ts`
  - `src/experience/world/landmarks/boxMapped.ts`, `shell.ts`, `stadium/StadiumShell.ts`
  - `src/experience/world/masterplan/OpenSpace.ts`, `GroundCover.ts`
  - `docs/ASTRA6_HANDOFF.md`
- **Modified:**
  - `.prettierignore`, `eslint.config.js`, `package.json`
  - `src/components/icons.ts`, `src/config.ts`, `src/data/landmarks.ts`
  - `src/experience/**` (all modified files there)
  - `src/i18n/en.json`, `src/i18n/ar.json`
  - `src/pages/experience/ExperiencePage.ts`, `src/styles/components/experience.css`
- **Do not commit:**
  - `docs/CINEMATIC_REBUILD_PLAN.md`
  - `docs/CLAUDE_CONTINUE_PROMPT.md`
  - `src/motion/Reveal.tsx`
  - `src/pages/destination/Destination.tsx`

## 9. Codex continuation — 4 November 2026

The original Blender models and day/night work above were inherited from Claude. This continuation
finishes the ground and planting pass; it does not replace the models with official geometry.

### Changes

- `GroundCover.ts` adds a 3 m/texel land-use texture, independent of the 12 m ground mesh.
  Lawns preserve building aprons, streets, beach setback, the Opera footprint and the full
  asymmetric Oceanarium canopy footprint. The field is mipmapped and explicitly disposed.
- Ground colour is applied after vertex colours through the new `MaterialExtension.afterColor`
  hook. Grass has subtle, distance-filtered detail. Park loops use analytic fragment edges;
  baking narrow paths into the mask produced scalloping and was replaced.
- Small planted beds sit around the stadium grove. Coastal palms and low olive trees add
  planting behind the beach promenade and near the marina. No mangrove species was added;
  existing vegetation models are reused.
- Street planting avoids perpendicular intersections. Shrub offsets are rechecked against
  building, landmark and plaza clearance. Coastal plants use terrain height rather than a
  fixed elevation on sloping beach ground.
- Lamp pools are dimmer and fall off gradually. The distant stadium bowl now retains its
  floodlit seating at night, rather than going black until the camera enters. Oceanarium glazing
  is less bright at night, Museum metal is less mirror-like, and Opera timber soffits are lighter
  by day.
- Review-only bilingual provenance note: `pages.experience.illustrative`. The Arabic translation
  is a draft and still needs native review: «تصوّر ثلاثي الأبعاد استرشادي مستند إلى التصاميم
  التصوّرية الرسمية». Pitch builds omit the element entirely.
- Stadium and vegetation loading now handle disposal during pending requests. Draco workers
  are released after failed loads too. The two inherited void-arrow lint errors were fixed.

### Verification

- `npm run lint`, `npm run build`, `npm run build:pitch`: passed.
- Desktop capture: English and Arabic, Day and Night, 1920×1080, DPR 1, High locked.
  Overview, all four landmarks, stadium approach, bowl interior and a Wellness planting close-up.
- Browser console and requests: clean in the full capture run.
- Four live day/night switches: correct mode and curtain cleared after each transition.
- High / Medium / Low switching, rapid interior/exterior navigation, and reduced motion: passed.
- Five camera flights sampled over 1,348 frames: **16.69 ms average (~59.9 fps)**,
  **18.3 ms p95**, **33.4 ms worst**. This is a short-run measurement, not a guarantee of zero
  dropped frames on every machine or a full Guided Tour benchmark.
- Sixteen entry/exit cycles: no Experience canvas remained after leaving. Forced-GC JS heap
  settled into **51.1–57.9 MB over the final eight cycles**, rather than sustained growth.
  This measures JS heap, not total process/GPU memory.
- Leaving while model requests were deliberately delayed: no scene reappeared; console clean.
- Mobile EN/AR, 520×900: loaded with no horizontal overflow; the provenance note clears the
  mobile panel and Arabic draft badge.
- Pitch EN/AR: debug, placeholder markers and provenance note are absent; all requested assets
  are local. WebGL-disabled fallback passed. Details are in `pitch-check.json`.

Stationary measurements below are eight debug-panel samples per view after settling, on this
Apple M1 with headful Chrome/Metal, High locked, 1920×1080 and DPR 1. No quality reduction or
MSAA change was needed. An early stadium sample dipped to 46.4 fps while other checks were
running; the isolated repeat held 60 fps. The final night-bowl material was also resampled.

| View        | Day FPS range | Night FPS range | Draw calls, day/night | Triangles, day/night |
| ----------- | ------------- | --------------- | --------------------- | -------------------- |
| overview    | 60.0–60.1     | 60.0–60.0       | 85 / 86               | 587k / 588k          |
| museum      | 59.8–60.2     | 59.8–60.2       | 291 / 292             | 1193k / 1193k        |
| opera-house | 59.8–60.0     | 59.8–60.2       | 344 / 345             | 1073k / 1074k        |
| oceanarium  | 60.0–60.0     | 60.0–60.0       | 337 / 338             | 1323k / 1323k        |
| stadium     | 60.0–60.0     | 59.8–60.2       | 213 / 214             | 848k / 849k          |
| inside      | 60.0–60.2     | 59.8–60.2       | 40 / 40               | 175k / 175k          |

### Open review items / limits

- The site layout and building massing are illustrative. The surrounding city and foliage still
  read as simplified geometry in close-ups; this is not photorealistic or an official masterplan.
  Review the images before any further expansion of the 3D art direction.
- Native Arabic review remains necessary, including the new provenance note.
- Safari, Edge, real touch hardware and the connected TV have not been tested in this pass.
- No new Blender model generation or mangrove model was attempted in this continuation; the
  inherited Blender landmarks and vegetation were reused.
- The Guided Tour and wider site polish are separate future phases.

### Review screenshots

All files below are local and gitignored. The main set is 1920×1080; mobile files are 520×900.

- [review/phase-3d/continuation/overview-day-en.png](../review/phase-3d/continuation/overview-day-en.png)
- [review/phase-3d/continuation/overview-day-ar.png](../review/phase-3d/continuation/overview-day-ar.png)
- [review/phase-3d/continuation/overview-night-en.png](../review/phase-3d/continuation/overview-night-en.png)
- [review/phase-3d/continuation/overview-night-ar.png](../review/phase-3d/continuation/overview-night-ar.png)
- [review/phase-3d/continuation/stadium-day-en.png](../review/phase-3d/continuation/stadium-day-en.png)
- [review/phase-3d/continuation/stadium-day-ar.png](../review/phase-3d/continuation/stadium-day-ar.png)
- [review/phase-3d/continuation/stadium-night-en.png](../review/phase-3d/continuation/stadium-night-en.png)
- [review/phase-3d/continuation/stadium-night-ar.png](../review/phase-3d/continuation/stadium-night-ar.png)
- [review/phase-3d/continuation/opera-house-day-en.png](../review/phase-3d/continuation/opera-house-day-en.png)
- [review/phase-3d/continuation/opera-house-day-ar.png](../review/phase-3d/continuation/opera-house-day-ar.png)
- [review/phase-3d/continuation/opera-house-night-en.png](../review/phase-3d/continuation/opera-house-night-en.png)
- [review/phase-3d/continuation/opera-house-night-ar.png](../review/phase-3d/continuation/opera-house-night-ar.png)
- [review/phase-3d/continuation/museum-day-en.png](../review/phase-3d/continuation/museum-day-en.png)
- [review/phase-3d/continuation/museum-day-ar.png](../review/phase-3d/continuation/museum-day-ar.png)
- [review/phase-3d/continuation/museum-night-en.png](../review/phase-3d/continuation/museum-night-en.png)
- [review/phase-3d/continuation/museum-night-ar.png](../review/phase-3d/continuation/museum-night-ar.png)
- [review/phase-3d/continuation/oceanarium-day-en.png](../review/phase-3d/continuation/oceanarium-day-en.png)
- [review/phase-3d/continuation/oceanarium-day-ar.png](../review/phase-3d/continuation/oceanarium-day-ar.png)
- [review/phase-3d/continuation/oceanarium-night-en.png](../review/phase-3d/continuation/oceanarium-night-en.png)
- [review/phase-3d/continuation/oceanarium-night-ar.png](../review/phase-3d/continuation/oceanarium-night-ar.png)
- [review/phase-3d/continuation/approach-day-en.png](../review/phase-3d/continuation/approach-day-en.png)
- [review/phase-3d/continuation/approach-day-ar.png](../review/phase-3d/continuation/approach-day-ar.png)
- [review/phase-3d/continuation/approach-night-en.png](../review/phase-3d/continuation/approach-night-en.png)
- [review/phase-3d/continuation/approach-night-ar.png](../review/phase-3d/continuation/approach-night-ar.png)
- [review/phase-3d/continuation/inside-day-en.png](../review/phase-3d/continuation/inside-day-en.png)
- [review/phase-3d/continuation/inside-day-ar.png](../review/phase-3d/continuation/inside-day-ar.png)
- [review/phase-3d/continuation/inside-night-en.png](../review/phase-3d/continuation/inside-night-en.png)
- [review/phase-3d/continuation/inside-night-ar.png](../review/phase-3d/continuation/inside-night-ar.png)
- [review/phase-3d/continuation/park-day-en.png](../review/phase-3d/continuation/park-day-en.png)
- [review/phase-3d/continuation/park-day-ar.png](../review/phase-3d/continuation/park-day-ar.png)
- [review/phase-3d/continuation/park-night-en.png](../review/phase-3d/continuation/park-night-en.png)
- [review/phase-3d/continuation/park-night-ar.png](../review/phase-3d/continuation/park-night-ar.png)
- [review/phase-3d/continuation/mobile-night-en.png](../review/phase-3d/continuation/mobile-night-en.png)
- [review/phase-3d/continuation/mobile-night-ar.png](../review/phase-3d/continuation/mobile-night-ar.png)
- [review/phase-3d/continuation/contact-01.png](../review/phase-3d/continuation/contact-01.png)
- [review/phase-3d/continuation/contact-02.png](../review/phase-3d/continuation/contact-02.png)
- [review/phase-3d/continuation/contact-03.png](../review/phase-3d/continuation/contact-03.png)
- [review/phase-3d/continuation/contact-04.png](../review/phase-3d/continuation/contact-04.png)
- [review/phase-3d/continuation/contact-05.png](../review/phase-3d/continuation/contact-05.png)

Evidence: `results.json`, `refresh-results.json`, `robust.json`, `pitch-check.json`, and copied QA
scripts/build logs under `review/phase-3d/continuation/qa/`. The scripts also remain in
`/tmp/jcd-3d/continuation/` until the next cleanup/reboot.

## 10. Phase closeout — 5 November 2026

Implementation and verification are complete for this 3D refinement. The recorded browser/build
checks above were run on 4 November; closeout did not change the implementation or repeat those
measurements. The final 32 desktop views and two mobile views were visually inspected on
5 November, using the five contact sheets and full-size checks of the note placement. The review
note clears the Arabic draft badge and mobile panel; the stadium's distant seating remains lit
at night. Simplified city massing and foliage remain visible limitations, as listed above.

All 39 PNG files listed in §9 exist. Desktop/mobile dimensions were checked, and their SHA-256
hashes are recorded in `review/phase-3d/continuation/qa/screenshots.json`. Capture, performance,
robustness and pitch/fallback results report no browser errors. The QA scripts, contact-sheet
helper and original logs are now copied into that local `qa/` archive.

The local commit for this phase uses the message **Complete illustrative 3D landmarks, lighting
and landscape**. It includes the inherited Claude 3D work plus this continuation, within the §8
file scope. The four protected marketing diffs were compared with the starting snapshot and are
unchanged by the 3D work. Nothing is pushed.

**Next step:** client visual review of §9's screenshots. Native Arabic, Safari/Edge, real touch
and connected-TV checks remain open; the Guided Tour follows as its own phase.
