import { MathUtils, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import type { QualityTier } from '../config';
import { prefersReducedMotion } from '../utils/motion';
import { RENDER } from './config/scene';
import { MAP_LIMITS, VIEWS, type ViewName } from './config/views';
import { Composer } from './core/Composer';
import { Debug } from './core/Debug';
import { pixelRatioFor, Quality } from './core/Quality';
import { createRenderer, gpuName } from './core/Renderer';
import { Controls } from './interaction/Controls';
import type { Disposable } from './types';
import { World } from './world/World';

export { isWebGL2Available } from './core/Renderer';

/** `full` = interactive Experience page; `hero` = non-interactive backdrop (Home hero). */
export type ExperienceVariant = 'full' | 'hero';

export interface ExperienceOptions {
  readonly variant: ExperienceVariant;
  readonly debug: boolean;
  readonly quality: QualityTier | null;
}

/** Longest simulated step (s): a stalled frame never teleports the camera or the waves. */
const MAX_DELTA = 1 / 20;
/** Hero backdrop drift (rad/s); disabled under reduced motion. */
const HERO_DRIFT = MathUtils.degToRad(0.6);
/** Near plane scales with camera height to keep depth precision where it matters. */
const NEAR_PER_HEIGHT = 0.02;
const NEAR_MIN = 0.5;
const NEAR_MAX = 8;
/** Shadow frustum half-size as a multiple of the orbit radius. */
const SHADOW_EXTENT_PER_RADIUS = 0.75;
const SHADOW_EXTENT_MIN = 250;

/**
 * Owns the renderer, scene, camera, frame loop and resize handling. Construct, `await ready()`,
 * then `start()`. `dispose()` releases every GPU resource and the WebGL context itself.
 */
export class Experience implements Disposable {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(RENDER.fovDeg, 1, RENDER.near, RENDER.far);
  private readonly world: World;
  private readonly controls: Controls;
  private readonly composer: Composer;
  private readonly quality: Quality;
  private readonly debug: Debug | null = null;
  private readonly resizeObserver: ResizeObserver;

  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private disposed = false;

  constructor(
    private readonly container: HTMLElement,
    options: ExperienceOptions,
  ) {
    this.canvas.className = 'experience-canvas';
    container.append(this.canvas);

    this.renderer = createRenderer(this.canvas);
    this.renderer.info.autoReset = false; // the composer renders several passes per frame
    const gpu = gpuName(this.renderer);
    this.quality = new Quality(options.quality, gpu);

    this.world = new World(this.scene, this.renderer);
    this.composer = new Composer(this.renderer, this.scene, this.camera);

    this.controls = new Controls(this.camera, this.canvas, MAP_LIMITS);
    this.controls.setView(VIEWS.wide, true);
    if (options.variant === 'hero') {
      this.controls.enabled = false;
      this.controls.autoRotateSpeed = prefersReducedMotion() ? 0 : HERO_DRIFT;
    } else {
      this.canvas.tabIndex = 0;
    }

    if (options.debug) {
      this.debug = new Debug(container, this.renderer, gpu, Object.keys(VIEWS), {
        onTier: (tier) => {
          this.quality.setTier(tier, this.elapsed);
          this.applyQuality();
        },
        onView: (name) => {
          if (name in VIEWS) this.controls.setView(VIEWS[name as ViewName]);
        },
      });
    }

    this.measure();
    this.applyQuality();
    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(container);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** Compile every shader up front so the first visible frames don't hitch. */
  async ready(): Promise<void> {
    this.controls.update(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderFrame(0);
  }

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.tick);
    const frameMs = now - this.lastTime;
    this.lastTime = now;
    const delta = Math.min(frameMs / 1000, MAX_DELTA);
    this.elapsed += delta;

    if (this.quality.sample(frameMs, this.elapsed)) this.applyQuality();
    this.renderFrame(delta);
    this.debug?.update({
      delta: frameMs / 1000,
      quality: this.quality.state,
      pixelRatio: this.pixelRatio,
      width: this.width,
      height: this.height,
    });
  };

  private renderFrame(delta: number): void {
    this.controls.update(delta);
    this.updateNearPlane();
    this.world.update(delta, this.elapsed, this.camera);
    this.world.environment.setShadowFocus(
      this.controls.target,
      Math.max(SHADOW_EXTENT_MIN, this.controls.radius * SHADOW_EXTENT_PER_RADIUS),
    );
    this.renderer.info.reset();
    this.composer.render(delta);
  }

  private updateNearPlane(): void {
    const near = MathUtils.clamp(this.camera.position.y * NEAR_PER_HEIGHT, NEAR_MIN, NEAR_MAX);
    if (Math.abs(near - this.camera.near) / this.camera.near > 0.05) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
    }
  }

  private measure(): void {
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  /** Apply the current quality state: pixel ratio, shadows, anisotropy, post chain. */
  private applyQuality(): void {
    const state = this.quality.state;
    const { settings } = state;
    this.pixelRatio = pixelRatioFor(state, this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.world.environment.setShadows(settings.shadows, settings.shadowMapSize);
    this.world.sea.setAnisotropy(
      Math.min(settings.anisotropy, this.renderer.capabilities.getMaxAnisotropy()),
    );
    this.composer.configure(settings, this.width, this.height, this.pixelRatio);
  }

  private readonly onResize = (): void => {
    this.measure();
    this.pixelRatio = pixelRatioFor(this.quality.state, this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height, this.pixelRatio);
    if (!this.running) this.renderFrame(0);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
    } else if (!this.disposed) {
      this.quality.reset(this.elapsed);
      this.start();
    }
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.debug?.dispose();
    this.controls.dispose();
    this.world.dispose();
    this.composer.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    // Release the context now rather than waiting for GC (browsers cap live contexts).
    // renderer.dispose() has already detached three's context-lost logging.
    this.renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.remove();
  }
}
