// Isometric (2:1 dimetric) projection helpers.
// World space is measured in tiles: +x runs down-right on screen, +y runs down-left, +z is up.

export const TILE_W = 96;
export const TILE_H = 48;
export const HW = TILE_W / 2;
export const HH = TILE_H / 2;
/** Screen pixels per world unit of height. 2:1 dimetric has a ~30 degree camera elevation. */
export const ZS = Math.hypot(HW, HH) * Math.cos(Math.PI / 6);

export interface Vec {
  x: number;
  y: number;
}

/** World (tile units) -> screen pixels, relative to the world origin. `z` is height in world units. */
export function project(x: number, y: number, z = 0): Vec {
  return { x: (x - y) * HW, y: (x + y) * HH - z * ZS };
}

/** Back-compat helper: z given in screen pixels. */
export function worldToScreen(x: number, y: number, zPx = 0): Vec {
  return { x: (x - y) * HW, y: (x + y) * HH - zPx };
}

/** Screen pixels (relative to world origin) -> world tile units on the ground plane. */
export function screenToWorld(sx: number, sy: number): Vec {
  return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 };
}

/** Painter's-algorithm sort key: things further down-screen draw later. */
export function depthOf(x: number, y: number): number {
  return x + y;
}

export function norm(x: number, y: number): Vec {
  const l = Math.hypot(x, y);
  return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** Small deterministic hash in [0, 1), handy for variation that never flickers. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Seeded PRNG (mulberry32) for procedural art that must look the same every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
