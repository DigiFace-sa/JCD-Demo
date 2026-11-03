import { MathUtils, PerspectiveCamera, Scene, type WebGLRenderer } from 'three';
import type { QualityTier } from '../config';
import { STADIUM_HOTSPOT_IDS } from '../data/stadium';
import { prefersReducedMotion } from '../utils/motion';
import { RENDER } from './config/scene';
import { MAP_LIMITS, VIEWS, type ViewName } from './config/views';
import { Composer } from './core/Composer';
import { Debug } from './core/Debug';
import { pixelRatioFor, Quality } from './core/Quality';
import { createRenderer, gpuName } from './core/Renderer';
import { Controls } from './interaction/Controls';
import { MapInteraction } from './interaction/MapInteraction';
import type { Disposable, Focus } from './types';
import { PlanarReflection } from './world/PlanarReflection';
import { World } from './world/World';

export { isWebGL2Available } from './core/Renderer';
export type { Focus, FocusKind } from './types';

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
/** Opening move: start this much further out and higher, then settle onto the map view. */
const INTRO_RADIUS_SCALE = 1.7;
const INTRO_POLAR = MathUtils.degToRad(38);
const INTRO_DURATION = 4.2;

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
  private readonly map: MapInteraction | null = null;
  private reflection: PlanarReflection | null = null;
  private readonly resizeObserver: ResizeObserver;

  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private pausedByVisibility = false;
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
    if (options.variant === 'hero') {
      this.controls.setView(VIEWS.wide, true);
      this.controls.enabled = false;
      this.controls.autoRotateSpeed = prefersReducedMotion() ? 0 : HERO_DRIFT;
    } else {
      this.controls.setView(VIEWS.map, true);
      this.canvas.tabIndex = 0;
      this.map = new MapInteraction(container, this.canvas, this.camera, this.controls, this.world);
    }

    if (options.debug) {
      this.debug = new Debug(container, this.renderer, gpu, Object.keys(VIEWS), {
        onTier: (tier) => {
          this.quality.setTier(tier, this.elapsed);
          this.applyQuality();
        },
        onView: (name) => {
          if (!(name in VIEWS)) return;
          void this.map?.focus(null, true);
          this.map?.director.cancel();
          this.controls.setView(VIEWS[name as ViewName]);
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
    // Disposal can happen from a route change while any warm-up promise is pending.
    const isDisposed = (): boolean => this.disposed;
    this.controls.update(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (isDisposed()) return;
    this.renderFrame(0);
    // Warm depth/instancing variants while the loading screen covers the canvas. Main-scene
    // compileAsync alone does not exercise the tighter stadium shadow pass or the interior LOD.
    if (this.map) {
      await this.map.focus({ kind: 'landmark', id: 'stadium' }, true);
      if (isDisposed()) return;
      this.renderFrame(0);
      await this.map.focus({ kind: 'hotspot', id: 'inside' }, true);
      if (isDisposed()) return;
      this.renderFrame(0);
      for (const id of STADIUM_HOTSPOT_IDS) {
        await this.map.focus({ kind: 'hotspot', id }, true);
        if (isDisposed()) return;
        this.renderFrame(0);
      }
      await this.map.focus(null, true);
      if (isDisposed()) return;
    }
    this.renderFrame(0);
    // Drain the hidden warm-up draws before exposing the scene, including ANGLE's lazy pipelines.
    this.renderer.getContext().finish();
  }

  /** Opening camera move onto the spawn map (skipped under reduced motion). */
  async intro(): Promise<void> {
    if (!this.map) return;
    const mapView = this.map.mapView;
    if (prefersReducedMotion()) {
      this.controls.setView(mapView, true);
      return;
    }
    this.controls.setView(
      { ...mapView, radius: mapView.radius * INTRO_RADIUS_SCALE, polar: INTRO_POLAR },
      true,
    );
    await this.map.director.flyTo(mapView, { duration: INTRO_DURATION });
  }

  /** Listen for map selections (markers, landmark clicks, district clicks). */
  onSelect(listener: (focus: Focus) => void): () => void {
    return this.map?.onSelect(listener) ?? (() => undefined);
  }

  onFlightChange(listener: (flying: boolean) => void): () => void {
    return this.map?.onFlightChange(listener) ?? (() => undefined);
  }

  /** Frame a landmark, district or attraction, or the whole map (null). */
  focus(focus: Focus | null, immediate = false): Promise<void> {
    return this.map?.focus(focus, immediate) ?? Promise.resolve();
  }

  /** Preview-highlight a district from outside the canvas (null clears). */
  hover(focus: Focus | null): void {
    this.map?.setExternalHover(focus);
  }

  /** Fires on any direct camera input (used to fade hints and, later, pause the tour). */
  onUserInput(listener: () => void): () => void {
    return this.controls.onUserInput(listener);
  }

  /** UI elements markers must stay clear of. */
  setAvoidElements(elements: readonly Element[]): void {
    this.map?.setAvoidElements(elements);
  }

  /** Width (px) the side panel covers: positive on the right, negative on the left (RTL). */
  setPanelInset(pixels: number): void {
    this.map?.setPanelInset(pixels);
  }

  start(): void {
    if (this.running || this.disposed) return;
    if (document.hidden) {
      this.pausedByVisibility = true;
      return;
    }
    this.pausedByVisibility = false;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.pausedByVisibility = false;
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
      camera: this.camera,
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
    const interior = this.map?.occludesWorld ?? false;
    this.world.setInterior(interior);
    this.world.update(delta, this.elapsed, this.camera);
    this.world.masterplan.setViewDistance(this.controls.radius);
    this.renderer.info.reset();
    if (!interior) this.reflection?.render(this.renderer, this.scene, this.camera);
    this.composer.render(delta);
    this.map?.update(this.width, this.height, delta);
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
    this.configureReflection(settings.reflections);
  }

  private configureReflection(enabled: boolean): void {
    if (enabled && !this.reflection) {
      this.reflection = new PlanarReflection();
    } else if (!enabled && this.reflection) {
      this.reflection.dispose();
      this.reflection = null;
    }
    this.reflection?.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
    this.world.sea.setReflection(
      this.reflection
        ? { texture: this.reflection.target.texture, matrix: this.reflection.textureMatrix }
        : null,
    );
  }

  private readonly onResize = (): void => {
    this.measure();
    this.pixelRatio = pixelRatioFor(this.quality.state, this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height, this.pixelRatio);
    this.reflection?.setSize(this.width * this.pixelRatio, this.height * this.pixelRatio);
    if (!this.running) this.renderFrame(0);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      const wasRunning = this.running || this.pausedByVisibility;
      this.stop();
      this.pausedByVisibility = wasRunning;
    } else if (!this.disposed && this.pausedByVisibility) {
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
    this.map?.dispose();
    this.controls.dispose();
    this.world.dispose();
    this.composer.dispose();
    this.reflection?.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    // Release the context now rather than waiting for GC (browsers cap live contexts).
    // renderer.dispose() has already detached three's context-lost logging.
    this.renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.remove();
  }
}
