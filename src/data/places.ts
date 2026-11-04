import type { TranslationKey } from '../i18n/i18n';
import type { CameraShot, WorldPoint } from './geo';
import type { DistrictId } from './districts';

/** Close views of illustrative public spaces; these are not additional destination attractions. */
export const PLACE_IDS = ['beach-promenade', 'central-square'] as const;
export type PlaceId = (typeof PLACE_IDS)[number];
interface Place {
  readonly district: DistrictId;
  readonly position: WorldPoint;
  readonly titleKey: TranslationKey;
  readonly bodyKey: TranslationKey;
  readonly shot: CameraShot;
}
export const PLACES: Readonly<Record<PlaceId, Place>> = {
  'beach-promenade': {
    district: 'beach',
    position: { x: 30, z: 1560 },
    titleKey: 'places.beach.title',
    bodyKey: 'places.beach.body',
    shot: { radius: 175, polarDeg: 66, azimuthDeg: 40 },
  },
  'central-square': {
    district: 'central',
    position: { x: 874, z: -348 },
    titleKey: 'places.central.title',
    bodyKey: 'places.central.body',
    shot: { radius: 110, polarDeg: 56, azimuthDeg: -45 },
  },
};
export function isPlaceId(value: string | undefined): value is PlaceId {
  return PLACE_IDS.some((id) => id === value);
}
