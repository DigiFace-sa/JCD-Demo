import {
  DataTexture,
  LinearMipmapLinearFilter,
  LinearFilter,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three';
import { createRandom } from '../utils/random';

const SIZE = 256;
const WAVE_COUNT = 56;
/** Prevailing wind direction (radians) and spread of wave directions around it. */
const WIND_ANGLE = 0.35;
const WIND_SPREAD = 0.9;
const MIN_FREQUENCY = 2;
const MAX_FREQUENCY = 30;
/** Amplitude falls off with frequency^this (higher = smoother water). */
const SPECTRUM_FALLOFF = 1.35;
const SLOPE_SCALE = 0.22;

/**
 * Seamlessly tiling wave normal map, generated once on the CPU so no image asset is needed.
 * A sum of sine waves with integer frequencies (so it tiles exactly), biased along the wind.
 * RGB = tangent-space normal, A = normalised height (used for foam breakup).
 */
export function createWaveNormalMap(seed = 3): DataTexture {
  const random = createRandom(seed);
  const waves = Array.from({ length: WAVE_COUNT }, () => {
    const frequency = MIN_FREQUENCY * (MAX_FREQUENCY / MIN_FREQUENCY) ** random();
    const angle = WIND_ANGLE + (random() + random() - 1) * WIND_SPREAD;
    const kx = Math.round(Math.cos(angle) * frequency);
    const ky = Math.round(Math.sin(angle) * frequency);
    const magnitude = Math.hypot(kx, ky) || 1;
    return { kx, ky, amplitude: 1 / magnitude ** SPECTRUM_FALLOFF, phase: random() * Math.PI * 2 };
  }).filter((wave) => wave.kx !== 0 || wave.ky !== 0);

  const heights = new Float32Array(SIZE * SIZE);
  const slopesX = new Float32Array(SIZE * SIZE);
  const slopesY = new Float32Array(SIZE * SIZE);
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      let height = 0;
      let dx = 0;
      let dy = 0;
      for (const wave of waves) {
        const phase = Math.PI * 2 * (wave.kx * u + wave.ky * v) + wave.phase;
        const c = Math.cos(phase);
        height += wave.amplitude * Math.sin(phase);
        dx += wave.amplitude * wave.kx * c;
        dy += wave.amplitude * wave.ky * c;
      }
      const index = y * SIZE + x;
      heights[index] = height;
      slopesX[index] = dx;
      slopesY[index] = dy;
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
  }

  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let index = 0; index < SIZE * SIZE; index++) {
    const nx = -(slopesX[index] ?? 0) * SLOPE_SCALE;
    const ny = -(slopesY[index] ?? 0) * SLOPE_SCALE;
    const length = Math.hypot(nx, ny, 1);
    data[index * 4] = Math.round(((nx / length) * 0.5 + 0.5) * 255);
    data[index * 4 + 1] = Math.round(((ny / length) * 0.5 + 0.5) * 255);
    data[index * 4 + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
    data[index * 4 + 3] = Math.round(
      (((heights[index] ?? 0) - minHeight) / (maxHeight - minHeight)) * 255,
    );
  }

  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
