// player.js — Wren, the lantern-keeper: movement, sneaking, hiding, noise
// and the pebble toss. The keeper is quick on open lawn and slow while
// sneaking; running is loud, sneaking is silent, and a bush swallows them.

import { clamp, dist, slideMove } from './geometry.js';
import { TILE, inBushAt, walkableAt } from './levels.js';

export const KEEPER_RADIUS = 13;

export function makeKeeper(start) {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    facing: Math.PI / 2,
    sneaking: false,
    moving: false,
    running: false,
    hiddenInBush: false,
    stepPhase: 0,
    noise: 0, // 0..1, how loud the last step was; guards hear running feet
    pebbles: 3,
  };
}

/**
 * Move the keeper from keyboard input. `input` is { ax, ay } (a unit-ish
 * direction) and { sneak }. Walls stop the keeper by axis: slide along one
 * axis when the other is blocked. Returns the distance actually travelled.
 */
export function updateKeeper(keeper, level, input, dt) {
  const speed = input.sneak ? 78 : 168;
  keeper.sneaking = input.sneak;
  const mag = Math.hypot(input.ax, input.ay);
  keeper.moving = mag > 0.05;
  keeper.running = keeper.moving && !input.sneak;
  if (keeper.moving) {
    const nx = input.ax / Math.max(1, mag);
    const ny = input.ay / Math.max(1, mag);
    keeper.facing = Math.atan2(ny, nx);
    const step = speed * dt;
    // Slide along hedges: the keeper never sticks in a corner.
    const moved = slideMove(keeper.x, keeper.y, nx * step, ny * step, (px, py) => walkableAt(level, px, py), KEEPER_RADIUS, TILE);
    keeper.x = moved.x;
    keeper.y = moved.y;
    keeper.stepPhase += dt * (input.sneak ? 5 : 10);
    keeper.noise = clamp(keeper.noise + (input.sneak ? -dt * 2 : dt * 1.4), 0, 1);
  } else {
    keeper.noise = clamp(keeper.noise - dt * 2.5, 0, 1);
  }
  keeper.hiddenInBush = inBushAt(level, keeper.x, keeper.y);
  return keeper.moving ? speed * dt : 0;
}

/**
 * Toss a pebble toward (tx, ty). It arcs to a landing spot at most 220px
 * away and clatters; guards in earshot come to look. Returns the pebble
 * { x, y, tx, ty, t } or null when the keeper has none left.
 */
export function throwPebble(keeper, tx, ty) {
  if (keeper.pebbles <= 0) return null;
  keeper.pebbles--;
  const d = Math.min(dist(keeper.x, keeper.y, tx, ty), 230);
  const a = Math.atan2(ty - keeper.y, tx - keeper.x);
  return {
    x: keeper.x,
    y: keeper.y,
    sx: keeper.x,
    sy: keeper.y,
    tx: keeper.x + Math.cos(a) * d,
    ty: keeper.y + Math.sin(a) * d,
    t: 0,
    landed: false,
  };
}

/** Advance a thrown pebble; returns 'landed' once, 'flying' while airborne, 'done' after. */
export function updatePebble(pebble, dt) {
  if (pebble.landed) return 'done';
  pebble.t += dt * 2.4;
  if (pebble.t >= 1) {
    pebble.t = 1;
    pebble.x = pebble.tx;
    pebble.y = pebble.ty;
    pebble.landed = true;
    return 'landed';
  }
  const t = pebble.t;
  pebble.x = pebble.sx + (pebble.tx - pebble.sx) * t;
  pebble.y = pebble.sy + (pebble.ty - pebble.sy) * t;
  return 'flying';
}

/** Height of the pebble's arc, for the renderer's little shadow trick. */
export function pebbleArcHeight(pebble) {
  return Math.sin(pebble.t * Math.PI) * 26;
}
