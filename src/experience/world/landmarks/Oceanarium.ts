import { Color, MeshStandardMaterial } from 'three';
import { LAYERS } from '../../config/layers';
import { disposeObject } from '../../utils/dispose';
import type { Atmosphere } from '../Atmosphere';
import { boxMappedMaterial, textureSet } from './boxMapped';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';
import { loadShell } from './shell';

/** Exported by scripts/blender/oceanarium.py (illustrative placeholder after the official renders). */
const MODEL_URL = 'models/oceanarium.glb';
/** Picking reaches the tallest lattice cube. */
const PICK_HEIGHT = 42;
const GLOW = '#ffa95e';
/** Night radiance of the canopy undersides (× their colour). */
const UNDERLIGHT = 1.6;

async function loadOceanariumShell(atmosphere: Atmosphere) {
  const [limestone, timber] = await Promise.all([textureSet('limestone'), textureSet('timber')]);
  const { night } = atmosphere;
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial =>
    atmosphere.patch(new MeshStandardMaterial({ vertexColors: true, ...params }));

  // Copper trellis: after dark, lit from below, so undersides glow warm and tops stay dark.
  const underLight = { value: 0 };
  night.uniform(underLight, 0, UNDERLIGHT);
  const copper = atmosphere.patch(
    new MeshStandardMaterial({
      color: '#c47b58',
      metalness: 0.35,
      roughness: 0.6,
      vertexColors: true,
    }),
    {
      key: 'oceanarium-underlight',
      uniforms: { uUnderLight: underLight, uUnderColor: { value: new Color('#ff9f63') } },
      vertexPars: 'varying vec3 vUnderNormal;',
      vertexMain: 'vUnderNormal = normalize(mat3(modelMatrix) * objectNormal);',
      fragmentPars:
        'uniform float uUnderLight;\nuniform vec3 uUnderColor;\nvarying vec3 vUnderNormal;',
      afterEmissive: `totalEmissiveRadiance += uUnderColor * diffuseColor.rgb * uUnderLight
        * (max(-normalize(vUnderNormal).y, 0.0) + 0.12);`,
    },
  );
  // The cubes' glazing: dark by day, glowing amber through the copper screens at night.
  const glass = night.material(
    material({ color: '#1e2a2e', roughness: 0.08, metalness: 0.7, emissive: GLOW }),
    0.12,
    0.65,
  );

  return loadShell(MODEL_URL, 'oceanarium', {
    stone: boxMappedMaterial(atmosphere, {
      maps: limestone,
      tile: 3.2,
      tint: '#e9e1d2',
      roughness: 1,
      normalStrength: 0.6,
      detail: 0.6,
      night: { walls: 0.75, falloff: 6, spacing: 9 },
    }),
    copper,
    glass,
    deck: boxMappedMaterial(atmosphere, {
      maps: timber,
      tile: 2.4,
      tint: '#9c7350',
      roughness: 0.9,
      normalStrength: 0.5,
      night: { tops: 0.18 },
    }),
    post: material({ color: '#6e4a36', metalness: 0.5, roughness: 0.5 }),
  });
}

/**
 * Oceanarium & Coral Farm after the official concept renders (illustrative): stone halls at the
 * water's edge under overlapping copper-lattice canopies, lattice-clad glass cubes rising through
 * them, and timber decks and a jetty over the sea.
 */
export const createOceanarium: LandmarkFactory = ({ atmosphere }) => {
  const id = 'oceanarium';
  const root = landmarkRoot(id);
  const pickProxy = createPickProxy(id, PICK_HEIGHT);
  root.add(pickProxy);
  let disposed = false;

  const loaded = loadOceanariumShell(atmosphere).then((shell) => {
    if (disposed) {
      disposeObject(shell);
      return;
    }
    shell.traverse((child) => {
      child.layers.enable(LAYERS.REFLECTED);
    });
    root.add(shell);
  });

  return {
    id,
    object: root,
    pickProxy,
    loaded,
    dispose: () => {
      disposed = true;
      disposeObject(root);
    },
  };
};
