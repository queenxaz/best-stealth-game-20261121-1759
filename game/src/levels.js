// levels.js — EMBERWATCH's three gardens. Each level is a 32 x 18 grid of
// 40px tiles (1280 x 720) plus the guards that patrol it.
//
// Grid letters:
//   #  hedge wall   — blocks movement and sight
//   S  statue       — blocks movement and sight
//   B  bush         — walkable hiding cover; blocks sight, hides the keeper
//   ~  pond         — blocks movement, not sight
//   .  lawn         — walkable
//   ,  flowerbed    — walkable decoration
//   K  ember key    — collect it
//   P  the keeper's start
//   E  the garden gate (exit; opens once every key is held)
//
// A guard is { waypoints: [[col,row], ...], pause: seconds at each stop,
// speed: px/s, range: vision range px, halfAngle: radians, name }.
// Waypoints must sit on walkable tiles; the guard walks straight lines
// between them, so keep neighbouring waypoints in open sight of each other.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

export const LEVELS = [
  {
    name: 'Moonlit Garden',
    intro: 'Three ember keys sleep in the garden. Gather them all, then slip through the gate unseen.',
    grid: [
      '################################',
      '#P....B................K.......#',
      '#..............................#',
      '#..###......B......###.........#',
      '#..#...........................#',
      '#..#....K.........S......B.....#',
      '#..#...........................#',
      '#..###......B......###.........#',
      '#..............................#',
      '#......####......####..........#',
      '#..............................#',
      '#..B........S........S.....B...#',
      '#..............................#',
      '#.....####......####...........#',
      '#..............................#',
      '#...........B........K.........#',
      '#.............................E#',
      '################################',
    ],
    guards: [
      { name: 'Bramble', waypoints: [[3, 2], [16, 2], [28, 2]], pause: 1.6, speed: 62, range: 190, halfAngle: 0.62 },
      { name: 'Thistle', waypoints: [[4, 10], [16, 10], [28, 10]], pause: 1.2, speed: 58, range: 180, halfAngle: 0.6 },
      { name: 'Sorrel', waypoints: [[5, 12], [16, 12], [27, 12]], pause: 1.4, speed: 60, range: 185, halfAngle: 0.6 },
    ],
    pebbles: 3,
    par: 75,
  },
  {
    name: 'Statue Court',
    intro: 'The old court keeps four watchmen now. The statues are your friends — their shadows swallow a lantern whole.',
    grid: [
      '################################',
      '#P....#..........B..........K..#',
      '#.....#........................#',
      '#.....#...S........S.....###...#',
      '#.....#.................#......#',
      '#.....#....####...###..#..B....#',
      '#.....#....#..........#........#',
      '#.B...#....#...K......#..###...#',
      '#.....#....#..........#........#',
      '#.....#....####...###..#.......#',
      '#.....#.................#......#',
      '#..####....###....###..####....#',
      '#..............................#',
      '#..S.......B.......S.......B...#',
      '#..............................#',
      '#.......####....####.....K.....#',
      '#........#..........#.........E#',
      '################################',
    ],
    guards: [
      { name: 'Bramble', waypoints: [[8, 2], [16, 2], [27, 2]], pause: 1.4, speed: 68, range: 195, halfAngle: 0.62 },
      { name: 'Thistle', waypoints: [[4, 12], [15, 12], [27, 12]], pause: 1.2, speed: 64, range: 185, halfAngle: 0.6 },
      { name: 'Sorrel', waypoints: [[5, 14], [15, 14], [26, 14]], pause: 1.3, speed: 66, range: 190, halfAngle: 0.6 },
      { name: 'Nettle', waypoints: [[9, 5], [9, 8], [9, 10]], pause: 1.5, speed: 66, range: 190, halfAngle: 0.6 },
    ],
    pebbles: 4,
    par: 95,
  },
  {
    name: 'The Old Maze',
    intro: 'Five watchmen, three keys, one way out. Move like moonlight — seen only where you choose to be.',
    grid: [
      '################################',
      '#P..#......#......B.....#....K.#',
      '#...#..B...#..####..#...#......#',
      '#...#......#......#..#..#......#',
      '#...#.####..S....#..#..#..#....#',
      '#...#.....#......#..#..#..#....#',
      '#.#######.#...####..#..#.......#',
      '#.......#.#........#..#..###...#',
      '#..B....#.#........#..#........#',
      '#.....K.#.#........#..###......#',
      '#..####.#.#...####.#.....#.....#',
      '#.....#.#.#......#..B....#.....#',
      '#.....#.#..#####.#####...#.....#',
      '#.....#.#......#.....#...#.....#',
      '#..#####.###...#..####...#.....#',
      '#......B.......#........K......#',
      '#..S........S.......B........E.#',
      '################################',
    ],
    guards: [
      { name: 'Bramble', waypoints: [[1, 3], [1, 8], [1, 14]], pause: 1.2, speed: 74, range: 200, halfAngle: 0.62 },
      { name: 'Thistle', waypoints: [[30, 2], [30, 9], [30, 13]], pause: 1.3, speed: 72, range: 195, halfAngle: 0.6 },
      { name: 'Sorrel', waypoints: [[5, 16], [10, 16]], pause: 1.4, speed: 72, range: 195, halfAngle: 0.62 },
      { name: 'Nettle', waypoints: [[28, 3], [28, 9], [28, 14]], pause: 1.2, speed: 76, range: 205, halfAngle: 0.64 },
      { name: 'Warden', waypoints: [[12, 8], [17, 8]], pause: 1.6, speed: 68, range: 210, halfAngle: 0.66 },
    ],
    pebbles: 4,
    par: 120,
  },
];

/** Parse one level grid into walls, bushes, ponds, statues, keys, start, exit. */
export function parseLevel(def) {
  const walls = [];
  const bushes = [];
  const ponds = [];
  const statues = [];
  const flowers = [];
  const keys = [];
  let start = { x: 60, y: 60 };
  let exit = { x: (COLS - 2) * TILE + TILE / 2, y: (ROWS - 2) * TILE + TILE / 2 };
  for (let r = 0; r < ROWS; r++) {
    const row = def.grid[r] ?? '';
    for (let c = 0; c < COLS; c++) {
      const ch = row[c] ?? '#';
      const x = c * TILE;
      const y = r * TILE;
      const cx = x + TILE / 2;
      const cy = y + TILE / 2;
      if (ch === '#') walls.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'S') statues.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'B') bushes.push({ x, y, w: TILE, h: TILE });
      else if (ch === '~') ponds.push({ x, y, w: TILE, h: TILE });
      else if (ch === ',') flowers.push({ x, y, w: TILE, h: TILE });
      else if (ch === 'K') keys.push({ x: cx, y: cy, taken: false });
      else if (ch === 'P') start = { x: cx, y: cy };
      else if (ch === 'E') exit = { x: cx, y: cy };
    }
  }
  return { walls, bushes, ponds, statues, flowers, keys, start, exit };
}

/** Walkable for the keeper and the guards: anything that is not a wall, statue or pond. */
export function walkableAt(level, px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  const ch = (level.grid[r] ?? '')[c] ?? '#';
  return ch !== '#' && ch !== 'S' && ch !== '~';
}

/** Blocks a guard's sight: hedges, statues and bushes. */
export function blocksSightAt(level, px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  const ch = (level.grid[r] ?? '')[c] ?? '#';
  return ch === '#' || ch === 'S' || ch === 'B';
}

/** Is the point inside a bush tile? */
export function inBushAt(level, px, py) {
  const c = Math.floor(px / TILE);
  const r = Math.floor(py / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  return (level.grid[r] ?? '')[c] === 'B';
}
