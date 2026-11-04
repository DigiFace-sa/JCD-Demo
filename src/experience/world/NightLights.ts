import type { IUniform, MeshStandardMaterial } from 'three';

interface Entry {
  readonly apply: (lights: number) => void;
}

/**
 * Everything that switches on after dark: emissive materials and lighting uniforms register a
 * day and a night level, and `set(lights)` blends them (0 = day, 1 = night). One registry per
 * Experience (owned by Atmosphere), so nothing outlives the scene.
 */
export class NightLights {
  private readonly entries: Entry[] = [];
  private level = 0;

  /** Material emissive intensity by day and by night. */
  material(material: MeshStandardMaterial, day: number, night: number): MeshStandardMaterial {
    const apply = (lights: number): void => {
      material.emissiveIntensity = day + (night - day) * lights;
    };
    apply(this.level);
    this.entries.push({ apply });
    return material;
  }

  /** Numeric uniform by day and by night. */
  uniform(uniform: IUniform<number>, day: number, night: number): void {
    const apply = (lights: number): void => {
      uniform.value = day + (night - day) * lights;
    };
    apply(this.level);
    this.entries.push({ apply });
  }

  /** Arbitrary per-level update (e.g. visibility of lamp glows). */
  custom(apply: (lights: number) => void): void {
    apply(this.level);
    this.entries.push({ apply });
  }

  set(lights: number): void {
    this.level = lights;
    for (const entry of this.entries) entry.apply(lights);
  }

  get lights(): number {
    return this.level;
  }
}
