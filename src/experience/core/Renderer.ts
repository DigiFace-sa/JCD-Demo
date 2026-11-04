import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';

/** True if the browser can create a WebGL2 context (required by the Experience). */
export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false, // MSAA happens in the composer's HDR target
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}

/**
 * GPU description for quality detection and the debug panel. Modern browsers expose the
 * unmasked name via RENDERER; the deprecated debug extension is only a fallback (Safari).
 */
export function gpuName(renderer: WebGLRenderer): string {
  const gl = renderer.getContext();
  const name = String(gl.getParameter(gl.RENDERER));
  if (name !== 'WebKit WebGL') return name;
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : name;
}
