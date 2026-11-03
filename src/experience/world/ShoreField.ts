import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RedFormat, Vector4 } from 'three';
import type { Disposable } from '../types';

/** Signed distance to the waterline in metres: positive inland, negative offshore. */
export type SignedDistanceFn = (x: number, z: number) => number;

/**
 * Baked signed-distance-to-shore field over a square area centred on the origin.
 * The sea shader samples it (shallow-water colour, foam); terrain and placement code
 * query it on the CPU. Any coastline source works: it only needs a distance function.
 */
export class ShoreField implements Disposable {
  readonly texture: DataTexture;
  /** (minX, minZ, size, size) — maps world xz to texture uv in shaders. */
  readonly bounds: Vector4;
  private readonly values: Float32Array;

  constructor(
    private readonly distance: SignedDistanceFn,
    private readonly size: number,
    resolution: number,
  ) {
    const half = size / 2;
    this.bounds = new Vector4(-half, -half, size, size);
    this.values = new Float32Array(resolution * resolution);
    const halfFloats = new Uint16Array(resolution * resolution);

    for (let row = 0; row < resolution; row++) {
      const z = -half + ((row + 0.5) / resolution) * size;
      for (let col = 0; col < resolution; col++) {
        const x = -half + ((col + 0.5) / resolution) * size;
        const index = row * resolution + col;
        const value = distance(x, z);
        this.values[index] = value;
        halfFloats[index] = DataUtils.toHalfFloat(value);
      }
    }

    this.texture = new DataTexture(halfFloats, resolution, resolution, RedFormat, HalfFloatType);
    this.texture.magFilter = LinearFilter;
    this.texture.minFilter = LinearFilter;
    this.texture.needsUpdate = true;
  }

  /** Exact signed distance (uses the source function, not the baked grid). */
  sample(x: number, z: number): number {
    return this.distance(x, z);
  }

  contains(x: number, z: number): boolean {
    const half = this.size / 2;
    return Math.abs(x) <= half && Math.abs(z) <= half;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
