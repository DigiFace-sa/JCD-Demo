import type { PerspectiveCamera } from 'three';
import { MathUtils, Vector3 } from 'three';
import type { Disposable, Updatable } from '../types';

export interface OrbitView {
  readonly target: { readonly x: number; readonly y: number; readonly z: number };
  readonly radius: number;
  /** Angle from straight up (radians): 0 = top-down, π/2 = level with the horizon. */
  readonly polar: number;
  /** Angle around the vertical axis (radians): 0 = camera south of target, π/2 = east. */
  readonly azimuth: number;
}

export interface ControlLimits {
  readonly minRadius: number;
  readonly maxRadius: number;
  readonly minPolar: number;
  readonly maxPolar: number;
  /** Lowest camera height (m) above sea level. */
  readonly minHeight: number;
  readonly minAzimuth?: number;
  readonly maxAzimuth?: number;
  /** Optional world-space safety envelope for the stadium bowl (never applied to path flights). */
  readonly constrainPosition?: (position: Vector3) => void;
  /** Stationary indoor look-around; orbit angles steer the gaze instead of moving the eye. */
  readonly fixedEye?: { readonly x: number; readonly y: number; readonly z: number };
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
}

/** Higher = snappier. Exponential smoothing rate (1/s) toward the desired view. */
const DAMPING = 5.5;
/** Radians of rotation per viewport height dragged. */
const ROTATE_SPEED = Math.PI * 0.9;
/** Target travel per viewport height dragged, as a multiple of the orbit radius. */
const PAN_SPEED = 1.4;
/** Zoom factor per wheel pixel. */
const ZOOM_SPEED = 0.0012;
const WHEEL_LINE_HEIGHT = 16;
const KEY_ROTATE_STEP = MathUtils.degToRad(6);
const KEY_PAN_STEP = 0.08;
const KEY_ZOOM_STEP = 1.18;

interface MutableView {
  target: Vector3;
  radius: number;
  polar: number;
  azimuth: number;
}

type Gesture = 'none' | 'rotate' | 'pan' | 'pinch';

/**
 * Custom orbit controls for a ground-anchored map: drag to orbit, right/shift-drag or two
 * fingers to pan, wheel/pinch to zoom, arrow keys (+shift) and +/- when the canvas is focused.
 * Everything eases toward a clamped "desired" view, so input can never push past the limits.
 */
export class Controls implements Updatable, Disposable {
  enabled = true;
  /** Idle orbit speed (rad/s); keep 0 under reduced motion. */
  autoRotateSpeed = 0;

  private readonly current: MutableView = {
    target: new Vector3(),
    radius: 1000,
    polar: 1,
    azimuth: 0,
  };
  private readonly desired: MutableView = {
    target: new Vector3(),
    radius: 1000,
    polar: 1,
    azimuth: 0,
  };
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture: Gesture = 'none';
  private readonly inputListeners = new Set<() => void>();
  private readonly scratch = new Vector3();

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly element: HTMLElement,
    private limits: ControlLimits,
  ) {
    element.style.touchAction = 'none';
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', this.onContextMenu);
    element.addEventListener('keydown', this.onKeyDown);
  }

  setLimits(limits: ControlLimits): void {
    this.limits = limits;
    this.clamp(this.desired);
  }

  /** Scripted position/look-at pose. Bypasses orbit clamps while crossing the entry tunnel. */
  setPose(position: Vector3, target: Vector3): void {
    const offset = this.scratch.copy(position).sub(target);
    const radius = offset.length();
    this.desired.target.copy(target);
    this.desired.radius = radius;
    this.desired.polar = Math.acos(MathUtils.clamp(offset.y / radius, -1, 1));
    this.desired.azimuth = Math.atan2(offset.x, offset.z);
    this.copyView(this.desired, this.current);
    this.applyToCamera();
  }

  /** Move to a view: eased by default, or instantly (e.g. on first frame). */
  setView(view: OrbitView, immediate = false): void {
    this.desired.target.set(view.target.x, view.target.y, view.target.z);
    this.desired.radius = view.radius;
    this.desired.polar = view.polar;
    this.desired.azimuth = view.azimuth;
    this.clamp(this.desired);
    if (immediate) this.copyView(this.desired, this.current);
  }

  getView(): OrbitView {
    const { target, radius, polar, azimuth } = this.current;
    return { target: { x: target.x, y: target.y, z: target.z }, radius, polar, azimuth };
  }

  get target(): Vector3 {
    return this.current.target;
  }

  get radius(): number {
    return this.current.radius;
  }

  /** Fires on any direct user input (used to pause the Guided Tour). Returns an unsubscribe. */
  onUserInput(listener: () => void): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  update(delta: number): void {
    if (this.autoRotateSpeed !== 0 && this.gesture === 'none') {
      this.desired.azimuth += this.autoRotateSpeed * delta;
    }
    const t = 1 - Math.exp(-DAMPING * delta);
    this.current.target.lerp(this.desired.target, t);
    this.current.radius += (this.desired.radius - this.current.radius) * t;
    this.current.polar += (this.desired.polar - this.current.polar) * t;
    this.current.azimuth += (this.desired.azimuth - this.current.azimuth) * t;
    if (this.enabled && (this.limits.constrainPosition || this.limits.fixedEye))
      this.clamp(this.current);
    this.applyToCamera();
  }

  private applyToCamera(): void {
    const { target, radius, polar, azimuth } = this.current;
    this.camera.position.set(
      target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      target.z + radius * Math.sin(polar) * Math.cos(azimuth),
    );
    this.camera.lookAt(target);
  }

  private clamp(view: MutableView): void {
    const { minRadius, maxRadius, minPolar, maxPolar, minHeight, bounds } = this.limits;
    view.radius = MathUtils.clamp(view.radius, minRadius, maxRadius);
    view.polar = MathUtils.clamp(view.polar, minPolar, maxPolar);
    view.azimuth = MathUtils.clamp(
      view.azimuth,
      this.limits.minAzimuth ?? -Infinity,
      this.limits.maxAzimuth ?? Infinity,
    );
    if (this.limits.fixedEye) {
      const eye = this.limits.fixedEye;
      view.target.set(
        eye.x - view.radius * Math.sin(view.polar) * Math.sin(view.azimuth),
        eye.y - view.radius * Math.cos(view.polar),
        eye.z - view.radius * Math.sin(view.polar) * Math.cos(view.azimuth),
      );
      return;
    }
    view.target.x = MathUtils.clamp(view.target.x, bounds.minX, bounds.maxX);
    view.target.z = MathUtils.clamp(view.target.z, bounds.minZ, bounds.maxZ);
    // Keep the camera above minHeight by tilting up rather than letting it sink.
    const ratio = (minHeight - view.target.y) / view.radius;
    if (ratio > -1 && ratio < 1) view.polar = Math.min(view.polar, Math.acos(ratio));
    if (this.limits.constrainPosition) {
      this.scratch.set(
        view.target.x + view.radius * Math.sin(view.polar) * Math.sin(view.azimuth),
        view.target.y + view.radius * Math.cos(view.polar),
        view.target.z + view.radius * Math.sin(view.polar) * Math.cos(view.azimuth),
      );
      this.limits.constrainPosition(this.scratch);
      this.scratch.sub(view.target);
      view.radius = this.scratch.length();
      view.polar = Math.acos(MathUtils.clamp(this.scratch.y / view.radius, -1, 1));
      view.azimuth = Math.atan2(this.scratch.x, this.scratch.z);
    }
  }

  private copyView(from: MutableView, to: MutableView): void {
    to.target.copy(from.target);
    to.radius = from.radius;
    to.polar = from.polar;
    to.azimuth = from.azimuth;
  }

  private notifyInput(): void {
    this.inputListeners.forEach((listener) => {
      listener();
    });
  }

  private rotate(dx: number, dy: number): void {
    const height = this.element.clientHeight || 1;
    this.desired.azimuth -= (dx / height) * ROTATE_SPEED;
    this.desired.polar -= (dy / height) * ROTATE_SPEED;
    this.clamp(this.desired);
  }

  private pan(dx: number, dy: number): void {
    const height = this.element.clientHeight || 1;
    const scale = (this.desired.radius * PAN_SPEED) / height;
    const azimuth = this.current.azimuth;
    // Camera-relative ground axes: right, and forward (away from the camera).
    const right = this.scratch.set(Math.cos(azimuth), 0, -Math.sin(azimuth));
    this.desired.target.addScaledVector(right, -dx * scale);
    this.desired.target.x += -Math.sin(azimuth) * dy * scale;
    this.desired.target.z += -Math.cos(azimuth) * dy * scale;
    this.clamp(this.desired);
  }

  private zoom(factor: number): void {
    this.desired.radius *= factor;
    this.clamp(this.desired);
  }

  private pinchState(): { distance: number; x: number; y: number } {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return { distance: 0, x: 0, y: 0 };
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.notifyInput();
    if (this.pointers.size === 1) {
      this.gesture = event.button === 2 || event.shiftKey ? 'pan' : 'rotate';
    } else if (this.pointers.size === 2) {
      this.gesture = 'pinch';
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous || !this.enabled) return;

    if (this.gesture === 'pinch') {
      const before = this.pinchState();
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const after = this.pinchState();
      if (before.distance > 0 && after.distance > 0) this.zoom(before.distance / after.distance);
      this.pan(after.x - before.x, after.y - before.y);
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.gesture === 'rotate') this.rotate(dx, dy);
    else if (this.gesture === 'pan') this.pan(dx, dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointers.delete(event.pointerId)) return;
    if (this.element.hasPointerCapture(event.pointerId))
      this.element.releasePointerCapture(event.pointerId);
    this.gesture = this.pointers.size === 1 ? 'rotate' : 'none';
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (!this.enabled) return;
    this.notifyInput();
    const pixels =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * WHEEL_LINE_HEIGHT
        : event.deltaY;
    this.zoom(Math.exp(pixels * ZOOM_SPEED));
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const height = this.element.clientHeight || 1;
    const panStep = height * KEY_PAN_STEP;
    const rotateStep = (KEY_ROTATE_STEP / ROTATE_SPEED) * height;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft':
        if (event.shiftKey) this.pan(panStep, 0);
        else this.rotate(rotateStep, 0);
        break;
      case 'ArrowRight':
        if (event.shiftKey) this.pan(-panStep, 0);
        else this.rotate(-rotateStep, 0);
        break;
      case 'ArrowUp':
        if (event.shiftKey) this.pan(0, panStep);
        else this.rotate(0, rotateStep);
        break;
      case 'ArrowDown':
        if (event.shiftKey) this.pan(0, -panStep);
        else this.rotate(0, -rotateStep);
        break;
      case '+':
      case '=':
        this.zoom(1 / KEY_ZOOM_STEP);
        break;
      case '-':
      case '_':
        this.zoom(KEY_ZOOM_STEP);
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      this.notifyInput();
    }
  };

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.element.removeEventListener('wheel', this.onWheel);
    this.element.removeEventListener('contextmenu', this.onContextMenu);
    this.element.removeEventListener('keydown', this.onKeyDown);
    this.inputListeners.clear();
    this.pointers.clear();
  }
}
