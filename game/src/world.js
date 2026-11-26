// world.js — level data, game state, step logic for Merapi Dawn Run.
// A STOL bush plane flies three dawn legs across Java: terrace valley,
// the smoking Merapi pass, then a strait crossing to a short island strip.
// Chase view: the plane flies away from the camera along distance s.
import { CFG } from './config.js';
import { mulberry32 } from './random.js';

export const PHASES = {
  TITLE: 'title', FLY: 'fly', LEGCLEAR: 'legclear',
  GAMEOVER: 'gameover', WIN: 'win', PAUSED: 'paused',
};

function buildLeg(def, index) {
  const rng = mulberry32(0x9e3779b9 + index * 7919);
  // Terrain height table first: rings and clouds are placed relative
  // to it, so no ring ever sits below safe terrain clearance.
  const terrain = [];
  const step = 2;
  for (let s = 0; s <= def.length + 4; s += step) {
    let h;
    if (def.palette === 'islands') {
      // Sea with occasional island humps.
      const isl = Math.max(0, Math.sin(s * 0.11 + index * 2.1)) ** 6;
      h = def.terrainBase + isl * 500 + Math.sin(s * 0.05) * 40;
    } else if (def.volcano) {
      // One big cone centred mid-leg, foothills either side.
      const d = Math.abs(s - def.length * 0.55) / (def.length * 0.5);
      const cone = Math.max(0, 1 - d) ** 1.6;
      h = def.terrainBase + cone * 2200 + Math.sin(s * 0.06) * 220 + Math.sin(s * 0.13 + 1.7) * 130;
    } else {
      h = def.terrainBase + (Math.sin(s * 0.03) * 0.5 + 0.5) * 260
        + (Math.sin(s * 0.07 + 0.9) * 0.5 + 0.5) * 130;
    }
    terrain.push(h);
  }
  // Flatten the last 80 units toward the runway elevation so the
  // landing approach is flyable instead of a rising ridge.
  const runwayH = terrain[terrain.length - 1];
  for (let i = 0; i < terrain.length; i++) {
    const s = i * step;
    if (s > def.length - 80) {
      const t = (s - (def.length - 80)) / 80;
      terrain[i] = terrain[i] * (1 - t) + runwayH * t;
    }
  }
  const groundAt = (s) => {
    const i = Math.max(0, Math.min(terrain.length - 1, Math.floor(s / step)));
    return terrain[i];
  };
  const rings = [];
  const n = def.rings;
  for (let i = 0; i < n; i++) {
    const s = def.length * ((i + 1) / (n + 1));
    rings.push({
      s,
      x: (rng() * 2 - 1) * 0.55,
      alt: Math.min(7200, groundAt(s) + 1000 + rng() * 1100),
      r: 150 + rng() * 60,
      passed: false, score: 0,
    });
  }
  const clouds = [];
  const nc = def.volcano ? 10 : 7;
  for (let i = 0; i < nc; i++) {
    const s = 30 + rng() * (def.length - 60);
    clouds.push({
      s,
      x: (rng() * 2 - 1) * 0.8,
      alt: Math.min(7200, groundAt(s) + 900 + rng() * 1500),
      r: 130 + rng() * 110,
      ash: def.volcano,
    });
  }
  return { ...def, index, rng, rings, clouds, terrain, terrainStep: step };
}

export function newGame(seed = 1) {
  const rng = mulberry32(seed);
  void rng;
  return {
    phase: PHASES.TITLE,
    legIndex: 0,
    legs: CFG.legs.map((d, i) => buildLeg(d, i)),
    s: 0, x: 0, alt: 1200, speed: 0, heading: 0,
    pitch: 0, bank: 0, throttle: 0.55,
    fuel: CFG.fuelMax, score: 0, totalTime: 0, legTime: 0,
    damage: 0, attempts: 3,
    ringsPassed: 0, ringsTotal: 0,
    message: '', messageT: 0,
    flash: 0, shake: 0,
    landed: false, crashed: false, reason: '',
    frame: 0, best: 0,
    wind: 0,
  };
}

export function currentLeg(g) { return g.legs[g.legIndex]; }

export function terrainAt(leg, s) {
  const i = Math.max(0, Math.min(leg.terrain.length - 1, Math.floor(s / leg.terrainStep)));
  return leg.terrain[i];
}

export function startLeg(g, index) {
  const leg = g.legs[index];
  leg.rings.forEach((r) => { r.passed = false; r.score = 0; });
  g.legIndex = index;
  g.s = 0; g.x = 0; g.alt = terrainAt(leg, 0) + 900;
  g.speed = 95; g.heading = 0; g.pitch = 0; g.bank = 0;
  g.throttle = 0.6; g.fuel = CFG.fuelMax; g.damage = 0;
  g.legTime = 0; g.ringsPassed = 0; g.ringsTotal = leg.rings.length;
  g.message = leg.name; g.messageT = 3;
  g.landed = false; g.crashed = false; g.reason = '';
  g.phase = PHASES.FLY;
}

export function startGame(g) {
  g.score = 0; g.totalTime = 0; g.attempts = 3;
  startLeg(g, 0);
}

// One fixed step (dt = 1/60). Input: {left,right,up,down,boost,brake}
export function step(g, input, dt) {
  g.frame += 1;
  if (g.phase !== PHASES.FLY) return;
  const leg = currentLeg(g);
  g.legTime += dt; g.totalTime += dt;
  if (g.messageT > 0) g.messageT -= dt;
  if (g.flash > 0) g.flash -= dt;
  if (g.shake > 0) g.shake -= dt;

  // --- controls ---
  const turnIn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const pitchIn = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  const targetBank = turnIn * 38;
  g.bank += (targetBank - g.bank) * Math.min(1, dt * 6);
  g.heading += (g.bank / 38) * CFG.turnRate * dt;
  g.x += (g.bank / 38) * CFG.lateralRate * dt * (g.speed / CFG.cruiseSpeed);
  g.x = Math.max(-1.15, Math.min(1.15, g.x));
  g.pitch += ((pitchIn * 14) - g.pitch) * Math.min(1, dt * 5);
  if (input.boost) g.throttle = Math.min(1, g.throttle + dt * 0.8);
  if (input.brake) g.throttle = Math.max(0.15, g.throttle - dt * 1.2);
  const targetSpeed = CFG.minSpeed + g.throttle * (CFG.maxSpeed - CFG.minSpeed);
  g.speed += (targetSpeed - g.speed) * Math.min(1, dt * CFG.drag * 2);
  if (input.brake) g.speed = Math.max(CFG.minSpeed, g.speed - 30 * dt);
  g.alt += (g.pitch / 14) * CFG.climbRate * dt;
  g.alt += Math.sin(g.frame * 0.05) * 0.4; // light air, deterministic
  g.alt = Math.max(0, Math.min(9000, g.alt));
  g.s += g.speed * CFG.speedToUnits * dt;

  // --- fuel ---
  const burn = CFG.fuelBurn * (0.4 + g.throttle) * (input.boost ? CFG.boostBurn : 1);
  g.fuel = Math.max(0, g.fuel - burn * dt);
  if (g.fuel <= 0 && g.speed > CFG.minSpeed) g.speed = Math.max(CFG.minSpeed, g.speed - 8 * dt);
  if (g.fuel <= 0) g.alt = Math.max(0, g.alt - 60 * dt);

  // --- rings ---
  for (const ring of leg.rings) {
    if (ring.passed) continue;
    if (g.s >= ring.s - 2 && g.s <= ring.s + 6) {
      const dx = (g.x - ring.x) * 900;
      const dy = g.alt - ring.alt;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ring.r) {
        ring.passed = true;
        const acc = Math.max(0, 1 - dist / ring.r);
        const pts = Math.round(CFG.ringBase + acc * CFG.ringCenterBonus);
        ring.score = pts;
        g.score += pts;
        g.ringsPassed += 1;
        g.fuel = Math.min(CFG.fuelMax, g.fuel + 8);
        g.message = acc > 0.8 ? `RING CLEAN  +${pts}` : `RING  +${pts}`;
        g.messageT = 1.6; g.flash = 0.35;
      }
    } else if (g.s > ring.s + 6) {
      ring.passed = true; ring.score = 0; // missed, no points
    }
  }

  // --- clouds (ash / storm): damage + turbulence ---
  for (const c of leg.clouds) {
    const ds = Math.abs(g.s - c.s);
    if (ds < 8) {
      const dx = (g.x - c.x) * 900;
      const dy = g.alt - c.alt;
      if (Math.sqrt(dx * dx + dy * dy) < c.r) {
        g.damage += CFG.damageCloud * dt;
        g.shake = 0.4;
        g.x += Math.sin(g.frame * 0.3) * 0.004;
        if (g.messageT <= 0) { g.message = c.ash ? 'ASH CLOUD — CLIMB OUT!' : 'STORM CELL — FLY AROUND IT'; g.messageT = 1.2; }
      }
    }
  }
  if (g.damage >= 100) return endCrash(g, 'AIRFRAME GAVE OUT IN THE CLOUD');

  // --- terrain collision ---
  const ground = terrainAt(leg, g.s);
  if (g.alt <= ground + 60) return endCrash(g, 'CONTROLLED FLIGHT INTO TERRAIN');

  // --- runway / leg end (judged against the flat runway elevation) ---
  if (g.s >= leg.length) {
    const runwayGround = terrainAt(leg, leg.length);
    const onStrip = Math.abs(g.x) < 0.4;
    const lowEnough = g.alt <= runwayGround + 420;
    const slowEnough = g.speed <= 150;
    if (onStrip && lowEnough && slowEnough) {
      const timeBonus = Math.max(0, Math.round(CFG.legTimeBonus - g.legTime * 2));
      const fuelBonus = Math.round(g.fuel * 2);
      g.score += CFG.landingBonus + timeBonus + fuelBonus;
      g.landed = true;
      if (g.legIndex >= g.legs.length - 1) {
        g.phase = PHASES.WIN;
        g.message = 'DELIVERED — ALL THREE LEGS CLEAR';
      } else {
        g.phase = PHASES.LEGCLEAR;
        g.message = `LEG CLEAR  +${CFG.landingBonus + timeBonus + fuelBonus}`;
      }
      g.messageT = 4;
    } else {
      return endCrash(g, !onStrip ? 'MISSED THE STRIP' : !lowEnough ? 'TOO HIGH TO LAND' : 'TOO FAST TO LAND');
    }
  }

  // --- warnings ---
  if (terrainAt(leg, g.s + 30) > g.alt - 250 && g.messageT <= 0) { g.message = 'TERRAIN AHEAD — CLIMB'; g.messageT = 1.2; }
  if (g.fuel < 20 && g.messageT <= 0) { g.message = 'LOW FUEL — NEXT RING REFUELS +8'; g.messageT = 1.4; }
}

function endCrash(g, reason) {
  g.crashed = true; g.reason = reason;
  g.attempts -= 1;
  g.message = reason; g.messageT = 3; g.shake = 0.8;
  g.phase = g.attempts > 0 ? PHASES.GAMEOVER : PHASES.GAMEOVER;
}

// Retry current leg after a crash (attempts left) — called from input.
export function retryLeg(g) {
  if (g.attempts <= 0) { startGame(g); return; }
  startLeg(g, g.legIndex);
}
