# Jeddah Central — Interactive Demo

Bilingual (EN/AR) pitch demo for Jeddah Central Development Company: a marketing mini-site plus a
cinematic 3D Experience of the masterplan. Vite + TypeScript (strict), Three.js, GSAP, plain CSS.

> Work in progress. This README grows each phase; the complete version lands in Phase 7 (Polish).

## Setup

Requires Node 20+.

```bash
npm install
npm run dev            # local dev server
```

| Script                  | What it does                                                               |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                                                 |
| `npm run build`         | Review build → `dist/` (placeholder markers **visible**, `?debug` allowed) |
| `npm run build:pitch`   | Pitch build → `dist-pitch/` (markers **hidden**, `?debug` ignored)         |
| `npm run preview`       | Serve `dist/` locally                                                      |
| `npm run preview:pitch` | Serve `dist-pitch/` locally                                                |
| `npm run lint`          | ESLint (type-aware)                                                        |
| `npm run format`        | Prettier                                                                   |

Both builds are fully self-contained and run offline. Routing uses the URL hash (`#/experience`),
so any static server works with no rewrite rules. Opening `index.html` straight from disk
(`file://`) is not supported: browsers block ES modules there. Use the pitch launcher below,
`npm run preview:pitch`, or any static server.

## Pitch day

One-time preparation on the pitch machine: install [Node.js](https://nodejs.org) (LTS), copy this
folder over, then run `npm install` and `npm run build:pitch` once.

On the day, **double-click**:

- macOS: `start-pitch.command` (the first time, right-click › Open to get past Gatekeeper)
- Windows: `start-pitch.bat`

It serves `dist-pitch/` on `localhost` (no internet needed) and opens Chrome, or Edge if Chrome
is missing, full-screen in kiosk mode at the 3D Experience. A separate browser profile is used,
so personal tabs, extensions and translation prompts never appear. Exit with **Cmd+Q** (Mac) or
**Alt+F4** (Windows); the local server stops with it.

For rehearsals or other entry points, run the script directly:

```bash
node scripts/pitch.mjs              # kiosk, 3D Experience
node scripts/pitch.mjs --tour       # kiosk, autostart the Guided Tour (Phase 6)
node scripts/pitch.mjs --no-kiosk   # normal window
node scripts/pitch.mjs --no-browser # serve only (open the printed address yourself)
```

## URL flags

Flags work in the query string or after the hash: `?debug#/experience` or `#/experience?debug`.

| Flag                         | Effect                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `?lang=en` / `?lang=ar`      | Force the language for this visit (not persisted)         |
| `?debug`                     | FPS panel, tier/view buttons (ignored in the pitch build) |
| `?quality=high\|medium\|low` | Lock the 3D quality tier (disables adaptive quality)      |
| `?tour=1`                    | Autostart the Guided Tour (Phase 6)                       |

## Project structure

```
src/
  main.ts              bootstrap: fonts, styles, i18n, shell, router
  config.ts            build switches (.env / .env.pitch) and URL flags
  router/              hash router, route table, Page interface
  i18n/                en.json, ar.json, i18n.ts (t(), setLang(), DOM binding)
  components/          AppShell, Header, Footer, LangToggle, icons
  pages/               routed pages (stub pages until Phase 2)
  data/                content structure (ids, i18n keys, links); no copy lives here
  styles/              tokens.css, base.css, layout.css, components/*.css
  assets/patterns/     original roshan-inspired lattice tile
  experience/          the 3D Experience (lazy-loaded; only the Experience route pays for it)
    Experience.ts      renderer, scene, camera, frame loop, resize, dispose
    config/scene.ts    ART DIRECTION: sun, sky, light, haze, sea, post, coast (all look values)
    config/views.ts    camera limits and reference views
    core/              Renderer, Composer (post chain), Quality (tiers + adaptive), Debug
    world/             Environment (sky/sun/IBL), Atmosphere (haze), Sea, Terrain, ContextCity,
                       Facade, ShoreField (shore distance field), Coastline (placeholder outline)
    interaction/       Controls (orbit/pan/zoom with limits and damping)
    shaders/           GLSL: sea, atmosphere, facade
public/brand/          logo-en.svg, logo-ar.svg (placeholders: drop official files in)
scripts/pitch.mjs      zero-dependency pitch launcher (see Pitch day)
```

## 3D quality and performance

Three tiers (`src/experience/core/Quality.ts`):

| Tier   | Render cap         | Shadows | MSAA | Bloom      |
| ------ | ------------------ | ------- | ---- | ---------- |
| High   | 2560×1440 (≤2×DPR) | 4096    | 4×   | ½-res blur |
| Medium | 1920×1080          | 2048    | 2×   | ⅓-res blur |
| Low    | 1280×720           | off     | off  | off        |

The starting tier comes from the GPU name (software renderers → Low, integrated Intel → Medium,
everything else → High). While running, if frames average slower than ~50 fps, render resolution
drops in steps (×0.85, ×0.7), then the tier drops. It never climbs back a tier on its own, because
visible oscillation would be worse than a slightly softer image. `?quality=` or the debug panel
locks a tier.

Output is always the full display resolution; a 4K TV gets a 1440p render upscaled. Measured on
an entry-level Apple M1 (the dev machine): High holds 60 fps at 1080p, about 48 fps at 1440p.

## 3D art direction

Every look value lives in `src/experience/config/scene.ts` (sun bearing and elevation, sky
model and grading, light colours, haze density, sea colours and glitter, bloom, vignette). Change
values there and reload; no other file needs touching. Reference views for checking the look are
in `config/views.ts` and selectable from the `?debug` panel.

## Editing content

All visible text lives in `src/i18n/en.json` and `src/i18n/ar.json`. Keys are type-checked
against `en.json`, and a key missing from `ar.json` fails the build.

In markup, text is bound declaratively and updates live on language switch:

```html
<h1 data-i18n="pages.home.heading"></h1>
<button data-i18n-attr="aria-label:a11y.openMenu;title:a11y.openMenu"></button>
```

### Placeholder markers

Copy that is unconfirmed carries an inline marker: `[TBC: …]`, `[DRAFT …]` or `[AR DRAFT …]`.
Markers stay visible in `npm run build` so reviewers can see them, and are stripped automatically
in `npm run build:pitch`. To confirm a piece of copy, edit the string and delete its marker.

Facts flagged in code rather than on screen:

- Area: 5.7 million m² (some official pages say 5.6). `[TBC: confirm with JCDC]`
- Stadium capacity: not displayed until confirmed.

## Brand tokens

`src/styles/tokens.css` holds five brand colours (`--jcdc-primary`, `--jcdc-secondary`,
`--jcdc-accent`, `--jcdc-sand`, `--jcdc-ink`), currently placeholders marked
`[TBC: replace with official JCDC hex]`. Every other colour is mixed from these, so replacing the
five hex values restyles the whole site. `--color-highlight` darkens the secondary colour for AA
text contrast. Re-check it if the official secondary colour is much darker or lighter.

Fonts: IBM Plex Sans (Latin) and IBM Plex Sans Arabic, self-hosted via `@fontsource` packages and
bundled into the build. The family swaps automatically on `<html lang="ar">`.

Logos: replace `public/brand/logo-en.svg` and `public/brand/logo-ar.svg`. They render at 32–40 px
high, width auto.

## Arabic review list

There is no native reviewer on the project yet, so **every Arabic string is a draft**
(`ar.json › _meta`). Review builds show an “AR DRAFT” badge while in Arabic. Phrases I am least
sure of:

| Key                         | Draft                               | Concern                                                       |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `nav.exploreIn3d`           | استكشف بتقنية ثلاثية الأبعاد        | Long for a button; “استكشف ثلاثياً” or “جولة ثلاثية الأبعاد”? |
| `landmarks.oceanarium.name` | الأحياء المائية ومزرعة المرجان      | Check JCDC’s official Arabic name for the Oceanarium          |
| `pages.invest.lead`         | …والعافية…                          | “العافية” vs “الصحة والعافية” for _wellness_                  |
| `footer.pifCompany`         | إحدى شركات صندوق الاستثمارات العامة | Match PIF’s official lockup wording                           |
| `meta.siteName`             | وسط جدة                             | Confirm brand name usage in Arabic                            |
| (all)                       | Western digits (9.5, 2,400)         | Confirm JCDC’s numeral convention for Arabic copy             |
