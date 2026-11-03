import type { TranslationKey } from '../i18n/i18n';
import type { CameraShot, WorldPoint } from './geo';

/** Display order everywhere (stadium first: it is the hero landmark of the demo). */
export const LANDMARK_IDS = ['stadium', 'opera-house', 'oceanarium', 'museum'] as const;
export type LandmarkId = (typeof LANDMARK_IDS)[number];

export interface Landmark {
  readonly id: LandmarkId;
  readonly nameKey: TranslationKey;
  readonly summaryKey: TranslationKey;
  /** Extra fact lines shown in panels (only facts confirmed in the brief). */
  readonly factKeys: readonly TranslationKey[];
  readonly position: WorldPoint;
  /** Radius (m) of ground the landmark occupies; the masterplan keeps clear of it. */
  readonly footprint: number;
  /** Height (m) of the map marker anchor above ground. */
  readonly markerHeight: number;
  /** Exterior framing used when the landmark is selected on the map. */
  readonly shot: CameraShot;
}

export const LANDMARKS: Readonly<Record<LandmarkId, Landmark>> = {
  stadium: {
    id: 'stadium',
    nameKey: 'landmarks.stadium.name',
    summaryKey: 'landmarks.stadium.summary',
    // Capacity deliberately absent: [TBC] until JCDC confirms (public sources vary).
    factKeys: [],
    position: { x: 590, z: -1650 },
    footprint: 150,
    markerHeight: 70,
    shot: { radius: 700, polarDeg: 68, azimuthDeg: 108 },
  },
  'opera-house': {
    id: 'opera-house',
    nameKey: 'landmarks.operaHouse.name',
    summaryKey: 'landmarks.operaHouse.summary',
    factKeys: ['landmarks.operaHouse.facts', 'landmarks.operaHouse.factsDetail'],
    position: { x: -320, z: -620 },
    footprint: 125,
    markerHeight: 90,
    shot: { radius: 620, polarDeg: 74, azimuthDeg: 128 },
  },
  oceanarium: {
    id: 'oceanarium',
    nameKey: 'landmarks.oceanarium.name',
    summaryKey: 'landmarks.oceanarium.summary',
    factKeys: [],
    position: { x: 30, z: 740 },
    footprint: 85,
    markerHeight: 50,
    shot: { radius: 520, polarDeg: 72, azimuthDeg: 118 },
  },
  museum: {
    id: 'museum',
    nameKey: 'landmarks.museum.name',
    summaryKey: 'landmarks.museum.summary',
    factKeys: [],
    position: { x: 380, z: -560 },
    footprint: 105,
    markerHeight: 90,
    shot: { radius: 560, polarDeg: 66, azimuthDeg: 100 },
  },
};

export function isLandmarkId(value: string | undefined): value is LandmarkId {
  return LANDMARK_IDS.some((id) => id === value);
}
