import type { TranslationKey } from '../i18n/i18n';

interface JourneyChapter {
  readonly id: string;
  readonly label: TranslationKey;
  readonly blue: number;
  readonly gold: number;
}

/** Home chapters: labels for the chapter rail and light-field strengths. Visual parameters only. */
export const HOME_CHAPTERS = [
  {
    id: 'hero',
    label: 'marketing.scroll.chapters.intro',
    blue: 0.32,
    gold: 0.18,
  },
  {
    id: 'overview',
    label: 'marketing.scroll.chapters.destination',
    blue: 0.48,
    gold: 0.2,
  },
  {
    id: 'landmarks',
    label: 'marketing.scroll.chapters.landmarks',
    blue: 0.32,
    gold: 0.34,
  },
  {
    id: 'districts',
    label: 'marketing.scroll.chapters.districts',
    blue: 0.5,
    gold: 0.18,
  },
  {
    id: 'experience',
    label: 'marketing.scroll.chapters.experience',
    blue: 0.22,
    gold: 0.34,
  },
  {
    id: 'sustainability',
    label: 'marketing.scroll.chapters.sustainability',
    blue: 0.38,
    gold: 0.26,
  },
  {
    id: 'invest',
    label: 'marketing.scroll.chapters.invest',
    blue: 0.46,
    gold: 0.4,
  },
  {
    id: 'news',
    label: 'marketing.scroll.chapters.news',
    blue: 0.22,
    gold: 0.18,
  },
] as const satisfies readonly JourneyChapter[];
