import type { TranslationKey } from '../i18n/i18n';

/** Display order everywhere (stadium first: it is the hero landmark of the demo). */
export const LANDMARK_IDS = ['stadium', 'opera-house', 'oceanarium', 'museum'] as const;
export type LandmarkId = (typeof LANDMARK_IDS)[number];

export interface Landmark {
  readonly id: LandmarkId;
  readonly nameKey: TranslationKey;
  readonly summaryKey: TranslationKey;
}

export const LANDMARKS: Readonly<Record<LandmarkId, Landmark>> = {
  stadium: {
    id: 'stadium',
    nameKey: 'landmarks.stadium.name',
    summaryKey: 'landmarks.stadium.summary',
  },
  'opera-house': {
    id: 'opera-house',
    nameKey: 'landmarks.operaHouse.name',
    summaryKey: 'landmarks.operaHouse.summary',
  },
  oceanarium: {
    id: 'oceanarium',
    nameKey: 'landmarks.oceanarium.name',
    summaryKey: 'landmarks.oceanarium.summary',
  },
  museum: {
    id: 'museum',
    nameKey: 'landmarks.museum.name',
    summaryKey: 'landmarks.museum.summary',
  },
};

export function isLandmarkId(value: string | undefined): value is LandmarkId {
  return LANDMARK_IDS.some((id) => id === value);
}
