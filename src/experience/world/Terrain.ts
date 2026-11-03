import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { MASTERPLAN } from '../config/masterplan';
import { COAST } from '../config/scene';
import type { Disposable } from '../types';
import { disposeObject } from '../utils/dispose';
import type { Atmosphere } from './Atmosphere';
import { groundHeightAt, landDistance, shoreX } from './masterplan/MasterplanShape';

/** Offsets (m) from the waterline for each strip column: dense at the beach, sparse inland. */
const SHORE_OFFSETS = [
  -420, -260, -170, -110, -70, -45, -28, -16, -8, -3, 0, 3, 7, 12, 20, 32, 50, 80, 130, 210, 340,
  560, 900, 1400, 2100, 3000, 4200,
];
/** Row spacing (m) next to the masterplan, growing by ROW_GROWTH per row toward the strip ends. */
const ROW_SPACING = 30;
const ROW_GROWTH = 1.04;
/** Distance (m) along the coast to each strip end: well past the haze horizon. */
const STRIP_REACH = 30_000;
/**
 * The strip sits slightly below the masterplan ground where the two overlap at the seams,
 * so they never z-fight; the far skirt sits lower still.
 */
const STRIP_DROP = 0.15;
const SKIRT_DROP = 1.2;

/** Rows from `start` outward (direction ±1) to the strip end, coarsening with distance. */
function rowsFrom(start: number, direction: 1 | -1): number[] {
  const rows = [start];
  let spacing = ROW_SPACING;
  let z = start;
  while (Math.abs(z - start) < STRIP_REACH) {
    z += spacing * direction;
    rows.push(z);
    spacing *= ROW_GROWTH;
  }
  return rows;
}

/**
 * Natural coast beyond the masterplan: a coast-following strip on each side (detailed at the
 * waterline) plus a large flat skirt so the ground reaches the horizon inland. The masterplan
 * itself is covered by MasterplanGround.
 */
export class Terrain implements Disposable {
  readonly object = new Group();

  constructor(atmosphere: Atmosphere) {
    const { ground } = MASTERPLAN;
    // North strip runs outward from just inside the masterplan's north edge, south likewise:
    // one row of overlap (slightly lower) hides the seam instead of leaving a hairline crack.
    const segments = [
      rowsFrom(ground.minZ + ROW_SPACING, -1).reverse(),
      rowsFrom(ground.maxZ - ROW_SPACING, 1),
    ];
    const cols = SHORE_OFFSETS.length;
    const rowCount = segments.reduce((sum, rows) => sum + rows.length, 0);
    const positions = new Float32Array(rowCount * cols * 3);
    const colors = new Float32Array(rowCount * cols * 3);
    const indices: number[] = [];
    const sand = new Color(COAST.sandColor);
    const wetSand = new Color(COAST.wetSandColor);
    const groundColor = new Color(COAST.groundColor);
    const color = new Color();

    let row = 0;
    for (const rows of segments) {
      const firstRow = row;
      for (const z of rows) {
        const waterline = shoreX(z);
        for (const [col, offset] of SHORE_OFFSETS.entries()) {
          const x = waterline + offset;
          const distance = landDistance(x, z);
          const i = (row * cols + col) * 3;
          positions[i] = x;
          positions[i + 1] = groundHeightAt(distance, z) - STRIP_DROP;
          positions[i + 2] = z;

          if (distance < 6) color.copy(wetSand);
          else if (distance < 90) color.lerpColors(wetSand, sand, Math.min(1, (distance - 6) / 20));
          else color.lerpColors(sand, groundColor, Math.min(1, (distance - 90) / 160));
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
        }
        row++;
      }
      for (let r = firstRow; r < row - 1; r++) {
        for (let col = 0; col < cols - 1; col++) {
          const a = r * cols + col;
          const b = a + 1;
          const c = a + cols;
          const d = c + 1;
          // Counter-clockwise seen from above, so faces point up.
          indices.push(a, c, b, b, c, d);
        }
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const strip = new Mesh(
      geometry,
      atmosphere.patch(
        new MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
      ),
    );
    strip.receiveShadow = true;
    strip.name = 'terrain-strip';

    const skirtSize = STRIP_REACH * 2;
    const skirt = new Mesh(
      new PlaneGeometry(skirtSize, skirtSize).rotateX(-Math.PI / 2),
      atmosphere.patch(
        new MeshStandardMaterial({ color: groundColor, roughness: 1, metalness: 0 }),
      ),
    );
    // Starts inside both the masterplan ground's east edge and the strip's second-to-last
    // column, so both always overlap it.
    const maxWaterlineX = COAST.waves.reduce((sum, wave) => sum + wave.amplitude, 0);
    const skirtStartX = Math.min(ground.maxX - 200, maxWaterlineX + (SHORE_OFFSETS[cols - 2] ?? 0));
    skirt.position.set(skirtStartX + skirtSize / 2, COAST.landHeight - SKIRT_DROP, 0);
    skirt.receiveShadow = true;
    skirt.name = 'terrain-skirt';

    this.object.add(strip, skirt);
  }

  dispose(): void {
    disposeObject(this.object);
  }
}
