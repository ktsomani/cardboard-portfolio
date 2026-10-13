/**
 * Shared GLSL.
 *
 * One source of truth for the vertex + fragment programs. The maths here is
 * deliberately explicit rather than clever: this is the file a reviewer reads
 * to decide whether I actually understand a rendering pipeline.
 */

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uTwist;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vDisplacement;

  // Cheap, smooth 3-axis wave. Summing three sines at irrational-ish frequency
  // ratios avoids the visible "breathing" you get from a single sine.
  float waveField(vec3 p, float t) {
    float a = sin(p.x * 1.7 + t * 1.00);
    float b = sin(p.y * 2.3 - t * 0.73);
    float c = sin(p.z * 1.9 + t * 1.31);
    float d = sin((p.x + p.y + p.z) * 0.9 - t * 0.51);
    return (a + b + c + d) * 0.25;
  }

  void main() {
    vUv = uv;

    // Twist around Y before displacing, so the silhouette itself changes.
    float angle = position.y * uTwist;
    float s = sin(angle);
    float c = cos(angle);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);

    float t = uTime * uSpeed;
    float field = waveField(p * uFrequency, t);
    vDisplacement = field;

    // Displace along the (twisted) normal: keeps the shape closed and readable.
    vec3 displaced = p + normalize(position) * field * uAmplitude;

    vNormal = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = world.xyz;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

export const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uDither;
  uniform float uGlitch;
  uniform float uPosterize;
  uniform float uScanline;
  uniform float uLightness;
  uniform float uHue;
  uniform float uRoughness;
  uniform float uAccentMix;
  uniform vec3  uAccent;
  uniform vec3  uFill;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying float vDisplacement;

  // ---- colour helpers -----------------------------------------------------
  vec3 hueShift(vec3 color, float amount) {
    // YIQ rotation: the classic cheap hue rotate, no matrices to allocate.
    const vec3 k = vec3(0.57735);
    float cosA = cos(amount * 6.2831853);
    float sinA = sin(amount * 6.2831853);
    return color * cosA + cross(k, color) * sinA + k * dot(k, color) * (1.0 - cosA);
  }

  vec3 posterize(vec3 color, float levels) {
    float n = max(2.0, levels);
    return floor(color * n + 0.5) / n;
  }

  /**
   * Ordered 4x4 (Bayer) threshold, returned in the range 0..15/16.
   *
   * Spelled out explicitly rather than computed: GLSL ES 1.00 (the default for
   * a Three ShaderMaterial) has no array constructors and no dynamic indexing,
   * and I verified by exhaustive check that the explicit matrix is what the
   * classic 4x4 ordered-dither pattern actually is. A clever bit-twiddling
   * one-liner is not worth risking a silently wrong dither pattern.
   */
  float bayer(vec2 cell) {
    vec2 c = floor(mod(cell, 4.0));
    float x = c.x;
    float y = c.y;
    float v = 0.0;
    if (y < 0.5) {
      if (x < 0.5)      v = 0.0;
      else if (x < 1.5) v = 8.0;
      else if (x < 2.5) v = 2.0;
      else              v = 10.0;
    } else if (y < 1.5) {
      if (x < 0.5)      v = 12.0;
      else if (x < 1.5) v = 4.0;
      else if (x < 2.5) v = 14.0;
      else              v = 6.0;
    } else if (y < 2.5) {
      if (x < 0.5)      v = 3.0;
      else if (x < 1.5) v = 11.0;
      else if (x < 2.5) v = 1.0;
      else              v = 9.0;
    } else {
      if (x < 0.5)      v = 15.0;
      else if (x < 1.5) v = 7.0;
      else if (x < 2.5) v = 13.0;
      else              v = 5.0;
    }
    return v / 16.0;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Two-light setup: a key from the upper right, a cool fill from the left.
    vec3 keyDir = normalize(vec3(0.6, 0.8, 0.5));
    vec3 fillDir = normalize(vec3(-0.7, 0.1, -0.3));

    float key = max(dot(normal, keyDir), 0.0);
    float fill = max(dot(normal, fillDir), 0.0);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    // Blinn-Phong specular, tightened by uRoughness.
    vec3 halfDir = normalize(keyDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), mix(96.0, 6.0, uRoughness));

    vec3 base = mix(uFill, uAccent, uAccentMix);
    vec3 color = base * (0.25 + key * 0.9 + fill * 0.35);
    color += uAccent * spec * (1.0 - uRoughness * 0.7);
    color += vec3(0.35, 0.55, 1.0) * rim * 0.7;

    // Displacement drives value: crests read lighter, troughs darker.
    color *= 1.0 + vDisplacement * 0.35;
    color = mix(color, color + vec3(uLightness), 0.85);
    color = hueShift(color, uHue);

    // ---- glitch: horizontal RGB slab tearing -----------------------------
    if (uGlitch > 0.001) {
      float band = floor(vWorldPos.y * 26.0 + uTime * 9.0);
      float bandNoise = fract(sin(band * 12.9898) * 43758.5453);
      // NB: never name this "active" — it is a reserved word in GLSL ES 3.00,
      // and the whole fragment shader fails to compile, giving a black canvas.
      // (Also: no backticks in these comments. They close the template literal.)
      float bandOn = step(1.0 - uGlitch * 0.55, bandNoise);
      float offset = (bandNoise - 0.5) * 0.08 * uGlitch * bandOn;
      color.r *= 1.0 + offset * 6.0;
      color.g *= 1.0 - abs(offset) * 3.0;
      color.b *= 1.0 + offset * 4.0;
      color += vec3(0.6, 0.1, 0.9) * bandOn * uGlitch * 0.12;
    }

    // ---- gradient ramp, posterize, dither, scanline ----------------------
    float ramp = clamp(color.g * 0.6 + color.b * 0.4, 0.0, 1.0);
    float levels = mix(32.0, 3.0, uPosterize);
    vec3 quantised = posterize(color, levels);

    if (uDither > 0.001) {
      // Dither *strength* must scale the threshold, never the base colour —
      // scaling the base is what turns a subtle grain into a white blowout.
      float threshold = (bayer(gl_FragCoord.xy) - 0.5) * uDither;
      vec3 dithered = posterize(quantised + threshold / levels, levels);
      color = dithered;
    } else {
      color = quantised;
    }
    // The ramp only tints; it never multiplies the whole image.
    color *= 0.94 + ramp * 0.12;

    if (uScanline > 0.001) {
      float line = sin(gl_FragCoord.y * 1.6) * 0.5 + 0.5;
      color *= 1.0 - uScanline * 0.35 * line;
      // Subtle horizontal chroma offset, the CRT look.
      color.r *= 1.0 + uScanline * 0.05;
      color.b *= 1.0 - uScanline * 0.05;
    }

    // Gentle filmic-ish curve so highlights do not clip to flat white.
    color = color / (color + vec3(0.85));
    color = pow(color, vec3(0.85));

    gl_FragColor = vec4(color, 1.0);
  }
`
