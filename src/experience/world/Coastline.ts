import { COAST } from '../config/scene';

/**
 * Natural coastline: a gently curving waterline x(z) along the Red Sea. MasterplanShape
 * straightens it along the masterplan and adds the peninsula, marina and breakwaters.
 */
export function waterlineX(z: number): number {
  return COAST.waves.reduce(
    (x, wave) => x + wave.amplitude * Math.sin((z / wave.wavelength) * Math.PI * 2 + wave.phase),
    0,
  );
}
