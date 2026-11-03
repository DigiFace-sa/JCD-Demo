uniform float uTime;
uniform sampler2D uWaveNormals;
uniform sampler2D uShoreField;
uniform vec4 uShoreBounds;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uSunLight;
uniform float uShallowDistance;
uniform float uFoamDistance;
uniform float uSunGlitter;
uniform float uSunSheen;
uniform float uNormalStrength;
uniform float uMaxRadiance;

varying vec3 vWorldPos;

// ATMOSPHERE_GLSL

vec3 waveNormal(vec2 uv) {
  return texture2D(uWaveNormals, uv).xyz * 2.0 - 1.0;
}

void main() {
  vec3 toCamera = cameraPosition - vWorldPos;
  float dist = length(toCamera);
  vec3 V = toCamera / dist;
  vec2 p = vWorldPos.xz;
  float t = uTime;

  // Four scrolling octaves at unrelated scales hide the tile repetition.
  vec3 n = waveNormal(p / 640.0 + t * vec2(0.0019, 0.0011)) * 0.9
         + waveNormal(p / 170.0 + t * vec2(-0.0058, 0.0037)) * 0.75
         + waveNormal(p / 43.0 + t * vec2(0.0115, -0.0083)) * 0.5
         + waveNormal(p / 11.5 + t * vec2(-0.019, -0.016)) * 0.3;
  // Calm the far field: reads as a smooth sheet and avoids specular sparkle aliasing.
  float strength = uNormalStrength / (1.0 + dist * 0.00028);
  vec3 N = normalize(vec3(n.x * strength, 1.0, n.y * strength));

  // Shore: shallow tint and foam from the baked signed distance field.
  vec2 shoreUv = (p - uShoreBounds.xy) / uShoreBounds.zw;
  bool inField = all(greaterThanEqual(shoreUv, vec2(0.0))) && all(lessThanEqual(shoreUv, vec2(1.0)));
  // Outside the baked field, treat the water as open sea (no shallows, no foam).
  float offshore = inField ? max(-texture2D(uShoreField, shoreUv).r, 0.0) : 1e4;
  float shallow = 1.0 - smoothstep(0.0, uShallowDistance, offshore);

  float facing = max(dot(N, V), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);

  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 skyReflection = textureCube(uAtmoSky, R).rgb;

  // Water body lit by the sky dome plus a little direct sun.
  vec3 skyLight = textureCube(uAtmoSky, vec3(0.0, 1.0, 0.0)).rgb;
  vec3 bodyLight = skyLight * 3.0 + uSunLight * max(uAtmoSunDir.y, 0.0) * 0.6;
  vec3 body = mix(uDeepColor, uShallowColor, shallow * 0.85) * bodyLight;

  // Light through wave crests when looking toward the sun.
  float backlight = pow(max(dot(-V, uAtmoSunDir), 0.0), 6.0);
  vec3 subsurface = uShallowColor * uSunLight * backlight * max(n.x + n.y, 0.0) * 0.05;

  float sunDot = max(dot(R, uAtmoSunDir), 0.0);
  vec3 specular = uSunLight * (pow(sunDot, 1400.0) * uSunGlitter + pow(sunDot, 90.0) * uSunSheen * 0.12);

  vec3 color = mix(body + subsurface, skyReflection, fresnel) + specular;

  // Shoreline foam: a soft band broken up by the wave height channel, gently washing in and out.
  float wash = 0.5 + 0.5 * sin(offshore * 0.55 - t * 0.9);
  float band = 1.0 - smoothstep(0.0, uFoamDistance * (0.7 + 0.6 * wash), offshore);
  float breakup = texture2D(uWaveNormals, p / 21.0 + t * vec2(0.008, 0.003)).a;
  float foam = band * smoothstep(0.3, 0.7, breakup + band * 0.35);
  color = mix(color, uFoamColor * (bodyLight * 1.6 + uSunLight * 0.08), foam * 0.85);

  color = applyAtmosphere(color, vWorldPos);
  gl_FragColor = vec4(min(color, vec3(uMaxRadiance)), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
