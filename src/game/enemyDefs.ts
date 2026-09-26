import type { Element } from './elements';

export type Behavior = 'chase' | 'charge' | 'ranged';

export interface EnemyDef {
  id: string;
  name: string;
  element: Element;
  hp: number;
  speed: number; // tiles per second
  radius: number;
  contactDamage: number;
  behavior: Behavior;
  aggroRange: number;
  sprite: string;
  float?: number; // hover height in pixels
}

export const ENEMIES: Record<string, EnemyDef> = {
  frostwisp: {
    id: 'frostwisp',
    name: 'Frost Wisp',
    element: 'frost',
    hp: 26,
    speed: 2.3,
    radius: 0.3,
    contactDamage: 9,
    behavior: 'chase',
    aggroRange: 6.5,
    sprite: 'wisp',
    float: 6,
  },
  beetle: {
    id: 'beetle',
    name: 'Boulder Beetle',
    element: 'stone',
    hp: 55,
    speed: 1.3,
    radius: 0.4,
    contactDamage: 16,
    behavior: 'charge',
    aggroRange: 7,
    sprite: 'beetle',
  },
  imp: {
    id: 'imp',
    name: 'Cinder Imp',
    element: 'flame',
    hp: 32,
    speed: 1.9,
    radius: 0.3,
    contactDamage: 8,
    behavior: 'ranged',
    aggroRange: 8,
    sprite: 'imp',
  },
};
