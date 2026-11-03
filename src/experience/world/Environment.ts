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
const SHADOW_NEAR = 100;
const SHADOW_FAR = 14_000;
/** Shadow extent changes are quantised to this ratio so zooming doesn't shimmer every frame. */
const SHADOW_EXTENT_STEP = 1.25;
/**
 * The shadow frustum only moves in steps of extent × this, and is that much larger than
 * requested so the view stays covered between steps. The scene is static, so the shadow map
 * is re-rendered only when the frustum moves, not every frame.
 */
const SHADOW_FOCUS_STEP = 0.25;
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
  private shadowExtent = 0;
  private shadowPlaced = false;

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
    this.sun.shadow.camera.near = SHADOW_NEAR;
    this.sun.shadow.camera.far = SHADOW_FAR;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.8;
    this.setShadowFocus(new Vector3(), LIGHT.shadowExtent);

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

  /** Centre the sun's shadow frustum on what the camera is looking at. */
  setShadowFocus(focus: Vector3, extent: number): void {
    const padded = extent * (1 + SHADOW_FOCUS_STEP);
    const quantised =
      SHADOW_EXTENT_STEP ** Math.ceil(Math.log(padded) / Math.log(SHADOW_EXTENT_STEP));
    if (quantised !== this.shadowExtent) {
      this.shadowExtent = quantised;
      const camera = this.sun.shadow.camera;
      camera.left = -quantised;
      camera.right = quantised;
      camera.top = quantised;
      camera.bottom = -quantised;
      camera.updateProjectionMatrix();
    }
    // Coarse steps that are whole shadow texels, so shadow edges never crawl between updates.
    const texel = (this.shadowExtent * 2) / this.sun.shadow.mapSize.x;
    const step = Math.max(
      texel,
      Math.round((this.shadowExtent * SHADOW_FOCUS_STEP) / texel) * texel,
    );
    const snappedX = Math.round(focus.x / step) * step;
    const snappedZ = Math.round(focus.z / step) * step;
    const target = this.sun.target.position;
    if (
      target.x === snappedX &&
      target.z === snappedZ &&
      quantised === this.shadowExtent &&
      this.shadowPlaced
    ) {
      return;
    }
    this.shadowPlaced = true;
    target.set(snappedX, 0, snappedZ);
    this.sun.position.copy(target).addScaledVector(this.sunDirection, SUN_DISTANCE);
    this.renderer.shadowMap.needsUpdate = true;
  }

  setShadows(enabled: boolean, mapSize: number): void {
    this.sun.castShadow = enabled;
    this.renderer.shadowMap.needsUpdate = true;
    if (this.sun.shadow.mapSize.x !== mapSize) {
      this.sun.shadow.mapSize.set(mapSize, mapSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
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
    this.sun.shadow.map?.dispose();
    this.sun.dispose();
    this.hemisphere.dispose();
  }
}
