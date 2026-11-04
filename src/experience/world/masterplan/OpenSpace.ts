import { DISTRICT_IDS, DISTRICTS } from '../../../data/districts';
import { MASTERPLAN, type BuildingProfile } from '../../config/masterplan';
import { pointInPolygon, polygonBounds } from '../../utils/polygon';
import type { Plot } from './MasterplanBuildings';
import { isInsideMasterplan } from './MasterplanShape';

/** Paved forecourt (m) kept around every building before planting starts. */
const FORECOURT = 4;
/** Distance (m) over which a forecourt blends into lawn. */
const LAWN_BLEND = 1.5;
/** Spatial hash cell (m) for footprint lookups. */
const HASH_CELL = 60;

interface DistrictGrid {
  readonly polygon: readonly { readonly x: number; readonly z: number }[];
  readonly profile: BuildingProfile;
  readonly minX: number;
  readonly minZ: number;
}

/**
 * Open ground between the masterplan's buildings: the district street grid stays paved, a
 * forecourt rings each building, and the rest of every block (including blocks left empty) is
 * landscaped. Shared by the ground colouring and the street-tree and garden planting, so lawns
 * and trees always agree.
 */
export class OpenSpace {
  private readonly grids: DistrictGrid[];
  private readonly hash = new Map<string, Plot[]>();

  constructor(plots: readonly Plot[]) {
    this.grids = DISTRICT_IDS.map((id) => {
      const { polygon } = DISTRICTS[id];
      const bounds = polygonBounds(polygon);
      return { polygon, profile: MASTERPLAN.profiles[id], minX: bounds.minX, minZ: bounds.minZ };
    });
    for (const plot of plots) {
      const reach = Math.max(plot.width, plot.depth) / 2 + FORECOURT + LAWN_BLEND;
      for (let x = plot.x - reach; x <= plot.x + reach + HASH_CELL; x += HASH_CELL) {
        for (let z = plot.z - reach; z <= plot.z + reach + HASH_CELL; z += HASH_CELL) {
          const key = this.key(x, z);
          const list = this.hash.get(key) ?? [];
          if (!list.includes(plot)) list.push(plot);
          this.hash.set(key, list);
        }
      }
    }
  }

  private key(x: number, z: number): string {
    return `${Math.floor(x / HASH_CELL)}:${Math.floor(z / HASH_CELL)}`;
  }

  private grid(x: number, z: number): DistrictGrid | undefined {
    return this.grids.find((grid) => pointInPolygon(x, z, grid.polygon));
  }

  /** Distance (m) to the nearest building footprint (Infinity if none nearby). */
  distanceToBuilding(x: number, z: number): number {
    let best = Infinity;
    for (const plot of this.hash.get(this.key(x, z)) ?? []) {
      const dx = Math.max(Math.abs(x - plot.x) - plot.width / 2, 0);
      const dz = Math.max(Math.abs(z - plot.z) - plot.depth / 2, 0);
      best = Math.min(best, Math.hypot(dx, dz));
    }
    return best;
  }

  /** Distance (m) from the point to the nearest street centreline of its district grid. */
  streetDistance(x: number, z: number): number {
    const grid = this.grid(x, z);
    if (!grid) return Infinity;
    const { block } = grid.profile;
    const toLine = (value: number, origin: number): number => {
      const t = (((value - origin) % block) + block) % block;
      return Math.min(t, block - t);
    };
    return Math.min(toLine(x, grid.minX), toLine(z, grid.minZ));
  }

  /** Street width (m) at a point, from its district's profile. */
  streetWidth(x: number, z: number): number {
    return this.grid(x, z)?.profile.street ?? 0;
  }

  /** 0 on streets, buildings and forecourts; rising to 1 in open block land. */
  lawn(x: number, z: number): number {
    if (!isInsideMasterplan(x, z)) return 0;
    const grid = this.grid(x, z);
    if (!grid) return 0;
    const street = this.streetDistance(x, z) - grid.profile.street / 2;
    if (street < 0) return 0;
    const clear = Math.min(this.distanceToBuilding(x, z) - FORECOURT, street) / LAWN_BLEND;
    return Math.min(1, Math.max(0, clear));
  }

  /** Street centrelines of every district grid, for planting verges. */
  *streets(): Generator<{
    readonly axis: 'x' | 'z';
    readonly at: number;
    readonly from: number;
    readonly to: number;
    readonly width: number;
    readonly polygon: DistrictGrid['polygon'];
  }> {
    for (const grid of this.grids) {
      const bounds = polygonBounds(grid.polygon);
      const { block, street } = grid.profile;
      for (let x = grid.minX + block; x < bounds.maxX; x += block)
        yield {
          axis: 'z',
          at: x,
          from: bounds.minZ,
          to: bounds.maxZ,
          width: street,
          polygon: grid.polygon,
        };
      for (let z = grid.minZ + block; z < bounds.maxZ; z += block)
        yield {
          axis: 'x',
          at: z,
          from: bounds.minX,
          to: bounds.maxX,
          width: street,
          polygon: grid.polygon,
        };
    }
  }
}
