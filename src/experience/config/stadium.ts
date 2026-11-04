import { MathUtils, type Vector3 } from 'three';
import { LANDMARKS } from '../../data/landmarks';
import { COAST } from './scene';
import type { ControlLimits, OrbitView } from '../interaction/Controls';

/** Original illustrative stadium dimensions, shared by geometry, flights and collision limits. */
export const STADIUM = {
  rx: 118,
  rz: 140,
  segments: 192,
  tiers: [
    { inner: 0.5, outer: 0.69, bottom: 4, top: 14, rows: 16 },
    { inner: 0.73, outer: 0.84, bottom: 18, top: 27, rows: 12 },
    { inner: 0.89, outer: 1, bottom: 31, top: 39, rows: 12 },
  ],
  tunnel: { halfWidth: 4.5, floor: 14, ceiling: 19, innerX: 79, outerX: 126 },
  roof: { inner: 0.6, outer: 1.08, yInner: 39, yOuter: 47 },
  clearance: 2.2,
  /** Exterior footprint half-sizes (m) of the Blender model (scripts/blender/stadium.py PERGOLA). */
  exterior: { hx: 206, hz: 228 },
  /** The east grand stair and approach, kept clear of planting: x beyond hx, |z| below this. */
  approachHalfWidth: 40,
} as const;

export const STADIUM_POSITION = {
  x: LANDMARKS.stadium.position.x,
  y: COAST.landHeight,
  z: LANDMARKS.stadium.position.z,
};

/** Stadium-local coordinates to world metres. */
export const stadiumPoint = (
  x: number,
  y: number,
  z: number,
): { x: number; y: number; z: number } => ({
  x: STADIUM_POSITION.x + x,
  y: STADIUM_POSITION.y + y,
  z: STADIUM_POSITION.z + z,
});

/** Keep free orbit inside the pitch opening; scripted viewpoints use their own safe envelopes. */
export const STADIUM_LIMITS: ControlLimits = {
  minRadius: 22,
  maxRadius: 70,
  minPolar: MathUtils.degToRad(35),
  maxPolar: MathUtils.degToRad(88),
  minHeight: COAST.landHeight + 6,
  bounds: {
    minX: STADIUM_POSITION.x - 10,
    maxX: STADIUM_POSITION.x + 10,
    minZ: STADIUM_POSITION.z - 14,
    maxZ: STADIUM_POSITION.z + 14,
  },
};

export const STADIUM_ARRIVAL: OrbitView = {
  target: stadiumPoint(-8, 5, 0),
  radius: 63,
  polar: MathUtils.degToRad(68),
  azimuth: MathUtils.degToRad(90),
};

/** Exterior approach → east doorway → covered passage → bowl reveal, all in local metres. */
export const STADIUM_PORTAL = [
  { position: stadiumPoint(230, 38, 18), target: stadiumPoint(90, 16, 0) },
  { position: stadiumPoint(150, 17, 0), target: stadiumPoint(80, 16, 0) },
  { position: stadiumPoint(123, 16.4, 0), target: stadiumPoint(65, 16, 0) },
  { position: stadiumPoint(105, 16.4, 0), target: stadiumPoint(42, 14, 0) },
  { position: stadiumPoint(85, 16.4, 0), target: stadiumPoint(10, 11, 0) },
  { position: stadiumPoint(72, 16.4, 0), target: STADIUM_ARRIVAL.target },
] as const;

/** Passage landmarks reused when changing between the concourse and bowl. */
export const STADIUM_PASSAGE = {
  reveal: stadiumPoint(72, 16.4, 0),
  mouth: stadiumPoint(85, 16.4, 0),
  lookIntoBowl: stadiumPoint(25, 13, 0),
};

/** Minimum camera altitude above the stepped bowl at a world position. */
export function stadiumFloor(x: number, z: number): number {
  const r = Math.hypot(
    (x - STADIUM_POSITION.x) / STADIUM.rx,
    (z - STADIUM_POSITION.z) / STADIUM.rz,
  );
  let floor = 3;
  for (const tier of STADIUM.tiers) {
    if (r >= tier.inner) {
      const t = Math.min(1, (r - tier.inner) / (tier.outer - tier.inner));
      floor = tier.bottom + (Math.ceil(t * tier.rows) / tier.rows) * (tier.top - tier.bottom);
    }
  }
  return floor + COAST.landHeight + STADIUM.clearance;
}

/** Analytic occlusion avoids raycasting the instanced foreground seats for every marker. */
export function stadiumAnchorVisible(camera: Vector3, anchor: Vector3): boolean {
  // Intersect the passage slabs exactly: a sampled ray can otherwise skip its thin ceiling.
  const dy = anchor.y - camera.y;
  if (Math.abs(dy) > Number.EPSILON) {
    for (const plane of [STADIUM.tunnel.floor, STADIUM.tunnel.ceiling]) {
      const t = (STADIUM_POSITION.y + plane - camera.y) / dy;
      if (t <= 0 || t >= 1) continue;
      const x = MathUtils.lerp(camera.x, anchor.x, t) - STADIUM_POSITION.x;
      const z = MathUtils.lerp(camera.z, anchor.z, t) - STADIUM_POSITION.z;
      if (
        x > STADIUM.tunnel.innerX &&
        x < STADIUM.tunnel.outerX &&
        Math.abs(z) < STADIUM.tunnel.halfWidth
      )
        return false;
    }
  }
  const samples = 24;
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const x = MathUtils.lerp(camera.x, anchor.x, t) - STADIUM_POSITION.x;
    const y = MathUtils.lerp(camera.y, anchor.y, t) - STADIUM_POSITION.y;
    const z = MathUtils.lerp(camera.z, anchor.z, t) - STADIUM_POSITION.z;
    const radius = Math.hypot(x / STADIUM.rx, z / STADIUM.rz);
    const inTunnel =
      x > STADIUM.tunnel.innerX &&
      x < STADIUM.tunnel.outerX &&
      Math.abs(z) < STADIUM.tunnel.halfWidth;
    if (inTunnel) {
      if (y > STADIUM.tunnel.ceiling || y < STADIUM.tunnel.floor) return false;
      continue;
    }
    if (radius > 0.96 && radius < 1.04 && y > 4 && y < 40) return false;
    if (radius > STADIUM.roof.inner && radius < STADIUM.roof.outer) {
      const roofY = MathUtils.lerp(
        STADIUM.roof.yInner,
        STADIUM.roof.yOuter,
        (radius - STADIUM.roof.inner) / (STADIUM.roof.outer - STADIUM.roof.inner),
      );
      if (y > roofY - 0.5 && y < roofY + 0.5) return false;
    }
    if (
      radius > 0.5 &&
      radius < 1 &&
      y <
        stadiumFloor(x + STADIUM_POSITION.x, z + STADIUM_POSITION.z) -
          STADIUM_POSITION.y -
          STADIUM.clearance -
          0.4
    )
      return false;
  }
  return true;
}
