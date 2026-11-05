import { DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { VIP_LOUNGE } from '../../../config/stadium';
import { disposeObject } from '../../../utils/dispose';
import type { Disposable } from '../../../types';
import type { Atmosphere } from '../../Atmosphere';
import { boxMappedMaterial, textureSet } from '../boxMapped';
import { loadShell } from '../shell';
import { PITCH } from './pitchTexture';

/** Original Blender hospitality suite and round goal frames; all measurements are illustrative. */
export class StadiumDetails implements Disposable {
  readonly object = new Group();
  readonly loaded: Promise<void>;
  private disposed = false;

  constructor(private readonly atmosphere: Atmosphere) {
    this.object.name = 'stadium-hospitality-and-goals';
    this.loaded = this.build();
  }

  private async build(): Promise<void> {
    const isDisposed = (): boolean => this.disposed;
    const [limestone, timber] = await Promise.all([textureSet('limestone'), textureSet('timber')]);
    if (isDisposed()) return;
    const standard = (color: string, roughness = 0.8, metalness = 0): MeshStandardMaterial =>
      this.atmosphere.patch(
        new MeshStandardMaterial({ color, roughness, metalness, vertexColors: true }),
      );
    const foliage = standard('#526b43');
    foliage.side = DoubleSide;
    const fabric = this.atmosphere.night.material(standard('#cfc4ad', 0.95), 0.025, 0.06);
    fabric.emissive.set('#b09b7a');
    const led = this.atmosphere.night.material(standard('#eee3ce', 0.6), 0.6, 1.1);
    led.emissive.set('#ffd6a2');
    const plaster = this.atmosphere.night.material(standard('#e7dfd1', 0.9), 0.018, 0.035);
    plaster.emissive.set('#bba179');
    const goal = this.atmosphere.night.material(standard('#f4f1e8', 0.45, 0.05), 0.04, 0.18);
    goal.emissive.set('#d4d8ce');
    const net = this.atmosphere.patch(
      new MeshStandardMaterial({
        color: '#e7e8dc',
        roughness: 0.9,
        side: DoubleSide,
        alphaTest: 0.45,
        alphaToCoverage: true,
      }),
      {
        key: 'goal-net-volume',
        uniforms: {},
        vertexPars: 'varying vec3 vNetNormal;',
        vertexMain: 'vNetNormal = inverseTransformDirection(transformedNormal, viewMatrix);',
        fragmentPars: 'varying vec3 vNetNormal;',
        afterDiffuse: `
        vec3 n = abs(vNetNormal);
        vec2 p = n.y > 0.5 ? vAtmoWorldPos.xz : n.x > 0.5 ? vAtmoWorldPos.zy : vAtmoWorldPos.xy;
        vec2 st = p / 0.16;
        vec2 cell = min(fract(st), 1.0 - fract(st));
        vec2 edge = max(fwidth(st), vec2(0.02));
        vec2 thread = 1.0 - smoothstep(vec2(0.035), vec2(0.035) + edge, cell);
        diffuseColor.a = max(thread.x, thread.y) * (1.0 - smoothstep(0.7, 1.5, max(edge.x, edge.y)));
      `,
      },
    );
    const shell = await loadShell(
      'models/stadium-interior.glb',
      'stadium-detail',
      {
        'lounge-stone': boxMappedMaterial(this.atmosphere, {
          maps: limestone,
          tile: 1.2,
          tint: '#d7cbb6',
          roughness: 0.85,
          normalStrength: 0.3,
          detail: 0.3,
        }),
        'lounge-paving': boxMappedMaterial(this.atmosphere, {
          maps: limestone,
          tile: 2.4,
          tint: '#d0c3ad',
          roughness: 0.42,
          normalStrength: 0.12,
          detail: 0.2,
        }),
        'lounge-plaster': plaster,
        'lounge-timber': boxMappedMaterial(this.atmosphere, {
          maps: timber,
          tile: 0.9,
          tint: '#795638',
          roughness: 0.7,
          normalStrength: 0.3,
          detail: 0.45,
        }),
        'lounge-metal': standard('#ae8a54', 0.38, 0.75),
        'lounge-fabric': fabric,
        'lounge-accent': standard('#315d55', 0.95),
        'lounge-rug': standard('#8c8a74', 1),
        'lounge-foliage': foliage,
        'lounge-led': led,
        'goal-metal': goal,
        'goal-net': net,
      },
      (part) => part !== 'lounge-led' && part !== 'goal-net',
    );
    if (isDisposed()) {
      disposeObject(shell);
      return;
    }
    const lounge = new Group();
    lounge.name = 'vip-lounge';
    lounge.position.set(VIP_LOUNGE.x, VIP_LOUNGE.floor, 0);
    const goalParts = new Group();
    for (const child of [...shell.children]) {
      if (child.name.startsWith('stadium-detail-goal-')) goalParts.add(child);
      else lounge.add(child);
    }
    // Very light glazing preserves the field view. The open sliding bay is the camera entrance.
    const glass = this.atmosphere.patch(
      new MeshStandardMaterial({
        color: '#c5d7cf',
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    for (const [a, b] of [
      [-16, -8],
      [-8, 0],
      [0, 8],
      [14, 16],
    ] as const) {
      const pane = new Mesh(new PlaneGeometry(b - a, 3.1).rotateY(Math.PI / 2), glass);
      pane.position.set(7.68, 1.85, (a + b) / 2);
      lounge.add(pane);
    }
    this.object.add(lounge);
    for (const side of [-1, 1]) {
      const end = goalParts.clone(true);
      end.position.set(0, 3, side * (PITCH.length / 2 - 1));
      end.rotation.y = side === -1 ? Math.PI : 0;
      this.object.add(end);
    }
  }

  dispose(): void {
    this.disposed = true;
    disposeObject(this.object);
  }
}
