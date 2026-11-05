import { DoubleSide, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import type { Disposable } from '../../../types';
import { disposeObject } from '../../../utils/dispose';
import { ellipticDisc, ellipticRing } from '../geometry';
import {
  createPickProxy,
  landmarkRoot,
  type LandmarkFactory,
  type LandmarkModel,
} from '../LandmarkModel';
import { createPitchTexture, createGrassNormal, PITCH } from './pitchTexture';
import { createInterior, entranceFacade } from './Interior';
import { loadStadiumShell } from './StadiumShell';
import { StadiumDetails } from './StadiumDetails';
import { STADIUM, STADIUM_POSITION } from '../../../config/stadium';

/** Outer ellipse half-axes (m): long axis north–south, like the pitch. */
const { rx: RX, rz: RZ } = STADIUM;
/** Rows and aisles painted on the distant bowl stand-in. */
const DISTANT_ROWS = 80;
const DISTANT_AISLES = 32;
/** Picking reaches the wind-tower crowns on the roof. */
const PICK_HEIGHT = 62;
/** Beyond this distance the detailed terraces resolve to less than a few pixels per row. */
const INTERIOR_DETAIL_DISTANCE = 450;
const COLORS = {
  backWall: '#8f8474',
  apron: '#2f5a2a',
} as const;

/**
 * Stadium after the official concept renders (illustrative): Blender-built exterior around the
 * explorable stepped bowl and its elevated east-side entry tunnel.
 */
export const createStadium: LandmarkFactory = ({ atmosphere }): LandmarkModel => {
  const id = 'stadium';
  const root = landmarkRoot(id);
  let detailPinned = false;
  let disposed = false;
  const disposables: Disposable[] = [];
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => atmosphere.patch(new MeshStandardMaterial(params));

  // The bowl's back wall, now enclosed by the hall: plain stone behind the upper tier.
  const facadeMaterial = material({ color: COLORS.backWall, roughness: 0.9, side: DoubleSide });
  const facade = new Mesh(entranceFacade(), facadeMaterial);

  const interior = createInterior(atmosphere);
  const details = new StadiumDetails(atmosphere);
  // Seen through the roof opening from afar: one sloped ring, striped like stepped rows of
  // seats with darker aisles, instead of the detailed interior (which fills in up close).
  const distantBowl = new Mesh(
    ellipticRing(RX, RZ, 0.5, 1, 4, 39),
    atmosphere.patch(
      new MeshStandardMaterial({
        color: '#4d7378',
        emissive: '#ffffff',
        roughness: 0.85,
        side: DoubleSide,
      }),
      {
        key: 'stadium-distant-bowl',
        // Floodlighting must stay visible from outside, including the painted rows and aisles.
        afterEmissive: 'totalEmissiveRadiance *= diffuseColor.rgb;',
        uniforms: {
          uBowlCentre: { value: new Vector3(STADIUM_POSITION.x, 0, STADIUM_POSITION.z) },
        },
        fragmentPars: 'uniform vec3 uBowlCentre;',
        afterDiffuse: `{
        vec2 q = (vAtmoWorldPos.xz - uBowlCentre.xz) / vec2(${RX.toFixed(1)}, ${RZ.toFixed(1)});
        float r = length(q);
        float rows = fract(r * ${DISTANT_ROWS.toFixed(1)});
        float aisle = step(0.94, fract(atan(q.y, q.x) * ${DISTANT_AISLES.toFixed(1)} / 6.2831853));
        float edge = fwidth(r * ${DISTANT_ROWS.toFixed(1)});
        float riser = mix(smoothstep(0.7, 0.85, rows), 0.5, clamp(edge * 2.0, 0.0, 1.0));
        diffuseColor.rgb *= mix(1.0, 0.62, riser) * mix(1.0, 0.55, aisle);
      }`,
      },
    ),
  );
  atmosphere.night.material(distantBowl.material, 0, 0.7);
  distantBowl.name = 'stadium-distant-bowl';
  distantBowl.castShadow = true;
  distantBowl.receiveShadow = true;
  const apron = new Mesh(
    ellipticDisc(RX * 0.5, RZ * 0.5, 2.9),
    material({ color: COLORS.apron, roughness: 0.95, side: DoubleSide }),
  );

  const pitchTexture = createPitchTexture();
  const grassNormal = createGrassNormal();
  disposables.push(pitchTexture, grassNormal);
  const pitch = new Mesh(
    new PlaneGeometry(PITCH.width, PITCH.length).rotateX(-Math.PI / 2),
    // At night the pitch is floodlit: its own markings glow (seen from the air, like the renders).
    atmosphere.night.material(
      material({
        map: pitchTexture,
        normalMap: grassNormal,
        emissiveMap: pitchTexture,
        emissive: '#ffffff',
        roughness: 0.9,
      }),
      0.12,
      0.55,
    ),
  );
  pitch.material.normalScale.set(0.2, 0.2);
  pitch.position.y = 3;
  // Texture is drawn length-wise along x; the pitch's long axis runs along z.
  pitchTexture.center.set(0.5, 0.5);
  pitchTexture.rotation = Math.PI / 2;

  for (const mesh of [facade, apron, pitch]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const pickProxy = createPickProxy(id, PICK_HEIGHT);
  // The exterior (hall, louvre roof, towers, terraces, stair) is a Blender model; it joins the
  // scene before the Experience compiles shaders and fits shadows (see `loaded`).
  const shellLoaded = loadStadiumShell(atmosphere).then((shell) => {
    if (disposed) {
      disposeObject(shell);
      return;
    }
    root.add(shell);
  });
  const loaded = Promise.all([shellLoaded, details.loaded]).then(() => undefined);
  root.add(facade, interior, details.object, distantBowl, apron, pitch, pickProxy);

  return {
    id,
    object: root,
    pickProxy,
    loaded,
    setDetailPinned(pinned) {
      detailPinned = pinned;
    },
    updateView(camera) {
      const detailed =
        detailPinned ||
        camera.position.distanceToSquared(root.position) < INTERIOR_DETAIL_DISTANCE ** 2;
      interior.visible = detailed;
      details.object.visible = detailed;
      distantBowl.visible = !detailed;
    },
    dispose() {
      disposed = true;
      root.remove(details.object);
      details.dispose();
      disposables.forEach((item) => {
        item.dispose();
      });
      disposeObject(root);
    },
  };
};
