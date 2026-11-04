import {
  Color,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import type { Atmosphere } from '../Atmosphere';

/** CC0 material sets in public/textures/<id>/ (see assets/cc0-textures.json). */
export type TextureSet = 'limestone' | 'plaster' | 'timber' | 'paving' | 'coral-stone';

interface MapSet {
  readonly color: Texture;
  readonly normal: Texture;
  readonly rough: Texture;
  /** Average linear colour of the colour map, so a tint can set the hue exactly. */
  readonly mean: Color;
}

/** Side of the canvas the colour map is averaged on. */
const MEAN_SAMPLE = 32;

/** Average colour of an image (sRGB pixels → linear), measured on a small downsample. */
function meanColor(texture: Texture): Color {
  const image = texture.image as CanvasImageSource;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MEAN_SAMPLE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const mean = new Color(0.5, 0.5, 0.5);
  if (!context) return mean;
  context.drawImage(image, 0, 0, MEAN_SAMPLE, MEAN_SAMPLE);
  const { data } = context.getImageData(0, 0, MEAN_SAMPLE, MEAN_SAMPLE);
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
  }
  const count = (data.length / 4) * 255;
  return mean.setRGB(r / count, g / count, b / count, SRGBColorSpace);
}

const ANISOTROPY = 8;
/** Night architectural lighting: warm colour, ground level (m) and height falloff (m). */
const NIGHT_LIGHT_COLOR = '#ffb56b';
const NIGHT_BASE = 2.5;
const NIGHT_FALLOFF = 18;
const loader = new TextureLoader();
const cache = new Map<TextureSet, Promise<MapSet>>();

function load(url: string, color: boolean): Promise<Texture> {
  return loader.loadAsync(url).then((texture) => {
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = ANISOTROPY;
    return texture;
  });
}

/** Loads (once per session) a material's colour, normal and roughness maps. */
export function textureSet(id: TextureSet): Promise<MapSet> {
  let promise = cache.get(id);
  if (!promise) {
    const base = `textures/${id}`;
    promise = Promise.all([
      load(`${base}/color.jpg`, true),
      load(`${base}/normal.jpg`, false),
      load(`${base}/rough.jpg`, false),
    ]).then(([color, normal, rough]) => ({ color, normal, rough, mean: meanColor(color) }));
    cache.set(id, promise);
  }
  return promise;
}

export interface BoxMappedOptions {
  readonly maps: MapSet;
  /** Real-world size (m) of one texture tile. */
  readonly tile: number;
  /** Multiplied with the texture colour (and the model's baked occlusion). */
  readonly tint: string;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly normalStrength?: number;
  readonly emissive?: string;
  readonly emissiveIntensity?: number;
  /** Strength of the photographed variation around the tint (0 = flat tint, 1 = as scanned). */
  readonly detail?: number;
  /**
   * Night architectural lighting (radiance at full night): `walls` washes vertical faces with
   * warm uplight fading with height; `tops` glows upward faces, like light through louvres.
   */
  readonly night?: {
    readonly walls?: number;
    readonly tops?: number;
    /** Height (m) over which the wall wash fades (default NIGHT_FALLOFF). */
    readonly falloff?: number;
    /** Spacing (m) of ground uplights: bright scallops between darker gaps (0 = even wash). */
    readonly spacing?: number;
  };
}

/**
 * PBR material for axis-aligned architecture: textures are projected in world metres along the
 * face's dominant axis (box mapping), so models need no UVs and every façade, slab and louvre
 * gets consistently scaled stone or timber. Vertex colours carry the occlusion baked in Blender.
 * One projection per pixel (not a blended triplanar): exact on axis-aligned faces, and cheap.
 */
export function boxMappedMaterial(
  atmosphere: Atmosphere,
  options: BoxMappedOptions,
): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: new Color(options.tint),
    roughness: options.roughness ?? 1,
    metalness: options.metalness ?? 0,
    vertexColors: true,
    emissive: options.emissive ? new Color(options.emissive) : new Color(0x000000),
    emissiveIntensity: options.emissiveIntensity ?? 1,
  });
  const wallLight = { value: 0 };
  const topLight = { value: 0 };
  atmosphere.night.uniform(wallLight, 0, options.night?.walls ?? 0);
  atmosphere.night.uniform(topLight, 0, options.night?.tops ?? 0);
  return atmosphere.patch(material, {
    key: 'box-mapped',
    uniforms: {
      uBoxColor: { value: options.maps.color },
      uBoxNormal: { value: options.maps.normal },
      uBoxRough: { value: options.maps.rough },
      uBoxTile: { value: options.tile },
      uBoxNormalStrength: { value: options.normalStrength ?? 1 },
      uBoxMean: { value: options.maps.mean },
      uBoxDetail: { value: options.detail ?? 1 },
      uNightWall: wallLight,
      uNightTop: topLight,
      uNightColor: { value: new Color(NIGHT_LIGHT_COLOR) },
      uNightFalloff: { value: options.night?.falloff ?? NIGHT_FALLOFF },
      uNightSpacing: { value: options.night?.spacing ?? 0 },
    },
    vertexPars: 'varying vec3 vBoxNormal;',
    vertexMain: 'vBoxNormal = normalize(mat3(modelMatrix) * objectNormal);',
    fragmentPars: `
      uniform sampler2D uBoxColor;
      uniform sampler2D uBoxNormal;
      uniform sampler2D uBoxRough;
      uniform float uBoxTile;
      uniform float uBoxNormalStrength;
      uniform vec3 uBoxMean;
      uniform float uBoxDetail;
      uniform float uNightWall;
      uniform float uNightTop;
      uniform vec3 uNightColor;
      uniform float uNightFalloff;
      uniform float uNightSpacing;
      varying vec3 vBoxNormal;
      vec2 boxUv;
      vec3 boxAxis;
      void boxProject() {
        vec3 n = abs(normalize(vBoxNormal));
        vec3 p = vAtmoWorldPos / uBoxTile;
        if (n.x >= n.y && n.x >= n.z) { boxUv = p.zy; boxAxis = vec3(1.0, 0.0, 0.0); }
        else if (n.y >= n.z) { boxUv = p.xz; boxAxis = vec3(0.0, 1.0, 0.0); }
        else { boxUv = p.xy; boxAxis = vec3(0.0, 0.0, 1.0); }
      }`,
    afterDiffuse: `
      boxProject();
      // Texture normalised by its mean: the tint is the average colour, the photo adds detail.
      vec3 boxDetail = texture2D(uBoxColor, boxUv).rgb / max(uBoxMean, vec3(0.02));
      diffuseColor.rgb = min(diffuseColor.rgb * mix(vec3(1.0), boxDetail, uBoxDetail), vec3(0.95));`,
    afterRoughness: 'roughnessFactor *= texture2D(uBoxRough, boxUv).g;',
    // Night: warm grazing uplight on walls (strongest at the base, like ground-mounted washers)
    // and a glow on upward faces; both coloured by the surface itself, so stone reads as stone.
    afterEmissive: `{
      vec3 n = normalize(vBoxNormal);
      float rise = max(vAtmoWorldPos.y - ${NIGHT_BASE.toFixed(1)}, 0.0);
      float wall = (1.0 - abs(n.y)) * exp(-rise / uNightFalloff);
      if (uNightSpacing > 0.0) {
        // Each uplight's cone: narrow and bright at the base, widening and merging with height.
        float across = (fract(boxUv.x * uBoxTile / uNightSpacing) - 0.5) * uNightSpacing;
        float spread = 0.6 + rise * 0.35;
        wall *= 0.25 + 1.5 * exp(-across * across / (spread * spread));
      }
      float top = max(n.y, 0.0);
      totalEmissiveRadiance += uNightColor * diffuseColor.rgb * (uNightWall * wall + uNightTop * top);
    }`,
    afterNormal: `{
      // Tangent-space map → world (the projection plane's axes), then to view space.
      vec3 t = texture2D(uBoxNormal, boxUv).xyz * 2.0 - 1.0;
      t.xy *= uBoxNormalStrength;
      vec3 w = normalize(vBoxNormal);
      float s = sign(dot(w, boxAxis));
      vec3 world = boxAxis.x > 0.5 ? vec3(t.z * s, t.y, t.x * s)
                 : boxAxis.y > 0.5 ? vec3(t.x, t.z * s, t.y)
                 : vec3(t.x * s, t.y, t.z * s);
      normal = normalize((viewMatrix * vec4(normalize(world), 0.0)).xyz);
    }`,
  });
}
