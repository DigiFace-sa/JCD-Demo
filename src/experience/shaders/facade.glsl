// Procedural facade for simple box buildings: floor bands of glazing with mullions and a
// scattering of warm-lit windows. Filtered by screen-space derivatives so it fades to its
// average at a distance instead of shimmering (moiré reads as cheap).
uniform float uFacadeBase;
uniform float uFacadeFloorHeight;
uniform float uFacadeBayWidth;
uniform float uFacadeLitFraction;
uniform vec3 uFacadeLight;

float facadeHash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

// Box-filtered pulse: coverage of [edge0, edge1] within a cell, antialiased by `width`.
float facadePulse(float edge0, float edge1, float x, float width) {
  return smoothstep(edge0 - width, edge0 + width, x) * (1.0 - smoothstep(edge1 - width, edge1 + width, x));
}

// x = glazing coverage (0–1), y = lit-window coverage (0–1).
vec2 facadeSample(vec3 worldPos) {
  vec3 worldNormal = normalize(cross(dFdx(worldPos), dFdy(worldPos)));
  if (abs(worldNormal.y) > 0.5) return vec2(0.0); // roofs

  float along = abs(worldNormal.x) > abs(worldNormal.z) ? worldPos.z : worldPos.x;
  vec2 grid = vec2(along / uFacadeBayWidth, (worldPos.y - uFacadeBase) / uFacadeFloorHeight);
  if (grid.y < 0.75) return vec2(0.0); // solid ground-floor plinth

  vec2 cell = fract(grid);
  vec2 width = fwidth(grid);
  float detail = clamp(1.0 - max(width.x, width.y) * 1.5, 0.0, 1.0);

  const float MEAN_GLAZING = 0.68 * 0.55;
  float glazing = facadePulse(0.16, 0.84, cell.x, width.x) * facadePulse(0.3, 0.85, cell.y, width.y);
  glazing = mix(MEAN_GLAZING, glazing, detail);

  float building = facadeHash(floor(worldPos.xzz / 40.0));
  float isLit = step(facadeHash(vec3(floor(grid), building)), uFacadeLitFraction);
  float lit = mix(MEAN_GLAZING * uFacadeLitFraction, glazing * isLit, detail);
  return vec2(glazing, lit);
}
