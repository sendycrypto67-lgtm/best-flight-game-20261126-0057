// main.js — boot, fixed-timestep game loop, shot mode, screen flow.
import { CFG } from './config.js';
import { PHASES, newGame, startGame, startLeg, step, retryLeg } from './world.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

window.addEventListener('error', (e) => { document.title = `ERROR: ${e.message}`; });

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10) || 1;

const g = newGame(seed);
try {
  g.best = shotName ? 0 : parseInt(window.localStorage.getItem('merapi-best') || '0', 10) || 0;
} catch (e) { g.best = 0; }

const audio = createAudio();
const input = createInput(canvas);

function saveBest() {
  if (g.score > g.best) {
    g.best = g.score;
    try { window.localStorage.setItem('merapi-best', String(g.best)); } catch (e) { /* shot mode */ }
  }
}

function confirmPressed() {
  if (input.pressed.has('Enter') || input.pressed.has('Click')) return true;
  return false;
}

function handleScreens() {
  if (input.pressed.has('KeyM')) audio.toggleMute();
  if (input.pressed.has('KeyP') && g.phase === PHASES.FLY) { g.phase = PHASES.PAUSED; return; }
  if (input.pressed.has('KeyP') && g.phase === PHASES.PAUSED) { g.phase = PHASES.FLY; return; }
  if (g.phase === PHASES.PAUSED) return;
  if (g.phase === PHASES.TITLE && confirmPressed()) {
    audio.ensure(); startGame(g); audio.win();
  } else if (g.phase === PHASES.LEGCLEAR && confirmPressed()) {
    startLeg(g, g.legIndex + 1);
  } else if (g.phase === PHASES.GAMEOVER && confirmPressed()) {
    if (g.attempts > 0) retryLeg(g); else startGame(g);
  } else if (g.phase === PHASES.WIN && confirmPressed()) {
    saveBest(); startGame(g);
  }
  if (input.pressed.has('KeyR') && (g.phase === PHASES.FLY || g.phase === PHASES.GAMEOVER)) {
    retryLeg(g);
  }
}

let last = 0;
let acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!last) last = t;
  let dt = (t - last) / 1000;
  last = t;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  const prevPhase = g.phase;
  const prevScore = g.score;
  const prevRings = g.ringsPassed;
  while (acc >= 1 / 60) {
    if (g.phase === PHASES.FLY) {
      step(g, input, 1 / 60);
      if (g.ringsPassed > prevRings) audio.ring();
      if (g.phase === PHASES.GAMEOVER) audio.crash();
      if (g.phase === PHASES.WIN) { saveBest(); audio.win(); }
      if (g.phase === PHASES.LEGCLEAR) audio.win();
      audio.setEngine(g.throttle, g.speed);
      if (g.fuel < 20 && g.frame % 60 === 0) audio.alarm();
    }
    acc -= 1 / 60;
  }
  if (g.phase !== prevPhase || g.score !== prevScore) { /* phase/score changed */ }
  handleScreens();
  input.pressed.clear();
  render(ctx, g);
}

if (shotName) {
  // Deterministic single frame: stage, step a little, render once.
  // Fixed canvas size so the shot fills the frame exactly, no side bars.
  canvas.style.width = '1280px';
  canvas.style.height = '720px';
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  applyShot(g, shotName);
  for (let i = 0; i < 3; i++) step(g, { left: false, right: false, up: false, down: false, boost: false, brake: false }, 1 / 60);
  render(ctx, g);
  document.title = `shot:${shotName}`;
} else {
  requestAnimationFrame(frame);
}
