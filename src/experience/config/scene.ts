/**
 * Art direction for the 3D scene: every look-tuning value lives here.
 *
 * World units are metres. Axes: +X east, -Z north, +Y up. The Red Sea is to the west (−X),
 * so the sun sets over the water, which is the hero composition.
 */

/** Sun position as a compass bearing (deg clockwise from north; 270 = due west) and elevation. */
export const SUN = {
  bearingDeg: 258,
  elevationDeg: 3.4,
} as const;

/** Preetham sky + built-in cloud layer (three/addons Sky). */
export const SKY = {
  turbidity: 10,
  rayleigh: 4.5,
  mieCoefficient: 0.003,
  mieDirectionalG: 0.91,
  /** RGB grade on sky radiance: pulls Preetham's olive mid-sky toward warm rose. */
  tint: [1.07, 0.92, 1.05],
  /** Grade for the upper sky: Preetham's dusk zenith reads olive; pull it to blue-violet. */
  zenithTint: [0.98, 0.88, 1.2],
  /** Soft ceiling (linear luminance) for the glow around the sun. */
  glowRolloff: 2.5,
  cloudCoverage: 0.4,
  cloudDensity: 0.35,
  cloudScale: 0.00018,
  cloudSpeed: 0.000012,
  cloudElevation: 0.55,
  /** Sun disc radiance (three's default is 760, far too hot for bloom). */
  sunDiscIntensity: 14,
  /** Upper bound on sky radiance so no single pixel can flood the bloom chain. */
  maxRadiance: 40,
  /** Edge length of the sky box; must stay inside the camera far plane. */
  size: 40_000,
} as const;

export const RENDER = {
  exposure: 0.46,
  fovDeg: 38,
  near: 1,
  far: 120_000,
} as const;

export const LIGHT = {
  sunColor: '#ffc08a',
  sunIntensity: 3.4,
  /** Cool sky fill: warm sunlit faces against blue-violet shade (cinematic contrast). */
  hemiSkyColor: '#a7b3dc',
  hemiGroundColor: '#6b4e3c',
  hemiIntensity: 0.75,
  /** Image-based lighting strength from the sky environment map. */
  environmentIntensity: 0.7,
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
  lightColor: '#ffb070',
  lightIntensity: 1.3,
  /** Albedo multiplier on glazing, and its roughness (glass picks up sky reflections). */
  glazingDarken: 0.58,
  glazingRoughness: 0.28,
} as const;
