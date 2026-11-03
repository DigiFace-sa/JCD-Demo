import { Box3, CylinderGeometry, Group, Mesh, MeshBasicMaterial, type Object3D } from 'three';
import { LANDMARKS, type LandmarkId } from '../../../data/landmarks';
import { COAST } from '../../config/scene';
import type { Disposable, Updatable } from '../../types';
import { disposeObject } from '../../utils/dispose';
import type { Atmosphere } from '../Atmosphere';

/**
 * A landmark in the 3D world. Procedural today; any landmark can be replaced by a real model
 * by changing one line in Landmarks.ts (see `gltfLandmark`).
 */
export interface LandmarkModel extends Disposable, Partial<Updatable> {
  readonly id: LandmarkId;
  /** Positioned at the landmark's site (data/landmarks.ts). */
  readonly object: Object3D;
  /** Invisible, simple shape used for pointer picking (cheaper than the real geometry). */
  readonly pickProxy: Object3D;
}

export interface LandmarkContext {
  readonly atmosphere: Atmosphere;
}

export type LandmarkFactory = (context: LandmarkContext) => LandmarkModel;

/** Invisible cylinder covering a landmark's footprint, for raycast picking. */
export function createPickProxy(id: LandmarkId, height: number): Mesh {
  const { footprint } = LANDMARKS[id];
  const proxy = new Mesh(
    new CylinderGeometry(footprint * 0.8, footprint * 0.8, height, 16).translate(0, height / 2, 0),
    new MeshBasicMaterial({ visible: false }),
  );
  proxy.name = `${id}-pick`;
  proxy.userData.landmarkId = id;
  return proxy;
}

/** Root group placed at the landmark's site on the ground. */
export function landmarkRoot(id: LandmarkId): Group {
  const root = new Group();
  const { position } = LANDMARKS[id];
  root.position.set(position.x, COAST.landHeight, position.z);
  root.name = id;
  return root;
}

export interface GltfOptions {
  /** Uniform scale applied to the loaded scene (model units → metres). */
  readonly scale?: number;
  readonly rotationY?: number;
  /** Proxy height for picking until the model loads. */
  readonly height?: number;
}

/**
 * Landmark backed by a GLB file in /public (e.g. `models/stadium.glb`). The loader is fetched
 * on demand, so the procedural build never pays for it. The model's origin should sit at
 * ground level at the centre of the site.
 */
export function gltfLandmark(
  id: LandmarkId,
  url: string,
  options: GltfOptions = {},
): LandmarkFactory {
  return ({ atmosphere }) => {
    const root = landmarkRoot(id);
    const pickProxy = createPickProxy(id, options.height ?? 40);
    root.add(pickProxy);
    let disposed = false;

    void import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) =>
      new GLTFLoader().loadAsync(url).then((gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        gltf.scene.scale.setScalar(options.scale ?? 1);
        gltf.scene.rotation.y = options.rotationY ?? 0;
        gltf.scene.traverse((child) => {
          if (child instanceof Mesh) {
            const mesh = child as Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => {
              atmosphere.patch(material);
            });
          }
        });
        root.add(gltf.scene);
        // Fit the picking proxy to the real model.
        const size = new Box3().setFromObject(gltf.scene).getSize(pickProxy.scale.clone());
        pickProxy.scale.set(1, size.y / (options.height ?? 40), 1);
      }),
    );

    return {
      id,
      object: root,
      pickProxy,
      dispose() {
        disposed = true;
        disposeObject(root);
      },
    };
  };
}
