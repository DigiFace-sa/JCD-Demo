import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { COAST } from '../config/scene';
import type { Disposable } from '../types';
import { Atmosphere } from './Atmosphere';
import { coastlineDistance } from './Coastline';
import { ContextCity } from './ContextCity';
import { Environment } from './Environment';
import { Sea } from './Sea';
import { ShoreField } from './ShoreField';
import { Terrain } from './Terrain';

/** Assembles the static world: sky and light, sea, coast terrain, surrounding city. */
export class World implements Disposable {
  readonly atmosphere = new Atmosphere();
  readonly environment: Environment;
  readonly shore: ShoreField;
  readonly sea: Sea;
  readonly terrain: Terrain;
  readonly city: ContextCity;

  constructor(
    private readonly scene: Scene,
    renderer: WebGLRenderer,
  ) {
    this.environment = new Environment(scene, renderer, this.atmosphere);
    this.shore = new ShoreField(coastlineDistance, COAST.fieldSize, COAST.fieldResolution);
    this.sea = new Sea(this.atmosphere, this.shore, this.environment.sunLight);
    this.terrain = new Terrain(this.shore, this.atmosphere);
    this.city = new ContextCity(this.shore, this.atmosphere);

    scene.add(this.sea.object, this.terrain.object, this.city.object);
    this.environment.bake(renderer);
  }

  update(delta: number, elapsed: number, camera: PerspectiveCamera): void {
    this.environment.update(delta, elapsed);
    this.sea.follow(camera);
    this.sea.update(delta, elapsed);
  }

  dispose(): void {
    this.scene.remove(this.sea.object, this.terrain.object, this.city.object);
    this.sea.dispose();
    this.terrain.dispose();
    this.city.dispose();
    this.shore.dispose();
    this.environment.dispose();
  }
}
