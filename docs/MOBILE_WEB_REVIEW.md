# Mobile website motion — 5 November 2026

This phase gives the marketing website a deliberate mobile experience while keeping the approved
desktop Home film and the separate 3D Experience. It is complete for local visual review; this
phase has not been pushed or published.

## Result

- Home below 60rem uses native document flow with scroll-driven image depth and short text
  entrances. Architectural pictures fade into the shared ink surface instead of becoming tall,
  static full-screen panels. Copy and actions stay visible after entering.
- A sticky chapter rail shows the active chapter, progress and previous/next buttons with
  44px targets. The district gallery supports horizontal touch swipes, snapping and a visible
  peek at the next card. Scrolling vertically remains native on coarse-pointer touch devices.
- Destination, the landmark index and all four landmark pages, Invest, News, all three news
  stories and all three legal pages use persistent reading entrances. Mobile heroes and
  content sections have tighter spacing, readable type and aligned actions. Editorial and
  landmark images retain a small amount of scroll depth on phones.
- The mobile menu has staggered links, a bounded scroll area and Escape handling. A narrow
  reading-progress line follows the page. Footer content enters consistently across marketing
  routes. Reduced motion shows the complete content without image travel or chapter controls.
- No content, statistics, translations, official images, models, 3D scene code or 3D controls
  were changed. Existing bilingual keys supply the controls and chapter labels.

## Implementation and preserved work

`SceneStack.tsx` owns the phone choreography separately from its existing desktop pin. The
mobile branch rebuilds when either the width or reduced-motion preference changes. A locale
switch captures scroll before document direction changes, restores it after font layout settles
and refreshes the chapter label from the visible section.

`FlowReveal.tsx` and `flowMotion.ts` provide permanent entrances for marketing content. Phone
headings move as whole blocks, preserving joined Arabic shaping and avoiding character-level
animation overhead. Counter text and focus listeners are restored/disposed with the GSAP scope.
The old `Reveal.tsx` remains for the hidden motion lab; its pre-existing uncommitted edits were
deliberately preserved. Public marketing routes use the new helper.

The original uncommitted edits in `docs/CINEMATIC_REBUILD_PLAN.md`,
`docs/CLAUDE_CONTINUE_PROMPT.md`, `src/motion/Reveal.tsx` and the pre-existing one-shot atlas
change in `src/pages/destination/Destination.tsx` remain outside this phase's commit. Only this
phase's Destination import and mobile motion changes were staged.

## Verification

- The staged source was exported to `/tmp/jcd-mobile-clean`, excluding all four pre-existing
  edits. `npm run lint`, `npm run build` and `npm run build:pitch` passed there.
- Chrome mobile emulation at 390×844: all fifteen marketing routes in English and Arabic,
  with hero/body stills, chapter buttons, scroll-driven image movement, persistent copy,
  gallery scrolling, menu/Escape and the Invest registration action. No horizontal overflow.
- Additional checks at 320×740, 844×390 landscape and 768×1024 in both languages for Home
  and Invest. A live language switch preserves scroll and the chapter label. A live reduced
  motion switch removes the image transforms. A synthesized touch drag moves the district
  gallery; selecting the Sports Park pin lifts the piece and changes its projected card.
- Desktop: all fifteen marketing routes in EN and AR at 1920×1080, DPR 1, without horizontal
  overflow. Home keeps its desktop pin and chapter navigation.
- Clean pitch build: EN/AR opening completes; draft markers and debug controls are absent;
  the 40% figure stays visible when scrolling past and back; no 3D bundle or GLB was requested
  by Home. Browser console: clean in the final mobile and pitch runs. Final mobile HTTP
  response checks: no errors. Desktop checks recorded no page errors.

During development, live reduced motion exposed a retained image transform, and a locale switch
exposed a stale chapter label. Both were fixed and specifically retested. An intermediate QA
run was discarded after rebuilding removed its cached chunks (404s); Python's temporary server
also reset some concurrent requests. Final runs use Node static servers and a frozen/clean
build. The viewport QA now forces a new document per language so a prior live language toggle
cannot mislabel a later English capture.

## Open review items

- These are Chrome emulation checks, not tests on a real iPhone, Android phone or tablet.
  Safari touch momentum, dynamic browser bars, orientation changes on hardware and physical
  keyboard/screen-reader behavior still need device review.
- Arabic copy remains a draft pending native review. This phase adds no translated copy.
- No mobile frame-time benchmark or new 3D performance/leak benchmark was run. The 3D
  Experience remains outside this phase.
- Review the local phone captures and approve before a new push; the public demo still serves
  the previously published version until this commit is pushed.

## Evidence and screenshot manifest

Artifacts are gitignored under `review/mobile-web/`. `results.json`, `extra.json`, `pitch.json` and `registration.json`
record the checks. `screenshots.json` records image dimensions. QA scripts and build logs are
copied into `review/mobile-web/qa/` for reproduction. The complete still list follows.

Final check groups: **46 passed** (30 route/mobile groups, 12 additional layout and interaction
groups, 2 pitch groups and 2 direct-to-form groups). **93 unique stills**, including **30 desktop
1920×1080 stills**, plus **12 contact sheets**. All image paths are listed below.

The phone registration CTA was also checked separately: it lands on the form itself, preserves
the selected sector and focuses Name. The EN/AR form stills below are from that final check.

- [review/mobile-web/contact-01.png](../review/mobile-web/contact-01.png)
- [review/mobile-web/contact-02.png](../review/mobile-web/contact-02.png)
- [review/mobile-web/contact-03.png](../review/mobile-web/contact-03.png)
- [review/mobile-web/contact-04.png](../review/mobile-web/contact-04.png)
- [review/mobile-web/contact-05.png](../review/mobile-web/contact-05.png)
- [review/mobile-web/contact-06.png](../review/mobile-web/contact-06.png)
- [review/mobile-web/contact-07.png](../review/mobile-web/contact-07.png)
- [review/mobile-web/contact-08.png](../review/mobile-web/contact-08.png)
- [review/mobile-web/contact-09.png](../review/mobile-web/contact-09.png)
- [review/mobile-web/contact-10.png](../review/mobile-web/contact-10.png)
- [review/mobile-web/contact-11.png](../review/mobile-web/contact-11.png)
- [review/mobile-web/contact-12.png](../review/mobile-web/contact-12.png)
- [review/mobile-web/desktop-destination-ar.png](../review/mobile-web/desktop-destination-ar.png)
- [review/mobile-web/desktop-destination-en.png](../review/mobile-web/desktop-destination-en.png)
- [review/mobile-web/desktop-home-ar.png](../review/mobile-web/desktop-home-ar.png)
- [review/mobile-web/desktop-home-en.png](../review/mobile-web/desktop-home-en.png)
- [review/mobile-web/desktop-invest-ar.png](../review/mobile-web/desktop-invest-ar.png)
- [review/mobile-web/desktop-invest-en.png](../review/mobile-web/desktop-invest-en.png)
- [review/mobile-web/desktop-landmarks-ar.png](../review/mobile-web/desktop-landmarks-ar.png)
- [review/mobile-web/desktop-landmarks-en.png](../review/mobile-web/desktop-landmarks-en.png)
- [review/mobile-web/desktop-landmarks-museum-ar.png](../review/mobile-web/desktop-landmarks-museum-ar.png)
- [review/mobile-web/desktop-landmarks-museum-en.png](../review/mobile-web/desktop-landmarks-museum-en.png)
- [review/mobile-web/desktop-landmarks-oceanarium-ar.png](../review/mobile-web/desktop-landmarks-oceanarium-ar.png)
- [review/mobile-web/desktop-landmarks-oceanarium-en.png](../review/mobile-web/desktop-landmarks-oceanarium-en.png)
- [review/mobile-web/desktop-landmarks-opera-house-ar.png](../review/mobile-web/desktop-landmarks-opera-house-ar.png)
- [review/mobile-web/desktop-landmarks-opera-house-en.png](../review/mobile-web/desktop-landmarks-opera-house-en.png)
- [review/mobile-web/desktop-landmarks-stadium-ar.png](../review/mobile-web/desktop-landmarks-stadium-ar.png)
- [review/mobile-web/desktop-landmarks-stadium-en.png](../review/mobile-web/desktop-landmarks-stadium-en.png)
- [review/mobile-web/desktop-legal-cookies-ar.png](../review/mobile-web/desktop-legal-cookies-ar.png)
- [review/mobile-web/desktop-legal-cookies-en.png](../review/mobile-web/desktop-legal-cookies-en.png)
- [review/mobile-web/desktop-legal-privacy-ar.png](../review/mobile-web/desktop-legal-privacy-ar.png)
- [review/mobile-web/desktop-legal-privacy-en.png](../review/mobile-web/desktop-legal-privacy-en.png)
- [review/mobile-web/desktop-legal-terms-ar.png](../review/mobile-web/desktop-legal-terms-ar.png)
- [review/mobile-web/desktop-legal-terms-en.png](../review/mobile-web/desktop-legal-terms-en.png)
- [review/mobile-web/desktop-news-ar.png](../review/mobile-web/desktop-news-ar.png)
- [review/mobile-web/desktop-news-en.png](../review/mobile-web/desktop-news-en.png)
- [review/mobile-web/desktop-news-forum-ar.png](../review/mobile-web/desktop-news-forum-ar.png)
- [review/mobile-web/desktop-news-forum-en.png](../review/mobile-web/desktop-news-forum-en.png)
- [review/mobile-web/desktop-news-pif-ar.png](../review/mobile-web/desktop-news-pif-ar.png)
- [review/mobile-web/desktop-news-pif-en.png](../review/mobile-web/desktop-news-pif-en.png)
- [review/mobile-web/desktop-news-stadium-ar.png](../review/mobile-web/desktop-news-stadium-ar.png)
- [review/mobile-web/desktop-news-stadium-en.png](../review/mobile-web/desktop-news-stadium-en.png)
- [review/mobile-web/destination-body-ar.png](../review/mobile-web/destination-body-ar.png)
- [review/mobile-web/destination-body-en.png](../review/mobile-web/destination-body-en.png)
- [review/mobile-web/destination-hero-ar.png](../review/mobile-web/destination-hero-ar.png)
- [review/mobile-web/destination-hero-en.png](../review/mobile-web/destination-hero-en.png)
- [review/mobile-web/destination-selected-en.png](../review/mobile-web/destination-selected-en.png)
- [review/mobile-web/home-320-ar.png](../review/mobile-web/home-320-ar.png)
- [review/mobile-web/home-320-en.png](../review/mobile-web/home-320-en.png)
- [review/mobile-web/home-768-ar.png](../review/mobile-web/home-768-ar.png)
- [review/mobile-web/home-768-en.png](../review/mobile-web/home-768-en.png)
- [review/mobile-web/home-844-ar.png](../review/mobile-web/home-844-ar.png)
- [review/mobile-web/home-844-en.png](../review/mobile-web/home-844-en.png)
- [review/mobile-web/home-district-swipe-ar.png](../review/mobile-web/home-district-swipe-ar.png)
- [review/mobile-web/home-district-swipe-en.png](../review/mobile-web/home-district-swipe-en.png)
- [review/mobile-web/home-hero-ar.png](../review/mobile-web/home-hero-ar.png)
- [review/mobile-web/home-hero-en.png](../review/mobile-web/home-hero-en.png)
- [review/mobile-web/home-mid-language-ar.png](../review/mobile-web/home-mid-language-ar.png)
- [review/mobile-web/home-overview-ar.png](../review/mobile-web/home-overview-ar.png)
- [review/mobile-web/home-overview-en.png](../review/mobile-web/home-overview-en.png)
- [review/mobile-web/home-reduced-ar.png](../review/mobile-web/home-reduced-ar.png)
- [review/mobile-web/home-sustainability-ar.png](../review/mobile-web/home-sustainability-ar.png)
- [review/mobile-web/home-sustainability-en.png](../review/mobile-web/home-sustainability-en.png)
- [review/mobile-web/invest-body-ar.png](../review/mobile-web/invest-body-ar.png)
- [review/mobile-web/invest-body-en.png](../review/mobile-web/invest-body-en.png)
- [review/mobile-web/invest-form-ar.png](../review/mobile-web/invest-form-ar.png)
- [review/mobile-web/invest-form-en.png](../review/mobile-web/invest-form-en.png)
- [review/mobile-web/invest-hero-ar.png](../review/mobile-web/invest-hero-ar.png)
- [review/mobile-web/invest-hero-en.png](../review/mobile-web/invest-hero-en.png)
- [review/mobile-web/landmarks-body-ar.png](../review/mobile-web/landmarks-body-ar.png)
- [review/mobile-web/landmarks-body-en.png](../review/mobile-web/landmarks-body-en.png)
- [review/mobile-web/landmarks-hero-ar.png](../review/mobile-web/landmarks-hero-ar.png)
- [review/mobile-web/landmarks-hero-en.png](../review/mobile-web/landmarks-hero-en.png)
- [review/mobile-web/landmarks-museum-hero-ar.png](../review/mobile-web/landmarks-museum-hero-ar.png)
- [review/mobile-web/landmarks-museum-hero-en.png](../review/mobile-web/landmarks-museum-hero-en.png)
- [review/mobile-web/landmarks-oceanarium-hero-ar.png](../review/mobile-web/landmarks-oceanarium-hero-ar.png)
- [review/mobile-web/landmarks-oceanarium-hero-en.png](../review/mobile-web/landmarks-oceanarium-hero-en.png)
- [review/mobile-web/landmarks-opera-house-hero-ar.png](../review/mobile-web/landmarks-opera-house-hero-ar.png)
- [review/mobile-web/landmarks-opera-house-hero-en.png](../review/mobile-web/landmarks-opera-house-hero-en.png)
- [review/mobile-web/landmarks-stadium-body-ar.png](../review/mobile-web/landmarks-stadium-body-ar.png)
- [review/mobile-web/landmarks-stadium-body-en.png](../review/mobile-web/landmarks-stadium-body-en.png)
- [review/mobile-web/landmarks-stadium-hero-ar.png](../review/mobile-web/landmarks-stadium-hero-ar.png)
- [review/mobile-web/landmarks-stadium-hero-en.png](../review/mobile-web/landmarks-stadium-hero-en.png)
- [review/mobile-web/legal-cookies-hero-ar.png](../review/mobile-web/legal-cookies-hero-ar.png)
- [review/mobile-web/legal-cookies-hero-en.png](../review/mobile-web/legal-cookies-hero-en.png)
- [review/mobile-web/legal-privacy-hero-ar.png](../review/mobile-web/legal-privacy-hero-ar.png)
- [review/mobile-web/legal-privacy-hero-en.png](../review/mobile-web/legal-privacy-hero-en.png)
- [review/mobile-web/legal-terms-hero-ar.png](../review/mobile-web/legal-terms-hero-ar.png)
- [review/mobile-web/legal-terms-hero-en.png](../review/mobile-web/legal-terms-hero-en.png)
- [review/mobile-web/menu-ar.png](../review/mobile-web/menu-ar.png)
- [review/mobile-web/menu-en.png](../review/mobile-web/menu-en.png)
- [review/mobile-web/news-body-ar.png](../review/mobile-web/news-body-ar.png)
- [review/mobile-web/news-body-en.png](../review/mobile-web/news-body-en.png)
- [review/mobile-web/news-forum-hero-ar.png](../review/mobile-web/news-forum-hero-ar.png)
- [review/mobile-web/news-forum-hero-en.png](../review/mobile-web/news-forum-hero-en.png)
- [review/mobile-web/news-hero-ar.png](../review/mobile-web/news-hero-ar.png)
- [review/mobile-web/news-hero-en.png](../review/mobile-web/news-hero-en.png)
- [review/mobile-web/news-pif-hero-ar.png](../review/mobile-web/news-pif-hero-ar.png)
- [review/mobile-web/news-pif-hero-en.png](../review/mobile-web/news-pif-hero-en.png)
- [review/mobile-web/news-stadium-hero-ar.png](../review/mobile-web/news-stadium-hero-ar.png)
- [review/mobile-web/news-stadium-hero-en.png](../review/mobile-web/news-stadium-hero-en.png)
- [review/mobile-web/pitch-home-ar.png](../review/mobile-web/pitch-home-ar.png)
- [review/mobile-web/pitch-home-en.png](../review/mobile-web/pitch-home-en.png)
- [review/mobile-web/pitch-sustainability-ar.png](../review/mobile-web/pitch-sustainability-ar.png)
- [review/mobile-web/pitch-sustainability-en.png](../review/mobile-web/pitch-sustainability-en.png)
