uniform mat4 uReflectionMatrix;
varying vec3 vWorldPos;
varying vec4 vReflectCoord;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vReflectCoord = uReflectionMatrix * world;
  gl_Position = projectionMatrix * viewMatrix * world;
}
