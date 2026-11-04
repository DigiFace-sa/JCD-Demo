import { Color, Vector3 } from 'three';
import latticeGlsl from '../../shaders/lattice.glsl?raw';
import type { MaterialExtension } from '../Atmosphere';

export interface LatticeOptions {
  readonly center: Vector3;
  /** Diamond size (m). */
  readonly cell: number;
  /** Member width as a fraction of the cell. */
  readonly width: number;
  /** Interior light seen through the lattice (linear, HDR). */
  readonly glow: Color;
  readonly interior: Color;
  /** `dome`: wrapped around `center` (curved shells); `panel`: flat vertical panels. */
  readonly mapping?: 'dome' | 'panel';
}

const AROUND = {
  dome: `vec2 latticeRel = vAtmoWorldPos.xz - uLatticeCenter.xz;
    float latticeAround = atan(latticeRel.y, latticeRel.x) * length(latticeRel);`,
  // Along the panel's horizontal tangent, so every facing gets the same, unstretched pattern.
  panel: `vec2 latticeTangent = normalize(vec2(-vLatticeNormal.z, vLatticeNormal.x) + 1e-5);
    float latticeAround = dot(vAtmoWorldPos.xz, latticeTangent);`,
} as const;

/** Brass roshan lattice over a glowing interior, for facade materials. */
export function latticeExtension(options: LatticeOptions): MaterialExtension {
  const mapping = options.mapping ?? 'dome';
  return {
    key: `lattice-${mapping}`,
    uniforms: {
      uLatticeCenter: { value: options.center },
      uLatticeCell: { value: options.cell },
      uLatticeWidth: { value: options.width },
      uLatticeGlow: { value: options.glow },
      uLatticeInterior: { value: options.interior },
    },
    vertexPars: 'varying vec3 vLatticeNormal;',
    vertexMain: 'vLatticeNormal = normalize(mat3(modelMatrix) * objectNormal);',
    fragmentPars: `${latticeGlsl}\nvarying vec3 vLatticeNormal;\nfloat lattice;`,
    afterDiffuse: `${AROUND[mapping]}
      lattice = latticeMask(vAtmoWorldPos, latticeAround);
      diffuseColor.rgb = mix(uLatticeInterior, diffuseColor.rgb, lattice);`,
    afterEmissive: 'totalEmissiveRadiance += uLatticeGlow * (1.0 - lattice);',
  };
}
