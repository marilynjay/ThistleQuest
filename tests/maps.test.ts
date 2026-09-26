import { describe, expect, it } from 'vitest';
import { buildMaps, isBlocked, type MapInfo } from '../src/game/world';
import { WEAPONS } from '../src/game/weapons';
import { RELICS } from '../src/game/relics';

function reachable(m: MapInfo, sx: number, sy: number) {
  const seen = new Set<number>();
  const q: [number, number][] = [[Math.floor(sx), Math.floor(sy)]];
  seen.add(q[0][1] * m.w + q[0][0]);
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = ny * m.w + nx;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(k)) continue;
      if (isBlocked(m, nx + 0.5, ny + 0.5)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return (x: number, y: number) => seen.has(y * m.w + x);
}

describe('maps', () => {
  const maps = buildMaps();

  it('has rectangular rows', () => {
    for (const m of Object.values(maps)) expect(m.ground.length).toBe(m.w * m.h);
  });

  it('spawns the player on open ground', () => {
    for (const m of Object.values(maps)) expect(isBlocked(m, m.spawnPoint.x, m.spawnPoint.y)).toBe(false);
  });

  it('lets the tower stairs be reached from the podium', () => {
    const t = maps.tower;
    const can = reachable(t, t.spawnPoint.x, t.spawnPoint.y);
    const stairs = t.ground.findIndex((g) => g === 'stairs');
    expect(can(stairs % t.w, Math.floor(stairs / t.w))).toBe(true);
  });

  it('can reach every pickup, spawn and exit in the valley', () => {
    const v = maps.valley;
    const can = reachable(v, v.spawnPoint.x, v.spawnPoint.y);
    for (const p of [...v.pickups, ...v.spawns, ...v.exits]) expect(can(p.x, p.y), `${p.x},${p.y}`).toBe(true);
  });

  it('only places real items', () => {
    for (const p of maps.valley.pickups) expect(p.item in WEAPONS || p.item in RELICS).toBe(true);
  });
});
