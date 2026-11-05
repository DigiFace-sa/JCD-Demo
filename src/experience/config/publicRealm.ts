import { PLACES } from '../../data/places';

/** Illustrative detailing pockets (metres), not surveyed or approved destination designs. */
export const PUBLIC_REALM = {
  beach: {
    ...PLACES['beach-promenade'].position,
    halfLength: 210,
    walkWidth: 16,
    reserveHalfWidth: 70,
    shadeSpacing: 22,
  },
  central: {
    ...PLACES['central-square'].position,
    halfSize: 70,
    arcadeOffset: 57,
  },
  /** Local details disappear well before the map overview; furniture stays visible nearby. */
  detailRange: 950,
  /** Full manufacturing detail is visible only in close views (metres). */
  fineDetailRange: 100,
  peopleRange: 450,
  camera: { minRadius: 28, maxRadius: 360, minHeight: 10, targetTravel: 35, clearance: 8 },
} as const;

/** Reserve the pockets before building/vegetation generation so props cannot overlap them. */
export function isRealmReserved(x: number, z: number, margin = 0): boolean {
  const { beach, central } = PUBLIC_REALM;
  return (
    (Math.abs(x - central.x) < central.halfSize + margin &&
      Math.abs(z - central.z) < central.halfSize + margin) ||
    (Math.abs(x - beach.x) < beach.reserveHalfWidth + margin &&
      Math.abs(z - beach.z) < beach.halfLength + margin)
  );
}
