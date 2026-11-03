import type { TranslationKey } from '../i18n/i18n';
import type { WorldPoint } from './geo';

/** Only attractions named in the brief; the other seven are [TBC]. */
export const ATTRACTION_IDS = ['entertainment-pier', 'public-beach', 'cruise-terminal'] as const;
export type AttractionId = (typeof ATTRACTION_IDS)[number];

export interface Attraction {
  readonly id: AttractionId;
  readonly nameKey: TranslationKey;
  readonly summaryKey: TranslationKey;
  readonly position: WorldPoint;
  readonly markerHeight: number;
}

export const ATTRACTIONS: Readonly<Record<AttractionId, Attraction>> = {
  'cruise-terminal': {
    id: 'cruise-terminal',
    nameKey: 'attractions.cruiseTerminal.name',
    summaryKey: 'attractions.cruiseTerminal.summary',
    position: { x: -20, z: 0 },
    markerHeight: 30,
  },
  'entertainment-pier': {
    id: 'entertainment-pier',
    nameKey: 'attractions.entertainmentPier.name',
    summaryKey: 'attractions.entertainmentPier.summary',
    position: { x: -360, z: 1500 },
    markerHeight: 22,
  },
  'public-beach': {
    id: 'public-beach',
    nameKey: 'attractions.publicBeach.name',
    summaryKey: 'attractions.publicBeach.summary',
    position: { x: -90, z: 1950 },
    markerHeight: 8,
  },
};
