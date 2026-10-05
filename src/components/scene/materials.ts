import * as THREE from "three";

export interface CityUniforms {
  uTime: { value: number };
  uSelect: { value: THREE.Color };
  uDanger: { value: THREE.Color };
  uPaper: { value: THREE.Color };
  [k: string]: THREE.IUniform;
}

export function createUniforms(accent: THREE.Color): CityUniforms {
  return {
    uTime: { value: 0 },
    uSelect: { value: accent.clone() },
    uDanger: { value: new THREE.Color("#e2412b") },
    uPaper: { value: new THREE.Color("#f4efe6") },
  };
}

const VERT_DECL = `
attribute vec4 aAnim;
attribute vec4 aMeta;
uniform float uTime;
varying vec4 vMeta;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vObjNormal;
varying float vHighlight;
varying float vCollapse;
`;

const VERT_ANIM = `
#include <begin_vertex>
vLocal = position;
vObjNormal = normal;
vMeta = aMeta;
vHighlight = aAnim.w;
#ifdef USE_INSTANCING
  vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#else
  vScale = vec3(1.0);
#endif
float tb = clamp((uTime - aAnim.x) / 0.9, 0.0, 1.0);
float grow = 1.0 - pow(1.0 - tb, 3.0);
transformed.y *= max(grow, 0.0005);

float collapse = 0.0;
if (aAnim.y >= 0.0) collapse = clamp((uTime - aAnim.y) / 1.25, 0.0, 1.0);
vCollapse = collapse;
if (collapse > 0.0) {
  float k = collapse * collapse;
  float lean = (aAnim.z - 0.5) * 0.55 * smoothstep(0.0, 0.55, collapse);
  transformed.x += transformed.y * lean * vScale.y / max(vScale.x, 0.001);
  transformed.y -= k * 1.03;
  transformed.xz *= 1.0 - 0.3 * k;
  if (collapse >= 1.0) transformed = vec3(0.0);
}
`;

const FRAG_DECL = `
uniform float uTime;
uniform vec3 uSelect;
uniform vec3 uDanger;
varying vec4 vMeta;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vObjNormal;
varying float vHighlight;
varying float vCollapse;

float skyHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float band(float x, float a, float b) {
  float w = fwidth(x) * 0.75 + 1e-4;
  return smoothstep(a - w, a + w, x) * (1.0 - smoothstep(b - w, b + w, x));
}
`;

const FRAG_SURFACE = `
#include <color_fragment>
{
  vec3 n = normalize(vObjNormal);
  bool side = abs(n.y) < 0.5;
  vec2 fc; vec2 fs;
  if (side) {
    if (abs(n.x) > 0.5) { fc = vec2(vLocal.z * vScale.z, vLocal.y * vScale.y); fs = vec2(vScale.z, vScale.y); }
    else { fc = vec2(vLocal.x * vScale.x, vLocal.y * vScale.y); fs = vec2(vScale.x, vScale.y); }
  } else {
    fc = vec2(vLocal.x * vScale.x, vLocal.z * vScale.z + 0.5 * vScale.z); fs = vec2(vScale.x, vScale.z);
  }
  float dist = length(vViewPosition);
  float near = 1.0 - smoothstep(70.0, 260.0, dist);
  float facade = vMeta.x;

  #ifndef SKY_NO_RIM
  float ex = fs.x * 0.5 - abs(fc.x);
  float ey = min(fc.y, fs.y - fc.y);
  float edge = min(ex, ey);
  float rimW = facade > 3.5 ? 0.08 : 0.05;
  float rim = 1.0 - smoothstep(rimW, rimW + fwidth(edge) * 1.5 + 0.01, edge);
  diffuseColor.rgb *= 1.0 - rim * (facade > 3.5 ? 0.22 : 0.12);
  #endif

  if (side && facade > 0.5 && facade < 3.5) {
    float seed = floor(fs.x * 13.0 + fs.y * 7.0);
    if (facade < 1.5) {
      float rowH = 0.46;
      float y = fc.y - 0.42;
      float row = floor(y / rowH);
      float fy = fract(y / rowH);
      float rows = step(0.0, y) * step(fc.y, fs.y - 0.3);
      float x = fc.x + fs.x * 0.5 - 0.32;
      float len = (fs.x - 0.64) * (0.62 + 0.38 * skyHash(row + seed));
      float inLine = step(0.0, x) * step(x, len);
      float wordW = 0.7 + 0.9 * skyHash(row * 3.7 + seed);
      float word = band(fract(x / wordW), 0.1, 1.0);
      float t = band(fy, 0.34, 0.66) * inLine * word * rows * near;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.56, 0.6), t * 0.75);
    } else if (facade < 2.5) {
      float x = fc.x + fs.x * 0.5;
      float mull = 1.0 - band(fract(x / 0.85), 0.12, 0.88);
      float flr = 1.0 - band(fract(fc.y / 1.25), 0.16, 0.92);
      float glass = (1.0 - max(mull, flr)) * step(0.6, fc.y) * near;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.66, 0.74), glass * 0.65);
    } else {
      float x = fc.x + fs.x * 0.5;
      float w = band(fract(x / 0.7), 0.3, 0.75) * band(fract(fc.y / 0.85), 0.35, 0.75) * step(0.3, fc.y) * step(fc.y, fs.y - 0.2);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.6, w * near * 0.8);
    }
  }

  diffuseColor.rgb *= 1.0 - 0.45 * vCollapse;

  if (vHighlight > 0.5) {
    bool danger = vHighlight > 1.5;
    vec3 hc = danger ? uDanger : uSelect;
    float pulse = danger ? 0.5 + 0.5 * sin(uTime * 7.0) : 1.0;
    diffuseColor.rgb = mix(diffuseColor.rgb, hc, danger ? 0.58 + 0.17 * pulse : 0.24);
  }
}
`;

const FRAG_EMISSIVE = `
#include <emissivemap_fragment>
#ifdef SKY_GLOW
  totalEmissiveRadiance += vColor.rgb * vMeta.y * 1.6;
#endif
if (vHighlight > 0.5) {
  vec3 hc = vHighlight > 1.5 ? uDanger : uSelect;
  totalEmissiveRadiance += hc * (vHighlight > 1.5 ? 0.38 + 0.16 * sin(uTime * 7.0) : 0.1);
}
`;

function patchStandard(material: THREE.MeshStandardMaterial, uniforms: CityUniforms, glow: boolean, rim = true) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (glow) shader.defines = { ...shader.defines, SKY_GLOW: "" };
    if (!rim) shader.defines = { ...shader.defines, SKY_NO_RIM: "" };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
      .replace("#include <color_fragment>", FRAG_SURFACE)
      .replace("#include <emissivemap_fragment>", FRAG_EMISSIVE);
  };
  material.customProgramCacheKey = () => `skyline-standard-${glow ? "glow" : "solid"}-${rim ? "rim" : "plain"}`;
}

export function createSolidMaterial(uniforms: CityUniforms, rim = true): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0.0 });
  patchStandard(m, uniforms, false, rim);
  return m;
}

export function createGlowMaterial(uniforms: CityUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.0, toneMapped: true });
  patchStandard(m, uniforms, true);
  return m;
}

export const ATLAS = { size: 2048, cols: 8, slotW: 256, slotH: 160 } as const;

export function createBillboardMaterial(uniforms: CityUniforms, atlas: THREE.Texture): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\n${VERT_DECL}\nvarying vec2 vSlotUv;\nvarying float vSlot;`,
      )
      .replace(
        "#include <begin_vertex>",
        `${VERT_ANIM}
        vSlot = aMeta.z;
        float col = mod(aMeta.z, ${ATLAS.cols}.0);
        float row = floor(aMeta.z / ${ATLAS.cols}.0);
        vec2 du = vec2(${ATLAS.slotW / ATLAS.size}, ${ATLAS.slotH / ATLAS.size});
        vec2 pad = vec2(3.0 / ${ATLAS.size}.0);
        vec2 o = vec2(col * du.x, 1.0 - (row + 1.0) * du.y);
        vSlotUv = o + pad + uv * (du - 2.0 * pad);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${FRAG_DECL}\nvarying vec2 vSlotUv;\nvarying float vSlot;`,
      )
      .replace(
        "#include <map_fragment>",
        `if (vSlot > -0.5) {
          diffuseColor.rgb = texture2D(map, vSlotUv).rgb;
        } else {
          float stripe = step(0.5, fract((vLocal.x + vLocal.y) * 9.0));
          diffuseColor.rgb = vColor.rgb * (0.92 + 0.08 * stripe);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `diffuseColor.rgb *= 1.0 - 0.5 * vCollapse;
        if (vHighlight > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vHighlight > 1.5 ? uDanger : uSelect, vHighlight > 1.5 ? 0.45 : 0.1);`,
      );
  };
  m.customProgramCacheKey = () => "skyline-billboard";
  return m;
}

export function createDepthMaterial(uniforms: CityUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
  };
  m.customProgramCacheKey = () => "skyline-depth";
  return m;
}

export function createGeometries() {
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const spire = new THREE.ConeGeometry(0.5, 1, 4, 1).translate(0, 0.5, 0);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 1).translate(0, 0.5, 0);
  const billboard = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  return { solid: box, glow: box, spire, cylinder, billboard };
}
