import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

/**
 * One full-screen pass at screen resolution, over the scene rendered at the (finer) render
 * resolution. Its pixel language lives on its own grid — the art pixel, `uArt` screen pixels
 * wide — so raising the render resolution sharpens the geometry without shrinking the style:
 *  - the sky behind the world: banded gradient with ordered (Bayer) dithering, one-art-pixel
 *    stars at night;
 *  - outlines where a neighbour one art pixel away is clearly farther (silhouettes), darkening
 *    toward the ink color, like hand-made sprites;
 *  - the haze that dissolves distant land into the sky, dithered on the same grid.
 */
const FRAG = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyBottom;
uniform vec3 uInk;
uniform float uStars;
uniform float uEdge;
uniform float uOutline;
uniform float uFogNear;
uniform float uFogFar;
/** Screen pixels per art pixel. */
uniform float uArt;

float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int idx = i.x + i.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[idx]) + 0.5) / 16.0;
}
float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 sky(vec2 uv, vec2 px) {
  // 7 bands, dithered at the seams.
  float t = clamp(uv.y * 1.1 - 0.05, 0.0, 1.0);
  float bands = 7.0;
  float q = floor(t * bands + bayer4(px)) / bands;
  return mix(uSkyBottom, uSkyTop, q);
}
vec3 stars(vec2 uv, vec2 px) {
  if (uStars < 0.5) return vec3(0.0);
  float s = h12(px);
  return vec3(step(0.996, s) * (0.6 + 0.4 * sin(time * 2.0 + s * 50.0))) * step(0.35, uv.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // The art grid: dither, stars and haze steps are whole art pixels, whatever the render size.
  vec2 px = floor(uv * resolution / uArt);
  if (depth >= 0.9999) {
    outputColor = vec4(sky(uv, px) + stars(uv, px), 1.0);
    return;
  }
  float z = getViewZ(depth);
  float far = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0) : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    float dn = readDepth(uv + o * texelSize * uArt);
    float zn = dn >= 0.9999 ? z - 1000.0 : getViewZ(dn);
    far = max(far, z - zn);
  }
  float edge = step(uEdge, far) * uOutline;
  vec3 c = mix(inputColor.rgb, inputColor.rgb * 0.38 + uInk * 0.22, edge);
  // Haze: far land dissolves into the sky in 4 dithered steps; fully hazed land *is* sky
  // (stars included), so the world never shows an edge.
  float f = smoothstep(uFogNear, uFogFar, -z);
  float fq = clamp(floor(f * 4.0 + bayer4(px + 2.0)) / 4.0, 0.0, 1.0);
  c = mix(c, sky(uv, px), fq) + stars(uv, px) * step(0.999, fq);
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
        ["uFogNear", new THREE.Uniform(1e6)],
        ["uFogFar", new THREE.Uniform(1e6 + 1)],
        ["uArt", new THREE.Uniform(1)],
      ]),
    });
  }
}
