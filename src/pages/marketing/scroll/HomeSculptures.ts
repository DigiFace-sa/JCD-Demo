import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
  type WebGLRenderTarget,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Continuous chapter 0..3 crossfades adjacent objects; progress 0..1 adds a small camera-facing sweep. */
export interface HomeSculptureState {
  readonly chapter: number;
  readonly progress: number;
  readonly visible: boolean;
  readonly rtl: boolean;
  readonly reduced: boolean;
}

/** A small studio render, independent of the much heavier interactive masterplan. */
const STUDIO = {
  width: 1500,
  height: 1080,
  fov: 35,
  exposure: 0.88,
  environmentIntensity: 0.75,
  sweep: 0.26,
  transitionLift: 0.65,
} as const;
/** Shared modelling tolerances keep curves smooth without needing tessellated production models. */
const DETAIL = { curve: 36, ring: 72, tubeSides: 5, coralSegments: 22, coralSides: 7 } as const;
const TAU = Math.PI * 2;
const FORWARD = new Vector3(0, 0, 1);
const RIGHT = new Vector3(1, 0, 0);

type Finish = 'ivory' | 'gold' | 'blue';
type Parts = Record<Finish, BufferGeometry[]>;
interface Sculpture {
  readonly root: Group;
  readonly materials: readonly MeshStandardMaterial[];
  readonly restY: number;
  readonly angle: number;
}
const parts = (): Parts => ({ ivory: [], gold: [], blue: [] });
const curve = (points: readonly (readonly [number, number, number])[]): CatmullRomCurve3 =>
  new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));

function box(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  rounded = false,
): BufferGeometry {
  const geometry = rounded
    ? new RoundedBoxGeometry(width, height, depth, 1, Math.min(height / 3, 0.075))
    : new BoxGeometry(width, height, depth);
  return geometry.translate(x, y, z);
}

/** Four-corner section gives each folded coastal ribbon physical thickness and soft edge highlights. */
function ribbon(path: CatmullRomCurve3, width: number, thickness: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const frames = path.computeFrenetFrames(DETAIL.curve, false);
  for (let i = 0; i <= DETAIL.curve; i++) {
    const t = i / DETAIL.curve;
    const center = path.getPointAt(t);
    const tangent = frames.tangents[i] ?? FORWARD;
    const across = (frames.normals[i] ?? RIGHT).clone();
    across.applyAxisAngle(tangent, Math.sin(t * Math.PI) * 0.45);
    const depth = new Vector3().crossVectors(tangent, across).normalize();
    for (const [side, face] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const point = center
        .clone()
        .addScaledVector(across, side * width * 0.5)
        .addScaledVector(depth, face * thickness * 0.5);
      positions.push(point.x, point.y, point.z);
    }
    if (i < DETAIL.curve)
      for (let side = 0; side < 4; side++) {
        const a = i * 4 + side;
        const b = i * 4 + ((side + 1) % 4);
        indices.push(a, b, a + 4, b, b + 4, a + 4);
      }
  }
  indices.push(0, 3, 1, 1, 3, 2);
  const end = DETAIL.curve * 4;
  indices.push(end, end + 1, end + 3, end + 1, end + 2, end + 3);
  return geometryFrom(positions, indices);
}

function geometryFrom(positions: number[], indices: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ellipticRing(
  radiusX: number,
  radiusZ: number,
  inner: number,
  yInner: number,
  yOuter: number,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= DETAIL.ring; i++) {
    const angle = (i / DETAIL.ring) * TAU;
    const x = Math.cos(angle) * radiusX;
    const z = Math.sin(angle) * radiusZ;
    positions.push(x * inner, yInner, z * inner, x, yOuter, z);
    if (i < DETAIL.ring) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return geometryFrom(positions, indices);
}

function ellipseCurve(radiusX: number, radiusZ: number, y: number): CatmullRomCurve3 {
  const points = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * TAU;
    return new Vector3(Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
  });
  return new CatmullRomCurve3(points, true);
}

function contour(path: CatmullRomCurve3, radius = 0.027): BufferGeometry {
  return new TubeGeometry(path, DETAIL.curve, radius, DETAIL.tubeSides, path.closed);
}

function coastalRibbons(): Parts {
  const result = parts();
  for (let layer = 0; layer < 3; layer++) {
    const inset = 1 - layer * 0.16;
    const lift = layer * 0.54 - 0.4;
    const path = curve([
      [-2.3 * inset, -0.25 + lift, -0.4 * inset],
      [-1.6 * inset, 0.5 + lift, -1.25 * inset],
      [0, 0.85 + lift, -1.3 * inset],
      [1.8 * inset, 0.2 + lift, -0.5 * inset],
      [2.1 * inset, -0.55 + lift, 0.9 * inset],
      [0.3 * inset, -0.85 + lift, 1.4 * inset],
      [-1.7 * inset, -0.4 + lift, 0.8 * inset],
    ]);
    result[layer === 1 ? 'gold' : 'ivory'].push(ribbon(path, 0.38 - layer * 0.025, 0.075));
  }
  return result;
}

/** An original architectural study of an open bowl, not a model of the official stadium design. */
function stadiumStudy(): Parts {
  const result = parts();
  const base = new CylinderGeometry(2.65, 2.72, 0.15, DETAIL.ring);
  base.scale(1, 1, 0.72).translate(0, -0.85, 0);
  result.ivory.push(base);
  result.blue.push(ellipticRing(2.32, 1.58, 0.55, -0.65, -0.15));
  for (let tier = 0; tier < 3; tier++) {
    const inset = tier * 0.17;
    result.ivory.push(
      ellipticRing(2.1 - inset, 1.42 - inset * 0.65, 0.87, -0.43 + tier * 0.2, -0.31 + tier * 0.2),
    );
  }
  result.ivory.push(ellipticRing(2.55, 1.77, 0.74, 0.48, 0.83));
  result.gold.push(contour(ellipseCurve(2.55, 1.77, 0.83), 0.045));
  result.gold.push(contour(ellipseCurve(1.89, 1.31, 0.48), 0.035));
  result.gold.push(contour(ellipseCurve(2.45, 1.67, -0.62), 0.023));
  result.blue.push(box(1.85, 0.035, 1.15, 0, -0.61, 0, true));
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * TAU;
    const rib = new BoxGeometry(0.065, 1.28, 0.11);
    rib.rotateZ(Math.cos(angle) * -0.07).rotateY(-angle);
    rib.translate(Math.cos(angle) * 2.4, 0.05, Math.sin(angle) * 1.65);
    result.gold.push(rib);
  }
  return result;
}

function districtStudy(): Parts {
  const result = parts();
  for (let i = 0; i < 6; i++) {
    const column = i % 3;
    const row = Math.floor(i / 3);
    const x = (column - 1) * 1.55;
    const y = column * 0.14 + row * 0.07 - 0.55;
    const z = (row - 0.5) * 1.8;
    result.ivory.push(box(1.42, 0.2, 1.62, x, y, z, true));
    result.gold.push(box(1.44, 0.045, 1.64, x, y - 0.11, z, true));
    for (let block = 0; block < 3; block++) {
      const height = 0.35 + ((column + row + block) % 3) * 0.24;
      result[block === 1 ? 'blue' : 'ivory'].push(
        box(0.32, height, 0.4, x + (block - 1) * 0.41, y + height * 0.5 + 0.1, z, true),
      );
    }
  }
  for (let i = 0; i < 2; i++)
    result.gold.push(
      contour(
        curve([
          [-2.4, -0.22 + i * 0.12, -1.1 + i * 1.7],
          [-1.2, 0.15 + i * 0.12, -1.3 + i * 1.7],
          [0.35, 0.45 + i * 0.12, -0.8 + i * 1.7],
          [2.5, 0.55 + i * 0.12, -1.15 + i * 1.7],
        ]),
        0.023,
      ),
    );
  return result;
}

/** Tapered organic branches avoid the toy-like constant-radius silhouette of plain tube trees. */
function branch(path: CatmullRomCurve3, baseRadius: number, tipRadius: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const sides = DETAIL.coralSides;
  for (let i = 0; i <= DETAIL.coralSegments; i++) {
    const t = i / DETAIL.coralSegments;
    const center = path.getPointAt(t);
    const tangent = path.getTangentAt(t);
    const normal = new Vector3()
      .crossVectors(tangent, Math.abs(tangent.dot(FORWARD)) < 0.9 ? FORWARD : RIGHT)
      .normalize();
    const binormal = new Vector3().crossVectors(tangent, normal).normalize();
    const radius = MathUtils.lerp(baseRadius, tipRadius, t);
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * TAU;
      const point = center
        .clone()
        .addScaledVector(normal, Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * radius);
      positions.push(point.x, point.y, point.z);
      if (i < DETAIL.coralSegments && side < sides) {
        const a = i * (sides + 1) + side;
        indices.push(a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2);
      }
    }
  }
  return geometryFrom(positions, indices);
}

function coralStudy(): Parts {
  const result = parts();
  const stem = curve([
    [0, -1.5, 0],
    [-0.15, -0.5, 0.05],
    [0.18, 0.5, -0.1],
    [-0.12, 1.7, 0.08],
    [0.25, 2.15, 0],
  ]);
  result.ivory.push(branch(stem, 0.19, 0.038));
  for (let level = 0; level < 4; level++)
    for (const side of [-1, 1]) {
      const y = -0.7 + level * 0.56;
      const extent = 1.8 - level * 0.28;
      const depth = Math.sin(level * 1.7 + side) * 0.58;
      result.ivory.push(
        branch(
          curve([
            [0, y, 0],
            [side * extent * 0.38, y + 0.16, depth * 0.3],
            [side * extent * 0.8, y + 0.45, depth * 0.8],
            [side * extent, y + 1, depth],
          ]),
          0.12 - level * 0.013,
          0.022,
        ),
      );
      result.gold.push(
        branch(
          curve([
            [side * extent * 0.55, y + 0.27, depth * 0.55],
            [side * extent * 0.54, y + 0.7, depth + 0.2],
            [side * extent * 0.63, y + 1.08, depth + 0.4],
          ]),
          0.057,
          0.018,
        ),
      );
      result.gold.push(new IcosahedronGeometry(0.045, 1).translate(side * extent, y + 1, depth));
    }
  const base = new CylinderGeometry(1.75, 1.85, 0.12, DETAIL.ring);
  base.scale(1, 1, 0.75).translate(0, -1.58, 0);
  result.blue.push(base);
  result.gold.push(contour(ellipseCurve(1.78, 1.34, -1.52), 0.032));
  return result;
}

/**
 * Original architectural/marine objects rendered into one transparent canvas. No animation loop:
 * the Home scroll controller owns rendering, pause/resume, section placement and visual hierarchy.
 */
export class HomeSculptures {
  private readonly canvas = document.createElement('canvas');
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(STUDIO.fov, 1, 0.1, 60);
  private readonly models: Sculpture[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly environment: WebGLRenderTarget;
  private readonly resizeObserver: ResizeObserver;
  private disposed = false;
  private state: HomeSculptureState = {
    chapter: 0,
    progress: 0,
    visible: false,
    rtl: false,
    reduced: false,
  };

  constructor(private readonly host: HTMLElement) {
    this.canvas.className = 'home-sculptures__canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      stencil: false,
      powerPreference: 'low-power',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = STUDIO.exposure;
    this.renderer.setPixelRatio(1);
    this.camera.position.set(7, 5.2, 10);
    this.camera.lookAt(0, 0.22, 0);
    const environmentScene = new RoomEnvironment();
    const generator = new PMREMGenerator(this.renderer);
    this.environment = generator.fromScene(environmentScene, 0.04);
    generator.dispose();
    environmentScene.dispose();
    this.renderer.setClearColor(0x000000, 0);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = STUDIO.environmentIntensity;
    this.scene.add(new HemisphereLight(0xe9f4ff, 0x283441, 0.75));
    const key = new DirectionalLight(0xffecd0, 3.1);
    key.position.set(-4, 7, 6);
    const rim = new DirectionalLight(0x99dfff, 1.8);
    rim.position.set(5, 2, -5);
    this.scene.add(key, rim);
    const style = getComputedStyle(document.documentElement);
    const palette = {
      gold: new Color(style.getPropertyValue('--jcdc-secondary').trim() || '#cc9f53'),
      blue: new Color(style.getPropertyValue('--jcdc-ink').trim() || '#11181c').lerp(
        new Color(style.getPropertyValue('--jcdc-primary').trim() || '#0076a9'),
        0.1,
      ),
      ivory: new Color(style.getPropertyValue('--jcdc-sand').trim() || '#efe6d6').lerp(
        new Color(0xffffff),
        0.15,
      ),
    };
    const designs = [coastalRibbons(), stadiumStudy(), districtStudy(), coralStudy()];
    for (const [index, pieces] of designs.entries()) {
      const root = new Group();
      const modelMaterials: MeshStandardMaterial[] = [];
      for (const finish of ['ivory', 'gold', 'blue'] as const) {
        const sources = pieces[finish];
        if (!sources.length) continue;
        // No textures: compatible non-indexed attributes let curved and primitive parts share a draw.
        const prepared = sources.map((source) => {
          source.deleteAttribute('uv');
          const geometry = source.index ? source.toNonIndexed() : source;
          if (geometry !== source) source.dispose();
          return geometry;
        });
        const geometry = mergeGeometries(prepared);
        for (const source of prepared) source.dispose();
        const material = new MeshStandardMaterial({
          color: palette[finish],
          metalness: finish === 'gold' ? 0.8 : finish === 'blue' ? 0.55 : 0.16,
          roughness: finish === 'gold' ? 0.28 : finish === 'blue' ? 0.44 : 0.35,
          transparent: true,
          side: DoubleSide,
          opacity: 0,
        });
        material.forceSinglePass = true;
        this.geometries.add(geometry);
        this.materials.add(material);
        modelMaterials.push(material);
        root.add(new Mesh(geometry, material));
      }
      this.models.push({
        root,
        materials: modelMaterials,
        restY: index === 3 ? -0.25 : 0,
        angle: -0.2,
      });
      this.scene.add(root);
    }
    const triangles = [...this.geometries].reduce(
      (total, geometry) => total + geometry.getAttribute('position').count / 3,
      0,
    );
    this.canvas.dataset.triangles = String(triangles);
    this.canvas.dataset.draws = String(this.materials.size);
    this.host.append(this.canvas);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.resize();
    this.setState(this.state);
  }

  /** Warm every object once so crossing a chapter boundary does not compile a new shader. */
  async ready(): Promise<void> {
    const isDisposed = (): boolean => this.disposed;
    if (isDisposed()) return;
    for (const model of this.models) model.root.visible = true;
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch (error) {
      if (isDisposed()) return;
      throw error;
    }
    if (isDisposed()) return;
    this.setState(this.state);
    this.render();
  }

  setState(state: HomeSculptureState): void {
    if (this.disposed) return;
    this.state = state;
    const continuousChapter = MathUtils.clamp(state.chapter, 0, this.models.length - 1);
    const chapter = state.reduced ? Math.round(continuousChapter) : continuousChapter;
    const progress = state.reduced ? 0.5 : MathUtils.clamp(state.progress, 0, 1);
    const direction = state.rtl ? -1 : 1;
    for (const [index, model] of this.models.entries()) {
      const weight = Math.max(0, 1 - Math.abs(chapter - index));
      model.root.visible = state.visible && weight > 0.001;
      model.root.position.y = model.restY - (index - chapter) * STUDIO.transitionLift;
      model.root.rotation.y = model.angle + (progress - 0.5) * STUDIO.sweep * direction;
      model.root.rotation.z = (progress - 0.5) * 0.06;
      for (const material of model.materials) {
        material.opacity = weight;
        material.depthWrite = weight > 0.98;
      }
    }
    this.canvas.style.visibility = state.visible ? 'visible' : 'hidden';
    this.canvas.dataset.chapter = chapter.toFixed(2);
  }

  render(): void {
    if (!this.disposed && this.state.visible) this.renderer.render(this.scene, this.camera);
  }

  private readonly resize = (): void => {
    if (this.disposed) return;
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const scale = Math.min(1, STUDIO.width / width, STUDIO.height / height);
    this.renderer.setSize(Math.round(width * scale), Math.round(height * scale), false);
    this.canvas.style.inlineSize = '100%';
    this.canvas.style.blockSize = '100%';
    this.camera.aspect = width / height;
    this.camera.zoom = Math.min(1, this.camera.aspect / 0.9);
    this.camera.updateProjectionMatrix();
    this.render();
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.geometries.clear();
    this.materials.clear();
    this.models.length = 0;
    this.scene.environment = null;
    this.environment.dispose();
    this.scene.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();
    this.canvas.remove();
  }
}
