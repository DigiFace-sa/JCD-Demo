/**
 * Art direction for the 3D scene: every look-tuning value lives here.
 *
 * World units are metres. Axes: +X east, -Z north, +Y up. The Red Sea is to the west (−X),
 * so the sun sets over the water, which is the hero composition.
 */

/** Preetham sky + built-in cloud layer (three/addons Sky); per-mode grading is in LIGHTING. */
export const SKY = {
  /** Soft ceiling (linear luminance) for the glow around the sun. */
  glowRolloff: 2.5,
  cloudDensity: 0.35,
  cloudScale: 0.00018,
  cloudSpeed: 0.000012,
  cloudElevation: 0.55,
  /** Upper bound on sky radiance so no single pixel can flood the bloom chain. */
  maxRadiance: 40,
  /** Edge length of the sky box; must stay inside the camera far plane. */
  size: 40_000,
} as const;

export const RENDER = {
  fovDeg: 38,
  near: 1,
  far: 120_000,
} as const;

export const LIGHT = {
  /** World box (m) that receives sun shadows: the masterplan plus its immediate surroundings. */
  shadowRegion: { minX: -800, maxX: 3000, minZ: -3000, maxZ: 3400, maxHeight: 180 },
} as const;

/** Height-based aerial perspective (see world/Atmosphere.ts). */
export const ATMOSPHERE = {
  /** Haze density at sea level, per metre. */
  density: 0.000_11,
  /** How quickly haze thins with altitude, per metre. */
  heightFalloff: 0.0028,
  /** Extra warm in-scattering when looking toward the sun. */
  sunScatter: 0.35,
  /** Cap on haze luminance (linear), so haze toward the sun glows rather than whites out. */
  maxLuminance: 1.2,
} as const;

export const SEA = {
  /** Far beyond the horizon so the quad's edge never shows (the far plane clips it). */
  size: 200_000,
  deepColor: '#16475a',
  /** Day sky light is far stronger than the dusk it was graded for. */
  dayBodyGain: 0.62,
  shallowColor: '#2c8f8f',
  foamColor: '#f4efe6',
  /** Distance offshore (m) over which shallow turquoise fades to deep blue. */
  shallowDistance: 140,
  /** Width (m) of the shoreline foam band. */
  foamDistance: 9,
  /** Specular strength of the sun glitter path (HDR; drives bloom). */
  sunGlitter: 6,
  sunSheen: 0.35,
  /** Upper bound on water radiance (keeps glitter bloom tight). */
  maxRadiance: 30,
  normalStrength: 0.55,
  /** Planar reflections of waterfront landmarks (High tier): blend strength, ripple warp. */
  reflectionStrength: 0.85,
  reflectionDistortion: 0.06,
} as const;

/** Bloom tuned for HDR sun highlights only; the rest of the frame stays crisp. */
export const POST = {
  bloomStrength: 0.22,
  bloomRadius: 0.4,
  bloomThreshold: 3.5,
  vignette: 0.32,
} as const;

/**
 * Natural coastline beyond the masterplan (see config/masterplan.ts for the masterplan itself).
 * The shore runs roughly north–south; x(z) is the waterline.
 */
export const COAST = {
  /** Square area (m) covered by the coarse shore field and the context city, centred on the origin. */
  fieldSize: 12_000,
  fieldResolution: 512,
  waves: [
    { amplitude: 140, wavelength: 5200, phase: 0.4 },
    { amplitude: 55, wavelength: 1900, phase: 1.7 },
    { amplitude: 18, wavelength: 610, phase: 0.2 },
  ],
  landHeight: 2.2,
  seabedDepth: -9,
  sandColor: '#d9c3a0',
  wetSandColor: '#9c8467',
  groundColor: '#b9a68a',
} as const;

/** Generic surrounding city, for scale and long sunset shadows. Not part of the masterplan. */
export const CONTEXT_CITY = {
  seed: 7,
  blockSize: 70,
  streetWidth: 22,
  /** Distance inland (m) where context buildings start / end. */
  inlandStart: 260,
  inlandEnd: 2300,
  /** Darker and warmer than the masterplan's white, so the masterplan reads as the subject. */
  color: '#9e8f7b',
} as const;

/** Procedural facades (world/Facade.ts) for context and placeholder buildings. */
export const FACADE = {
  floorHeight: 3.6,
  bayWidth: 2.7,
  /** Share of windows already lit at dusk. */
  litFraction: 0.12,
  nightLitFraction: 0.14,
  lightColor: '#ffb070',
  lightIntensity: 1.3,
  nightLightIntensity: 1.6,
  /** Albedo multiplier on glazing, and its roughness (glass picks up sky reflections). */
  glazingDarken: 0.58,
  glazingRoughness: 0.28,
} as const;

export type LightingMode = 'day' | 'night';

export interface LightingPreset {
  /** Where the sky model's sun sits (below the horizon at night: blue-hour afterglow). */
  readonly skySun: { readonly bearingDeg: number; readonly elevationDeg: number };
  /** The shadow-casting key light: the sun by day, the moon by night. */
  readonly key: {
    readonly bearingDeg: number;
    readonly elevationDeg: number;
    readonly color: string;
    readonly intensity: number;
  };
  readonly sky: {
    readonly turbidity: number;
    readonly rayleigh: number;
    readonly mieCoefficient: number;
    readonly mieDirectionalG: number;
    readonly tint: readonly [number, number, number];
    readonly zenithTint: readonly [number, number, number];
    /** Radiance added everywhere (linear RGB): the night sky's airglow and city light dome. */
    readonly floor: readonly [number, number, number];
    readonly sunDisc: number;
    readonly clouds: number;
  };
  readonly hemi: { readonly sky: string; readonly ground: string; readonly intensity: number };
  readonly environmentIntensity: number;
  readonly exposure: number;
  /** 0 by day, 1 at night: drives windows, façade glow, landmark lighting and street lamps. */
  readonly lights: number;
}

/**
 * Day: a clear late-afternoon sun over the Red Sea (the official renders' daylight).
 * Night: blue hour after sunset, cool moonlight, and the destination lit from within.
 */
export const LIGHTING: Readonly<Record<LightingMode, LightingPreset>> = {
  day: {
    skySun: { bearingDeg: 258, elevationDeg: 14 },
    key: { bearingDeg: 258, elevationDeg: 14, color: '#ffe1bf', intensity: 3.6 },
    sky: {
      turbidity: 2.6,
      rayleigh: 1.5,
      mieCoefficient: 0.004,
      mieDirectionalG: 0.86,
      tint: [1.04, 0.99, 1.0],
      zenithTint: [0.98, 0.96, 1.08],
      floor: [0, 0, 0],
      sunDisc: 14,
      clouds: 0.25,
    },
    hemi: { sky: '#b9c9e6', ground: '#7d6650', intensity: 0.85 },
    environmentIntensity: 0.8,
    exposure: 0.5,
    lights: 0,
  },
  night: {
    skySun: { bearingDeg: 262, elevationDeg: -5 },
    key: { bearingDeg: 115, elevationDeg: 34, color: '#a8bcff', intensity: 0.42 },
    sky: {
      turbidity: 3,
      rayleigh: 3.2,
      mieCoefficient: 0.003,
      mieDirectionalG: 0.9,
      tint: [0.86, 0.92, 1.25],
      zenithTint: [0.8, 0.88, 1.3],
      floor: [0.018, 0.024, 0.046],
      sunDisc: 0,
      clouds: 0.22,
    },
    hemi: { sky: '#33467a', ground: '#1d1612', intensity: 0.45 },
    environmentIntensity: 0.55,
    exposure: 1.4,
    lights: 1,
  },
};
