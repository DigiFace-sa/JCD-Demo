import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { isRtl, onLangChange, translateDom } from '../../../i18n/i18n';
import { EASE_OUT } from '../../../utils/motion';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Editorial reveals shared by every marketing page:
 * - headings rise out of per-line masks: letter by letter in English, word by word in Arabic
 *   (splitting Arabic into letters would break its joined script);
 * - leads unveil line by line;
 * - card and feature images open from a clipped frame while settling from a slight zoom.
 *
 * Splits are reverted to plain text once revealed, so they never affect resize, selection or
 * screen readers afterwards. A language switch replaces split text wholesale, so pending
 * splits are rebuilt from the new copy.
 */
const REVEAL = {
  headingSelector: '.editorial-title',
  leadSelector: '.section-lead, .page-hero__lead',
  // Home's overview photo is excluded: its scale is already scrubbed by the Home journey parallax.
  imageSelector: '.landmark-card__image, .news-card__image, .form-section__image',
  start: 'top 88%',
  charStagger: 0.018,
  wordStagger: 0.06,
  lineStagger: 0.1,
  headingDuration: 1.05,
  leadDuration: 0.9,
  imageDuration: 1.3,
  imageInset: 'inset(14% 10% 14% 10%)',
  imageScale: 1.18,
} as const;

interface Pending {
  readonly element: HTMLElement;
  split: SplitText | null;
  trigger: ScrollTrigger | null;
  tween: gsap.core.Tween | null;
  done: boolean;
}

export function bindTextReveal(root: HTMLElement): () => void {
  const media = gsap.matchMedia();
  let disposed = false;

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const texts: Pending[] = [
      ...root.querySelectorAll<HTMLElement>(`${REVEAL.headingSelector}, ${REVEAL.leadSelector}`),
    ]
      .filter((element) => !element.closest('.home-hero'))
      .map((element) => ({ element, split: null, trigger: null, tween: null, done: false }));

    const finish = (item: Pending): void => {
      item.done = true;
      item.split?.revert();
      item.split = null;
    };

    const arm = (item: Pending): void => {
      // Copy can be empty (e.g. a placeholder-only string in the pitch build): nothing to split.
      if (item.done || disposed || !item.element.textContent.trim()) return;
      const heading = item.element.matches(REVEAL.headingSelector);
      const rtl = isRtl();
      const split = SplitText.create(item.element, {
        type: heading ? (rtl ? 'lines,words' : 'lines,words,chars') : 'lines',
        mask: 'lines',
        linesClass: 'reveal-line',
        aria: 'auto',
      });
      item.split = split;
      const parts = heading ? (rtl ? split.words : split.chars) : split.lines;
      if (parts.length === 0) {
        finish(item);
        return;
      }
      gsap.set(parts, { yPercent: 105 });
      item.trigger = ScrollTrigger.create({
        trigger: item.element,
        start: REVEAL.start,
        once: true,
        onEnter: () => {
          item.tween = gsap.to(parts, {
            yPercent: 0,
            duration: heading ? REVEAL.headingDuration : REVEAL.leadDuration,
            ease: EASE_OUT,
            stagger: heading ? (rtl ? REVEAL.wordStagger : REVEAL.charStagger) : REVEAL.lineStagger,
            onComplete: () => {
              finish(item);
            },
          });
        },
      });
    };

    /**
     * Tear down a pending split after a language switch. Reverting restores the copy captured
     * at split time (the previous language), so the current translation is re-applied after.
     */
    const discard = (item: Pending): void => {
      item.trigger?.kill();
      item.tween?.kill();
      item.split?.revert();
      item.trigger = null;
      item.tween = null;
      item.split = null;
      item.element.removeAttribute('aria-label');
      translateDom(item.element);
    };

    const frames = [...root.querySelectorAll<HTMLElement>(REVEAL.imageSelector)].filter((frame) =>
      frame.querySelector('img'),
    );
    const images = frames.map((frame) => {
      const image = frame.querySelector('img');
      return gsap
        .timeline({ scrollTrigger: { trigger: frame, start: REVEAL.start, once: true } })
        .fromTo(
          frame,
          { clipPath: REVEAL.imageInset },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: REVEAL.imageDuration,
            ease: EASE_OUT,
            clearProps: 'clipPath',
          },
          0,
        )
        .fromTo(
          image,
          { scale: REVEAL.imageScale },
          { scale: 1, duration: REVEAL.imageDuration, ease: EASE_OUT, clearProps: 'scale' },
          0,
        );
    });

    // Line breaks depend on the final web fonts; split only once they are in.
    let fontsReady = false;
    void document.fonts.ready.then(() => {
      if (disposed) return;
      fontsReady = true;
      texts.forEach(arm);
      ScrollTrigger.refresh();
    });

    const unsubscribe = onLangChange(() => {
      if (!fontsReady) return;
      for (const item of texts) {
        if (item.done) continue;
        discard(item);
        arm(item);
      }
      ScrollTrigger.refresh();
    });

    return () => {
      unsubscribe();
      for (const item of texts) {
        item.trigger?.kill();
        item.tween?.kill();
        if (!item.done) item.split?.revert();
      }
      images.forEach((timeline) => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
      });
    };
  });

  return () => {
    disposed = true;
    media.revert();
  };
}
