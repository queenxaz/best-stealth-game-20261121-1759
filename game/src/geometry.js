// geometry.js — small 2D helpers for EMBERWATCH: points, segments and the
// line-of-sight tests the guards' vision cones depend on. No DOM here, so the
// same helpers can be unit-checked in plain Node.

export const TAU = Math.PI * 2;

/** Clamp a number into [lo, hi]. */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Shortest angle from a to b, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** Move angle `a` toward `target` by at most `step` radians. */
export function turnToward(a, target, step) {
  const d = angleDiff(a, target);
  if (Math.abs(d) <= step) return target;
  return a + Math.sign(d) * step;
}

/** Is point (x, y) inside rectangle r {x, y, w, h}? */
export function pointInRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/**
 * Does segment (x1,y1)-(x2,y2) hit rectangle r? Uses the slab test, so a
 * segment that only grazes a corner still counts as blocked.
 */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/**
 * Walk a ray from (x, y) along `angle` in small steps until it hits a solid
 * cell or reaches `maxLen`. Returns the travelled distance. The caller passes
 * a `solidAt(px, py)` predicate (the level's grid lookup).
 */
export function castRay(x, y, angle, maxLen, solidAt) {
  const step = 5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let d = 0;
  while (d < maxLen) {
    const nx = x + dx * (d + step);
    const ny = y + dy * (d + step);
    if (solidAt(nx, ny)) return d;
    d += step;
  }
  return maxLen;
}

/** Does an axis-aligned box of half-size r centred at (px, py) touch a solid point? */
function boxCollides(px, py, walkable, r) {
  return (
    !walkable(px - r, py - r) ||
    !walkable(px + r, py - r) ||
    !walkable(px - r, py + r) ||
    !walkable(px + r, py + r)
  );
}

/**
 * Move a box of half-size r by (dx, dy) with per-axis wall sliding: each axis
 * moves freely when it can, and when it cannot the box is clamped flush
 * against the blocking tile's edge instead of stopping dead. This is what
 * keeps a keeper from wedging into a hedge corner — a diagonal approach
 * slides along the wall instead of sticking.
 * `walkable(px, py)` says whether a point is free; `tile` is the grid size.
 * Returns the new { x, y }.
 */
export function slideMove(x, y, dx, dy, walkable, r, tile) {
  let nx = x + dx;
  if (!boxCollides(nx, y, walkable, r)) {
    x = nx;
  } else if (dx > 0) {
    x = Math.floor((nx + r) / tile) * tile - r - 0.01;
  } else if (dx < 0) {
    x = Math.floor((nx - r) / tile) * tile + tile + r + 0.01;
  }
  let ny = y + dy;
  if (!boxCollides(x, ny, walkable, r)) {
    y = ny;
  } else if (dy > 0) {
    y = Math.floor((ny + r) / tile) * tile - r - 0.01;
  } else if (dy < 0) {
    y = Math.floor((ny - r) / tile) * tile + tile + r + 0.01;
  }
  return { x, y };
}

/**
 * True line of sight between two points: no solid cell on the segment.
 * Samples along the segment and asks `solidAt` — cheap and good enough for
 * a 40px grid at the distances this game uses.
 */
export function hasLineOfSight(x1, y1, x2, y2, solidAt) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.ceil(d / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}
