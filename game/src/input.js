// input.js — keyboard + mouse input. Arrows/WASD fly, W/S throttle,
// Shift boost, Space brake, P pause, R retry, M mute, Enter confirm.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    left: false, right: false, up: false, down: false,
    boost: false, brake: false,
    pressed: new Set(), // edge-triggered keys, consumed by main loop
  };
  const map = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'boost', ShiftRight: 'boost',
    Space: 'brake',
  };
  function onKey(e, down) {
    if (map[e.code]) { state[map[e.code]] = down; e.preventDefault(); }
    if (down && ['Enter', 'KeyP', 'KeyR', 'KeyM'].includes(e.code)) state.pressed.add(e.code);
    if (down && e.code === 'Space') e.preventDefault();
  }
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  canvas.addEventListener('mousedown', () => state.pressed.add('Click'));
  // touch: tap left/right half steers, tap top climbs
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    const x = (t.clientX - r.left) / r.width;
    const y = (t.clientY - r.top) / r.height;
    if (y < 0.3) state.up = true;
    else if (x < 0.4) state.left = true;
    else if (x > 0.6) state.right = true;
    else state.pressed.add('Click');
  }, { passive: false });
  canvas.addEventListener('touchend', () => { state.up = false; state.left = false; state.right = false; });
  return state;
}
