import {
  AdditiveBlending,
  CanvasTexture,
  MeshBasicMaterial,
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
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
  planter: '#bbaa8c',
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
  private readonly areas: { readonly root: Group; readonly centre: Vector3 }[] = [];
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

  private async build(): Promise<void> {
    const [paving, timber] = await Promise.all([textureSet('paving'), textureSet('timber')]);
    if (this.disposed) return;
    const stone = boxMappedMaterial(this.atmosphere, {
      maps: paving,
      tile: 3,
      tint: COLORS.stone,
      normalStrength: 0.35,
      detail: 0.3,
      roughness: 0.9,
    });
    const wood = boxMappedMaterial(this.atmosphere, {
      maps: timber,
      tile: 2,
      tint: COLORS.wood,
      normalStrength: 0.35,
      detail: 0.45,
      roughness: 0.85,
    });
    const standard = (color: string, metalness = 0): MeshStandardMaterial =>
      this.atmosphere.patch(new MeshStandardMaterial({ color, roughness: 0.75, metalness }));
    const fabric = standard(COLORS.fabric);
    fabric.side = DoubleSide;
    const metal = standard(COLORS.metal, 0.55);
    const planter = standard(COLORS.planter);
    const glass = this.atmosphere.night.material(
      this.atmosphere.patch(
        new MeshStandardMaterial({
          color: COLORS.glass,
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
        new MeshStandardMaterial({ color: '#c9b99d', emissive: COLORS.light, roughness: 0.5 }),
      ),
      0,
      1.1,
    );
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
    const leaves = standard('#435538');
    for (const kind of ['beach', 'central'] as const) {
      const root = new Group();
      root.name = `public-realm-${kind}`;
      const area = PUBLIC_REALM[kind];
      this.areas.push({ root, centre: new Vector3(area.x, 0, area.z) });
      this.object.add(root);
      const batches = new Map<string, Batch>();
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
      const pole = new CylinderGeometry(1, 1, 1, 8);
      const umbrella = new ConeGeometry(PUBLIC_REALM.beach.shadeRadius, 0.9, 16, 1, true);
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
      ): void => {
        const key = `${geometry.uuid}:${material.uuid}`;
        let batch = batches.get(key);
        if (!batch) {
          batch = { geometry, material, matrices: [] };
          batches.set(key, batch);
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
      const post = (x: number, y: number, z: number, h: number, radius = 0.065): void => {
        add(pole, metal, x, y + h / 2, z, radius, h, radius);
      };
      const bench = (x: number, y: number, z: number, angle = 0): void => {
        for (let slat = 0; slat < 5; slat++) {
          const across = (slat - 2) * 0.115;
          block(
            wood,
            x + Math.sin(angle) * across,
            y + 0.48,
            z + Math.cos(angle) * across,
            2.5,
            0.08,
            0.09,
            angle,
          );
        }
        for (const side of [-1, 1])
          block(
            metal,
            x + Math.cos(angle) * side,
            y + 0.23,
            z - Math.sin(angle) * side,
            0.08,
            0.45,
            0.5,
            angle,
          );
      };
      const bed = (x: number, y: number, z: number, w: number, d: number): void => {
        block(planter, x, y + 0.34, z, w, 0.68, d);
        block(leaves, x, y + 0.69, z, w - 0.3, 0.12, d - 0.3);
      };
      if (kind === 'beach') {
        const b = PUBLIC_REALM.beach;
        // The deck is raised just above the sloping terrain; its long seams resolve up close.
        block(wood, b.x, COAST.landHeight + 0.08, b.z, b.walkWidth, 0.2, b.halfLength * 2);
        for (let z = b.z - b.halfLength; z < b.z + b.halfLength; z += b.shadeSpacing) {
          const sandX = b.x - 39;
          const sandY = groundHeightAt(landDistance(sandX, z), z);
          post(sandX, sandY, z, 2.8);
          add(umbrella, fabric, sandX, sandY + 2.9, z);
          for (const side of [-1, 1]) {
            block(wood, sandX + side * 1.2, sandY + 0.34, z, 0.7, 0.13, 2.1);
            block(fabric, sandX + side * 1.2, sandY + 0.45, z - 0.6, 0.65, 0.18, 0.8);
          }
          bench(b.x + b.walkWidth / 2 + 1.8, COAST.landHeight, z, Math.PI / 2);
          bed(b.x + b.walkWidth / 2 + 7, COAST.landHeight, z + 6, 4.5, 7);
          post(b.x - b.walkWidth / 2 - 1.5, COAST.landHeight, z + 8, 3.2);
          block(
            light,
            b.x - b.walkWidth / 2 - 1.5,
            COAST.landHeight + 3.15,
            z + 8,
            0.28,
            0.12,
            0.7,
          );
        }
        // Low, open shade pavilions: columns, timber slats, benches and a warm soffit strip.
        for (const offset of [-110, 88]) {
          const x = b.x + 35,
            z = b.z + offset,
            y = COAST.landHeight;
          block(stone, x, y + 0.12, z, 18, 0.25, 22);
          for (const dx of [-7, 7]) for (const dz of [-9, 9]) post(x + dx, y, z + dz, 4, 0.11);
          for (let i = -8; i <= 8; i++) block(wood, x + i, y + 4.15, z, 0.22, 0.3, 22);
          block(light, x, y + 3.96, z - 9, 12, 0.07, 0.12);
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
            add(pole, wood, x, y + 0.76, z, 0.8, 0.09, 0.8);
            post(x, y, z, 0.72, 0.08);
            post(x, y, z + 2.8, 2.8, 0.06);
            add(umbrella, fabric, x, y + 2.95, z + 2.8);
            for (const dx of [-1.2, 1.2])
              for (const dz of [-0.8, 0.8]) {
                block(wood, x + dx, y + 0.47, z + dz, 0.48, 0.08, 0.5);
                block(wood, x + dx, y + 0.8, z + dz + 0.22, 0.48, 0.58, 0.06);
                for (const a of [-0.18, 0.18])
                  for (const b of [-0.18, 0.18]) post(x + dx + a, y, z + dz + b, 0.43, 0.025);
              }
          }
        for (let offset = -56; offset <= 56; offset += 14) {
          block(metal, c.x + offset, y + 0.1, c.z, 0.07, 0.01, 130);
          block(metal, c.x, y + 0.1, c.z + offset, 130, 0.01, 0.07);
        }
        for (const side of [-1, 1]) {
          const x = c.x + side * c.arcadeOffset;
          block(stone, x, y + c.arcadeHeight, c.z, c.arcadeWidth, 0.65, c.arcadeLength);
          block(stone, x + side * 6, y + 3.4, c.z, 0.9, 6.8, c.arcadeLength);
          for (let z = c.z - 50; z <= c.z + 50; z += 10) {
            block(stone, x - side * 5, y + 3.5, z, 0.6, 7, 0.6);
            block(glass, x + side * 5.3, y + 2.8, z, 0.13, 4.4, 8.4);
            block(wood, x - side * 2, y + 5.6, z, 7, 0.18, 8);
            block(light, x + side * 4.6, y + 5, z, 0.12, 0.1, 7);
            add(poolGeometry, pool, x - side * 2, y + 0.14, z, 13, 1, 13);
            bench(x, y, z);
          }
          for (let z = c.z - 54; z <= c.z + 54; z += 1.5)
            block(wood, x, y + 8.2, z, c.arcadeWidth + 1, 0.18, 0.16);
        }
        for (const dx of [-20, 20])
          for (const dz of [-18, 18]) {
            add(poolGeometry, pool, c.x + dx, y + 0.14, c.z + dz, 26, 1, 26);
            post(c.x + dx, y, c.z + dz, 4.8, 0.08);
            block(light, c.x + dx, y + 4.7, c.z + dz, 1.2, 0.12, 0.4);
          }
      }
      for (const batch of batches.values()) {
        const mesh = new InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
        batch.matrices.forEach((m, i) => {
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = batch.material !== pool;
        mesh.receiveShadow = true;
        root.add(mesh);
      }
      // Every template not used in this area stays CPU-only; release it explicitly.
      for (const geometry of [box, pole, umbrella, poolGeometry])
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
    for (const area of this.areas)
      area.root.visible = camera.position.distanceTo(area.centre) < PUBLIC_REALM.detailRange;
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
