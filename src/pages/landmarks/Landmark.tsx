import type { ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { OfficialPicture } from '../../app/OfficialPicture';
import { useI18n } from '../../app/i18n';
import { Icon } from '../../app/shell/Icon';
import { LANDMARK_IDS, LANDMARKS, isLandmarkId, type LandmarkId } from '../../data/landmarks';
import { LANDMARK_IMAGES, type MarketingImage } from '../../data/marketing';
import { Reveal } from '../../motion/Reveal';
import type { ViewProps } from '../../router/routes';
import { LandmarkAction, LandmarkHero, LandmarkPageShell } from './LandmarkHero';

/** Official concepts show both public spaces and architectural detail, with no invented assets. */
const GALLERY: Readonly<Record<LandmarkId, readonly [MarketingImage, MarketingImage]>> = {
  stadium: ['stadium-bowl', 'stadium-concourse'],
  'opera-house': ['opera-rehearsal', 'opera-mid-scale'],
  oceanarium: ['oceanarium-vortex', 'oceanarium-research'],
  museum: ['museum-galleries', 'museum-outdoor'],
};

/** Evening views close each story before handing over to the retained interactive experience. */
const EXPERIENCE_IMAGE: Readonly<Record<LandmarkId, MarketingImage>> = {
  stadium: 'stadium-ceremony',
  'opera-house': 'opera-lyrical',
  oceanarium: 'oceanarium-night',
  museum: 'culture-forum',
};

function LandmarkContent({ id }: { id: LandmarkId }): ReactNode {
  const { t } = useI18n();
  const landmark = LANDMARKS[id];
  const experience = id === 'stadium' ? '#/experience/stadium/inside' : `#/experience/${id}`;
  const action = id === 'stadium' ? 'marketing.actions.enterStadium' : 'marketing.actions.in3d';
  return (
    <LandmarkPageShell>
      <LandmarkHero
        image={LANDMARK_IMAGES[id]}
        eyebrow="marketing.common.landmark"
        title={landmark.nameKey}
        lead={`marketing.landmarks.${id}.purpose`}
      >
        <LandmarkAction href={experience} primary>
          {t(action)}
        </LandmarkAction>
        <LandmarkAction href="#/landmarks">{t('marketing.actions.backLandmarks')}</LandmarkAction>
      </LandmarkHero>

      <section className="landmark-story container">
        <Reveal as="div" className="landmark-story__heading">
          <p className="landmarks-eyebrow" data-motion="rise">
            {t('marketing.landmarks.storyEye')}
          </p>
          <Copy
            k={`marketing.landmarks.${id}.title`}
            as="h2"
            className="landmarks-title"
            motion="heading"
          />
        </Reveal>
        <div className="landmark-story__content">
          <Reveal as="div" className="landmark-story__narrative">
            <Copy k={`marketing.landmarks.${id}.body`} className="landmarks-lead" motion="lines" />
            <Copy
              k={`marketing.landmarks.${id}.detail`}
              className="landmarks-body"
              motion="lines"
            />
          </Reveal>
          <Reveal as="div" className="landmarks-facts">
            <p className="landmarks-eyebrow" data-motion="fade">
              {t('marketing.landmarks.facts')}
            </p>
            <dl>
              <div data-motion="rise">
                <dt>{t('marketing.landmarks.districtLabel')}</dt>
                <dd>{t(`marketing.landmarks.${id}.district`)}</dd>
              </div>
              <div data-motion="rise">
                <dt>{t('marketing.landmarks.purposeLabel')}</dt>
                <dd>{t(`marketing.landmarks.${id}.purpose`)}</dd>
              </div>
              {landmark.factKeys.map((key) => (
                <div key={key} data-motion="rise">
                  <dt>{t('marketing.landmarks.facts')}</dt>
                  <dd>{t(key)}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="landmark-gallery container" aria-label={t(landmark.nameKey)}>
        {GALLERY[id].map((image) => (
          <figure key={image}>
            <div className="landmark-gallery__image">
              <div className="landmarks-parallax">
                <OfficialPicture
                  id={image}
                  alt={t(`marketing.common.imageAlt.${image}`)}
                  sizes="(min-width: 60rem) 55vw, 100vw"
                />
              </div>
            </div>
            <figcaption className="landmark-gallery__caption">
              <Reveal as="div">
                <p data-motion="fade">{t(`marketing.common.imageAlt.${image}`)}</p>
              </Reveal>
            </figcaption>
          </figure>
        ))}
      </section>

      <section className="landmarks-invitation">
        <div className="landmarks-invitation__image" aria-hidden="true">
          <div className="landmarks-parallax">
            <OfficialPicture id={EXPERIENCE_IMAGE[id]} alt="" />
          </div>
        </div>
        <Reveal as="div" className="landmarks-invitation__copy container">
          <p className="landmarks-eyebrow" data-motion="rise">
            {t('marketing.common.threeD')}
          </p>
          <Copy
            k="marketing.landmarks.experienceTitle"
            as="h2"
            className="landmarks-title"
            motion="heading"
          />
          <Copy k="marketing.landmarks.experienceBody" className="landmarks-lead" motion="lines" />
          <div data-motion="rise">
            <LandmarkAction href={experience} primary>
              {t(action)}
            </LandmarkAction>
          </div>
        </Reveal>
        <p className="landmarks-credit">{t('marketing.common.officialRender')}</p>
      </section>

      <section className="landmarks-related container">
        <Reveal as="div">
          <h2 className="landmarks-title" data-motion="heading">
            {t('marketing.landmarks.related')}
          </h2>
        </Reveal>
        <div className="landmarks-related__grid">
          {LANDMARK_IDS.filter((related) => related !== id).map((related) => {
            const name = t(LANDMARKS[related].nameKey);
            const image = LANDMARK_IMAGES[related];
            return (
              <article className="landmarks-related__card" key={related}>
                <a
                  className="landmarks-related__image"
                  href={`#/landmarks/${related}`}
                  aria-label={name}
                >
                  <OfficialPicture id={image} alt="" sizes="(min-width: 60rem) 30vw, 100vw" />
                  <span className="landmarks-related__arrow" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                </a>
                <Reveal as="div" className="landmarks-related__copy">
                  <h3 data-motion="rise">
                    <a href={`#/landmarks/${related}`}>{name}</a>
                  </h3>
                  <p className="landmarks-body" data-motion="fade">
                    {t(`marketing.landmarks.${related}.purpose`)}
                  </p>
                </Reveal>
              </article>
            );
          })}
        </div>
      </section>
    </LandmarkPageShell>
  );
}

/** The route validates ids; the guard also keeps direct component use safe. */
export default function Landmark({ context }: ViewProps): ReactNode {
  const id = context.params.id;
  return isLandmarkId(id) ? <LandmarkContent key={id} id={id} /> : null;
}
