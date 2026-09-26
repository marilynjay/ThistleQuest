// A painted scene: a cached background, depth-sorted sprites, lights and animated overlays.

import { project } from '../engine/iso';
import { makeCanvas, projector, type Ctx, type Proj } from './kit';

export const CACHE_SCALE = 2;

export interface SceneSprite {
  canvas: HTMLCanvasElement;
  ox: number; // anchor position inside the canvas (logical px)
  oy: number;
  scale: number;
  x: number; // anchor in world space
  y: number;
  depth: number;
  /** Fade out when this sprite hides Thistle. */
  fades?: boolean;
  anim?: (ctx: Ctx, S: Proj, t: number) => void;
}

export interface Light {
  x: number;
  y: number;
  z: number;
  r: number; // radius in screen px
  color: string;
  i: number; // intensity 0..1
  flicker?: number;
}

export interface Scene {
  bg: { canvas: HTMLCanvasElement; ox: number; oy: number; scale: number };
  sprites: SceneSprite[];
  lights: Light[];
  /** Ambient light color for the multiply pass; null = fully lit (daylight). */
  ambient: string | null;
  backdrop: (ctx: Ctx, t: number) => void;
  /** Animated things on the floor/walls, drawn right after the background. */
  under?: (ctx: Ctx, S: Proj, t: number) => void;
  /** Additive effects drawn after lighting (god rays, dust). */
  over?: (ctx: Ctx, S: Proj, t: number) => void;
}

/** Bounding box (logical px, relative to the anchor) of an iso box. */
function bounds(ax: number, ay: number, b: [number, number, number, number, number, number]) {
  const base = project(ax, ay, 0);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const x of [b[0], b[3]])
    for (const y of [b[1], b[4]])
      for (const z of [b[2], b[5]]) {
        const p = project(x, y, z);
        minX = Math.min(minX, p.x - base.x);
        maxX = Math.max(maxX, p.x - base.x);
        minY = Math.min(minY, p.y - base.y);
        maxY = Math.max(maxY, p.y - base.y);
      }
  return { minX, minY, maxX, maxY };
}

/**
 * Paint something into its own cached canvas.
 * `b` is a generous world-space bounding box [x0,y0,z0,x1,y1,z1]; `margin` adds screen px around it.
 */
export function bake(
  ax: number,
  ay: number,
  b: [number, number, number, number, number, number],
  paint: (ctx: Ctx, P: Proj) => void,
  margin = 30,
  scale = CACHE_SCALE,
) {
  const bb = bounds(ax, ay, b);
  const w = bb.maxX - bb.minX + margin * 2;
  const h = bb.maxY - bb.minY + margin * 2;
  const canvas = makeCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  const ox = -bb.minX + margin;
  const oy = -bb.minY + margin;
  paint(ctx, projector(ax, ay, ox, oy));
  return { canvas, ox, oy, scale };
}

export function sprite(
  ax: number,
  ay: number,
  b: [number, number, number, number, number, number],
  paint: (ctx: Ctx, P: Proj) => void,
  opts: { depth?: number; fades?: boolean; anim?: SceneSprite['anim']; margin?: number } = {},
): SceneSprite {
  const baked = bake(ax, ay, b, paint, opts.margin ?? 30);
  return { ...baked, x: ax, y: ay, depth: opts.depth ?? ax + ay, fades: opts.fades, anim: opts.anim };
}
