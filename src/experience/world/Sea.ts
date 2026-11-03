import type { Camera, Texture } from 'three';
import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { SEA } from '../config/scene';
import fragmentShader from '../shaders/sea.frag.glsl?raw';
import vertexShader from '../shaders/sea.vert.glsl?raw';
import type { Disposable, Updatable } from '../types';
import { type Atmosphere, atmosphereGlsl } from './Atmosphere';
import type { ShoreField } from './ShoreField';
import { createWaveNormalMap } from './waveNormals';

/**
 * Animated Red Sea surface: sky reflection with Fresnel, sun glitter path (HDR, feeds bloom),
 * shallow turquoise and foam along the shore, shared aerial perspective.
 * One huge quad that follows the camera; all shading uses world coordinates, so it never swims.
 */
export class Sea implements Updatable, Disposable {
  readonly object: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly waveNormals: Texture;

  constructor(atmosphere: Atmosphere, field: ShoreField, sunLight: Vector3) {
    this.waveNormals = createWaveNormalMap();
    const material = new ShaderMaterial({
      name: 'SeaMaterial',
      vertexShader,
      fragmentShader: fragmentShader.replace('// ATMOSPHERE_GLSL', atmosphereGlsl),
      uniforms: {
        ...atmosphere.uniforms,
        uTime: { value: 0 },
        uWaveNormals: { value: this.waveNormals },
        uShoreField: { value: field.texture },
        uShoreBounds: { value: field.bounds },
        uDeepColor: { value: new Color(SEA.deepColor) },
        uShallowColor: { value: new Color(SEA.shallowColor) },
        uFoamColor: { value: new Color(SEA.foamColor) },
        uSunLight: { value: sunLight },
        uShallowDistance: { value: SEA.shallowDistance },
        uFoamDistance: { value: SEA.foamDistance },
        uSunGlitter: { value: SEA.sunGlitter },
        uSunSheen: { value: SEA.sunSheen },
        uNormalStrength: { value: SEA.normalStrength },
        uMaxRadiance: { value: SEA.maxRadiance },
      },
    });

    const geometry = new PlaneGeometry(SEA.size, SEA.size).rotateX(-Math.PI / 2);
    this.object = new Mesh(geometry, material);
    this.object.name = 'sea';
    this.object.frustumCulled = false;
  }

  setAnisotropy(anisotropy: number): void {
    this.waveNormals.anisotropy = anisotropy;
    this.waveNormals.needsUpdate = true;
  }

  /** Keep the quad centred under the camera so the horizon is always covered. */
  follow(camera: Camera): void {
    this.object.position.x = camera.position.x;
    this.object.position.z = camera.position.z;
  }

  update(_delta: number, elapsed: number): void {
    const uniform = this.object.material.uniforms.uTime;
    if (uniform) uniform.value = elapsed;
  }

  dispose(): void {
    this.waveNormals.dispose();
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
