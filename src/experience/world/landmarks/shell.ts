import { Group, Mesh, type Material } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../../utils/dispose';

const DRACO_PATH = 'draco/';

/**
 * Loads a Blender-built landmark (scripts/blender/<landmark>.py) and assigns the web app's
 * materials by part name. Parts are named `<prefix>-<material>` in Blender: the glTF export keeps
 * object names but not material names, and look-dev (tints, tiling, gloss) stays in code.
 */
export async function loadShell(
  url: string,
  prefix: string,
  materials: Readonly<Record<string, Material>>,
  castsShadow: (part: string) => boolean = () => true,
): Promise<Group> {
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
  ]);
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  let gltf: GLTF;
  try {
    gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
  } catch (error) {
    for (const material of Object.values(materials)) material.dispose();
    throw error;
  } finally {
    // Failed downloads/decode must release workers as well as successful loads.
    draco.dispose();
  }

  const shell = new Group();
  shell.name = `${prefix}-shell`;
  const meshes: Mesh[] = [];
  gltf.scene.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child as Mesh);
  });
  const pattern = new RegExp(`^${prefix}-`);
  for (const mesh of meshes) {
    const part = mesh.name.replace(pattern, '').replace(/_\d+$|\.\d+$/, '');
    const material = materials[part];
    if (!material) {
      disposeObject(gltf.scene);
      disposeObject(shell);
      for (const assigned of Object.values(materials)) assigned.dispose();
      throw new Error(`${url}: unexpected part "${mesh.name}"`);
    }
    (mesh.material as Material).dispose();
    mesh.material = material;
    mesh.castShadow = castsShadow(part);
    mesh.receiveShadow = true;
    shell.add(mesh);
  }
  return shell;
}
