# Gobble Dash — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/giber76/turkey-run-game-entry/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/giber76/turkey-run-game-entry/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A make.fun bounty entry for **turkey-run-game-01**: the best turkey escape game. See the bounty at https://make.fun/bounty/turkey-run-game-01.

Thanksgiving is coming and the farmer is coming faster. You are the turkey.
Run 1200 m from the farm to the forest gate while the farmer chases you from
behind, jumping hay bales, fences, roaring ovens and stuck carving knives,
sliding under flying carving knives, and eating corn to keep the farmer back.

## How to play

- **Space / W / ↑ / click** — jump (press twice: double jump)
- **S / ↓** — slide under flying carving knives (hold to keep sliding)
- **P** — pause, **M** — mute, **R** — restart after a run
- Eat **corn** to push the farmer back, grab a **golden feather** to smash
  through anything for 3 s, and find a rare slice of **pumpkin pie** for an
  extra life. Reach the forest gate at 1200 m and you escape; lose all 3
  lives or let the farmer catch you and you are Thanksgiving dinner.

## Play it

```sh
node serve.ts   # then open http://localhost:8080
```

Static files only — `game/index.html` opens in desktop Chrome with no
network request. All art is drawn in code on canvas and all sound is
synthesized with the Web Audio API; nothing is loaded from outside the repo.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number in one place
- `game/src/world.js` — the simulation: running, jumping, the farmer's gap,
  spawning, collisions, scoring
- `game/src/render.js` — all the drawing: farm, turkey, farmer, oven, knives,
  HUD, title and end screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized gobbles, jumps, pickups and fanfares
- `game/src/shots.js` — the screenshot scenes and the autopilot that plays
  them, so each shot is a real frame of a real run
- `game/src/random.js` — seeded random, so a shot's seed always replays
- `game/src/main.js` — the loop, screens, and `?shot=` staging
- `screenshots/` — 1-start, 2-play, 3-action, 4-end, real renders of the game
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
