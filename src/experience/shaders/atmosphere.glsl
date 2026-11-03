// Height-based aerial perspective shared by every lit material and the sea.
// Haze colour is the sky's own horizon colour in the view direction, so distant geometry
// dissolves into the sky exactly, warmed further when looking toward the sun.
uniform samplerCube uAtmoSky;
uniform sampler2D uAtmoHaze;
uniform vec3 uAtmoSunDir;
uniform float uAtmoDensity;
uniform float uAtmoFalloff;
uniform float uAtmoSunScatter;
uniform float uAtmoMaxHaze;

// Horizon colour by compass direction, from a baked seamless lookup (see Environment.bakeHaze).
vec3 atmoHorizonColor(vec3 dir) {
  float u = atan(dir.z, dir.x) / 6.28318530718;
  vec3 color = texture2D(uAtmoHaze, vec2(u, 0.5)).rgb;
  // Smooth highlight roll-off (a hard clamp leaves visible edges where it kicks in).
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color / (1.0 + luminance / uAtmoMaxHaze);
}

vec3 applyAtmosphere(vec3 color, vec3 worldPos) {
  vec3 ray = worldPos - cameraPosition;
  float dist = length(ray);
  vec3 rd = ray / max(dist, 1e-4);

  // Analytic integral of density a·exp(-b·y) along the view ray.
  float k = rd.y * uAtmoFalloff;
  float optical = abs(k) < 1e-6 ? dist : (1.0 - exp(-dist * k)) / k;
  float amount = 1.0 - exp(-uAtmoDensity * exp(-cameraPosition.y * uAtmoFalloff) * optical);

  float sunAmount = pow(max(dot(rd, uAtmoSunDir), 0.0), 8.0);
  vec3 haze = atmoHorizonColor(rd) * (1.0 + sunAmount * uAtmoSunScatter);
  return mix(color, haze, clamp(amount, 0.0, 1.0));
}
