// render.js — everything EMBERWATCH draws: the moonlit garden, the guards
// and their vision cones, the keeper's lantern glow, keys, the gate, the HUD
// and the title / pause / end screens. All art is drawn in code — no images.

import { TILE, COLS, ROWS } from './levels.js';
import { GUARD_STATE, visionConePolygon } from './guards.js';
import { pebbleArcHeight } from './player.js';

const W = COLS * TILE; // 1280
const H = ROWS * TILE; // 720

const PALETTE = {
  lawnA: '#1d3320',
  lawnB: '#223a24',
  path: '#2c3a26',
  hedge: '#0e2412',
  hedgeTop: '#1a4a22',
  statue: '#5d6b74',
  statueTop: '#8fa0a8',
  bush: '#123a1c',
  bushTop: '#2c6b34',
  pond: '#16324a',
  flower: '#c96a8a',
  key: '#ffb52e',
  gateClosed: '#3a3f4a',
  gateOpen: '#7be495',
};

/** Deterministic lawn speckle: same garden every run. */
function speckle(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Draw the whole playing scene (no screens) for the current game state. */
export function drawScene(ctx, s) {
  drawGarden(ctx, s);
  drawExit(ctx, s);
  drawKeys(ctx, s);
  drawPebbles(ctx, s);
  drawGuards(ctx, s);
  drawKeeper(ctx, s);
  drawNight(ctx, s);
  drawHud(ctx, s);
  drawToasts(ctx, s);
}

/** The floor, hedges, statues, bushes, ponds and flowerbeds. */
function drawGarden(ctx, s) {
  const level = s.parsed;
  // Lawn: two alternating shades plus a faint speckle, so the floor reads.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = (c + r) % 2 === 0 ? PALETTE.lawnA : PALETTE.lawnB;
      ctx.fillRect(x, y, TILE, TILE);
      if (speckle(c, r) > 0.82) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x + 6 + speckle(r, c) * 24, y + 6 + speckle(c * 3, r) * 24, 3, 3);
      }
    }
  }
  // Moonlight pools: soft pale circles that mark the safe-ish open lawn.
  for (const [mx, my, mr] of s.moonPools) {
    const g = ctx.createRadialGradient(mx, my, 4, mx, my, mr);
    g.addColorStop(0, 'rgba(190,210,255,0.10)');
    g.addColorStop(1, 'rgba(190,210,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flowerbeds.
  for (const f of level.flowers) {
    ctx.fillStyle = '#2a4a2c';
    ctx.fillRect(f.x + 4, f.y + 4, TILE - 8, TILE - 8);
    for (let i = 0; i < 5; i++) {
      const fx = f.x + 8 + speckle(f.x + i, f.y) * 24;
      const fy = f.y + 8 + speckle(f.y + i, f.x) * 24;
      ctx.fillStyle = i % 2 ? PALETTE.flower : '#d9a05a';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ponds.
  for (const p of level.ponds) {
    ctx.fillStyle = PALETTE.pond;
    ctx.beginPath();
    ctx.roundRect(p.x + 2, p.y + 2, TILE - 4, TILE - 4, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,190,230,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.x + TILE / 2, p.y + TILE / 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Hedge walls: dark body, lighter top edge, a few leaf dots.
  for (const w of level.walls) {
    ctx.fillStyle = PALETTE.hedge;
    ctx.fillRect(w.x, w.y, TILE, TILE);
    ctx.fillStyle = PALETTE.hedgeTop;
    ctx.fillRect(w.x + 2, w.y + 2, TILE - 4, 7);
    ctx.fillStyle = 'rgba(60,140,70,0.5)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(w.x + 8 + speckle(w.x + i, w.y) * 24, w.y + 14 + speckle(w.y, w.x + i) * 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Statues: a plinth and a robed figure, always readable against the floor.
  for (const st of level.statues) {
    ctx.fillStyle = '#3c4650';
    ctx.fillRect(st.x + 5, st.y + 26, TILE - 10, 9);
    ctx.fillStyle = PALETTE.statue;
    ctx.beginPath();
    ctx.roundRect(st.x + 10, st.y + 8, TILE - 20, 20, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.statueTop;
    ctx.beginPath();
    ctx.arc(st.x + TILE / 2, st.y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bushes: the hiding cover — a dark mound with bright leaf tips.
  for (const b of level.bushes) {
    drawBush(ctx, b.x, b.y, 1);
  }
}

function drawBush(ctx, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.bush;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2 + 4, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.bushTop;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.arc(x + TILE / 2 + Math.cos(a) * 11, y + TILE / 2 + 4 + Math.sin(a) * 9, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The garden gate: iron bars while locked, a warm green arch once open. */
function drawExit(ctx, s) {
  const e = s.parsed.exit;
  const open = s.keysLeft === 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (open) {
    const pulse = 0.75 + Math.sin(s.time * 3) * 0.25;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, `rgba(123,228,149,${0.5 * pulse})`);
    g.addColorStop(1, 'rgba(123,228,149,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gateOpen;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 2, 17, Math.PI, 0);
    ctx.moveTo(-17, 2);
    ctx.lineTo(-17, 16);
    ctx.moveTo(17, 2);
    ctx.lineTo(17, 16);
    ctx.stroke();
    ctx.fillStyle = '#eaffef';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 0, -24);
  } else {
    ctx.fillStyle = '#20242e';
    ctx.fillRect(-19, -18, 38, 36);
    ctx.strokeStyle = PALETTE.gateClosed;
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7, -18);
      ctx.lineTo(i * 7, 18);
      ctx.stroke();
    }
    ctx.fillStyle = '#9aa3b2';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.keysLeft} KEY${s.keysLeft === 1 ? '' : 'S'}`, 0, -24);
  }
  ctx.restore();
}

/** Ember keys: glowing amber diamonds that bob gently. */
function drawKeys(ctx, s) {
  for (const k of s.parsed.keys) {
    if (k.taken) continue;
    const bob = Math.sin(s.time * 2.4 + k.x) * 3;
    const g = ctx.createRadialGradient(k.x, k.y + bob, 2, k.x, k.y + bob, 26);
    g.addColorStop(0, 'rgba(255,181,46,0.55)');
    g.addColorStop(1, 'rgba(255,181,46,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(k.x, k.y + bob, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(k.x, k.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.key;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

/** Thrown pebbles, mid-arc and landed. */
function drawPebbles(ctx, s) {
  for (const p of s.pebbles) {
    const h = pebbleArcHeight(p);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ccd4';
    ctx.beginPath();
    ctx.arc(p.x, p.y - h, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.landed) {
      ctx.strokeStyle = `rgba(255,220,120,${0.8 - Math.min(0.7, s.time - p.landTime)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + (s.time - p.landTime) * 30, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Guards: vision cone, cloaked body, facing lantern, and ? / ! over the head. */
function drawGuards(ctx, s) {
  for (const g of s.guards) {
    const poly = visionConePolygon(g, s.levelDef);
    const alert = g.state === GUARD_STATE.CHASE;
    const warm = g.suspicion > 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fillStyle = alert
      ? 'rgba(255,70,50,0.30)'
      : warm
        ? 'rgba(255,170,60,0.24)'
        : 'rgba(255,220,110,0.16)';
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255,90,60,0.5)' : 'rgba(255,220,110,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Footstep ripple while the guard walks.
    if (g.state !== GUARD_STATE.PATROL || g.pauseLeft <= 0) {
      ctx.strokeStyle = 'rgba(200,210,220,0.12)';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 16 + ((g.stepPhase * 20) % 14), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body: a red-cloaked watchman with a pale face and a lantern ahead.
    const bob = Math.sin(g.stepPhase) * 1.5;
    ctx.save();
    ctx.translate(g.x, g.y + bob * 0.3);
    ctx.fillStyle = '#7e2a22';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a83a2c';
    ctx.beginPath();
    ctx.arc(0, 0, 14, Math.PI * 0.15, Math.PI * 0.85);
    ctx.fill();
    ctx.fillStyle = '#e8d9b8';
    ctx.beginPath();
    ctx.arc(Math.cos(g.facing) * 4, Math.sin(g.facing) * 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Lantern held out in front.
    const lx = Math.cos(g.facing) * 17;
    const ly = Math.sin(g.facing) * 17;
    const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
    lg.addColorStop(0, 'rgba(255,210,110,0.7)');
    lg.addColorStop(1, 'rgba(255,210,110,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, ly, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Suspicion: a ? that grows with the meter, a ! on full alarm.
    if (g.state === GUARD_STATE.CHASE) {
      drawMark(ctx, g.x, g.y - 30, '!', '#ff5a3c');
    } else if (g.suspicion > 0.12) {
      drawMark(ctx, g.x, g.y - 30, '?', g.suspicion > 0.5 ? '#ff9a3c' : '#ffe08a');
      // The meter itself, a thin bar under the mark.
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(g.x - 16, g.y - 26, 32, 4);
      ctx.fillStyle = g.suspicion > 0.5 ? '#ff9a3c' : '#ffe08a';
      ctx.fillRect(g.x - 16, g.y - 26, 32 * g.suspicion, 4);
    }
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Wren, the keeper: a hooded figure with a warm lantern. */
function drawKeeper(ctx, s) {
  const k = s.keeper;
  // Lantern glow on the ground.
  const lg = ctx.createRadialGradient(k.x, k.y, 6, k.x, k.y, 74);
  lg.addColorStop(0, 'rgba(255,190,90,0.22)');
  lg.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(k.x, k.y, 74, 0, Math.PI * 2);
  ctx.fill();

  const bob = k.moving ? Math.sin(k.stepPhase) * 1.5 : Math.sin(s.time * 2) * 0.6;
  ctx.save();
  ctx.translate(k.x, k.y + bob * 0.3);
  if (k.hiddenInBush) ctx.globalAlpha = 0.55;
  // Cloak.
  ctx.fillStyle = '#1f6f5c';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a8a72';
  ctx.beginPath();
  ctx.arc(-Math.cos(k.facing) * 3, -Math.sin(k.facing) * 3, 9, 0, Math.PI * 2);
  ctx.fill();
  // Hood and face.
  ctx.fillStyle = '#17584a';
  ctx.beginPath();
  ctx.arc(Math.cos(k.facing) * 3, Math.sin(k.facing) * 3, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e3c2';
  ctx.beginPath();
  ctx.arc(Math.cos(k.facing) * 5, Math.sin(k.facing) * 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, swinging ahead.
  const swing = k.moving ? Math.sin(k.stepPhase) * 3 : Math.sin(s.time * 1.6) * 1.5;
  const lx = Math.cos(k.facing) * 15;
  const ly = Math.sin(k.facing) * 15 + swing * 0.3;
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(k.facing) * 9, Math.sin(k.facing) * 9);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hiding: the bush closes over the keeper, and a small HIDDEN tag says so.
  if (k.hiddenInBush) {
    drawBush(ctx, k.x - TILE / 2, k.y - TILE / 2, 0.55);
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText('HIDDEN', k.x, k.y - 26);
    ctx.fillStyle = '#9be89b';
    ctx.fillText('HIDDEN', k.x, k.y - 26);
  }
  // Sneaking: a soft ring shows the quiet step.
  if (k.sneaking && k.moving) {
    ctx.strokeStyle = 'rgba(155,232,155,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Pebble aim: a dotted line from the keeper toward the mouse, only once
  // the player has actually moved the mouse.
  if (s.mode === 'playing' && k.pebbles > 0 && s.mouseActive) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.lineTo(s.aimX, s.aimY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** The night itself: a vignette that deepens the mood without hiding play. */
function drawNight(ctx, s) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(8,12,28,0)');
  g.addColorStop(1, 'rgba(8,12,28,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  void s;
}

/** HUD: level, keys, lives, pebbles, score and time, as corner panels. */
function drawHud(ctx, s) {
  ctx.save();
  ctx.textBaseline = 'middle';
  panel(ctx, 12, 10, 300, 34);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(s.levelDef.name.toUpperCase(), 24, 28);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#ffb52e';
  const keyText = `KEYS ${s.keysGot}/${s.keysTotal}`;
  ctx.fillText(keyText, 236, 28);

  panel(ctx, 12, 50, 300, 30);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#f2e3c2';
  ctx.fillText(`LANTERNS ${'●'.repeat(Math.max(0, s.lives))}${'○'.repeat(Math.max(0, 3 - s.lives))}`, 24, 66);
  ctx.fillStyle = '#c8ccd4';
  ctx.fillText(`PEBBLES ${s.keeper.pebbles}`, 148, 66);
  ctx.fillStyle = s.anyAlert ? '#ff7a5c' : '#9be89b';
  ctx.fillText(s.anyAlert ? '! SPOTTED' : 'UNSEEN', 238, 66);

  panel(ctx, W - 232, 10, 220, 34);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${s.score}`, W - 24, 28);
  panel(ctx, W - 232, 50, 220, 30);
  ctx.fillStyle = '#c8ccd4';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${formatTime(s.elapsed)}   ·   LEVEL ${s.levelIndex + 1}/3`, W - 24, 66);

  // Controls hint, fading out after the first seconds of level 1.
  if (s.levelIndex === 0 && s.elapsed < 14 && s.mode === 'playing') {
    const a = s.elapsed > 11 ? (14 - s.elapsed) / 3 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, W / 2 - 330, H - 44, 660, 32);
    ctx.fillStyle = '#dfe6f2';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows — move   ·   SHIFT — sneak   ·   CLICK / Q — toss a pebble   ·   P — pause   ·   M — mute', W / 2, H - 27);
    ctx.restore();
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,12,24,0.62)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Short floating messages ("Key found!", "The gate is open!"). */
function drawToasts(ctx, s) {
  let y = 96;
  for (const toast of s.toasts) {
    const age = s.time - toast.at;
    if (age > 2.6) continue;
    const a = age > 2 ? (2.6 - age) / 0.6 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(toast.text, W / 2, y);
    ctx.fillStyle = toast.color;
    ctx.fillText(toast.text, W / 2, y);
    ctx.restore();
    y += 26;
  }
}

// ---------------------------------------------------------------- screens

function dim(ctx) {
  ctx.fillStyle = 'rgba(6,10,22,0.72)';
  ctx.fillRect(0, 0, W, H);
}

function titleText(ctx, text, y, size, color) {
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, W / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
}

function bodyText(ctx, text, y, size, color) {
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
}

export function drawTitle(ctx, s) {
  drawScene(ctx, s);
  dim(ctx);
  titleText(ctx, 'EMBERWATCH', 150, 64, '#ffd76e');
  bodyText(ctx, 'A lantern-keeper\'s stealth game — sneak the moonlit garden, gather the ember keys,', 210, 18, '#e8ecf4');
  bodyText(ctx, 'and slip through the gate unseen.', 236, 18, '#e8ecf4');
  bodyText(ctx, 'Guards patrol with lanterns and watchful cones. Bushes hide you. Pebbles distract them.', 280, 16, '#b9c2d4');
  bodyText(ctx, 'Run and you are loud. Sneak and you are a shadow.', 306, 16, '#b9c2d4');
  bodyText(ctx, 'WASD / arrows — move      SHIFT — sneak      CLICK or Q — toss a pebble', 360, 16, '#ffd76e');
  bodyText(ctx, 'P — pause      M — mute      R — restart level', 386, 16, '#ffd76e');
  const pulse = 0.65 + Math.sin(s.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = pulse;
  bodyText(ctx, 'Press ENTER or CLICK to begin — Level 1: Moonlit Garden', 460, 20, '#ffffff');
  ctx.restore();
  bodyText(ctx, 'Three gardens. Three keys each. One gate each. Good luck, keeper.', 520, 14, '#8a94a8');
}

export function drawPause(ctx, s) {
  drawScene(ctx, s);
  dim(ctx);
  titleText(ctx, 'PAUSED', 300, 48, '#e8ecf4');
  bodyText(ctx, 'The garden waits. Press P or ENTER to keep sneaking.', 360, 18, '#b9c2d4');
}

export function drawLevelComplete(ctx, s) {
  drawScene(ctx, s);
  dim(ctx);
  titleText(ctx, 'GATE REACHED', 260, 52, '#7be495');
  bodyText(ctx, `${s.levelDef.name} — cleared in ${formatTime(s.elapsed)}`, 320, 18, '#e8ecf4');
  bodyText(ctx, `Keys ${s.keysGot}/${s.keysTotal}   ·   Times spotted: ${s.timesSpotted}   ·   Level bonus +${s.levelBonus}`, 352, 16, '#b9c2d4');
  bodyText(ctx, `Score: ${s.score}`, 384, 18, '#ffd76e');
  const pulse = 0.65 + Math.sin(s.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = pulse;
  bodyText(ctx, s.levelIndex + 1 < 3 ? 'Press ENTER for the next garden' : 'Press ENTER for the final reckoning', 450, 20, '#ffffff');
  ctx.restore();
}

export function drawCaught(ctx, s) {
  drawScene(ctx, s);
  dim(ctx);
  titleText(ctx, 'CAUGHT!', 260, 56, '#ff7a5c');
  bodyText(ctx, `A watchman laid hands on the keeper in ${s.levelDef.name}.`, 320, 18, '#e8ecf4');
  bodyText(ctx, s.lives > 0 ? `Lanterns left: ${s.lives} — the garden resets, the keys stay where they were.` : 'No lanterns left.', 352, 16, '#b9c2d4');
  const pulse = 0.65 + Math.sin(s.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = pulse;
  bodyText(ctx, s.lives > 0 ? 'Press ENTER to try the garden again' : 'Press ENTER to start over from the first garden', 450, 20, '#ffffff');
  ctx.restore();
}

export function drawGameOver(ctx, s) {
  dim(ctx);
  titleText(ctx, 'THE LANTERN GOES OUT', 280, 44, '#ff7a5c');
  bodyText(ctx, 'Three lanterns spent. The garden keeps its secrets tonight.', 340, 18, '#e8ecf4');
  bodyText(ctx, `Final score: ${s.score}`, 380, 18, '#ffd76e');
  const pulse = 0.65 + Math.sin(s.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = pulse;
  bodyText(ctx, 'Press ENTER to try again from the first garden', 450, 20, '#ffffff');
  ctx.restore();
}

export function drawVictory(ctx, s) {
  drawScene(ctx, s);
  dim(ctx);
  titleText(ctx, 'THE GARDENS ARE YOURS', 220, 52, '#ffd76e');
  bodyText(ctx, 'Three gates, nine keys, and not a single watchman the wiser —', 280, 18, '#e8ecf4');
  bodyText(ctx, 'or if they were, you were already gone.', 306, 18, '#e8ecf4');
  bodyText(ctx, `Final score: ${s.score}   ·   Time: ${formatTime(s.totalTime)}   ·   Times spotted: ${s.totalSpotted}`, 360, 17, '#b9c2d4');
  const rank = s.totalSpotted === 0 ? 'GHOST — never spotted once' : s.totalSpotted <= 3 ? 'SHADOW — barely a whisper' : 'KEEPER — the garden remembers you';
  bodyText(ctx, `Rank: ${rank}`, 396, 18, '#7be495');
  const pulse = 0.65 + Math.sin(s.time * 3) * 0.35;
  ctx.save();
  ctx.globalAlpha = pulse;
  bodyText(ctx, 'Press ENTER to play again', 470, 20, '#ffffff');
  ctx.restore();
}
