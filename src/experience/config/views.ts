import { MathUtils } from 'three';
import type { ControlLimits, OrbitView } from '../interaction/Controls';

const deg = MathUtils.degToRad;

/** Spawn-map navigation limits: the user can never lose the masterplan or clip the ground. */
export const MAP_LIMITS: ControlLimits = {
  minRadius: 150,
  maxRadius: 6500,
  minPolar: deg(18),
  maxPolar: deg(86),
  minHeight: 12,
  bounds: { minX: -3200, maxX: 2600, minZ: -4200, maxZ: 4200 },
};

/**
 * Reference views (debug panel and screenshots). Azimuth 90° puts the camera east of the
 * target looking due west; the sun sits at azimuth ≈102° (bearing 258°). Phase 4's CameraDirector takes over named shots.
 */
export const VIEWS = {
  wide: { target: { x: -900, y: 0, z: 250 }, radius: 3600, polar: deg(77), azimuth: deg(90) },
  low: { target: { x: -1400, y: 0, z: 420 }, radius: 260, polar: deg(85), azimuth: deg(100) },
  map: { target: { x: 400, y: 0, z: 200 }, radius: 5000, polar: deg(58), azimuth: deg(-72) },
  waterfront: {
    target: { x: -330, y: 20, z: -620 },
    radius: 620,
    polar: deg(84),
    azimuth: deg(-70),
  },
  city: { target: { x: 700, y: 0, z: 2300 }, radius: 650, polar: deg(76), azimuth: deg(-75) },
  sun: { target: { x: -2600, y: 0, z: -180 }, radius: 1100, polar: deg(81), azimuth: deg(103) },
} as const satisfies Record<string, OrbitView>;

export type ViewName = keyof typeof VIEWS;
