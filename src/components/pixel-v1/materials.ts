import * as THREE from "three";

export interface PixelUniforms {
  uTime: { value: number };
  uNight: { value: number };
  uLit: { value: THREE.Color };
  uGlass: { value: THREE.Color };
  uMark: { value: THREE.Color };
  uHighlight: { value: THREE.Color };
  [k: string]: THREE.IUniform;
}

export function toonRamp(): THREE.DataTexture {
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

const VERT_DECL = `
attribute vec4 aAnim;
attribute vec4 aMeta;
uniform float uTime;
varying vec4 vMeta;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vObjNormal;
varying vec3 vWorld;
varying float vSeed;
varying float vHighlight;
`;

const VERT_ANIM = `
#include <begin_vertex>
vLocal = position;
vObjNormal = normal;
vMeta = aMeta;
vSeed = aAnim.z;
vHighlight = aAnim.w;
#ifdef USE_INSTANCING
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#else
  vScale = vec3(1.0);
#endif
float tb = clamp((uTime - aAnim.x) / 0.55, 0.0, 1.0);
float grow = tb >= 1.0 ? 1.0 : 1.0 + 2.70158 * pow(tb - 1.0, 3.0) + 1.70158 * pow(tb - 1.0, 2.0);
transformed.y *= max(grow, 0.0005);
if (aAnim.y >= 0.0) {
  float k = clamp((uTime - aAnim.y) / 0.5, 0.0, 1.0);
  transformed *= 1.0 - k;
}
{
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
  #endif
  vWorld = (modelMatrix * wp).xyz;
}
`;

const FRAG_DECL = `
uniform float uTime;
uniform float uNight;
uniform vec3 uLit;
uniform vec3 uGlass;
uniform vec3 uMark;
uniform vec3 uHighlight;
varying vec4 vMeta;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vObjNormal;
varying vec3 vWorld;
varying float vSeed;
varying float vHighlight;
float pxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const FRAG_SURFACE = `
#include <color_fragment>
float pxEmit = 0.0;
vec3 pxEmitColor = uLit;
{
  vec3 n = normalize(vObjNormal);
  bool side = abs(n.y) < 0.5;
  bool top = n.y > 0.5;
  vec2 fc; vec2 fs;
  if (side) {
    if (abs(n.x) > 0.5) { fc = vec2(vLocal.z * vScale.z + 0.5 * vScale.z, vLocal.y * vScale.y); fs = vec2(vScale.z, vScale.y); }
    else { fc = vec2(vLocal.x * vScale.x + 0.5 * vScale.x, vLocal.y * vScale.y); fs = vec2(vScale.x, vScale.y); }
  } else {
    fc = vec2(vLocal.x * vScale.x + 0.5 * vScale.x, vLocal.z * vScale.z + 0.5 * vScale.z); fs = vec2(vScale.x, vScale.z);
  }
  int surf = int(vMeta.x + 0.5);
  float seed = floor(vSeed * 97.0);

  if (side && (surf == 1 || surf == 2 || surf == 7)) {
    float cw = surf == 2 ? 0.62 : 0.5;
    float ch = 0.5;
    vec2 cell = floor(vec2(fc.x - 0.1, fc.y - 0.12) / vec2(cw, ch));
    vec2 f = fract(vec2(fc.x - 0.1, fc.y - 0.12) / vec2(cw, ch));
    float margin = step(0.18, fc.x) * step(fc.x, fs.x - 0.18) * step(0.3, fc.y) * step(fc.y, fs.y - 0.16);
    float win = step(0.22, f.x) * step(f.x, surf == 2 ? 0.62 : 0.72) * step(0.28, f.y) * step(f.y, 0.78) * margin;
    if (surf == 7) diffuseColor.rgb *= 1.0 - 0.07 * step(0.82, fract(fc.y / 0.25)) * (1.0 - win);
    if (win > 0.5) {
      float h = pxHash(cell + seed);
      diffuseColor.rgb = mix(uGlass, uGlass * 1.35, step(0.82, f.y));
      if (h < vMeta.y) { pxEmit = 1.0; diffuseColor.rgb = uLit; }
    }
  }
  if (side && surf == 3) {
    float slab = step(fract(fc.y / 0.5), 0.16);
    float mull = step(fract(fc.x / 0.5), 0.12);
    vec2 cell = floor(vec2(fc.x / 0.5, fc.y / 0.5));
    if (slab < 0.5 && mull < 0.5) {
      float refl = step(0.7, fract((fc.x + fc.y * 0.6) / 1.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.35, refl * 0.6);
      if (pxHash(cell + seed) < vMeta.y) { pxEmit = 1.0; diffuseColor.rgb = uLit; }
    } else diffuseColor.rgb *= 0.78;
  }
  if (top && surf == 4) {
    bool alongX = fs.x >= fs.y;
    float across = alongX ? fc.y - fs.y * 0.5 : fc.x - fs.x * 0.5;
    float along = alongX ? fc.x : fc.y;
    float mark = vMeta.y > 0.5
      ? step(abs(abs(across) - 0.09), 0.05)
      : step(abs(across), 0.06) * step(fract(along / 0.8), 0.5);
    diffuseColor.rgb = mix(diffuseColor.rgb, uMark, mark);
    diffuseColor.rgb *= 1.0 - 0.06 * step(pxHash(floor(vWorld.xz * 6.0)), 0.18);
  }
  if (top && surf == 5) {
    float g = pxHash(floor(vWorld.xz * 5.0));
    diffuseColor.rgb *= 0.92 + 0.12 * step(0.55, g) - 0.06 * step(g, 0.12);
  }
  if (top && surf == 6) {
    vec2 j = fract(vWorld.xz);
    float joint = step(j.x, 0.07) + step(j.y, 0.07);
    diffuseColor.rgb *= 1.0 - 0.08 * min(joint, 1.0);
  }
  if (top && surf == 9) {
    float rim = step(min(min(fc.x, fs.x - fc.x), min(fc.y, fs.y - fc.y)), 0.1);
    diffuseColor.rgb *= (1.0 - 0.14 * rim) * (0.96 + 0.06 * step(0.7, pxHash(floor(vWorld.xz * 6.0))));
  }
  if (side && surf == 10) {
    float band = floor(vWorld.y / 0.45);
    diffuseColor.rgb *= 0.9 + 0.12 * pxHash(vec2(band, 3.0)) - 0.12 * step(0.86, pxHash(floor(vec2(vWorld.x + vWorld.z, vWorld.y) * 4.0)));
  }
  if (surf == 11) {
    float s = side && fs.y > 1.5 ? step(0.5, fract(fc.y / 0.5)) : step(0.5, fract((fc.x) / 0.25));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), s * 0.85);
  }
  if (vHighlight > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.4);
}
`;

const FRAG_EMIT = `
#include <emissivemap_fragment>
totalEmissiveRadiance += pxEmitColor * pxEmit * (0.35 + 1.25 * uNight);
`;

export function createToonMaterial(uniforms: PixelUniforms, ramp: THREE.Texture, key: string): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ gradientMap: ramp });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
      .replace("#include <color_fragment>", FRAG_SURFACE)
      .replace("#include <emissivemap_fragment>", FRAG_EMIT);
  };
  m.customProgramCacheKey = () => `pixel-toon-${key}`;
  return m;
}

export function createGlowMaterial(uniforms: PixelUniforms): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ toneMapped: false });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${FRAG_DECL}`).replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float blink = vMeta.y > 1.5 ? step(0.5, fract(uTime * 0.8 + vSeed)) : 1.0;
      float k = mix(0.75, 1.0 + vMeta.y * 1.4, uNight) * mix(0.25, 1.0, blink);
      diffuseColor.rgb *= max(k, 0.55 + vMeta.y * 0.25);
      if (vHighlight > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.5);`,
    );
  };
  m.customProgramCacheKey = () => "pixel-glow";
  return m;
}

export function createAtlasMaterial(uniforms: PixelUniforms, atlas: THREE.Texture, mode: "slots" | "rects", atlasSize: [number, number], cols = 8, slot: [number, number] = [256, 160]) {
  const m = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, side: THREE.FrontSide });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}\nattribute vec4 aRect;\nvarying vec2 vAtlasUv;`)
      .replace(
        "#include <begin_vertex>",
        `${VERT_ANIM}
        ${
          mode === "slots"
            ? `float col = mod(aMeta.z, ${cols}.0); float row = floor(aMeta.z / ${cols}.0);
               vec2 du = vec2(${slot[0] / atlasSize[0]}, ${slot[1] / atlasSize[1]});
               vAtlasUv = vec2(col * du.x, 1.0 - (row + 1.0) * du.y) + uv * du;`
            : `vAtlasUv = vec2((aRect.x + uv.x * aRect.z) / ${atlasSize[0]}.0, 1.0 - (aRect.y + (1.0 - uv.y) * aRect.w) / ${atlasSize[1]}.0);`
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}\nvarying vec2 vAtlasUv;`)
      .replace(
        "#include <map_fragment>",
        mode === "slots"
          ? `diffuseColor.rgb = vMeta.z > -0.5 ? texture2D(map, vAtlasUv).rgb : vColor.rgb;`
          : `diffuseColor.rgb = texture2D(map, vAtlasUv).rgb;`,
      )
      .replace(
        "#include <color_fragment>",
        `diffuseColor.rgb *= mix(0.92, 1.25, uNight);
         if (vHighlight > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.35);`,
      );
  };
  m.customProgramCacheKey = () => `pixel-atlas-${mode}`;
  return m;
}

export function createDepthMaterial(uniforms: PixelUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
  };
  m.customProgramCacheKey = () => "pixel-depth";
  return m;
}

export function pixelGeometries() {
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const prism = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  prism.computeBoundingBox();
  const bb = prism.boundingBox!;
  prism.translate(0, -bb.min.y, 0);
  prism.scale(1, 1 / (bb.max.y - bb.min.y), 1 / (bb.max.z - bb.min.z));
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1).translate(0, 0.5, 0);
  const pyramid = new THREE.ConeGeometry(0.5, 1, 4, 1).translate(0, 0.5, 0);
  const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  return { box, prism, cyl, pyramid, glow: box, image: plane, sign: plane };
}
