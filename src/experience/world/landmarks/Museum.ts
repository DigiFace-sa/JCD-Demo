import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { disposeObject } from '../../utils/dispose';
import { facadeExtension } from '../Facade';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';

const COLORS = {
  brick: '#9a5f45',
  roof: '#5d5853',
  northLight: '#ffcf8f',
  steel: '#8d9196',
  brass: '#b58a55',
} as const;
const HALL = { length: 150, depth: 60, height: 18 } as const;
const SAWTOOTH = { count: 10, rise: 7 } as const;
const CHIMNEY = { radiusTop: 3.2, radiusBottom: 4.6, height: 78, x: 62, z: -42 } as const;
const TANK = { radius: 17, height: 24, x: -70, z: -50 } as const;

/** One sawtooth roof bay: a triangular prism spanning the hall depth (glazed face to the north). */
function sawtoothBay(width: number, rise: number, depth: number): BufferGeometry {
  const h = depth / 2;
  // Triangle in the x/y plane, extruded along z: steep glazed face at x=0, slope down to x=width.
  const v = [
    [0, 0, -h],
    [0, rise, -h],
    [width, 0, -h],
    [0, 0, h],
    [width, 0, h],
    [0, rise, h],
    [0, 0, -h],
    [0, 0, h],
    [0, rise, h],
    [0, 0, -h],
    [0, rise, h],
    [0, rise, -h],
    [0, rise, -h],
    [0, rise, h],
    [width, 0, h],
    [0, rise, -h],
    [width, 0, h],
    [width, 0, -h],
  ].flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Museum (stylised industrial heritage): brick hall with a sawtooth north-light roof, a tall
 * chimney stack with a brass crown and a steel tank. [TBC: details and design]
 */
export const createMuseum: LandmarkFactory = ({ atmosphere }) => {
  const id = 'museum';
  const root = landmarkRoot(id);
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => atmosphere.patch(new MeshStandardMaterial(params));

  const hall = new Mesh(
    new BoxGeometry(HALL.length, HALL.height, HALL.depth).translate(0, HALL.height / 2, 0),
    atmosphere.patch(
      new MeshStandardMaterial({ color: COLORS.brick, roughness: 0.88 }),
      facadeExtension(),
    ),
  );

  const bayWidth = HALL.length / SAWTOOTH.count;
  const bays = mergeGeometries(
    Array.from({ length: SAWTOOTH.count }, (_, i) =>
      sawtoothBay(bayWidth, SAWTOOTH.rise, HALL.depth).translate(
        -HALL.length / 2 + i * bayWidth,
        HALL.height,
        0,
      ),
    ),
  );
  const roof = new Mesh(
    bays,
    material({
      color: COLORS.roof,
      roughness: 0.55,
      metalness: 0.4,
      emissive: COLORS.northLight,
      emissiveIntensity: 0.12,
    }),
  );

  const chimney = new Mesh(
    new CylinderGeometry(CHIMNEY.radiusTop, CHIMNEY.radiusBottom, CHIMNEY.height, 28).translate(
      0,
      CHIMNEY.height / 2,
      0,
    ),
    material({ color: COLORS.brick, roughness: 0.9 }),
  );
  chimney.position.set(CHIMNEY.x, 0, CHIMNEY.z);
  const crown = new Mesh(
    new CylinderGeometry(CHIMNEY.radiusTop + 0.8, CHIMNEY.radiusTop + 0.6, 3, 28),
    material({ color: COLORS.brass, roughness: 0.35, metalness: 0.9 }),
  );
  crown.position.set(CHIMNEY.x, CHIMNEY.height - 1.5, CHIMNEY.z);

  const steel = material({ color: COLORS.steel, roughness: 0.45, metalness: 0.75 });
  const tank = new Mesh(
    new CylinderGeometry(TANK.radius, TANK.radius, TANK.height, 48).translate(
      0,
      TANK.height / 2,
      0,
    ),
    steel,
  );
  tank.position.set(TANK.x, 0, TANK.z);
  const dome = new Mesh(
    new SphereGeometry(TANK.radius, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.3, 1),
    steel,
  );
  dome.position.set(TANK.x, TANK.height, TANK.z);

  root.rotation.y = 0.08;
  const pickProxy = createPickProxy(id, CHIMNEY.height);
  root.add(hall, roof, chimney, crown, tank, dome, pickProxy);
  root.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
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
