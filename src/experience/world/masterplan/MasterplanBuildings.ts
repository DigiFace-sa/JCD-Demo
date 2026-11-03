import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type IUniform,
} from 'three';
import { ATTRACTIONS } from '../../../data/attractions';
import { DISTRICT_IDS, DISTRICTS, type DistrictId } from '../../../data/districts';
import { LANDMARK_IDS, LANDMARKS } from '../../../data/landmarks';
import { MASTERPLAN, type BuildingProfile } from '../../config/masterplan';
import { COAST } from '../../config/scene';
import type { Disposable } from '../../types';
import { createRandom } from '../../utils/random';
import { pointInPolygon, polygonBounds } from '../../utils/polygon';
import type { Atmosphere } from '../Atmosphere';
import { facadeExtension } from '../Facade';
import { beachWeight, landDistance, parkWeight } from './MasterplanShape';

/** Gap (m) between buildings sharing a block. */
const PLOT_GAP = 7;
/** Max brightness variation between buildings (± fraction). */
const TINT_VARIATION = 0.06;
/** Keep-out (m) around attraction structures (pier root, cruise terminal). */
const ATTRACTION_CLEARANCE = 120;

interface Plot {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

/** True where the masterplan keeps ground open (water edge, parks, plazas, landmarks). */
function isReserved(x: number, z: number, margin: number): boolean {
  const distance = landDistance(x, z);
  const setback = beachWeight(z) > 0.5 ? MASTERPLAN.beachSetback : MASTERPLAN.promenade;
  if (distance < setback + margin) return true;
  if (parkWeight(x, z) > 0 || parkWeight(x + margin, z) > 0 || parkWeight(x - margin, z) > 0)
    return true;
  if (parkWeight(x, z + margin) > 0 || parkWeight(x, z - margin) > 0) return true;
  for (const id of LANDMARK_IDS) {
    const { position, footprint } = LANDMARKS[id];
    if (
      Math.hypot(x - position.x, z - position.z) <
      footprint + MASTERPLAN.landmarkClearance + margin
    )
      return true;
  }
  for (const attraction of Object.values(ATTRACTIONS)) {
    const { x: ax, z: az } = attraction.position;
    if (Math.hypot(x - Math.max(ax, MASTERPLAN.shoreX), z - az) < ATTRACTION_CLEARANCE + margin)
      return true;
  }
  return false;
}

/**
 * Generic masterplan building fabric, one instanced mesh per district so each district's
 * buildings can glow when it is highlighted. Massing is illustrative, not the actual design.
 */
export class MasterplanBuildings implements Disposable {
  readonly object = new Group();
  /** Per-district highlight level (0–1), animated by Masterplan. */
  readonly highlight = new Map<DistrictId, IUniform<number>>();
  private readonly meshes: InstancedMesh<BoxGeometry, MeshStandardMaterial>[] = [];

  constructor(atmosphere: Atmosphere) {
    const random = createRandom(MASTERPLAN.landscape.seed);
    const geometry = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const matrix = new Matrix4();
    const position = new Vector3();
    const scale = new Vector3();
    const rotation = new Quaternion();
    const tint = new Color();

    for (const id of DISTRICT_IDS) {
      const plots = this.layout(id, MASTERPLAN.profiles[id], random);
      if (plots.length === 0) continue;
      const level: IUniform<number> = { value: 0 };
      this.highlight.set(id, level);
      const material = atmosphere.patch(
        new MeshStandardMaterial({
          color: MASTERPLAN.buildingColor,
          roughness: 0.72,
          metalness: 0,
        }),
        facadeExtension({ level, color: new Color(DISTRICTS[id].color) }),
      );
      const mesh = new InstancedMesh(geometry, material, plots.length);
      mesh.name = `buildings-${id}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      plots.forEach((plot, index) => {
        position.set(plot.x, COAST.landHeight, plot.z);
        scale.set(plot.width, plot.height, plot.depth);
        mesh.setMatrixAt(index, matrix.compose(position, rotation, scale));
        const shade = 1 + (random() * 2 - 1) * TINT_VARIATION;
        mesh.setColorAt(index, tint.setRGB(shade, shade, shade));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.meshes.push(mesh);
      this.object.add(mesh);
    }
  }

  private layout(id: DistrictId, profile: BuildingProfile, random: () => number): Plot[] {
    const polygon = DISTRICTS[id].polygon;
    const bounds = polygonBounds(polygon);
    const size = profile.block - profile.street;
    const plots: Plot[] = [];

    for (let z = bounds.minZ + profile.block / 2; z < bounds.maxZ; z += profile.block) {
      for (let x = bounds.minX + profile.block / 2; x < bounds.maxX; x += profile.block) {
        if (!pointInPolygon(x, z, polygon) || random() > profile.density) continue;
        if (isReserved(x, z, size / 2)) continue;

        const split = random() < 0.5;
        const alongX = random() < 0.5;
        const parts = split ? 2 : 1;
        const partSize = (size - (parts - 1) * PLOT_GAP) / parts;
        for (let part = 0; part < parts; part++) {
          const offset = -size / 2 + partSize / 2 + part * (partSize + PLOT_GAP);
          const isTower = random() < profile.towerChance;
          const height = isTower
            ? profile.towerMin + random() * (profile.towerMax - profile.towerMin)
            : profile.minHeight + random() ** 1.6 * (profile.maxHeight - profile.minHeight);
          const footprint = isTower ? 0.62 : 0.88 + random() * 0.1;
          plots.push({
            x: alongX ? x + offset : x,
            z: alongX ? z : z + offset,
            width: (alongX ? partSize : size) * footprint,
            depth: (alongX ? size : partSize) * footprint,
            height,
          });
        }
      }
    }
    return plots;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.material.dispose();
      mesh.dispose();
    }
    this.meshes[0]?.geometry.dispose();
  }
}
