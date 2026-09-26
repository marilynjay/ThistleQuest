import { describe, expect, it } from 'vitest';
import { screenToWorld, worldToScreen } from '../src/engine/iso';

describe('isometric projection', () => {
  it('round-trips world -> screen -> world', () => {
    for (const [x, y] of [[0, 0], [3.5, 1.25], [10, 20], [-2, 7]]) {
      const s = worldToScreen(x, y);
      const w = screenToWorld(s.x, s.y);
      expect(w.x).toBeCloseTo(x);
      expect(w.y).toBeCloseTo(y);
    }
  });
});
