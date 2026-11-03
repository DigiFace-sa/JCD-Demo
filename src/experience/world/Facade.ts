import { Color, type IUniform } from 'three';
import { COAST, FACADE } from '../config/scene';
import facadeGlsl from '../shaders/facade.glsl?raw';
import type { MaterialExtension } from './Atmosphere';

export interface FacadeHighlight {
  /** 0–1, animated by the owner (e.g. when the building's district is selected). */
  readonly level: IUniform<number>;
  readonly color: Color;
}

/** Strength of the highlight glow at level 1 (linear HDR). */
const HIGHLIGHT_GAIN = 0.45;

/**
 * Procedural glazing + dusk window lights for box buildings (pass to Atmosphere.patch).
 * With `highlight`, the buildings can also glow in a district's colour.
 */
export function facadeExtension(highlight?: FacadeHighlight): MaterialExtension {
  const light = new Color(FACADE.lightColor).multiplyScalar(FACADE.lightIntensity);
  return {
    key: highlight ? 'facade-highlight' : 'facade',
    uniforms: {
      uFacadeBase: { value: COAST.landHeight },
      uFacadeFloorHeight: { value: FACADE.floorHeight },
      uFacadeBayWidth: { value: FACADE.bayWidth },
      uFacadeLitFraction: { value: FACADE.litFraction },
      uFacadeLight: { value: light },
      ...(highlight && {
        uHighlight: highlight.level,
        uHighlightColor: { value: highlight.color.clone().multiplyScalar(HIGHLIGHT_GAIN) },
      }),
    },
    fragmentPars: `${facadeGlsl}
      vec2 facade;
      ${highlight ? 'uniform float uHighlight;\nuniform vec3 uHighlightColor;' : ''}`,
    afterDiffuse: `facade = facadeSample(vAtmoWorldPos);
      diffuseColor.rgb *= mix(1.0, ${FACADE.glazingDarken.toFixed(2)}, facade.x);`,
    afterRoughness: `roughnessFactor = mix(roughnessFactor, ${FACADE.glazingRoughness.toFixed(2)}, facade.x);`,
    afterEmissive: `totalEmissiveRadiance += uFacadeLight * facade.y;
      ${highlight ? 'totalEmissiveRadiance += uHighlightColor * uHighlight;' : ''}`,
  };
}
