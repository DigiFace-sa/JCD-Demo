import { Color, MeshStandardMaterial } from 'three';
import { disposeObject } from '../../utils/dispose';
import type { Atmosphere } from '../Atmosphere';
import { boxMappedMaterial, textureSet } from './boxMapped';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';
import { loadShell } from './shell';

/** Exported by scripts/blender/museum.py (illustrative placeholder after the official render). */
const MODEL_URL = 'models/museum.glb';
const ROTATION = 0.08;
/** Picking reaches the taller stack's crown. */
const PICK_HEIGHT = 78;
const GLOW = '#ffb36b';
/** Night uplight on the metal shells: warm, strongest at the base, fading over this height (m). */
const SHELL_UPLIGHT = { color: '#ffc58a', night: 0.12, falloff: 7 } as const;

async function loadMuseumShell(atmosphere: Atmosphere) {
  const [plaster, paving] = await Promise.all([textureSet('plaster'), textureSet('paving')]);
  const { night } = atmosphere;
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial =>
    atmosphere.patch(new MeshStandardMaterial({ vertexColors: true, ...params }));

  // Faceted, mirror-bright cladding: its flat-shaded facets catch the sky and sun like foil.
  // After dark, ground uplights graze the shells (a mirror alone would just reflect night sky).
  const uplight = { value: 0 };
  night.uniform(uplight, 0, SHELL_UPLIGHT.night);
  const shell = atmosphere.patch(
    new MeshStandardMaterial({
      color: '#e4e2dd',
      metalness: 0.8,
      roughness: 0.42,
      vertexColors: true,
    }),
    {
      key: 'museum-shell-uplight',
      uniforms: {
        uShellUplight: uplight,
        uShellUplightColor: { value: new Color(SHELL_UPLIGHT.color) },
      },
      fragmentPars: 'uniform float uShellUplight;\nuniform vec3 uShellUplightColor;',
      afterEmissive: `totalEmissiveRadiance += uShellUplightColor * uShellUplight
        * exp(-max(vAtmoWorldPos.y - 2.0, 0.0) / ${SHELL_UPLIGHT.falloff.toFixed(1)});`,
    },
  );

  const glass = night.material(
    material({
      color: '#1d2a30',
      roughness: 0.08,
      metalness: 0.7,
      emissive: GLOW,
    }),
    0.2,
    1.3,
  );
  // The stacks' perforated crowns glow like lanterns at night.
  const crown = night.material(
    material({ color: '#efeee8', roughness: 0.55, emissive: '#ffe2bd' }),
    0,
    0.7,
  );

  return loadShell(MODEL_URL, 'museum', {
    shell,
    steel: material({ color: '#2b2d30', roughness: 0.45, metalness: 0.8 }),
    glass,
    base: boxMappedMaterial(atmosphere, {
      maps: plaster,
      tile: 5,
      tint: '#7f6453',
      roughness: 1,
      normalStrength: 0.5,
      detail: 0.6,
      night: { walls: 0.5, falloff: 6, spacing: 6 },
    }),
    stack: boxMappedMaterial(atmosphere, {
      maps: plaster,
      tile: 5,
      tint: '#cdb79a',
      roughness: 1,
      normalStrength: 0.5,
      detail: 0.5,
      night: { walls: 0.6, falloff: 22 },
    }),
    crown,
    deck: boxMappedMaterial(atmosphere, {
      maps: paving,
      tile: 4,
      tint: '#b9ab98',
      roughness: 1,
      normalStrength: 0.5,
      night: { tops: 0.15 },
    }),
    bronze: material({ color: '#a77549', roughness: 0.38, metalness: 0.85 }),
  });
}

/**
 * Museum after the official concept render (illustrative): faceted metal petal shells over the
 * converted plant, glazed slots between them, two crowned stacks and an elevated walkway.
 */
export const createMuseum: LandmarkFactory = ({ atmosphere }) => {
  const id = 'museum';
  const root = landmarkRoot(id);
  const pickProxy = createPickProxy(id, PICK_HEIGHT);
  root.add(pickProxy);
  root.rotation.y = ROTATION;
  let disposed = false;

  const loaded = loadMuseumShell(atmosphere).then((shell) => {
    if (disposed) {
      disposeObject(shell);
      return;
    }
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
