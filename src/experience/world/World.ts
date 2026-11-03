import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MASTERPLAN } from '../config/masterplan';
import { COAST } from '../config/scene';
import type { Disposable } from '../types';
import { Atmosphere } from './Atmosphere';
import { ContextCity } from './ContextCity';
import { Environment } from './Environment';
import { Landmarks } from './landmarks/Landmarks';
import { Masterplan } from './masterplan/Masterplan';
import { beachWeight, landDistance } from './masterplan/MasterplanShape';
import { Sea } from './Sea';
import { ShoreField } from './ShoreField';
import { Terrain } from './Terrain';

/** Assembles the world: sky and light, sea, coast, surrounding city, masterplan, landmarks. */
export class World implements Disposable {
  readonly atmosphere = new Atmosphere();
  readonly environment: Environment;
  readonly shore: { readonly fine: ShoreField; readonly coarse: ShoreField };
  readonly sea: Sea;
  readonly terrain: Terrain;
  readonly city: ContextCity;
  readonly masterplan: Masterplan;
  readonly landmarks: Landmarks;

  constructor(
    private readonly scene: Scene,
    renderer: WebGLRenderer,
  ) {
    this.environment = new Environment(scene, renderer, this.atmosphere);
    const half = COAST.fieldSize / 2;
    const { field } = MASTERPLAN;
    this.shore = {
      fine: new ShoreField(landDistance, (_x, z) => beachWeight(z), field, field.cell),
      coarse: new ShoreField(
        landDistance,
        (_x, z) => beachWeight(z),
        { minX: -half, minZ: -half, maxX: half, maxZ: half },
        COAST.fieldSize / COAST.fieldResolution,
      ),
    };
    this.sea = new Sea(this.atmosphere, this.shore, this.environment.sunLight);
    this.terrain = new Terrain(this.atmosphere);
    this.city = new ContextCity(this.atmosphere);
    this.masterplan = new Masterplan(this.atmosphere);
    this.landmarks = new Landmarks(this.atmosphere);

    scene.add(
      this.sea.object,
      this.terrain.object,
      this.city.object,
      this.masterplan.object,
      this.landmarks.object,
    );
    this.environment.bake(renderer);
  }

  update(delta: number, elapsed: number, camera: PerspectiveCamera): void {
    this.environment.update(delta, elapsed);
    this.sea.follow(camera);
    this.sea.update(delta, elapsed);
    this.landmarks.update(delta, elapsed);
  }

  dispose(): void {
    this.scene.remove(
      this.sea.object,
      this.terrain.object,
      this.city.object,
      this.masterplan.object,
      this.landmarks.object,
    );
    this.sea.dispose();
    this.terrain.dispose();
    this.city.dispose();
    this.masterplan.dispose();
    this.landmarks.dispose();
    this.shore.fine.dispose();
    this.shore.coarse.dispose();
    this.environment.dispose();
  }
}
