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
}

/** Brass roshan lattice over a glowing interior, for facade materials. */
export function latticeExtension(options: LatticeOptions): MaterialExtension {
  return {
    key: 'lattice',
    uniforms: {
      uLatticeCenter: { value: options.center },
      uLatticeCell: { value: options.cell },
      uLatticeWidth: { value: options.width },
      uLatticeGlow: { value: options.glow },
      uLatticeInterior: { value: options.interior },
    },
    fragmentPars: `${latticeGlsl}\nfloat lattice;`,
    afterDiffuse: `lattice = latticeMask(vAtmoWorldPos);
      diffuseColor.rgb = mix(uLatticeInterior, diffuseColor.rgb, lattice);`,
    afterEmissive: 'totalEmissiveRadiance += uLatticeGlow * (1.0 - lattice);',
  };
}
