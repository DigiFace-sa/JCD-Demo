# Jeddah Central Interactive Demo: Handoff Prompt for Codex

> **Phase 5 update:** the stadium implementation is now ready for review. Read
> [PHASE_5_REVIEW.md](PHASE_5_REVIEW.md) for the current implementation, measured performance,
> disposal checks, open items and screenshot paths. The body below records the original
> Phase 4 handoff and Phase 5 brief. Phase 6 remains pending the user’s go-ahead.


You are taking over a project that is partly built. Phases 1, 3 and 4 are finished, and the
next phase is 5. Read this whole document before you change anything. It explains:

- the client and the goal,
- every decision already made,
- the architecture and its conventions,
- the approved visual direction and the techniques behind it,
- the traps already found and fixed,
- exactly what remains, in order.

When this document and the code disagree, the code is the truth. Read the file, then follow
the intent described here.

---

## 0. Your role and working rules (non-negotiable)

You are a senior creative front-end engineer specialising in WebGL (Three.js), motion (GSAP) and
bilingual EN/AR production websites. Quality and polish matter more than feature count.

1. **Work in phases.** At the end of every phase:
   - stop and summarise what was done, with honest numbers;
   - list the open issues;
   - list the review screenshots (see rule 4);
   - make a local git commit;
   - wait for the user's go-ahead.

   **Never push.** Never commit unless a phase is complete or the user asks.
2. **Never invent facts, statistics or claims about Jeddah Central.** Use only the content in
   §4 of this document. Anything missing becomes a visible `[TBC: …]` placeholder.
   Placeholder copy you write gets the marker `[DRAFT — client to approve]`.
   Never put numbers in drafts.
3. **No hard-coded UI text.** Every visible string goes in `src/i18n/en.json` and `src/i18n/ar.json`.
   Arabic is always a draft; there is no native reviewer. Add any uncertain phrase to the README's
   "Arabic review list".
4. **Screenshots every phase.** End each phase with 1920×1080 stills of the relevant views, in
   **both English and Arabic** wherever UI is visible. Save them under `review/phase-N/`
   (that folder is gitignored) and list every file path in your report. The user reviews the look
   themselves.
5. **Stop on a dated look.** If the 3D starts to look like a video game from 2010, stop and tell
   the user rather than pushing on. Look at your own renders before showing them. Earlier phases
   caught blown-out bloom, invisible terrain, banding and "flying saucer" landmarks this way,
   before the user saw them.
6. **Report faithfully.** If something fails, say so with the output. If you skip a step, say so.
   Never claim a check you didn't run.
7. **Code quality:**
   - Clean, typed, modular TypeScript (`strict`).
   - Comment where the intent isn't obvious, and match the density of the surrounding code.
   - No dead code, no magic numbers (use named constants with a doc comment), no console noise.
   - `npm run lint` and `npm run build` must be clean at the end of every phase.

---

## 1. Context

- **Client:** Jeddah Central Development Company (JCDC), a PIF company and master developer of
  Jeddah Central, a waterfront destination on the Red Sea in the heart of Jeddah.
- **Agency:** Brandship (Saudi Arabia). This is a **pitch demo to regain JCDC's trust**. It must
  feel premium, flawless, and clearly beyond their current website.
- **Reference the client likes:** Masar Destination (a bilingual corporate site plus a separate 3D
  map "experience"). We match that structure and go further, because users can fly into
  landmarks. **Never copy or hotlink JCDC's or Masar's images, renders, logos or code.** All
  work is original. There are placeholder slots for official assets only.
- **Presentation:** shown live on a big TV in a meeting, often driven by a hands-free Guided Tour.
  Desktop-first; mobile must not break.
- **Pitch hardware (decided):** the user's own **Apple M1 Mac** (entry-level GPU), connected to a TV
  with macOS display output at **1080p**. The performance budget is **60 fps on the High tier at
  1920×1080 on this M1**, including during camera flights. Adaptive quality stays on as a safety
  net.
- **Offline:** the pitch must run with no internet. Everything is self-hosted. Hash routing is
  used so any static server works.

---

## 2. Decisions already made (do not re-ask)

| Topic | Decision |
|---|---|
| Brand colours | Placeholder tokens (teal, brass, coral, sand, ink), each marked `[TBC: replace with official JCDC hex]` in `src/styles/tokens.css`. Everything derives from five tokens via `color-mix()`. |
| Logo | Neutral placeholder wordmarks in `public/brand/logo-en.svg` and `logo-ar.svg`. The real files drop in under the same names. |
| Fonts | IBM Plex Sans and IBM Plex Sans Arabic for everything, self-hosted via `@fontsource`; light weights for display text. They swap automatically on `<html lang="ar">`. |
| Imagery | No client images. Marketing pages use **stills rendered from our own 3D scene** plus gradient and pattern compositions. |
| Audio | No files provided. Wire the system with **silent placeholders**, muted by default. |
| Placeholder copy | Written drafts marked `[DRAFT — client to approve]`. Facts not yet confirmed are marked `[TBC: …]`. |
| `SHOW_PLACEHOLDER_MARKERS` | Review build shows the markers; `npm run build:pitch` strips them automatically in `t()`. |
| Area figure | Show **5.7 million m²**. The flag about 5.6 vs 5.7 lives in code comments and the README only, never on screen. |
| Recognition strip | Goes on both Home and Invest (LEED Gold pre-certificate, EFQM 4-star, King Abdulaziz Quality Award silver). |
| Arabic | No native reviewer: flag everything and keep the README list. Use Western digits (flagged for confirmation). |
| Geography | Stylised, plausible coastline, not surveyed. A true sunset over the sea to the **west** is the hero look. |
| Stadium | An original form. Fly-in route: **map → past the facade → through a vomitory tunnel → into the bowl**. |
| Hosting | Local plus a static `dist/` that runs anywhere. Pitch launcher: `start-pitch.command` / `.bat`. |
| Guided Tour | **2.5–3 minutes**, every shot timed in a data file; `?tour=1` autostarts it. |
| Routing | **Hash routing** (`#/experience/stadium`). Deep links for every landmark and every stadium hotspot. |
| Mobile | A reduced but working version is enough. |
| Invest form | Fields: name, email, phone, company, sector interest, investor type, message, consent. Front-end only, validated, with a success state. |
| Legal pages | Placeholder text. |
| Git | Commit locally at the end of each phase. **Never push.** |
| Phase order | 1 Setup ✅ → 3 3D foundation ✅ → 4 Masterplan ✅ → **5 Stadium** → 6 Guided Tour → 2 Marketing pages → 7 Polish. |
| Pitch build | `npm run build:pitch` produces `dist-pitch/` with markers hidden and `?debug` ignored. |
| Reflections | High tier only, kept only if they fit the budget. Done in Phase 4. |
| Launcher | Forces Chrome to 1× device pixels by default (`--hidpi` opts out), so a HiDPI TV mode still renders at 1080p. |

---

## 3. Tech stack and commands

- Node 24, npm. **Vite 8**, **TypeScript 6** (`strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax`), **three 0.187** with `three/addons`, **GSAP 3.15**. ESLint 10 runs
  `typescript-eslint` **strictTypeChecked** with Prettier config; Prettier uses single quotes,
  printWidth 100 and trailing commas. Plain CSS with tokens and logical properties.
- Scripts:

  | Script | What it does |
  |---|---|
  | `dev` | Dev server |
  | `build` | Review build into `dist/` |
  | `build:pitch` | Pitch build into `dist-pitch/` |
  | `preview` | Serve `dist/` |
  | `preview:pitch` | Serve `dist-pitch/` |
  | `lint` | ESLint |
  | `format` | Prettier |
- Env files: `.env` (markers visible, debug allowed) and `.env.pitch` (both false), read in
  `src/config.ts`.
- URL flags work in the query string or after the hash:

  | Flag | Effect |
  |---|---|
  | `?lang=en\|ar` | Force the language for one visit |
  | `?debug` | FPS panel, with buttons to force a tier and jump to reference views |
  | `?quality=high\|medium\|low` | Lock the quality tier |
  | `?tour=1` | Autostart the tour (implement in Phase 6) |
- Launcher: `scripts/pitch.mjs` is a zero-dependency Node server for `dist-pitch/`. It opens
  Chrome (or Edge) in kiosk mode at `#/experience`, using a dedicated profile with translation
  disabled. Flags: `--tour`, `--no-kiosk`, `--no-browser`, `--hidpi`.
- Commits so far: `069fcc6` (Phase 1), `f4bfd01` (Phase 3), `5312721` (Phase 4).

---

## 4. Approved content (the ONLY facts you may display)

- Waterfront destination on the Red Sea in the heart of Jeddah.
- Area **5.7 million m²** (see the flag in §2).
- **9.5 km shoreline**, **public beach 2.1 km**, and a marina.
- **4 landmarks, 10 attractions, 6 districts.**
- **Phase 1 is targeted for completion by the end of 2027.**
- **Stadium:** a FIFA-standard sports, entertainment and cultural hub blending local architecture
  with cutting-edge technology, with distinctive gardens and green open spaces. Capacity is
  **[TBC]**. Do not display any number. Public sources cite about 45,000; do not use it.
- **Opera House:** Saudi Arabia's first opera house. Three theatres totalling 2,400 seats: 1,500
  main, 700 medium, and a 200-seat training hall.
- **Oceanarium & Coral Farm:** showcases Red Sea marine life and biodiversity conservation.
- **Museum:** an industrial heritage museum `[TBC: details]`.
- **Districts:** Central, Marina, Beach / Leisure & Lifestyle, Sports Park, Culture & Creativity,
  Wellness. Their descriptions are drafts, already written.
- **Attractions (only these three are named):** Entertainment Pier, Public Beach, Cruise
  Terminal. The other seven are `[TBC]`.
- **Sustainability:** coral reef restoration, 40% public realm, shading systems, smart mobility,
  smart infrastructure, active outdoor cooling.
- **Investment sectors:** residential, hospitality, retail, wellness, commercial.
- **Recognition:** LEED Gold pre-certificate, EFQM 4-star, King Abdulaziz Quality Award (silver).
- **Stadium hotspot copy:** write short, elegant placeholder copy for each hotspot, every body
  marked `[DRAFT — client to approve]`, with no invented numbers.

---

## 5. Architecture (what exists and where)

```
index.html                 inline script applies stored lang/dir before first paint (key 'jcdc.lang')
scripts/pitch.mjs          offline kiosk launcher
start-pitch.command/.bat   double-click wrappers
public/brand/              placeholder logos; public/models/ (create) for future GLBs
src/
  main.ts                  fonts → styles → initI18n → AppShell → router.start
  config.ts                SHOW_PLACEHOLDER_MARKERS, readRuntimeFlags(), QualityTier
  i18n/i18n.ts             t(key, vars), setLang, onLangChange, translateDom(root)
                           typed keys from en.json; missing AR key = compile error;
                           markers stripped in pitch builds
  i18n/en.json, ar.json    all copy (ar.json has _meta.status = AR DRAFT)
  router/Router.ts         hash router: serialised navigations (spam-safe), GSAP fade,
                           focus moves to the new <h1>; pages sharing a pageId update in place
  router/routes.ts         route table; marketing routes are temporary StubPages until Phase 2
  router/Page.ts           Page { mount(outlet), update?(ctx), unmount() }
  components/              AppShell (skip link, header, main, footer, AR draft badge),
                           Header, Footer, LangToggle (listener-free), icons
  pages/stub/StubPage.ts   TEMPORARY: replace with real pages in Phase 2
  pages/not-found/         404
  pages/experience/
    ExperiencePage.ts      lazy-loads the 3D, loading/fallback states, side panel,
                           URL ↔ focus sync, hint
    ui/SidePanel.ts        overview (stats + lists) and detail view; collapse; Escape = back
  data/                    content STRUCTURE only (ids, i18n keys, layout): geo.ts, landmarks.ts,
                           districts.ts, attractions.ts, site.ts (nav, legal, social, DESTINATION_STATS)
  styles/                  tokens.css, base.css, layout.css, components/*.css (map.css = 3D UI)
  utils/                   dom (fragmentFromHtml, requireElement), motion (EASE_*, DURATION,
                           motionDuration, prefersReducedMotion), storage (try/catch localStorage)
  experience/              (separate lazy chunk, about 150 KB gzip)
    Experience.ts          renderer, scene, camera, loop, resize, quality, reflections, dispose.
                           Public API: ready(), start(), intro(), onSelect(), focus(), hover(),
                           onUserInput(), setAvoidElements(), setPanelInset()
    types.ts               Updatable, Disposable, Focus {kind: landmark|district|attraction, id}
    config/scene.ts        ART DIRECTION: sun, sky, render, light, atmosphere, sea, post,
                           coast, context city, facade
    config/masterplan.ts   land shape, quays, field and ground grid, parks, plazas, building
                           profiles, landscape
    config/views.ts        MAP_LIMITS and reference views (map = spawn, wide, low, sun,
                           waterfront, city)
    config/layers.ts       LAYERS.REFLECTED = 1
    core/                  Renderer (ACES, sRGB, PCF), Composer (MSAA scene pass, bloom,
                           output, vignette and dither), Quality (tiers + adaptive), Debug panel
    world/
      World.ts             assembles everything
      Environment.ts       Sky (patched), sun, hemisphere light, PMREM, sky cube, haze LUT,
                           fitShadow()
      Atmosphere.ts        shared haze uniforms; patch(material, extension?) replaces three's fog
                           and supports MaterialExtension hooks (vertexPars, vertexMain,
                           fragmentPars, afterDiffuse, afterRoughness, afterEmissive)
      Sea.ts               sea shader material and quad; setReflection()
      PlanarReflection.ts  mirrored camera, REFLECTED layer only, half resolution, oblique clip
      ShoreField.ts        RG half-float texture: R = signed distance (+ = land), G = beach weight
      Coastline.ts         natural waterline x(z)
      Terrain.ts           natural-coast strips north and south, plus far skirt
      ContextCity.ts       anonymous instanced filler city (darker, recedes)
      Facade.ts            procedural glazing, dusk window lights, optional district highlight
      waveNormals.ts       procedurally generated tiling normal map (no image asset)
      masterplan/          MasterplanShape (land SDF, shoreX, beachWeight, groundHeightAt,
                           parkWeight, isInsideMasterplan), MasterplanGround (shore-snapped grid +
                           district attributes), MasterplanBuildings (one InstancedMesh per
                           district), Landscape (palms + trees), Breakwaters (extruded quays),
                           Waterfront (pier + cruise terminal), Masterplan (assembly +
                           hover/select highlight + overlay distance fade)
      landmarks/           LandmarkModel (contract, createPickProxy, landmarkRoot,
                           gltfLandmark), geometry (ellipticRing/Band/Disc), lattice
                           extension, stadium/ (Stadium exterior, pitchTexture), OperaHouse,
                           Oceanarium, Museum, Landmarks (registry: one-line GLB swap)
    interaction/           Controls (orbit, pan, zoom, keyboard, limits, damping, onUserInput),
                           CameraDirector (flyTo with arc lift, spam-safe), Markers (HTML),
                           MapInteraction (markers, picking, hover, focus framing, panel offset)
    shaders/               atmosphere, sea.vert/frag, facade, district, lattice (.glsl?raw)
    utils/                 dispose (disposeObject), random (seeded mulberry32), polygon
```

### Contracts to keep

- **Disposal:** every 3D class has `update(delta, elapsed)` if it animates, and `dispose()` that
  frees geometry, materials, textures, listeners and GSAP tweens. `Experience.dispose()` also loses
  the WebGL context (after `renderer.dispose()`, so three doesn't log). Leaving and re-entering the
  Experience must not leak.
- **Content separation:** content lives in `data/` and `i18n/`, never inside 3D or UI components.
- **Text binding:** DOM text is bound with `data-i18n="key"` and
  `data-i18n-attr="aria-label:key;title:key"`. `setLang()` re-translates the whole document,
  so components never re-render on a language change. For an interpolated string, use `t()` plus
  an `onLangChange` listener, and unsubscribe on unmount.
- **RTL:** use CSS logical properties everywhere. Directional icons carry `.icon--directional` and
  are mirrored in RTL; `.icon-flip-back` makes a back arrow. The 3D scene does not mirror. The
  side panel moves to inline-end, and the camera framing compensates through `setPanelInset`
  (the sign flips in RTL).
- **Motion:** GSAP with `EASE_OUT`/`EASE_IN_OUT` and `motionDuration()`. No bounce or elastic,
  anywhere. Respect reduced motion: near-instant transitions and no idle camera drift.

---

## 6. Design direction

### Marketing site (Phase 2 builds it out)

- Premium, calm, cinematic: Apple product page meets luxury real estate. Generous whitespace,
  large light-weight type, slow and confident motion, refined micro-interactions.
- **Palette:** sand-tinted off-white background, deep Red Sea teal as primary (buttons), heritage
  brass (eyebrows: use the darker `--color-highlight` for text, which meets AA), sunset coral
  accent, near-black ink. Dark sections (footer, 3D) use ink with sand text.
- **Type:** fluid `clamp()` scale (`--step--1` … `--step-6`). `.display` is huge and light,
  `.lead` is a light subtitle at max 38rem, `.eyebrow` is uppercase tracked brass (no tracking in
  Arabic).
- **Motif:** the original roshan lattice tile (`src/assets/patterns/roshan.svg`), used as a CSS mask
  in `--color-pattern`, subtle. Never copy JCDC's patterns.
- **Buttons:** pill-shaped. Primary is teal; there are secondary and ghost-on-dark variants. Arrows
  nudge forward on hover, and the direction follows RTL.

### 3D look (APPROVED by the user; don't change without a reason)

- **Golden hour:** the sun sits 3.4° above the sea to the west (bearing 258°). Preetham sky with
  turbidity 10, rayleigh 4.5, Mie 0.003, g 0.91.
  - **Patches:** the sun disc is reduced from 760 to 14, the glow rolls off softly at 2.5
    (otherwise it clips to white), a tint pulls the olive mid-sky toward rose, a zenith tint
    pulls it toward blue-violet, and radiance is capped.
  - **Exposure:** ACES at 0.46.
- **Haze:** height-based aerial perspective on every material and the sea. Its colour comes from a
  **baked 256-px horizon lookup** (a wide average of a cloud-free sky cube at mip 0) with a soft
  highlight roll-off.
- **Sea:**
  - four scrolling octaves of a procedural normal map;
  - Fresnel reflection of a sky cube that includes clouds;
  - an HDR sun glitter path that feeds the bloom;
  - shallow turquoise and foam **only on beaches** (from the G channel of the shore field);
    quay walls drop into deep water;
  - the body colour is lifted so the sea never goes black when looking away from the sun.
- **Post:** bloom only on true highlights (threshold 3.5, half-resolution blur), a soft vignette,
  and sub-LSB dither so gradients never band on a TV.
- **Spawn map:** the camera sits over the sea looking ESE at the masterplan, so the low sun rakes
  warm light across the facades. It reads like a lit architectural model:
  - the context city recedes in a darker tone;
  - parks have organic, wobbly outlines;
  - district outlines are soft gold lines in idle, and hover or select adds a coloured fill plus a
    building glow;
  - overlays fade out in close-ups.
- **Landmark close-up shots:** these face west, toward the sunset, for backlit drama. That's
  deliberately the opposite of the map's orientation.
- **Map UI:**
  - dark glass panels at 84% ink, **no `backdrop-filter`** (it cost about 4 fps over the canvas);
  - brass accents;
  - landmark markers are a brass dot with a slow halo and a glass pill label;
  - district markers are spaced uppercase text;
  - attraction markers are small dots whose label appears on hover;
  - the side panel holds stats, lists and a detail view with a brass or district-colour accent
    line.

### Landmark forms (original, stylised; the client will supply the real designs later)

- **Stadium:** an elliptical bowl, long axis north–south.
  - A brass **roshan-lattice facade** glows warmly from within. The lattice is painted with a
    shader that fades to its average at distance, and holes are never cut out.
  - A white sloping roof ring, with a floodlight band under its inner edge.
  - A seating bowl and a canvas-texture pitch.
  - Gardens around it.
- **Opera House:** three tall, thin white curved sails rising and cantilevering toward the sea,
  over a warm-glowing glass hall on a stone podium at the tip of the peninsula.
- **Oceanarium:** a cluster of three white lattice domes glowing aqua inside.
- **Museum:** a brick industrial hall with a sawtooth north-light roof, a tall chimney with a brass
  crown, and a steel tank.

---

## 7. Hard-won technical lessons (avoid repeating these)

1. **Headless Chrome barely fires `requestAnimationFrame`** without a real GPU and Playwright.
   Use `playwright-core` with the installed Chrome:
   - `executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`
   - args `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`
   - read FPS from the `?debug` panel

   The **first run after a file edit** on the dev server is noisy, because Vite is still
   recompiling. Repeat a measurement before trusting it, and measure the **production build**
   (`npm run build && npx vite preview --port 4173`).
2. **Shadows must not re-render during camera moves.** A focus-following shadow frustum made
   flights about 30 fps. `Environment.fitShadow(min, max)` fits the frustum once, in light space,
   around a box (the masterplan region), with `shadowMap.autoUpdate = false`. When the stadium
   interior needs sharper shadows, refit once on entry and once on exit, never per frame.
3. **`backdrop-filter` over the WebGL canvas is expensive.** Don't use it in Experience UI.
4. **MSAA:** multisample only the scene render (`MultisampleRenderPass` in `Composer.ts`). A
   multisampled composer buffer made every post pass pay for it.
5. **HDR hot spots:** three's Sky sun disc is ×760, and a hot glitter value flooded the bloom.
   Cap the radiance.
6. **Hard clamps create visible bands.** Use soft roll-offs instead, as in the haze and the sky
   glow.
7. **Cube-map mip levels have per-face seams.** Sample mip 0 and average in a baked lookup table.
8. **Winding order:** custom geometry must be counter-clockwise seen from above, or it gets
   culled. Thin diagonal features (breakwaters) can't live in a terrain grid; they're
   extruded meshes. Grid vertices near the waterline are **snapped onto the contour**, which
   is what gives smooth shores.
9. **Seams between terrain pieces:** overlap them by a row, with the outer piece slightly lower.
   Edge-to-edge seams show hairline cracks to the sea.
10. **Three.js warns if you pass `side: undefined`** to a material. Always pass a real side.
11. **Lint gotchas:**
    - `as const` config numbers make loop variables literal types, so write `let x: number = …`.
    - Don't return a void expression from an arrow shorthand.
    - `Matrix4.elements` is a tuple, so no `??` fallbacks.
    - Use `restrict-template-expressions` with numbers only.
    - Prettier reformats lines. Read the file before string-replacing, or use real editing tools.
12. **Router behaviour:** routes sharing a `pageId` call `Page.update()` instead of remounting.
    The Experience relies on this for deep links. Navigation is serialised, so spamming is safe.
13. **`CameraDirector.flyTo` cancels any running flight** and locks input while it runs. Debug view
    buttons must cancel flights first (they do).
14. **Markers** are real `<button>`s. Invisible ones get `pointer-events: none` and `tabIndex = -1`.
    Positions are written through cached transforms. They avoid UI rects registered with
    `setAvoidElements`, and they're hidden during flights.
15. **Memory:** the heap rises over about 10 enter/leave cycles while V8 warms up, then levels
    off. Phase 4 plateaued at about 7.8 MB. A leak test needs 15+ cycles with
    `--js-flags=--expose-gc --enable-precise-memory-info` and `gc()` before reading
    `performance.memory`.

---

## 8. QA toolkit (recreate it; it isn't in the repo)

Install `playwright-core` **outside** the project, for example in `/tmp/qa`. It adds no project
dependency. Build small scripts that:

- **Stills:** open `http://localhost:4173/?lang=en|ar#/experience…`, wait for
  `.experience[data-state="ready"]` plus the intro (about 6 s), and screenshot at 1920×1080. For
  clean stills, open with `?debug` and inject `.debug-panel{visibility:hidden}`; view buttons have
  `data-debug="view-<name>"` and tier buttons `data-debug="tier-<tier>"`.
- **Performance:** click each tier and view, wait 5 s, then sample the first line of the debug
  panel (`FPS … (avg, worst)`). For flights, change `location.hash` between landmarks and sample
  every 0.6 s.
- **Robustness:** spam hash changes and marker clicks mid-flight; use the keyboard (Tab to
  `.marker`, Enter, Escape); switch language in a detail view; collapse the panel; use a 520×900
  viewport for mobile (headless enforces a minimum width of about 500).
- **Leaks:** run 15+ enter/leave cycles plus rapid enter/leave mid-load; check the heap and that
  `canvas` count is 0 after leaving.
- **Fallback:** launch with `--disable-3d-apis --disable-webgl` and expect
  `data-state="fallback"`.
- **Pitch check:** run `node scripts/pitch.mjs --no-browser` on port 4321, then confirm no
  `.debug-panel` and no `[TBC|DRAFT` in the DOM.
- **Contact sheets:** load several PNGs as data URLs into a grid page and screenshot it.
- **Every phase report:** "console: clean", or the actual messages.

---

## 9. Current state (after Phase 4, commit `5312721`)

- **Working:**
  - shell, i18n with RTL, router, header and footer;
  - the Experience with spawn map, intro, markers, picking, district highlight, side panel,
    flights, deep links `#/experience/:landmark`, reflections on High, and the WebGL fallback.
- **Performance:** 60 fps at 1080p on High on the M1, on the map and during flights.
- **Temporary:**
  - marketing pages are `StubPage` placeholders;
  - the Experience toolbar has only Back to site and the language toggle;
  - all four landmarks show "Full experience coming in the complete build" (`map.previewNote`).
- **Known open items:**
  - The layout isn't surveyed. Offer to align it to an official masterplan image; only the data
    and config files would change.
  - The context city and the masterplan buildings look boxy up close.
  - The portrait mobile framing of the map is weak.
  - The Opera House form may need another design pass. Ask the user.
  - The header in the marketing shell still uses `backdrop-filter`. Remove or replace it when the
    Home 3D hero sits behind it.
  - The Arabic review list is in the README.

---

## 10. Remaining phases: what to build

### Phase 5: Stadium (the hero landmark; the most important 3D work)

Build the fully explorable stadium in `src/experience/world/landmarks/stadium/`, reusing the
existing exterior.

1. **Interior, procedural and premium:**
   - pitch with markings (`pitchTexture.ts` already exists);
   - a **multi-tier seating bowl**: at least two or three tiers with stepped rakes, aisles and
     vomitory openings. Seat colour comes from a shader pattern, not millions of triangles.
     Instance actual seats only where the camera gets close, if at all. Stay inside the 60 fps
     budget.
   - a roof structure with an underside showing structural ribs or trusses, plus the floodlight
     ring;
   - a concourse ring behind the bowl;
   - VIP / hospitality boxes as a glazed band with a warm interior glow;
   - the exterior lattice facade (exists) and the sports park greenery (exists).
2. **Camera inside:**
   - free look-around with constrained orbit: new `ControlLimits` for the interior, target bounds
     around the pitch, a polar range, a minimum height above the seats, no clipping through the
     bowl;
   - `Controls.setLimits()` switches limits on entry and exit;
   - refit shadows once to the stadium box with `fitShadow`; restore on exit;
   - the near plane already scales down with height.
3. **Fly-in transition (about 3–4 s, cinematic):**
   - from the map, past the exterior, **through a vomitory tunnel**, into the bowl;
   - this needs a **path-based flight**: a CatmullRom curve of camera positions plus look-at
     targets, eased, added to `CameraDirector` (e.g. `flyAlong(path)`) next to the existing
     orbit-lerp `flyTo`;
   - UI (markers, panel) fades out during the flight and back in on arrival; input is locked;
   - **"Back to map" reverses** the flight smoothly;
   - spam-proof: a new request cancels cleanly, and the end state always matches the last
     request.
4. **Hotspots:** Pitch, Seating Bowl, Roof, VIP & Hospitality, Concourse, Sports Park.
   - Pulsing 3D-anchored markers; extend `Markers` with a `hotspot` kind, or add a small
     `Hotspots.ts`.
   - Clicking flies to that hotspot's viewpoint and opens a bilingual info panel. Reuse the side
     panel's detail view with a new kind.
   - Copy keys: `stadium.hotspots.<id>.title` and `.body`, with every body marked
     `[DRAFT — client to approve]`, no numbers, and Arabic drafts.
5. **Routing:** `#/experience/stadium` stays as the exterior focus. Its panel gets an
   **"Enter the stadium"** CTA, which replaces the preview note for the stadium only. Add hotspot
   deep links `#/experience/stadium/<hotspot>`, where an interior arrival viewpoint such as
   `inside` lands in the bowl. Validate hotspot ids in `routes.ts` (the pattern
   `/experience/:landmark/:hotspot` already exists). A cold load of a hotspot deep link lands
   directly inside, with no flight.
6. **Other landmarks** keep exterior focus and the preview panel, as the brief specifies.
7. **Stills, EN and AR:**
   - exterior approach;
   - mid-tunnel frame;
   - bowl arrival;
   - every hotspot with its panel open;
   - back-to-map midway.

   Also report performance numbers and a leak test.

### Phase 6: Guided Tour

- A data-driven `src/experience/tour/shots.ts`. Each shot has: type (orbit view, path flight, or
  focus on a landmark, district or hotspot), duration and hold time, a caption i18n key, and an
  optional district highlight. Reordering or retiming must never touch the logic in
  `GuidedTour.ts`.
- **Sequence:**
  1. aerial establishing shot;
  2. sweep across the districts, highlighting each in turn with
     `masterplan.setSelected`;
  3. fly-bys of the landmarks, including a **low waterfront shot** that shows the reflections,
     plus the sunset-facing wide and sun views;
  4. fly into the stadium;
  5. visit each hotspot;
  6. return to the map;
  7. end card.

  Total **2.5–3 minutes**.
- **Captions:** bilingual, lower-third style, crossfading.
- **Controls:** play/pause, next and previous shot, exit. **Any manual input pauses**: use
  `Experience.onUserInput` and marker or panel clicks.
- **Startup:** `?tour=1` and `scripts/pitch.mjs --tour` autostart it. Add a "Guided Tour" button to
  the Experience toolbar.
- **Robustness:** switching language mid-tour must not restart it. Respect reduced motion.
- Must run start to finish with no stutter on the M1 at 1080p. **Record the frame-time minimum
  across the whole tour.**

### Phase 2: Marketing pages (replace every StubPage)

- **Home:**
  - full-screen hero using the existing `Experience` **`variant: 'hero'`** (non-interactive, slow
    drift, sunset-facing wide view), with the headline and an "Explore in 3D" CTA. Fix the
    header blur over it.
  - destination overview with **animated counters** (GSAP, reduced-motion aware), from
    `DESTINATION_STATS`;
  - four landmark cards (**stadium first**), each linking to its landmark page and to
    `#/experience/<id>`;
  - six-districts teaser;
  - sustainability pillars (from §4);
  - recognition strip;
  - Invest CTA;
  - news teaser with `[TBC]` placeholder cards.
- **Destination:**
  - an **interactive 2D/2.5D SVG district map** built from the same `data/districts.ts` polygons
    (project the xz coordinates). Hover or click reveals a description. It must be clearly better
    than a flat image.
  - attractions section and "Sustainability by design" section.
- **Landmarks:** one data-driven template. The stadium page gets a hero, story, key facts and an
  **"Enter the stadium in 3D"** CTA, which deep-links straight into the interior. The other three
  get the same template with available content and `[TBC]` placeholders. The `/landmarks` index
  lists all four.
- **Invest:**
  - the five sectors;
  - "Why Jeddah Central" (location, landmarks, scale, sustainability);
  - the recognition strip;
  - a "Register your interest" form with the agreed fields, accessible validation, and a success
    state. No backend.
- **Legal:** placeholder pages, using the existing legal routes.
- **Imagery:** stills rendered from the 3D scene, captured with the QA toolkit, exported as WebP or
  AVIF to `public/images/renders/`. Self-hosted, with alt text from i18n.
- All pages responsive, bilingual and RTL-correct, with GSAP page transitions (they exist). Use
  ScrollTrigger for calm scroll reveals.

### Phase 7: Polish

- **Intro loader:** brand mark plus progress, skippable, shown on the first visit.
- **Transitions:** refine page and scene transitions.
- **Sound:** `experience/audio/Audio.ts`, **muted by default**, with a sound toggle in the
  Experience toolbar; an ambient sea and wind bed plus subtle UI sounds. With no files, wire
  silent placeholders.
- **Performance pass:** keep 60 on the M1 at 1080p; check Medium and Low.
- **Accessibility pass:** semantic HTML, keyboard paths, visible focus, contrast, ARIA on icon
  buttons, alt text.
- **Cross-browser:** Chrome, Edge and Safari. Watch Safari's handling of WebGL2 half-float RG
  textures and filtering, `color-mix`, and `dvh`.
- **Optional:** a sky grading pass, better mobile map framing, and context-city detail.
- **README completion:** setup, structure, editing content (i18n and data), brand tokens, editing
  tour shots, swapping in a GLB, pitch day, and the Arabic review list.

---

## 11. Definition of done (whole project)

- All pages work in EN and AR with correct RTL.
- The Guided Tour runs start to finish on a big screen with no stutter or glitches.
- The stadium fly-in and every hotspot transition are smooth, and spamming clicks can't break
  them.
- Leaving and re-entering the Experience doesn't leak memory.
- `npm run build`, `npm run build:pitch` and `npm run lint` are clean. No console errors or
  warnings.
- The README covers everything listed in Phase 7.

---

## 12. How to start

1. Read `README.md`, `src/experience/Experience.ts`, `interaction/CameraDirector.ts`,
   `interaction/MapInteraction.ts`, `pages/experience/ExperiencePage.ts`, `ui/SidePanel.ts`,
   `world/landmarks/stadium/Stadium.ts` and `config/*.ts`.
2. Run `npm install`, `npm run dev`, and open `http://localhost:5173/?debug#/experience` to see the
   current state.
3. Propose your Phase 5 plan to the user in a short list:
   - interior geometry approach and triangle budget;
   - path-flight design;
   - hotspot UI;
   - routes.

   Wait for approval, then build. End with EN and AR stills, performance numbers, leak test,
   lint and build, a local commit, and the report.
