import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { useLenis } from '../../app/SmoothScroll';
import { Icon } from '../../app/shell/Icon';
import { useMediaQuery } from '../../app/useMediaQuery';
import { useReducedMotion } from '../../app/useReducedMotion';
import type { MarketingImage } from '../../data/marketing';
import { onBeforeLangChange, type TranslationKey } from '../../i18n/i18n';
import { addIntro, cascadeStep, taggedElements } from '../../motion/choreography';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Shared timing for the landmark collection and its detail pages; every image stays in flow. */
const MOTION = {
  scrub: 0.55,
  introSpeed: 0.32,
  heroScale: 1.1,
  heroTravel: 10,
  copyTravel: -64,
  imageScale: 1.08,
  imageTravel: 4,
  narrow: '(max-width: 60rem)',
  /** Reduced image travel keeps touch scrolling light and the picture inside its frame. */
  mobile: { heroScale: 1.06, heroTravel: 3, imageScale: 1.05, imageTravel: 2 },
} as const;

/** The same calm directional action appears in the hero, stories and related destinations. */
export function LandmarkAction({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}): ReactNode {
  return (
    <a className={`landmarks-action${primary ? ' landmarks-action--primary' : ''}`} href={href}>
      <span>{children}</span>
      <Icon name="arrow" />
    </a>
  );
}

/**
 * Owns only this page's body treatment, image depth and language-position restoration. Detail
 * routes share a router page id, so their keyed shell also resets scroll when the landmark changes.
 */
export function LandmarkPageShell({ children }: { children: ReactNode }): ReactNode {
  const { lang } = useI18n();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(MOTION.narrow);
  const root = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const savedScroll = useRef<number | null>(null);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  useLayoutEffect(() => {
    const scroller = lenisRef.current;
    if (scroller) scroller.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    const heading = root.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    document.body.dataset.landmarks = 'true';
    return () => {
      delete document.body.dataset.landmarks;
    };
  }, []);
  useEffect(
    () =>
      onBeforeLangChange(() => {
        savedScroll.current = window.scrollY;
      }),
    [],
  );
  useEffect(() => {
    if (savedScroll.current === null) return;
    const y = savedScroll.current;
    savedScroll.current = null;
    let cancelled = false;
    let frame = 0;
    // Fonts and child SplitText layouts settle before restoring the native/Lenis scroll value.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          const scroller = lenisRef.current;
          if (scroller) {
            scroller.resize();
            scroller.scrollTo(y, { immediate: true, force: true });
          } else window.scrollTo(0, y);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [lang]);

  useGSAP(
    () => {
      if (reduced) return;
      for (const image of root.current?.querySelectorAll('.landmarks-parallax') ?? [])
        gsap.fromTo(
          image,
          {
            scale: narrow ? MOTION.mobile.imageScale : MOTION.imageScale,
            yPercent: narrow ? -MOTION.mobile.imageTravel : -MOTION.imageTravel,
          },
          {
            scale: 1,
            yPercent: narrow ? MOTION.mobile.imageTravel : MOTION.imageTravel,
            ease: 'none',
            scrollTrigger: {
              trigger: image.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: MOTION.scrub,
            },
          },
        );
    },
    { scope: root, dependencies: [lang, reduced, narrow], revertOnUpdate: true },
  );

  return (
    <div className="landmarks-page" ref={root}>
      {children}
    </div>
  );
}

/** The architecture remains visible while the title lifts away into the next section. */
export function LandmarkHero({
  image,
  eyebrow,
  title,
  lead,
  children,
}: {
  image: MarketingImage;
  eyebrow: TranslationKey;
  title: TranslationKey;
  lead: TranslationKey;
  children?: ReactNode;
}): ReactNode {
  const { t, lang, rtl } = useI18n();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(MOTION.narrow);
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (reduced) return;
      const copy = root.current?.querySelector<HTMLElement>('.landmarks-hero__copy');
      if (copy) {
        const intro = gsap.timeline();
        const elements = taggedElements(copy);
        const stagger = cascadeStep(elements.length);
        elements.forEach(({ element, kind }, index) => {
          addIntro(
            intro,
            element,
            narrow && (kind === 'heading' || kind === 'lines') ? 'rise' : kind,
            rtl,
            index * stagger,
          );
        });
        intro.timeScale(MOTION.introSpeed);
        if (!narrow)
          gsap.to(copy, {
            y: MOTION.copyTravel,
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom 35%',
              scrub: MOTION.scrub,
            },
          });
      }
      gsap.fromTo(
        '.landmarks-hero__media',
        { scale: narrow ? MOTION.mobile.heroScale : MOTION.heroScale, yPercent: 0 },
        {
          scale: 1,
          yPercent: narrow ? MOTION.mobile.heroTravel : MOTION.heroTravel,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: MOTION.scrub,
          },
        },
      );
    },
    { scope: root, dependencies: [lang, reduced, narrow, image], revertOnUpdate: true },
  );
  return (
    <section className="landmarks-hero" ref={root}>
      <div className="landmarks-hero__media" aria-hidden="true">
        <OfficialPicture id={image} alt="" priority />
      </div>
      <div className="landmarks-hero__grade" aria-hidden="true" />
      {/* A fresh text subtree prevents SplitText cleanup from restoring the previous language. */}
      <div className="landmarks-hero__copy container" key={`${lang}:${image}`}>
        <p className="landmarks-eyebrow" data-motion="rise">
          {t(eyebrow)}
        </p>
        <Copy k={title} as="h1" className="landmarks-hero__title" motion="heading" />
        <Copy k={lead} className="landmarks-lead" motion="lines" />
        {children && (
          <div className="landmarks-actions" data-motion="rise">
            {children}
          </div>
        )}
      </div>
      <div className="landmarks-hero__rail container">
        <span>{t('marketing.common.location')}</span>
        <span className="landmarks-hero__rail-line" aria-hidden="true" />
        <span>{t('marketing.actions.scroll')}</span>
      </div>
      <p className="landmarks-credit">{t('marketing.common.officialRender')}</p>
    </section>
  );
}
