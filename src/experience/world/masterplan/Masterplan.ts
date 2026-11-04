import { gsap } from 'gsap';
import { Group, type Vector3 } from 'three';
import { DISTRICT_IDS, type DistrictId } from '../../../data/districts';
import { DURATION, EASE_OUT, motionDuration } from '../../../utils/motion';
import type { Disposable } from '../../types';
import type { Atmosphere } from '../Atmosphere';
import { Breakwaters } from './Breakwaters';
import { Landscape } from './Landscape';
import { MasterplanBuildings } from './MasterplanBuildings';
import { MasterplanGround } from './MasterplanGround';
import { OpenSpace } from './OpenSpace';
import { Waterfront } from './Waterfront';

/** Highlight levels per state: outline strength, fill strength, building glow. */
const LEVELS = {
  idle: { line: 0.4, fill: 0, buildings: 0 },
  hover: { line: 0.9, fill: 0.3, buildings: 0.4 },
  selected: { line: 1, fill: 0.5, buildings: 0.8 },
  /** Other districts while one is selected recede slightly. */
  dimmed: { line: 0.08, fill: 0, buildings: 0 },
} as const;

/** Camera distance (m) over which district overlays fade in, and their full strength. */
const OVERLAY_FADE = { near: 900, far: 2400, intensity: 1.3 } as const;

/** The masterplan: ground, district buildings, landscape, waterfront, district highlighting. */
export class Masterplan implements Disposable {
  readonly object = new Group();
  readonly ground: MasterplanGround;
  readonly buildings: MasterplanBuildings;
  readonly landscape: Landscape;
  readonly waterfront: Waterfront;
  readonly breakwaters: Breakwaters;
  private hovered: DistrictId | null = null;
  private selected: DistrictId | null = null;

  constructor(atmosphere: Atmosphere) {
    this.buildings = new MasterplanBuildings(atmosphere);
    // Lawns and planting fill the land the buildings leave open.
    const openSpace = new OpenSpace(this.buildings.plots);
    this.ground = new MasterplanGround(atmosphere, openSpace);
    this.landscape = new Landscape(atmosphere, openSpace);
    this.waterfront = new Waterfront(atmosphere);
    this.breakwaters = new Breakwaters(atmosphere);
    this.object.name = 'masterplan';
    this.object.add(
      this.ground.object,
      this.buildings.object,
      this.landscape.object,
      this.waterfront.object,
      this.breakwaters.object,
    );
    this.applyHighlight(true);
  }

  /**
   * District overlays are a map-scale aid: full strength from afar, faded out in close-ups
   * where outline bands would read as glowing stripes.
   */
  setViewDistance(distance: number): void {
    const t = Math.min(
      1,
      Math.max(0, (distance - OVERLAY_FADE.near) / (OVERLAY_FADE.far - OVERLAY_FADE.near)),
    );
    this.ground.intensity.value = OVERLAY_FADE.intensity * t * t * (3 - 2 * t);
  }

  setHovered(id: DistrictId | null): void {
    if (id === this.hovered) return;
    this.hovered = id;
    this.applyHighlight();
  }

  setSelected(id: DistrictId | null): void {
    if (id === this.selected) return;
    this.selected = id;
    this.applyHighlight();
  }

  private levelsFor(id: DistrictId): (typeof LEVELS)[keyof typeof LEVELS] {
    if (id === this.selected) return LEVELS.selected;
    if (id === this.hovered) return LEVELS.hover;
    return this.selected ? LEVELS.dimmed : LEVELS.idle;
  }

  private applyHighlight(immediate = false): void {
    const duration = immediate ? 0 : motionDuration(DURATION.slow);
    const fill = DISTRICT_IDS.map((id) => this.levelsFor(id).fill);
    const line = DISTRICT_IDS.map((id) => this.levelsFor(id).line);
    const { fillA, fillB, lineA, lineB } = this.ground.uniforms;
    const tweenVector = (target: Vector3, values: readonly number[], offset: number): void => {
      gsap.to(target, {
        x: values[offset] ?? 0,
        y: values[offset + 1] ?? 0,
        z: values[offset + 2] ?? 0,
        duration,
        ease: EASE_OUT,
        overwrite: true,
      });
    };
    tweenVector(fillA.value, fill, 0);
    tweenVector(fillB.value, fill, 3);
    tweenVector(lineA.value, line, 0);
    tweenVector(lineB.value, line, 3);
    for (const id of DISTRICT_IDS) {
      const level = this.buildings.highlight.get(id);
      if (level)
        gsap.to(level, {
          value: this.levelsFor(id).buildings,
          duration,
          ease: EASE_OUT,
          overwrite: true,
        });
    }
  }

  dispose(): void {
    const { fillA, fillB, lineA, lineB } = this.ground.uniforms;
    gsap.killTweensOf([
      fillA.value,
      fillB.value,
      lineA.value,
      lineB.value,
      ...this.buildings.highlight.values(),
    ]);
    this.ground.dispose();
    this.buildings.dispose();
    this.landscape.dispose();
    this.waterfront.dispose();
    this.breakwaters.dispose();
  }
}
