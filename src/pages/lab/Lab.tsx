import type { ReactNode } from 'react';
import { useI18n } from '../../app/i18n';
import { LANDMARK_IDS, LANDMARKS, type LandmarkId } from '../../data/landmarks';
import type { MarketingImage } from '../../data/marketing';
import { Reveal } from '../../motion/Reveal';
import { Scene, SceneStack, type SceneTransition } from '../../motion/SceneStack';

/** Official render for each landmark, and how its scene arrives. Visual direction only. */
const LANDMARK_SCENES: Readonly<
  Record<LandmarkId, { image: MarketingImage; transition: SceneTransition }>
> = {
  stadium: { image: 'stadium', transition: 'zoom' },
  'opera-house': { image: 'opera-house', transition: 'dissolve' },
  oceanarium: { image: 'oceanarium', transition: 'wipe' },
  museum: { image: 'museum', transition: 'dissolve' },
};

/** Where the stadium sits in the official masterplan render: the zoom-through target. */
const MASTERPLAN_STADIUM = { x: 0.57, y: 0.34 } as const;

/**
 * Motion lab (#/lab, hidden; absent from pitch builds). Proves the cinematic primitives on the
 * official renders before the real pages are rebuilt with them.
 */
export default function Lab(): ReactNode {
  const { t } = useI18n();
  return (
    <div className="lab">
      <SceneStack label={t('meta.siteName')}>
        <Scene image="masterplan" focus={MASTERPLAN_STADIUM} label={t('meta.siteName')}>
          <p className="eyebrow" data-motion="rise">
            {t('marketing.home.eyebrow')}
          </p>
          <h1 className="scene__title" data-motion="heading">
            {t('marketing.home.line1')} {t('marketing.home.line2')}
          </h1>
          <p className="scene__lead" data-motion="lines">
            {t('marketing.home.lead')}
          </p>
        </Scene>
        {LANDMARK_IDS.map((id) => (
          <Scene
            key={id}
            image={LANDMARK_SCENES[id].image}
            transition={LANDMARK_SCENES[id].transition}
            label={t(LANDMARKS[id].nameKey)}
          >
            <p className="eyebrow" data-motion="rise">
              {t('marketing.common.landmark')}
            </p>
            <h2 className="scene__title" data-motion="heading">
              {t(LANDMARKS[id].nameKey)}
            </h2>
            <p className="scene__lead" data-motion="lines">
              {t(`marketing.landmarks.${id}.body`)}
            </p>
          </Scene>
        ))}
      </SceneStack>
      <Reveal className="section container lab__flow" label={t('marketing.home.overviewEye')}>
        <p className="eyebrow" data-motion="rise">
          {t('marketing.home.overviewEye')}
        </p>
        <h2 className="editorial-title" data-motion="heading">
          {t('marketing.home.overviewTitle')}
        </h2>
        <p className="section-lead" data-motion="lines">
          {t('marketing.home.overviewBody')}
        </p>
        <figure className="lab__figure" data-motion="image">
          <img
            src="images/jcdc/waterfront.webp"
            width={2400}
            height={1348}
            alt={t('marketing.common.imageAlt.waterfront')}
          />
        </figure>
      </Reveal>
    </div>
  );
}
