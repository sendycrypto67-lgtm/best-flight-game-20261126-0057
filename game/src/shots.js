// shots.js — deterministic screenshot scenes behind ?shot=...
// Each scene stages a real world state (no fake pixels): the same seed
// always gives the same frame. The cover (play) shows the volcano leg
// mid-flight with a ring ahead, the plane, and a full lit HUD.
import { PHASES, newGame, startLeg, step, currentLeg } from './world.js';

function drive(g, seconds, input) {
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) step(g, input, 1 / 60);
}

export function applyShot(g, name) {
  if (name === 'start') {
    // Title over the dawn runway, leg 1, plane on the strip.
    startLeg(g, 0);
    g.phase = PHASES.TITLE;
    g.s = 0; g.alt = 1400; g.speed = 0; g.throttle = 0;
    g.best = 0;
    return;
  }
  if (name === 'play') {
    // Cover: leg 2 Merapi pass, mid-flight, ring just ahead, volcano big.
    startLeg(g, 1);
    const leg = currentLeg(g);
    g.s = leg.rings[1].s - 18;
    g.x = leg.rings[1].x - 0.12;
    g.alt = leg.rings[1].alt + 120;
    g.speed = 132; g.throttle = 0.72;
    g.bank = 12; g.heading = 8; g.pitch = 2;
    g.fuel = 68; g.score = 1250; g.legTime = 41; g.totalTime = 96;
    g.ringsPassed = 1; g.ringsTotal = leg.rings.length;
    leg.rings[0].passed = true; leg.rings[0].score = 420;
    g.message = ''; g.messageT = 0;
    drive(g, 0.5, { left: false, right: false, up: false, down: false, boost: false, brake: false });
    return;
  }
  if (name === 'storm') {
    // High-drama moment: inside the ash, damage high, fuel low, warning lit.
    startLeg(g, 1);
    const leg = currentLeg(g);
    const c = leg.clouds[3];
    g.s = c.s - 2; g.x = c.x; g.alt = c.alt;
    g.speed = 118; g.throttle = 0.8;
    g.bank = -16; g.heading = -10; g.pitch = -4;
    g.fuel = 17; g.damage = 68; g.score = 2310;
    g.legTime = 74; g.totalTime = 129;
    g.ringsPassed = 3; g.ringsTotal = leg.rings.length;
    leg.rings[0].passed = true; leg.rings[1].passed = true; leg.rings[2].passed = true;
    g.message = 'ASH CLOUD — CLIMB OUT!'; g.messageT = 2.5;
    g.shake = 0.3;
    drive(g, 0.3, { left: false, right: true, up: true, down: false, boost: false, brake: false });
    return;
  }
  if (name === 'end') {
    // Win screen after the island landing.
    const ng = newGame(1);
    Object.assign(g, ng);
    startLeg(g, 2);
    g.score = 6840; g.totalTime = 168; g.legTime = 52;
    g.ringsPassed = 5; g.ringsTotal = 5;
    g.fuel = 34; g.alt = 620; g.s = currentLeg(g).length;
    g.phase = PHASES.WIN;
    g.message = 'DELIVERED — ALL THREE LEGS CLEAR';
    return;
  }
  // default: title
  startLeg(g, 0);
  g.phase = PHASES.TITLE;
}
