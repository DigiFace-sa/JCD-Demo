import type { WorldPoint } from '../../data/geo';

/** Even-odd point-in-polygon test on the xz plane. */
export function pointInPolygon(x: number, z: number, polygon: readonly WorldPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the nearest edge of a polygon. */
export function distanceToEdges(x: number, z: number, polygon: readonly WorldPoint[]): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/** Axis-aligned bounds of a polygon. */
export function polygonBounds(polygon: readonly WorldPoint[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  return {
    minX: Math.min(...polygon.map((p) => p.x)),
    maxX: Math.max(...polygon.map((p) => p.x)),
    minZ: Math.min(...polygon.map((p) => p.z)),
    maxZ: Math.max(...polygon.map((p) => p.z)),
  };
}
