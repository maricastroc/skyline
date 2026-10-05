import * as THREE from "three";

/**
 * Pixel-diorama materials. Lighting is cel-shaded (three hard bands), shadows are hard, and
 * every surface pattern — windows, lane markings, grass dither, brick courses, awning stripes
 * — is drawn in the shader at roughly one-texel scale, so the low-res render turns it into
 * actual pixel art instead of blur.
 *
 *   aAnim: x build delay, y collapse start (-1), z seed, w highlight
 *   aMeta: x surface, y lit (windows lit chance / glow strength)
 */

export interface PixelUniforms {
  uTime: { value: number };
  uNight: { value: number };
  uLit: { value: THREE.Color };
  uGlass: { value: THREE.Color };
  uMark: { value: THREE.Color };
  uHighlight: { value: THREE.Color };
  /** 0..1: how much everything outside the highlight is dimmed (City view spotlight). */
  uFocus: { value: number };
  /**
   * Land reveal while one world replaces another: x = radius around the origin, y = mode
   * (+1 draw only inside, the incoming world; -1 only outside, the outgoing one; 0 off).
   */
  uReveal: { value: THREE.Vector2 };
  /** 0..1: windows and lamps switching on (the last step of construction). */
  uLights: { value: number };
  [k: string]: THREE.IUniform;
}

export function toonRamp(): THREE.DataTexture {
  // Three bands: shadow side, lit side, full sun. Nearest, so the steps stay hard.
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

const VERT_DECL = /* glsl */ `
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
varying vec3 vWN;
varying vec3 vWT;
`;

const VERT_ANIM = /* glsl */ `
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
// Pop up from the ground with a little overshoot — game-like, not architectural. The part scales
// toward the ground (world y), so a piece stacked on another (a crown, a roof) rises with it
// instead of waiting flattened at its own height.
float tb = clamp((uTime - aAnim.x) / 0.55, 0.0, 1.0);
float grow = max(tb >= 1.0 ? 1.0 : 1.0 + 2.70158 * pow(tb - 1.0, 3.0) + 1.70158 * pow(tb - 1.0, 2.0), 0.0005);
#ifdef USE_INSTANCING
  transformed.y = transformed.y * grow - instanceMatrix[3].y * (1.0 - grow) / max(length(instanceMatrix[1].xyz), 1e-4);
#else
  transformed.y *= grow;
#endif
// Not started yet: nothing at all (not even the flattened footprint).
if (tb <= 0.0) transformed *= 0.0;
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
// World-space face frame for the openings depth: N out of the face, T along fc.x.
{
  mat3 fm = mat3(modelMatrix);
  #ifdef USE_INSTANCING
    fm = fm * mat3(instanceMatrix);
  #endif
  vWN = normalize(fm * normal);
  vWT = normalize(fm * (abs(normal.x) > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
}
`;

const FRAG_DECL = /* glsl */ `
uniform float uTime;
uniform float uNight;
uniform vec3 uLit;
uniform vec3 uGlass;
uniform vec3 uMark;
uniform vec3 uHighlight;
uniform float uFocus;
uniform vec2 uReveal;
uniform float uLights;
varying vec4 vMeta;
varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vObjNormal;
varying vec3 vWorld;
varying float vSeed;
varying float vHighlight;
varying vec3 vWN;
varying vec3 vWT;
float pxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Openings depth (kit/openings.ts). Whole render pixels: w snapped to the pixel size p.
float pxSnap(float w, float p) { return sign(w) * floor(abs(w) / p + 0.5) * p; }
// A recessed opening as a parallax box, solved per fragment. p: point in opening coordinates
// (x from the opening's axis, y up); r: (half width, bottom, top); d: depth; v / l: view and sun
// directions in the face frame (x along the face, y up, z out of the face); px: world units per
// render pixel. Returns 0 outside, 1 glass, 3 reveal facing the sun, 4 reveal away from it,
// 5 sash (one pixel round the glass). g: the glass-plane point seen; shade: cast shadow on glass.
float pxRecess(vec2 p, vec3 r, float d, vec3 v, vec3 l, vec2 px, out vec2 g, out float shade) {
  g = p;
  shade = 1.0;
  if (abs(p.x) > r.x || p.y < r.y || p.y > r.z) return 0.0;
  if (d < 0.9 * px.x) return 1.0; // thinner than a pixel at this zoom: flush (no new detail)
  vec2 o = vec2(pxSnap(d * v.x / max(v.z, 0.08), px.x), pxSnap(d * v.y / max(v.z, 0.08), px.y));
  g = p - o;
  bool outX = abs(g.x) > r.x;
  bool outY = g.y < r.y || g.y > r.z;
  if (outX || outY) {
    // The first recess face the view ray meets (fraction of the depth at each crossing).
    float tx = o.x > 0.0 ? (p.x + r.x) / o.x : o.x < 0.0 ? (r.x - p.x) / -o.x : 2.0;
    float ty = o.y > 0.0 ? (p.y - r.y) / o.y : o.y < 0.0 ? (r.z - p.y) / -o.y : 2.0;
    float sun = (outX && (!outY || tx < ty)) ? (o.x > 0.0 ? l.x : -l.x) : (o.y > 0.0 ? l.y : -l.y);
    return sun > 0.12 ? 3.0 : 4.0;
  }
  if (l.z > 0.05) {
    vec2 e = g + vec2(pxSnap(d * l.x / l.z, px.x), pxSnap(d * l.y / l.z, px.y));
    if (abs(e.x) > r.x || e.y > r.z || e.y < r.y) shade = 0.6;
  } else shade = 0.8;
  if (abs(g.x) > r.x - px.x || g.y < r.y + px.y || g.y > r.z - px.y) return 5.0;
  return 1.0;
}
void pxRevealClip() {
  if (uReveal.y != 0.0) {
    float d = length(vWorld.xz);
    if (uReveal.y > 0.0 ? d > uReveal.x : d < uReveal.x) discard;
  }
}
// The front of the incoming world: a thin bright survey line.
float pxRevealEdge() { return uReveal.y > 0.0 ? step(uReveal.x - 0.6, length(vWorld.xz)) : 0.0; }
`;

/**
 * Surface patterns. Face coordinates are in world units: fc.x across the face, fc.y up the
 * face (0 at the bottom) for sides; fc = plan coordinates for tops.
 */
const FRAG_SURFACE = /* glsl */ `
#include <color_fragment>
pxRevealClip();
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
  // Openings depth: view and sun in the face frame, render-pixel size on the face.
  vec3 pxV = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
  vec3 pxL = vec3(0.0, 1.0, 0.0);
  #if NUM_DIR_LIGHTS > 0
    pxL = normalize((vec4(directionalLights[0].direction, 0.0) * viewMatrix).xyz);
  #endif
  vec3 fV = vec3(dot(pxV, vWT), pxV.y, dot(pxV, vWN));
  vec3 fL = vec3(dot(pxL, vWT), pxL.y, dot(pxL, vWN));
  vec2 fPx = max(vec2(length(vec2(dFdx(fc.x), dFdy(fc.x))), length(vec2(dFdx(fc.y), dFdy(fc.y)))), vec2(1e-4));
  float fOpen = mod(floor(floor(vMeta.w + 0.5) / 1024.0), 2.0);
  float fFrame = mod(floor(floor(vMeta.w + 0.5) / 2048.0), 4.0);
  float fDepth = mod(floor(floor(vMeta.w + 0.5) / 8192.0), 4.0);
  float fSill = mod(floor(floor(vMeta.w + 0.5) / 32768.0), 2.0);
  float fDark = mod(floor(floor(vMeta.w + 0.5) / 65536.0), 2.0);
  float fD = fDepth < 0.5 ? 0.0 : fDepth < 1.5 ? 0.04 : fDepth < 2.5 ? 0.06 : 0.085;
  bool fSunLit = fL.z > 0.05;
  // Level of detail: the recess is drawn from Street View inwards (under ~0.024 world units per
  // render pixel); further out every opening falls back to the flat drawing, so City View is
  // exactly as before.
  bool fNear = fOpen > 0.5 && fPx.x < 0.024;

  // Windows on office / house / brick facades.
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
      if (h < vMeta.y * uLights) { pxEmit = 1.0; diffuseColor.rgb = uLit; }
    }
  }
  // Curtain wall: glass bands between floor slabs, mullions, random lit bays at night.
  if (side && surf == 3) {
    float slab = step(fract(fc.y / 0.5), 0.16);
    float mull = step(fract(fc.x / 0.5), 0.12);
    vec2 cell = floor(vec2(fc.x / 0.5, fc.y / 0.5));
    if (slab < 0.5 && mull < 0.5) {
      float refl = step(0.7, fract((fc.x + fc.y * 0.6) / 1.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.35, refl * 0.6);
      if (pxHash(cell + seed) < vMeta.y * uLights) { pxEmit = 1.0; diffuseColor.rgb = uLit; }
    } else diffuseColor.rgb *= 0.78;
  }
  // Road: asphalt with a dashed centre line along the long axis; avenues get a solid pair.
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
  // Grass: two-tone pixel dither.
  if (top && surf == 5) {
    float g = pxHash(floor(vWorld.xz * 5.0));
    diffuseColor.rgb *= 0.92 + 0.12 * step(0.55, g) - 0.06 * step(g, 0.12);
  }
  // Paving: tile joints every tile.
  if (top && surf == 6) {
    vec2 j = fract(vWorld.xz);
    float joint = step(j.x, 0.07) + step(j.y, 0.07);
    diffuseColor.rgb *= 1.0 - 0.08 * min(joint, 1.0);
  }
  // Roofs: a darker rim and a little gravel noise.
  if (top && surf == 9) {
    float rim = step(min(min(fc.x, fs.x - fc.x), min(fc.y, fs.y - fc.y)), 0.1);
    diffuseColor.rgb *= (1.0 - 0.14 * rim) * (0.96 + 0.06 * step(0.7, pxHash(floor(vWorld.xz * 6.0))));
  }
  // Water: animated pixel shimmer.
  if (top && surf == 8) {
    vec2 c2 = floor(vWorld.xz * 4.0);
    float w = step(0.86, fract(pxHash(c2) + uTime * 0.25 + c2.x * 0.05));
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.45 + 0.08, w);
  }
  // Earth strata on the diorama sides.
  if (side && surf == 10) {
    float band = floor(vWorld.y / 0.45);
    diffuseColor.rgb *= 0.9 + 0.12 * pxHash(vec2(band, 3.0)) - 0.12 * step(0.86, pxHash(floor(vec2(vWorld.x + vWorld.z, vWorld.y) * 4.0)));
  }
  // Surveyor's grid.
  if (top && surf == 12) {
    vec2 g1 = abs(fract(vWorld.xz + 0.5) - 0.5);
    vec2 g5 = abs(fract(vWorld.xz / 5.0 + 0.5) - 0.5) * 5.0;
    float l1 = step(min(g1.x, g1.y), 0.035);
    float l5 = step(min(g5.x, g5.y), 0.06);
    diffuseColor.rgb = mix(diffuseColor.rgb, uMark, max(l1 * 0.18, l5 * 0.45));
  }
  // ── detail kit ──────────────────────────────────────────────────────────────────────
  // Shop glazing: mullions every half tile, a transom, a kick plate; lit interiors at night.
  if (side && surf == 13 && fNear) {
    // Openings depth: the glazing sits behind pilasters and fascia (real geometry); on the glass,
    // the shadow they cast, a dark frame, mullions and transom on the glass plane, and an
    // interior plane (counter line) behind it.
    vec2 g; float shade;
    pxRecess(vec2(fc.x - fs.x * 0.5, fc.y), vec3(fs.x * 0.5, 0.0, fs.y), 0.06, vec3(0.0, 0.0, 1.0), fL, fPx, g, shade);
    float fw = max(fPx.x, pxSnap(0.03, fPx.x));
    float edge = step(fs.x * 0.5 - fw, abs(fc.x - fs.x * 0.5)) + step(fs.y - fw, fc.y);
    float mull = step(fract(fc.x / 0.5), fPx.x / 0.5 * 1.5);
    float transom = step(fs.y - 0.16, fc.y) * step(fc.y, fs.y - 0.16 + max(fPx.y, 0.03));
    float kick = step(fc.y, 0.07);
    vec3 frameC = diffuseColor.rgb * 0.62;
    vec3 g0 = uGlass * 0.8;
    g0 = mix(g0, g0 * 0.72, step(0.2, fc.y) * step(fc.y, 0.3)); // counter / shelf line inside
    g0 = mix(g0, g0 * 1.5 + 0.05, 0.5 * step(0.82, fract((fc.x * 0.9 + fc.y * 0.7) / 1.3)));
    g0 *= shade < 0.99 ? 0.7 : 1.0;
    if (pxHash(vec2(floor(fc.x / 0.5), seed)) < vMeta.y * uLights) { pxEmit = 0.85; g0 = mix(uLit, uLit * 0.8, step(0.2, fc.y) * step(fc.y, 0.3)); }
    diffuseColor.rgb = mix(g0, frameC, max(min(mull + transom + edge, 1.0), kick));
  } else if (side && surf == 13) {
    float mull = step(fract(fc.x / 0.5), 0.09) + step(fs.x - 0.045, fc.x);
    float transom = step(fs.y - 0.14, fc.y) * step(fc.y, fs.y - 0.09);
    float kick = step(fc.y, 0.07);
    vec3 g = uGlass * 0.82;
    g = mix(g, g * 1.55 + 0.06, 0.55 * step(0.8, fract((fc.x * 0.9 + fc.y * 0.7) / 1.3)));
    if (pxHash(vec2(floor(fc.x / 0.5), seed)) < vMeta.y * uLights) { pxEmit = 0.85; g = mix(uLit, uLit * 0.82, step(0.5, fract(fc.y * 2.5))); }
    diffuseColor.rgb = mix(g, diffuseColor.rgb * 0.72, max(min(mull + transom, 1.0), kick));
  }
  // Punched windows with frames and sills, centred in bays, one row per floor. Variant bits:
  // 1 = brick courses, 2–4 = bay width (0.5 / 0.75 / 1.0 / 1.25 tiles), 8 = tall windows.
  // Surface grammar (only set by the current kit; older kits never use them, so they render
  // exactly as before): 16–32 = opening pattern (0 single, 1 paired, 2 vertical, 3 sparse),
  // 64 = attic (small square openings), 128 = rusticated base, 256 = end bays left blank,
  // 512 = lights grouped by flat (two bays × one floor) instead of window by window.
  if (side && surf == 14) {
    float fv = floor(vMeta.w + 0.5);
    float brick = mod(fv, 2.0);
    float bay = 0.5 + 0.25 * mod(floor(fv / 2.0), 4.0);
    float tall = mod(floor(fv / 8.0), 2.0);
    float pat = mod(floor(fv / 16.0), 4.0);
    float attic = mod(floor(fv / 64.0), 2.0);
    float rustic = mod(floor(fv / 128.0), 2.0);
    float ends = mod(floor(fv / 256.0), 2.0);
    float groups = mod(floor(fv / 512.0), 2.0);
    if (brick > 0.5) {
      float row = floor(fc.y / 0.083);
      float joint = step(fract(fc.y / 0.083), 0.16) + step(fract((fc.x + mod(row, 2.0) * 0.09) / 0.18), 0.09);
      diffuseColor.rgb *= 1.0 - 0.08 * min(joint, 1.0);
    }
    if (rustic > 0.5) diffuseColor.rgb *= 1.0 - 0.13 * step(fract(fc.y / 0.125), 0.14);
    float n = max(1.0, floor((fs.x - 0.16) / bay));
    float bx = fc.x - (fs.x - n * bay) * 0.5;
    float fy = fract(fc.y / 0.5) * 0.5;
    float bi = floor(bx / bay);
    bool blankBay = (ends > 0.5 && n >= 4.0 && (bi < 0.5 || bi > n - 1.5)) || (pat > 2.5 && mod(bi, 2.0) > 0.5);
    if (ends > 0.5 && n >= 4.0 && (bi < 0.5 || bi > n - 1.5) && bx > 0.0 && bx < n * bay) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97, 0.95, 0.9), 0.14);
    if (bx > 0.0 && bx < n * bay && fc.y < fs.y - 0.1 && !blankBay) {
      float wx = fract(bx / bay) * bay - bay * 0.5;
      float hw = bay > 0.6 ? bay * 0.3 : 0.12;
      float y0 = tall > 0.5 ? 0.08 : 0.13;
      float y1 = tall > 0.5 ? 0.43 : 0.4;
      if (pat > 0.5 && pat < 1.5) { wx = abs(wx) - bay * 0.22; hw = max(0.055, bay * 0.12); }
      if (pat > 1.5 && pat < 2.5) { hw = max(0.07, bay * 0.17); y0 = 0.04; y1 = 0.46; }
      if (attic > 0.5) { hw = min(hw, 0.09); y0 = 0.17; y1 = 0.33; }
      if (fNear) {
        // Openings depth: WALL → FRAME (style) → REVEAL (program depth, lit by its own face) →
        // GLAZING with sash, mullion and cast shadow. Same opening rectangle as before.
        vec3 wall = diffuseColor.rgb;
        vec3 trim = mix(wall, vec3(0.97, 0.95, 0.9), 0.6);
        vec3 sashC = fDark > 0.5 ? vec3(0.17, 0.18, 0.2) : mix(trim, vec3(1.0), 0.35);
        vec2 lc = groups > 0.5 ? vec2(floor(bi / 2.0), floor(fc.y / 0.5)) : vec2(bi, floor(fc.y / 0.5));
        bool on = pxHash(lc + seed) < vMeta.y * uLights;
        vec2 g; float shade;
        float part = pxRecess(vec2(wx, fy), vec3(hw, y0, y1), min(fD, 0.55 * hw), fV, fL, fPx, g, shade);
        float fw = max(fPx.x, pxSnap(0.035, fPx.x));
        float fh = max(fPx.y, pxSnap(0.035, fPx.y));
        // On dark walls the reveal is a lighter material (stone / metal lining), or the opening
        // would vanish into the wall.
        vec3 rv = dot(wall, vec3(0.299, 0.587, 0.114)) < 0.28 ? mix(wall, trim, 0.5) : wall;
        if (part > 2.5 && part < 4.5) {
          vec3 c = rv * (part < 3.5 ? (fSunLit ? 1.1 : 1.45) : (fSunLit ? 0.64 : 0.8));
          if (on) { c = mix(c, uLit, 0.3); pxEmit = 0.25; }
          diffuseColor.rgb = c;
        } else if (part > 0.5) {
          bool bar = part > 4.5 || (pat < 0.5 && bay > 0.6 && abs(g.x) < max(fPx.x, 0.02));
          // Sunlit glass reflects the sky; the recess's shadow on it is the strongest depth cue.
          vec3 c = bar ? sashC : shade > 0.99 ? mix(uGlass, uGlass * 1.45 + 0.05, 0.35) : shade > 0.7 ? uGlass * 0.88 : uGlass * 0.58;
          if (bar) c *= shade > 0.99 ? 1.0 : 0.8;
          if (on && !bar) { pxEmit = 1.0; c = uLit; }
          diffuseColor.rgb = c;
        } else {
          // Wall plane: architrave (0), lintel (1), clean (2), minimal (3); sill and its shadow.
          // Architrave head a little heavier than its sides, when the floor leaves room for it.
          float head = fFrame < 0.5 && y1 + fh * 1.7 < 0.49 ? fh * 1.7 : fh;
          float inRing = step(abs(wx), hw + fw) * step(y0 - fh, fy) * step(fy, y1 + head);
          float lintel = step(abs(wx), hw + fw) * step(y1, fy) * step(fy, y1 + max(fPx.y, pxSnap(0.045, fPx.y)));
          float sb = fFrame < 0.5 ? y0 - fh : y0;
          float sh = max(fPx.y, pxSnap(0.03, fPx.y));
          float sill = fSill * step(abs(wx), hw + 0.06) * step(sb - sh, fy) * step(fy, sb);
          float sillShadow = fSill * step(abs(wx), hw + 0.06) * step(sb - sh - fPx.y, fy) * step(fy, sb - sh) * (fSunLit && fL.y > 0.2 ? 1.0 : 0.0);
          if (sill > 0.5) diffuseColor.rgb = trim * 0.88;
          else if (sillShadow > 0.5) diffuseColor.rgb = wall * 0.78;
          else if (fFrame < 0.5 && inRing > 0.5) diffuseColor.rgb = trim;
          // Minimal: a one-pixel metal frame flush with the wall.
          else if (fFrame > 2.5 && step(abs(wx), hw + fPx.x) * step(y0 - fPx.y, fy) * step(fy, y1 + fPx.y) > 0.5) diffuseColor.rgb = mix(wall, trim, 0.7);
          else if (fFrame > 0.5 && fFrame < 1.5 && lintel > 0.5) diffuseColor.rgb = trim * 0.95;
        }
      } else {
      float inX = step(abs(wx), hw);
      float inY = step(y0, fy) * step(fy, y1);
      float frame = step(abs(wx), hw + 0.035) * step(y0 - 0.035, fy) * step(fy, y1 + 0.035);
      float sill = step(abs(wx), hw + 0.06) * step(y0 - 0.07, fy) * step(fy, y0 - 0.035);
      vec3 trim = mix(diffuseColor.rgb, vec3(0.97, 0.95, 0.9), 0.6);
      if (sill > 0.5) diffuseColor.rgb = trim * 0.8;
      else if (inX * inY > 0.5) {
        vec3 g = mix(uGlass, uGlass * 1.4, step(y1 - 0.04, fy));
        // Wide bays get a mullion: paired windows.
        if (pat < 0.5 && bay > 0.6 && abs(wx) < 0.02) g = trim;
        vec2 lc = groups > 0.5 ? vec2(floor(bi / 2.0), floor(fc.y / 0.5)) : vec2(bi, floor(fc.y / 0.5));
        if (pxHash(lc + seed) < vMeta.y * uLights) { pxEmit = 1.0; g = uLit; }
        diffuseColor.rgb = g;
      } else if (frame > 0.5) diffuseColor.rgb = trim;
      }
    }
  }
  // Ribbon windows between spandrels.
  if (side && surf == 15 && fNear) {
    // Openings depth: the ribbon recessed under the spandrel — sill reveal below, the
    // spandrel's shadow on the glass above, mullions on the glass plane.
    float fy = fract(fc.y / 0.5) * 0.5;
    vec3 wall = diffuseColor.rgb;
    vec2 g; float shade;
    float part = fc.y < fs.y - 0.1 ? pxRecess(vec2(fc.x - fs.x * 0.5, fy), vec3(fs.x * 0.5 - 0.06, 0.15, 0.42), fD, fV, fL, fPx, g, shade) : 0.0;
    float run = mod(floor(floor(vMeta.w + 0.5) / 512.0), 2.0) > 0.5 ? 2.8 : 0.7;
    bool on = pxHash(vec2(floor(fc.x / run), floor(fc.y / 0.5)) + seed) < vMeta.y * uLights;
    if (part > 2.5 && part < 4.5) {
      vec3 c = wall * (part < 3.5 ? (fSunLit ? 1.1 : 1.45) : (fSunLit ? 0.64 : 0.8));
      if (on) { c = mix(c, uLit, 0.3); pxEmit = 0.25; }
      diffuseColor.rgb = c;
    } else if (part > 0.5) {
      bool bar = part > 4.5 || step(fract((g.x + fs.x * 0.5) / 0.35), fPx.x / 0.35 * 1.5) > 0.5;
      vec3 c = bar ? wall * 0.66 : shade > 0.99 ? mix(uGlass, uGlass * 1.45 + 0.05, 0.35) : shade > 0.7 ? uGlass * 0.88 : uGlass * 0.58;
      if (bar) c *= shade > 0.99 ? 1.0 : 0.8;
      if (on && !bar) { pxEmit = 1.0; c = uLit; }
      diffuseColor.rgb = c;
    } else diffuseColor.rgb *= 1.0 - 0.06 * step(fy, 0.03);
  } else if (side && surf == 15) {
    float fy = fract(fc.y / 0.5);
    if (step(0.3, fy) * step(fy, 0.84) > 0.5 && fc.y < fs.y - 0.1 && fc.x > 0.06 && fc.x < fs.x - 0.06) {
      vec3 g = mix(uGlass, uGlass * 1.35, step(0.76, fy));
      // Variant 512 (surface grammar): lit in long runs per floor, as offices are; else in 0.7 segments.
      float run = mod(floor(floor(vMeta.w + 0.5) / 512.0), 2.0) > 0.5 ? 2.8 : 0.7;
      if (pxHash(vec2(floor(fc.x / run), floor(fc.y / 0.5)) + seed) < vMeta.y * uLights) { pxEmit = 1.0; g = uLit; }
      diffuseColor.rgb = mix(g, diffuseColor.rgb * 0.7, step(fract(fc.x / 0.35), 0.1));
    } else diffuseColor.rgb *= 1.0 - 0.06 * step(fy, 0.06);
  }
  // Zebra crossing: stripes repeat along the long side (the walking direction).
  if (top && surf == 16) {
    bool ax = fs.x >= fs.y;
    float t = ax ? fc.x : fc.y;
    float u = ax ? fc.y : fc.x;
    float ul = ax ? fs.y : fs.x;
    diffuseColor.rgb = mix(diffuseColor.rgb, uMark, step(0.5, fract(t / 0.3)) * step(0.05, u) * step(u, ul - 0.05));
  }
  // Railing: bars between a top and a bottom rail; the gaps are cut out.
  if (side && surf == 17) {
    float bar = step(fract(fc.x / 0.09), 0.34);
    float rail = step(fs.y - 0.035, fc.y) + step(fc.y, 0.03);
    if (bar + rail < 0.5) discard;
  }
  // Vents: slats on the sides, a fan on top.
  if (surf == 18) {
    if (side) diffuseColor.rgb *= 1.0 - 0.11 * step(0.5, fract(fc.y / 0.07));
    if (top) {
      vec2 c = fc - fs * 0.5;
      float fan = step(length(c), min(fs.x, fs.y) * 0.33);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.42, fan);
    }
  }
  // Solar cells.
  if (top && surf == 19) {
    vec2 g = fract(fc / 0.16);
    float line = min(step(g.x, 0.13) + step(g.y, 0.13), 1.0);
    vec3 cell = vec3(0.13, 0.2, 0.42) * (1.0 + 0.3 * step(0.78, fract((fc.x + fc.y) / 0.9)));
    diffuseColor.rgb = mix(cell, vec3(0.72, 0.75, 0.8), line * 0.55);
  }
  // Sidewalk slabs (half-tile), with a little tone per slab.
  if (top && surf == 20) {
    vec2 j = fract(vWorld.xz / 0.5);
    float joint = min(step(j.x, 0.06) + step(j.y, 0.06), 1.0);
    diffuseColor.rgb *= (1.0 - 0.08 * joint) * (0.96 + 0.06 * pxHash(floor(vWorld.xz / 0.5)));
  }
  // Awnings and chimneys: stripes.
  if (surf == 11) {
    float s = side && fs.y > 1.5 ? step(0.5, fract(fc.y / 0.5)) : step(0.5, fract((fc.x) / 0.25));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), s * 0.85);
  }
  if (vHighlight < 0.01) diffuseColor.rgb *= 1.0 - 0.55 * uFocus;
  if (vHighlight > 0.01) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.4 * vHighlight * (0.82 + 0.18 * sin(uTime * 5.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight * 1.15 + 0.1, 0.75 * pxRevealEdge());
}
`;

const FRAG_EMIT = /* glsl */ `
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

/** Unlit glow: lamps, neon, beacons. Blinks when lit > 1.5 (aviation lights). */
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
      pxRevealClip();
      float blink = vMeta.y > 1.5 ? step(0.5, fract(uTime * 0.8 + vSeed)) : 1.0;
      float k = mix(0.75, 1.0 + vMeta.y * 1.4, uNight) * mix(0.25, 1.0, blink);
      diffuseColor.rgb *= max(k, 0.55 + vMeta.y * 0.25) * mix(0.45, 1.0, uLights);
      if (vHighlight < 0.01) diffuseColor.rgb *= 1.0 - 0.55 * uFocus;
  if (vHighlight > 0.01) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.5 * vHighlight * (0.82 + 0.18 * sin(uTime * 5.0)));`,
    );
  };
  m.customProgramCacheKey = () => "pixel-glow";
  return m;
}

/** Image planes (billboards) and signs: unlit, texel-exact, sampling a rect of an atlas. */
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
        `pxRevealClip();
         diffuseColor.rgb *= mix(0.92, 1.25, uNight);
         if (vHighlight < 0.01) diffuseColor.rgb *= 1.0 - 0.55 * uFocus;
  if (vHighlight > 0.01) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.35 * vHighlight * (0.82 + 0.18 * sin(uTime * 5.0)));`,
      );
  };
  m.customProgramCacheKey = () => `pixel-atlas-${mode}`;
  return m;
}

/**
 * People: screen-aligned pixel sprites (camera-facing quads whose feet stay on the ground
 * point), sampled nearest from a procedural atlas; transparent texels are cut out. Kept for
 * the one thing geometry does badly at this scale: tiny, readable human figures.
 */
export function createSpriteMaterial(uniforms: PixelUniforms, atlas: THREE.Texture, atlasSize: [number, number]): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, side: THREE.DoubleSide, alphaTest: 0.5 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}\nattribute vec4 aRect;\nvarying vec2 vAtlasUv;`)
      .replace("#include <begin_vertex>", `${VERT_ANIM}\nvAtlasUv = vec2((aRect.x + uv.x * aRect.z) / ${atlasSize[0]}.0, 1.0 - (aRect.y + (1.0 - uv.y) * aRect.w) / ${atlasSize[1]}.0);`)
      .replace(
        "#include <project_vertex>",
        `vec3 sOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 sRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 sUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 sWorld = sOrigin + sRight * transformed.x * length(instanceMatrix[0].xyz) + sUp * transformed.y * length(instanceMatrix[1].xyz);
        vWorld = sWorld;
        vec4 mvPosition = viewMatrix * vec4(sWorld, 1.0);
        gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}\nvarying vec2 vAtlasUv;`)
      .replace("#include <map_fragment>", `vec4 sTex = texture2D(map, vAtlasUv);\nif (sTex.a < 0.5) discard;\ndiffuseColor.rgb = sTex.rgb;`)
      .replace(
        "#include <color_fragment>",
        `pxRevealClip();
         diffuseColor.rgb *= mix(1.0, 0.6, uNight);
         if (vHighlight < 0.01) diffuseColor.rgb *= 1.0 - 0.55 * uFocus;`,
      );
  };
  m.customProgramCacheKey = () => "pixel-sprite";
  return m;
}

export function createDepthMaterial(uniforms: PixelUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
      .replace("#include <begin_vertex>", VERT_ANIM);
    // Parts outside the reveal ring cast no shadow either.
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\npxRevealClip();");
  };
  m.customProgramCacheKey = () => "pixel-depth";
  return m;
}

export function pixelGeometries() {
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  // Triangular prism (pitched roof): ridge along x.
  const prism = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
  prism.computeBoundingBox();
  const bb = prism.boundingBox!;
  prism.translate(0, -bb.min.y, 0);
  prism.scale(1, 1 / (bb.max.y - bb.min.y), 1 / (bb.max.z - bb.min.z));
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1).translate(0, 0.5, 0);
  const pyramid = new THREE.ConeGeometry(0.5, 1, 4, 1).translate(0, 0.5, 0);
  const plane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  return { box, prism, cyl, pyramid, glow: box, image: plane, sign: plane, sprite: plane };
}
