[![best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/queenxaz/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/queenxaz/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# EMBERWATCH — a lantern-keeper's stealth game

Wren keeps the lanterns of a moonlit manor garden. Three gardens, three ember
keys in each, one gate each — and watchmen who patrol the lawns with lanterns
and long, watchful vision cones. Gather every key, then slip through the gate
unseen.

## Concept

A top-down 2D canvas stealth game, drawn and sounded entirely in code — no
images, no audio files, no network requests. The garden is a grid of hedges,
statues, bushes, ponds and flowerbeds under moonlight. Guards patrol fixed
routes, pause to sweep their cones, grow suspicious when they glimpse you,
chase when they are sure, and come to investigate a pebble's clatter. Bushes
hide you. Running is loud. Sneaking is a shadow.

## Mechanics

- **Vision cones** — every guard's cone is ray-cast against hedges, statues
  and bushes, so cover genuinely breaks sight. A cone that touches you fills
  a suspicion meter; a full meter raises the alarm.
- **Suspicion, not a switch** — a glimpse only raises the meter. Break line of
  sight and it falls again; lose a chase for a few seconds and the guard
  investigates your last seen spot, then goes back to patrol. You always get
  a chance to recover.
- **Hiding** — crouch in a bush and a guard will walk straight past unless
  they are right on top of you. A `HIDDEN` tag and the closing foliage say so.
- **Noise** — running feet carry. A guard in earshot turns toward the sound.
- **Pebbles** — toss one (click or `Q`) and every guard in earshot comes to
  look at where it landed. Limited per level.
- **Keys and the gate** — collect all three ember keys and the gate swings
  open, glowing green. Reach it to clear the garden.
- **Three levels** — Moonlit Garden (3 guards), Statue Court (4 guards), The
  Old Maze (5 guards), each harder, faster and further-seeing than the last.
- **Scoring** — 150 per key, a level bonus for speed, +200 for clearing a
  garden without ever being spotted. Three lanterns (lives); caught three
  times and the night is over. Finish all three gardens for a rank: GHOST,
  SHADOW or KEEPER.
- **Sound** — every sound is synthesized with WebAudio: footsteps, guard
  boots, pebble clatter, key chimes, the alarm sting, crickets, win and
  caught jingles. `M` mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sneak (slow, silent, harder to spot) |
| Click / Q | Toss a pebble toward the mouse |
| P / Esc | Pause |
| M | Mute |
| R | Restart the level |
| Enter | Start / continue |

## How to run

No build step, no install. Serve `game/` with any static server and open
`index.html` in desktop Chrome:

```
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly from the files (ES modules need a server
in some browsers; the command above is the reliable way).

## How it is built

- `game/index.html` — the page shell (1280×720 canvas).
- `game/src/main.js` — the game loop and state machine (title, playing,
  paused, level complete, caught, game over, victory).
- `game/src/levels.js` — the three gardens and their patrol routes.
- `game/src/guards.js` — patrol, vision cones, suspicion and chase AI.
- `game/src/player.js` — the keeper: movement, sneaking, hiding, pebbles.
- `game/src/render.js` — all drawing: garden, cones, keeper, HUD, screens.
- `game/src/audio.js` — synthesized WebAudio sounds, no audio files.
- `game/src/input.js` — keyboard and mouse.
- `game/src/geometry.js` — line-of-sight and ray-casting helpers.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the kit's library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Screenshots

`1-cover.jpg` — the garden at play, guards and cones sweeping the lawn.
`2-hide.jpg` — the keeper hidden in a bush as a guard's cone passes.
`3-exit.jpg` — all keys held, the gate open, the keeper almost home.
`4-alert.jpg` — the alarm raised, a guard in full chase.

All four are real renders of this game's own code, taken in a browser.
