// guards.js — EMBERWATCH's watchmen: patrol, vision, suspicion and chase.
// A guard cycles PATROL -> (spots the keeper) -> CHASE -> (loses them) ->
// INVESTIGATE -> PATROL. Suspicion is a meter, not a switch: a glimpse only
// raises it, and breaking line of sight lets it fall again — the keeper
// always gets a chance to recover, which is what makes the game fair.

import { TAU, angleDiff, clamp, dist, hasLineOfSight, slideMove, turnToward } from './geometry.js';
import { TILE, blocksSightAt, walkableAt } from './levels.js';

export const GUARD_STATE = { PATROL: 'patrol', CHASE: 'chase', INVESTIGATE: 'investigate' };

/** Build a guard's live state from its level definition. */
export function makeGuard(def, levelIndex) {
  const first = def.waypoints[0];
  const second = def.waypoints[1] ?? first;
  return {
    name: def.name,
    x: first[0] * TILE + TILE / 2,
    y: first[1] * TILE + TILE / 2,
    facing: Math.atan2(second[1] - first[1], second[0] - first[0]),
    waypoints: def.waypoints.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 })),
    waypointIndex: 1,
    pause: def.pause,
    pauseLeft: 0,
    scanAngle: 0,
    scanDir: 1,
    speed: def.speed,
    range: def.range,
    halfAngle: def.halfAngle,
    state: GUARD_STATE.PATROL,
    suspicion: 0,
    lastSeen: null,
    loseTimer: 0,
    investigateTimer: 0,
    chaseSpeed: def.speed * 1.55,
    stepPhase: Math.random() * TAU,
    levelIndex,
  };
}

/** Can this guard see the keeper right now? Cone + line of sight + cover. */
export function guardSeesKeeper(guard, keeper, level) {
  const d = dist(guard.x, guard.y, keeper.x, keeper.y);
  if (d > guard.range) return false;
  const toKeeper = Math.atan2(keeper.y - guard.y, keeper.x - guard.x);
  if (Math.abs(angleDiff(guard.facing, toKeeper)) > guard.halfAngle) return false;
  // A keeper crouched in a bush is invisible unless the guard is right on top of them.
  if (keeper.hiddenInBush && d > 46) return false;
  const solidAt = (px, py) => blocksSightAt(level, px, py);
  return hasLineOfSight(guard.x, guard.y, keeper.x, keeper.y, solidAt);
}

/**
 * One tick of guard AI. `events` collects { type, guard, x, y } so the game
 * can play sounds and flashes: 'spotted' when suspicion first passes the
 * halfway mark, 'alarm' when it fills, 'lost' when a chase gives up.
 * Returns nothing; mutates the guard.
 */
export function updateGuard(guard, keeper, level, dt, events) {
  const sees = guardSeesKeeper(guard, keeper, level);
  const d = dist(guard.x, guard.y, keeper.x, keeper.y);

  // --- suspicion meter -------------------------------------------------
  if (sees) {
    // Closer and more central in the cone fills the meter faster; sneaking
    // buys time, standing in the open does not.
    const closeness = 1 - d / guard.range;
    const centrality = 1 - Math.abs(angleDiff(guard.facing, Math.atan2(keeper.y - guard.y, keeper.x - guard.x))) / guard.halfAngle;
    const rate = (keeper.sneaking ? 0.55 : 1.0) * (0.55 + 0.9 * closeness + 0.45 * centrality);
    const before = guard.suspicion;
    guard.suspicion = clamp(guard.suspicion + rate * dt, 0, 1);
    guard.lastSeen = { x: keeper.x, y: keeper.y };
    if (before < 0.5 && guard.suspicion >= 0.5) events.push({ type: 'spotted', guard, x: guard.x, y: guard.y });
    if (guard.suspicion >= 1 && guard.state !== GUARD_STATE.CHASE) {
      guard.state = GUARD_STATE.CHASE;
      guard.loseTimer = 0;
      events.push({ type: 'alarm', guard, x: guard.x, y: guard.y });
    }
  } else if (guard.state !== GUARD_STATE.CHASE) {
    guard.suspicion = clamp(guard.suspicion - 0.28 * dt, 0, 1);
  }

  // --- movement --------------------------------------------------------
  if (guard.state === GUARD_STATE.CHASE) {
    // Run at the last seen spot; keep chasing while the keeper is visible.
    const target = sees ? { x: keeper.x, y: keeper.y } : guard.lastSeen;
    if (target) {
      guard.facing = turnToward(guard.facing, Math.atan2(target.y - guard.y, target.x - guard.x), 5.5 * dt);
      moveToward(guard, target.x, target.y, guard.chaseSpeed, dt, level);
      guard.stepPhase += dt * 11;
    }
    if (!sees) {
      guard.loseTimer += dt;
      if (guard.loseTimer > 2.6) {
        guard.state = GUARD_STATE.INVESTIGATE;
        guard.investigateTimer = 0;
        events.push({ type: 'lost', guard, x: guard.x, y: guard.y });
      }
    } else {
      guard.loseTimer = 0;
    }
    return;
  }

  if (guard.state === GUARD_STATE.INVESTIGATE) {
    const target = guard.lastSeen;
    if (target && dist(guard.x, guard.y, target.x, target.y) > 14) {
      guard.facing = turnToward(guard.facing, Math.atan2(target.y - guard.y, target.x - guard.x), 4.5 * dt);
      moveToward(guard, target.x, target.y, guard.speed * 1.15, dt, level);
      guard.stepPhase += dt * 9;
      return;
    }
    // Arrived: look around for a while, then give up and go back to patrol.
    guard.investigateTimer += dt;
    guard.facing += guard.scanDir * 1.1 * dt;
    if (guard.investigateTimer > 0.9 && Math.abs(angleDiff(guard.facing, guard.scanAngle)) < 0.2) {
      guard.scanDir *= -1;
      guard.scanAngle = guard.facing + guard.scanDir * 1.2;
    }
    if (guard.investigateTimer > 3.2) {
      guard.state = GUARD_STATE.PATROL;
      guard.suspicion = 0;
      guard.lastSeen = null;
    }
    return;
  }

  // PATROL: walk the waypoints, pausing at each to scan the garden.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    // A slow sweep while standing still: the cone visibly turns.
    guard.facing += guard.scanDir * 0.55 * dt;
    if (Math.abs(angleDiff(guard.facing, guard.scanAngle)) > 0.9) guard.scanDir *= -1;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target.x, target.y, guard.speed, dt, level);
  guard.facing = turnToward(guard.facing, Math.atan2(target.y - guard.y, target.x - guard.x), 4.5 * dt);
  guard.stepPhase += dt * 8;
  if (arrived) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = guard.pause;
    guard.scanAngle = guard.facing;
    guard.scanDir = Math.random() < 0.5 ? -1 : 1;
  }
}

/** Walk toward (tx, ty) at `speed`, sliding along hedges; returns true when arrived (within 6px). */
function moveToward(guard, tx, ty, speed, dt, level) {
  const d = dist(guard.x, guard.y, tx, ty);
  if (d <= 6) return true;
  const step = Math.min(d, speed * dt);
  const moved = slideMove(
    guard.x, guard.y,
    ((tx - guard.x) / d) * step, ((ty - guard.y) / d) * step,
    (px, py) => walkableAt(level, px, py),
    12, TILE,
  );
  guard.x = moved.x;
  guard.y = moved.y;
  return d - step <= 6;
}

/**
 * The guard's visible vision cone as a polygon, for rendering: cast rays
 * across the cone and stop each at the first hedge, statue or bush.
 * Returns an array of [x, y] points starting at the guard's position.
 */
export function visionConePolygon(guard, level) {
  const rays = 26;
  const pts = [[guard.x, guard.y]];
  const solidAt = (px, py) => blocksSightAt(level, px, py);
  for (let i = 0; i <= rays; i++) {
    const a = guard.facing - guard.halfAngle + (2 * guard.halfAngle * i) / rays;
    const len = castVisionRay(guard.x, guard.y, a, guard.range, solidAt);
    pts.push([guard.x + Math.cos(a) * len, guard.y + Math.sin(a) * len]);
  }
  return pts;
}

function castVisionRay(x, y, angle, maxLen, solidAt) {
  const step = 5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let d = 0;
  while (d < maxLen) {
    if (solidAt(x + dx * (d + step), y + dy * (d + step))) return d;
    d += step;
  }
  return maxLen;
}
