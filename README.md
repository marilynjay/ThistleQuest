# ThistleQuest

An isometric, painterly action roguelite, drawn entirely in code (no image assets). You play **Thistle**, the wizard's famulus (his humble assistant and janitor), who inherits a powerful artifact when raiders storm the tower. Now Thistle can't stay dead, and it's up to him to rescue the Wizard.

## Play it

```bash
npm install
npm run dev      # then open http://localhost:5173
```

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Aim |
| Left click (hold) | Attack |
| Space / Shift / right click | Dodge (brief invulnerability) |
| 1-4, mouse wheel, Q | Switch weapon |
| E | Pick up weapons and relics |
| Tab / I | Armory: choose your four quick-slot weapons, review relics and the type chart |
| H | Toggle help |
| F9 twice | Erase your save |

## What's in this first slice

- **The Wizard's Tower**: a candlelit study with Gothic windows, a fireplace, bookshelves, an alchemy cabinet and the Wizard's desk. You respawn on the stepped dais at its center, and resting there heals you. The golden arched door leads down.
- **Thistledown Vale**: a hand-built valley with four roads leading away (Frostpeak Pass, the Mistfen, the Ashen Road, the Old Mine). Each road is signposted but not built yet.
- **Real-time combat**: melee arcs, projectiles, and a dashing lunge; dodging with i-frames; hit-stop, screen shake, and knockback.
- **Type matchups**:
  - Flame beats Frost, Frost beats Stone, Stone beats Storm, and Storm beats Flame. Radiant and Void are each strong against the other.
  - A weak hit does 2× damage and staggers the enemy. A resisted hit does half damage.
  - Hover the mouse over an enemy to see its weakness.
- **Weapons**: Trusty Broom (neutral), Emberbrand (flame sword), Rimeshard Wand (frost bolts), and Thunderpike (storm lunge).
- **Enemies**: Frost Wisps (swarm and chase), Boulder Beetles (telegraphed charges that daze them if they hit a wall), and Cinder Imps (keep their distance and throw fireballs).
- **Permanent progress**: weapons and relics are never lost. Relics include the Whetstone of Ages (+10% damage) and the Heartroot Acorn (+20 max HP). Progress is saved in browser storage.
- **Soft gating**: the Mistfen swallows your vision, and the Ashen Road burns you as you walk. Nothing is locked; it's just dangerous.
- **Runs**: dying sends you back to the podium with everything you found, and each run rerolls the valley's encounters.

## How the art works

Everything is painted procedurally with Canvas2D at full resolution:

- **Surfaces** (walls, floors, shelves, the fireplace) are drawn as flat 2D art and mapped onto isometric planes with a transform, so windows, books and stones stay detailed without being drawn skewed by hand. Static pieces are baked once into cached sprites.
- **Thistle** is a puppet: a small 3D skeleton is posed each frame (walk cycle, swings, dodges, hair sway), projected into the iso view, and painted part by part. He can face any direction without sprite sheets.
- **Lighting** is a lightmap: ambient darkness plus colored lights (fire, candles, the dais, moonlight), multiplied over the scene.
- **The valley ground** is painted per pixel from smoothed terrain fields, so riverbanks and paths come out organic rather than tiled.

## Project layout

```
src/engine/     iso projection, input
src/paint/      all the art: kit (shared tools), props, room (tower), outdoor (valley),
                thistle (character rig), creatures, weaponArt, ui (panels, vines), inventory (Armory)
src/game/
  mapData.ts    hand-editable ASCII maps (legend at the top)
  world.ts      map parsing, collision, road metadata
  elements.ts   the type chart
  weapons.ts / enemyDefs.ts / relics.ts   data
  game.ts       game state, combat, AI, transitions
  render.ts     depth-sorted drawing, lighting, HUD
tests/          type chart, projection, map reachability
```

Tuning is mostly data. To add a weapon, add an entry to `WEAPONS`, paint it in `src/paint/weaponArt.ts`, and put a pickup marker in `mapData.ts`.

See [DESIGN.md](DESIGN.md) for the full vision and roadmap.
