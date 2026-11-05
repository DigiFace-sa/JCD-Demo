import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { useLenis } from '../../app/SmoothScroll';
import { Icon } from '../../app/shell/Icon';
import { useReducedMotion } from '../../app/useReducedMotion';
import { useMediaQuery } from '../../app/useMediaQuery';
import type { MarketingImage } from '../../data/marketing';
import { onBeforeLangChange, type TranslationKey } from '../../i18n/i18n';
import { addIntro, cascadeStep, taggedElements } from '../../motion/choreography';

/** Shared editorial motion follows the approved Home pace, without pinning the document. */
const MOTION = {
  introSpeed: 0.36,
  push: 1.1,
  travel: 10,
  scrub: 0.6,
  narrow: '(max-width: 60rem)',
  /** A small overscan covers mobile image travel without exposing an edge. */
  mobile: { heroScale: 1.06, heroTravel: 3, cardScale: 1.08 },
} as const;

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function EditorialPage({
  children,
  routeKey = 'page',
}: {
  children: ReactNode;
  routeKey?: string;
}): ReactNode {
  const { lang } = useI18n();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(MOTION.narrow);
  const lenis = useLenis();
  const scroller = useRef(lenis);
  const saved = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current = lenis;
  }, [lenis]);
  useLayoutEffect(() => {
    // News stories and legal documents share page ids. Reset only for new route content,
    // never when Lenis changes because the motion preference or locale changed.
    saved.current = null;
    const instance = scroller.current;
    if (instance) instance.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    const heading = root.current?.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    ScrollTrigger.refresh();
  }, [routeKey]);
  useEffect(
    () =>
      onBeforeLangChange(() => {
        saved.current = scrollY;
      }),
    [],
  );
  useEffect(() => {
    document.body.dataset.editorial = 'true';
    return () => {
      delete document.body.dataset.editorial;
    };
  }, []);
  useEffect(() => {
    const y = saved.current;
    if (y === null) return;
    saved.current = null;
    let cancelled = false;
    let frame = 0;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
          const instance = scroller.current;
          if (instance) {
            instance.resize();
            instance.scrollTo(y, { immediate: true, force: true });
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
      if (!narrow || reduced) return;
      // The picture layer moves independently of the card's one-time text entrance.
      for (const picture of root.current?.querySelectorAll(
        '.journal-card__image img, .invest-sector__image picture',
      ) ?? [])
        gsap.fromTo(
          picture,
          { scale: MOTION.mobile.cardScale },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: picture.parentElement,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
    },
    { scope: root, dependencies: [lang, routeKey, narrow, reduced], revertOnUpdate: true },
  );
  return (
    <div className="editorial-page" ref={root}>
      {children}
    </div>
  );
}

export function EditorialAction({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}): ReactNode {
  return (
    <a className={`editorial-action${primary ? ' editorial-action--primary' : ''}`} href={href}>
      <span>{children}</span>
      <Icon name="arrow" />
    </a>
  );
}

export function EditorialHero({
  image,
  eyebrow,
  title,
  lead,
  children,
}: {
  image: MarketingImage;
  eyebrow: TranslationKey;
  title: TranslationKey;
  lead?: TranslationKey;
  children?: ReactNode;
}): ReactNode {
  const { t, lang, rtl } = useI18n();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery(MOTION.narrow);
  const root = useRef<HTMLElement>(null);
  const heading = useId();
  useGSAP(
    () => {
      if (reduced) return;
      const copy = root.current?.querySelector<HTMLElement>('.editorial-hero__copy');
      if (!copy) return;
      const elements = taggedElements(copy);
      const intro = gsap.timeline();
      const step = cascadeStep(elements.length);
      elements.forEach(({ element, kind }, index) => {
        addIntro(
          intro,
          element,
          narrow && (kind === 'heading' || kind === 'lines') ? 'rise' : kind,
          rtl,
          index * step,
        );
      });
      intro.timeScale(MOTION.introSpeed);
      gsap.fromTo(
        '.editorial-hero__media',
        { scale: narrow ? MOTION.mobile.heroScale : MOTION.push, yPercent: 0 },
        {
          scale: 1,
          yPercent: narrow ? MOTION.mobile.heroTravel : MOTION.travel,
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
    { scope: root, dependencies: [lang, image, title, reduced, narrow], revertOnUpdate: true },
  );
  return (
    <section className="editorial-hero" ref={root} aria-labelledby={heading}>
      <div className="editorial-hero__media" aria-hidden="true">
        <OfficialPicture id={image} alt="" priority />
      </div>
      <div className="editorial-hero__grade" aria-hidden="true" />
      <div className="editorial-hero__copy container" key={`${lang}-${title}`}>
        <p className="editorial-eye" data-motion="rise">
          {t(eyebrow)}
        </p>
        <Copy k={title} as="h1" id={heading} className="editorial-hero__title" motion="heading" />
        {lead && <Copy k={lead} className="editorial-lead" motion="lines" />}
        {children && (
          <div className="editorial-hero__actions" data-motion="rise">
            {children}
          </div>
        )}
      </div>
      <p className="editorial-credit">{t('marketing.common.officialRender')}</p>
    </section>
  );
}
