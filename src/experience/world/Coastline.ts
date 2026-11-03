import { COAST } from '../config/scene';
import type { SignedDistanceFn } from './ShoreField';

/**
 * Placeholder coastline: a gently curving waterline x(z) along the Red Sea.
 * Phase 4 replaces this with the masterplan outline (marina, beach, piers) via ShoreField's
 * distance-function interface; nothing else depends on this shape.
 */
export function waterlineX(z: number): number {
  return COAST.waves.reduce(
    (x, wave) => x + wave.amplitude * Math.sin((z / wave.wavelength) * Math.PI * 2 + wave.phase),
    0,
  );
}

function waterlineSlope(z: number): number {
  return COAST.waves.reduce((slope, wave) => {
    const k = (Math.PI * 2) / wave.wavelength;
    return slope + wave.amplitude * k * Math.cos(z * k + wave.phase);
  }, 0);
}

/** Perpendicular distance approximation: horizontal offset scaled by the shore's local angle. */
export const coastlineDistance: SignedDistanceFn = (x, z) =>
  (x - waterlineX(z)) / Math.sqrt(1 + waterlineSlope(z) ** 2);
