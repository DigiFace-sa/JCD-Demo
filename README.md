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
(`file://`) is not supported: browsers block ES modules there. Use `npm run preview:pitch` or any
static server.

## URL flags

Flags work in the query string or after the hash: `?debug#/experience` or `#/experience?debug`.

| Flag                         | Effect                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| `?lang=en` / `?lang=ar`      | Force the language for this visit (not persisted)           |
| `?debug`                     | FPS panel and diagnostics (Phase 3; ignored in pitch build) |
| `?quality=high\|medium\|low` | Override adaptive 3D quality (Phase 3)                      |
| `?tour=1`                    | Autostart the Guided Tour (Phase 6)                         |

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
public/brand/          logo-en.svg, logo-ar.svg (placeholders: drop official files in)
```

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
