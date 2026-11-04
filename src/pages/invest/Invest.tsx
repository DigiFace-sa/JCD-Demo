import { useEffect, useRef, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { useLenis } from '../../app/SmoothScroll';
import { Icon } from '../../app/shell/Icon';
import { useReducedMotion } from '../../app/useReducedMotion';
import { SECTORS, type MarketingImage } from '../../data/marketing';
import { DESTINATION_STATS } from '../../data/site';
import { Reveal } from '../../motion/Reveal';
import { EditorialHero, EditorialPage } from '../editorial/Editorial';
import { InterestForm, type InterestFormHandle, type Sector } from './InterestForm';

/** Official imagery describes the sector without implying an available property inventory. */
const SECTOR_IMAGES: Readonly<Record<Sector, MarketingImage>> = {
  residential: 'central-plaza',
  hospitality: 'marina',
  retail: 'central-bazar',
  wellness: 'wellness-street',
  commercial: 'central-hub',
};
const WHY = ['location', 'landmarks', 'scale', 'sustain'] as const;
const WHY_STATS = {
  location: 'stats.shoreline.value',
  landmarks: 'stats.landmarks.value',
  scale: 'stats.area.value',
} as const;
/** Keep focused registration controls below the fixed editorial header. */
const REGISTRATION = { headerInset: 130, duration: 1 } as const;

export default function Invest(): ReactNode {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const registration = useRef<HTMLElement>(null);
  const interest = useRef<InterestFormHandle>(null);
  const scrollFrame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    },
    [],
  );

  const register = (sector?: Sector): void => {
    interest.current?.open(sector);
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    // A completed demo can reopen into the taller form before its scroll limit is measured.
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const element = registration.current;
      if (!element) return;
      const y = window.scrollY + element.getBoundingClientRect().top - REGISTRATION.headerInset;
      const focus = (): void => {
        interest.current?.focus(sector ? 'sector' : 'name');
      };
      if (lenis && !reduced) {
        lenis.resize();
        lenis.scrollTo(y, { duration: REGISTRATION.duration, force: true, onComplete: focus });
      } else {
        window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
        focus();
      }
    });
  };

  return (
    <EditorialPage>
      <div className="invest-page">
        <EditorialHero
          image="marina"
          eyebrow="nav.invest"
          title="marketing.invest.title"
          lead="marketing.invest.lead"
        >
          <button
            type="button"
            className="invest-button"
            onClick={() => {
              register();
            }}
          >
            <span>{t('marketing.actions.register')}</span>
            <Icon name="arrow" />
          </button>
        </EditorialHero>

        <section className="invest-sectors container" aria-labelledby="invest-sectors-title">
          <Reveal as="div" className="invest-section-heading">
            <Copy k="marketing.invest.sectorsEye" className="invest-eyebrow" motion="rise" />
            <Copy
              k="marketing.invest.sectorsTitle"
              as="h2"
              id="invest-sectors-title"
              className="invest-title"
              motion="heading"
            />
          </Reveal>
          <div className="invest-sector-grid">
            {SECTORS.map((sector, index) => (
              <article className="invest-sector" key={sector}>
                <Reveal as="div" className="invest-sector__inner">
                  <div className="invest-sector__image" data-motion="image">
                    <OfficialPicture
                      id={SECTOR_IMAGES[sector]}
                      alt={t(`marketing.common.imageAlt.${SECTOR_IMAGES[sector]}`)}
                      sizes="(min-width: 65rem) 45vw, 100vw"
                    />
                    <span className="invest-sector__ordinal" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="invest-sector__copy">
                    <h3 id={`invest-sector-${sector}`} data-motion="rise">
                      {t(`marketing.invest.sectors.${sector}`)}
                    </h3>
                    <Copy
                      k={`marketing.invest.sectorBody.${sector}`}
                      className="invest-body"
                      motion="lines"
                    />
                    <button
                      type="button"
                      className="invest-sector__action"
                      data-sector={sector}
                      data-motion="rise"
                      aria-labelledby={`invest-register-${sector} invest-sector-${sector}`}
                      onClick={() => {
                        register(sector);
                      }}
                    >
                      <span id={`invest-register-${sector}`}>
                        {t('marketing.actions.register')}
                      </span>
                      <Icon name="arrow" />
                    </button>
                  </div>
                </Reveal>
              </article>
            ))}
          </div>
        </section>

        <section className="invest-why container" aria-labelledby="invest-why-title">
          <Reveal as="div" className="invest-section-heading">
            <Copy k="marketing.invest.whyEye" className="invest-eyebrow" motion="rise" />
            <Copy
              k="marketing.invest.whyTitle"
              as="h2"
              id="invest-why-title"
              className="invest-title"
              motion="heading"
            />
          </Reveal>
          <div className="invest-why__grid">
            {WHY.map((reason) => {
              const stat =
                reason === 'sustain'
                  ? null
                  : DESTINATION_STATS.find((item) => item.valueKey === WHY_STATS[reason]);
              return (
                <Reveal as="article" className="invest-reason" key={reason}>
                  <p className="invest-reason__figure" data-motion="counter" data-count="">
                    {t(stat?.valueKey ?? 'marketing.home.publicRealmValue')}
                  </p>
                  <p className="invest-eyebrow" data-motion="fade">
                    {t(stat?.labelKey ?? 'marketing.home.publicRealm')}
                  </p>
                  <h3 data-motion="rise">{t(`marketing.invest.${reason}Title`)}</h3>
                  <Copy
                    k={`marketing.invest.${reason}Body`}
                    className="invest-body"
                    motion="lines"
                  />
                </Reveal>
              );
            })}
          </div>
        </section>

        <section
          className="invest-recognition container"
          aria-labelledby="invest-recognition-title"
        >
          <Reveal as="div" className="invest-recognition__heading">
            <Copy
              k="marketing.common.recognition"
              as="h2"
              id="invest-recognition-title"
              className="invest-eyebrow"
              motion="rise"
            />
            <Copy k="marketing.common.recognitionLead" className="invest-body" motion="lines" />
          </Reveal>
          <ul className="invest-recognition__list">
            {(['leed', 'efqm', 'kaqa'] as const).map((award) => (
              <li key={award}>
                <Reveal as="div" className="invest-recognition__award">
                  <span className="invest-recognition__seal" aria-hidden="true" data-motion="fade">
                    <Icon name="star" />
                  </span>
                  <Copy k={`marketing.common.${award}`} as="span" motion="rise" />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="invest-registration container"
          id="register-interest"
          ref={registration}
          aria-labelledby="invest-registration-title"
        >
          <div className="invest-registration__intro">
            <Reveal as="div" className="invest-section-heading">
              <Copy k="marketing.form.eye" className="invest-eyebrow" motion="rise" />
              <Copy
                k="marketing.form.title"
                as="h2"
                id="invest-registration-title"
                className="invest-title"
                motion="heading"
              />
              <Copy k="marketing.form.intro" className="invest-body" motion="lines" />
            </Reveal>
            <div className="invest-registration__image">
              <OfficialPicture
                id="waterfront"
                alt={t('marketing.common.imageAlt.waterfront')}
                sizes="(min-width: 65rem) 35vw, 100vw"
              />
            </div>
          </div>
          {/* Keep the controlled form outside language-keyed or animated reveal containers. */}
          <InterestForm ref={interest} />
        </section>
      </div>
    </EditorialPage>
  );
}
