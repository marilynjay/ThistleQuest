import { TOWER_TOP, VALLEY } from './mapData';

export type Ground =
  | 'void' | 'grass' | 'flowers' | 'path' | 'water' | 'bridge' | 'marsh' | 'ash' | 'ashpath'
  | 'stone' | 'rug' | 'stairs' | 'door' | 'exit';

export type Solid = 'tree' | 'rock' | 'towerwall' | 'wall' | 'furniture' | 'signpost';

export type SpawnKind = 'w' | 'b' | 'i' | 'e';

export interface Marker {
  x: number;
  y: number;
}

export interface MapInfo {
  id: MapId;
  name: string;
  w: number;
  h: number;
  ground: Ground[];
  solid: (Solid | null)[];
  pickups: (Marker & { item: string })[];
  spawns: (Marker & { kind: SpawnKind })[];
  signs: Marker[];
  spawnPoint: Marker; // where Thistle appears when arriving/respawning
  exits: Marker[];
}

export type MapId = 'tower' | 'valley';

const GROUND: Record<string, Ground> = {
  '.': 'grass', ',': 'flowers', '=': 'path', '~': 'water', '%': 'bridge', m: 'marsh', h: 'ash', H: 'ashpath',
  _: 'stone', o: 'rug', S: 'stairs', D: 'door', X: 'exit', ' ': 'void',
};

const SOLID: Record<string, Solid> = {
  T: 'tree', R: 'rock', W: 'towerwall', '#': 'wall', k: 'furniture', s: 'signpost',
};

const PICKUP: Record<string, string> = { '1': 'emberbrand', '2': 'rimeshard', '3': 'thunderpike', r: 'whetstone', a: 'acorn' };

export function parseMap(id: MapId, name: string, rows: string[], floor: Ground): MapInfo {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const ground: Ground[] = new Array(w * h).fill('void');
  const solid: (Solid | null)[] = new Array(w * h).fill(null);
  const info: MapInfo = { id, name, w, h, ground, solid, pickups: [], spawns: [], signs: [], spawnPoint: { x: 1, y: 1 }, exits: [] };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? ' ';
      const i = y * w + x;
      if (ch in GROUND) ground[i] = GROUND[ch];
      else ground[i] = floor;
      if (ch in SOLID) solid[i] = SOLID[ch];
      if (ch in PICKUP) info.pickups.push({ x, y, item: PICKUP[ch] });
      if ('wbie'.includes(ch)) info.spawns.push({ x, y, kind: ch as SpawnKind });
      if (ch === 's') info.signs.push({ x, y });
      if (ch === 'P') info.spawnPoint = { x: x + 0.5, y: y + 0.5 };
      if (ch === 'X') info.exits.push({ x, y });
      // Walls in the valley stand on grass; solids inside the tower stand on stone.
      if (ch in SOLID && ch !== 'W') ground[i] = floor;
      if (ch === 'W') ground[i] = 'stone';
    }
  }
  return info;
}

export function buildMaps(): Record<MapId, MapInfo> {
  const tower = parseMap('tower', "The Wizard's Tower", TOWER_TOP, 'stone');
  const valley = parseMap('valley', 'Thistledown Vale', VALLEY, 'grass');
  // Arriving in the valley from the stairs puts you just outside the tower door.
  const door = valley.ground.findIndex((g) => g === 'door');
  valley.spawnPoint = { x: (door % valley.w) + 1.5, y: Math.floor(door / valley.w) + 1.5 };
  return { tower, valley };
}

export function groundAt(m: MapInfo, x: number, y: number): Ground {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 'void';
  return m.ground[ty * m.w + tx];
}

export function solidAt(m: MapInfo, x: number, y: number): Solid | null {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return 'wall';
  return m.solid[ty * m.w + tx];
}

export function isBlocked(m: MapInfo, x: number, y: number): boolean {
  const g = groundAt(m, x, y);
  return g === 'void' || g === 'water' || solidAt(m, x, y) !== null;
}

/** Circle-vs-tile collision test using the four extreme points of the circle. */
export function collides(m: MapInfo, x: number, y: number, r: number): boolean {
  return (
    isBlocked(m, x - r, y) || isBlocked(m, x + r, y) || isBlocked(m, x, y - r) || isBlocked(m, x, y + r) ||
    isBlocked(m, x - r * 0.7, y - r * 0.7) || isBlocked(m, x + r * 0.7, y - r * 0.7) ||
    isBlocked(m, x - r * 0.7, y + r * 0.7) || isBlocked(m, x + r * 0.7, y + r * 0.7)
  );
}

// The four roads out of the valley. Each will lead to its own region; for now they are signposted.
export interface Road {
  name: string;
  warning: string;
  x: number;
  y: number;
}

export const ROADS: Road[] = [
  { name: 'Frostpeak Pass', warning: 'Bitter winds. Bring something warm.', x: 34, y: 0 },
  { name: 'The Mistfen', warning: 'Few who wander in can see their own hands.', x: 0, y: 27 },
  { name: 'The Ashen Road', warning: 'The ground itself still burns.', x: 14, y: 43 },
  { name: 'The Old Mine', warning: 'Something big has been digging.', x: 43, y: 34 },
];

export function nearestRoad(x: number, y: number): Road {
  let best = ROADS[0];
  let bd = Infinity;
  for (const r of ROADS) {
    const d = (r.x - x) ** 2 + (r.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return best;
}
