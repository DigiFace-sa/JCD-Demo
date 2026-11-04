/**
 * Masterplan geometry and massing (stylised, not surveyed). [TBC: align to the official plan]
 * Content (names, district outlines, landmark positions) lives in src/data; this file only
 * shapes the land and the generic building fabric.
 *
 * Axes as in config/scene.ts: +X east (inland), +Z south. The reclaimed waterfront is
 * straightened to x = shoreX along the masterplan, blending into the natural coast beyond.
 */
export interface Segment {
  readonly from: { readonly x: number; readonly z: number };
  readonly to: { readonly x: number; readonly z: number };
  readonly radius: number;
}

export interface BuildingProfile {
  /** Block pitch (m) including street. */
  readonly block: number;
  readonly street: number;
  /** Chance a block is built (the rest stays open space). */
  readonly density: number;
  readonly minHeight: number;
  readonly maxHeight: number;
  /** Chance a building is a tower, and tower heights. */
  readonly towerChance: number;
  readonly towerMin: number;
  readonly towerMax: number;
}

export const MASTERPLAN = {
  shoreX: -60,
  /** Along-coast extent of the straightened waterfront, and the blend length at each end. */
  zStart: -2400,
  zEnd: 2900,
  blend: 600,
  /** Natural sloped beach (public beach); quay walls elsewhere along the masterplan. */
  beach: { zStart: 650, zEnd: 3600 },
  quayDepth: -7,
  /** Promenade width (m) behind quay edges: paved, lined with palms, no buildings. */
  promenade: 45,
  /** Land kept free of buildings behind the beach (m from the waterline). */
  beachSetback: 120,

  peninsula: { from: { x: -40, z: -560 }, to: { x: -390, z: -640 }, radius: 120 },
  marinaBasin: { center: { x: 90, z: 330 }, halfSize: { x: 150, z: 210 }, radius: 35 },
  breakwaters: [
    { from: { x: -80, z: 80 }, to: { x: -280, z: 300 }, radius: 22 },
    { from: { x: -70, z: 590 }, to: { x: -210, z: 470 }, radius: 22 },
  ] satisfies Segment[],

  /** High-resolution shore field around the masterplan (crisp marina and peninsula edges). */
  field: { minX: -900, maxX: 1800, minZ: -3000, maxZ: 3400, cell: 5 },
  /** Detailed ground grid; columns coarsen east of detailMaxX until the far skirt. */
  ground: {
    minX: -560,
    detailMaxX: 1700,
    maxX: 3400,
    minZ: -2700,
    maxZ: 3100,
    cell: 12,
    coarseCell: 40,
  },
  /** Context city stays out of this box. */
  exclusion: { maxX: 1400, minZ: -2500, maxZ: 3000 },

  /** Green spaces (circle centres in world metres). */
  parks: [
    { x: 590, z: -1650, radius: 520 }, // stadium gardens
    { x: 380, z: -880, radius: 150 },
    { x: 900, z: 1200, radius: 220 },
    { x: 700, z: 2000, radius: 260 },
    { x: 1050, z: 2450, radius: 200 },
    { x: 940, z: 380, radius: 110 },
    { x: -290, z: -612, radius: 150 }, // opera gardens on the peninsula
  ],
  /** Paved plazas carved out of parks around landmarks. */
  plazas: [
    { x: 590, z: -1650, radius: 320 },
    { x: 380, z: -560, radius: 100 },
    { x: 30, z: 740, radius: 85 },
    { x: -368, z: -567, radius: 36 }, // opera forecourt, before the arched entrance
  ],

  profiles: {
    central: {
      block: 78,
      street: 26,
      density: 0.92,
      minHeight: 22,
      maxHeight: 48,
      towerChance: 0.32,
      towerMin: 70,
      towerMax: 165,
    },
    marina: {
      block: 62,
      street: 22,
      density: 0.85,
      minHeight: 14,
      maxHeight: 34,
      towerChance: 0.06,
      towerMin: 45,
      towerMax: 70,
    },
    culture: {
      block: 66,
      street: 24,
      density: 0.55,
      minHeight: 9,
      maxHeight: 22,
      towerChance: 0,
      towerMin: 0,
      towerMax: 0,
    },
    beach: {
      block: 56,
      street: 22,
      density: 0.5,
      minHeight: 6,
      maxHeight: 15,
      towerChance: 0,
      towerMin: 0,
      towerMax: 0,
    },
    wellness: {
      block: 74,
      street: 28,
      density: 0.4,
      minHeight: 6,
      maxHeight: 16,
      towerChance: 0,
      towerMin: 0,
      towerMax: 0,
    },
    'sports-park': {
      block: 70,
      street: 26,
      density: 0.18,
      minHeight: 6,
      maxHeight: 12,
      towerChance: 0,
      towerMin: 0,
      towerMax: 0,
    },
  } satisfies Record<string, BuildingProfile>,
  /** Keep buildings this far (m) beyond each landmark's footprint radius. */
  landmarkClearance: 70,
  buildingColor: '#efe6d8',

  landscape: {
    palmSpacing: 26,
    treesPerPark: 560,
    seed: 11,
  },
} as const;
