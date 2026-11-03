import type { QualityTier } from '../../config';

export interface QualitySettings {
  readonly tier: QualityTier;
  /** Cap on rendered pixels (width × height × pixelRatio²). 4K output is upscaled from this. */
  readonly maxRenderPixels: number;
  readonly maxPixelRatio: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly msaaSamples: number;
  readonly bloom: boolean;
  /** Bloom buffer resolution as a fraction of the render size. */
  readonly bloomScale: number;
  readonly anisotropy: number;
  /** Planar water reflections of waterfront landmarks. */
  readonly reflections: boolean;
}

export const QUALITY_PRESETS: Readonly<Record<QualityTier, QualitySettings>> = {
  high: {
    tier: 'high',
    maxRenderPixels: 2560 * 1440,
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 4096,
    msaaSamples: 4,
    bloom: true,
    // Bloom is soft by nature: a half-resolution blur chain looks the same at ~¼ the cost.
    bloomScale: 0.5,
    anisotropy: 8,
    reflections: true,
  },
  medium: {
    tier: 'medium',
    maxRenderPixels: 1920 * 1080,
    maxPixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    msaaSamples: 2,
    bloom: true,
    bloomScale: 0.35,
    anisotropy: 4,
    reflections: false,
  },
  low: {
    tier: 'low',
    maxRenderPixels: 1280 * 720,
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 1024,
    msaaSamples: 0,
    bloom: false,
    bloomScale: 0.5,
    anisotropy: 2,
    reflections: false,
  },
};

const TIER_ORDER: readonly QualityTier[] = ['high', 'medium', 'low'];

/** Frames averaged per adaptation decision. */
const SAMPLE_WINDOW = 90;
/** Ignore frame times while shaders compile and the first frames settle. */
const WARMUP_SECONDS = 2.5;
/** Pause adaptation after a change so its effect can be measured. */
const COOLDOWN_SECONDS = 3;
/** Average frame time above this (≈ 50 fps) triggers a step down. */
const SLOW_FRAME_MS = 20;
/** Average frame time below this for RECOVER_SECONDS allows resolution back up. */
const FAST_FRAME_MS = 14.5;
const RECOVER_SECONDS = 8;
/** Frame gaps longer than this (tab switch, breakpoint) are ignored, not treated as slowness. */
const OUTLIER_FRAME_MS = 250;

const RESOLUTION_STEP = 0.15;
const MIN_RESOLUTION_SCALE = 0.7;

export interface QualityState {
  readonly settings: QualitySettings;
  /** Multiplier on the tier's pixel budget (adaptive resolution). */
  readonly resolutionScale: number;
  /** True when the tier is fixed by `?quality=` or the debug panel. */
  readonly locked: boolean;
}

/**
 * Picks a starting tier from the GPU, then adapts to measured frame time: first by lowering
 * render resolution, then by dropping a tier. It never raises the tier automatically
 * (oscillation would be more visible than a slightly softer image).
 */
export class Quality {
  private tier: QualityTier;
  private resolutionScale = 1;
  private locked: boolean;
  private readonly samples: number[] = [];
  private holdUntil = WARMUP_SECONDS;
  private fastSince: number | null = null;

  constructor(override: QualityTier | null, gpuName: string) {
    this.tier = override ?? Quality.detectTier(gpuName);
    this.locked = override !== null;
  }

  /** Conservative GPU heuristic; the default is High (the assumed pitch machine). */
  static detectTier(gpuName: string): QualityTier {
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpuName)) return 'low';
    const isPhone =
      window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
    if (isPhone) return 'low';
    if (/intel/i.test(gpuName) && !/arc/i.test(gpuName)) return 'medium';
    return 'high';
  }

  get state(): QualityState {
    return {
      settings: QUALITY_PRESETS[this.tier],
      resolutionScale: this.resolutionScale,
      locked: this.locked,
    };
  }

  /** Fix the tier (debug panel), or pass null to return to adaptive mode. */
  setTier(tier: QualityTier | null, now: number): void {
    this.locked = tier !== null;
    if (tier) this.tier = tier;
    this.resolutionScale = 1;
    this.reset(now);
  }

  /** Restart measurement, e.g. after a camera transition that compiled new shaders. */
  reset(now: number): void {
    this.samples.length = 0;
    this.fastSince = null;
    this.holdUntil = now + COOLDOWN_SECONDS;
  }

  /** Record one frame. Returns true when settings changed and the renderer must re-apply them. */
  sample(frameMs: number, now: number): boolean {
    if (this.locked || now < this.holdUntil || frameMs > OUTLIER_FRAME_MS) return false;
    this.samples.push(frameMs);
    if (this.samples.length < SAMPLE_WINDOW) return false;

    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.samples.length = 0;

    if (average > SLOW_FRAME_MS) {
      this.fastSince = null;
      return this.stepDown(now);
    }
    if (average < FAST_FRAME_MS && this.resolutionScale < 1) {
      this.fastSince ??= now;
      if (now - this.fastSince >= RECOVER_SECONDS) {
        this.resolutionScale = Math.min(1, this.resolutionScale + RESOLUTION_STEP);
        this.reset(now);
        return true;
      }
    } else {
      this.fastSince = null;
    }
    return false;
  }

  private stepDown(now: number): boolean {
    if (this.resolutionScale - RESOLUTION_STEP >= MIN_RESOLUTION_SCALE - 1e-6) {
      this.resolutionScale -= RESOLUTION_STEP;
    } else {
      const next = TIER_ORDER[TIER_ORDER.indexOf(this.tier) + 1];
      if (!next) return false;
      this.tier = next;
      this.resolutionScale = 1;
    }
    this.reset(now);
    return true;
  }
}

/** Pixel ratio that fits the tier's pixel budget for a canvas of the given CSS size. */
export function pixelRatioFor(state: QualityState, cssWidth: number, cssHeight: number): number {
  const { maxRenderPixels, maxPixelRatio } = state.settings;
  const budget = maxRenderPixels * state.resolutionScale;
  const fit = Math.sqrt(budget / Math.max(1, cssWidth * cssHeight));
  return Math.max(0.5, Math.min(window.devicePixelRatio, maxPixelRatio, fit));
}
