import { Color, type IUniform } from 'three';
import { COAST, FACADE } from '../config/scene';
import facadeGlsl from '../shaders/facade.glsl?raw';
import type { MaterialExtension } from './Atmosphere';
import type { NightLights } from './NightLights';

export interface FacadeHighlight {
  /** 0–1, animated by the owner (e.g. when the building's district is selected). */
  readonly level: IUniform<number>;
  readonly color: Color;
}

/** Strength of the highlight glow at level 1 (linear HDR). */
const HIGHLIGHT_GAIN = 0.45;
/** Cool white of office lighting (linear RGB), for the share of buildings not lit warm. */
const COOL_LIGHT = 'vec3(0.78, 0.86, 1.0)';

/**
 * Procedural glazing + dusk window lights for box buildings (pass to Atmosphere.patch).
 * With `highlight`, the buildings can also glow in a district's colour.
 */
export function facadeExtension(
  night: NightLights,
  highlight?: FacadeHighlight,
): MaterialExtension {
  const light = new Color(FACADE.lightColor);
  const lightLevel = { value: FACADE.lightIntensity };
  const litFraction = { value: FACADE.litFraction };
  // After dark many more windows are lit, and brighter (enough to bloom on the High tier).
  night.uniform(litFraction, FACADE.litFraction, FACADE.nightLitFraction);
  night.uniform(lightLevel, FACADE.lightIntensity, FACADE.nightLightIntensity);
  return {
    key: highlight ? 'facade-highlight' : 'facade',
    uniforms: {
      uFacadeBase: { value: COAST.landHeight },
      uFacadeFloorHeight: { value: FACADE.floorHeight },
      uFacadeBayWidth: { value: FACADE.bayWidth },
      uFacadeLitFraction: litFraction,
      uFacadeLight: { value: light },
      uFacadeLightLevel: lightLevel,
      ...(highlight && {
        uHighlight: highlight.level,
        uHighlightColor: { value: highlight.color.clone().multiplyScalar(HIGHLIGHT_GAIN) },
      }),
    },
    fragmentPars: `${facadeGlsl}
      vec2 facade;
      uniform float uFacadeLightLevel;
      ${highlight ? 'uniform float uHighlight;\nuniform vec3 uHighlightColor;' : ''}`,
    afterDiffuse: `facade = facadeSample(vAtmoWorldPos);
      diffuseColor.rgb *= mix(1.0, ${FACADE.glazingDarken.toFixed(2)}, facade.x);`,
    afterRoughness: `roughnessFactor = mix(roughnessFactor, ${FACADE.glazingRoughness.toFixed(2)}, facade.x);`,
    afterEmissive: `totalEmissiveRadiance += mix(${COOL_LIGHT}, uFacadeLight, facadeWarmth) * uFacadeLightLevel * facade.y;
      ${highlight ? 'totalEmissiveRadiance += uHighlightColor * uHighlight;' : ''}`,
  };
}
