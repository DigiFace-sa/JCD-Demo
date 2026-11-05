import type { ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { LANDMARK_IDS, LANDMARKS } from '../../data/landmarks';
import { LANDMARK_IMAGES } from '../../data/marketing';
import { FlowReveal as Reveal } from '../../motion/FlowReveal';
import { LandmarkAction, LandmarkHero, LandmarkPageShell } from './LandmarkHero';

/** The collection gives each landmark its own architectural frame, with the stadium first. */
export default function Landmarks(): ReactNode {
  const { t } = useI18n();
  return (
    <LandmarkPageShell>
      <LandmarkHero
        image="stadium-night"
        eyebrow="nav.landmarks"
        title="marketing.landmarks.title"
        lead="marketing.landmarks.lead"
      >
        <LandmarkAction href="#/landmarks/stadium" primary>
          {t('marketing.actions.viewProject')}
        </LandmarkAction>
        <LandmarkAction href="#/experience">{t('marketing.actions.in3d')}</LandmarkAction>
      </LandmarkHero>

      <div className="landmarks-collection container">
        {LANDMARK_IDS.map((id, index) => {
          const name = t(LANDMARKS[id].nameKey);
          const image = LANDMARK_IMAGES[id];
          return (
            <article className="landmarks-feature" key={id} data-landmark={id}>
              <a className="landmarks-feature__image" href={`#/landmarks/${id}`} aria-label={name}>
                <div className="landmarks-parallax">
                  <OfficialPicture
                    id={image}
                    alt={t(`marketing.common.imageAlt.${image}`)}
                    sizes="(min-width: 60rem) 56vw, 100vw"
                  />
                </div>
                <span className="landmarks-feature__ordinal" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="landmarks-image-credit">
                  {t('marketing.common.officialRender')}
                </span>
              </a>
              <Reveal as="div" className="landmarks-feature__copy">
                <p className="landmarks-eyebrow" data-motion="rise">
                  {t(`marketing.landmarks.${id}.purpose`)}
                </p>
                <h2 className="landmarks-title" data-motion="heading">
                  {name}
                </h2>
                <Copy
                  k={`marketing.landmarks.${id}.body`}
                  className="landmarks-body"
                  motion="lines"
                />
                <div className="landmarks-actions" data-motion="rise">
                  <LandmarkAction href={`#/landmarks/${id}`} primary>
                    {t('marketing.actions.viewProject')}
                  </LandmarkAction>
                  <LandmarkAction
                    href={id === 'stadium' ? '#/experience/stadium/inside' : `#/experience/${id}`}
                  >
                    {t(
                      id === 'stadium'
                        ? 'marketing.actions.enterStadium'
                        : 'marketing.actions.in3d',
                    )}
                  </LandmarkAction>
                </div>
              </Reveal>
            </article>
          );
        })}
      </div>

      <section className="landmarks-invitation">
        <div className="landmarks-invitation__image" aria-hidden="true">
          <div className="landmarks-parallax">
            <OfficialPicture id="marina" alt="" />
          </div>
        </div>
        <Reveal as="div" className="landmarks-invitation__copy container">
          <p className="landmarks-eyebrow" data-motion="rise">
            {t('marketing.home.investEye')}
          </p>
          <Copy
            k="marketing.home.investTitle"
            as="h2"
            className="landmarks-title"
            motion="heading"
          />
          <Copy k="marketing.home.investBody" className="landmarks-lead" motion="lines" />
          <div data-motion="rise">
            <LandmarkAction href="#/invest" primary>
              {t('marketing.actions.register')}
            </LandmarkAction>
          </div>
        </Reveal>
        <p className="landmarks-credit">{t('marketing.common.officialRender')}</p>
      </section>
    </LandmarkPageShell>
  );
}
