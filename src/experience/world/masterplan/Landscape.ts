import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ATTRACTIONS } from '../../../data/attractions';
import { LANDMARK_IDS, LANDMARKS } from '../../../data/landmarks';
import { MASTERPLAN } from '../../config/masterplan';
import { COAST } from '../../config/scene';
import type { Disposable } from '../../types';
import { createRandom } from '../../utils/random';
import type { Atmosphere } from '../Atmosphere';
import { beachWeight, landDistance, parkWeight } from './MasterplanShape';

const PALM = { height: 11, fronds: 8, frondLength: 5.5, frondWidth: 1.3, segments: 5 } as const;
const COLORS = {
  trunk: '#6e5a46',
  frond: '#3f5c2c',
  canopy: '#4d6b39',
  treeTrunk: '#5b4a3a',
} as const;
/** Spacing (m) of palms along the central boulevard. */
const BOULEVARD_SPACING = 24;
const BOULEVARD = { x: 640, offset: 14, zStart: -1050, zEnd: 700 } as const;

function paint(
  geometry: BufferGeometry,
  hex: string,
  jitter = 0,
  random?: () => number,
): BufferGeometry {
  const base = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  const c = new Color();
  for (let i = 0; i < count; i++) {
    const shade = 1 + (random ? (random() * 2 - 1) * jitter : 0);
    c.copy(base).multiplyScalar(shade);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

/** Low-poly date palm: gently curved trunk and drooping fronds (one merged geometry). */
function palmGeometry(random: () => number): BufferGeometry {
  const trunk = new CylinderGeometry(0.22, 0.34, PALM.height, 6, 4)
    .translate(0, PALM.height / 2, 0)
    .toNonIndexed();
  const trunkPositions = trunk.getAttribute('position');
  for (let i = 0; i < trunkPositions.count; i++) {
    const y = trunkPositions.getY(i);
    trunkPositions.setX(i, trunkPositions.getX(i) + 0.01 * y * y);
  }
  const parts = [paint(trunk, COLORS.trunk)];

  const crownX = 0.01 * PALM.height * PALM.height;
  for (let f = 0; f < PALM.fronds; f++) {
    const angle = (f / PALM.fronds) * Math.PI * 2 + random() * 0.4;
    const lift = 0.35 + random() * 0.35;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const vertices: number[] = [];
    const point = (t: number, side: number): [number, number, number] => {
      const reach = t * PALM.frondLength;
      const y = PALM.height + Math.sin(lift) * reach - 2.6 * t * t;
      const half = (PALM.frondWidth / 2) * (1 - t * 0.85) * side;
      return [crownX + dirX * reach - dirZ * half, y, dirZ * reach + dirX * half];
    };
    for (let s = 0; s < PALM.segments; s++) {
      const t0 = s / PALM.segments;
      const t1 = (s + 1) / PALM.segments;
      vertices.push(...point(t0, -1), ...point(t1, -1), ...point(t0, 1));
      vertices.push(...point(t0, 1), ...point(t1, -1), ...point(t1, 1));
    }
    const frond = new BufferGeometry();
    frond.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    frond.computeVertexNormals();
    parts.push(paint(frond, COLORS.frond));
  }
  return mergeGeometries(parts);
}

function treeGeometry(random: () => number): BufferGeometry {
  const canopy = new IcosahedronGeometry(1, 1).scale(5.2, 5.6, 5.2).translate(0, 9, 0);
  const trunk = new CylinderGeometry(0.3, 0.45, 6, 5).translate(0, 3, 0).toNonIndexed();
  return mergeGeometries([
    paint(canopy, COLORS.canopy, 0.18, random),
    paint(trunk, COLORS.treeTrunk),
  ]);
}

function isClearOfStructures(x: number, z: number, margin: number): boolean {
  for (const id of LANDMARK_IDS) {
    const { position, footprint } = LANDMARKS[id];
    if (Math.hypot(x - position.x, z - position.z) < footprint + margin) return false;
  }
  for (const attraction of Object.values(ATTRACTIONS)) {
    const { position } = attraction;
    if (Math.hypot(x - Math.max(position.x, MASTERPLAN.shoreX), z - position.z) < 60 + margin)
      return false;
  }
  return true;
}

/** Palms along promenades, beach and boulevard; trees in the gardens. Two instanced draws. */
export class Landscape implements Disposable {
  readonly object = new Group();
  private readonly meshes: InstancedMesh<BufferGeometry, MeshStandardMaterial>[] = [];

  constructor(atmosphere: Atmosphere) {
    const random = createRandom(MASTERPLAN.landscape.seed + 1);
    const palms = this.palmPositions(random);
    const trees = this.treePositions(random);
    this.addInstances('palms', palmGeometry(random), palms, atmosphere, random, true);
    this.addInstances('trees', treeGeometry(random), trees, atmosphere, random, false);
  }

  private palmPositions(random: () => number): Vector3[] {
    const { exclusion, ground, landscape } = MASTERPLAN;
    const positions: Vector3[] = [];
    const step = landscape.palmSpacing / 2;
    for (let z: number = exclusion.minZ; z < exclusion.maxZ; z += step) {
      for (let x: number = ground.minX; x < exclusion.maxX; x += step) {
        const distance = landDistance(x, z);
        const onBeach = beachWeight(z) > 0.5;
        const inRow = onBeach ? distance > 88 && distance < 100 : distance > 12 && distance < 22;
        if (!inRow || random() > 0.55 || !isClearOfStructures(x, z, 12)) continue;
        positions.push(new Vector3(x + random() * 3, COAST.landHeight, z + random() * 3));
      }
    }
    for (let z: number = BOULEVARD.zStart; z < BOULEVARD.zEnd; z += BOULEVARD_SPACING) {
      for (const side of [-1, 1]) {
        const x = BOULEVARD.x + side * BOULEVARD.offset;
        if (isClearOfStructures(x, z, 10)) positions.push(new Vector3(x, COAST.landHeight, z));
      }
    }
    return positions;
  }

  private treePositions(random: () => number): Vector3[] {
    const positions: Vector3[] = [];
    for (const park of MASTERPLAN.parks) {
      const count = Math.round(MASTERPLAN.landscape.treesPerPark * (park.radius / 300) ** 2);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * park.radius * 1.2;
        const x = park.x + Math.cos(angle) * r;
        const z = park.z + Math.sin(angle) * r;
        if (parkWeight(x, z) < 0.9) continue;
        const inPlaza = MASTERPLAN.plazas.some(
          (plaza) => Math.hypot(x - plaza.x, z - plaza.z) < plaza.radius + 8,
        );
        if (inPlaza || landDistance(x, z) < 25 || !isClearOfStructures(x, z, 6)) continue;
        positions.push(new Vector3(x, COAST.landHeight, z));
      }
    }
    return positions;
  }

  private addInstances(
    name: string,
    geometry: BufferGeometry,
    positions: readonly Vector3[],
    atmosphere: Atmosphere,
    random: () => number,
    doubleSided: boolean,
  ): void {
    const material = atmosphere.patch(
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0,
        side: doubleSided ? DoubleSide : FrontSide,
      }),
    );
    const mesh = new InstancedMesh(geometry, material, positions.length);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const scale = new Vector3();
    positions.forEach((position, index) => {
      rotation.setFromAxisAngle(up, random() * Math.PI * 2);
      const size = 0.85 + random() * 0.4;
      mesh.setMatrixAt(index, matrix.compose(position, rotation, scale.setScalar(size)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.meshes.push(mesh);
    this.object.add(mesh);
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
  }
}
