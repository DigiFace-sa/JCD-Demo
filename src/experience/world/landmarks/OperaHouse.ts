import { Color, MeshStandardMaterial, Vector3 } from 'three';
import { LAYERS } from '../../config/layers';
import { disposeObject } from '../../utils/dispose';
import type { Atmosphere } from '../Atmosphere';
import { boxMappedMaterial, textureSet } from './boxMapped';
import { latticeExtension } from './lattice';
import { createPickProxy, landmarkRoot, type LandmarkFactory } from './LandmarkModel';
import { loadShell } from './shell';

/** Exported by scripts/blender/opera.py (illustrative placeholder after the official render). */
const MODEL_URL = 'models/opera-house.glb';
/** Aligns the model's long axis with the peninsula (main hall at the seaward tip). */
const ROTATION = -0.22;
const PICK_HEIGHT = 50;
const GLOW = { color: '#ffb36b', day: 0.12, night: 1.6 } as const;

async function loadOperaShell(atmosphere: Atmosphere) {
  const [plaster, limestone, timber] = await Promise.all([
    textureSet('plaster'),
    textureSet('limestone'),
    textureSet('timber'),
  ]);
  const { night } = atmosphere;

  // Gold lattice bays: brass members over the lit foyers, brightening after dark.
  const glow = new Color(GLOW.color);
  const latticeGlow = new Color();
  const lattice = atmosphere.patch(
    new MeshStandardMaterial({
      color: '#b8955f',
      metalness: 0.7,
      roughness: 0.38,
      vertexColors: true,
    }),
    latticeExtension({
      center: new Vector3(),
      cell: 1.2,
      width: 0.22,
      glow: latticeGlow,
      interior: new Color('#3a2a1c'),
      mapping: 'panel',
    }),
  );
  night.custom((lights) => {
    latticeGlow.copy(glow).multiplyScalar(GLOW.day + (GLOW.night - GLOW.day) * lights);
  });

  const glass = night.material(
    atmosphere.patch(
      new MeshStandardMaterial({
        color: '#1a2a30',
        roughness: 0.1,
        metalness: 0.7,
        vertexColors: true,
        emissive: GLOW.color,
      }),
    ),
    0.04,
    0.8,
  );
  // Entrance and lobby glazing: clearer glass onto the lit foyer, glowing warmly after dark.
  const foyer = night.material(
    atmosphere.patch(
      new MeshStandardMaterial({
        color: '#5d6a6c',
        roughness: 0.08,
        metalness: 0.6,
        vertexColors: true,
        emissive: GLOW.color,
      }),
    ),
    0.45,
    1.4,
  );
  const soffit = boxMappedMaterial(atmosphere, {
    maps: timber,
    tile: 2.4,
    tint: '#d9bd91',
    roughness: 0.85,
    normalStrength: 0.5,
    night: { walls: 0.5 },
  });

  return loadShell(MODEL_URL, 'opera', {
    // Smooth pale stone: the flutes and their baked occlusion carry the rhythm, not the joints.
    limestone: boxMappedMaterial(atmosphere, {
      maps: plaster,
      tile: 6,
      tint: '#e4d3b5',
      roughness: 1,
      normalStrength: 0.4,
      detail: 0.45,
      night: { walls: 0.9, tops: 0.03, falloff: 11, spacing: 7.6 },
    }),
    roof: boxMappedMaterial(atmosphere, {
      maps: limestone,
      tile: 4,
      tint: '#a59886',
      roughness: 1,
      normalStrength: 0.5,
    }),
    lattice,
    glass,
    foyer,
    timber: soffit,
  });
}

/**
 * Opera House after the official concept render (illustrative): two fluted stone halls with
 * scalloped crowns, tall window slots and gold lattice bays, a wave-arched glazed entrance and a
 * glazed lobby under a timber canopy, at the tip of the peninsula.
 */
export const createOperaHouse: LandmarkFactory = ({ atmosphere }) => {
  const id = 'opera-house';
  const root = landmarkRoot(id);
  const pickProxy = createPickProxy(id, PICK_HEIGHT);
  root.add(pickProxy);
  root.rotation.y = ROTATION;
  let disposed = false;

  const loaded = loadOperaShell(atmosphere).then((shell) => {
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
