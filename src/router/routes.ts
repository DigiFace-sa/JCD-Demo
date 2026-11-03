import { LANDMARKS, isLandmarkId } from '../data/landmarks';
import { isLegalDoc } from '../data/site';
import { isStadiumViewId } from '../data/stadium';
import { NEWS, isNewsId } from '../data/marketing';
import type { TranslationKey } from '../i18n/i18n';
import type { PageContext, PageModule } from './Page';

/** `site` shows header + footer; `immersive` is full-bleed (the 3D Experience). */
export type Layout = 'site' | 'immersive';

type Params = PageContext['params'];

export interface RouteDef {
  /** Path pattern; `:name` segments become params. */
  readonly pattern: string;
  /** Routes sharing a pageId navigate in place via `Page.update` instead of remounting. */
  readonly pageId: string;
  readonly layout: Layout;
  /** Document title key; null means the site name alone. */
  readonly title: (params: Params) => TranslationKey | null;
  /** Reject unknown params (e.g. a non-existent landmark) so they fall through to 404. */
  readonly validate?: (params: Params) => boolean;
  readonly load: () => Promise<PageModule>;
}

const marketing: RouteDef['load'] = () => import('../pages/marketing/MarketingPage');

const experienceRoute = (pattern: string): RouteDef => ({
  pattern,
  pageId: 'experience',
  layout: 'immersive',
  title: () => 'pages.experience.title',
  validate: (params) =>
    (params.landmark === undefined || isLandmarkId(params.landmark)) &&
    (params.hotspot === undefined ||
      (params.landmark === 'stadium' && isStadiumViewId(params.hotspot))),
  load: () => import('../pages/experience/ExperiencePage'),
});

export const routes: readonly RouteDef[] = [
  {
    pattern: '/',
    pageId: 'home',
    layout: 'site',
    title: () => null,
    load: marketing,
  },
  {
    pattern: '/destination',
    pageId: 'destination',
    layout: 'site',
    title: () => 'pages.destination.title',
    load: marketing,
  },
  {
    pattern: '/landmarks',
    pageId: 'landmarks',
    layout: 'site',
    title: () => 'pages.landmarks.title',
    load: marketing,
  },
  {
    pattern: '/landmarks/:id',
    pageId: 'landmark',
    layout: 'site',
    title: (params) => (isLandmarkId(params.id) ? LANDMARKS[params.id].nameKey : null),
    validate: (params) => isLandmarkId(params.id),
    load: marketing,
  },
  {
    pattern: '/invest',
    pageId: 'invest',
    layout: 'site',
    title: () => 'pages.invest.title',
    load: marketing,
  },
  {
    pattern: '/news',
    pageId: 'news',
    layout: 'site',
    title: () => 'marketing.common.news',
    load: marketing,
  },
  {
    pattern: '/news/:story',
    pageId: 'news-story',
    layout: 'site',
    title: (params) => (isNewsId(params.story) ? NEWS[params.story].titleKey : null),
    validate: (params) => isNewsId(params.story),
    load: marketing,
  },
  {
    pattern: '/legal/:doc',
    pageId: 'legal',
    layout: 'site',
    title: (params) => (isLegalDoc(params.doc) ? `legal.${params.doc}` : null),
    validate: (params) => isLegalDoc(params.doc),
    load: marketing,
  },
  experienceRoute('/experience'),
  experienceRoute('/experience/:landmark'),
  experienceRoute('/experience/:landmark/:hotspot'),
];

export const notFoundRoute: RouteDef = {
  pattern: '*',
  pageId: 'not-found',
  layout: 'site',
  title: () => 'pages.notFound.title',
  load: () => import('../pages/not-found/NotFoundPage'),
};
