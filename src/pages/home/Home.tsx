import { useState, type ReactNode } from 'react';
import { Copy } from '../../app/Copy';
import { useI18n } from '../../app/i18n';
import { Icon } from '../../app/shell/Icon';
import { useReducedMotion } from '../../app/useReducedMotion';
import { OfficialPicture } from '../../app/OfficialPicture';
import { DISTRICT_IDS, DISTRICTS } from '../../data/districts';
import { LANDMARKS, type LandmarkId } from '../../data/landmarks';
import { NEWS, NEWS_IDS, SUSTAINABILITY_ITEMS, type MarketingImage } from '../../data/marketing';
import { DESTINATION_STATS } from '../../data/site';
import { HOME_DISTRICT_IMAGES } from '../../data/home';
import { FlowReveal as Reveal } from '../../motion/FlowReveal';
import { Scene, SceneStack, type SceneTransition } from '../../motion/SceneStack';
import { Opening } from './Opening';

/** Session flag: the brand opening plays on the first Home visit of a session only. */
const OPENING_KEY = 'jcdc.opening';

function openingSeen(): boolean {
  try {
    return sessionStorage.getItem(OPENING_KEY) !== null;
  } catch {
    return true;
  }
}

/** Where to fly into within a render for the next zoom-through (fractions of width/height). */
const FOCUS = {
  masterplanWaterfront: { x: 0.33, y: 0.58 },
  stadiumBowl: { x: 0.49, y: 0.34 },
} as const;
/** A district gallery needs enough native scroll distance to read each architectural frame. */
const DISTRICT_SCROLL_UNITS = 3;

/** One landmark chapter: its exterior scene, then a closer scene of a second official render. */
interface LandmarkChapter {
  readonly id: LandmarkId;
  readonly image: MarketingImage;
  readonly transition: SceneTransition;
  readonly focus?: { x: number; y: number };
  readonly detail: { image: MarketingImage; transition: SceneTransition };
}

const LANDMARK_CHAPTERS: readonly LandmarkChapter[] = [
  {
    id: 'stadium',
    image: 'stadium',
    transition: 'wipe',
    focus: FOCUS.stadiumBowl,
    detail: { image: 'stadium-bowl', transition: 'zoom' },
  },
  {
    id: 'opera-house',
    image: 'opera-house',
    transition: 'dissolve',
    detail: { image: 'opera-rehearsal', transition: 'dissolve' },
  },
  {
    id: 'oceanarium',
    image: 'oceanarium-night',
    transition: 'wipe',
    detail: { image: 'oceanarium-vortex', transition: 'dissolve' },
  },
  {
    id: 'museum',
    image: 'museum',
    transition: 'dissolve',
    detail: { image: 'culture-forum', transition: 'dissolve' },
  },
];

function Action({
  href,
  label,
  variant = 'text',
}: {
  href: string;
  label: string;
  variant?: 'text' | 'solid';
}): ReactNode {
  return (
    <a className={`scene-action scene-action--${variant}`} href={href} data-motion="rise">
      <span>{label}</span>
      <Icon name="arrow" />
    </a>
  );
}

/** Home: the destination told as one continuous film of official renders, then the latest news. */
export default function Home(): ReactNode {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(() => reduced || openingSeen());
  const chapter = (key: Parameters<typeof t>[0]): string => t(key);

  return (
    <div className="home">
      {!opened && !reduced && (
        <Opening
          onDone={() => {
            try {
              sessionStorage.setItem(OPENING_KEY, '1');
            } catch {
              // Storage unavailable: the opening simply plays again next time.
            }
            setOpened(true);
          }}
        />
      )}
      <SceneStack label={t('meta.siteName')} ready={opened || reduced}>
        <Scene
          image="masterplan"
          focus={FOCUS.masterplanWaterfront}
          variant="hero"
          chapter={chapter('marketing.scroll.chapters.intro')}
          label={t('meta.siteName')}
        >
          <Copy k="marketing.home.eyebrow" className="eyebrow" motion="rise" />
          <h1 className="scene__title scene__title--hero" data-motion="heading">
            {t('marketing.home.line1')} {t('marketing.home.line2')}
          </h1>
          <Copy k="marketing.home.lead" className="scene__lead" motion="lines" />
          <div className="scene__actions">
            <Action href="#/destination" label={t('marketing.actions.discover')} variant="solid" />
            <Action href="#/experience" label={t('marketing.actions.in3d')} />
          </div>
          <p className="scene__cue" data-motion="fade">
            <span className="scene__cue-line" aria-hidden="true" />
            {t('marketing.actions.scroll')}
          </p>
        </Scene>

        <Scene
          image="waterfront"
          transition="zoom"
          variant="panel"
          chapter={chapter('marketing.scroll.chapters.destination')}
          label={t('marketing.home.overviewEye')}
        >
          <div className="scene__copy">
            <Copy k="marketing.home.overviewEye" className="eyebrow" motion="rise" />
            <Copy
              k="marketing.home.overviewTitle"
              as="h2"
              className="scene__title"
              motion="heading"
            />
            <Copy k="marketing.home.overviewBody" className="scene__lead" motion="lines" />
          </div>
          <dl className="scene__stats">
            {DESTINATION_STATS.map((stat) => (
              <div key={stat.valueKey} className="scene__stat">
                <dt data-motion="fade">{t(stat.labelKey)}</dt>
                <dd
                  data-motion="counter"
                  data-count={stat.valueKey === 'stats.phase1.value' ? undefined : ''}
                >
                  {t(stat.valueKey)}
                </dd>
              </div>
            ))}
          </dl>
        </Scene>

        {LANDMARK_CHAPTERS.flatMap((landmark, index) => {
          const name = t(LANDMARKS[landmark.id].nameKey);
          const label = chapter('marketing.scroll.chapters.landmarks');
          return [
            <Scene
              key={landmark.id}
              image={landmark.image}
              transition={landmark.transition}
              focus={landmark.focus}
              variant="landmark"
              chapter={label}
              label={name}
            >
              <p className="eyebrow" data-motion="rise">
                {t('marketing.common.landmark')} · {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="scene__title" data-motion="heading">
                {name}
              </h2>
              <Copy
                k={`marketing.landmarks.${landmark.id}.body`}
                className="scene__lead"
                motion="lines"
              />
              <div className="scene__actions">
                <Action
                  href={`#/landmarks/${landmark.id}`}
                  label={t('marketing.actions.viewProject')}
                  variant="solid"
                />
                <Action href={`#/experience/${landmark.id}`} label={t('marketing.actions.in3d')} />
              </div>
            </Scene>,
            <Scene
              key={`${landmark.id}-detail`}
              image={landmark.detail.image}
              transition={landmark.detail.transition}
              align="end"
              variant="detail"
              chapter={label}
              label={name}
            >
              <p className="eyebrow" data-motion="rise">
                {t(`marketing.landmarks.${landmark.id}.purpose`)}
              </p>
              <Copy
                k={`marketing.landmarks.${landmark.id}.title`}
                as="h2"
                className="scene__title scene__title--detail"
                motion="heading"
              />
              <Copy
                k={`marketing.landmarks.${landmark.id}.detail`}
                className="scene__lead"
                motion="lines"
              />
              {landmark.id === 'opera-house' && (
                <p className="scene__fact" data-motion="rise">
                  {t('landmarks.operaHouse.facts')}
                </p>
              )}
            </Scene>,
          ];
        })}

        <Scene
          image="central-hub"
          duration={DISTRICT_SCROLL_UNITS}
          transition="wipe"
          variant="panel"
          chapter={chapter('marketing.scroll.chapters.districts')}
          label={t('marketing.home.districtsEye')}
        >
          <div className="scene__copy">
            <Copy k="marketing.home.districtsEye" className="eyebrow" motion="rise" />
            <Copy
              k="marketing.home.districtsTitle"
              as="h2"
              className="scene__title"
              motion="heading"
            />
            <Copy k="marketing.home.districtsBody" className="scene__lead" motion="lines" />
          </div>
          <div className="scene__film-viewport" data-motion="rise">
            <div className="scene__film" data-filmstrip>
              {DISTRICT_IDS.map((id) => (
                <a key={id} data-film-item href={`#/destination?district=${id}`}>
                  <OfficialPicture
                    id={HOME_DISTRICT_IMAGES[id]}
                    alt=""
                    sizes="(min-width: 60rem) 40vw, 100vw"
                  />
                  <span>{t(DISTRICTS[id].nameKey)}</span>
                  <Icon name="arrow" />
                </a>
              ))}
            </div>
          </div>
        </Scene>

        <Scene
          image="sustainability"
          transition="dissolve"
          variant="panel"
          chapter={chapter('marketing.scroll.chapters.sustainability')}
          label={t('marketing.home.sustainEye')}
        >
          <div className="scene__copy">
            <Copy k="marketing.home.sustainEye" className="eyebrow" motion="rise" />
            <Copy
              k="marketing.home.sustainTitle"
              as="h2"
              className="scene__title"
              motion="heading"
            />
            <Copy k="marketing.home.sustainBody" className="scene__lead" motion="lines" />
          </div>
          <div className="scene__pillars">
            <div className="scene__detail-images" data-motion="image" aria-hidden="true">
              <div data-depth="0.25">
                <OfficialPicture id="ribbon-park" alt="" sizes="(min-width: 60rem) 18vw, 45vw" />
              </div>
              <div data-depth="0.55">
                <OfficialPicture id="coral" alt="" sizes="(min-width: 60rem) 18vw, 45vw" />
              </div>
            </div>
            <p className="scene__figure">
              <span data-motion="counter" data-count="">
                {t('marketing.home.publicRealmValue')}
              </span>
              <span data-motion="fade">{t('marketing.home.publicRealm')}</span>
            </p>
            <ul>
              {SUSTAINABILITY_ITEMS.map((item) => (
                <li key={item} data-motion="rise">
                  {t(`marketing.sustainability.${item}.title`)}
                </li>
              ))}
            </ul>
          </div>
        </Scene>

        <Scene
          image="stadium-night"
          transition="dissolve"
          align="center"
          variant="statement"
          chapter={chapter('marketing.scroll.chapters.experience')}
          label={t('marketing.home.experienceEye')}
        >
          <Copy k="marketing.home.experienceEye" className="eyebrow" motion="rise" />
          <Copy
            k="marketing.home.experienceTitle"
            as="h2"
            className="scene__title"
            motion="heading"
          />
          <Copy k="marketing.home.experienceBody" className="scene__lead" motion="lines" />
          <div className="scene__actions">
            <Action href="#/experience" label={t('marketing.actions.in3d')} variant="solid" />
          </div>
        </Scene>

        <Scene
          image="marina"
          transition="wipe"
          variant="panel"
          chapter={chapter('marketing.scroll.chapters.invest')}
          label={t('marketing.home.investEye')}
        >
          <div className="scene__copy">
            <Copy k="marketing.home.investEye" className="eyebrow" motion="rise" />
            <Copy
              k="marketing.home.investTitle"
              as="h2"
              className="scene__title"
              motion="heading"
            />
            <Copy k="marketing.home.investBody" className="scene__lead" motion="lines" />
            <div className="scene__actions">
              <Action href="#/invest" label={t('marketing.actions.register')} variant="solid" />
            </div>
          </div>
          <ul className="scene__recognition" aria-label={t('marketing.common.recognition')}>
            {(['leed', 'efqm', 'kaqa'] as const).map((key) => (
              <li key={key} data-motion="rise">
                {t(`marketing.common.${key}`)}
              </li>
            ))}
          </ul>
        </Scene>
      </SceneStack>

      <Reveal className="home-news section container" label={t('marketing.common.news')}>
        <div className="home-news__head">
          <p className="eyebrow" data-motion="rise">
            {t('marketing.scroll.chapters.news')}
          </p>
          <Copy k="marketing.home.newsTitle" as="h2" className="editorial-title" motion="heading" />
          <a className="text-link" href="#/news" data-motion="rise">
            <span>{t('marketing.actions.viewAll')}</span>
            <span className="link-arrow">
              <Icon name="arrow" />
            </span>
          </a>
        </div>
        <div className="home-news__grid">
          {NEWS_IDS.map((id) => {
            const item = NEWS[id];
            return (
              <article key={id} className="home-news__card">
                <a
                  className="home-news__image"
                  href={`#/news/${id}`}
                  data-motion="image"
                  aria-label={t(item.titleKey)}
                >
                  <OfficialPicture id={item.image} alt="" sizes="(min-width: 70rem) 30vw, 100vw" />
                </a>
                <p className="home-news__meta" data-motion="fade">
                  <span>{t(item.categoryKey)}</span>
                  <time dateTime={item.date}>{t(item.dateKey)}</time>
                </p>
                <h3 data-motion="lines">
                  <a href={`#/news/${id}`}>{t(item.titleKey)}</a>
                </h3>
              </article>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
