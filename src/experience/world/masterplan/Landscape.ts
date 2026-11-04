import {
  AdditiveBlending,
  CanvasTexture,
  ClampToEdgeWrapping,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Camera,
  type Material,
  type Texture,
} from 'three';
import { ATTRACTIONS } from '../../../data/attractions';
import { LANDMARK_IDS, LANDMARKS, type LandmarkId } from '../../../data/landmarks';
import { MASTERPLAN } from '../../config/masterplan';
import { isRealmReserved, PUBLIC_REALM } from '../../config/publicRealm';
import { STADIUM } from '../../config/stadium';
import { COAST } from '../../config/scene';
import type { Disposable } from '../../types';
import { createRandom } from '../../utils/random';
import type { Atmosphere, MaterialExtension } from '../Atmosphere';
import { beachWeight, groundHeightAt, landDistance, parkWeight } from './MasterplanShape';
import type { OpenSpace } from './OpenSpace';
import { landmarkPaving, parkPathDistance, PARK_PATH_RADIUS } from './GroundCover';
import { pointInPolygon } from '../../utils/polygon';
import { disposeObject } from '../../utils/dispose';

/** Spacing (m) of palms along the central boulevard. */
const BOULEVARD_SPACING = 24;
const BOULEVARD = { x: 640, offset: 14, zStart: -1050, zEnd: 700 } as const;
const MODEL_URL = 'models/vegetation.glb';
/** Share of park trees per species (rest are broad shade trees). */
const SPECIES = { jacaranda: 0.32, olive: 0.3 } as const;
/** Street trees: spacing (m) along each verge, set-in from the street edge (m), palm share. */
const STREET_TREES = { spacing: 19, inset: 3, palms: 0.35, keep: 0.8 } as const;
/** Clumps of trees and shrubs on open block land (attempts per km², share kept). */
const BLOCK_GARDENS = { attemptsPerKm2: 900, trees: 0.55, shrubs: 3 } as const;
/** Urban planting is hidden beyond this distance (m); gardens carry the green from afar. */
const URBAN_VIEW_RANGE = 1500;
/** Garden shrubs scattered through the parks, per square kilometre of park. */
const SHRUBS_PER_KM2 = 5_000;
/** Large parks (the stadium gardens) would otherwise get thousands of trees near the camera. */
const MAX_TREES_PER_PARK = 420;
const SHRUB_SCALE = { min: 0.8, max: 1.5 } as const;
/** Side (m) of the spatial cells vegetation is grouped into for culling. */
const CELL = 320;
/** Camera distance (m) beyond which a variant is no longer drawn (a few pixels at 1080p). */
const VIEW_RANGE: Readonly<Record<Variant, number>> = {
  'palm-a': 3600,
  'palm-b': 3600,
  'tree-olive': 3000,
  'tree-shade': 3200,
  'tree-jacaranda': 3400,
  shrub: 900,
};
/** Stadium grove: grid spacing, outer reach from the stadium centre, gap from the building (m). */
const GROVE = { spacing: 17, reach: 330, margin: 8, jitter: 3 } as const;
/** Garden path lamps around each park (m between lamps). */
const PARK_LAMP_SPACING = 34;
/** Street lamps: one per this many promenade palms, set back from the palm (m). */
const LAMP = { every: 2, offset: 3.2, height: 7, radius: 0.09, glowRadius: 15 } as const;
const LAMP_COLOR = '#ffc887';

type Variant = 'palm-a' | 'palm-b' | 'tree-olive' | 'tree-shade' | 'tree-jacaranda' | 'shrub';

/** Foliage texture per variant (alpha-cut cards) and its trunk texture. */
/**
 * Mip-compensated alpha for foliage cards: averaging thin leaflets in smaller mip levels lowers
 * their alpha below the cut-off, so distant palms would lose their fronds and show bare trunks.
 * Scaling alpha up with the mip level keeps the canopy's coverage at every distance.
 */
const FOLIAGE_ALPHA: MaterialExtension = {
  key: 'foliage-alpha',
  uniforms: {},
  fragmentPars: '',
  afterDiffuse: `{
    vec2 texel = vMapUv * vec2(textureSize(map, 0));
    vec2 dx = dFdx(texel);
    vec2 dy = dFdy(texel);
    float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
    diffuseColor.a *= 1.0 + mip * 0.3;
  }`,
};

const MATERIAL_TEXTURES: Readonly<Record<Variant, { foliage: string; trunk: string | null }>> = {
  'palm-a': { foliage: 'frond.png', trunk: 'palm-trunk.jpg' },
  'palm-b': { foliage: 'frond.png', trunk: 'palm-trunk.jpg' },
  'tree-olive': { foliage: 'leaves-olive.png', trunk: 'bark.jpg' },
  'tree-shade': { foliage: 'leaves-shade.png', trunk: 'bark.jpg' },
  'tree-jacaranda': { foliage: 'leaves-jacaranda.png', trunk: 'bark.jpg' },
  shrub: { foliage: 'leaves-shade.png', trunk: null },
};

interface Placement {
  readonly position: Vector3;
  readonly variant: Variant;
  readonly scale: number;
  /** Street and block planting fades in closer than the gardens (dense, and small from afar). */
  readonly urban?: boolean;
}

/** Soft radial falloff for the additive lamp pools. */
function lightPoolTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

/**
 * Landmarks whose gardens reach right up to the building: planting keeps clear of this
 * rectangle (half-extents in metres, rotated with the model) instead of the whole footprint.
 */
const LANDMARK_CLEARANCE: Partial<
  Record<LandmarkId, { readonly hx: number; readonly hz: number; readonly rotation: number }>
> = {
  'opera-house': { hx: 80, hz: 40, rotation: -0.22 },
};

function isClearOfStructures(x: number, z: number, margin: number): boolean {
  if (isRealmReserved(x, z, margin)) return false;
  for (const id of LANDMARK_IDS) {
    const { position, footprint } = LANDMARKS[id];
    const dx = x - position.x;
    const dz = z - position.z;
    const rect = LANDMARK_CLEARANCE[id];
    if (rect) {
      // World offset → model-local axes (inverse of the model's rotation about y).
      const cos = Math.cos(rect.rotation);
      const sin = Math.sin(rect.rotation);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) < rect.hx + margin && Math.abs(lz) < rect.hz + margin) return false;
    } else if (Math.hypot(dx, dz) < footprint + margin) return false;
  }
  for (const attraction of Object.values(ATTRACTIONS)) {
    const { position } = attraction;
    if (Math.hypot(x - Math.max(position.x, MASTERPLAN.shoreX), z - position.z) < 60 + margin)
      return false;
  }
  return true;
}

/**
 * Palms along promenades, beach and boulevard; olive, shade and jacaranda trees and shrubs in the
 * gardens; street lamps along the promenades. Models come from Blender (vegetation.glb), one
 * instanced draw per variant and material.
 */
export class Landscape implements Disposable {
  readonly object = new Group();
  /** Resolves once the vegetation models are instanced into the scene. */
  readonly loaded: Promise<void>;
  private disposed = false;
  private readonly meshes: InstancedMesh[] = [];
  private readonly textures: Texture[] = [];
  private readonly materials: Material[] = [];
  private readonly cells: { mesh: InstancedMesh; centre: Vector3; range: number }[] = [];

  constructor(
    atmosphere: Atmosphere,
    private readonly openSpace: OpenSpace,
  ) {
    const random = createRandom(MASTERPLAN.landscape.seed + 1);
    const palms = this.palmPositions(random);
    const trees = this.treePositions(random);
    const placements: Placement[] = [
      ...palms.map((position): Placement => ({
        position,
        variant: random() < 0.6 ? 'palm-a' : 'palm-b',
        scale: 0.85 + random() * 0.3,
      })),
      ...trees.map((position) => {
        const pick = random();
        const variant: Variant =
          pick < SPECIES.jacaranda
            ? 'tree-jacaranda'
            : pick < SPECIES.jacaranda + SPECIES.olive
              ? 'tree-olive'
              : 'tree-shade';
        return { position, variant, scale: 0.8 + random() * 0.45 };
      }),
      ...this.shrubPositions(random).map((position): Placement => ({
        position,
        variant: 'shrub',
        scale: SHRUB_SCALE.min + random() * (SHRUB_SCALE.max - SHRUB_SCALE.min),
      })),
      ...this.streetTrees(random),
      ...this.blockGardens(random),
      ...this.coastalGardens(random),
    ];
    this.addLamps(
      [...palms.filter((_, index) => index % LAMP.every === 0), ...this.parkPaths()],
      atmosphere,
    );
    this.loaded = this.load(placements, atmosphere, random);
  }

  private async load(
    placements: readonly Placement[],
    atmosphere: Atmosphere,
    random: () => number,
  ): Promise<void> {
    // A callable read prevents TS from narrowing across awaits while unmount can intervene.
    const isDisposed = (): boolean => this.disposed;
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    if (isDisposed()) {
      disposeObject(gltf.scene);
      return;
    }
    const loader = new TextureLoader();
    const texture = async (file: string, alpha: boolean): Promise<Texture> => {
      const map = await loader.loadAsync(`textures/vegetation/${file}`);
      map.colorSpace = SRGBColorSpace;
      map.wrapS = map.wrapT = alpha ? ClampToEdgeWrapping : RepeatWrapping;
      map.anisotropy = 4;
      this.textures.push(map);
      return map;
    };
    const cache = new Map<string, Promise<Texture>>();
    const shared = (file: string, alpha: boolean): Promise<Texture> => {
      let promise = cache.get(file);
      if (!promise) {
        promise = texture(file, alpha);
        cache.set(file, promise);
      }
      return promise;
    };

    const parts = new Map<string, Mesh>();
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) parts.set(child.name, child as Mesh);
    });
    const matrix = new Matrix4();
    const rotation = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const scale = new Vector3();
    for (const variant of Object.keys(MATERIAL_TEXTURES) as Variant[]) {
      const instances = placements.filter((placement) => placement.variant === variant);
      if (instances.length === 0) continue;
      // Group instances into spatial cells: each cell is frustum-culled on its own and hidden
      // beyond the distance at which the variant shrinks below a few pixels.
      const cells = new Map<string, { centre: Vector3; transforms: Matrix4[]; range: number }>();
      for (const placement of instances) {
        rotation.setFromAxisAngle(up, random() * Math.PI * 2);
        const key = `${placement.urban ? 'u' : 'g'}:${Math.floor(placement.position.x / CELL)}:${Math.floor(placement.position.z / CELL)}`;
        let cell = cells.get(key);
        if (!cell) {
          cell = {
            centre: new Vector3(),
            transforms: [],
            range: placement.urban ? URBAN_VIEW_RANGE : VIEW_RANGE[variant],
          };
          cells.set(key, cell);
        }
        cell.centre.add(placement.position);
        cell.transforms.push(
          matrix.compose(placement.position, rotation, scale.setScalar(placement.scale)).clone(),
        );
      }
      for (const cell of cells.values()) cell.centre.divideScalar(cell.transforms.length);
      for (const part of ['trunk', 'foliage'] as const) {
        const file = MATERIAL_TEXTURES[variant][part];
        if (file === null) continue;
        const source = parts.get(`${variant}-${part}`);
        if (!source) throw new Error(`vegetation.glb: missing ${variant}-${part}`);
        const foliage = part === 'foliage';
        const map = await shared(file, foliage);
        if (isDisposed()) {
          // Textures may resolve after the route has already left the scene.
          for (const texture of this.textures) texture.dispose();
          disposeObject(gltf.scene);
          return;
        }
        const material = atmosphere.patch(
          new MeshStandardMaterial({
            map,
            vertexColors: true,
            roughness: foliage ? 0.75 : 0.95,
            metalness: 0,
            side: foliage ? DoubleSide : FrontSide,
            alphaTest: foliage ? 0.45 : 0,
            // With MSAA, leaf edges resolve smoothly instead of as hard stair-steps.
            alphaToCoverage: foliage,
          }),
          foliage ? FOLIAGE_ALPHA : undefined,
        );
        (source.material as Material).dispose();
        for (const cell of cells.values()) {
          const mesh = new InstancedMesh(source.geometry, material, cell.transforms.length);
          mesh.name = `${variant}-${part}`;
          cell.transforms.forEach((transform, index) => {
            mesh.setMatrixAt(index, transform);
          });
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          this.meshes.push(mesh);
          this.cells.push({ mesh, centre: cell.centre, range: cell.range });
          this.object.add(mesh);
        }
        this.materials.push(material);
      }
    }
  }

  /** Show only the vegetation cells within their variant's useful viewing distance. */
  updateView(camera: Camera): void {
    for (const cell of this.cells) {
      cell.mesh.visible = camera.position.distanceTo(cell.centre) < cell.range;
    }
  }

  /** Slim lamp posts beside promenade palms; heads and light pools come alive at night. */
  private addLamps(spots: readonly Vector3[], atmosphere: Atmosphere): void {
    const matrix = new Matrix4();
    const post = new InstancedMesh(
      new CylinderGeometry(LAMP.radius, LAMP.radius * 1.6, LAMP.height, 6).translate(
        0,
        LAMP.height / 2,
        0,
      ),
      atmosphere.patch(
        new MeshStandardMaterial({ color: '#2d2925', roughness: 0.5, metalness: 0.6 }),
      ),
      spots.length,
    );
    const head = new InstancedMesh(
      new CylinderGeometry(0.32, 0.22, 0.5, 8).translate(0, LAMP.height, 0),
      atmosphere.night.material(
        atmosphere.patch(
          new MeshStandardMaterial({ color: '#3a3530', emissive: LAMP_COLOR, roughness: 0.4 }),
        ),
        0,
        3,
      ),
      spots.length,
    );
    // Additive light pool on the ground: cheap stand-in for hundreds of real lights.
    const poolMaterial = new MeshBasicMaterial({
      map: lightPoolTexture(),
      color: LAMP_COLOR,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    if (poolMaterial.map) this.textures.push(poolMaterial.map);
    const pool = new InstancedMesh(
      new PlaneGeometry(LAMP.glowRadius * 2, LAMP.glowRadius * 2).rotateX(-Math.PI / 2),
      poolMaterial,
      spots.length,
    );
    pool.renderOrder = 1;
    atmosphere.night.custom((lights) => {
      poolMaterial.opacity = 0.12 * lights;
      pool.visible = lights > 0;
    });
    spots.forEach((spot, index) => {
      // Set back from the palm, toward land.
      const x = spot.x + LAMP.offset;
      matrix.makeTranslation(x, spot.y, spot.z);
      post.setMatrixAt(index, matrix);
      head.setMatrixAt(index, matrix);
      matrix.makeTranslation(x, spot.y + 0.12, spot.z);
      pool.setMatrixAt(index, matrix);
    });
    for (const mesh of [post, head, pool]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.meshes.push(mesh);
      this.object.add(mesh);
    }
    post.castShadow = true;
  }

  /** Lamp spots along a path just inside each park's edge. */
  private parkPaths(): Vector3[] {
    const spots: Vector3[] = [];
    for (const park of MASTERPLAN.parks) {
      const r = park.radius * PARK_PATH_RADIUS;
      const count = Math.floor((Math.PI * 2 * r) / PARK_LAMP_SPACING);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const x = park.x + Math.cos(a) * r;
        const z = park.z + Math.sin(a) * r;
        if (parkWeight(x, z) < 0.8 || landDistance(x, z) < 20 || !isClearOfStructures(x, z, 6))
          continue;
        spots.push(new Vector3(x - LAMP.offset, COAST.landHeight, z));
      }
    }
    return spots;
  }

  /** Low shrub clumps through the parks (outside plazas and the water's edge). */
  private shrubPositions(random: () => number): Vector3[] {
    const positions: Vector3[] = [];
    for (const park of MASTERPLAN.parks) {
      const count = Math.round(SHRUBS_PER_KM2 * Math.PI * (park.radius / 1000) ** 2);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * park.radius * 1.15;
        const x = park.x + Math.cos(angle) * r;
        const z = park.z + Math.sin(angle) * r;
        if (parkWeight(x, z) < 0.85 || parkPathDistance(x, z) < 4) continue;
        const inPlaza = MASTERPLAN.plazas.some(
          (plaza) => Math.hypot(x - plaza.x, z - plaza.z) < plaza.radius + 4,
        );
        if (inPlaza || landDistance(x, z) < 20 || !isClearOfStructures(x, z, 4)) continue;
        positions.push(new Vector3(x, COAST.landHeight - 0.15, z));
      }
    }
    return positions;
  }

  private palmPositions(random: () => number): Vector3[] {
    const { exclusion, ground, landscape } = MASTERPLAN;
    const positions: Vector3[] = [];
    const beach = PUBLIC_REALM.beach;
    for (let z = beach.z - beach.halfLength; z < beach.z + beach.halfLength; z += 22) {
      // Formal palms between the timber promenade and inland shade pavilions.
      positions.push(new Vector3(beach.x + 15, COAST.landHeight + 0.72, z + 6));
    }
    const step = landscape.palmSpacing / 2;
    for (let z: number = exclusion.minZ; z < exclusion.maxZ; z += step) {
      for (let x: number = ground.minX; x < exclusion.maxX; x += step) {
        const distance = landDistance(x, z);
        const onBeach = beachWeight(z) > 0.5;
        const inRow = onBeach ? distance > 88 && distance < 100 : distance > 12 && distance < 22;
        if (!inRow || random() > 0.55 || !isClearOfStructures(x, z, 12)) continue;
        const px = x + random() * 3;
        const pz = z + random() * 3;
        if (this.openSpace.distanceToBuilding(px, pz) < 8 || landmarkPaving(px, pz)) continue;
        positions.push(new Vector3(px, groundHeightAt(landDistance(px, pz), pz), pz));
      }
    }
    for (let z: number = BOULEVARD.zStart; z < BOULEVARD.zEnd; z += BOULEVARD_SPACING) {
      for (const side of [-1, 1]) {
        const x = BOULEVARD.x + side * BOULEVARD.offset;
        if (isClearOfStructures(x, z, 10) && this.openSpace.distanceToBuilding(x, z) > 8)
          positions.push(new Vector3(x, COAST.landHeight, z));
      }
    }
    return positions;
  }

  /** Formal grove around the stadium: trees on a grid between the building and the gardens. */
  private stadiumGrove(random: () => number): Vector3[] {
    const positions: Vector3[] = [];
    const { exterior, approachHalfWidth } = STADIUM;
    const centre = LANDMARKS.stadium.position;
    for (let gx = -GROVE.reach; gx <= GROVE.reach; gx += GROVE.spacing) {
      for (let gz = -GROVE.reach; gz <= GROVE.reach; gz += GROVE.spacing) {
        const insideBuilding =
          Math.abs(gx) < exterior.hx + GROVE.margin && Math.abs(gz) < exterior.hz + GROVE.margin;
        const onApproach = gx > exterior.hx && Math.abs(gz) < approachHalfWidth;
        if (insideBuilding || onApproach || Math.hypot(gx, gz) > GROVE.reach) continue;
        const jitter = (): number => (random() - 0.5) * GROVE.jitter;
        positions.push(
          new Vector3(centre.x + gx + jitter(), COAST.landHeight, centre.z + gz + jitter()),
        );
      }
    }
    return positions;
  }

  /** Shade trees and palms along both verges of the district streets. */
  private streetTrees(random: () => number): Placement[] {
    const placements: Placement[] = [];
    const { spacing, inset, palms, keep } = STREET_TREES;
    for (const street of this.openSpace.streets()) {
      const offset = street.width / 2 - inset;
      const palm = random() < palms; // one species per street, like real avenues
      for (let along = street.from + spacing / 2; along < street.to; along += spacing) {
        for (const side of [-1, 1]) {
          if (random() > keep) continue;
          const x = street.axis === 'z' ? street.at + side * offset : along;
          const z = street.axis === 'z' ? along : street.at + side * offset;
          if (!pointInPolygon(x, z, street.polygon) || !this.isPlantable(x, z, 2)) continue;
          // The perpendicular street must remain clear at an intersection.
          if (this.openSpace.streetDistance(x, z) < offset - 1.5) continue;
          placements.push({
            position: new Vector3(x, COAST.landHeight, z),
            variant: palm ? (random() < 0.6 ? 'palm-a' : 'palm-b') : 'tree-shade',
            scale: palm ? 0.8 + random() * 0.25 : 0.7 + random() * 0.3,
            urban: true,
          });
        }
      }
    }
    return placements;
  }

  /** Loose clumps of trees and shrubs on the open lawns between buildings. */
  private blockGardens(random: () => number): Placement[] {
    const placements: Placement[] = [];
    const { exclusion, ground } = MASTERPLAN;
    const area = ((exclusion.maxX - ground.minX) * (exclusion.maxZ - exclusion.minZ)) / 1e6;
    const attempts = Math.round(area * BLOCK_GARDENS.attemptsPerKm2);
    for (let i = 0; i < attempts; i++) {
      const x = ground.minX + random() * (exclusion.maxX - ground.minX);
      const z = exclusion.minZ + random() * (exclusion.maxZ - exclusion.minZ);
      if (this.openSpace.lawn(x, z) < 0.95 || !this.isPlantable(x, z, 6)) continue;
      if (random() < BLOCK_GARDENS.trees) {
        const pick = random();
        placements.push({
          position: new Vector3(x, COAST.landHeight, z),
          variant: pick < 0.4 ? 'tree-olive' : pick < 0.6 ? 'tree-jacaranda' : 'tree-shade',
          scale: 0.75 + random() * 0.4,
          urban: true,
        });
      }
      for (let k = 0; k < BLOCK_GARDENS.shrubs; k++) {
        const sx = x + (random() - 0.5) * 14;
        const sz = z + (random() - 0.5) * 14;
        if (this.openSpace.lawn(sx, sz) < 0.9 || !this.isPlantable(sx, sz, 3)) continue;
        placements.push({
          position: new Vector3(sx, COAST.landHeight - 0.15, sz),
          variant: 'shrub',
          scale: SHRUB_SCALE.min + random() * (SHRUB_SCALE.max - SHRUB_SCALE.min),
          urban: true,
        });
      }
    }
    return placements;
  }

  /** Low planting behind the beach walk and along the marina, leaving a continuous paved path. */
  private coastalGardens(random: () => number): Placement[] {
    const placements: Placement[] = [];
    const { minZ, maxZ } = MASTERPLAN.exclusion;
    // A narrow planted strip inland of the promenade, rather than trees scattered on the sand.
    for (let z: number = minZ; z < maxZ; z += 18) {
      for (let x: number = MASTERPLAN.ground.minX; x < 400; x += 18) {
        const distance = landDistance(x, z, false);
        const beach = beachWeight(z) > 0.5;
        const inset = beach ? 108 : MASTERPLAN.promenade + 14;
        if (Math.abs(distance - inset) > 10 || !this.isPlantable(x, z, 6)) continue;
        if (this.openSpace.streetDistance(x, z) < this.openSpace.streetWidth(x, z) / 2 + 4)
          continue;
        placements.push({
          position: new Vector3(x, groundHeightAt(distance, z), z),
          variant: random() < 0.65 ? 'palm-a' : 'tree-olive',
          scale: 0.7 + random() * 0.25,
        });
      }
    }
    return placements;
  }

  /** Clear of the water's edge, landmarks, attractions, plazas and building footprints. */
  private isPlantable(x: number, z: number, margin: number): boolean {
    if (landDistance(x, z) < (beachWeight(z) > 0.5 ? 85 : MASTERPLAN.promenade) + margin)
      return false;
    if (landmarkPaving(x, z)) return false;
    if (parkWeight(x, z) > 0.3 || !isClearOfStructures(x, z, margin)) return false;
    if (this.openSpace.distanceToBuilding(x, z) < margin) return false;
    return !MASTERPLAN.plazas.some(
      (plaza) => Math.hypot(x - plaza.x, z - plaza.z) < plaza.radius + margin,
    );
  }

  private treePositions(random: () => number): Vector3[] {
    const positions: Vector3[] = this.stadiumGrove(random);
    const beach = PUBLIC_REALM.beach;
    for (let z = beach.z - beach.halfLength + 20; z < beach.z + beach.halfLength; z += 42) {
      positions.push(new Vector3(beach.x + 52, COAST.landHeight, z));
    }
    const central = PUBLIC_REALM.central;
    for (const dx of [-34, 34])
      for (const dz of [-34, 34]) {
        positions.push(new Vector3(central.x + dx, COAST.landHeight + 0.74, central.z + dz));
      }
    for (const park of MASTERPLAN.parks) {
      const count = Math.min(
        MAX_TREES_PER_PARK,
        Math.round(MASTERPLAN.landscape.treesPerPark * (park.radius / 300) ** 2),
      );
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * park.radius * 1.2;
        const x = park.x + Math.cos(angle) * r;
        const z = park.z + Math.sin(angle) * r;
        if (parkWeight(x, z) < 0.9 || parkPathDistance(x, z) < 6) continue;
        const inPlaza = MASTERPLAN.plazas.some(
          (plaza) => Math.hypot(x - plaza.x, z - plaza.z) < plaza.radius + 8,
        );
        if (inPlaza || landDistance(x, z) < 25 || !isClearOfStructures(x, z, 6)) continue;
        positions.push(new Vector3(x, COAST.landHeight, z));
      }
    }
    return positions;
  }

  dispose(): void {
    this.disposed = true;
    // Cells share geometry and materials; disposing twice is a no-op in three.js.
    for (const mesh of this.meshes) {
      mesh.geometry.dispose();
      (mesh.material as Material).dispose();
      mesh.dispose();
    }
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
