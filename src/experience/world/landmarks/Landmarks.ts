import { Group, type Raycaster, type PerspectiveCamera } from 'three';
import { LANDMARK_IDS, type LandmarkId } from '../../../data/landmarks';
import type { Disposable } from '../../types';
import type { Atmosphere } from '../Atmosphere';
import type { LandmarkFactory, LandmarkModel } from './LandmarkModel';
import { createMuseum } from './Museum';
import { createOceanarium } from './Oceanarium';
import { createOperaHouse } from './OperaHouse';
import { createStadium } from './stadium/Stadium';

/**
 * Which model each landmark uses. To swap in a real model, replace one entry, e.g.:
 *   stadium: gltfLandmark('stadium', 'models/stadium.glb', { scale: 1, height: 50 }),
 * (import gltfLandmark from './LandmarkModel' and put the file in public/models/).
 */
const FACTORIES: Readonly<Record<LandmarkId, LandmarkFactory>> = {
  stadium: createStadium,
  'opera-house': createOperaHouse,
  oceanarium: createOceanarium,
  museum: createMuseum,
};

export class Landmarks implements Disposable {
  readonly object = new Group();
  readonly models: ReadonlyMap<LandmarkId, LandmarkModel>;

  constructor(atmosphere: Atmosphere) {
    const models = new Map<LandmarkId, LandmarkModel>();
    for (const id of LANDMARK_IDS) {
      const model = FACTORIES[id]({ atmosphere });
      models.set(id, model);
      this.object.add(model.object);
    }
    this.models = models;
    this.object.name = 'landmarks';
  }

  /** Resolves when every landmark's asynchronously loaded parts are in the scene. */
  ready(): Promise<void> {
    return Promise.all(
      [...this.models.values()].map((model) => model.loaded ?? Promise.resolve()),
    ).then(() => undefined);
  }

  /** Landmark under the pointer ray, if any. */
  pick(raycaster: Raycaster): LandmarkId | null {
    const proxies = [...this.models.values()].map((model) => model.pickProxy);
    const hit = raycaster.intersectObjects(proxies, false)[0];
    const id: unknown = hit?.object.userData.landmarkId;
    return LANDMARK_IDS.find((landmark) => landmark === id) ?? null;
  }

  update(delta: number, elapsed: number, camera: PerspectiveCamera): void {
    for (const model of this.models.values()) {
      model.update?.(delta, elapsed);
      model.updateView?.(camera);
    }
  }

  dispose(): void {
    for (const model of this.models.values()) model.dispose();
  }
}
