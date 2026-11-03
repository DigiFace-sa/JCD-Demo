/**
 * Shared shapes for map content. World units are metres: +X east (inland), +Z south,
 * Y up. The masterplan waterfront runs north–south along x ≈ −60; the Red Sea is west (−X).
 * Layout is stylised and plausible, not surveyed. [TBC: align to the official masterplan]
 */
export interface WorldPoint {
  readonly x: number;
  readonly z: number;
}

/** Camera framing around a point: distance (m), tilt from vertical, compass-style azimuth. */
export interface CameraShot {
  readonly radius: number;
  /** 0° = looking straight down, 90° = level with the horizon. */
  readonly polarDeg: number;
  /** Camera position around the target: 90° = east of it (looking west, toward the sunset). */
  readonly azimuthDeg: number;
}
