import { ExtrudeGeometry, Mesh, MeshStandardMaterial, Shape } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MASTERPLAN, type Segment } from '../../config/masterplan';
import { COAST } from '../../config/scene';
import type { Disposable } from '../../types';
import type { Atmosphere } from '../Atmosphere';

const COLOR = '#cfc3b1';
/** Arc resolution of the rounded ends. */
const CURVE_SEGMENTS = 24;

/** Capsule outline in the xz plane (stored as shape x/y = world x/z). */
function capsuleShape({ from, to, radius }: Segment): Shape {
  const angle = Math.atan2(to.z - from.z, to.x - from.x);
  const shape = new Shape();
  shape.absarc(to.x, to.z, radius, angle - Math.PI / 2, angle + Math.PI / 2, false);
  shape.absarc(from.x, from.z, radius, angle + Math.PI / 2, angle + (Math.PI * 3) / 2, false);
  shape.closePath();
  return shape;
}

/** Marina breakwaters as clean extruded quays (smooth edges at any angle). */
export class Breakwaters implements Disposable {
  readonly object: Mesh<ExtrudeGeometry | ReturnType<typeof mergeGeometries>, MeshStandardMaterial>;

  constructor(atmosphere: Atmosphere) {
    const depth = COAST.landHeight - MASTERPLAN.quayDepth;
    const parts = MASTERPLAN.breakwaters.map((segment) =>
      // Extrude along +z, then lay flat: shape y becomes world z, extrusion becomes height.
      new ExtrudeGeometry(capsuleShape(segment), {
        depth,
        bevelEnabled: false,
        curveSegments: CURVE_SEGMENTS,
      })
        .rotateX(Math.PI / 2)
        .translate(0, COAST.landHeight, 0),
    );
    this.object = new Mesh(
      mergeGeometries(parts),
      atmosphere.patch(new MeshStandardMaterial({ color: COLOR, roughness: 0.85 })),
    );
    this.object.name = 'breakwaters';
    this.object.castShadow = true;
    this.object.receiveShadow = true;
    parts.forEach((part) => {
      part.dispose();
    });
  }

  dispose(): void {
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
