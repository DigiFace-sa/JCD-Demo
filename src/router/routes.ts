import { LANDMARKS, isLandmarkId } from '../data/landmarks';
import { isLegalDoc } from '../data/site';
import { isStadiumViewId } from '../data/stadium';
import { NEWS, isNewsId } from '../data/marketing';
import type { TranslationKey } from '../i18n/i18n';
import type { ComponentType } from 'react';
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
  /** Legacy imperative page (mount/update/unmount), adapted into React by RouteView. */
  readonly load?: () => Promise<PageModule>;
  /** React page. Takes precedence over `load` once a page is migrated. */
  readonly view?: () => Promise<{ readonly default: ComponentType<ViewProps> }>;
}

export interface ViewProps {
  readonly context: PageContext;
}

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
    view: () => import('../pages/home/Home'),
  },
  {
    pattern: '/destination',
    pageId: 'destination',
    layout: 'site',
    title: () => 'pages.destination.title',
    view: () => import('../pages/destination/Destination'),
  },
  {
    pattern: '/landmarks',
    pageId: 'landmarks',
    layout: 'site',
    title: () => 'pages.landmarks.title',
    view: () => import('../pages/landmarks/Landmarks'),
  },
  {
    pattern: '/landmarks/:id',
    pageId: 'landmark',
    layout: 'site',
    title: (params) => (isLandmarkId(params.id) ? LANDMARKS[params.id].nameKey : null),
    validate: (params) => isLandmarkId(params.id),
    view: () => import('../pages/landmarks/Landmark'),
  },
  {
    pattern: '/invest',
    pageId: 'invest',
    layout: 'site',
    title: () => 'pages.invest.title',
    view: () => import('../pages/invest/Invest'),
  },
  {
    pattern: '/news',
    pageId: 'news',
    layout: 'site',
    title: () => 'marketing.common.news',
    view: () => import('../pages/news/News'),
  },
  {
    pattern: '/news/:story',
    pageId: 'news-story',
    layout: 'site',
    title: (params) => (isNewsId(params.story) ? NEWS[params.story].titleKey : null),
    validate: (params) => isNewsId(params.story),
    view: () => import('../pages/news/NewsStory'),
  },
  {
    pattern: '/legal/:doc',
    pageId: 'legal',
    layout: 'site',
    title: (params) => (isLegalDoc(params.doc) ? `legal.${params.doc}` : null),
    validate: (params) => isLegalDoc(params.doc),
    view: () => import('../pages/legal/Legal'),
  },
  // Motion lab: proves the cinematic primitives. Hidden from navigation and pitch builds.
  ...(import.meta.env.VITE_ALLOW_DEBUG === 'false'
    ? []
    : [
        {
          pattern: '/lab',
          pageId: 'lab',
          layout: 'site',
          title: () => null,
          view: () => import('../pages/lab/Lab'),
        } satisfies RouteDef,
      ]),
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
