import { sampleDayCycle } from "./src/features/living-river/core/day-cycle";
let prev = sampleDayCycle(0);
const jumps: [number, number, string][] = [];
for (let i = 1; i <= 20000; i++) {
  const p = i / 10000;
  const s = sampleDayCycle(p);
  const d: [number, string][] = [
    [Math.abs(s.zenith[0] - prev.zenith[0]), "zenith.r"],
    [Math.abs(s.horizon[2] - prev.horizon[2]), "horizon.b"],
    [Math.abs(s.night - prev.night), "night"],
    [Math.abs(s.sunUp - prev.sunUp), "sunUp"],
    [Math.abs(s.cloudDensity - prev.cloudDensity), "cloud"],
  ];
  for (const [v, name] of d) if (v > 0.004) jumps.push([p, v, name]);
  prev = s;
}
console.log("jumps:", jumps.slice(0, 20));
console.log("count", jumps.length);
