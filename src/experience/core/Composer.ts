import type { Camera, Scene, WebGLRenderer } from 'three';
import {
  HalfFloatType,
  NoBlending,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import { POST } from '../config/scene';
import type { Disposable } from '../types';
import type { QualitySettings } from './Quality';

/** Bloom that runs its blur chain at a fraction of the render size (cheaper on lower tiers). */
class ScaledBloomPass extends UnrealBloomPass {
  constructor(
    private readonly scale: number,
    strength: number,
    radius: number,
    threshold: number,
  ) {
    super(new Vector2(256, 256), strength, radius, threshold);
  }

  override setSize(width: number, height: number): void {
    super.setSize(
      Math.max(1, Math.round(width * this.scale)),
      Math.max(1, Math.round(height * this.scale)),
    );
  }
}

/**
 * Renders the scene into its own multisampled HDR target and resolves it once into the
 * composer's (single-sampled) buffer. Multisampling the composer's buffers instead would make
 * every post pass that draws into them (bloom's blend, etc.) pay for MSAA and an extra resolve.
 */
class MultisampleRenderPass extends Pass {
  private readonly target: WebGLRenderTarget;
  private readonly copyMaterial = new ShaderMaterial({
    uniforms: UniformsUtils.clone(CopyShader.uniforms),
    vertexShader: CopyShader.vertexShader,
    fragmentShader: CopyShader.fragmentShader,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  });
  private readonly quad = new FullScreenQuad(this.copyMaterial);

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    samples: number,
  ) {
    super();
    this.needsSwap = false;
    this.target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples });
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(width, height);
  }

  override render(
    renderer: WebGLRenderer,
    _writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ): void {
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    const diffuse = this.copyMaterial.uniforms.tDiffuse;
    if (diffuse) diffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.target.dispose();
    this.copyMaterial.dispose();
    this.quad.dispose();
  }
}

/** Final display-space pass: soft vignette plus sub-LSB noise so sunset gradients never band. */
const FinishShader = {
  name: 'FinishShader',
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: POST.vignette },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 centred = vUv - 0.5;
      color.rgb *= 1.0 - smoothstep(0.2, 0.95, length(centred) * 1.25) * uVignette;
      color.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
      gl_FragColor = color;
    }`,
};

/**
 * Post-processing chain: HDR render (MSAA) → bloom → ACES tone map + sRGB → vignette/dither.
 * Rebuilt whenever the quality tier changes (MSAA sample count is fixed per render target).
 */
export class Composer implements Disposable {
  private composer: EffectComposer | null = null;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {}

  configure(settings: QualitySettings, width: number, height: number, pixelRatio: number): void {
    this.disposeComposer();
    const target = new WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      type: HalfFloatType,
    });
    const composer = new EffectComposer(this.renderer, target);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);

    composer.addPass(
      settings.msaaSamples > 0
        ? new MultisampleRenderPass(this.scene, this.camera, settings.msaaSamples)
        : new RenderPass(this.scene, this.camera),
    );
    if (settings.bloom) {
      composer.addPass(
        new ScaledBloomPass(
          settings.bloomScale,
          POST.bloomStrength,
          POST.bloomRadius,
          POST.bloomThreshold,
        ),
      );
    }
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass(FinishShader));
    this.composer = composer;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(width, height);
  }

  render(delta: number): void {
    this.composer?.render(delta);
  }

  private disposeComposer(): void {
    if (!this.composer) return;
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose();
    this.composer = null;
  }

  dispose(): void {
    this.disposeComposer();
  }
}
