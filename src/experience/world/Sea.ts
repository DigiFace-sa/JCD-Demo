import type { Camera, Texture } from 'three';
import { Color, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
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
 * A lightly subdivided surface that follows the camera; all shading uses world coordinates, so it never swims.
 */
export class Sea implements Updatable, Disposable {
  readonly object: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly waveNormals: Texture;

  constructor(
    atmosphere: Atmosphere,
    shore: { readonly fine: ShoreField; readonly coarse: ShoreField },
    sunLight: Vector3,
  ) {
    this.waveNormals = createWaveNormalMap();
    // A bright day sky floods the water body with blue; scale it so the Red Sea stays deep teal.
    const bodyGain = { value: 1 };
    atmosphere.night.uniform(bodyGain, SEA.dayBodyGain, 1);
    const material = new ShaderMaterial({
      name: 'SeaMaterial',
      vertexShader,
      fragmentShader: fragmentShader.replace('// ATMOSPHERE_GLSL', atmosphereGlsl),
      uniforms: {
        ...atmosphere.uniforms,
        uTime: { value: 0 },
        uWaveNormals: { value: this.waveNormals },
        uShoreFine: { value: shore.fine.texture },
        uShoreFineBounds: { value: shore.fine.bounds },
        uShoreCoarse: { value: shore.coarse.texture },
        uShoreCoarseBounds: { value: shore.coarse.bounds },
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
        uBodyGain: bodyGain,
        uReflection: { value: null },
        uReflectionMatrix: { value: new Matrix4() },
        uReflectionStrength: { value: 0 },
        uReflectionDistortion: { value: SEA.reflectionDistortion },
      },
    });

    const geometry = new PlaneGeometry(
      SEA.size,
      SEA.size,
      SEA.gridSegments,
      SEA.gridSegments,
    ).rotateX(-Math.PI / 2);
    this.object = new Mesh(geometry, material);
    this.object.name = 'sea';
    this.object.frustumCulled = false;
  }

  /** Mirror a planar reflection (texture + world→UV matrix) into the water; null disables it. */
  setReflection(reflection: { texture: Texture; matrix: Matrix4 } | null): void {
    const uniforms = this.object.material.uniforms;
    if (uniforms.uReflection) uniforms.uReflection.value = reflection?.texture ?? null;
    if (uniforms.uReflectionMatrix && reflection)
      uniforms.uReflectionMatrix.value = reflection.matrix;
    if (uniforms.uReflectionStrength)
      uniforms.uReflectionStrength.value = reflection ? SEA.reflectionStrength : 0;
  }

  setAnisotropy(anisotropy: number): void {
    this.waveNormals.anisotropy = anisotropy;
    this.waveNormals.needsUpdate = true;
  }

  /** Keep the surface centred under the camera so the horizon is always covered. */
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
