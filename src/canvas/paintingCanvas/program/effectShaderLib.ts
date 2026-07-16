// GLSL shared by the effect fragment shaders that do RGB math (Blend,
// Smooth). displayed() resolves a tagged pixel to its on-screen RGB;
// inRange() implements the spec's range-restriction rule; resolveColor()
// is the write policy: hybrid writes the literal RGB as a true-color pixel,
// indexed snaps to the nearest palette color within the active range
// (fixed-bound loop — WebGL1 requires constant loop limits).
export const EFFECT_LIB = `
uniform sampler2D u_palette;   // 256x1 palette, texture unit 1
uniform float u_rangeStart;    // 0-based storage indices, inclusive
uniform float u_rangeEnd;
uniform float u_wholePalette;  // 1.0 when no real range is active
uniform float u_indexedPolicy; // 1.0 = resolve results to the palette

vec3 displayed(vec4 p) {
  if (p.a > 0.9) {
    return p.rgb;
  }
  return texture2D(u_palette, vec2((floor(p.r * 255.0 + 0.5) + 0.5) / 256.0, 0.5)).rgb;
}

bool inRange(vec4 p) {
  if (p.a > 0.9) {
    return u_wholePalette > 0.5;
  }
  float idx = floor(p.r * 255.0 + 0.5);
  return idx >= u_rangeStart && idx <= u_rangeEnd;
}

vec4 resolveColor(vec3 rgb) {
  if (u_indexedPolicy < 0.5) {
    return vec4(rgb, 1.0); // hybrid: a true-color pixel
  }
  float bestDist = 1e10;
  float bestIdx = u_rangeStart;
  for (int i = 0; i < 256; i++) {
    float fi = float(i);
    if (fi < u_rangeStart) { continue; }
    if (fi > u_rangeEnd) { break; }
    vec3 c = texture2D(u_palette, vec2((fi + 0.5) / 256.0, 0.5)).rgb;
    vec3 d = c - rgb;
    float dist = dot(d, d);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = fi;
    }
  }
  return vec4(bestIdx / 255.0, 0.0, 0.0, 127.0 / 255.0);
}
`;
