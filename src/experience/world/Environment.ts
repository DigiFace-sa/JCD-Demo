import type { Texture, WebGLRenderer } from 'three';
import {
  Color,
  CubeCamera,
  DirectionalLight,
  HalfFloatType,
  HemisphereLight,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { LIGHT, RENDER, SKY, SUN } from '../config/scene';
import type { Disposable, Updatable } from '../types';
import type { Atmosphere } from './Atmosphere';

const SKY_CUBE_SIZE = 256;
/** Distance (m) of the shadow-casting sun from its focus point, along the sun direction. */
const SUN_DISTANCE = 6000;
/** Margin (m) added around the fitted shadow frustum in light space. */
const SHADOW_MARGIN = 20;
/** Compass resolution of the baked horizon-haze lookup. */
const HAZE_LUT_SIZE = 256;

/**
 * Bakes the haze colour for every compass direction: a wide weighted average of the sky just
 * above the horizon. Seamless (unlike low cube mips) and one texture fetch per fragment.
 */
const hazeBakeMaterial = (sky: WebGLCubeRenderTarget): ShaderMaterial =>
  new ShaderMaterial({
    name: 'HazeBake',
    uniforms: { uSky: { value: sky.texture } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform samplerCube uSky;
      varying vec2 vUv;
      void main() {
        float azimuth = vUv.x * 6.28318530718;
        vec3 sum = vec3(0.0);
        float weightSum = 0.0;
        // Mip 0 only: lower cube mips are filtered per face and show seams.
        for (int i = -24; i <= 24; i++) {
          for (int j = 0; j < 4; j++) {
            float a = azimuth + float(i) * 0.016; // ±22°
            float e = 0.015 + float(j) * 0.04;    // 1°–8° above the horizon
            vec3 dir = vec3(cos(a) * cos(e), sin(e), sin(a) * cos(e));
            float weight = exp(-float(i * i) / 220.0);
            sum += textureLod(uSky, dir, 0.0).rgb * weight;
            weightSum += weight;
          }
        }
        gl_FragColor = vec4(sum / weightSum, 1.0);
      }`,
  });

/** Unit vector toward the sun from a compass bearing and elevation (see config/scene axes). */
function sunDirectionFrom(bearingDeg: number, elevationDeg: number): Vector3 {
  const bearing = MathUtils.degToRad(bearingDeg);
  const elevation = MathUtils.degToRad(elevationDeg);
  return new Vector3(
    Math.sin(bearing) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(bearing) * Math.cos(elevation),
  );
}

/**
 * Golden-hour sky, sun and ambient light. Bakes the sky into:
 *  - a cube map for sea reflections and horizon haze (shared via Atmosphere), and
 *  - a prefiltered (PMREM) environment map for image-based lighting on PBR materials.
 */
export class Environment implements Updatable, Disposable {
  readonly sky = new Sky();
  readonly sun = new DirectionalLight(LIGHT.sunColor, LIGHT.sunIntensity);
  /** Static map and stadium fits keep separate baked targets, avoiding a shadow draw on return. */
  private readonly mapShadow = this.sun.shadow;
  private readonly stadiumShadow = this.sun.shadow.clone();
  readonly hemisphere = new HemisphereLight(
    LIGHT.hemiSkyColor,
    LIGHT.hemiGroundColor,
    LIGHT.hemiIntensity,
  );
  readonly sunDirection = sunDirectionFrom(SUN.bearingDeg, SUN.elevationDeg);
  /** Linear sun radiance (colour × intensity) for custom shaders. */
  readonly sunLight = new Vector3();

  private readonly skyCube = new WebGLCubeRenderTarget(SKY_CUBE_SIZE, {
    type: HalfFloatType,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
  });
  private readonly hazeTarget = new WebGLRenderTarget(HAZE_LUT_SIZE, 1, {
    type: HalfFloatType,
    wrapS: RepeatWrapping,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
  });
  private environmentMap: Texture | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly renderer: WebGLRenderer,
    private readonly atmosphere: Atmosphere,
  ) {
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const uniforms = this.sky.material.uniforms;
    const set = (name: string, value: number): void => {
      const uniform = uniforms[name];
      if (uniform) uniform.value = value;
    };
    set('turbidity', SKY.turbidity);
    set('rayleigh', SKY.rayleigh);
    set('mieCoefficient', SKY.mieCoefficient);
    set('mieDirectionalG', SKY.mieDirectionalG);
    set('cloudCoverage', SKY.cloudCoverage);
    set('cloudDensity', SKY.cloudDensity);
    set('cloudScale', SKY.cloudScale);
    set('cloudSpeed', SKY.cloudSpeed);
    set('cloudElevation', SKY.cloudElevation);
    this.tameSunDisc();
    (uniforms.sunPosition?.value as Vector3 | undefined)?.copy(this.sunDirection);
    this.sky.scale.setScalar(SKY.size);
    this.sky.name = 'sky';

    const color = new Color(LIGHT.sunColor);
    this.sunLight.set(color.r, color.g, color.b).multiplyScalar(LIGHT.sunIntensity);

    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.8;
    this.stadiumShadow.copy(this.mapShadow);
    const region = LIGHT.shadowRegion;
    this.fitShadow(
      new Vector3(region.minX, 0, region.minZ),
      new Vector3(region.maxX, region.maxHeight, region.maxZ),
    );

    atmosphere.uniforms.uAtmoSunDir.value.copy(this.sunDirection);
    atmosphere.uniforms.uAtmoSky.value = this.skyCube.texture;

    scene.add(this.sky, this.sun, this.sun.target, this.hemisphere);
  }

  /** Replace the Sky shader's fixed ×760 sun disc with a tunable one, and cap its radiance. */
  private tameSunDisc(): void {
    const material = this.sky.material;
    material.uniforms.uSunDiscIntensity = { value: SKY.sunDiscIntensity };
    material.uniforms.uMaxRadiance = { value: SKY.maxRadiance };
    material.uniforms.uSkyTint = { value: new Vector3(...SKY.tint) };
    material.uniforms.uZenithTint = { value: new Vector3(...SKY.zenithTint) };
    material.uniforms.uGlowRolloff = { value: SKY.glowRolloff };
    material.fragmentShader = material.fragmentShader
      .replace(
        'uniform float showSunDisc;',
        'uniform float showSunDisc;\nuniform float uSunDiscIntensity;\nuniform float uMaxRadiance;\nuniform vec3 uSkyTint;\nuniform vec3 uZenithTint;\nuniform float uGlowRolloff;',
      )
      .replace('( 760.0 * sundisc )', '( uSunDiscIntensity * sundisc )')
      // Roll off the broad Mie glow (keeps its colour instead of clipping to white), then add
      // the disc on top so the sun reads as a distinct ball.
      .replace(
        'vec3 texColor = ( Lin + L0 ) * 0.04 + sundiscColor + vec3( 0.0, 0.0003, 0.00075 );',
        `vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
        texColor /= 1.0 + dot( texColor, vec3( 0.2126, 0.7152, 0.0722 ) ) / uGlowRolloff;
        texColor += sundiscColor;`,
      )
      .replace(
        'gl_FragColor = vec4( texColor, 1.0 );',
        `vec3 skyTint = mix( uSkyTint, uZenithTint, smoothstep( 0.03, 0.4, direction.y ) );
        gl_FragColor = vec4( min( texColor * skyTint, vec3( uMaxRadiance ) ), 1.0 );`,
      );
  }

  /** Render the sky into the reflection cube and the PMREM environment. Call once after creation. */
  bake(renderer: WebGLRenderer): void {
    const bakeScene = new Scene();
    const { showSunDisc, cloudCoverage } = this.sky.material.uniforms;
    if (showSunDisc) showSunDisc.value = 0; // the sea adds its own analytic sun highlight
    // Haze and ambient light come from a cloud-free sky: individual clouds near the horizon
    // would otherwise streak the haze by compass direction.
    if (cloudCoverage) cloudCoverage.value = 0;
    bakeScene.add(this.sky);

    const cubeCamera = new CubeCamera(RENDER.near, RENDER.far, this.skyCube);
    cubeCamera.update(renderer, bakeScene);
    this.bakeHaze(renderer);

    const pmrem = new PMREMGenerator(renderer);
    this.environmentMap?.dispose();
    this.environmentMap = pmrem.fromScene(bakeScene, 0, RENDER.near, RENDER.far).texture;
    pmrem.dispose();

    // Final reflection cube includes the clouds, so the sea mirrors them.
    if (cloudCoverage) cloudCoverage.value = SKY.cloudCoverage;
    cubeCamera.update(renderer, bakeScene);

    if (showSunDisc) showSunDisc.value = 1;
    this.scene.add(this.sky);
    this.scene.environment = this.environmentMap;
    this.scene.environmentIntensity = LIGHT.environmentIntensity;
    this.atmosphere.uniforms.uAtmoSky.value = this.skyCube.texture;
    this.atmosphere.uniforms.uAtmoHaze.value = this.hazeTarget.texture;
  }

  private bakeHaze(renderer: WebGLRenderer): void {
    const material = hazeBakeMaterial(this.skyCube);
    const quad = new FullScreenQuad(material);
    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.hazeTarget);
    quad.render(renderer);
    renderer.setRenderTarget(previousTarget);
    quad.dispose();
    material.dispose();
  }

  /**
   * Fit the sun's shadow frustum tightly (in light space) around a world box and render the
   * shadow map once. The world is static and the sun doesn't move, so shadows never re-render
   * during camera moves. With a sun this low, a light-space fit (not a square around the
   * camera) also puts the map's resolution where the ground actually is.
   */
  fitShadow(min: Vector3, max: Vector3): void {
    const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).addScaledVector(this.sunDirection, SUN_DISTANCE);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();
    const camera = this.sun.shadow.camera;
    this.sun.shadow.updateMatrices(this.sun);

    const lightMin = new Vector3(Infinity, Infinity, Infinity);
    const lightMax = new Vector3(-Infinity, -Infinity, -Infinity);
    const corner = new Vector3();
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          lightMin.min(corner);
          lightMax.max(corner);
        }
      }
    }
    camera.left = lightMin.x - SHADOW_MARGIN;
    camera.right = lightMax.x + SHADOW_MARGIN;
    camera.bottom = lightMin.y - SHADOW_MARGIN;
    camera.top = lightMax.y + SHADOW_MARGIN;
    // The camera looks down −z in its own space.
    camera.near = Math.max(1, -lightMax.z - SHADOW_MARGIN);
    camera.far = -lightMin.z + SHADOW_MARGIN;
    camera.updateProjectionMatrix();
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Refit once on entry/exit; reuse the matching static depth map when it has already baked. */
  useShadowRegion(region: 'map' | 'stadium', min: Vector3, max: Vector3): void {
    this.sun.shadow = region === 'map' ? this.mapShadow : this.stadiumShadow;
    const baked = this.sun.shadow.map !== null;
    this.fitShadow(min, max);
    this.sun.shadow.updateMatrices(this.sun);
    this.renderer.shadowMap.needsUpdate = !baked;
  }

  setShadows(enabled: boolean, mapSize: number): void {
    this.sun.castShadow = enabled;
    this.renderer.shadowMap.needsUpdate = true;
    for (const shadow of [this.mapShadow, this.stadiumShadow]) {
      if (shadow.mapSize.x === mapSize) continue;
      shadow.mapSize.set(mapSize, mapSize);
      shadow.dispose();
      shadow.map = null;
      shadow.mapPass = null;
    }
  }

  update(_delta: number, elapsed: number): void {
    const time = this.sky.material.uniforms.time;
    if (time) time.value = elapsed;
  }

  dispose(): void {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.skyCube.dispose();
    this.hazeTarget.dispose();
    this.environmentMap?.dispose();
    this.mapShadow.dispose();
    this.stadiumShadow.dispose();
    this.sun.dispose();
    this.hemisphere.dispose();
  }
}
