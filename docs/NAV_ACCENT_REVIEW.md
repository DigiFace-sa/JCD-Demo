# 3D navigation accent — 5 November 2026

The navbar's 3D Experience link uses the existing JCDC brass token (`--jcdc-secondary`,
`#cc9f53`) as a pill background with ink text. It has a quiet hover tint and becomes a full-width
featured action in the mobile menu. Existing EN/AR text, the route and the separate 3D scene
are unchanged. Brass/ink text contrast is approximately 7.39:1.

Verification: lint, review build and pitch build passed. Chrome checks passed in EN and AR
for the 1920×1080 hero and scrolled headers, 1150px navigation fit, and the 390×844 mobile
menu, touch target and Escape dismissal. Browser console: clean. All six stills were inspected.
Real-device/Safari testing was not repeated for this styling change. No functional issues found.
This phase is committed locally for review; it has not been pushed.

Screenshots (gitignored):

- [review/nav-accent/desktop-hero-en.png](../review/nav-accent/desktop-hero-en.png)
- [review/nav-accent/desktop-hero-ar.png](../review/nav-accent/desktop-hero-ar.png)
- [review/nav-accent/desktop-scrolled-en.png](../review/nav-accent/desktop-scrolled-en.png)
- [review/nav-accent/desktop-scrolled-ar.png](../review/nav-accent/desktop-scrolled-ar.png)
- [review/nav-accent/mobile-menu-en.png](../review/nav-accent/mobile-menu-en.png)
- [review/nav-accent/mobile-menu-ar.png](../review/nav-accent/mobile-menu-ar.png)

Evidence: `review/nav-accent/results.json`; QA script and build logs in `review/nav-accent/qa/`.
