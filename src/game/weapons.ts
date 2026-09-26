import type { Element } from './elements';

export type WeaponKind = 'melee' | 'bolt' | 'lunge';

export interface WeaponDef {
  id: string;
  name: string;
  element: Element;
  kind: WeaponKind;
  damage: number;
  cooldown: number; // seconds between attacks
  range: number; // tiles (melee reach, bolt travel distance, lunge distance)
  arc: number; // radians, melee only
  knockback: number;
  blurb: string;
}

export const WEAPONS: Record<string, WeaponDef> = {
  broom: {
    id: 'broom',
    name: 'Trusty Broom',
    element: 'neutral',
    kind: 'melee',
    damage: 7,
    cooldown: 0.32,
    range: 1.35,
    arc: 1.9,
    knockback: 3,
    blurb: 'It has swept a thousand floors. It will sweep a thousand foes.',
  },
  emberbrand: {
    id: 'emberbrand',
    name: 'Emberbrand',
    element: 'flame',
    kind: 'melee',
    damage: 11,
    cooldown: 0.42,
    range: 1.55,
    arc: 2.2,
    knockback: 4,
    blurb: 'A short sword that never quite stops smoldering.',
  },
  rimeshard: {
    id: 'rimeshard',
    name: 'Rimeshard Wand',
    element: 'frost',
    kind: 'bolt',
    damage: 8,
    cooldown: 0.28,
    range: 7,
    arc: 0,
    knockback: 2,
    blurb: 'Flings splinters of never-melting ice.',
  },
  thunderpike: {
    id: 'thunderpike',
    name: 'Thunderpike',
    element: 'storm',
    kind: 'lunge',
    damage: 14,
    cooldown: 0.75,
    range: 2.8,
    arc: 0,
    knockback: 6,
    blurb: 'Lunge forward on a crack of thunder, skewering all in your path.',
  },
};

export const STARTING_WEAPON = 'broom';
export const LOADOUT_SLOTS = 4;
