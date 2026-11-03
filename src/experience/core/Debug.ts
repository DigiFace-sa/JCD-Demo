import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { QUALITY_TIERS, type QualityTier } from '../../config';
import type { Disposable } from '../types';
import type { QualityState } from './Quality';

/** Panel refresh interval (s); also the FPS averaging window. */
const REFRESH_SECONDS = 0.5;

export interface DebugCallbacks {
  readonly onTier: (tier: QualityTier | null) => void;
  readonly onView: (name: string) => void;
}

export interface DebugFrame {
  readonly camera: PerspectiveCamera;
  readonly delta: number;
  readonly quality: QualityState;
  readonly pixelRatio: number;
  readonly width: number;
  readonly height: number;
}

/**
 * `?debug` overlay for checking performance on the pitch machine. Developer tooling only:
 * English-only by design, and never present in the pitch build (VITE_ALLOW_DEBUG=false).
 */
export class Debug implements Disposable {
  private readonly panel = document.createElement('aside');
  private readonly readout = document.createElement('pre');
  private frames = 0;
  private time = 0;
  private worstFrame = 0;

  constructor(
    host: HTMLElement,
    private readonly renderer: WebGLRenderer,
    private readonly gpu: string,
    viewNames: readonly string[],
    callbacks: DebugCallbacks,
  ) {
    this.panel.className = 'debug-panel';
    this.panel.setAttribute('aria-label', 'Debug');
    this.panel.append(
      this.readout,
      this.buttonRow('Tier', [...QUALITY_TIERS, 'auto'], (value) => {
        callbacks.onTier(value === 'auto' ? null : (value as QualityTier));
      }),
      this.buttonRow('View', viewNames, callbacks.onView),
    );
    host.append(this.panel);
  }

  private buttonRow(
    label: string,
    values: readonly string[],
    onClick: (value: string) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'debug-panel__row';
    row.append(Object.assign(document.createElement('span'), { textContent: label }));
    for (const value of values) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value;
      button.dataset.debug = `${label.toLowerCase()}-${value}`;
      button.addEventListener('click', () => {
        onClick(value);
      });
      row.append(button);
    }
    return row;
  }

  update(frame: DebugFrame): void {
    this.frames++;
    this.time += frame.delta;
    this.worstFrame = Math.max(this.worstFrame, frame.delta);
    if (this.time < REFRESH_SECONDS) return;

    const fps = this.frames / this.time;
    const { render, memory, programs } = this.renderer.info;
    const { settings, resolutionScale, locked } = frame.quality;
    this.readout.textContent = [
      `FPS      ${fps.toFixed(1)}   (${((this.time / this.frames) * 1000).toFixed(1)} ms avg, ${(this.worstFrame * 1000).toFixed(1)} worst)`,
      `Tier     ${settings.tier.toUpperCase()}${locked ? ' (locked)' : ' (auto)'}   res ×${resolutionScale.toFixed(2)}`,
      `Render   ${Math.round(frame.width * frame.pixelRatio)}×${Math.round(frame.height * frame.pixelRatio)} @ DPR ${frame.pixelRatio.toFixed(2)} (device ${window.devicePixelRatio})`,
      `Viewport ${frame.width}×${frame.height} css`,
      `Calls    ${render.calls}   tris ${(render.triangles / 1000).toFixed(0)}k`,
      `Memory   ${memory.geometries} geo, ${memory.textures} tex, ${programs?.length ?? 0} programs`,
      `Camera   ${frame.camera.position.x.toFixed(1)}, ${frame.camera.position.y.toFixed(1)}, ${frame.camera.position.z.toFixed(1)}; FOV ${frame.camera.fov.toFixed(1)}`,
      `Effects  shadows ${settings.shadows ? settings.shadowMapSize : 'off'}, MSAA ${settings.msaaSamples}, bloom ${settings.bloom ? `×${settings.bloomScale}` : 'off'}`,
      `GPU      ${this.gpu}`,
    ].join('\n');
    this.frames = 0;
    this.time = 0;
    this.worstFrame = 0;
  }

  dispose(): void {
    this.panel.remove();
  }
}
