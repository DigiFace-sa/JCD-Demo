import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RGFormat, Vector4 } from 'three';
import type { Disposable } from '../types';

/** Signed distance to the waterline in metres: positive inland, negative offshore. */
export type SignedDistanceFn = (x: number, z: number) => number;

/** 0–1 per point: 1 where the shore is a natural beach (foam, shallows), 0 at quay walls. */
export type BeachFn = (x: number, z: number) => number;

export interface FieldBounds {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

/**
 * Signed-distance-to-shore field baked into a texture over a rectangle (R = distance,
 * G = beach weight). The sea shader samples it for shallow-water colour and foam. Any
 * coastline source works: it only needs a distance function.
 */
export class ShoreField implements Disposable {
  readonly texture: DataTexture;
  /** (minX, minZ, sizeX, sizeZ): maps world xz to texture uv in shaders. */
  readonly bounds: Vector4;

  constructor(distance: SignedDistanceFn, beach: BeachFn, area: FieldBounds, cell: number) {
    const sizeX = area.maxX - area.minX;
    const sizeZ = area.maxZ - area.minZ;
    const width = Math.ceil(sizeX / cell);
    const height = Math.ceil(sizeZ / cell);
    this.bounds = new Vector4(area.minX, area.minZ, sizeX, sizeZ);

    const halfFloats = new Uint16Array(width * height * 2);
    for (let row = 0; row < height; row++) {
      const z = area.minZ + ((row + 0.5) / height) * sizeZ;
      for (let col = 0; col < width; col++) {
        const x = area.minX + ((col + 0.5) / width) * sizeX;
        const index = (row * width + col) * 2;
        halfFloats[index] = DataUtils.toHalfFloat(distance(x, z));
        halfFloats[index + 1] = DataUtils.toHalfFloat(beach(x, z));
      }
    }

    this.texture = new DataTexture(halfFloats, width, height, RGFormat, HalfFloatType);
    this.texture.magFilter = LinearFilter;
    this.texture.minFilter = LinearFilter;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
