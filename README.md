# ThistleQuest

An isometric, pixel-art action roguelite. You play **Thistle**, the wizard's famulus (his humble assistant and janitor), who inherits a powerful artifact when raiders storm the tower. Now Thistle can't stay dead, and it's up to him to rescue the Wizard.

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
| H | Toggle help |
| F9 twice | Erase your save |

## What's in this first slice

- **The Wizard's Tower**: the high chamber with the podium. You respawn here, and resting by the podium heals you. The stairs lead down.
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

## Project layout

```
src/engine/     iso math, input, pixel sprites, 3x5 bitmap font
src/game/
  mapData.ts    hand-editable ASCII maps (legend at the top)
  world.ts      map parsing, collision, road metadata
  elements.ts   the type chart
  weapons.ts    weapon definitions
  enemyDefs.ts  enemy definitions
  relics.ts     permanent upgrades
  art.ts        all pixel art (character sprites as text grids, props painted in code)
  tiles.ts      ground pre-rendering and isometric blocks
  game.ts       game state, combat, AI, transitions
  render.ts     depth-sorted drawing, lighting, HUD
tests/          type chart, projection, map reachability
```

Tuning is mostly data. To add a weapon, add an entry to `WEAPONS`, draw an icon in `art.ts`, and put a pickup marker in `mapData.ts`.

See [DESIGN.md](DESIGN.md) for the full vision and roadmap.
