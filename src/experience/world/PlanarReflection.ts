import {
  Color,
  HalfFloatType,
  Matrix4,
  PerspectiveCamera,
  Plane,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { LAYERS } from '../config/layers';
import type { Disposable } from '../types';

/** Reflection buffer resolution relative to the drawing buffer. */
const RESOLUTION_SCALE = 0.5;
/** Nudge for the oblique clip plane so geometry touching the water doesn't flicker. */
const CLIP_BIAS = 0.003;
const NORMAL = new Vector3(0, 1, 0);
const TRANSPARENT = new Color(0, 0, 0);

/**
 * Mirror of the waterfront landmarks in the sea plane (y = 0), High tier only. Renders just the
 * REFLECTED layer from a mirrored camera into a half-resolution buffer whose alpha marks where
 * something was drawn; the sea shader falls back to the sky elsewhere. Oblique near-plane
 * clipping keeps anything below the waterline out of the mirror. (Math after three's Reflector.)
 */
export class PlanarReflection implements Disposable {
  readonly target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  /** Maps world positions to reflection-buffer UVs (projective). */
  readonly textureMatrix = new Matrix4();
  private readonly camera = new PerspectiveCamera();
  private readonly plane = new Plane();
  private readonly clipPlane = new Vector4();
  private readonly q = new Vector4();
  private readonly view = new Vector3();
  private readonly lookAt = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly rotation = new Matrix4();
  private readonly previousClear = new Color();

  constructor() {
    this.camera.layers.set(LAYERS.REFLECTED);
  }

  setSize(width: number, height: number): void {
    this.target.setSize(
      Math.max(1, Math.round(width * RESOLUTION_SCALE)),
      Math.max(1, Math.round(height * RESOLUTION_SCALE)),
    );
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): void {
    this.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    if (this.cameraPosition.y <= 0) return;

    // Mirror the camera position and its look-at point through the water plane.
    this.view.set(this.cameraPosition.x, -this.cameraPosition.y, this.cameraPosition.z);
    this.rotation.extractRotation(camera.matrixWorld);
    this.lookAt.set(0, 0, -1).applyMatrix4(this.rotation).add(this.cameraPosition);
    this.lookAt.y = -this.lookAt.y;

    const mirror = this.camera;
    mirror.position.copy(this.view);
    mirror.up.set(0, 1, 0).applyMatrix4(this.rotation).reflect(NORMAL);
    mirror.lookAt(this.lookAt);
    mirror.far = camera.far;
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

    // Oblique near plane = the water surface (Lengyel), so nothing underwater is mirrored.
    this.plane
      .setFromNormalAndCoplanarPoint(NORMAL, new Vector3())
      .applyMatrix4(mirror.matrixWorldInverse);
    this.clipPlane.set(
      this.plane.normal.x,
      this.plane.normal.y,
      this.plane.normal.z,
      this.plane.constant,
    );
    const e = mirror.projectionMatrix.elements;
    this.q.set(
      (Math.sign(this.clipPlane.x) + e[8]) / e[0],
      (Math.sign(this.clipPlane.y) + e[9]) / e[5],
      -1,
      (1 + e[10]) / e[14],
    );
    this.clipPlane.multiplyScalar(2 / this.clipPlane.dot(this.q));
    e[2] = this.clipPlane.x;
    e[6] = this.clipPlane.y;
    e[10] = this.clipPlane.z + 1 - CLIP_BIAS;
    e[14] = this.clipPlane.w;

    const previousTarget = renderer.getRenderTarget();
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.previousClear);
    const shadowsUpdate = renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate = false;
    renderer.setClearColor(TRANSPARENT, 0);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, mirror);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(this.previousClear, previousAlpha);
    renderer.shadowMap.needsUpdate = shadowsUpdate;
  }

  dispose(): void {
    this.target.dispose();
  }
}
