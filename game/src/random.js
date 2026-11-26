// random.js — seeded RNG (mulberry32) so every run and screenshot is deterministic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise over distance s, smooth enough for terrain. Deterministic per seed.
export function terrainNoise(rng, s, base, amp) {
  // Sum of two sines with seeded phases plus a seeded step table.
  const p1 = rng._p1 ?? (rng._p1 = rng() * Math.PI * 2);
  const p2 = rng._p2 ?? (rng._p2 = rng() * Math.PI * 2);
  const p3 = rng._p3 ?? (rng._p3 = rng() * Math.PI * 2);
  const v = Math.sin(s * 0.021 + p1) * 0.55
    + Math.sin(s * 0.047 + p2) * 0.3
    + Math.sin(s * 0.11 + p3) * 0.15;
  return base + (v * 0.5 + 0.5) * amp;
}
