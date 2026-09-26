// Isometric projection helpers.
// World space is measured in tiles: +x runs down-right on screen, +y runs down-left.

export const TILE_W = 32;
export const TILE_H = 16;
const HW = TILE_W / 2;
const HH = TILE_H / 2;

export interface Vec {
  x: number;
  y: number;
}

/** World (tile units) -> screen pixels, relative to the world origin. `z` lifts upward in pixels. */
export function worldToScreen(x: number, y: number, z = 0): Vec {
  return { x: (x - y) * HW, y: (x + y) * HH - z };
}

/** Screen pixels (relative to world origin) -> world tile units on the ground plane. */
export function screenToWorld(sx: number, sy: number): Vec {
  return { x: (sx / HW + sy / HH) / 2, y: (sy / HH - sx / HW) / 2 };
}

/** Painter's-algorithm sort key: things further down-screen draw later. */
export function depthOf(x: number, y: number): number {
  return x + y;
}

export function len(x: number, y: number): number {
  return Math.hypot(x, y);
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
