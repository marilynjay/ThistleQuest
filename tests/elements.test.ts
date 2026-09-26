import { describe, expect, it } from 'vitest';
import { effectiveness, multiplier, weaknessesOf, type Element } from '../src/game/elements';

describe('type chart', () => {
  it('follows the Flame > Frost > Stone > Storm > Flame cycle', () => {
    const cycle: Element[] = ['flame', 'frost', 'stone', 'storm'];
    cycle.forEach((a, i) => {
      const b = cycle[(i + 1) % cycle.length];
      expect(effectiveness(a, b)).toBe('weak');
      expect(effectiveness(b, a)).toBe('resist');
    });
  });

  it('makes Radiant and Void strong against each other', () => {
    expect(effectiveness('radiant', 'void')).toBe('weak');
    expect(effectiveness('void', 'radiant')).toBe('weak');
  });

  it('treats neutral as neutral', () => {
    for (const e of ['flame', 'frost', 'storm', 'stone', 'radiant', 'void'] as Element[]) {
      expect(effectiveness('neutral', e)).toBe('normal');
      expect(effectiveness(e, 'neutral')).toBe('normal');
    }
  });

  it('scales damage', () => {
    expect(multiplier('weak')).toBe(2);
    expect(multiplier('resist')).toBe(0.5);
    expect(multiplier('normal')).toBe(1);
  });

  it('reports weaknesses', () => {
    expect(weaknessesOf('frost')).toEqual(['flame']);
    expect(weaknessesOf('flame')).toEqual(['storm']);
  });
});
