import { LANDMARKS, isLandmarkId } from '../data/landmarks';
import { isLegalDoc } from '../data/site';
import { isStadiumViewId } from '../data/stadium';
import type { TranslationKey } from '../i18n/i18n';
import type { StubContent } from '../pages/stub/StubPage';
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

/** Temporary content pages until the marketing pages are built (Phase 2). */
const stub =
  (content: (params: Params) => StubContent): RouteDef['load'] =>
  () =>
    import('../pages/stub/StubPage').then((module) => ({
      default: module.createStubPage(content),
    }));

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
    load: stub(() => ({
      eyebrowKey: 'pages.home.eyebrow',
      headingKey: 'pages.home.heading',
      leadKey: 'pages.home.lead',
      showExploreCta: true,
    })),
  },
  {
    pattern: '/destination',
    pageId: 'destination',
    layout: 'site',
    title: () => 'pages.destination.title',
    load: stub(() => ({
      headingKey: 'pages.destination.heading',
      leadKey: 'pages.destination.lead',
    })),
  },
  {
    pattern: '/landmarks',
    pageId: 'landmarks',
    layout: 'site',
    title: () => 'pages.landmarks.title',
    load: stub(() => ({
      headingKey: 'pages.landmarks.heading',
      leadKey: 'pages.landmarks.lead',
    })),
  },
  {
    pattern: '/landmarks/:id',
    pageId: 'landmark',
    layout: 'site',
    title: (params) => (isLandmarkId(params.id) ? LANDMARKS[params.id].nameKey : null),
    validate: (params) => isLandmarkId(params.id),
    load: stub((params) => {
      const landmark = isLandmarkId(params.id) ? LANDMARKS[params.id] : LANDMARKS.stadium;
      return {
        eyebrowKey: 'nav.landmarks',
        headingKey: landmark.nameKey,
        leadKey: landmark.summaryKey,
        showExploreCta: true,
        explorePath: `/experience/${landmark.id}`,
      };
    }),
  },
  {
    pattern: '/invest',
    pageId: 'invest',
    layout: 'site',
    title: () => 'pages.invest.title',
    load: stub(() => ({ headingKey: 'pages.invest.heading', leadKey: 'pages.invest.lead' })),
  },
  {
    pattern: '/legal/:doc',
    pageId: 'legal',
    layout: 'site',
    title: (params) => (isLegalDoc(params.doc) ? `legal.${params.doc}` : null),
    validate: (params) => isLegalDoc(params.doc),
    load: stub((params) => ({
      headingKey: isLegalDoc(params.doc) ? `legal.${params.doc}` : 'legal.privacy',
      leadKey: 'pages.legal.lead',
    })),
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
