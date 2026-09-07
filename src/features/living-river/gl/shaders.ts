import { WATER_GLSL } from "../core/water";

/**
 * One triangle, no vertex buffer worth the name.
 *
 * Three vertices large enough to cover the viewport beat the usual two-triangle
 * quad: no seam down the diagonal where the rasteriser has to break its quads
 * into two passes. `gl_VertexID` does not exist in ES 1.00, so the corner index
 * arrives as a one-float attribute the renderer uploads once and never touches
 * again.
 */
export const VERTEX_SHADER = `
attribute float aCorner;

varying vec2 vClip;

void main() {
  // (-1,-1), (3,-1), (-1,3) — a triangle that circumscribes the clip square.
  vec2 p = vec2(
    aCorner == 1.0 ? 3.0 : -1.0,
    aCorner == 2.0 ? 3.0 : -1.0
  );

  vClip = p;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

/**
 * The scene itself: sky, sun, moon, stars, cloud deck and water, all of it
 * intersected per pixel rather than drawn as geometry.
 *
 * The ray construction at the top of `main` is the exact inverse of
 * `unprojectToWater` in `core/camera.ts` — same rotation order, same signs,
 * same field of view. That is the contract that lets a boat drawn by the 2D
 * layer sit on the water drawn here instead of hovering a few pixels off it.
 */
export const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vClip;

uniform vec2 uResolution;
uniform float uTime;

uniform vec3 uCamPos;
uniform float uYaw;
uniform float uPitch;
uniform float uFov;

uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uSunTint;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uWaterDeep;
uniform vec3 uWaterShallow;
uniform vec3 uFog;
uniform vec3 uCloudTint;
uniform float uCloudDensity;
uniform float uSunUp;
uniform float uNight;

${WATER_GLSL}

// ---------------------------------------------------------------- noise ----

float lr_hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float lr_vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(lr_hash21(i), lr_hash21(i + vec2(1.0, 0.0)), u.x),
    mix(lr_hash21(i + vec2(0.0, 1.0)), lr_hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/* Five octaves is where cloud edges stop looking like a lava lamp and start
 * looking torn. The 2.02 lacunarity is deliberately not 2.0 — an exact
 * doubling lines every octave's grid up and leaves visible square artefacts. */
float lr_fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;

  for (int i = 0; i < 5; i++) {
    v += a * lr_vnoise(p);
    p *= 2.02;
    a *= 0.5;
  }

  return v;
}

// --------------------------------------------------------------- shadow ----

/*
 * Wave self-shadowing.
 *
 * March a few steps toward the sun and ask whether the surface out there
 * stands above the line from this point to it. If it does, this pixel is in
 * the shadow of the wave in front of it.
 *
 * It is the only term in the whole shader that knows one part of the water can
 * hide another, and that is what it buys: without it a swell is a shaded
 * surface, with it the swell has a lit side and a dark side and the reader can
 * see which way the light is coming from.
 *
 * Steps grow quadratically, because the near ones decide the crisp edge of the
 * shadow and the far ones only decide whether it exists at all. The climb rate
 * is deliberately softened: at true scale a river shadows itself only in the
 * last minutes before sunset, and stretching that across the whole golden hour
 * is worth more than the accuracy it costs.
 */
float lr_waveShadow(vec2 p, float h, float t) {
  vec2 toward = uSunDir.xz;
  float run = length(toward);
  if (run < 0.001) return 0.0;

  toward /= run;
  float climb = (uSunDir.y / run) * 0.34;
  float shadow = 0.0;

  for (int i = 1; i <= 3; i++) {
    float d = float(i) * float(i) * 0.9;
    float surface = lr_height(p + toward * d, t);
    shadow = max(shadow, smoothstep(0.0, 0.035, surface - (h + climb * d)));
  }

  return shadow;
}

// ------------------------------------------------------------------ sky ----

/* Stars live in direction space rather than on a plane, so they stay pinned to
 * the sky while the camera drifts downstream instead of streaming past like
 * snow. The grid is coarse and most cells are rejected outright. */
vec3 lr_stars(vec3 dir) {
  if (uNight <= 0.01 || dir.y <= 0.0) return vec3(0.0);

  vec2 sc = vec2(atan(dir.z, dir.x) * 3.0, asin(clamp(dir.y, -1.0, 1.0)) * 6.0) * 12.0;
  vec2 cell = floor(sc);
  vec2 local = fract(sc) - 0.5;

  float seed = lr_hash21(cell);
  if (seed < 0.86) return vec3(0.0);

  vec2 jitter = vec2(lr_hash21(cell + 3.7), lr_hash21(cell + 9.1)) - 0.5;
  float d = length(local - jitter * 0.6);

  float twinkle = 0.65 + 0.35 * sin(uTime * (1.4 + seed * 5.0) + seed * 40.0);
  float star = smoothstep(0.09, 0.0, d) * twinkle;

  // Fade the field out near the horizon, where haze would swallow it anyway.
  float lift = smoothstep(0.0, 0.35, dir.y);

  return vec3(star * lift * uNight * (0.5 + seed));
}

/* A flat deck of cloud at a fixed altitude, intersected by the ray. Because it
 * is a real plane and not a screen-space wash, the clouds converge towards the
 * horizon on their own and the camera's forward drift moves through them. */
vec4 lr_clouds(vec3 dir) {
  if (dir.y <= 0.015 || uCloudDensity <= 0.001) return vec4(0.0);

  float t = (26.0 - uCamPos.y) / dir.y;
  if (t <= 0.0 || t > 4000.0) return vec4(0.0);

  vec2 p = (uCamPos.xz + dir.xz * t) * 0.012;
  p += vec2(uTime * 0.012, uTime * 0.004);

  float n = lr_fbm(p);
  // A narrow threshold band: widen it and the deck turns to even haze, which is
  // what makes procedural cloud read as dirt on the lens rather than weather.
  float cover = smoothstep(0.50 - uCloudDensity * 0.30, 0.66, n);

  // Detail on the lit edges only; flat-shaded cloud reads as painted-on fog.
  float edge = smoothstep(0.42, 0.78, lr_fbm(p * 3.1 + 11.0));
  vec3 tint = mix(uCloudTint * 0.72, uCloudTint, edge);

  // Cloud meeting the horizon has to dissolve into it, or the deck's own edge
  // shows up as a hard line across the sky.
  float horizonFade = smoothstep(0.015, 0.16, dir.y);

  return vec4(tint, cover * horizonFade * 0.95);
}

vec3 lr_sky(vec3 dir) {
  float up = clamp(dir.y, -1.0, 1.0);

  // Two-stage gradient: a tight band of horizon colour, then a long fade to
  // zenith. A single smoothstep here is what makes a sky look like a CSS
  // gradient rather than air.
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.62, up), 0.75));

  float sunAngle = max(dot(dir, uSunDir), 0.0);
  float moonAngle = max(dot(dir, uMoonDir), 0.0);

  // Broad scattering halo, then the disc itself.
  col += uSunTint * pow(sunAngle, 6.0) * 0.30 * uSunUp;
  col += uSunTint * pow(sunAngle, 220.0) * 1.60 * uSunUp;

  /*
   * Crepuscular rays — sunlight broken into shafts by the cloud deck.
   *
   * Real volumetrics would march the ray through the cloud and accumulate what
   * it lost. This samples noise in the *angle* around the sun instead, which at
   * this distance is indistinguishable and costs one lookup. Only near the sun,
   * only when the sun is low enough for its light to travel through the deck
   * rather than down past it, and only when there is cloud there to break.
   */
  float low = 1.0 - smoothstep(0.06, 0.52, uSunDir.y);

  if (uSunUp > 0.01 && low > 0.01 && uCloudDensity > 0.01) {
    vec3 perp = dir - uSunDir * dot(dir, uSunDir);
    float around = atan(perp.y, perp.x + 0.0001);
    float shafts = smoothstep(0.34, 0.86, lr_vnoise(vec2(around * 3.4, uTime * 0.03 + 5.0)));

    col += uSunTint * shafts
      * pow(sunAngle, 5.0) * 0.5
      * uSunUp * low * uCloudDensity
      * smoothstep(-0.02, 0.14, dir.y);
  }

  col += lr_stars(dir);

  // The moon gets a hard disc and almost no halo. Moonlight does not scatter
  // the way sunlight does — a broad glow around it reads as a second, weaker
  // sun and flattens the night sky into dusk.
  vec3 moonlight = vec3(0.78, 0.83, 0.95);
  col += moonlight * pow(moonAngle, 1400.0) * 1.1 * uNight;
  col += moonlight * pow(moonAngle, 60.0) * 0.035 * uNight;

  vec4 cloud = lr_clouds(dir);
  col = mix(col, cloud.rgb, cloud.a);

  return col;
}

// ---------------------------------------------------------------- water ----

vec3 lr_water(vec3 ro, vec3 rd) {
  float t = -ro.y / rd.y;
  vec3 pos = ro + rd * t;
  vec2 p = pos.xz;

  /* Sample spacing grows with distance. One pixel at the horizon spans many
   * wavelengths, and differencing at a fixed epsilon there turns the surface
   * into static — this is the poor relation of the mip-mapping a texture-based
   * ocean would get for free. */
  float e = 0.035 + t * 0.0055;
  vec3 n = lr_normal(p, uTime, e);

  // Flatten towards the horizon so distant water settles into haze instead of
  // shimmering with detail the pixels have no resolution to carry.
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(30.0, 140.0, t)));

  // The surface's actual displacement here, which is what decides whether this
  // pixel is on a crest catching the light or down in a trough that cannot see
  // much of the sky.
  float h = lr_height(p, uTime);

  vec3 view = -rd;
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(view, n), 0.0), 5.0);

  // Direct light on the body of the water. Water is mostly a mirror but not
  // only a mirror, and with reflection alone a crest and a trough differ just
  // in what they happen to be pointing at — which is what makes cheap water
  // read as crumpled foil.
  float diffuse = max(dot(n, uSunDir), 0.0);

  // Ambient occlusion: a trough sees a smaller piece of sky than a crest does.
  float ao = 0.72 + 0.28 * smoothstep(-0.07, 0.07, h);

  // And the wave in front of this one, standing in the way of the sun. Faded
  // out with distance, where the height field is being flattened into haze
  // anyway and a per-pixel shadow test would only alias.
  float shadow = lr_waveShadow(p, h, uTime) * uSunUp * smoothstep(120.0, 30.0, t);

  // Reflected ray, kept above the horizon: a wave steep enough to aim the
  // reflection downward would otherwise sample the sky from underneath.
  vec3 refl = reflect(rd, n);
  refl.y = abs(refl.y) + 0.008;
  vec3 sky = lr_sky(refl);

  vec3 body = mix(uWaterShallow, uWaterDeep, smoothstep(1.5, 48.0, t));

  // Key, fill and shadow, in that order. The constant term is the fill — the
  // whole sky lighting the water from every direction at once — and it is what
  // stops night water from reading as flat black paint.
  body *= (0.58 + 0.72 * diffuse * uSunUp + 0.26 * uNight) * ao;
  body *= 1.0 - shadow * 0.45;

  vec3 col = mix(body, sky, fresnel);

  /*
   * Sub-surface scattering: light that went into the wave and came out of the
   * far side of it, carrying the water's own colour with it.
   *
   * It shows only where a crest stands between the reader and the sun, which
   * on this river — where the sun is always somewhat downstream — is most of
   * the morning and most of the evening. Along with the shadow above it is the
   * pair that makes the swell read as a solid thing with a lit face and a dark
   * one, rather than a shaded plane.
   */
  vec3 through = normalize(-uSunDir + n * 0.4);
  float sss = pow(max(dot(view, through), 0.0), 3.5)
    * smoothstep(-0.01, 0.09, h)
    * smoothstep(90.0, 12.0, t);

  col += uSunTint * uWaterShallow * sss * 2.6 * uSunUp * (1.0 - shadow * 0.6);

  // Sun and moon glitter. The very tight exponent is the whole point: broad
  // specular on water looks like plastic; a thousand separate flashes looks
  // like water.
  vec3 hSun = normalize(view + uSunDir);
  col += uSunTint * pow(max(dot(n, hSun), 0.0), 260.0) * 2.4 * uSunUp * (1.0 - shadow);

  // Moon glitter is a narrow path of separate sparks, not a pool of light: the
  // moon is a half-degree disc, so its reflection is as tight as the sun's and
  // only looks different because there is nothing else lit.
  vec3 hMoon = normalize(view + uMoonDir);
  col += vec3(0.8, 0.85, 1.0) * pow(max(dot(n, hMoon), 0.0), 900.0) * 1.1 * uNight;

  // Foam only where the surface is genuinely steep, and only near the camera.
  float steep = 1.0 - n.y;
  float foam = smoothstep(0.020, 0.075, steep) * smoothstep(70.0, 8.0, t);

  // Foam is the one part of the surface that is not a mirror, so it takes the
  // light's own colour rather than reflecting the sky — warm at sunset, blue at
  // noon, and nearly gone where a wave is shadowing it.
  vec3 lit = mix(uFog, uSunTint, 0.55) * (0.35 + 0.65 * uSunUp) * (1.0 - shadow * 0.7);
  col = mix(col, mix(col, lit, 0.62), foam * 0.5);

  return mix(col, uFog, smoothstep(35.0, 170.0, t));
}

// ----------------------------------------------------------------- main ----

void main() {
  float aspect = uResolution.x / uResolution.y;

  // Inverse of core/camera.ts: build the ray in view space, pitch it, yaw it.
  vec3 d = vec3(vClip.x * aspect * uFov, vClip.y * uFov, 1.0);

  float cp = cos(uPitch);
  float sp = sin(uPitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);

  float cy = cos(uYaw);
  float sy = sin(uYaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);

  vec3 rd = normalize(d);

  // Branch rather than a ternary: a ternary is free to evaluate both sides, and
  // lr_water divides by rd.y — at the horizon that is a division by nearly zero
  // whose NaNs some drivers happily propagate into the result they did select.
  vec3 col;
  if (rd.y < -0.0015) {
    col = lr_water(uCamPos, rd);
  } else {
    col = lr_sky(rd);
  }

  // Gentle filmic shoulder. Without it the sun's specular clips to flat white
  // discs; with it the highlights roll off and keep their colour at the edges.
  /*
   * A vignette, before the tone curve so it behaves like less light reaching
   * the corners of the frame rather than a grey wash painted over them. Nothing
   * physical about it; it is what any photographer would do to this picture,
   * and the middle of this frame is where the sun and the boats are.
   */
  col *= 1.0 - 0.09 * dot(vClip, vClip);

  col = col / (col + 0.62) * 1.42;
  col = pow(max(col, vec3(0.0)), vec3(0.4545));

  // A floor under the darkest part of the night, applied after the curve so it
  // is a couple of levels of grey and not a lift of the whole image. Displays
  // vary; a scene that crushes to pure black on a good one looks broken on it.
  col += vec3(0.010, 0.012, 0.022) * uNight;

  gl_FragColor = vec4(col, 1.0);
}
`;
