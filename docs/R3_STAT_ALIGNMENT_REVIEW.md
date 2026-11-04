# R3 refinement — Invest stat alignment

Completed 4 November 2026, following the user's request that the four rationale blocks have
the same width and height. The previous area figure wrapped its unit and shifted its label,
heading and description below the other columns.

The four equal-width columns now share figure, label, heading and body tracks through CSS
subgrid. The figure scales consistently to the available column width and stays on one line.
Metric and description wrappers preserve four grid rows even when review markers are present.
Size containment is scoped to the metric wrapper, since placing it on the article prevents
subgrid from sharing its parent's tracks. Existing copy, counter/reveal motion and RTL remain.

## Verification

- Production Chrome/Metal: **12 configurations passed**, covering EN/AR at 1920, 1366, 1050,
  800 and 390 CSS pixels wide, plus both languages at 1920 with reduced motion.
- Equal column widths, equal article heights and aligned internal rows within each visual
  row; matching figure font sizes, no overflowing figures or horizontal document overflow.
  Tablet pairs and the mobile stack retain complete content in normal flow.
- At 1920: every block is **352 × 272.914 px in English**, and **352 × 291.758 px in Arabic**.
  The figure font is **45.76 px** for all four blocks in either language. Locale heights follow
  their text; all blocks within the desktop row match.
- Console/page errors: **clean**. Raw evidence: `review/phase-R3-stat-alignment/qa/checks.json`.
- `npm run lint`, `npm run build`, `npm run build:pitch` and `git diff --check`: passed.
- All eight stills and the contact sheet were inspected. No new content, form, 3D, frame-time
  or lifecycle testing was needed for this scoped layout change. Wider R4 browser/device and
  native Arabic review remain as documented in the main R3 reports.

An initial narrow-width check caught size containment disabling subgrid, which was corrected
before the final complete run. Font-size comparisons allow fractional pixel rounding between
equal grid columns; row alignment/dimensions use a one-pixel tolerance.

## Screenshots

Desktop and reduced-motion stills are 1920×1080; tablet supplements are 800×1080 and mobile
supplements 390×844. Files are gitignored. Scripts and command logs are copied into `qa/`.

| View           | English                                         | Arabic                                          |
| -------------- | ----------------------------------------------- | ----------------------------------------------- |
| Desktop        | `review/phase-R3-stat-alignment/desktop-en.png` | `review/phase-R3-stat-alignment/desktop-ar.png` |
| Reduced motion | `review/phase-R3-stat-alignment/reduced-en.png` | `review/phase-R3-stat-alignment/reduced-ar.png` |
| Tablet         | `review/phase-R3-stat-alignment/tablet-en.png`  | `review/phase-R3-stat-alignment/tablet-ar.png`  |
| Mobile         | `review/phase-R3-stat-alignment/mobile-en.png`  | `review/phase-R3-stat-alignment/mobile-ar.png`  |

Contact sheet: `review/phase-R3-stat-alignment/contact-01.png`.

The completed refinement is committed locally after the final diff check; no push or deployment.
