import type { TranslationKey } from '../i18n/i18n';

interface JourneyChapter {
  readonly id: string;
  readonly label: TranslationKey;
  readonly sculpture: number;
  readonly opacity: number;
  readonly x: number;
  readonly y: number;
  readonly blue: number;
  readonly gold: number;
}

/** Original visual chapters, not geographic or project specifications. X/Y are viewport fractions. */
export const HOME_CHAPTERS = [
  {
    id: 'hero',
    label: 'marketing.scroll.chapters.intro',
    sculpture: 0,
    opacity: 0.72,
    x: 0.78,
    y: 0.51,
    blue: 0.32,
    gold: 0.18,
  },
  {
    id: 'overview',
    label: 'marketing.scroll.chapters.destination',
    sculpture: 0,
    opacity: 0.3,
    x: 0.94,
    y: 0.67,
    blue: 0.48,
    gold: 0.2,
  },
  {
    id: 'landmarks',
    label: 'marketing.scroll.chapters.landmarks',
    sculpture: 1,
    opacity: 0.25,
    // Tucked into the top corner so it frames the heading row without enclosing its link.
    x: 0.985,
    y: 0.06,
    blue: 0.32,
    gold: 0.34,
  },
  {
    id: 'districts',
    label: 'marketing.scroll.chapters.districts',
    sculpture: 2,
    opacity: 0.85,
    x: 0.24,
    y: 0.86,
    blue: 0.5,
    gold: 0.18,
  },
  {
    id: 'experience',
    label: 'marketing.scroll.chapters.experience',
    sculpture: 2,
    opacity: 0,
    x: 0.76,
    y: 0.5,
    blue: 0.22,
    gold: 0.34,
  },
  {
    id: 'sustainability',
    label: 'marketing.scroll.chapters.sustainability',
    sculpture: 3,
    opacity: 0.9,
    x: 0.82,
    y: 0.54,
    blue: 0.38,
    gold: 0.26,
  },
  {
    id: 'invest',
    label: 'marketing.scroll.chapters.invest',
    sculpture: 3,
    // Fades out in place: the investment chapter's call to action sits where the coral would be.
    opacity: 0,
    x: 0.82,
    y: 0.54,
    blue: 0.46,
    gold: 0.4,
  },
  {
    id: 'news',
    label: 'marketing.scroll.chapters.news',
    sculpture: 3,
    opacity: 0,
    x: 0.94,
    y: 0.6,
    blue: 0.22,
    gold: 0.18,
  },
] as const satisfies readonly JourneyChapter[];
