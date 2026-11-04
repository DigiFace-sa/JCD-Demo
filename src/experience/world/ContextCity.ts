import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { COAST, CONTEXT_CITY } from '../config/scene';
import type { Disposable } from '../types';
import { disposeObject } from '../utils/dispose';
import { createRandom } from '../utils/random';
import type { Atmosphere } from './Atmosphere';
import { facadeExtension } from './Facade';
import { isInsideMasterplan, landDistance } from './masterplan/MasterplanShape';

/** Share of buildings that are towers rather than low/mid-rise. */
const TOWER_CHANCE = 0.012;
const LOW_RISE = { min: 6, range: 26 };
const TOWER = { min: 40, range: 45 };
/** Gap (m) between buildings that share a block. */
const PLOT_GAP = 6;
/** Max brightness variation between buildings (± fraction). */
const TINT_VARIATION = 0.08;

interface Plot {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

/**
 * Generic surrounding city for scale and long sunset shadows, one instanced draw call.
 * Deliberately anonymous; it stays clear of the masterplan (see MASTERPLAN.exclusion).
 */
export class ContextCity implements Disposable {
  readonly object: InstancedMesh;

  constructor(atmosphere: Atmosphere) {
    const random = createRandom(CONTEXT_CITY.seed);
    const plots = this.layout(random);

    const geometry = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const material = atmosphere.patch(
      new MeshStandardMaterial({ color: CONTEXT_CITY.color, roughness: 0.82, metalness: 0 }),
      facadeExtension(atmosphere.night),
    );
    this.object = new InstancedMesh(geometry, material, plots.length);
    this.object.name = 'context-city';
    this.object.castShadow = true;
    this.object.receiveShadow = true;

    const matrix = new Matrix4();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();
    const tint = new Color();
    plots.forEach((plot, index) => {
      position.set(plot.x, COAST.landHeight, plot.z);
      scale.set(plot.width, plot.height, plot.depth);
      this.object.setMatrixAt(index, matrix.compose(position, rotation, scale));
      const shade = 1 + (random() * 2 - 1) * TINT_VARIATION;
      this.object.setColorAt(index, tint.setRGB(shade, shade, shade));
    });
    this.object.instanceMatrix.needsUpdate = true;
    this.object.computeBoundingSphere();
  }

  private layout(random: () => number): Plot[] {
    const { blockSize, streetWidth, inlandStart, inlandEnd } = CONTEXT_CITY;
    const pitch = blockSize + streetWidth;
    const half = COAST.fieldSize / 2;
    const plots: Plot[] = [];

    for (let z = -half + pitch / 2; z < half; z += pitch) {
      for (let x = -half + pitch / 2; x < half; x += pitch) {
        const distance = landDistance(x, z);
        if (distance < inlandStart || distance > inlandEnd) continue;
        if (isInsideMasterplan(x, z)) continue;

        // Split each block into one or two buildings along a random axis.
        const split = random() < 0.55;
        const alongX = random() < 0.5;
        const parts = split ? 2 : 1;
        const partSize = (blockSize - (parts - 1) * PLOT_GAP) / parts;
        for (let part = 0; part < parts; part++) {
          const offset = -blockSize / 2 + partSize / 2 + part * (partSize + PLOT_GAP);
          const isTower = random() < TOWER_CHANCE;
          const height = isTower
            ? TOWER.min + random() * TOWER.range
            : LOW_RISE.min + random() ** 2.5 * LOW_RISE.range;
          plots.push({
            x: alongX ? x + offset : x,
            z: alongX ? z : z + offset,
            width: (alongX ? partSize : blockSize) * (0.86 + random() * 0.12),
            depth: (alongX ? blockSize : partSize) * (0.86 + random() * 0.12),
            height,
          });
        }
      }
    }
    return plots;
  }

  dispose(): void {
    disposeObject(this.object);
    this.object.dispose();
  }
}
