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
import { createInterior, entranceFacade } from './Interior';
import { STADIUM } from '../../../config/stadium';

/** Outer ellipse half-axes (m): long axis north–south, like the pitch. */
const { rx: RX, rz: RZ, roof: ROOF } = STADIUM;
/** Beyond this distance the detailed terraces resolve to less than a few pixels per row. */
const INTERIOR_DETAIL_DISTANCE = 1100;
const COLORS = {
  plinth: '#d9cdb9',
  brass: '#b58a55',
  interior: '#2a1d14',
  glow: '#ffae62',
  roof: '#f4efe7',
  apron: '#2f5a2a',
  floodlight: '#fff1d2',
} as const;

/**
 * Original roshan exterior surrounding an explorable stepped bowl and east-side entry tunnel.
 */
export const createStadium: LandmarkFactory = ({ atmosphere }): LandmarkModel => {
  const id = 'stadium';
  const root = landmarkRoot(id);
  let detailPinned = false;
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
    // The podium is an annulus: a full disc here concealed the lower pitch completely.
    ellipticRing(RX, RZ, 0.5, 1.06, 4, 4),
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
  const facade = new Mesh(entranceFacade(), facadeMaterial);

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

  const interior = createInterior(atmosphere);
  const distantBowl = new Mesh(
    ellipticRing(RX, RZ, 0.5, 1, 4, 39),
    material({ color: '#426b70', roughness: 0.85, side: DoubleSide }),
  );
  distantBowl.name = 'stadium-distant-bowl';
  distantBowl.castShadow = true;
  distantBowl.receiveShadow = true;
  const apron = new Mesh(
    ellipticDisc(RX * 0.5, RZ * 0.5, 2.9),
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

  for (const mesh of [plinth, plinthTop, facade, roof, fascia, apron, pitch]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  floodlights.castShadow = false;

  const pickProxy = createPickProxy(id, ROOF.yOuter);
  root.add(
    plinth,
    plinthTop,
    facade,
    roof,
    fascia,
    floodlights,
    interior,
    distantBowl,
    apron,
    pitch,
    pickProxy,
  );

  return {
    id,
    object: root,
    pickProxy,
    setDetailPinned(pinned) {
      detailPinned = pinned;
    },
    updateView(camera) {
      const detailed =
        detailPinned ||
        camera.position.distanceToSquared(root.position) < INTERIOR_DETAIL_DISTANCE ** 2;
      interior.visible = detailed;
      distantBowl.visible = !detailed;
    },
    dispose() {
      disposables.forEach((item) => {
        item.dispose();
      });
      disposeObject(root);
    },
  };
};
