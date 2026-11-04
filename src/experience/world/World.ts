import {
  AmbientLight,
  MathUtils,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { MASTERPLAN } from '../config/masterplan';
import { COAST, type LightingMode } from '../config/scene';
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

/** Bounced floodlights lift the enclosed terraces without changing the exterior lighting. */
const STADIUM_FILL = { color: '#d8e4ed', intensity: 1.8, damping: 5 } as const;

/** Assembles the world: sky and light, sea, coast, surrounding city, masterplan, landmarks. */
export class World implements Disposable {
  private interior = false;
  /** Bounced floodlight fill for the enclosed bowl; exterior art direction stays untouched. */
  private readonly stadiumFill = new AmbientLight(STADIUM_FILL.color, 0);
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
    lighting: LightingMode,
  ) {
    this.environment = new Environment(scene, renderer, this.atmosphere, lighting);
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
      this.stadiumFill,
    );
    this.environment.bake(renderer);
  }

  /** Resolves when every asynchronously loaded model (landmarks, vegetation) is in the scene. */
  ready(): Promise<void> {
    return Promise.all([this.landmarks.ready(), this.masterplan.landscape.loaded]).then(
      () => undefined,
    );
  }

  update(delta: number, elapsed: number, camera: PerspectiveCamera): void {
    this.stadiumFill.intensity = MathUtils.lerp(
      this.stadiumFill.intensity,
      this.interior ? STADIUM_FILL.intensity : 0,
      1 - Math.exp(-STADIUM_FILL.damping * delta),
    );
    this.environment.update(delta, elapsed);
    this.masterplan.landscape.updateView(camera);
    this.sea.follow(camera);
    this.sea.update(delta, elapsed);
    this.landmarks.update(delta, elapsed, camera);
  }

  /** Interior occlusion avoids submitting the whole instanced city behind an opaque bowl. */
  setInterior(interior: boolean): void {
    if (this.interior === interior) return;
    this.interior = interior;
    for (const object of [
      this.sea.object,
      this.terrain.object,
      this.city.object,
      this.masterplan.object,
    ])
      object.visible = !interior;
    for (const [id, model] of this.landmarks.models)
      if (id !== 'stadium') model.object.visible = !interior;
  }

  dispose(): void {
    this.scene.remove(
      this.sea.object,
      this.terrain.object,
      this.city.object,
      this.masterplan.object,
      this.landmarks.object,
      this.stadiumFill,
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
