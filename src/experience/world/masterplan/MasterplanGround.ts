import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type IUniform,
} from 'three';
import { DISTRICT_IDS, DISTRICTS } from '../../../data/districts';
import { MASTERPLAN } from '../../config/masterplan';
import { COAST } from '../../config/scene';
import districtGlsl from '../../shaders/district.glsl?raw';
import type { Disposable } from '../../types';
import { distanceToEdges, pointInPolygon } from '../../utils/polygon';
import type { Atmosphere, MaterialExtension } from '../Atmosphere';
import {
  beachWeight,
  groundHeightAt,
  isInsideMasterplan,
  landDistance,
  parkWeight,
} from './MasterplanShape';

/** Ground palette (dusk-friendly, slightly desaturated). */
const PALETTE = {
  seabed: '#7d6a55',
  wetSand: COAST.wetSandColor,
  sand: COAST.sandColor,
  promenade: '#ddd2c2',
  plaza: '#d3c6b2',
  urban: '#c7b8a2',
  grass: '#5f7d45',
  grassLight: '#7a9653',
  context: COAST.groundColor,
} as const;

/** Distance (m) beyond which a vertex counts as fully away from its district edge. */
const EDGE_CLAMP = 60;

export interface DistrictUniforms {
  readonly fillA: IUniform<Vector3>;
  readonly fillB: IUniform<Vector3>;
  readonly lineA: IUniform<Vector3>;
  readonly lineB: IUniform<Vector3>;
}

const smooth = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Cheap deterministic value noise for grass variation. */
function noise2(x: number, z: number): number {
  const s = Math.sin(x * 0.031 + z * 0.017) * Math.sin(x * 0.013 - z * 0.029);
  return 0.5 + 0.5 * s;
}

/** Vertices closer than this fraction of a cell to the waterline are moved onto it. */
const SNAP_RANGE = 0.5;

/**
 * Move a grid vertex that lies near the waterline exactly onto it (one Newton step along the
 * distance gradient), so curved shores follow their true outline instead of stair-stepping
 * across the grid.
 */
function snapToShore(
  x: number,
  z: number,
  cell: number,
): { x: number; z: number; distance: number } {
  const distance = landDistance(x, z, false);
  if (Math.abs(distance) >= cell * SNAP_RANGE) return { x, z, distance };
  const gx = (landDistance(x + 1, z, false) - landDistance(x - 1, z, false)) / 2;
  const gz = (landDistance(x, z + 1, false) - landDistance(x, z - 1, false)) / 2;
  const lengthSq = gx * gx + gz * gz;
  if (lengthSq < 1e-6) return { x, z, distance };
  return { x: x - (distance * gx) / lengthSq, z: z - (distance * gz) / lengthSq, distance: 0 };
}

function columnPositions(): number[] {
  const { minX, detailMaxX, maxX, cell, coarseCell } = MASTERPLAN.ground;
  const columns: number[] = [];
  for (let x: number = minX; x < detailMaxX; x += cell) columns.push(x);
  for (let x: number = detailMaxX; x <= maxX; x += coarseCell) columns.push(x);
  return columns;
}

/**
 * Detailed ground over the masterplan: beach slopes, quay edges, promenades, plazas and
 * gardens as vertex colours, plus per-vertex district data for the highlight shader.
 */
export class MasterplanGround implements Disposable {
  readonly object: Mesh<BufferGeometry, MeshStandardMaterial>;
  /** Overall strength of district glow; faded out by Masterplan when the camera is close. */
  readonly intensity = { value: 1.3 };
  readonly uniforms: DistrictUniforms = {
    fillA: { value: new Vector3() },
    fillB: { value: new Vector3() },
    lineA: { value: new Vector3() },
    lineB: { value: new Vector3() },
  };

  constructor(atmosphere: Atmosphere) {
    const { ground, plazas, promenade } = MASTERPLAN;
    const columns = columnPositions();
    const rows: number[] = [];
    for (let z: number = ground.minZ; z <= ground.maxZ; z += ground.cell) rows.push(z);
    const count = columns.length * rows.length;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const districtA = new Float32Array(count * 3);
    const districtB = new Float32Array(count * 3);
    const districtEdge = new Float32Array(count);
    const palette = Object.fromEntries(
      Object.entries(PALETTE).map(([key, hex]) => [key, new Color(hex)]),
    ) as Record<keyof typeof PALETTE, Color>;
    const color = new Color();
    const polygons = DISTRICT_IDS.map((id) => DISTRICTS[id].polygon);

    let vertex = 0;
    for (const rowZ of rows) {
      for (const columnX of columns) {
        const { x, z, distance } = snapToShore(columnX, rowZ, ground.cell);
        const beach = beachWeight(z);
        const i3 = vertex * 3;
        positions[i3] = x;
        positions[i3 + 1] = groundHeightAt(distance, z);
        positions[i3 + 2] = z;

        // Land use, from the water's edge inland.
        if (distance < 0) {
          color.copy(palette.seabed);
        } else if (beach > 0.5 && distance < 80) {
          color.lerpColors(palette.wetSand, palette.sand, smooth(2, 18, distance));
        } else if (!isInsideMasterplan(x, z)) {
          color.copy(palette.context);
        } else {
          color.copy(
            beach > 0.5 ? palette.urban : distance < promenade ? palette.promenade : palette.urban,
          );
          const green = parkWeight(x, z);
          if (green > 0) {
            color.lerp(palette.grass, green);
            color.lerp(palette.grassLight, green * noise2(x, z) * 0.6);
          }
          for (const plaza of plazas) {
            const paved =
              1 - smooth(plaza.radius - 4, plaza.radius, Math.hypot(x - plaza.x, z - plaza.z));
            if (paved > 0) color.lerp(palette.plaza, paved);
          }
        }
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        const districtIndex = polygons.findIndex((polygon) => pointInPolygon(x, z, polygon));
        const polygon = polygons[districtIndex];
        if (polygon && distance > -8) {
          const target = districtIndex < 3 ? districtA : districtB;
          target[i3 + (districtIndex % 3)] = 1;
          districtEdge[vertex] = Math.min(EDGE_CLAMP, distanceToEdges(x, z, polygon));
        } else {
          districtEdge[vertex] = EDGE_CLAMP;
        }
        vertex++;
      }
    }

    const indices = new Uint32Array((columns.length - 1) * (rows.length - 1) * 6);
    let index = 0;
    for (let r = 0; r < rows.length - 1; r++) {
      for (let c = 0; c < columns.length - 1; c++) {
        const a = r * columns.length + c;
        const b = a + 1;
        const d = a + columns.length;
        const e = d + 1;
        // Counter-clockwise seen from above, so faces point up.
        indices.set([a, d, b, b, d, e], index);
        index += 6;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('aDistrictA', new BufferAttribute(districtA, 3));
    geometry.setAttribute('aDistrictB', new BufferAttribute(districtB, 3));
    geometry.setAttribute('aDistrictEdge', new BufferAttribute(districtEdge, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.computeVertexNormals();

    const material = atmosphere.patch(
      new MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }),
      this.districtExtension(),
    );
    this.object = new Mesh(geometry, material);
    this.object.name = 'masterplan-ground';
    this.object.receiveShadow = true;
  }

  private districtExtension(): MaterialExtension {
    const colors = DISTRICT_IDS.map((id) => {
      const c = new Color(DISTRICTS[id].color);
      return new Vector3(c.r, c.g, c.b);
    });
    return {
      key: 'district',
      uniforms: {
        uDistrictColors: { value: colors },
        uFillA: this.uniforms.fillA,
        uFillB: this.uniforms.fillB,
        uLineA: this.uniforms.lineA,
        uLineB: this.uniforms.lineB,
        uDistrictIntensity: this.intensity,
      },
      vertexPars: `attribute vec3 aDistrictA;
        attribute vec3 aDistrictB;
        attribute float aDistrictEdge;
        varying vec3 vDistrictA;
        varying vec3 vDistrictB;
        varying float vDistrictEdge;`,
      vertexMain: `vDistrictA = aDistrictA;
        vDistrictB = aDistrictB;
        vDistrictEdge = aDistrictEdge;`,
      fragmentPars: districtGlsl,
      afterEmissive: 'totalEmissiveRadiance += districtGlow();',
    };
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
