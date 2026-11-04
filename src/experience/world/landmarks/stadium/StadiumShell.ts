import { MeshStandardMaterial, type Group, type Material } from 'three';
import type { Atmosphere } from '../../Atmosphere';
import { boxMappedMaterial, textureSet } from '../boxMapped';
import { loadShell } from '../shell';

/** Exported by scripts/blender/stadium.py (illustrative placeholder after the official renders). */
const MODEL_URL = 'models/stadium.glb';

/**
 * The exterior hall, louvre roof, wind towers, terraces and grand stair. Geometry and baked
 * occlusion come from Blender; materials are assigned here by the model's material names, so
 * look-dev (tints, tiling, gloss) is tuned in code without re-exporting.
 */
export async function loadStadiumShell(atmosphere: Atmosphere): Promise<Group> {
  const [limestone, timber, paving] = await Promise.all([
    textureSet('limestone'),
    textureSet('timber'),
    textureSet('paving'),
  ]);

  const materials: Record<string, Material> = {
    limestone: boxMappedMaterial(atmosphere, {
      maps: limestone,
      tile: 3.2,
      tint: '#d8c8ad',
      roughness: 1,
      normalStrength: 0.8,
      night: { walls: 1.2, tops: 0.1 },
    }),
    timber: boxMappedMaterial(atmosphere, {
      maps: timber,
      tile: 2.4,
      tint: '#b07a52',
      roughness: 0.9,
      normalStrength: 0.5,
      night: { walls: 0.5, tops: 0.26 },
    }),
    'timber-dark': boxMappedMaterial(atmosphere, {
      maps: timber,
      tile: 2.4,
      tint: '#5e3f2b',
      roughness: 0.85,
      normalStrength: 0.5,
      night: { walls: 1.8 },
    }),
    paving: boxMappedMaterial(atmosphere, {
      maps: paving,
      tile: 4,
      tint: '#cbbba3',
      roughness: 1,
      normalStrength: 0.6,
      night: { tops: 0.35 },
    }),
    // Dark glazing behind the fins, faintly lit from within at dusk.
    glass: atmosphere.patch(
      new MeshStandardMaterial({
        color: '#182a31',
        roughness: 0.12,
        metalness: 0.7,
        vertexColors: true,
        emissive: '#ffae68',
        emissiveIntensity: 0.32,
      }),
    ),
    underlay: atmosphere.patch(
      new MeshStandardMaterial({ color: '#2a211b', roughness: 0.95, vertexColors: true }),
    ),
    led: atmosphere.patch(
      new MeshStandardMaterial({ color: '#000000', emissive: '#9fb6e6', emissiveIntensity: 0.9 }),
    ),
    bronze: atmosphere.patch(
      new MeshStandardMaterial({
        color: '#a77549',
        roughness: 0.38,
        metalness: 0.85,
        vertexColors: true,
      }),
    ),
  };

  // After dark the glazing glows from within and the bowl's LED ribbon lights the opening.
  const { night } = atmosphere;
  night.material(materials.glass as MeshStandardMaterial, 0.32, 2.6);
  night.material(materials.led as MeshStandardMaterial, 0.9, 5);

  return loadShell(MODEL_URL, 'stadium', materials, (part) => part !== 'led');
}
