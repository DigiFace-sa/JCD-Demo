import { OFFICIAL_IMAGES, type OfficialImage } from './officialImages';
import type { TranslationKey } from '../i18n/i18n';
import type { LandmarkId } from './landmarks';

/**
 * Official JCDC renders (generated size table; provenance in assets/official-images.json and
 * docs/SOURCE_ASSETS.md). Kept under its historical name for the marketing pages.
 */
export const MARKETING_IMAGES = OFFICIAL_IMAGES;
export type MarketingImage = OfficialImage;

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
