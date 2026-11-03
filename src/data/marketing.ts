import type { TranslationKey } from '../i18n/i18n';
import type { LandmarkId } from './landmarks';

/** Official imagery downloaded from JCDC; provenance and source sizes are in SOURCE_ASSETS.md. */
export const MARKETING_IMAGES = {
  masterplan: { width: 2000, height: 1125 },
  waterfront: { width: 2400, height: 1348 },
  stadium: { width: 2000, height: 1165 },
  'opera-house': { width: 1440, height: 720 },
  oceanarium: { width: 2000, height: 1198 },
  museum: { width: 1440, height: 720 },
  beach: { width: 1800, height: 1013 },
  marina: { width: 1800, height: 883 },
  coral: { width: 1600, height: 893 },
  park: { width: 1600, height: 901 },
  sustainability: { width: 2000, height: 1125 },
  'entertainment-pier': { width: 1087, height: 618 },
  'cruise-terminal': { width: 1600, height: 1270 },
} as const;
export type MarketingImage = keyof typeof MARKETING_IMAGES;

export const LANDMARK_IMAGES: Readonly<Record<LandmarkId, MarketingImage>> = {
  stadium: 'stadium',
  'opera-house': 'opera-house',
  oceanarium: 'oceanarium',
  museum: 'museum',
};

export const SECTORS = ['residential', 'hospitality', 'retail', 'wellness', 'commercial'] as const;
export const INVESTOR_TYPES = ['investor', 'developer', 'operator', 'advisor'] as const;
export const SUSTAINABILITY_ITEMS = ['coral', 'realm', 'shade', 'mobility'] as const;

export const NEWS_IDS = ['pif', 'forum', 'stadium'] as const;
export type NewsId = (typeof NEWS_IDS)[number];

interface NewsItem {
  readonly titleKey: TranslationKey;
  readonly bodyKey: TranslationKey;
  readonly dateKey: TranslationKey;
  readonly categoryKey: TranslationKey;
  readonly date: string;
  readonly image: MarketingImage;
  readonly source: string;
}

/** Locally readable editorial summaries of verified official stories; no external runtime feeds. */
export const NEWS: Readonly<Record<NewsId, NewsItem>> = {
  pif: {
    titleKey: 'marketing.news.pif.title',
    bodyKey: 'marketing.news.pif.body',
    dateKey: 'marketing.news.pif.date',
    categoryKey: 'marketing.news.categoryInvestment',
    date: '2026-02-09',
    image: 'marina',
    source: 'https://www.jeddahcentral.com/en/news-and-media/news/pif-privatesectorforum',
  },
  forum: {
    titleKey: 'marketing.news.forum.title',
    bodyKey: 'marketing.news.forum.body',
    dateKey: 'marketing.news.forum.date',
    categoryKey: 'marketing.news.categoryCompany',
    date: '2026-01-25',
    image: 'masterplan',
    source: 'https://www.jeddahcentral.com/en/news-and-media/news/reff',
  },
  stadium: {
    titleKey: 'marketing.news.stadium.title',
    bodyKey: 'marketing.news.stadium.body',
    dateKey: 'marketing.news.stadium.date',
    categoryKey: 'marketing.news.categoryStadium',
    date: '2026-01-22',
    image: 'stadium',
    source: 'https://www.jeddahcentral.com/en/news-and-media/news/mos-visit',
  },
};

export function isNewsId(value: string | undefined): value is NewsId {
  return NEWS_IDS.some((id) => id === value);
}
