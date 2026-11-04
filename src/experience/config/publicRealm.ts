import { PLACES } from '../../data/places';

/** Illustrative detailing pockets (metres), not surveyed or approved destination designs. */
export const PUBLIC_REALM = {
  beach: {
    ...PLACES['beach-promenade'].position,
    halfLength: 210,
    walkWidth: 16,
    reserveHalfWidth: 70,
    shadeSpacing: 22,
    shadeRadius: 3.1,
  },
  central: {
    ...PLACES['central-square'].position,
    halfSize: 70,
    arcadeOffset: 57,
    arcadeWidth: 13,
    arcadeLength: 112,
    arcadeHeight: 7.5,
  },
  /** Local details disappear well before the map overview; furniture stays visible nearby. */
  detailRange: 950,
  peopleRange: 450,
  camera: { minRadius: 55, maxRadius: 360, minHeight: 14, targetTravel: 35, clearance: 8 },
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
