import type { TranslationKey } from '../i18n/i18n';
import type { CameraShot } from './geo';

export const STADIUM_HOTSPOT_IDS = [
  'pitch',
  'seating',
  'roof',
  'vip',
  'concourse',
  'sports-park',
] as const;
export type StadiumHotspotId = (typeof STADIUM_HOTSPOT_IDS)[number];
export type StadiumViewId = StadiumHotspotId | 'inside';

interface StadiumHotspot {
  readonly titleKey: TranslationKey;
  readonly bodyKey: TranslationKey;
  /** Stadium-local anchor and orbit target, in illustrative world metres. */
  readonly anchor: { readonly x: number; readonly y: number; readonly z: number };
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly shot: CameraShot;
}

export const STADIUM_HOTSPOTS: Readonly<Record<StadiumHotspotId, StadiumHotspot>> = {
  pitch: {
    titleKey: 'stadium.hotspots.pitch.title',
    bodyKey: 'stadium.hotspots.pitch.body',
    anchor: { x: 0, y: 4, z: 0 },
    target: { x: 0, y: 4, z: 0 },
    shot: { radius: 67, polarDeg: 64, azimuthDeg: 110 },
  },
  seating: {
    titleKey: 'stadium.hotspots.seating.title',
    bodyKey: 'stadium.hotspots.seating.body',
    anchor: { x: -71, y: 14, z: -24 },
    target: { x: -68, y: 12, z: -24 },
    shot: { radius: 48, polarDeg: 78, azimuthDeg: 100 },
  },
  roof: {
    titleKey: 'stadium.hotspots.roof.title',
    bodyKey: 'stadium.hotspots.roof.body',
    anchor: { x: -70, y: 38, z: 4 },
    target: { x: -85, y: 39, z: 0 },
    shot: { radius: 48, polarDeg: 102, azimuthDeg: 100 },
  },
  vip: {
    titleKey: 'stadium.hotspots.vip.title',
    bodyKey: 'stadium.hotspots.vip.body',
    anchor: { x: -93, y: 29, z: 8 },
    target: { x: -94, y: 29, z: 8 },
    shot: { radius: 48, polarDeg: 83, azimuthDeg: 90 },
  },
  concourse: {
    titleKey: 'stadium.hotspots.concourse.title',
    bodyKey: 'stadium.hotspots.concourse.body',
    anchor: { x: 80, y: 16.5, z: 0 },
    target: { x: 91, y: 16, z: 0 },
    shot: { radius: 16, polarDeg: 90, azimuthDeg: 90 },
  },
  'sports-park': {
    titleKey: 'stadium.hotspots.sports-park.title',
    bodyKey: 'stadium.hotspots.sports-park.body',
    anchor: { x: 173, y: 7, z: 95 },
    target: { x: 0, y: 22, z: 0 },
    shot: { radius: 390, polarDeg: 73, azimuthDeg: 114 },
  },
};

export function isStadiumHotspotId(value: string | undefined): value is StadiumHotspotId {
  return STADIUM_HOTSPOT_IDS.some((id) => id === value);
}

export function isStadiumViewId(value: string | undefined): value is StadiumViewId {
  return value === 'inside' || isStadiumHotspotId(value);
}
