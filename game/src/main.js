// main.js — EMBERWATCH's game loop: screens, scoring, catching, winning,
// and the ?shot= staging used to take the entry's screenshots. One file,
// one job: own the state machine and wire the modules together.

import { LEVELS, TILE, parseLevel } from './levels.js';
import { makeGuard, updateGuard, guardSeesKeeper, GUARD_STATE } from './guards.js';
import { makeKeeper, updateKeeper, throwPebble, updatePebble } from './player.js';
import { makeInput } from './input.js';
import {
  drawScene, drawTitle, drawPause, drawLevelComplete, drawCaught,
  drawGameOver, drawVictory,
} from './render.js';
import {
  unlockAudio, toggleMute, playStep, playGuardStep, playPebble, playKey,
  playAlarm, playSpotted, playGateOpen, playWin, playCaught, playClick,
} from './audio.js';
import { dist } from './geometry.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = makeInput(canvas);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot'); // title | patrol | hide | exit | alert — staging for screenshots

const MODES = {
  TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused',
  LEVEL_COMPLETE: 'levelcomplete', CAUGHT: 'caught',
  GAME_OVER: 'gameover', VICTORY: 'victory',
};

const state = {
  mode: MODES.TITLE,
  time: 0,
  levelIndex: 0,
  levelDef: LEVELS[0],
  parsed: parseLevel(LEVELS[0]),
  guards: [],
  keeper: null,
  pebbles: [],
  toasts: [],
  score: 0,
  lives: 3,
  elapsed: 0,
  totalTime: 0,
  timesSpotted: 0,
  totalSpotted: 0,
  levelBonus: 0,
  keysGot: 0,
  keysTotal: 0,
  keysLeft: 0,
  anyAlert: false,
  moonPools: [],
  mouseActive: false,
  aimX: 0,
  aimY: 0,
  shot: Boolean(shot),
  lastMouseX: -1,
  lastMouseY: -1,
  stepAlt: false,
  ready: false,
};

function loadLevel(index, keepKeys) {
  const def = LEVELS[index];
  state.levelIndex = index;
  state.levelDef = def;
  const taken = keepKeys ? state.parsed.keys.filter((k) => k.taken).map((k) => `${k.x},${k.y}`) : [];
  state.parsed = parseLevel(def);
  if (keepKeys) {
    for (const k of state.parsed.keys) {
      if (taken.includes(`${k.x},${k.y}`)) k.taken = true;
    }
  }
  state.guards = def.guards.map((g, i) => makeGuard(g, i));
  state.keeper = makeKeeper(state.parsed.start);
  state.keeper.pebbles = def.pebbles;
  state.pebbles = [];
  state.elapsed = 0;
  state.timesSpotted = 0;
  state.anyAlert = false;
  state.keysTotal = state.parsed.keys.length;
  state.keysGot = state.parsed.keys.filter((k) => k.taken).length;
  state.keysLeft = state.keysTotal - state.keysGot;
  // Fixed moonlight pools per level, so the garden looks the same every run.
  const seeds = [[320, 180, 150], [960, 420, 170], [620, 600, 140], [1080, 140, 120]];
  state.moonPools = seeds.map(([x, y, r], i) => [x + (index * 37 + i * 11) % 60, y, r]);
  if (state.keysLeft === 0) playGateOpen();
}

function addToast(text, color = '#ffd76e') {
  state.toasts.push({ text, color, at: state.time });
  if (state.toasts.length > 4) state.toasts.shift();
}

function startGame() {
  state.score = 0;
  state.lives = 3;
  state.totalTime = 0;
  state.totalSpotted = 0;
  loadLevel(0, false);
  state.mode = MODES.PLAYING;
  playClick();
}

function nextLevel() {
  if (state.levelIndex + 1 >= LEVELS.length) {
    state.mode = MODES.VICTORY;
    playWin();
    return;
  }
  loadLevel(state.levelIndex + 1, false);
  state.mode = MODES.PLAYING;
  playClick();
}

function onCaught() {
  state.lives--;
  state.mode = MODES.CAUGHT;
  playCaught();
  if (state.lives <= 0) state.mode = MODES.GAME_OVER;
}

function onLevelComplete() {
  const timeBonus = Math.max(0, Math.round((state.levelDef.par - state.elapsed) * 5));
  const ghostBonus = state.timesSpotted === 0 ? 200 : 0;
  state.levelBonus = 300 + timeBonus + ghostBonus;
  state.score += state.levelBonus;
  state.totalTime += state.elapsed;
  state.mode = MODES.LEVEL_COMPLETE;
  playWin();
}

/** Collect keys, check the gate, check for capture. `edges` were already consumed by update(). */
function updatePlay(dt, edges) {
  const k = state.keeper;
  if (edges.mutePressed) toggleMute();
  if (edges.pausePressed) {
    state.mode = MODES.PAUSED;
    return;
  }
  if (edges.restartPressed) {
    loadLevel(state.levelIndex, false);
    return;
  }
  state.elapsed += dt;

  // Mouse aim line: only once the mouse has actually moved.
  if (input.mouseX !== state.lastMouseX || input.mouseY !== state.lastMouseY) {
    state.mouseActive = true;
    state.lastMouseX = input.mouseX;
    state.lastMouseY = input.mouseY;
  }
  state.aimX = input.mouseX;
  state.aimY = input.mouseY;

  const moved = updateKeeper(k, state.levelDef, { ax: input.ax, ay: input.ay, sneak: input.sneak }, dt);
  if (moved > 0) {
    // Footsteps: the keeper's own, and the guards' boots when they are near.
    state.stepAcc = (state.stepAcc ?? 0) + moved;
    if (state.stepAcc > 46) {
      state.stepAcc = 0;
      state.stepAlt = !state.stepAlt;
      playStep(k.sneaking, state.stepAlt);
    }
  }
  if (edges.pebbleQueued && edges.pebbleTarget) {
    const p = throwPebble(k, edges.pebbleTarget.x, edges.pebbleTarget.y);
    if (p) {
      state.pebbles.push(p);
      playClick();
    }
  }
  for (const p of state.pebbles) {
    const res = updatePebble(p, dt);
    if (res === 'landed') {
      p.landTime = state.time;
      playPebble();
      // The clatter draws every guard in earshot to the landing spot.
      for (const g of state.guards) {
        if (dist(g.x, g.y, p.tx, p.ty) < 280 && g.state !== GUARD_STATE.CHASE) {
          g.state = 'investigate';
          g.lastSeen = { x: p.tx, y: p.ty };
          g.investigateTimer = 0;
          g.suspicion = Math.max(g.suspicion, 0.45);
        }
      }
    }
  }
  state.pebbles = state.pebbles.filter((p) => state.time - (p.landTime ?? state.time) < 1.2 || !p.landed);

  // Running feet are loud: a nearby guard hears them and turns to look.
  if (k.running) {
    for (const g of state.guards) {
      if (g.state !== GUARD_STATE.CHASE && dist(g.x, g.y, k.x, k.y) < 150) {
        g.suspicion = Math.min(1, g.suspicion + 0.55 * dt);
        g.lastSeen = { x: k.x, y: k.y };
        if (g.suspicion >= 1) {
          g.state = GUARD_STATE.CHASE;
          g.loseTimer = 0;
        }
      }
    }
  }

  // Keys.
  for (const key of state.parsed.keys) {
    if (!key.taken && dist(k.x, k.y, key.x, key.y) < 26) {
      key.taken = true;
      state.keysGot++;
      state.keysLeft--;
      state.score += 150;
      playKey();
      addToast(state.keysLeft === 0 ? 'All keys held — the gate is open!' : `Ember key ${state.keysGot} of ${state.keysTotal}`, '#ffd76e');
      if (state.keysLeft === 0) playGateOpen();
    }
  }

  // Guards.
  const events = [];
  for (const g of state.guards) {
    const before = g.state;
    updateGuard(g, k, state.levelDef, dt, events);
    if (before !== GUARD_STATE.CHASE && g.state === GUARD_STATE.CHASE) {
      state.timesSpotted++;
      state.totalSpotted++;
    }
    // Boot steps, audible when a guard walks close by.
    if (g.state !== GUARD_STATE.PATROL || g.pauseLeft <= 0) {
      state.guardStepAcc = (state.guardStepAcc ?? 0) + dt;
      if (state.guardStepAcc > 0.55) {
        state.guardStepAcc = 0;
        let nearest = Infinity;
        for (const gg of state.guards) nearest = Math.min(nearest, dist(gg.x, gg.y, k.x, k.y));
        if (nearest < 320) playGuardStep(nearest);
      }
    }
  }
  for (const ev of events) {
    if (ev.type === 'alarm') {
      playAlarm();
      addToast(`${ev.guard.name} has raised the alarm!`, '#ff7a5c');
    } else if (ev.type === 'spotted') {
      playSpotted();
    } else if (ev.type === 'lost') {
      addToast(`${ev.guard.name} lost your trail…`, '#9be89b');
    }
  }
  state.anyAlert = state.guards.some((g) => g.state === GUARD_STATE.CHASE);

  // Caught: a chasing guard lays hands on the keeper.
  for (const g of state.guards) {
    if (g.state === GUARD_STATE.CHASE && dist(g.x, g.y, k.x, k.y) < 26) {
      onCaught();
      return;
    }
  }

  // The gate: all keys held and the keeper reaches it.
  if (state.keysLeft === 0 && dist(k.x, k.y, state.parsed.exit.x, state.parsed.exit.y) < 32) {
    onLevelComplete();
  }
}

function update(dt) {
  state.time += dt;
  const edges = input.consumeEdges();
  if (edges.mutePressed) toggleMute();

  switch (state.mode) {
    case MODES.TITLE:
      if (edges.confirmPressed) {
        unlockAudio();
        startGame();
      }
      // The title screen shows the garden alive behind it: let the guards patrol.
      for (const g of state.guards) updateGuard(g, state.keeper, state.levelDef, dt, []);
      break;
    case MODES.PLAYING:
      updatePlay(dt, edges);
      break;
    case MODES.PAUSED:
      if (edges.pausePressed || edges.confirmPressed) {
        state.mode = MODES.PLAYING;
        playClick();
      }
      break;
    case MODES.LEVEL_COMPLETE:
      if (edges.confirmPressed) nextLevel();
      break;
    case MODES.CAUGHT:
      if (edges.confirmPressed) {
        if (state.lives > 0) {
          loadLevel(state.levelIndex, true);
          state.mode = MODES.PLAYING;
        } else {
          startGame();
        }
        playClick();
      }
      break;
    case MODES.GAME_OVER:
      if (edges.confirmPressed) startGame();
      break;
    case MODES.VICTORY:
      if (edges.confirmPressed) startGame();
      break;
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  switch (state.mode) {
    case MODES.TITLE: drawTitle(ctx, state); break;
    case MODES.PAUSED: drawPause(ctx, state); break;
    case MODES.LEVEL_COMPLETE: drawLevelComplete(ctx, state); break;
    case MODES.CAUGHT: drawCaught(ctx, state); break;
    case MODES.GAME_OVER: drawGameOver(ctx, state); break;
    case MODES.VICTORY: drawVictory(ctx, state); break;
    default: drawScene(ctx, state);
  }
}

// ---------------------------------------------------------------- loop

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- staging

/** Set up a fixed scene for a screenshot. Warm the guards up first so their
 *  cones sit in natural mid-stride positions, then place the staged pieces
 *  exactly where the shot needs them, and freeze. */
function stageShot(name) {
  loadLevel(name === 'alert' ? 1 : 0, false);
  state.mode = MODES.PLAYING;
  const k = state.keeper;
  const g = state.guards;
  // Warm up: let the guards walk their patrols a little.
  for (let i = 0; i < 100; i++) {
    for (const gg of state.guards) updateGuard(gg, k, state.levelDef, 1 / 60, []);
    state.time += 1 / 60;
  }
  if (name === 'patrol') {
    // The keeper mid-garden, cones sweeping across the lawn.
    k.x = 10 * TILE + TILE / 2;
    k.y = 6 * TILE + TILE / 2;
    k.facing = -Math.PI / 2;
  } else if (name === 'hide') {
    // Crouched in a bush while a guard's cone sweeps past.
    k.x = 24 * TILE + TILE / 2;
    k.y = 5 * TILE + TILE / 2;
    k.hiddenInBush = true;
    g[1].x = 20 * TILE + TILE / 2;
    g[1].y = 5 * TILE + TILE / 2;
    g[1].facing = 0;
    g[1].suspicion = 0.62;
    g[1].pauseLeft = 2;
  } else if (name === 'exit') {
    // Every key held, the gate glowing open, the keeper almost home.
    for (const key of state.parsed.keys) key.taken = true;
    state.keysGot = state.keysTotal;
    state.keysLeft = 0;
    k.x = 26 * TILE + TILE / 2;
    k.y = 16 * TILE + TILE / 2;
    k.facing = 0;
    addToast('All keys held — the gate is open!', '#7be495');
  } else if (name === 'alert') {
    // A chase in full cry: the guard closing on the keeper.
    k.x = 16 * TILE + TILE / 2;
    k.y = 12 * TILE + TILE / 2;
    k.facing = Math.PI;
    g[1].x = 12 * TILE + TILE / 2;
    g[1].y = 12 * TILE + TILE / 2;
    g[1].state = GUARD_STATE.CHASE;
    g[1].suspicion = 1;
    g[1].lastSeen = { x: k.x, y: k.y };
    g[1].facing = 0;
    state.anyAlert = true;
    addToast('Thistle has raised the alarm!', '#ff7a5c');
  }
  state.mode = name === 'title' ? MODES.TITLE : MODES.PLAYING;
  render();
  state.ready = true;
  document.title = 'EMBERWATCH ready';
  window.__emberwatch = state;
}

// Click anywhere also starts the game from the title screen.
canvas.addEventListener('mousedown', () => {
  if (state.mode === MODES.TITLE) {
    unlockAudio();
    startGame();
  }
});

loadLevel(0, false);
if (shot) {
  // Staged screenshots: build the scene, freeze it, and tell the shooter.
  unlockAudio();
  stageShot(shot);
  window.__emberwatchReady = true;
} else {
  window.__emberwatch = state;
  requestAnimationFrame(frame);
}
