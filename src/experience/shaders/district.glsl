// Soft district highlighting painted onto the masterplan ground as emissive light.
// Each vertex carries one-hot district membership (two vec3s for six districts) and its
// distance to that district's edge; per-district fill and outline levels animate on CPU.
uniform vec3 uDistrictColors[6];
uniform vec3 uFillA;
uniform vec3 uFillB;
uniform vec3 uLineA;
uniform vec3 uLineB;
uniform float uDistrictIntensity;

varying vec3 vDistrictA;
varying vec3 vDistrictB;
varying float vDistrictEdge;

vec3 districtGlow() {
  float membership[6] = float[6](vDistrictA.x, vDistrictA.y, vDistrictA.z, vDistrictB.x, vDistrictB.y, vDistrictB.z);
  float fill[6] = float[6](uFillA.x, uFillA.y, uFillA.z, uFillB.x, uFillB.y, uFillB.z);
  float line[6] = float[6](uLineA.x, uLineA.y, uLineA.z, uLineB.x, uLineB.y, uLineB.z);
  // Outline: a soft band just inside the district boundary.
  float edge = 1.0 - smoothstep(3.0, 16.0, vDistrictEdge);
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    glow += uDistrictColors[i] * membership[i] * (fill[i] * 0.3 + line[i] * edge);
  }
  return glow * uDistrictIntensity;
}
