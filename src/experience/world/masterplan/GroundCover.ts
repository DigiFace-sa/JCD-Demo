import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  Vector3,
  Vector4,
} from 'three';
import { LANDMARKS } from '../../../data/landmarks';
import { MASTERPLAN } from '../../config/masterplan';
import { STADIUM } from '../../config/stadium';
import type { Disposable } from '../../types';
import type { OpenSpace } from './OpenSpace';
import { beachWeight, isInsideMasterplan, landDistance, parkWeight } from './MasterplanShape';

/** Metres per texel: lawn edges are independent of the much coarser terrain triangles. */
const COVER_CELL = 3;
/** Keep a generous paved apron beneath the Oceanarium's asymmetric canopies. */
const OCEAN_APRON = { minX: -118, maxX: 72, minZ: -78, maxZ: 80 } as const;
/** Stadium grove planting beds: same spacing as Landscape.GROVE (metres). */
const GROVE_BED = { spacing: 17, radius: 6.5, reach: 330 };
/** Park loop radius relative to park extent, shared with path-lamp placement. */
export const PARK_PATH_RADIUS = 0.82;
/** Lawn colours are restrained so the planting, rather than the ground, carries the greenery. */
const COVER_COLOR = { grass: '#697746', paving: '#d3c6b2' } as const;

/** Shared by the ground and planting: no lawns under buildings, canopies or the stadium approach. */
export function landmarkPaving(x: number, z: number): boolean {
  const stadium = LANDMARKS.stadium.position;
  const dx = x - stadium.x;
  const dz = z - stadium.z;
  if (Math.abs(dx) < STADIUM.exterior.hx + 8 && Math.abs(dz) < STADIUM.exterior.hz + 8) return true;
  if (dx > 0 && dx < 340 && Math.abs(dz) < STADIUM.approachHalfWidth + 6) return true;
  const ocean = LANDMARKS.oceanarium.position;
  if (
    x - ocean.x > OCEAN_APRON.minX &&
    x - ocean.x < OCEAN_APRON.maxX &&
    z - ocean.z > OCEAN_APRON.minZ &&
    z - ocean.z < OCEAN_APRON.maxZ
  )
    return true;
  const opera = LANDMARKS['opera-house'].position;
  const cos = Math.cos(-0.22);
  const sin = Math.sin(-0.22);
  const ox = (x - opera.x) * cos - (z - opera.z) * sin;
  const oz = (x - opera.x) * sin + (z - opera.z) * cos;
  return Math.abs(ox) < 84 && Math.abs(oz) < 44;
}

/** Distance to the illustrative park loops; planting and pavement share the same path. */
export function parkPathDistance(x: number, z: number): number {
  return Math.min(
    ...MASTERPLAN.parks.map((park) =>
      Math.abs(Math.hypot(x - park.x, z - park.z) - park.radius * PARK_PATH_RADIUS),
    ),
  );
}

function stadiumBed(x: number, z: number): number {
  const dx = x - LANDMARKS.stadium.position.x;
  const dz = z - LANDMARKS.stadium.position.z;
  if (Math.hypot(dx, dz) > GROVE_BED.reach || landmarkPaving(x, z)) return 0;
  const gx =
    Math.round((dx + GROVE_BED.reach) / GROVE_BED.spacing) * GROVE_BED.spacing - GROVE_BED.reach;
  const gz =
    Math.round((dz + GROVE_BED.reach) / GROVE_BED.spacing) * GROVE_BED.spacing - GROVE_BED.reach;
  return Math.min(1, Math.max(0, GROVE_BED.radius - Math.hypot(dx - gx, dz - gz)));
}

/** A small, mipmapped land-use field: R lawn, G paved plaza. No extra draw calls. */
export class GroundCover implements Disposable {
  private readonly texture: DataTexture;
  readonly uniforms;
  readonly fragmentPars = `
    uniform sampler2D uGroundCover;
    uniform vec4 uCoverBounds;
    uniform vec3 uGrassColor;
    uniform vec3 uPavingColor;
    uniform vec3 uParkLoops[${MASTERPLAN.parks.length}];
    float grassHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float grassNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(grassHash(i), grassHash(i + vec2(1,0)), f.x),
        mix(grassHash(i + vec2(0,1)), grassHash(i + vec2(1,1)), f.x), f.y);
    }
  `;
  readonly afterColor = `{
    vec2 uv = (vAtmoWorldPos.xz - uCoverBounds.xy) / uCoverBounds.zw;
    vec2 cover = texture2D(uGroundCover, uv).rg;
    float inside = step(0.0, uv.x) * step(0.0, uv.y) * step(uv.x, 1.0) * step(uv.y, 1.0);
    cover *= inside;
    // Analytic path edges avoid scalloping on the narrow loops at the mask's texel scale.
    float pathDistance = 10000.0;
    for (int i = 0; i < ${MASTERPLAN.parks.length}; i++) {
      pathDistance = min(pathDistance, abs(length(vAtmoWorldPos.xz - uParkLoops[i].xy) - uParkLoops[i].z));
    }
    float pathAA = max(fwidth(pathDistance), 0.3);
    float path = 1.0 - smoothstep(2.2 - pathAA, 2.2 + pathAA, pathDistance);
    cover.g = max(cover.g, path * cover.r);
    float footprint = max(length(dFdx(vAtmoWorldPos.xz)), length(dFdy(vAtmoWorldPos.xz)));
    float detail = (grassNoise(vAtmoWorldPos.xz * 2.0) - 0.5)
      * (1.0 - smoothstep(0.2, 1.0, footprint));
    float broad = grassNoise(vAtmoWorldPos.xz * 0.09) - 0.5;
    vec3 grass = uGrassColor * (1.0 + broad * 0.12 + detail * 0.16);
    diffuseColor.rgb = mix(diffuseColor.rgb, grass, cover.r);
    diffuseColor.rgb = mix(diffuseColor.rgb, uPavingColor, cover.g);
  }`;

  constructor(openSpace: OpenSpace) {
    const minX = MASTERPLAN.ground.minX;
    const minZ = MASTERPLAN.exclusion.minZ;
    const width = Math.ceil((MASTERPLAN.exclusion.maxX - minX) / COVER_CELL);
    const height = Math.ceil((MASTERPLAN.exclusion.maxZ - minZ) / COVER_CELL);
    const data = new Uint8Array(width * height * 4);
    for (let row = 0; row < height; row++) {
      const z = minZ + (row + 0.5) * COVER_CELL;
      const beach = beachWeight(z) > 0.5;
      for (let col = 0; col < width; col++) {
        const x = minX + (col + 0.5) * COVER_CELL;
        const index = (row * width + col) * 4;
        const distance = landDistance(x, z, false);
        if (!isInsideMasterplan(x, z) || distance < (beach ? 85 : MASTERPLAN.promenade)) continue;
        let lawn = Math.max(openSpace.lawn(x, z), parkWeight(x, z));
        let paved = landmarkPaving(x, z) ? 1 : 0;
        for (const plaza of MASTERPLAN.plazas) {
          // Crisp paths and forecourts, antialiased by the filtered land-use texture.
          paved = Math.max(
            paved,
            Math.min(1, Math.max(0, plaza.radius - Math.hypot(x - plaza.x, z - plaza.z))),
          );
        }
        const bed = stadiumBed(x, z);
        if (bed > 0) {
          lawn = Math.max(lawn, bed);
          paved *= 1 - bed;
        }
        if (openSpace.distanceToBuilding(x, z) < 4) lawn = 0;
        data[index] = Math.round(lawn * (1 - paved) * 255);
        data[index + 1] = Math.round(paved * 255);
        data[index + 3] = 255;
      }
    }
    this.texture = new DataTexture(data, width, height, RGBAFormat);
    this.texture.magFilter = LinearFilter;
    this.texture.minFilter = LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.anisotropy = 8;
    this.texture.needsUpdate = true;
    this.uniforms = {
      uGroundCover: { value: this.texture },
      uCoverBounds: { value: new Vector4(minX, minZ, width * COVER_CELL, height * COVER_CELL) },
      uGrassColor: { value: new Color(COVER_COLOR.grass) },
      uPavingColor: { value: new Color(COVER_COLOR.paving) },
      uParkLoops: {
        value: MASTERPLAN.parks.map(
          (park) => new Vector3(park.x, park.z, park.radius * PARK_PATH_RADIUS),
        ),
      },
    };
  }

  dispose(): void {
    this.texture.dispose();
  }
}
