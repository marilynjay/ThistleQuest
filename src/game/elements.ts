// The type chart. Four elements form a cycle, plus a Radiant/Void rivalry:
//   Flame > Frost   (melts it)
//   Frost > Stone   (freeze-thaw cracks it)
//   Stone > Storm   (grounds the lightning)
//   Storm > Flame   (the rain douses it)
//   Radiant <-> Void (each is strong against the other)
// Neutral weapons (like Thistle's broom) hit everything for normal damage.

export type Element = 'neutral' | 'flame' | 'frost' | 'storm' | 'stone' | 'radiant' | 'void';

export const ELEMENT_INFO: Record<Element, { name: string; color: string; dark: string }> = {
  neutral: { name: 'Neutral', color: '#d8cfbd', dark: '#6d6558' },
  flame: { name: 'Flame', color: '#ff8a3d', dark: '#9a3412' },
  frost: { name: 'Frost', color: '#8ee3ff', dark: '#1e6a8a' },
  storm: { name: 'Storm', color: '#ffe066', dark: '#8a6d10' },
  stone: { name: 'Stone', color: '#c19a6b', dark: '#5c4128' },
  radiant: { name: 'Radiant', color: '#fff6d6', dark: '#b39b52' },
  void: { name: 'Void', color: '#b07cff', dark: '#3d1f73' },
};

const BEATS: Partial<Record<Element, Element[]>> = {
  flame: ['frost'],
  frost: ['stone'],
  stone: ['storm'],
  storm: ['flame'],
  radiant: ['void'],
  void: ['radiant'],
};

export const WEAK_MULT = 2;
export const RESIST_MULT = 0.5;

export type Effectiveness = 'weak' | 'resist' | 'normal';

export function effectiveness(attack: Element, defend: Element): Effectiveness {
  if (BEATS[attack]?.includes(defend)) return 'weak';
  // Radiant and Void beat each other, so being "beaten back" only counts outside that pair.
  if (BEATS[defend]?.includes(attack) && !BEATS[attack]?.includes(defend)) return 'resist';
  return 'normal';
}

export function multiplier(e: Effectiveness): number {
  return e === 'weak' ? WEAK_MULT : e === 'resist' ? RESIST_MULT : 1;
}

/** What element should you bring against this defender? */
export function weaknessesOf(defend: Element): Element[] {
  return (Object.keys(BEATS) as Element[]).filter((a) => BEATS[a]!.includes(defend));
}
