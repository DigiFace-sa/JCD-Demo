import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';
import { STADIUM, STADIUM_POSITION } from '../../../config/stadium';
import type { Atmosphere } from '../../Atmosphere';
import { ellipticBand, ellipticRing } from '../geometry';

/** Shared masonry and structure palette, deliberately restrained under the sunset lighting. */
const PALETTE = {
  concrete: '#c2b8a6',
  seat: '#426b70',
  steel: '#a79e8b',
  glass: '#253f49',
  glow: '#ffba72',
} as const;
const AISLE_SEGMENTS = 16;
const VIP_BAYS = 72;
/** One rounded, two-triangle back per illustrative seat; colour and edge detail stay in the shader. */
const SEATS_PER_ROW = 464;
const SEAT_BACK = { width: 0.64, height: 0.52, lift: 0.3 } as const;
const GOAL = { width: 7.32, height: 2.44, depth: 1.8, halfPitch: 51.5 } as const;
const Y_AXIS = new Vector3(0, 1, 0);

/** Quad builder: winding is checked against an outward/up normal before indexing. */
class Surface {
  private readonly positions: number[] = [];
  private readonly indices: number[] = [];

  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, normal = Y_AXIS): void {
    const offset = this.positions.length / 3;
    for (const v of [a, b, c, d]) this.positions.push(v.x, v.y, v.z);
    const cross = b.clone().sub(a).cross(c.clone().sub(a));
    if (cross.dot(normal) >= 0)
      this.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
    else this.indices.push(offset, offset + 2, offset + 1, offset, offset + 3, offset + 2);
  }

  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

const point = (r: number, y: number, angle: number): Vector3 =>
  new Vector3(Math.cos(angle) * STADIUM.rx * r, y, Math.sin(angle) * STADIUM.rz * r);

/** Elliptic facade with a real east-side entrance; shader lattice remains intact elsewhere. */
export function entranceFacade(): BufferGeometry {
  const surface = new Surface();
  const doorwayAngle = Math.asin(STADIUM.tunnel.halfWidth / STADIUM.rz);
  for (let i = 0; i < STADIUM.segments; i++) {
    const a = (i / STADIUM.segments) * Math.PI * 2;
    const b = ((i + 1) / STADIUM.segments) * Math.PI * 2;
    const doorway = Math.cos((a + b) / 2) > Math.cos(doorwayAngle * 1.6);
    const bottom = doorway ? STADIUM.tunnel.ceiling : 4;
    const outward = point(1, 0, (a + b) / 2).normalize();
    surface.quad(
      point(0.97, bottom, a),
      point(0.97, bottom, b),
      point(1.03, 40, b),
      point(1.03, 40, a),
      outward,
    );
  }
  return surface.geometry();
}

/** All seating is stepped geometry plus a filtered shader, never one draw call per seat. */
export function createInterior(atmosphere: Atmosphere): Group {
  const root = new Group();
  root.name = 'stadium-interior';
  const material = (
    params: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => atmosphere.patch(new MeshStandardMaterial(params));
  const stone = material({ color: PALETTE.concrete, roughness: 0.84, side: DoubleSide });
  const steel = material({ color: PALETTE.steel, roughness: 0.4, metalness: 0.65 });
  const glow = atmosphere.night.material(
    material({ color: '#000000', emissive: PALETTE.glow, emissiveIntensity: 1.2 }),
    1.2,
    3.2,
  );
  const seats = atmosphere.patch(
    new MeshStandardMaterial({
      color: PALETTE.seat,
      roughness: 0.7,
      side: DoubleSide,
      emissive: '#7d9999',
      emissiveIntensity: 0.16,
    }),
    {
      key: 'stadium-seats',
      uniforms: {
        uStadiumCenter: {
          value: new Vector3(STADIUM_POSITION.x, STADIUM_POSITION.y, STADIUM_POSITION.z),
        },
      },
      fragmentPars: 'uniform vec3 uStadiumCenter;',
      afterDiffuse: `
      vec3 p = vAtmoWorldPos - uStadiumCenter;
      float theta = atan(p.z / ${STADIUM.rz.toFixed(1)}, p.x / ${STADIUM.rx.toFixed(1)});
      float arc = theta * 110.0;
      float cell = fract(arc / 0.56);
      float edge = max(fwidth(arc / 0.56), 0.025);
      float seat = smoothstep(0.08, 0.08 + edge, cell) * (1.0 - smoothstep(0.84 - edge, 0.84, cell));
      float pattern = 0.5 + 0.5 * sin(theta * 7.0 + p.y * 0.12);
        vec3 fabric = mix(vec3(0.09, 0.22, 0.24), vec3(0.5, 0.57, 0.52), smoothstep(0.22, 0.78, pattern));
      diffuseColor.rgb = mix(fabric * 0.65, fabric, mix(0.72, seat, 1.0 - smoothstep(0.3, 0.9, edge)));
    `,
    },
  );
  const treads = new Surface();
  const masonry = new Surface();
  for (const tier of STADIUM.tiers) {
    for (let row = 0; row < tier.rows; row++) {
      const r0 = tier.inner + (row / tier.rows) * (tier.outer - tier.inner);
      const r1 = tier.inner + ((row + 1) / tier.rows) * (tier.outer - tier.inner);
      const y0 = tier.bottom + (row / tier.rows) * (tier.top - tier.bottom);
      const y1 = tier.bottom + ((row + 1) / tier.rows) * (tier.top - tier.bottom);
      for (let i = 0; i < STADIUM.segments; i++) {
        const a = (i / STADIUM.segments) * Math.PI * 2;
        const b = ((i + 1) / STADIUM.segments) * Math.PI * 2;
        const aisle = i % AISLE_SEGMENTS < 2;
        // Openings occupy the foot of the middle/upper tiers and open onto the concourse.
        if (tier.inner > 0.7 && row < 4 && aisle) continue;
        (aisle ? masonry : treads).quad(
          point(r0, y1, a),
          point(r1, y1, a),
          point(r1, y1, b),
          point(r0, y1, b),
        );
        masonry.quad(
          point(r0, y0, a),
          point(r0, y1, a),
          point(r0, y1, b),
          point(r0, y0, b),
          point(-1, 0, (a + b) / 2),
        );
      }
    }
  }
  root.add(new Mesh(treads.geometry(), seats), new Mesh(masonry.geometry(), stone));
  // An inward lining keeps the external lattice glow out of the bowl and darkens its portals.
  const lining = new Mesh(
    entranceFacade(),
    material({ color: '#394c50', roughness: 0.82, side: DoubleSide }),
  );
  lining.scale.set(0.99, 1, 0.99);
  root.add(lining);

  // Walkways and an under-terrace ring: solid materials avoid transparency sorting costs.
  root.add(
    new Mesh(ellipticRing(STADIUM.rx, STADIUM.rz, 0.69, 1.025, 14, 14), stone),
    new Mesh(ellipticRing(STADIUM.rx, STADIUM.rz, 0.84, 1.01, 27.3, 27.3), stone),
    new Mesh(
      ellipticBand(STADIUM.rx * 0.86, STADIUM.rz * 0.86, 27.5, 30.5),
      material({
        color: PALETTE.glass,
        roughness: 0.22,
        metalness: 0.45,
        emissive: PALETTE.glow,
        emissiveIntensity: 0.35,
        side: DoubleSide,
      }),
    ),
    new Mesh(ellipticBand(STADIUM.rx * 0.865, STADIUM.rz * 0.865, 27.1, 27.5), glow),
  );

  const frames = new InstancedMesh(new BoxGeometry(0.18, 3.4, 0.28), steel, VIP_BAYS);
  const transform = new Matrix4();
  for (let i = 0; i < VIP_BAYS; i++) {
    const angle = (i / VIP_BAYS) * Math.PI * 2;
    transform.makeRotationY(-angle);
    transform.setPosition(point(0.855, 29, angle));
    frames.setMatrixAt(i, transform);
  }
  root.add(frames);

  const seatBackMaterial = atmosphere.patch(
    new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.68,
      side: DoubleSide,
      alphaTest: 0.5,
    }),
    {
      key: 'stadium-seat-backs',
      uniforms: {
        uStadiumCenter: {
          value: new Vector3(STADIUM_POSITION.x, STADIUM_POSITION.y, STADIUM_POSITION.z),
        },
      },
      vertexPars: 'varying vec2 vSeatUv;',
      vertexMain: 'vSeatUv = uv;',
      fragmentPars: 'varying vec2 vSeatUv; uniform vec3 uStadiumCenter;',
      afterDiffuse: `
      vec2 corner = max(abs(vSeatUv - vec2(0.5, 0.46)) - vec2(0.38, 0.42), 0.0);
      float shape = length(corner) - 0.1;
      float edge = max(fwidth(shape), 0.001);
      diffuseColor.a = 1.0 - smoothstep(-edge, edge, shape);
      vec3 p = vAtmoWorldPos - uStadiumCenter;
      float theta = atan(p.z / ${STADIUM.rz.toFixed(1)}, p.x / ${STADIUM.rx.toFixed(1)});
      float ribbon = smoothstep(0.24, 0.76, 0.5 + 0.5 * sin(theta * 7.0 + p.y * 0.12));
      diffuseColor.rgb = mix(vec3(0.07, 0.18, 0.20), vec3(0.46, 0.55, 0.50), ribbon);
      diffuseColor.rgb *= 0.72 + 0.28 * smoothstep(0.0, 0.7, vSeatUv.y);
    `,
    },
  );
  const totalRows = STADIUM.tiers.reduce((sum, tier) => sum + tier.rows, 0);
  const seatBacks = new InstancedMesh(
    new PlaneGeometry(SEAT_BACK.width, SEAT_BACK.height),
    seatBackMaterial,
    totalRows * SEATS_PER_ROW,
  );
  let instance = 0;
  for (const tier of STADIUM.tiers) {
    for (let row = 0; row < tier.rows; row++) {
      const radius = tier.inner + ((row + 0.85) / tier.rows) * (tier.outer - tier.inner);
      const height =
        tier.bottom + ((row + 1) / tier.rows) * (tier.top - tier.bottom) + SEAT_BACK.lift;
      for (let seat = 0; seat < SEATS_PER_ROW; seat++) {
        const angle = ((seat + 0.5) / SEATS_PER_ROW) * Math.PI * 2;
        const segment = Math.floor((angle / (Math.PI * 2)) * STADIUM.segments);
        if (segment % AISLE_SEGMENTS < 2) continue;
        const position = point(radius, height, angle);
        if (
          position.x >= STADIUM.tunnel.innerX - SEAT_BACK.width &&
          Math.abs(position.z) < STADIUM.tunnel.halfWidth + SEAT_BACK.width &&
          position.y < STADIUM.tunnel.ceiling
        )
          continue;
        transform.makeRotationY(-angle - Math.PI / 2);
        transform.setPosition(position);
        seatBacks.setMatrixAt(instance++, transform);
      }
    }
  }
  seatBacks.count = instance;
  seatBacks.name = 'stadium-seat-backs';
  root.add(seatBacks);

  const goalMaterial = material({ color: '#f3f0df', roughness: 0.55 });
  const goals = new InstancedMesh(new BoxGeometry(1, 1, 1), goalMaterial, 6);
  for (let end = 0; end < 2; end++) {
    const z = (end === 0 ? -1 : 1) * GOAL.halfPitch;
    for (let post = 0; post < 2; post++) {
      transform.makeScale(0.12, GOAL.height, 0.12);
      transform.setPosition(((post === 0 ? -1 : 1) * GOAL.width) / 2, 3 + GOAL.height / 2, z);
      goals.setMatrixAt(end * 3 + post, transform);
    }
    transform.makeScale(GOAL.width + 0.12, 0.12, 0.12);
    transform.setPosition(0, 3 + GOAL.height, z);
    goals.setMatrixAt(end * 3 + 2, transform);
    const net = new Mesh(
      new PlaneGeometry(GOAL.width, GOAL.height),
      atmosphere.patch(
        new MeshStandardMaterial({
          color: '#ddd9cc',
          roughness: 0.8,
          side: DoubleSide,
          alphaTest: 0.5,
        }),
        {
          key: 'stadium-net',
          uniforms: {},
          fragmentPars: '',
          afterDiffuse: `
        vec2 grid = fract(vAtmoWorldPos.xy / 0.16);
        vec2 width = max(fwidth(vAtmoWorldPos.xy / 0.16), vec2(0.02));
        vec2 thread = 1.0 - smoothstep(vec2(0.035), vec2(0.035) + width, min(grid, 1.0 - grid));
        diffuseColor.a = max(thread.x, thread.y);
      `,
        },
      ),
    );
    net.position.set(0, 3 + GOAL.height / 2, z + (end === 0 ? -1 : 1) * GOAL.depth);
    root.add(net);
  }
  root.add(goals);

  // Roof structure is part of the exterior model (stadium.glb), aligned with its louvre roof.

  const { tunnel } = STADIUM;
  const length = tunnel.outerX - tunnel.innerX;
  const center = (tunnel.outerX + tunnel.innerX) / 2;
  const boxes: {
    size: [number, number, number];
    position: [number, number, number];
    lit?: boolean;
  }[] = [
    { size: [length, 0.5, tunnel.halfWidth * 2], position: [center, tunnel.floor - 0.25, 0] },
    {
      size: [length, 0.45, tunnel.halfWidth * 2 + 0.8],
      position: [center, tunnel.ceiling + 0.225, 0],
    },
  ];
  for (const side of [-1, 1]) {
    boxes.push(
      { size: [length, 5, 0.4], position: [center, 16.5, side * (tunnel.halfWidth + 0.2)] },
      {
        size: [length, 0.12, 0.12],
        position: [center, 14.7, side * (tunnel.halfWidth - 0.05)],
        lit: true,
      },
      {
        size: [length, 0.1, 0.1],
        position: [center, 18.5, side * (tunnel.halfWidth - 0.05)],
        lit: true,
      },
    );
  }
  for (const lit of [false, true]) {
    const selected = boxes.filter((box) => Boolean(box.lit) === lit);
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), lit ? glow : stone, selected.length);
    selected.forEach((box, index) => {
      transform.makeScale(...box.size);
      transform.setPosition(...box.position);
      mesh.setMatrixAt(index, transform);
    });
    root.add(mesh);
  }
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow =
        object.material !== glow &&
        !(object.material instanceof MeshStandardMaterial && object.material.alphaTest > 0);
      object.receiveShadow = true;
    }
  });
  return root;
}
