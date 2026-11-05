import {
  AdditiveBlending,
  CanvasTexture,
  MeshBasicMaterial,
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  DoubleSide,
  Group,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
} from 'three';
import { PUBLIC_REALM } from '../../config/publicRealm';
import { COAST } from '../../config/scene';
import { createRandom } from '../../utils/random';
import { disposeObject } from '../../utils/dispose';
import type { Disposable } from '../../types';
import type { Atmosphere } from '../Atmosphere';
import { boxMappedMaterial, textureSet } from '../landmarks/boxMapped';
import { groundHeightAt, landDistance } from './MasterplanShape';
import { loadPublicRealmKit, type RealmProp } from './PublicRealmKit';

/** Human scale in metres, and restrained walking speed (m/s). */
const CROWD = { height: 1.75, speed: 0.65, stride: 3.7, centralCount: 28, beachCount: 36 } as const;
/** Original illustrative public-realm palette; unbranded furniture and neutral clothing. */
const COLORS = {
  stone: '#d6c9b5',
  wood: '#a88361',
  metal: '#665645',
  fabric: '#e3d9c3',
  glass: '#3b5357',
  light: '#ffd9a8',
  water: '#4b8686',
  clothing: ['#dfd8c9', '#c2b59a', '#637d82', '#343d43', '#a58c70'],
  skin: ['#ac8062', '#c69f7e', '#936a51', '#d6b28e'],
} as const;

interface Batch {
  readonly geometry: BufferGeometry;
  readonly material: Material;
  readonly matrices: Matrix4[];
}
interface Walker {
  readonly x: number;
  readonly from: number;
  readonly length: number;
  readonly phase: number;
  readonly direction: number;
  readonly scale: number;
  readonly y: number;
}
interface Crowd {
  readonly root: Group;
  readonly centre: Vector3;
  readonly walkers: readonly Walker[];
  readonly body: InstancedMesh;
  readonly head: InstancedMesh;
  readonly legs: readonly [InstancedMesh, InstancedMesh];
  readonly arms: readonly [InstancedMesh, InstancedMesh];
}

/**
 * Two detailed, original public-space vignettes. Furniture is instanced by geometry/material,
 * and the small crowds only animate near the camera. This adds life without duplicating an
 * entire high-detail city or introducing claimed official amenities.
 */
export class PublicRealm implements Disposable {
  readonly object = new Group();
  readonly loaded: Promise<void>;
  private disposed = false;
  private readonly areas: {
    readonly root: Group;
    readonly near: Group;
    readonly far: Group;
    readonly centre: Vector3;
  }[] = [];
  private readonly crowds: Crowd[] = [];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private walkTime = 0;
  private readonly matrix = new Matrix4();
  private readonly legMatrix = new Matrix4();
  private readonly legRotation = new Matrix4();
  private readonly walkScale = new Vector3();

  constructor(private readonly atmosphere: Atmosphere) {
    this.object.name = 'public-realm';
    this.loaded = this.build();
  }

  private isDisposed(): boolean {
    return this.disposed;
  }

  private async build(): Promise<void> {
    const [paving, timber] = await Promise.all([textureSet('paving'), textureSet('timber')]);
    if (this.disposed) return;
    const stone = boxMappedMaterial(this.atmosphere, {
      maps: paving,
      tile: 1.25,
      tint: COLORS.stone,
      normalStrength: 0.55,
      detail: 0.65,
      roughness: 0.9,
    });
    const wood = boxMappedMaterial(this.atmosphere, {
      maps: timber,
      tile: 0.8,
      tint: COLORS.wood,
      normalStrength: 0.4,
      detail: 0.6,
      roughness: 0.85,
    });
    const standard = (color: string, metalness = 0): MeshStandardMaterial =>
      this.atmosphere.patch(
        new MeshStandardMaterial({ color, roughness: 0.65, metalness, vertexColors: true }),
      );
    const fabric = standard(COLORS.fabric);
    fabric.side = DoubleSide;
    fabric.roughness = 0.95;
    const metal = standard(COLORS.metal, 0.55);
    const soil = standard('#716652');
    const foliage = standard('#677750');
    foliage.side = DoubleSide;
    const glass = this.atmosphere.night.material(
      this.atmosphere.patch(
        new MeshStandardMaterial({
          color: COLORS.glass,
          vertexColors: true,
          metalness: 0.6,
          roughness: 0.18,
          emissive: COLORS.light,
        }),
      ),
      0.02,
      0.38,
    );
    const light = this.atmosphere.night.material(
      this.atmosphere.patch(
        new MeshStandardMaterial({
          color: '#c9b99d',
          emissive: COLORS.light,
          roughness: 0.5,
          vertexColors: true,
        }),
      ),
      0,
      1.1,
    );
    const kit = await loadPublicRealmKit({
      stone,
      timber: wood,
      metal,
      fabric,
      soil,
      foliage,
      glass,
      led: light,
    });
    if (this.isDisposed()) {
      for (const level of Object.values(kit))
        for (const meshes of level.values()) for (const mesh of meshes) disposeObject(mesh);
      return;
    }
    const water = this.atmosphere.patch(
      new MeshStandardMaterial({ color: COLORS.water, metalness: 0.45, roughness: 0.2 }),
    );
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.3)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.04)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    const pool = new MeshBasicMaterial({
      map: new CanvasTexture(canvas),
      color: COLORS.light,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.atmosphere.night.custom((lights) => {
      pool.opacity = lights * 0.12;
      pool.visible = lights > 0;
    });
    for (const kind of ['beach', 'central'] as const) {
      const root = new Group();
      root.name = `public-realm-${kind}`;
      const area = PUBLIC_REALM[kind];
      const near = new Group(),
        far = new Group();
      root.add(near, far);
      this.areas.push({ root, near, far, centre: new Vector3(area.x, 0, area.z) });
      this.object.add(root);
      const batches = new Map<string, Batch>();
      const nearBatches = new Map<string, Batch>(),
        farBatches = new Map<string, Batch>();
      const poolGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const box = new BoxGeometry(1, 1, 1);
      // Architectural materials expect Blender's vertex colours; these original templates use white.
      box.setAttribute(
        'color',
        new Float32BufferAttribute(
          new Float32Array(box.getAttribute('position').count * 3).fill(1),
          3,
        ),
      );
      const add = (
        geometry: BufferGeometry,
        material: Material,
        x: number,
        y: number,
        z: number,
        sx = 1,
        sy = 1,
        sz = 1,
        rotation = 0,
        collection = batches,
      ): void => {
        const key = `${geometry.uuid}:${material.uuid}`;
        let batch = collection.get(key);
        if (!batch) {
          batch = { geometry, material, matrices: [] };
          collection.set(key, batch);
        }
        const matrix = new Matrix4().makeRotationY(rotation);
        matrix.scale(new Vector3(sx, sy, sz));
        matrix.setPosition(x, y, z);
        batch.matrices.push(matrix);
      };
      const block = (
        material: Material,
        x: number,
        y: number,
        z: number,
        w: number,
        h: number,
        d: number,
        angle = 0,
      ): void => {
        add(box, material, x, y, z, w, h, d, angle);
      };
      const prop = (
        asset: RealmProp,
        x: number,
        y: number,
        z: number,
        angle = 0,
        sx = 1,
        sy = 1,
        sz = 1,
      ): void => {
        for (const level of ['near', 'far'] as const)
          for (const mesh of kit[level].get(asset) ?? [])
            add(
              mesh.geometry,
              mesh.material as Material,
              x,
              y,
              z,
              sx,
              sy,
              sz,
              angle,
              level === 'near' ? nearBatches : farBatches,
            );
      };
      const bench = (x: number, y: number, z: number, angle = 0): void => {
        prop('bench', x, y, z, angle);
      };
      const bed = (x: number, y: number, z: number, w: number, d: number): void => {
        prop('planter', x, y, z, 0, w / 4.5, 1, d / 7);
      };
      const lamp = (x: number, y: number, z: number, height: number): void => {
        prop('lamp', x, y, z, 0, 1, height / 4.8, 1);
      };
      if (kind === 'beach') {
        const b = PUBLIC_REALM.beach;
        // The deck is raised just above the sloping terrain; its long seams resolve up close.
        block(wood, b.x, COAST.landHeight + 0.08, b.z, b.walkWidth, 0.2, b.halfLength * 2);
        for (let z = b.z - b.halfLength; z < b.z + b.halfLength; z += b.shadeSpacing) {
          const sandX = b.x - 39;
          const sandY = groundHeightAt(landDistance(sandX, z), z);
          prop('parasol', sandX, sandY, z);
          for (const side of [-1, 1])
            prop('lounger', sandX + side * 1.2, sandY, z + 0.6, side * 0.06);
          bench(b.x + b.walkWidth / 2 + 1.8, COAST.landHeight, z, Math.PI / 2);
          bed(b.x + b.walkWidth / 2 + 7, COAST.landHeight, z + 6, 4.5, 7);
          lamp(b.x - b.walkWidth / 2 - 1.5, COAST.landHeight, z + 8, 3.2);
        }
        // Low, open shade pavilions: columns, timber slats, benches and a warm soffit strip.
        for (const offset of [-110, 88]) {
          const x = b.x + 35,
            z = b.z + offset,
            y = COAST.landHeight;
          prop('pavilion', x, y, z);
          bench(x, y + 0.25, z - 6);
          bench(x, y + 0.25, z + 6);
        }
      } else {
        const c = PUBLIC_REALM.central,
          y = COAST.landHeight;
        block(stone, c.x, y + 0.04, c.z, c.halfSize * 2, 0.1, c.halfSize * 2);
        // A shallow reflective rill gives the square a quiet focal point; no fountain particles.
        block(metal, c.x, y + 0.12, c.z, 3.8, 0.15, 48);
        block(water, c.x, y + 0.21, c.z, 3.3, 0.05, 47.5);
        for (const dx of [-34, 34])
          for (const dz of [-34, 34]) {
            bed(c.x + dx, y, c.z + dz, 14, 12);
            bench(c.x + dx, y, c.z + dz + 8);
            bench(c.x + dx, y, c.z + dz - 8);
          }
        // Small table clusters soften the large square without blocking its main walking lines.
        for (const side of [-1, 1])
          for (const offset of [-12, 12]) {
            const x = c.x + side * 34,
              z = c.z + offset;
            prop('table', x, y, z);
            prop('parasol', x, y, z + 3.8);
            for (const side of [-1, 1]) {
              prop('chair', x + side * 1.1, y, z, (-side * Math.PI) / 2);
              prop('chair', x, y, z + side * 1.1, side === 1 ? Math.PI : 0);
            }
          }
        for (let offset = -56; offset <= 56; offset += 14) {
          block(metal, c.x + offset, y + 0.1, c.z, 0.07, 0.01, 130);
          block(metal, c.x, y + 0.1, c.z + offset, 130, 0.01, 0.07);
        }
        for (const side of [-1, 1]) {
          const x = c.x + side * c.arcadeOffset;
          for (let z = c.z - 50; z <= c.z + 50; z += 10) {
            prop('arcade', x, y, z, side === 1 ? 0 : Math.PI);
            add(poolGeometry, pool, x - side * 2, y + 0.14, z, 13, 1, 13);
            bench(x - side * 2, y, z);
          }
        }
        for (const dx of [-20, 20])
          for (const dz of [-18, 18]) {
            add(poolGeometry, pool, c.x + dx, y + 0.14, c.z + dz, 26, 1, 26);
            lamp(c.x + dx, y, c.z + dz, 4.8);
          }
      }
      for (const [collection, parent] of [
        [batches, root],
        [nearBatches, near],
        [farBatches, far],
      ] as const) {
        for (const batch of collection.values()) {
          const mesh = new InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
          batch.matrices.forEach((m, i) => {
            mesh.setMatrixAt(i, m);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          mesh.castShadow = batch.material !== pool;
          mesh.receiveShadow = true;
          parent.add(mesh);
        }
      }
      // Every template not used in this area stays CPU-only; release it explicitly.
      for (const geometry of [box, poolGeometry])
        if (![...batches.values()].some((b) => b.geometry === geometry)) geometry.dispose();
      this.addCrowd(kind, root);
    }
  }

  private addCrowd(kind: 'beach' | 'central', root: Group): void {
    const area = PUBLIC_REALM[kind],
      random = createRandom(kind === 'beach' ? 87 : 91);
    const count = kind === 'beach' ? CROWD.beachCount : CROWD.centralCount;
    const walkers: Walker[] = Array.from({ length: count }, (_, i) => ({
      x: area.x + (i % 2 === 0 ? -1 : 1) * (kind === 'beach' ? 3 : 16),
      from: area.z - (kind === 'beach' ? 190 : 24),
      length: kind === 'beach' ? 380 : 48,
      phase: random(),
      direction: i % 2 === 0 ? 1 : -1,
      scale: 0.9 + random() * 0.2,
      y: COAST.landHeight + (kind === 'beach' ? 0.19 : 0.1),
    }));
    const material = (color: string): MeshStandardMaterial =>
      this.atmosphere.patch(new MeshStandardMaterial({ color, roughness: 0.95 }));
    const body = new InstancedMesh(
      new CapsuleGeometry(0.2, 0.62, 3, 6).translate(0, 1.07, 0),
      material('#ffffff'),
      count,
    );
    const head = new InstancedMesh(
      new SphereGeometry(0.135, 8, 6).translate(0, CROWD.height - 0.12, 0),
      material('#ffffff'),
      count,
    );
    const legGeometry = new CapsuleGeometry(0.07, 0.6, 2, 5).translate(0, -0.36, 0);
    const legs: [InstancedMesh, InstancedMesh] = [
      new InstancedMesh(legGeometry, material('#55534a'), count),
      new InstancedMesh(legGeometry, material('#55534a'), count),
    ];
    const armGeometry = new CapsuleGeometry(0.055, 0.43, 2, 5).translate(0, -0.25, 0);
    const arms: [InstancedMesh, InstancedMesh] = [
      new InstancedMesh(armGeometry, material('#ffffff'), count),
      new InstancedMesh(armGeometry, material('#ffffff'), count),
    ];
    const group = new Group();
    group.name = `people-${kind}`;
    group.add(body, head, ...legs, ...arms);
    root.add(group);
    for (let i = 0; i < count; i++) {
      body.setColorAt(i, new Color(COLORS.clothing[Math.floor(random() * COLORS.clothing.length)]));
      const clothing = body.instanceColor;
      if (clothing) {
        const color = new Color().fromBufferAttribute(clothing, i);
        for (const arm of arms) arm.setColorAt(i, color);
      }
      head.setColorAt(i, new Color(COLORS.skin[Math.floor(random() * COLORS.skin.length)]));
    }
    for (const mesh of [body, head, ...legs, ...arms]) {
      mesh.frustumCulled = false;
      mesh.castShadow = false;
    }
    this.crowds.push({
      root: group,
      centre: new Vector3(area.x, 0, area.z),
      walkers,
      body,
      head,
      legs,
      arms,
    });
    const crowd = this.crowds[this.crowds.length - 1];
    if (crowd) this.poseCrowd(crowd);
  }

  private poseCrowd(crowd: Crowd): void {
    crowd.walkers.forEach((walker, index) => {
      const progress = (walker.phase + (this.walkTime * CROWD.speed) / walker.length) % 1;
      const z = walker.from + (walker.direction === 1 ? progress : 1 - progress) * walker.length;
      this.matrix.makeRotationY(walker.direction === 1 ? 0 : Math.PI);
      this.matrix.scale(this.walkScale.setScalar(walker.scale));
      this.matrix.setPosition(walker.x, walker.y, z);
      crowd.body.setMatrixAt(index, this.matrix);
      crowd.head.setMatrixAt(index, this.matrix);
      crowd.arms.forEach((arm, side) => {
        this.legMatrix.makeTranslation(side === 0 ? -0.24 : 0.24, 1.35, 0);
        this.legMatrix.multiply(
          this.legRotation.makeRotationX(
            Math.sin(this.walkTime * CROWD.stride + walker.phase * Math.PI * 2 + side * Math.PI) *
              -0.22,
          ),
        );
        this.legMatrix.premultiply(this.matrix);
        arm.setMatrixAt(index, this.legMatrix);
      });
      crowd.legs.forEach((leg, side) => {
        this.legMatrix.makeTranslation(side === 0 ? -0.105 : 0.105, 0.78, 0);
        this.legMatrix.multiply(
          this.legRotation.makeRotationX(
            Math.sin(this.walkTime * CROWD.stride + walker.phase * Math.PI * 2 + side * Math.PI) *
              0.32,
          ),
        );
        this.legMatrix.premultiply(this.matrix);
        leg.setMatrixAt(index, this.legMatrix);
      });
    });
    for (const mesh of [crowd.body, crowd.head, ...crowd.legs, ...crowd.arms])
      mesh.instanceMatrix.needsUpdate = true;
  }

  update(delta: number, camera: PerspectiveCamera): void {
    if (!this.reducedMotion.matches) this.walkTime += delta;
    for (const area of this.areas) {
      const distance = camera.position.distanceTo(area.centre);
      area.root.visible = distance < PUBLIC_REALM.detailRange;
      area.near.visible = distance < PUBLIC_REALM.fineDetailRange;
      area.far.visible = !area.near.visible;
    }
    for (const crowd of this.crowds) {
      crowd.root.visible = camera.position.distanceTo(crowd.centre) < PUBLIC_REALM.peopleRange;
      if (crowd.root.visible && !this.reducedMotion.matches) this.poseCrowd(crowd);
    }
  }

  dispose(): void {
    this.disposed = true;
    disposeObject(this.object);
  }
}
