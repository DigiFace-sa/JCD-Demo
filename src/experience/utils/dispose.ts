import type { BufferGeometry, Material, Object3D, Texture } from 'three';
import { Line, Mesh, Points } from 'three';

type Drawable = Mesh<BufferGeometry, Material | Material[]>;

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && 'isTexture' in value) (value as Texture).dispose();
  }
  material.dispose();
}

/**
 * Dispose geometries, materials and material textures under `root`.
 * Shared resources may be disposed more than once; three.js treats repeat calls as no-ops.
 */
export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points || object instanceof Line) {
      const drawable = object as Drawable;
      drawable.geometry.dispose();
      const materials = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
      materials.forEach(disposeMaterial);
    }
  });
}
