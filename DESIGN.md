# ThistleQuest: Design Notes

A living doc of the vision, so nothing gets lost between sessions.

## Pitch
Isometric pixel-art action roguelite, with combat that feels like Hades or Dead Cells. You play Thistle, the wizard's famulus: an androgynous young man with long green hair (a respectful nod to Link's green cap). When raiders storm the tower, the Wizard throws his artifact to Thistle before he's captured. The artifact lets Thistle respawn at the tower's podium.

**Goal:** defeat the raiders and rescue the Wizard. The Wizard, impressed, retires and leaves Thistle the tower.

## Pillars
1. **Skill first, types second.** A wrong-type weapon still works; the right one is just much better (2× damage plus stagger).
2. **Nothing is locked, just dangerous.** Paths are open from the start. Players learn which roads are survivable and work up to the harder ones.
3. **Always keep what you find.** Weapons and relics are permanent. Death only costs you your position.
4. **Rare delights.** Companions are rare and memorable.

## Systems

### Type chart
- Flame beats Frost, Frost beats Stone, Stone beats Storm, and Storm beats Flame.
- Radiant and Void are each strong against the other. Neutral is always 1×.
- Weak hits do 2× damage and a big stagger. Resisted hits do 0.5× with almost no knockback.

### Weapons
- Weapons are permanent once found. Four loadout slots are usable in a run, switched with 1-4 or the mouse wheel.
- *Planned:* an Armory in the tower to choose which four to bring once you own more than four.
- Weapon kinds so far: melee arc, bolt (projectile), and lunge. Ideas: a flail (wind-up spin), a bow (charge shot), a tome (placed traps).

### Relics (subtle permanent growth)
- Small bonuses found in the world, like +10% damage or +20 max HP.
- *Planned:* traversal relics that "unlock" areas that were never really locked:
  - **Emberward Charm**: immunity to scorched ground (the Ashen Road).
  - **Wisplight Lantern**: sight in the Mistfen.
  - **Frostcloak**: resist the cold on Frostpeak Pass.
  - **Miner's Candle**: light in the Old Mine.

### World
- Hub: the Wizard's Tower, with the respawn podium at its center.
- Thistledown Vale: a lush green valley with four roads out.

| Road | Hazard | Enemy types | Danger |
| --- | --- | --- | --- |
| Frostpeak Pass | cold (slows you, chips at HP) | Frost / Storm | medium |
| The Mistfen | low visibility | Void / Frost | medium-high |
| The Ashen Road | burning ground | Flame / Stone | high |
| The Old Mine | darkness, cave-ins | Stone / Void | low-medium |

- The maps are hand-made, so the layout is learnable. Encounters are rolled fresh each run.

### Companions (planned)
- One companion at a time. Each rare creature has a specific spawn spot with about a 1% chance per run.
- To keep it fair without making it feel less rare: a subtle "sign" (tracks, a sound) can hint that one is near, and a hidden pity counter slowly raises the odds.
- Once recruited, a companion lives in the tower. It goes back there when either of you dies, and you choose who comes along.

### Story beats (later)
- Opening cutscene: raiders attack, the Wizard throws the artifact to Thistle, and Thistle blacks out.
- Region bosses are raider lieutenants. Each one drops a clue to where the Wizard is being held.
- Finale: rescue the Wizard, who retires and hands Thistle the tower.

## Open questions
- Names: the Wizard, the artifact, the raiders' faction.
- Should Thistle have a signature neutral ability (the broom sweep that parries projectiles)?
- Currency or crafting, or keep it pure (weapons and relics only)?
- Audio direction.

## Roadmap
1. ~~Vertical slice: tower, valley, combat, types, relics, respawn, soft-gating demos.~~ Done.
2. First real region past the valley (probably the Old Mine as the "easy" road) with a mini-boss.
3. Armory in the tower, plus traversal relics.
4. Companion system, starting with one creature.
5. Sound and music, the intro cutscene, and controller support.
