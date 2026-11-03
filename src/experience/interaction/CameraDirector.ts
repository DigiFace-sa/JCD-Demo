import { gsap } from 'gsap';
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { EASE_IN_OUT, motionDuration } from '../../utils/motion';
import type { Disposable } from '../types';
import type { Controls, OrbitView } from './Controls';

/** Flight duration (s) grows with distance travelled, within these bounds. */
const MIN_DURATION = 1.8;
const MAX_DURATION = 3.4;
/** Seconds per km of target travel (before clamping). */
const SECONDS_PER_KM = 0.9;
/** On long flights the camera rises mid-way (radius × up to this) so the path arcs. */
const MAX_ARC_LIFT = 0.35;
const ARC_FULL_DISTANCE = 3000;

export interface FlightOptions {
  /** Override the distance-based duration (s). */
  readonly duration?: number;
}

export interface FlightPath {
  readonly positions: readonly Vector3[];
  readonly targets: readonly Vector3[];
}

const wrapAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Cinematic camera moves between orbit views. Input is locked for the duration; a new flight
 * cleanly replaces one in progress (so rapid clicks can never fight each other).
 */
export class CameraDirector implements Disposable {
  private tween: gsap.core.Tween | null = null;
  private settle: (() => void) | null = null;

  constructor(private readonly controls: Controls) {}

  get flying(): boolean {
    return this.tween !== null;
  }

  /** Position and look-at curves share a parameter, keeping the reveal directed through the tunnel. */
  flyAlong(
    path: FlightPath,
    options: FlightOptions = {},
    onProgress?: (t: number) => void,
  ): Promise<void> {
    this.cancel();
    const positions = new CatmullRomCurve3([...path.positions], false, 'centripetal');
    const targets = new CatmullRomCurve3([...path.targets], false, 'centripetal');
    const position = new Vector3();
    const target = new Vector3();
    const progress = { t: 0 };
    this.controls.enabled = false;
    return new Promise((resolve) => {
      this.settle = resolve;
      this.tween = gsap.to(progress, {
        t: 1,
        duration: motionDuration(options.duration ?? 3.8),
        ease: EASE_IN_OUT,
        onUpdate: () => {
          positions.getPoint(progress.t, position);
          targets.getPoint(progress.t, target);
          this.controls.setPose(position, target);
          onProgress?.(progress.t);
        },
        onComplete: () => {
          this.finish();
        },
      });
    });
  }

  flyTo(to: OrbitView, options: FlightOptions = {}): Promise<void> {
    this.cancel();
    const from = this.controls.getView();
    const travel = Math.hypot(to.target.x - from.target.x, to.target.z - from.target.z);
    const radiusChange = Math.abs(Math.log(to.radius / from.radius)) * 1000;
    const duration = motionDuration(
      options.duration ??
        MathUtils.clamp(
          ((travel + radiusChange) / 1000) * SECONDS_PER_KM + MIN_DURATION * 0.6,
          MIN_DURATION,
          MAX_DURATION,
        ),
    );
    const azimuthDelta = wrapAngle(to.azimuth - from.azimuth);
    const lift = MAX_ARC_LIFT * Math.min(1, travel / ARC_FULL_DISTANCE);
    const progress = { t: 0 };

    this.controls.enabled = false;
    return new Promise((resolve) => {
      this.settle = resolve;
      this.tween = gsap.to(progress, {
        t: 1,
        duration,
        ease: EASE_IN_OUT,
        onUpdate: () => {
          const t = progress.t;
          const arc = 1 + lift * Math.sin(Math.PI * t);
          this.controls.setView(
            {
              target: {
                x: MathUtils.lerp(from.target.x, to.target.x, t),
                y: MathUtils.lerp(from.target.y, to.target.y, t),
                z: MathUtils.lerp(from.target.z, to.target.z, t),
              },
              // Interpolate distance logarithmically so zooms feel even.
              radius: Math.exp(MathUtils.lerp(Math.log(from.radius), Math.log(to.radius), t)) * arc,
              polar: MathUtils.lerp(from.polar, to.polar, t),
              azimuth: from.azimuth + azimuthDelta * t,
            },
            true,
          );
        },
        onComplete: () => {
          this.finish();
        },
      });
    });
  }

  /** Stop a flight where it is and hand control back to the user. */
  cancel(): void {
    if (!this.tween) return;
    this.tween.kill();
    this.finish();
  }

  private finish(): void {
    this.tween = null;
    this.controls.enabled = true;
    const settle = this.settle;
    this.settle = null;
    settle?.();
  }

  dispose(): void {
    this.cancel();
  }
}
