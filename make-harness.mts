import { writeFileSync } from "node:fs";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "./src/features/living-river/gl/shaders";
import { sampleDayCycle } from "./src/features/living-river/core/day-cycle";
import { MAX_RIPPLES } from "./src/features/living-river/core/water";

const PHASES = [0.02, 0.25, 0.48, 0.78];
const skies = PHASES.map((p) => ({ phase: p, sky: sampleDayCycle(p) }));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#111;display:grid;grid-template-columns:1fr 1fr;gap:2px}
canvas{width:100%;display:block}
</style></head><body>
<script>
const VS = ${JSON.stringify(VERTEX_SHADER)};
const FS = ${JSON.stringify(FRAGMENT_SHADER)};
const SKIES = ${JSON.stringify(skies)};
const MAX_RIPPLES = ${MAX_RIPPLES};
const log = [];
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lin = (rgb) => rgb.map(toLinear);
function say(m){ log.push(m); console.log(m); }

for (const { phase, sky } of SKIES) {
  const canvas = document.createElement("canvas");
  canvas.width = 480; canvas.height = 270;
  document.body.append(canvas);

  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) { say("FAIL no webgl"); break; }

  function compile(type, src, name) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      say("FAIL " + name + " compile: " + gl.getShaderInfoLog(s));
      return null;
    }
    say("ok " + name + " compiled");
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS, "vertex");
  const fs = compile(gl.FRAGMENT_SHADER, FS, "fragment");
  if (!vs || !fs) break;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { say("FAIL link: " + gl.getProgramInfoLog(prog)); break; }
  say("ok linked");

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1,2]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aCorner");
  if (loc < 0) { say("FAIL aCorner attribute missing"); break; }
  gl.useProgram(prog);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const missing = ["uResolution","uTime","uCamPos","uYaw","uPitch","uFov","uSunDir","uMoonDir","uSunTint","uZenith","uHorizon","uWaterDeep","uWaterShallow","uFog","uCloudTint","uCloudDensity","uSunUp","uNight","uWind","uRipples[0]"].filter((n) => u(n) === null);
  if (missing.length) say("note uniforms not found (may be optimised out): " + missing.join(", "));

  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(u("uResolution"), canvas.width, canvas.height);
  gl.uniform1f(u("uTime"), 12.5);
  gl.uniform3f(u("uCamPos"), 0, 2.05, 40);
  gl.uniform1f(u("uYaw"), 0.04);
  gl.uniform1f(u("uPitch"), -0.02);
  gl.uniform1f(u("uFov"), 0.62);
  gl.uniform3f(u("uSunDir"), ...sky.sunDir);
  gl.uniform3f(u("uMoonDir"), ...sky.moonDir);
  gl.uniform3f(u("uSunTint"), ...lin(sky.sunTint));
  gl.uniform3f(u("uZenith"), ...lin(sky.zenith));
  gl.uniform3f(u("uHorizon"), ...lin(sky.horizon));
  gl.uniform3f(u("uWaterDeep"), ...lin(sky.waterDeep));
  gl.uniform3f(u("uWaterShallow"), ...lin(sky.waterShallow));
  gl.uniform3f(u("uFog"), ...lin(sky.fog));
  gl.uniform3f(u("uCloudTint"), ...lin(sky.cloudTint));
  gl.uniform1f(u("uCloudDensity"), sky.cloudDensity);
  gl.uniform1f(u("uSunUp"), sky.sunUp);
  gl.uniform1f(u("uNight"), sky.night);
  gl.uniform1f(u("uWind"), 1.2);

  const ripples = new Float32Array(MAX_RIPPLES * 4);
  ripples[0] = 1; ripples[1] = 46; ripples[2] = 0.7; ripples[3] = 1;
  gl.uniform4fv(u("uRipples[0]"), ripples);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const err = gl.getError();
  if (err !== 0) { say("FAIL gl error " + err); break; }

  const px = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,px);

  // Sky band (top) vs water band (bottom): they must not be the same colour,
  // and nothing may come back as NaN-black or fully transparent.
  let topR=0, topG=0, topB=0, botR=0, botG=0, botB=0, n=0, blank=0;
  const w = canvas.width, h = canvas.height;
  for (let x=0;x<w;x+=4){
    for (let y=0;y<20;y++){
      let i=((h-1-y)*w+x)*4; topR+=px[i];topG+=px[i+1];topB+=px[i+2];
      i=((20+y)*w+x)*4; botR+=px[i];botG+=px[i+1];botB+=px[i+2];
      n++;
    }
  }
  for (let i=0;i<px.length;i+=4) if (px[i]===0&&px[i+1]===0&&px[i+2]===0) blank++;
  const top=[topR/n|0,topG/n|0,topB/n|0], bot=[botR/n|0,botG/n|0,botB/n|0];
  const diff = Math.abs(top[0]-bot[0])+Math.abs(top[1]-bot[1])+Math.abs(top[2]-bot[2]);
  say("phase " + phase + " sky=rgb(" + top + ") water=rgb(" + bot + ") diff=" + diff + " pureBlackPx=" + (blank/(px.length/4)*100).toFixed(1) + "%");
  if (diff < 6) say("FAIL phase " + phase + ": sky and water are the same colour");
  if (blank/(px.length/4) > 0.5) say("FAIL phase " + phase + ": mostly black");
}
say("HARNESS_DONE");
document.title = log.join(" | ");
<\/script></body></html>`;

writeFileSync("./harness.html", html);
console.log("wrote harness.html");
