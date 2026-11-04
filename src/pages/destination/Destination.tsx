import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { useLenis } from '../../app/SmoothScroll';
import { Icon } from '../../app/shell/Icon';
import { useReducedMotion } from '../../app/useReducedMotion';
import { ATTRACTIONS } from '../../data/attractions';
import {
  DESTINATION_ATTRACTIONS,
  DESTINATION_DISTRICT_IMAGES,
  DESTINATION_FACTS,
} from '../../data/destination';
import { DISTRICTS, DISTRICT_IDS, isDistrictId, type DistrictId } from '../../data/districts';
import { SUSTAINABILITY_ITEMS } from '../../data/marketing';
import { onBeforeLangChange } from '../../i18n/i18n';
import { Reveal } from '../../motion/Reveal';
import { addIntro, cascadeStep, taggedElements } from '../../motion/choreography';
import type { ViewProps } from '../../router/routes';
import { DistrictAtlas } from './DistrictAtlas';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Transform-only depth: the page stays in normal flow, including its interactive atlas. */
const MOTION = {
  hero: { from: 1.12, to: 1, travel: 12, outro: -64, introSpeed: 0.36 },
  image: { from: 1.08, to: 1, travel: 5 },
  scrub: 0.6,
  detail: { y: 18, duration: 0.65, stagger: 0.06 },
  section: { y: 32, duration: 1 },
  traceDuration: 1.6,
  headerInset: 135,
  scrollDuration: 1.2,
} as const;

function Action({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}): ReactNode {
  return (
    <a className={`destination-action${primary ? ' destination-action--primary' : ''}`} href={href}>
      <span>{children}</span>
      <Icon name="arrow" />
    </a>
  );
}

function DistrictDetail({ selected }: { selected: DistrictId }): ReactNode {
  const { t, lang } = useI18n();
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const root = useRef<HTMLDivElement>(null);
  const district = DISTRICTS[selected];
  useEffect(() => {
    // Localised descriptions change the height below the atlas, including in reduced motion.
    lenis?.resize();
    ScrollTrigger.refresh();
  }, [selected, lang, lenis]);
  useGSAP(
    () => {
      if (reduced) return;
      gsap.fromTo(
        '.destination-district__text > *',
        { opacity: 0, y: MOTION.detail.y },
        {
          opacity: 1,
          y: 0,
          duration: MOTION.detail.duration,
          stagger: MOTION.detail.stagger,
          ease: 'power3.out',
        },
      );
    },
    { scope: root, dependencies: [selected, lang, reduced], revertOnUpdate: true },
  );
  return (
    <div className="destination-district" ref={root} data-selected={selected}>
      <div className="destination-district__photos" aria-hidden="true">
        {DISTRICT_IDS.map((id) => (
          <div key={id} data-active={String(id === selected)}>
            <OfficialPicture
              id={DESTINATION_DISTRICT_IMAGES[id]}
              alt=""
              priority={id === selected}
              sizes="(min-width: 60rem) 34vw, 100vw"
            />
          </div>
        ))}
        <span className="destination-district__image-credit">
          {t('marketing.common.officialRender')}
        </span>
      </div>
      <div className="destination-district__text">
        <p className="destination__eyebrow">
          {t('marketing.common.district')}{' '}
          <bdi dir="ltr">
            {t('marketing.cinema.position', {
              current: String(DISTRICT_IDS.indexOf(selected) + 1).padStart(2, '0'),
              total: String(DISTRICT_IDS.length).padStart(2, '0'),
            })}
          </bdi>
        </p>
        <h3>{t(district.nameKey)}</h3>
        <Copy k={district.summaryKey} className="destination__body" />
        <Action href="#/experience">{t('marketing.actions.in3d')}</Action>
      </div>
    </div>
  );
}

function SustainabilityThemes(): ReactNode {
  const { t } = useI18n();
  const lenis = useLenis();
  const [expanded, setExpanded] = useState<string | null>('coral');
  const unique = useId();
  return (
    <div
      className="destination-pillars"
      role="group"
      aria-label={t('marketing.destination.pillarNavigation')}
    >
      {SUSTAINABILITY_ITEMS.map((id, index) => {
        const open = expanded === id;
        const panel = `${unique}-${id}`;
        return (
          <div className="destination-pillar" key={id} data-open={String(open)}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panel}
              onClick={() => {
                setExpanded(open ? null : id);
              }}
            >
              <span className="destination__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{t(`marketing.sustainability.${id}.title`)}</span>
              <span className="destination-pillar__toggle" aria-hidden="true" />
            </button>
            <div
              className="destination-pillar__body"
              id={panel}
              aria-hidden={!open}
              inert={!open}
              onTransitionEnd={(event) => {
                if (event.propertyName !== 'grid-template-rows') return;
                lenis?.resize();
                ScrollTrigger.refresh();
              }}
            >
              <div>
                <Copy k={`marketing.sustainability.${id}.body`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Destination is a continuous architectural journey, with the district atlas at its centre. */
export default function Destination({ context }: ViewProps): ReactNode {
  const { t, lang } = useI18n();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const root = useRef<HTMLDivElement>(null);
  const atlas = useRef<HTMLElement>(null);
  const panelId = useId();
  const requested = context.query.get('district');
  const selected = isDistrictId(requested ?? undefined) ? (requested as DistrictId) : 'central';
  const deepLink = useRef(requested !== null);
  const savedScroll = useRef<number | null>(null);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);
  useEffect(
    () =>
      onBeforeLangChange(() => {
        savedScroll.current = window.scrollY;
      }),
    [],
  );
  useEffect(() => {
    document.body.dataset.destination = 'true';
    return () => {
      delete document.body.dataset.destination;
    };
  }, []);
  useEffect(() => {
    const y = savedScroll.current;
    if (y === null) return;
    savedScroll.current = null;
    // Restore after split-text teardown and the browser's layout/scroll anchoring have settled.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const scroller = lenisRef.current;
        if (scroller) {
          scroller.resize();
          scroller.scrollTo(y, { immediate: true, force: true });
        } else window.scrollTo(0, y);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [lang]);

  const scrollToAtlas = (): void => {
    const element = atlas.current;
    if (!element) return;
    const y = window.scrollY + element.getBoundingClientRect().top - MOTION.headerInset;
    const scroller = lenisRef.current;
    if (scroller)
      scroller.scrollTo(y, {
        duration: MOTION.scrollDuration,
        force: true,
        onComplete: () => {
          element.focus({ preventScroll: true });
        },
      });
    else {
      window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
      element.focus({ preventScroll: true });
    }
  };

  useEffect(() => {
    // Run after RouteView's layout-effect reset; direct district links arrive at the atlas.
    if (!deepLink.current) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        deepLink.current = false;
        const element = atlas.current;
        if (!element) return;
        const y = window.scrollY + element.getBoundingClientRect().top - MOTION.headerInset;
        const scroller = lenisRef.current;
        if (scroller) {
          scroller.resize();
          scroller.scrollTo(y, { immediate: true, force: true });
        } else window.scrollTo(0, y);
        element.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  useGSAP(
    () => {
      if (!reduced) {
        const copy = root.current?.querySelector<HTMLElement>('.destination-hero__copy');
        if (copy) {
          const intro = gsap.timeline();
          const elements = taggedElements(copy);
          const step = cascadeStep(elements.length);
          elements.forEach(({ element, kind }, index) => {
            addIntro(intro, element, kind, document.documentElement.dir === 'rtl', index * step);
          });
          intro.timeScale(MOTION.hero.introSpeed);
          gsap.to(copy, {
            y: MOTION.hero.outro,
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.destination-hero',
              start: 'top top',
              end: 'bottom 35%',
              scrub: MOTION.scrub,
            },
          });
        }
        gsap.fromTo(
          '.destination-hero__media',
          { scale: MOTION.hero.from, yPercent: 0 },
          {
            scale: MOTION.hero.to,
            yPercent: MOTION.hero.travel,
            ease: 'none',
            scrollTrigger: {
              trigger: '.destination-hero',
              start: 'top top',
              end: 'bottom top',
              scrub: MOTION.scrub,
            },
          },
        );
        for (const image of root.current?.querySelectorAll('.destination__parallax') ?? [])
          gsap.fromTo(
            image,
            { scale: MOTION.image.from, yPercent: -MOTION.image.travel },
            {
              scale: MOTION.image.to,
              yPercent: MOTION.image.travel,
              ease: 'none',
              scrollTrigger: {
                trigger: image.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: MOTION.scrub,
              },
            },
          );
        gsap.fromTo(
          '.destination-explorer__stage',
          { opacity: 0, y: MOTION.section.y },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.section.duration,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.destination-explorer__stage',
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          },
        );
        for (const edge of root.current?.querySelectorAll<SVGGeometryElement>(
          '.destination-atlas__edge',
        ) ?? []) {
          const length = edge.getTotalLength();
          gsap.fromTo(
            edge,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              duration: MOTION.traceDuration,
              ease: 'power2.inOut',
              clearProps: 'strokeDasharray,strokeDashoffset',
              scrollTrigger: { trigger: '.destination-atlas', start: 'top 80%', once: true },
            },
          );
        }
      }
    },
    { scope: root, dependencies: [lang, reduced], revertOnUpdate: true },
  );

  const choose = (id: DistrictId): void => {
    if (id === selected) return;
    const query = new URLSearchParams(context.query);
    query.set('district', id);
    void navigate({ pathname: '/destination', search: `?${query.toString()}` });
  };

  return (
    <div className="destination" ref={root}>
      <section className="destination-hero" aria-labelledby="destination-title">
        <div className="destination-hero__media" aria-hidden="true">
          <OfficialPicture id="central-plaza" alt="" priority />
        </div>
        <div className="destination-hero__grade" aria-hidden="true" />
        <div className="destination-hero__copy container" key={lang}>
          <p className="destination__eyebrow" data-motion="rise">
            {t('nav.destination')}
          </p>
          <Copy
            k="marketing.destination.title"
            id="destination-title"
            as="h1"
            className="destination-hero__title"
            motion="heading"
          />
          <Copy k="marketing.destination.lead" className="destination__lead" motion="lines" />
          <div className="destination__actions" data-motion="rise">
            <button
              type="button"
              className="destination-action destination-action--primary"
              onClick={scrollToAtlas}
            >
              <span>{t('marketing.destination.skipToAtlas')}</span>
              <Icon name="arrow" />
            </button>
            <Action href="#/experience">{t('marketing.actions.in3d')}</Action>
          </div>
        </div>
        <div className="destination-hero__rail container">
          <span>{t('marketing.common.location')}</span>
          <span className="destination-hero__rail-line" aria-hidden="true" />
          <span>{t('marketing.actions.scroll')}</span>
        </div>
        <p className="destination__credit">{t('marketing.common.officialRender')}</p>
      </section>

      <Reveal className="destination-facts container" label={t('map.glance')}>
        {DESTINATION_FACTS.map((fact) => (
          <dl key={fact.valueKey}>
            <dt data-motion="fade">{t(fact.labelKey)}</dt>
            <dd data-motion="counter" data-count="">
              {t(fact.valueKey)}
            </dd>
          </dl>
        ))}
      </Reveal>

      <section
        className="destination-explorer container"
        id="destination-districts"
        tabIndex={-1}
        ref={atlas}
        aria-labelledby="destination-districts-title"
      >
        <Reveal as="div" className="destination__section-heading">
          <p className="destination__eyebrow" data-motion="rise">
            {t('marketing.destination.mapEye')}
          </p>
          <Copy
            k="marketing.destination.mapTitle"
            id="destination-districts-title"
            as="h2"
            className="destination__title"
            motion="heading"
          />
          <p className="destination__body" data-motion="lines">
            {t('marketing.destination.mapLead')}
          </p>
        </Reveal>
        <div className="destination-explorer__stage">
          <div className="destination-explorer__cartography">
            <div className="destination-explorer__label">
              <span className="destination__eyebrow">{t('marketing.destination.atlasLabel')}</span>
              <span>
                {t('stats.districts.value')} / {t('stats.districts.label')}
              </span>
            </div>
            <DistrictAtlas selected={selected} onSelect={choose} />
            <div
              className="destination-districts"
              role="group"
              aria-label={t('marketing.destination.districtNavigation')}
            >
              {DISTRICT_IDS.map((id, index) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === selected}
                  aria-controls={panelId}
                  data-district-choice={id}
                  onClick={() => {
                    choose(id);
                  }}
                >
                  <span className="destination__index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{t(DISTRICTS[id].nameKey)}</span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          </div>
          <div id={panelId} className="destination-explorer__detail">
            <DistrictDetail selected={selected} />
          </div>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {t('marketing.destination.selectionStatus', { name: t(DISTRICTS[selected].nameKey) })}
        </p>
      </section>

      <section className="destination-shore" aria-labelledby="destination-shore-title">
        <Reveal as="div" className="destination__section-heading container">
          <p className="destination__eyebrow" data-motion="rise">
            {t('marketing.destination.attractionsEye')}
          </p>
          <Copy
            k="marketing.destination.attractionsTitle"
            id="destination-shore-title"
            as="h2"
            className="destination__title"
            motion="heading"
          />
          <Copy k="marketing.destination.shoreLead" className="destination__lead" motion="lines" />
        </Reveal>
        <div className="container destination-shore__stories">
          {DESTINATION_ATTRACTIONS.map(({ id, image }, index) => (
            <article className="destination-story" key={id} data-attraction={id}>
              <div className="destination-story__image">
                <div className="destination__parallax">
                  <OfficialPicture
                    id={image}
                    alt={t(`marketing.common.imageAlt.${image}`)}
                    sizes="(min-width: 60rem) 58vw, 100vw"
                  />
                </div>
                <span className="destination-story__number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="destination__image-credit">
                  {t('marketing.common.officialRender')}
                </span>
              </div>
              <Reveal as="div" className="destination-story__copy">
                <p className="destination__eyebrow" data-motion="rise">
                  {t('marketing.destination.shoreEye')}
                </p>
                <h3 data-motion="heading">{t(ATTRACTIONS[id].nameKey)}</h3>
                <Copy k={ATTRACTIONS[id].summaryKey} className="destination__body" motion="lines" />
                {id === 'public-beach' && (
                  <p className="destination-story__fact" data-motion="rise">
                    {t('stats.beach.value')}
                    <span>{t('stats.beach.label')}</span>
                  </p>
                )}
              </Reveal>
            </article>
          ))}
        </div>
      </section>

      <section
        className="destination-sustain container"
        aria-labelledby="destination-sustain-title"
      >
        <Reveal as="div" className="destination__section-heading">
          <p className="destination__eyebrow" data-motion="rise">
            {t('marketing.home.sustainEye')}
          </p>
          <Copy
            k="marketing.destination.sustainTitle"
            id="destination-sustain-title"
            as="h2"
            className="destination__title"
            motion="heading"
          />
          <Copy
            k="marketing.destination.sustainLead"
            className="destination__lead"
            motion="lines"
          />
        </Reveal>
        <div className="destination-sustain__layout">
          <div className="destination-sustain__images">
            <div className="destination-sustain__park">
              <div className="destination__parallax">
                <OfficialPicture
                  id="ribbon-park-tall"
                  alt={t('marketing.common.imageAlt.ribbon-park-tall')}
                  sizes="(min-width: 60rem) 50vw, 100vw"
                />
              </div>
            </div>
            <Reveal as="div" className="destination-sustain__coral">
              <div data-motion="image">
                <OfficialPicture
                  id="coral"
                  alt={t('marketing.common.imageAlt.coral')}
                  sizes="(min-width: 60rem) 25vw, 50vw"
                />
              </div>
              <p>{t('marketing.common.officialRender')}</p>
            </Reveal>
          </div>
          <div className="destination-sustain__content">
            <Reveal as="div" className="destination-sustain__figure">
              <p data-motion="counter" data-count="">
                {t('marketing.home.publicRealmValue')}
              </p>
              <p data-motion="fade">{t('marketing.home.publicRealm')}</p>
            </Reveal>
            <SustainabilityThemes />
          </div>
        </div>
      </section>

      <section className="destination-continue">
        <div className="destination-continue__image" aria-hidden="true">
          <div className="destination__parallax">
            <OfficialPicture id="oceanarium-sunset" alt="" />
          </div>
        </div>
        <Reveal as="div" className="destination-continue__copy container">
          <p className="destination__eyebrow" data-motion="rise">
            {t('marketing.destination.continueEye')}
          </p>
          <Copy
            k="marketing.destination.continueTitle"
            as="h2"
            className="destination__title"
            motion="heading"
          />
          <Copy
            k="marketing.destination.continueBody"
            className="destination__lead"
            motion="lines"
          />
          <div className="destination__actions" data-motion="rise">
            <Action href="#/experience" primary>
              {t('marketing.actions.in3d')}
            </Action>
            <Action href="#/landmarks">{t('marketing.actions.viewLandmarks')}</Action>
          </div>
        </Reveal>
        <p className="destination__credit">{t('marketing.common.officialRender')}</p>
      </section>
    </div>
  );
}
