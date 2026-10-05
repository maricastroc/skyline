import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

const FRAG = `
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uInk;
uniform float uStars;
uniform float uEdge;
uniform float uOutline;

float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int idx = i.x + i.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[idx]) + 0.5) / 16.0;
}
float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 px = floor(uv * resolution);
  if (depth >= 0.9999) {
    float t = clamp(uv.y * 1.1 - 0.05, 0.0, 1.0);
    float bands = 7.0;
    float q = floor(t * bands + bayer4(px)) / bands;
    vec3 c = mix(uSkyBottom, uSkyTop, q);
    if (uStars > 0.5) {
      float s = h12(px);
      c += vec3(step(0.996, s) * (0.6 + 0.4 * sin(time * 2.0 + s * 50.0))) * step(0.35, uv.y);
    }
    outputColor = vec4(c, 1.0);
    return;
  }
  float z = getViewZ(depth);
  float far = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float dn = readDepth(uv + o * texelSize);
    float zn = dn >= 0.9999 ? z - 1000.0 : getViewZ(dn);
    far = max(far, z - zn);
  }
  float edge = step(uEdge, far) * uOutline;
  vec3 c = mix(inputColor.rgb, inputColor.rgb * 0.38 + uInk * 0.22, edge);
  outputColor = vec4(c, inputColor.a);
}
`;

export class PixelPostEffect extends Effect {
  constructor({ skyTop, skyBottom, ink, stars, edge = 0.6 }: { skyTop: THREE.Color; skyBottom: THREE.Color; ink: THREE.Color; stars: boolean; edge?: number }) {
    super("PixelPostEffect", FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uSkyTop", new THREE.Uniform(skyTop)],
        ["uSkyBottom", new THREE.Uniform(skyBottom)],
        ["uInk", new THREE.Uniform(ink)],
        ["uStars", new THREE.Uniform(stars ? 1 : 0)],
        ["uEdge", new THREE.Uniform(edge)],
        ["uOutline", new THREE.Uniform(1)],
      ]),
    });
  }
}
