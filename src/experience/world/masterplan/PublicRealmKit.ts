import { Mesh, type Material } from 'three';
import { disposeObject } from '../../utils/dispose';
import { loadShell } from '../landmarks/shell';

/** Must match scripts/blender/public_realm.py's asset/surface part names. */
const PARTS = {
  bench: ['timber', 'metal'],
  lounger: ['timber', 'metal', 'fabric'],
  parasol: ['fabric', 'metal', 'stone'],
  table: ['timber', 'metal'],
  chair: ['timber', 'metal'],
  planter: ['stone', 'soil', 'foliage'],
  lamp: ['metal', 'led'],
  pavilion: ['stone', 'timber', 'metal', 'led'],
  arcade: ['stone', 'timber', 'metal', 'glass', 'led'],
} as const;
export type RealmProp = keyof typeof PARTS;
type Surface = (typeof PARTS)[RealmProp][number];
export type RealmKit = Readonly<Record<'near' | 'far', ReadonlyMap<RealmProp, readonly Mesh[]>>>;

/** Templates share resources with their placed instances; the owning PublicRealm disposes them. */
export async function loadPublicRealmKit(
  materials: Readonly<Record<Surface, Material>>,
): Promise<RealmKit> {
  const assignments = Object.fromEntries(
    Object.entries(PARTS).flatMap(([asset, surfaces]) =>
      surfaces.flatMap((surface) => [
        [`${asset}-${surface}`, materials[surface]],
        [`${asset}-${surface}-far`, materials[surface]],
      ]),
    ),
  );
  const shell = await loadShell('models/public-realm.glb', 'realm', assignments);
  const kit = {
    near: new Map<RealmProp, readonly Mesh[]>(),
    far: new Map<RealmProp, readonly Mesh[]>(),
  };
  for (const level of ['near', 'far'] as const) {
    for (const asset of Object.keys(PARTS) as RealmProp[]) {
      const meshes = shell.children.filter(
        (child): child is Mesh =>
          child instanceof Mesh &&
          child.name.startsWith(`realm-${asset}-`) &&
          child.name.endsWith('-far') === (level === 'far'),
      );
      if (meshes.length !== PARTS[asset].length) {
        disposeObject(shell);
        throw new Error(`Incomplete public-realm model: ${asset} ${level}`);
      }
      kit[level].set(asset, meshes);
    }
  }
  return kit;
}
