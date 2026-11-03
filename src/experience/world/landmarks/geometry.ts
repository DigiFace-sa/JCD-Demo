import { BufferAttribute, BufferGeometry } from 'three';

/**
 * Surface between two concentric ellipses (scaled by `inner` and `outer`), at heights
 * yInner and yOuter: a flat ring, a sloping roof or a seating bowl.
 */
export function ellipticRing(
  radiusX: number,
  radiusZ: number,
  inner: number,
  outer: number,
  yInner: number,
  yOuter: number,
  segments = 128,
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cx = Math.cos(angle) * radiusX;
    const cz = Math.sin(angle) * radiusZ;
    positions.push(cx * inner, yInner, cz * inner, cx * outer, yOuter, cz * outer);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Vertical elliptic band (open cylinder), optionally flaring between bottom and top. */
export function ellipticBand(
  radiusX: number,
  radiusZ: number,
  y0: number,
  y1: number,
  bottomScale = 1,
  topScale = 1,
  segments = 128,
): BufferGeometry {
  return ellipticRing(radiusX, radiusZ, bottomScale, topScale, y0, y1, segments);
}

/** Flat elliptic disc. */
export function ellipticDisc(
  radiusX: number,
  radiusZ: number,
  y: number,
  segments = 96,
): BufferGeometry {
  return ellipticRing(radiusX, radiusZ, 0, 1, y, y, segments);
}
