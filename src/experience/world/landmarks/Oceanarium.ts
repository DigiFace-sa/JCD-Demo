import { Color, DoubleSide, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { LANDMARKS } from '../../../data/landmarks';
import { LAYERS } from '../../config/layers';
import { COAST } from '../../config/scene';
import { disposeObject } from '../../utils/dispose';
import { ellipticBand, ellipticDisc } from './geometry';
import { latticeExtension } from './lattice';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';

const COLORS = {
  frame: '#f2f4f1',
  interior: '#0d2a30',
  glow: '#2fd0cb',
  podium: '#ddd3c4',
} as const;

/** A cluster of lattice domes of different sizes (local metres, relative to the site). */
const DOMES = [
  { x: 0, z: 0, radius: 40, squash: 0.62 },
  { x: -46, z: 30, radius: 27, squash: 0.66 },
  { x: 34, z: 40, radius: 21, squash: 0.7 },
] as const;
const PODIUM = { rx: 92, rz: 74, height: 2.5 } as const;
const LATTICE = { cell: 3.4, width: 0.2, glow: 0.85 } as const;

/**
 * Oceanarium & Coral Farm (stylised): a cluster of white lattice domes glowing aqua from
 * within, like a living reef seen through a shell. [TBC: official design]
 */
export const createOceanarium: LandmarkFactory = ({ atmosphere }) => {
  const id = 'oceanarium';
  const root = landmarkRoot(id);
  const { position } = LANDMARKS[id];

  const podiumMaterial = atmosphere.patch(
    new MeshStandardMaterial({ color: COLORS.podium, roughness: 0.8, side: DoubleSide }),
  );
  root.add(
    new Mesh(ellipticBand(PODIUM.rx, PODIUM.rz, 0, PODIUM.height), podiumMaterial),
    new Mesh(ellipticDisc(PODIUM.rx, PODIUM.rz, PODIUM.height), podiumMaterial),
  );

  for (const dome of DOMES) {
    // Each dome gets its own lattice centre so the pattern wraps it correctly.
    const center = new Vector3(
      position.x + dome.x,
      COAST.landHeight + PODIUM.height,
      position.z + dome.z,
    );
    const material = atmosphere.patch(
      new MeshStandardMaterial({ color: COLORS.frame, roughness: 0.35, metalness: 0.1 }),
      latticeExtension({
        center,
        cell: LATTICE.cell,
        width: LATTICE.width,
        glow: new Color(COLORS.glow).multiplyScalar(LATTICE.glow),
        interior: new Color(COLORS.interior),
      }),
    );
    const mesh = new Mesh(
      new SphereGeometry(dome.radius, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2).scale(
        1,
        dome.squash,
        1,
      ),
      material,
    );
    mesh.position.set(dome.x, PODIUM.height, dome.z);
    root.add(mesh);
  }

  root.rotation.y = 0.2;
  const pickProxy = createPickProxy(id, 30);
  root.add(pickProxy);
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
