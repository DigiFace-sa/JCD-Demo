import type { CubeTexture, IUniform, Material, Texture } from 'three';
import { Vector3 } from 'three';
import { ATMOSPHERE } from '../config/scene';
import { NightLights } from './NightLights';
import atmosphereGlsl from '../shaders/atmosphere.glsl?raw';

export { atmosphereGlsl };

export interface AtmosphereUniforms {
  uAtmoSky: { value: CubeTexture | Texture | null };
  uAtmoHaze: { value: Texture | null };
  uAtmoSunDir: { value: Vector3 };
  uAtmoDensity: { value: number };
  uAtmoFalloff: { value: number };
  uAtmoSunScatter: { value: number };
  uAtmoMaxHaze: { value: number };
}

/**
 * Extra GLSL spliced into a patched standard/physical material. `vAtmoWorldPos` (world
 * position) is available to every snippet.
 */
export interface MaterialExtension {
  /** Unique per extension: distinguishes compiled shader programs. */
  readonly key: string;
  readonly uniforms: Record<string, IUniform>;
  /** Vertex-shader declarations (attributes, varyings). */
  readonly vertexPars?: string;
  /** Runs at the end of the vertex shader's main(). */
  readonly vertexMain?: string;
  /** Fragment-shader declarations and helper functions. */
  readonly fragmentPars: string;
  /** Runs after the base colour is known; may modify `diffuseColor`. */
  readonly afterDiffuse?: string;
  /** Runs after textures and vertex colours have both been applied. */
  readonly afterColor?: string;
  /** Runs after roughness is known; may modify `roughnessFactor`. */
  readonly afterRoughness?: string;
  /** Runs after emissive is known; may add to `totalEmissiveRadiance`. */
  readonly afterEmissive?: string;
  /** Runs after the view-space `normal` is final; may perturb it (e.g. projected normal maps). */
  readonly afterNormal?: string;
}

/**
 * Owns the shared haze uniforms. Uniform objects are shared by reference, so updating
 * them here updates every patched material and the sea at once.
 */
export class Atmosphere {
  /** Lights that switch on at night (registered by the materials that own them). */
  readonly night = new NightLights();
  readonly uniforms: AtmosphereUniforms = {
    uAtmoSky: { value: null },
    uAtmoHaze: { value: null },
    uAtmoSunDir: { value: new Vector3(0, 1, 0) },
    uAtmoDensity: { value: ATMOSPHERE.density },
    uAtmoFalloff: { value: ATMOSPHERE.heightFalloff },
    uAtmoSunScatter: { value: ATMOSPHERE.sunScatter },
    uAtmoMaxHaze: { value: ATMOSPHERE.maxLuminance },
  };

  /**
   * Replace three.js's built-in fog in a standard/physical material with the shared haze,
   * optionally splicing in a material extension (e.g. procedural facades).
   */
  patch<T extends Material>(material: T, extension?: MaterialExtension): T {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms, extension?.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vAtmoWorldPos;')
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
          vec4 atmoWorld = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            atmoWorld = batchingMatrix * atmoWorld;
          #endif
          #ifdef USE_INSTANCING
            atmoWorld = instanceMatrix * atmoWorld;
          #endif
          vAtmoWorldPos = (modelMatrix * atmoWorld).xyz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vAtmoWorldPos;\n${atmosphereGlsl}`,
        )
        .replace(
          '#include <fog_fragment>',
          'gl_FragColor.rgb = applyAtmosphere(gl_FragColor.rgb, vAtmoWorldPos);',
        );
      if (extension) {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${extension.vertexPars ?? ''}`)
          .replace(
            '#include <project_vertex>',
            `#include <project_vertex>\n${extension.vertexMain ?? ''}`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(atmosphereGlsl, `${atmosphereGlsl}\n${extension.fragmentPars}`)
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>\n${extension.afterDiffuse ?? ''}`,
          )
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>\n${extension.afterColor ?? ''}`,
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>\n${extension.afterRoughness ?? ''}`,
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>\n${extension.afterEmissive ?? ''}`,
          )
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>\n${extension.afterNormal ?? ''}`,
          );
      }
    };
    material.customProgramCacheKey = () => `jcdc-atmosphere${extension ? `-${extension.key}` : ''}`;
    return material;
  }
}
