import { Color, DoubleSide, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import { LANDMARKS } from '../../../../data/landmarks';
import type { Disposable } from '../../../types';
import { disposeObject } from '../../../utils/dispose';
import { ellipticBand, ellipticDisc, ellipticRing } from '../geometry';
import { latticeExtension } from '../lattice';
import {
  createPickProxy,
  landmarkRoot,
  type LandmarkFactory,
  type LandmarkModel,
} from '../LandmarkModel';
import { createPitchTexture, PITCH } from './pitchTexture';

/** Outer ellipse half-axes (m): long axis north–south, like the pitch. */
const RX = 118;
const RZ = 140;
const FACADE_HEIGHT = 40;
const ROOF = { inner: 0.6, outer: 1.08, yInner: 39, yOuter: 47 } as const;
const BOWL = { inner: 0.5, outer: 0.93, yInner: 3, yOuter: 35 } as const;
const COLORS = {
  plinth: '#d9cdb9',
  brass: '#b58a55',
  interior: '#2a1d14',
  glow: '#ffae62',
  roof: '#f4efe7',
  bowl: '#3a4556',
  apron: '#2f5a2a',
  floodlight: '#fff1d2',
} as const;

/**
 * Stadium exterior (Phase 4): brass roshan-lattice facade over a glowing concourse, white
 * roof ring with floodlights, seating bowl and pitch visible through the opening.
 * Phase 5 adds the explorable interior.
 */
export const createStadium: LandmarkFactory = ({ atmosphere }): LandmarkModel => {
  const id = 'stadium';
  const root = landmarkRoot(id);
  const { position } = LANDMARKS[id];
  const disposables: Disposable[] = [];
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => atmosphere.patch(new MeshStandardMaterial(params));

  const plinth = new Mesh(
    ellipticBand(RX * 1.06, RZ * 1.06, 0, 4, 1.02, 1),
    material({ color: COLORS.plinth, roughness: 0.8 }),
  );
  const plinthTop = new Mesh(
    ellipticDisc(RX * 1.06, RZ * 1.06, 4),
    material({ color: COLORS.plinth, roughness: 0.8, side: DoubleSide }),
  );

  const facadeMaterial = atmosphere.patch(
    new MeshStandardMaterial({
      color: COLORS.brass,
      roughness: 0.38,
      metalness: 0.85,
      side: DoubleSide,
    }),
    latticeExtension({
      center: new Vector3(position.x, 0, position.z),
      cell: 4.2,
      width: 0.16,
      glow: new Color(COLORS.glow).multiplyScalar(0.9),
      interior: new Color(COLORS.interior),
    }),
  );
  // Slight outward lean toward the top, like a woven basket.
  const facade = new Mesh(ellipticBand(RX, RZ, 4, FACADE_HEIGHT, 0.97, 1.03), facadeMaterial);

  const roofMaterial = material({ color: COLORS.roof, roughness: 0.45, side: DoubleSide });
  const roof = new Mesh(
    ellipticRing(RX, RZ, ROOF.inner, ROOF.outer, ROOF.yInner, ROOF.yOuter),
    roofMaterial,
  );
  const fascia = new Mesh(
    ellipticBand(RX * ROOF.outer, RZ * ROOF.outer, ROOF.yOuter - 3, ROOF.yOuter),
    roofMaterial,
  );
  const floodlights = new Mesh(
    ellipticBand(RX * ROOF.inner, RZ * ROOF.inner, ROOF.yInner - 1.2, ROOF.yInner),
    material({
      color: '#000000',
      emissive: COLORS.floodlight,
      emissiveIntensity: 3,
      side: DoubleSide,
    }),
  );

  const bowl = new Mesh(
    ellipticRing(RX, RZ, BOWL.inner, BOWL.outer, BOWL.yInner, BOWL.yOuter),
    material({ color: COLORS.bowl, roughness: 0.85, side: DoubleSide }),
  );
  const apron = new Mesh(
    ellipticDisc(RX * BOWL.inner, RZ * BOWL.inner, 2.9),
    material({ color: COLORS.apron, roughness: 0.95, side: DoubleSide }),
  );

  const pitchTexture = createPitchTexture();
  disposables.push(pitchTexture);
  const pitch = new Mesh(
    new PlaneGeometry(PITCH.width, PITCH.length).rotateX(-Math.PI / 2),
    material({ map: pitchTexture, roughness: 0.9 }),
  );
  pitch.position.y = 3;
  // Texture is drawn length-wise along x; the pitch's long axis runs along z.
  pitchTexture.center.set(0.5, 0.5);
  pitchTexture.rotation = Math.PI / 2;

  for (const mesh of [plinth, plinthTop, facade, roof, fascia, bowl, apron, pitch]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  floodlights.castShadow = false;

  const pickProxy = createPickProxy(id, ROOF.yOuter);
  root.add(plinth, plinthTop, facade, roof, fascia, floodlights, bowl, apron, pitch, pickProxy);

  return {
    id,
    object: root,
    pickProxy,
    dispose() {
      disposables.forEach((item) => {
        item.dispose();
      });
      disposeObject(root);
    },
  };
};
