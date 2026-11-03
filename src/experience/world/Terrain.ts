import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { COAST } from '../config/scene';
import type { Disposable } from '../types';
import { disposeObject } from '../utils/dispose';
import type { Atmosphere } from './Atmosphere';
import { waterlineX } from './Coastline';
import type { ShoreField } from './ShoreField';

/** Offsets (m) from the waterline for each terrain column: dense at the beach, sparse inland. */
const SHORE_OFFSETS = [
  -420, -260, -170, -110, -70, -45, -28, -16, -8, -3, 0, 3, 7, 12, 20, 32, 50, 80, 130, 210, 340,
  560, 900, 1400, 2100, 3000, 4200,
];
/** Spacing (m) between terrain rows along the coast, near the masterplan… */
const ROW_SPACING = 30;
/** …growing by this factor per row beyond the detailed zone, out to the strip's ends. */
const ROW_GROWTH = 1.04;
/** Half-length (m) of the strip along the coast: well past the haze horizon. */
const STRIP_HALF_LENGTH = 30_000;

/** Row positions along the coast: fine within the shore field, progressively coarser beyond. */
function rowPositions(detailHalf: number): number[] {
  const outer: number[] = [];
  let spacing = ROW_SPACING;
  for (let z = detailHalf + spacing; z < STRIP_HALF_LENGTH; z += spacing) {
    outer.push(z);
    spacing *= ROW_GROWTH;
  }
  outer.push(STRIP_HALF_LENGTH);
  const inner: number[] = [];
  for (let z = -detailHalf; z <= detailHalf; z += ROW_SPACING) inner.push(z);
  return [...outer.map((z) => -z).reverse(), ...inner, ...outer];
}
/** The far-field ground sits this far below the strip so the two never z-fight. */
const SKIRT_DROP = 1.2;

/** Beach profile: seabed → wet sand at the waterline → dry sand → flat urban ground. */
function heightAt(distance: number): number {
  if (distance < 0) return Math.max(COAST.seabedDepth, distance * 0.045);
  return Math.min(COAST.landHeight, distance * 0.035);
}

/**
 * Coast-following terrain strip (high detail at the waterline) plus a large flat skirt so the
 * ground reaches the horizon inland.
 */
export class Terrain implements Disposable {
  readonly object = new Group();

  constructor(field: ShoreField, atmosphere: Atmosphere) {
    const rowZ = rowPositions(COAST.fieldSize / 2);
    const rows = rowZ.length;
    const cols = SHORE_OFFSETS.length;
    const positions = new Float32Array(rows * cols * 3);
    const colors = new Float32Array(rows * cols * 3);
    const sand = new Color(COAST.sandColor);
    const wetSand = new Color(COAST.wetSandColor);
    const ground = new Color(COAST.groundColor);
    const color = new Color();

    for (let row = 0; row < rows; row++) {
      const z = rowZ[row] ?? 0;
      const shoreX = waterlineX(z);
      for (const [col, offset] of SHORE_OFFSETS.entries()) {
        const x = shoreX + offset;
        const distance = field.sample(x, z);
        const i = (row * cols + col) * 3;
        positions[i] = x;
        positions[i + 1] = heightAt(distance);
        positions[i + 2] = z;

        if (distance < 6) color.copy(wetSand);
        else if (distance < 90) color.lerpColors(wetSand, sand, Math.min(1, (distance - 6) / 20));
        else color.lerpColors(sand, ground, Math.min(1, (distance - 90) / 160));
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
    }

    const indices: number[] = [];
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const a = row * cols + col;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        // Counter-clockwise seen from above, so faces point up.
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = atmosphere.patch(
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
    );
    const strip = new Mesh(geometry, material);
    strip.receiveShadow = true;
    strip.name = 'terrain-strip';

    const skirtSize = STRIP_HALF_LENGTH * 2;
    const skirtGeometry = new PlaneGeometry(skirtSize, skirtSize).rotateX(-Math.PI / 2);
    const skirt = new Mesh(
      skirtGeometry,
      atmosphere.patch(new MeshStandardMaterial({ color: ground, roughness: 1, metalness: 0 })),
    );
    // Starts inland of the strip's second-to-last column (wherever the waterline bulges),
    // so the strip always overlaps it and the skirt only shows beyond the strip.
    const maxWaterlineX = COAST.waves.reduce((sum, wave) => sum + wave.amplitude, 0);
    const skirtStartX = maxWaterlineX + (SHORE_OFFSETS[cols - 2] ?? 0);
    skirt.position.set(skirtStartX + skirtSize / 2, COAST.landHeight - SKIRT_DROP, 0);
    skirt.receiveShadow = true;
    skirt.name = 'terrain-skirt';

    this.object.add(strip, skirt);
  }

  dispose(): void {
    disposeObject(this.object);
  }
}
