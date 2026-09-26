// Relics are permanent, subtle upgrades. Once found they stay with Thistle forever.

export interface RelicDef {
  id: string;
  name: string;
  blurb: string;
  damageBonus?: number; // additive fraction, e.g. 0.1 = +10% damage with every weapon
  maxHpBonus?: number;
  color: string;
}

export const RELICS: Record<string, RelicDef> = {
  whetstone: {
    id: 'whetstone',
    name: 'Whetstone of Ages',
    blurb: 'All weapons deal 10% more damage.',
    damageBonus: 0.1,
    color: '#9fb4c7',
  },
  acorn: {
    id: 'acorn',
    name: 'Heartroot Acorn',
    blurb: 'Your maximum health grows by 20.',
    maxHpBonus: 20,
    color: '#c9864a',
  },
};

export function relicStats(owned: string[]) {
  let damageMult = 1;
  let maxHp = 100;
  for (const id of owned) {
    const r = RELICS[id];
    if (!r) continue;
    damageMult += r.damageBonus ?? 0;
    maxHp += r.maxHpBonus ?? 0;
  }
  return { damageMult, maxHp };
}
