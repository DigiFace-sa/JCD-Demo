import { Color } from 'three';
import { COAST, FACADE } from '../config/scene';
import facadeGlsl from '../shaders/facade.glsl?raw';
import type { MaterialExtension } from './Atmosphere';

/** Procedural glazing + dusk window lights for box buildings (pass to Atmosphere.patch). */
export function facadeExtension(): MaterialExtension {
  const light = new Color(FACADE.lightColor).multiplyScalar(FACADE.lightIntensity);
  return {
    key: 'facade',
    uniforms: {
      uFacadeBase: { value: COAST.landHeight },
      uFacadeFloorHeight: { value: FACADE.floorHeight },
      uFacadeBayWidth: { value: FACADE.bayWidth },
      uFacadeLitFraction: { value: FACADE.litFraction },
      uFacadeLight: { value: light },
    },
    fragmentPars: `${facadeGlsl}\nvec2 facade;`,
    afterDiffuse: `facade = facadeSample(vAtmoWorldPos);
      diffuseColor.rgb *= mix(1.0, ${FACADE.glazingDarken.toFixed(2)}, facade.x);`,
    afterRoughness: `roughnessFactor = mix(roughnessFactor, ${FACADE.glazingRoughness.toFixed(2)}, facade.x);`,
    afterEmissive: 'totalEmissiveRadiance += uFacadeLight * facade.y;',
  };
}
