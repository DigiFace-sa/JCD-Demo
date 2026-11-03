import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { LAYERS } from '../../config/layers';
import { disposeObject } from '../../utils/dispose';
import { ellipticBand, ellipticDisc } from './geometry';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';

const COLORS = {
  podium: '#e6dccd',
  sail: '#f6f2ea',
  glass: '#1d2a33',
  glow: '#ffb373',
} as const;
const PODIUM = { rx: 100, rz: 72, height: 5 } as const;
const HALL = { rx: 66, rz: 46, height: 13 } as const;
const SAIL_SEGMENTS = { along: 48, across: 16 } as const;
const RIM_RADIUS = 0.7;

interface SailSpec {
  /** Length (m), max half-width (m), rise from base to tip (m), cross-arch height (m). */
  readonly length: number;
  readonly halfWidth: number;
  readonly rise: number;
  readonly arch: number;
  readonly base: number;
  readonly offsetX: number;
  readonly offsetZ: number;
  readonly turn: number;
}

/** Three sails, rising toward the sea (−x), overlapping like layered canopies. */
const SAILS: readonly SailSpec[] = [
  {
    length: 140,
    halfWidth: 26,
    rise: 62,
    arch: 10,
    base: 12,
    offsetX: -4,
    offsetZ: -24,
    turn: 0.2,
  },
  { length: 118, halfWidth: 22, rise: 48, arch: 9, base: 11, offsetX: 8, offsetZ: 8, turn: -0.02 },
  { length: 92, halfWidth: 18, rise: 34, arch: 7, base: 10, offsetX: 18, offsetZ: 38, turn: -0.26 },
];

/** Point on a sail: u across (0–1), v along (0 = seaward tip, 1 = landward end). */
function sailPoint(spec: SailSpec, u: number, v: number, target: Vector3): Vector3 {
  const width = spec.halfWidth * Math.sin(Math.PI * v) ** 0.65;
  const across = 2 * u - 1;
  const y =
    spec.base +
    spec.rise * (1 - v) ** 1.6 +
    spec.arch * (1 - across * across) * Math.sin(Math.PI * v);
  return target.set(spec.length * (v - 0.5), y, width * across);
}

function sailGeometry(spec: SailSpec): BufferGeometry {
  const { along, across } = SAIL_SEGMENTS;
  const positions = new Float32Array((along + 1) * (across + 1) * 3);
  const point = new Vector3();
  for (let i = 0; i <= along; i++) {
    for (let j = 0; j <= across; j++) {
      sailPoint(spec, j / across, i / along, point).toArray(positions, (i * (across + 1) + j) * 3);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j;
      const b = a + 1;
      const c = a + across + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A thin tube along the sail's outline, so the edge catches the light. */
function rimGeometry(spec: SailSpec): TubeGeometry {
  const steps = 40;
  const points: Vector3[] = [];
  for (let i = 0; i <= steps; i++) points.push(sailPoint(spec, 0, i / steps, new Vector3()));
  for (let i = steps; i >= 0; i--) points.push(sailPoint(spec, 1, i / steps, new Vector3()));
  return new TubeGeometry(new CatmullRomCurve3(points, true), steps * 4, RIM_RADIUS, 6, true);
}

/**
 * Opera House (stylised): three thin curved sails rising toward the sea, cantilevering over a
 * warmly lit glass hall on a stone podium at the tip of the peninsula. [TBC: official design]
 */
export const createOperaHouse: LandmarkFactory = ({ atmosphere }) => {
  const id = 'opera-house';
  const root = landmarkRoot(id);
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => atmosphere.patch(new MeshStandardMaterial(params));

  const stone = material({ color: COLORS.podium, roughness: 0.75, side: DoubleSide });
  const podium = new Mesh(ellipticBand(PODIUM.rx, PODIUM.rz, 0, PODIUM.height), stone);
  const podiumTop = new Mesh(ellipticDisc(PODIUM.rx, PODIUM.rz, PODIUM.height), stone);
  const glassMaterial = material({
    color: COLORS.glass,
    metalness: 0.7,
    roughness: 0.1,
    emissive: COLORS.glow,
    emissiveIntensity: 0.9,
    side: DoubleSide,
  });
  const hall = new Mesh(
    ellipticBand(HALL.rx, HALL.rz, PODIUM.height, PODIUM.height + HALL.height),
    glassMaterial,
  );
  const hallRoof = new Mesh(ellipticDisc(HALL.rx, HALL.rz, PODIUM.height + HALL.height), stone);

  const sailMaterial = material({
    color: COLORS.sail,
    roughness: 0.3,
    metalness: 0.05,
    side: DoubleSide,
  });
  const sails = SAILS.flatMap((spec) => {
    const sail = new Mesh(sailGeometry(spec), sailMaterial);
    const rim = new Mesh(rimGeometry(spec), sailMaterial);
    for (const mesh of [sail, rim]) {
      mesh.position.set(spec.offsetX, 0, spec.offsetZ);
      mesh.rotation.y = spec.turn;
    }
    return [sail, rim];
  });

  // Seaward tips point west, slightly toward the setting sun.
  root.rotation.y = -0.12;
  const pickProxy = createPickProxy(id, 75);
  root.add(podium, podiumTop, hall, hallRoof, ...sails, pickProxy);
  root.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
    child.layers.enable(LAYERS.REFLECTED);
  });

  return {
    id,
    object: root,
    pickProxy,
    dispose: () => {
      disposeObject(root);
    },
  };
};
