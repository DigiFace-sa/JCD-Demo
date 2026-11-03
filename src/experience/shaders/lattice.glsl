// Diamond lattice (roshan-inspired) wrapped around a vertical facade: brass members in front
// of a warmly lit interior. Painted, not cut out, so it never aliases or flickers at distance;
// beyond the resolvable range it fades to its average.
uniform vec3 uLatticeCenter;
uniform float uLatticeCell;
uniform float uLatticeWidth;
uniform vec3 uLatticeGlow;
uniform vec3 uLatticeInterior;

float latticeMask(vec3 worldPos) {
  vec2 rel = worldPos.xz - uLatticeCenter.xz;
  float around = atan(rel.y, rel.x) * length(rel);
  vec2 grid = vec2(around, worldPos.y - uLatticeCenter.y) / uLatticeCell;
  vec2 diagonal = vec2(grid.x + grid.y, grid.x - grid.y);
  vec2 lines = abs(fract(diagonal) - 0.5);
  vec2 width = fwidth(diagonal);
  float member = 1.0 - smoothstep(uLatticeWidth - width.x, uLatticeWidth + width.x, min(lines.x, lines.y) * 2.0);
  float detail = clamp(1.0 - max(width.x, width.y) * 2.0, 0.0, 1.0);
  return mix(0.55, member, detail);
}
