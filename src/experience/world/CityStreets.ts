import { Color, Vector3 } from 'three';
import { MASTERPLAN } from '../config/masterplan';
import { COAST, CONTEXT_CITY } from '../config/scene';
import type { MaterialExtension } from './Atmosphere';
import type { NightLights } from './NightLights';

/** Asphalt albedo (multiplier on the ground) and the street lighting after dark. */
const STREETS = {
  asphalt: 0.62,
  lampSpacing: 32,
  color: '#ffb36e',
  night: 0.22,
} as const;

/**
 * The context city's street grid painted onto the terrain (ContextCity's block layout): darker
 * asphalt by day, and at night warm lamp-lit roads with brighter pools at each lamp, so the city
 * reads as a lit grid around its buildings rather than dark ground.
 */
export function cityStreetsExtension(night: NightLights): MaterialExtension {
  const { blockSize, streetWidth, inlandStart, inlandEnd } = CONTEXT_CITY;
  const level = { value: 0 };
  night.uniform(level, 0, STREETS.night);
  const waves = COAST.waves.map(
    (wave) => new Vector3(wave.amplitude, (Math.PI * 2) / wave.wavelength, wave.phase),
  );
  const { exclusion } = MASTERPLAN;
  return {
    key: 'city-streets',
    uniforms: {
      uStreetLevel: level,
      uStreetColor: { value: new Color(STREETS.color) },
      uStreetWaves: { value: waves },
      uStreetExclusion: { value: new Vector3(exclusion.maxX, exclusion.minZ, exclusion.maxZ) },
    },
    fragmentPars: `
      uniform float uStreetLevel;
      uniform vec3 uStreetColor;
      uniform vec3 uStreetWaves[${waves.length}];
      uniform vec3 uStreetExclusion;
      float streetMask;
      float streetLamps;
      void cityStreets(vec3 p) {
        streetMask = 0.0;
        streetLamps = 0.0;
        float shore = 0.0;
        for (int i = 0; i < ${waves.length}; i++) {
          shore += uStreetWaves[i].x * sin(p.z * uStreetWaves[i].y + uStreetWaves[i].z);
        }
        float inland = p.x - shore;
        if (inland < ${(inlandStart - streetWidth).toFixed(1)} || inland > ${(inlandEnd + streetWidth).toFixed(1)}) return;
        if (p.x < uStreetExclusion.x && p.z > uStreetExclusion.y && p.z < uStreetExclusion.z) return;
        // Street centrelines sit between blocks (blocks are centred on half-pitch offsets).
        float pitch = ${(blockSize + streetWidth).toFixed(1)};
        vec2 cell = (p.xz + ${(COAST.fieldSize / 2).toFixed(1)}) / pitch;
        vec2 toStreet = abs(fract(cell + 0.5) - 0.5) * pitch;
        vec2 blur = fwidth(cell) * pitch;
        float halfWidth = ${(streetWidth / 2).toFixed(1)};
        vec2 road = 1.0 - smoothstep(halfWidth - 1.5 - blur, halfWidth + blur, toStreet);
        streetMask = max(road.x, road.y);
        // Lamp pools along each road (x-roads run along z and vice versa).
        vec2 along = abs(fract(p.zx / ${STREETS.lampSpacing.toFixed(1)}) - 0.5) * ${STREETS.lampSpacing.toFixed(1)};
        vec2 pool = exp(-along * along / 40.0);
        float detail = clamp(1.0 - max(blur.x, blur.y) / 6.0, 0.0, 1.0);
        vec2 lamps = mix(vec2(0.3), pool, detail);
        streetLamps = max(road.x * (0.35 + lamps.x), road.y * (0.35 + lamps.y));
      }`,
    afterDiffuse: `cityStreets(vAtmoWorldPos);
      diffuseColor.rgb *= mix(1.0, ${STREETS.asphalt.toFixed(2)}, streetMask);`,
    afterEmissive: 'totalEmissiveRadiance += uStreetColor * uStreetLevel * streetLamps;',
  };
}
