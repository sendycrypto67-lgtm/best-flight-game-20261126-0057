// render.js — drawing only: world state in, pixels out.
// Chase view over a dawn archipelago: sky, volcano ridge, terraces / sea,
// target rings, the STOL plane from behind, and a lit-instrument HUD.
import { CFG } from './config.js';
import { PHASES, currentLeg, terrainAt } from './world.js';

const C = CFG.colours;

function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, colour, align = 'left', weight = 'bold') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "DejaVu Sans", Verdana, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawSky(ctx, g, leg) {
  const grad = ctx.createLinearGradient(0, 0, 0, CFG.horizonY + 40);
  grad.addColorStop(0, C.skyTop); grad.addColorStop(0.55, C.skyMid);
  grad.addColorStop(0.85, C.skyLow); grad.addColorStop(1, C.horizon);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, CFG.W, CFG.horizonY + 40);
  // stars, fading near the horizon
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 60; i++) {
    const sx = hash(i * 3.7) * CFG.W, sy = hash(i * 9.1) * 150;
    ctx.globalAlpha = 0.9 - sy / 200;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // sun, low on the horizon, ahead-right so the volcano never hides it
  const sunX = 1080 - g.heading * 2, sunY = CFG.horizonY - 58;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
  glow.addColorStop(0, C.sunGlow); glow.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = glow; ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
  ctx.fillStyle = C.sun;
  ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, Math.PI * 2); ctx.fill();
  // clouds: seeded puffs drifting with distance
  for (let i = 0; i < 14; i++) {
    const baseX = hash(i * 13.3) * (CFG.W + 400) - 200;
    const cx = ((baseX - g.s * (6 + hash(i * 7.7) * 10)) % (CFG.W + 400) + CFG.W + 400) % (CFG.W + 400) - 200;
    const cy = 40 + hash(i * 5.1) * 180;
    const cw = 90 + hash(i * 3.3) * 130;
    ctx.fillStyle = leg.palette === 'volcano' ? 'rgba(120,90,90,0.55)' : 'rgba(255,220,200,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + cw * 0.4, cy - 8, cw * 0.6, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarRidge(ctx, g, leg) {
  const hy = CFG.horizonY - g.pitch * 2;
  ctx.save();
  ctx.translate(CFG.W / 2, hy);
  ctx.rotate((-g.bank * 0.25 * Math.PI) / 180);
  ctx.translate(-CFG.W / 2, -hy);
  // far ridge silhouette
  ctx.fillStyle = C.farRidge;
  ctx.beginPath(); ctx.moveTo(0, hy);
  for (let x = 0; x <= CFG.W; x += 32) {
    const h = 40 + hash(Math.floor((x + g.s * 8) / 32)) * 70;
    ctx.lineTo(x, hy - h);
  }
  ctx.lineTo(CFG.W, hy); ctx.closePath(); ctx.fill();
  if (leg.volcano) {
    // Merapi cone, grows as we near its centre, apex kept on screen
    const vc = leg.length * 0.55;
    const d = Math.max(0, 1 - Math.abs(g.s - vc) / (leg.length * 0.6));
    const vw = 220 + d * 300, vh = 90 + d * 150;
    const vx = CFG.W / 2 + (0 - g.x) * 260 - g.heading * 3;
    ctx.fillStyle = C.volcanoRock;
    ctx.beginPath();
    ctx.moveTo(vx - vw, hy); ctx.lineTo(vx - vw * 0.22, hy - vh);
    ctx.lineTo(vx + vw * 0.22, hy - vh); ctx.lineTo(vx + vw, hy);
    ctx.closePath(); ctx.fill();
    // snow cap + crater glow
    ctx.fillStyle = C.volcanoSnow;
    ctx.beginPath();
    ctx.moveTo(vx - vw * 0.22, hy - vh); ctx.lineTo(vx, hy - vh - 14);
    ctx.lineTo(vx + vw * 0.22, hy - vh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,120,40,0.9)';
    ctx.beginPath(); ctx.ellipse(vx, hy - vh + 4, 26 + d * 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    // smoke plume, deterministic puffs by frame
    for (let i = 0; i < 7; i++) {
      const t = ((g.frame * 0.4 + i * 26) % 130) / 130;
      const px = vx + Math.sin(i * 2.4) * 30 * t + t * 60;
      const py = hy - vh - t * 150;
      ctx.fillStyle = `rgba(150,130,120,${0.5 * (1 - t)})`;
      ctx.beginPath(); ctx.arc(px, py, 14 + t * 34, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawGround(ctx, g, leg) {
  const hy = CFG.horizonY - g.pitch * 2;
  const ground = terrainAt(leg, g.s);
  const altAgl = Math.max(0, g.alt - ground);
  // ground base
  let base = C.terraceB;
  if (leg.palette === 'islands') base = C.sea;
  if (leg.palette === 'volcano') base = C.terraceC;
  const grad = ctx.createLinearGradient(0, hy, 0, CFG.H);
  grad.addColorStop(0, base); grad.addColorStop(1, leg.palette === 'islands' ? C.seaDeep : '#1d3a24');
  ctx.fillStyle = grad; ctx.fillRect(0, hy, CFG.W, CFG.H - hy);
  // scrolling ground patches: few, large, growing with depth (perspective)
  const bandH = 34;
  const scroll = (g.s * 14) % bandH;
  for (let y = hy + scroll, i = 0; y < CFG.H; y += bandH, i++) {
    const depth = (y - hy) / (CFG.H - hy);
    ctx.fillStyle = leg.palette === 'islands'
      ? `rgba(255,255,255,${0.04 + depth * 0.08})`
      : (i % 2 === 0 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.05)');
    ctx.fillRect(0, y, CFG.W, bandH * 0.45);
    if (leg.palette !== 'islands') {
      // field patchwork: 3 large patches per band, varied greens
      const greens = [C.terraceA, C.terraceC, '#577a35', '#4a6e2f'];
      for (let k = 0; k < 3; k++) {
        const bx = ((hash(i * 7 + k * 13) * CFG.W - g.s * (20 + depth * 60) - g.x * 300) % (CFG.W + 300) + CFG.W + 300) % (CFG.W + 300) - 150;
        ctx.fillStyle = greens[(i + k) % greens.length];
        ctx.globalAlpha = 0.35 + depth * 0.45;
        ctx.fillRect(bx, y + 2, 150 + depth * 180, 10 + depth * 12);
        ctx.globalAlpha = 1;
      }
    } else {
      // islands: green body with a sand rim, few and large
      for (let k = 0; k < 2; k++) {
        const bx = ((hash(i * 11 + k * 17) * CFG.W - g.s * (20 + depth * 60)) % (CFG.W + 400) + CFG.W + 400) % (CFG.W + 400) - 200;
        ctx.fillStyle = C.sand;
        ctx.beginPath(); ctx.ellipse(bx, y + 8, 80 + depth * 110, 14 + depth * 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2e6b34';
        ctx.beginPath(); ctx.ellipse(bx, y + 8, 64 + depth * 88, 10 + depth * 8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // river ribbon (legs 1-2) winding with distance
  if (leg.palette !== 'islands') {
    ctx.strokeStyle = 'rgba(120,190,230,0.75)'; ctx.lineWidth = 10;
    ctx.beginPath();
    for (let y = hy; y <= CFG.H; y += 24) {
      const depth = (y - hy) / (CFG.H - hy);
      const rx = CFG.W * 0.68 + Math.sin((g.s + depth * 40) * 0.05) * 90 - g.x * 200 * depth;
      if (y === hy) ctx.moveTo(rx, y); else ctx.lineTo(rx, y);
    }
    ctx.stroke();
  }
  // runway strip ahead when near the leg end
  const toEnd = leg.length - g.s;
  if (toEnd < 130) {
    const scale = Math.max(0.06, 1 - toEnd / 130);
    const rw = 26 + scale * 320;
    const rx = CFG.W / 2 - g.x * 420 * scale - g.heading * 2;
    ctx.fillStyle = C.runway;
    ctx.beginPath();
    ctx.moveTo(rx - 8, hy + 6); ctx.lineTo(rx + 8, hy + 6);
    ctx.lineTo(rx + rw / 2, CFG.H); ctx.lineTo(rx - rw / 2, CFG.H);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.runwayLine; ctx.lineWidth = 3; ctx.setLineDash([18, 16]);
    ctx.beginPath(); ctx.moveTo(rx, hy + 6); ctx.lineTo(rx, CFG.H); ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'RUNWAY', rx, hy + 26, 15, C.runwayLine, 'center');
  }
  void altAgl;
}

function drawRings(ctx, g, leg) {
  const hy = CFG.horizonY - g.pitch * 2;
  const next = leg.rings.find((r) => !r.passed);
  for (const ring of leg.rings) {
    if (ring.passed) continue; // passed rings already flashed; keep the frame clean
    const ds = ring.s - g.s;
    if (ds < -4 || ds > 90) continue;
    const scale = 1 / (1 + ds * 0.055);
    const dx = (ring.x - g.x) * 900;
    const rx = CFG.W / 2 + dx * scale * 0.85 - g.heading * 2.2 * scale;
    const ry = hy - (ring.alt - g.alt) * 0.14 * scale - 40 * scale;
    const rr = Math.max(8, ring.r * scale * 0.95);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.35 + scale);
    ctx.strokeStyle = ring.passed ? C.ringPass : C.ring;
    ctx.lineWidth = Math.max(3, 9 * scale);
    ctx.shadowColor = ring.passed ? C.ringPass : C.ring;
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // Distance label only on the next ring, so labels never pile up.
    if (ring === next) {
      ctx.fillStyle = C.ring;
      text(ctx, `${Math.max(0, Math.round(ds))}`, rx, ry - rr * 0.62 - 14, Math.max(14, 22 * scale), C.ring, 'center');
    } else if (ring.passed) {
      ctx.fillStyle = C.ringPass;
      text(ctx, '✓', rx, ry - rr * 0.62 - 14, Math.max(14, 22 * scale), C.ringPass, 'center');
    }
    ctx.restore();
  }
}

function drawCloudHazards(ctx, g, leg) {
  const hy = CFG.horizonY - g.pitch * 2;
  for (const c of leg.clouds) {
    const ds = c.s - g.s;
    if (ds < -6 || ds > 120) continue;
    const scale = 1 / (1 + ds * 0.06);
    const cx = CFG.W / 2 + (c.x - g.x) * 900 * scale * 0.85;
    const cy = hy - (c.alt - g.alt) * 0.14 * scale - 30 * scale;
    const r = Math.max(8, c.r * scale * 0.55);
    ctx.fillStyle = c.ash ? 'rgba(90,70,62,0.85)' : 'rgba(70,80,95,0.8)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - r * 0.5, cy + 6, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.5, cy + 4, r * 0.65, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    if (c.ash && ds < 60) { ctx.fillStyle = 'rgba(255,120,40,0.9)'; text(ctx, '!', cx, cy, Math.max(16, 28 * scale), '#ff7840', 'center'); }
  }
}

function drawPlane(ctx, g) {
  const px = CFG.W / 2, py = 545 + g.pitch * 1.2;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((g.bank * 0.5 * Math.PI) / 180);
  if (g.shake > 0) ctx.translate((hash(g.frame) - 0.5) * 14, (hash(g.frame * 1.7) - 0.5) * 10);
  // spinning propeller disc, behind the airframe, with two blades
  ctx.fillStyle = 'rgba(210,220,230,0.16)';
  ctx.beginPath(); ctx.ellipse(0, 6, 80, 76, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210,220,230,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 6, 80, 76, 0, 0, Math.PI * 2); ctx.stroke();
  const bladeA = (g.frame * 0.55) % Math.PI;
  ctx.strokeStyle = 'rgba(230,235,240,0.5)'; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-Math.cos(bladeA) * 72, 6 - Math.sin(bladeA) * 72);
  ctx.lineTo(Math.cos(bladeA) * 72, 6 + Math.sin(bladeA) * 72);
  ctx.stroke();
  // wings: wide, slight dihedral, red tips, dark outline so they read on green
  ctx.fillStyle = C.planeBody;
  ctx.strokeStyle = '#5a5344'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-196, 18); ctx.lineTo(-34, -6); ctx.lineTo(34, -6); ctx.lineTo(196, 18);
  ctx.lineTo(186, 40); ctx.lineTo(-186, 40);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.planeRed;
  ctx.fillRect(-196, 18, 26, 20); ctx.fillRect(170, 18, 26, 20);
  // wing struts (STOL bush plane)
  ctx.strokeStyle = '#5a5344'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-58, 26); ctx.lineTo(-120, 12); ctx.moveTo(58, 26); ctx.lineTo(120, 12); ctx.stroke();
  // fuselage: short, wide, rounded rear view with a dark outline
  const fg = ctx.createLinearGradient(-40, 0, 40, 0);
  fg.addColorStop(0, '#b9b2a0'); fg.addColorStop(0.5, C.planeBody); fg.addColorStop(1, '#8f8878');
  ctx.fillStyle = fg; ctx.strokeStyle = '#5a5344'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-38, -52); ctx.lineTo(38, -52); ctx.lineTo(48, 44); ctx.lineTo(-48, 44);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // engine cowling + exhausts
  ctx.fillStyle = '#3a352c';
  ctx.beginPath(); ctx.ellipse(-20, 44, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, 44, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  // tailplane (horizontal stabiliser) at the top of the fuselage
  ctx.fillStyle = C.planeBody; ctx.strokeStyle = '#5a5344'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-84, -46); ctx.lineTo(84, -46); ctx.lineTo(74, -30); ctx.lineTo(-74, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  // vertical tail fin with livery
  ctx.fillStyle = C.planeRed;
  ctx.beginPath(); ctx.moveTo(-24, -44); ctx.lineTo(24, -44); ctx.lineTo(13, -108); ctx.lineTo(-13, -108); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  text(ctx, 'MERAPI AIR', 0, -76, 12, '#ffffff', 'center');
  // nav lights (blink on a deterministic frame clock)
  const blink = (g.frame % 60) < 30;
  ctx.fillStyle = blink ? '#ff3b30' : '#7a1a14';
  ctx.beginPath(); ctx.arc(-196, 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blink ? '#37e07a' : '#14532a';
  ctx.beginPath(); ctx.arc(196, 28, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, -108, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = C.hudPanel;
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(142,240,192,0.35)'; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8); ctx.stroke();
}

function drawHUD(ctx, g) {
  const leg = currentLeg(g);
  // top instrument bar
  panel(ctx, 16, 12, 1248, 64);
  const hdg = ((Math.round(g.heading) % 360) + 360) % 360;
  text(ctx, 'ALT', 40, 30, 13, C.hudDim);
  text(ctx, `${Math.round(g.alt)} FT`, 40, 56, 24, C.hudText);
  text(ctx, 'SPD', 230, 30, 13, C.hudDim);
  text(ctx, `${Math.round(g.speed)} KT`, 230, 56, 24, C.hudText);
  text(ctx, 'HDG', 420, 30, 13, C.hudDim);
  text(ctx, `${String(hdg).padStart(3, '0')}°`, 420, 56, 24, C.hudText);
  // compass strip: one label every 30 degrees, spaced to never touch
  ctx.save();
  ctx.beginPath(); ctx.rect(540, 22, 260, 44); ctx.clip();
  for (let d = -60; d <= 60; d += 30) {
    const a = ((hdg + d) % 360 + 360) % 360;
    const x = 670 + d * 1.7;
    text(ctx, String(a).padStart(3, '0'), x, 34, 13, C.hudDim, 'center');
    ctx.strokeStyle = C.hudLine; ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, 56); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = C.hudAmber; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(670, 22); ctx.lineTo(670, 32); ctx.stroke();
  // fuel
  text(ctx, 'FUEL', 820, 30, 13, g.fuel < 20 ? C.hudRed : C.hudDim);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 820, 42, 150, 16, 4); ctx.fill();
  ctx.fillStyle = g.fuel < 20 ? C.hudRed : g.fuel < 45 ? C.hudAmber : C.hudGreen;
  roundRect(ctx, 820, 42, 150 * (g.fuel / 100), 16, 4); ctx.fill();
  text(ctx, `${Math.round(g.fuel)}%`, 980, 50, 15, C.hudText);
  // rings / score / time
  text(ctx, 'RINGS', 1040, 30, 13, C.hudDim);
  text(ctx, `${g.ringsPassed}/${g.ringsTotal}`, 1040, 56, 24, C.hudText);
  text(ctx, 'SCORE', 1140, 30, 13, C.hudDim);
  text(ctx, `${g.score}`, 1140, 56, 24, C.hudAmber);
  // leg + objective line
  text(ctx, leg.name, 16, 96, 17, C.hudAmber);
  text(ctx, `Objective: fly the rings, then land on the strip  •  Time ${Math.floor(g.legTime / 60)}:${String(Math.floor(g.legTime % 60)).padStart(2, '0')}  •  Attempts ${g.attempts}`, 16, 118, 14, C.hudText);
  // artificial horizon, bottom-left
  const ax = 92, ay = 620, ar = 56;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#2a4d8f'; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate((-g.bank * Math.PI) / 180); ctx.translate(0, g.pitch * 1.4);
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(-ar, 0, ar * 2, ar);
  ctx.fillStyle = '#2a4d8f'; ctx.fillRect(-ar, -ar, ar * 2, ar);
  ctx.restore(); ctx.restore();
  ctx.strokeStyle = C.hudLine; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.hudAmber;
  ctx.fillRect(ax - 30, ay - 2, 22, 4); ctx.fillRect(ax + 8, ay - 2, 22, 4);
  text(ctx, 'ATTITUDE', ax, ay + ar + 14, 11, C.hudDim, 'center');
  // throttle + damage, bottom-right
  text(ctx, 'THR', 1180, 566, 12, C.hudDim, 'center');
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(ctx, 1168, 576, 24, 90, 4); ctx.fill();
  ctx.fillStyle = C.hudGreen; roundRect(ctx, 1168, 576 + 90 * (1 - g.throttle), 24, 90 * g.throttle, 4); ctx.fill();
  text(ctx, 'DMG', 1180, 690, 11, C.hudRed, 'center');
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; roundRect(ctx, 1120, 676, 60, 10, 4); ctx.fill();
  ctx.fillStyle = C.hudRed; roundRect(ctx, 1120, 676, 60 * (g.damage / 100), 10, 4); ctx.fill();
  // centre message
  if (g.messageT > 0 && g.message) {
    ctx.globalAlpha = Math.min(1, g.messageT);
    text(ctx, g.message, CFG.W / 2, 190, 30, C.hudAmber, 'center');
    ctx.globalAlpha = 1;
  }
  // warnings sit just under the objective line, clear of the centre message
  if (g.fuel < 20) text(ctx, '⚠ LOW FUEL', CFG.W / 2, 142, 19, (g.frame % 40) < 20 ? C.hudRed : C.hudAmber, 'center');
  if (g.damage > 55) text(ctx, '⚠ AIRFRAME DAMAGE', CFG.W / 2, 168, 19, (g.frame % 40) < 20 ? C.hudRed : C.hudAmber, 'center');
}

function drawTitle(ctx, g) {
  ctx.fillStyle = 'rgba(10,6,24,0.45)'; ctx.fillRect(0, 0, CFG.W, CFG.H);
  panel(ctx, 240, 150, 800, 330);
  text(ctx, 'MERAPI DAWN RUN', 640, 210, 58, '#ffd97a', 'center');
  text(ctx, 'VOLCANO AIRLIFT  •  A STOL BUSH-PILOT STORY', 640, 258, 20, C.hudAmber, 'center');
  text(ctx, 'Dawn over Java. A clinic on the far island is out of medicine,', 640, 310, 18, C.hudText, 'center');
  text(ctx, 'and you are the only plane that can thread the volcano pass.', 640, 338, 18, C.hudText, 'center');
  text(ctx, 'Fly the amber rings, mind your fuel, and put her down gently', 640, 366, 18, C.hudText, 'center');
  text(ctx, 'on three short strips — terraces, volcano, open sea.', 640, 394, 18, C.hudText, 'center');
  text(ctx, 'ARROWS fly  •  W / S throttle  •  SHIFT boost  •  SPACE brake  •  P pause', 640, 436, 16, C.hudDim, 'center');
  text(ctx, g.best > 0 ? `BEST SCORE ${g.best}   •   Press ENTER or click to fly` : 'Press ENTER or click to fly', 640, 466, 17, C.hudGreen, 'center');
}

function drawEnd(ctx, g, kind) {
  ctx.fillStyle = 'rgba(10,6,24,0.55)'; ctx.fillRect(0, 0, CFG.W, CFG.H);
  panel(ctx, 290, 170, 700, 330);
  if (kind === 'win') {
    text(ctx, 'DELIVERED!', 640, 230, 52, C.hudGreen, 'center');
    text(ctx, 'All three legs clear. The medicine is on the island.', 640, 282, 19, C.hudText, 'center');
  } else if (kind === 'legclear') {
    text(ctx, 'LEG CLEAR', 640, 230, 52, C.hudGreen, 'center');
    text(ctx, 'Refuelled and reloaded. The next strip is waiting.', 640, 282, 19, C.hudText, 'center');
  } else {
    text(ctx, 'DOWN.', 640, 230, 52, C.hudRed, 'center');
    text(ctx, g.reason || 'The flight ended early.', 640, 282, 19, C.hudText, 'center');
  }
  text(ctx, `SCORE ${g.score}    TIME ${Math.floor(g.totalTime / 60)}:${String(Math.floor(g.totalTime % 60)).padStart(2, '0')}    RINGS ${g.ringsPassed}/${g.ringsTotal}`, 640, 330, 20, C.hudAmber, 'center');
  text(ctx, `Attempts left: ${g.attempts}`, 640, 366, 17, C.hudText, 'center');
  const hint = kind === 'win' ? 'Press ENTER to fly again' : kind === 'legclear' ? 'Press ENTER for the next leg' : g.attempts > 0 ? 'Press ENTER to retry this leg' : 'Press ENTER to start over';
  text(ctx, hint, 640, 420, 18, C.hudGreen, 'center');
}

export function render(ctx, g) {
  const leg = currentLeg(g);
  ctx.save();
  if (g.shake > 0) ctx.translate((hash(g.frame * 1.3) - 0.5) * 10, (hash(g.frame * 2.1) - 0.5) * 8);
  drawSky(ctx, g, leg);
  drawFarRidge(ctx, g, leg);
  drawGround(ctx, g, leg);
  drawCloudHazards(ctx, g, leg);
  drawRings(ctx, g, leg);
  if (g.phase !== PHASES.TITLE) drawPlane(ctx, g);
  ctx.restore();
  if (g.phase === PHASES.FLY || g.phase === PHASES.PAUSED) drawHUD(ctx, g);
  if (g.phase === PHASES.TITLE) { drawPlane(ctx, g); drawTitle(ctx, g); }
  if (g.phase === PHASES.LEGCLEAR) drawEnd(ctx, g, 'legclear');
  if (g.phase === PHASES.GAMEOVER) drawEnd(ctx, g, 'gameover');
  if (g.phase === PHASES.WIN) drawEnd(ctx, g, 'win');
  if (g.phase === PHASES.PAUSED) {
    ctx.fillStyle = 'rgba(10,6,24,0.5)'; ctx.fillRect(0, 0, CFG.W, CFG.H);
    text(ctx, 'PAUSED', CFG.W / 2, CFG.H / 2, 48, C.hudText, 'center');
    text(ctx, 'Press P to resume', CFG.W / 2, CFG.H / 2 + 52, 18, C.hudDim, 'center');
  }
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(125,255,154,${g.flash * 0.5})`;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }
}
