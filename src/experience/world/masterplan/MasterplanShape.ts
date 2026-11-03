import { COAST } from '../../config/scene';
import { MASTERPLAN, type Segment } from '../../config/masterplan';
import { waterlineX } from '../Coastline';

/**
 * The land shape: natural coast, straightened (reclaimed) masterplan waterfront, Opera
 * peninsula, marina basin and breakwaters, combined as signed distance functions
 * (positive = land). Shore fields, terrain and building placement all read from here.
 */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** 1 along the masterplan waterfront, fading to 0 over `blend` at each end. */
function masterplanWeight(z: number): number {
  const { zStart, zEnd, blend } = MASTERPLAN;
  return smoothstep(zStart - blend, zStart, z) * (1 - smoothstep(zEnd, zEnd + blend, z));
}

/** Waterline x for a given z (before peninsula/marina features). */
export function shoreX(z: number): number {
  const w = masterplanWeight(z);
  return waterlineX(z) * (1 - w) + MASTERPLAN.shoreX * w;
}

function baseDistance(x: number, z: number): number {
  const slope = (shoreX(z + 1) - shoreX(z - 1)) / 2;
  return (x - shoreX(z)) / Math.sqrt(1 + slope * slope);
}

/** Distance to a capsule's surface (negative inside). */
function capsule(x: number, z: number, segment: Segment): number {
  const { from, to, radius } = segment;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const t = Math.min(1, Math.max(0, ((x - from.x) * dx + (z - from.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - from.x - dx * t, z - from.z - dz * t) - radius;
}

/** Distance to a rounded box's surface (negative inside). */
function roundedBox(x: number, z: number): number {
  const { center, halfSize, radius } = MASTERPLAN.marinaBasin;
  const qx = Math.abs(x - center.x) - halfSize.x + radius;
  const qz = Math.abs(z - center.z) - halfSize.z + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - radius;
}

/**
 * Signed distance to the shore: positive on land, negative in the water. Breakwaters count
 * as land for the shore fields and placement; the ground mesh leaves them out because they
 * are modelled as their own geometry (too thin and diagonal for the terrain grid).
 */
export function landDistance(x: number, z: number, includeBreakwaters = true): number {
  let land = baseDistance(x, z);
  land = Math.max(land, -capsule(x, z, MASTERPLAN.peninsula));
  land = Math.min(land, roundedBox(x, z));
  if (includeBreakwaters) {
    for (const breakwater of MASTERPLAN.breakwaters)
      land = Math.max(land, -capsule(x, z, breakwater));
  }
  return land;
}

/** 1 where the shore is a natural sloped beach, 0 where it is a quay wall. */
export function beachWeight(z: number): number {
  const { beach } = MASTERPLAN;
  const inBeach =
    smoothstep(beach.zStart - 80, beach.zStart + 80, z) *
    (1 - smoothstep(beach.zEnd - 80, beach.zEnd + 80, z));
  return Math.max(1 - masterplanWeight(z), inBeach);
}

/** Ground height (m above sea level) for a point, given its shore distance. */
export function groundHeightAt(distance: number, z: number): number {
  const natural =
    distance < 0
      ? Math.max(COAST.seabedDepth, distance * 0.045)
      : Math.min(COAST.landHeight, distance * 0.035);
  const quay =
    distance >= 0 ? COAST.landHeight : Math.max(MASTERPLAN.quayDepth, distance * 1.5 - 0.5);
  const beach = beachWeight(z);
  return natural * beach + quay * (1 - beach);
}

export function isInsideMasterplan(x: number, z: number): boolean {
  const { exclusion } = MASTERPLAN;
  return x < exclusion.maxX && z > exclusion.minZ && z < exclusion.maxZ;
}

/**
 * 0–1 garden coverage at a point. Park outlines wobble (a few harmonics of the angle) so
 * they read as landscape rather than circles.
 */
export function parkWeight(x: number, z: number): number {
  let weight = 0;
  for (const [index, park] of MASTERPLAN.parks.entries()) {
    const dx = x - park.x;
    const dz = z - park.z;
    const angle = Math.atan2(dz, dx);
    const wobble =
      1 + 0.16 * Math.sin(3 * angle + index * 1.7) + 0.09 * Math.sin(5 * angle + index * 2.9);
    const edge = park.radius * wobble;
    weight = Math.max(weight, 1 - smoothstep(edge - 25, edge, Math.hypot(dx, dz)));
  }
  return weight;
}
