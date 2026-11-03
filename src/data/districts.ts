import type { TranslationKey } from '../i18n/i18n';
import type { WorldPoint } from './geo';

export const DISTRICT_IDS = [
  'central',
  'marina',
  'beach',
  'sports-park',
  'culture',
  'wellness',
] as const;
export type DistrictId = (typeof DISTRICT_IDS)[number];

export interface District {
  readonly id: DistrictId;
  readonly nameKey: TranslationKey;
  readonly summaryKey: TranslationKey;
  /** Highlight colour on the map. [TBC: align with JCDC district colour coding, if any] */
  readonly color: string;
  /** Outline (world xz, any winding). */
  readonly polygon: readonly WorldPoint[];
  /** Where the district's map label sits. */
  readonly label: WorldPoint;
}

const p = (x: number, z: number): WorldPoint => ({ x, z });

/** Ordered north → south along the coast. Descriptions are drafts (see i18n). */
export const DISTRICTS: Readonly<Record<DistrictId, District>> = {
  'sports-park': {
    id: 'sports-park',
    nameKey: 'districts.sportsPark.name',
    summaryKey: 'districts.sportsPark.summary',
    color: '#9ccc7a',
    polygon: [p(-60, -2300), p(1240, -2300), p(1240, -1050), p(-60, -1050)],
    label: p(940, -2080),
  },
  culture: {
    id: 'culture',
    nameKey: 'districts.culture.name',
    summaryKey: 'districts.culture.summary',
    color: '#e79a8f',
    polygon: [
      p(-60, -1050),
      p(640, -1050),
      p(640, -80),
      p(-60, -80),
      p(-60, -430),
      p(-510, -540),
      p(-510, -780),
      p(-60, -720),
    ],
    label: p(220, -930),
  },
  central: {
    id: 'central',
    nameKey: 'districts.central.name',
    summaryKey: 'districts.central.summary',
    color: '#f0b766',
    polygon: [p(640, -1050), p(1240, -1050), p(1240, 700), p(640, 700)],
    label: p(940, -180),
  },
  marina: {
    id: 'marina',
    nameKey: 'districts.marina.name',
    summaryKey: 'districts.marina.summary',
    color: '#6cc3d2',
    polygon: [
      p(-60, -80),
      p(640, -80),
      p(640, 700),
      p(-60, 700),
      p(-60, 610),
      p(-230, 480),
      p(-300, 300),
      p(-60, 60),
    ],
    label: p(330, 260),
  },
  beach: {
    id: 'beach',
    nameKey: 'districts.beach.name',
    summaryKey: 'districts.beach.summary',
    color: '#f3d48e',
    polygon: [p(-130, 700), p(440, 700), p(440, 2700), p(-130, 2700)],
    label: p(200, 2300),
  },
  wellness: {
    id: 'wellness',
    nameKey: 'districts.wellness.name',
    summaryKey: 'districts.wellness.summary',
    color: '#b9a8e6',
    polygon: [p(440, 700), p(1240, 700), p(1240, 2700), p(440, 2700)],
    label: p(840, 1750),
  },
};

export function isDistrictId(value: string | undefined): value is DistrictId {
  return DISTRICT_IDS.some((id) => id === value);
}
