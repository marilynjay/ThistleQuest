// Shared painting toolkit: canvases, noise textures, iso face transforms, boxes, limbs and vines.

import { project, rng, type Vec } from '../engine/iso';

export type Ctx = CanvasRenderingContext2D;
export type V3 = [number, number, number];

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c: string, a: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mix two hex colors. t=0 -> a, t=1 -> b. */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

export function shade(c: string, amt: number): string {
  return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt);
}

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

/** Tileable value noise with a few octaves, values in [0, 1]. */
export function valueNoise(size: number, seed: number, octaves = 4): Float32Array {
  const out = new Float32Array(size * size);
  const r = rng(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = 4 << o;
    const grid = new Float32Array(cells * cells).map(() => r());
    const cs = size / cells;
    for (let y = 0; y < size; y++) {
      const gy = y / cs;
      const y0 = Math.floor(gy) % cells;
      const y1 = (y0 + 1) % cells;
      const ty = smooth(gy - Math.floor(gy));
      for (let x = 0; x < size; x++) {
        const gx = x / cs;
        const x0 = Math.floor(gx) % cells;
        const x1 = (x0 + 1) % cells;
        const tx = smooth(gx - Math.floor(gx));
        const a = grid[y0 * cells + x0] + (grid[y0 * cells + x1] - grid[y0 * cells + x0]) * tx;
        const b = grid[y1 * cells + x0] + (grid[y1 * cells + x1] - grid[y1 * cells + x0]) * tx;
        out[y * size + x] += (a + (b - a) * ty) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/** A grey "paper/brush" texture used as an overlay to give flat fills a painted feel. */
let grainCanvas: HTMLCanvasElement | null = null;
export function grain(): HTMLCanvasElement {
  if (grainCanvas) return grainCanvas;
  const size = 256;
  const n = valueNoise(size, 7, 5);
  const r = rng(99);
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round((n[i] * 0.7 + r() * 0.3) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainCanvas = c;
  return c;
}

/** Overlay the painted grain on whatever was just drawn inside the current clip/path. */
export function applyGrain(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.18, mode: GlobalCompositeOperation = 'overlay') {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.fillStyle = ctx.createPattern(grain(), 'repeat')!;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Iso geometry
// ---------------------------------------------------------------------------

/** Projector relative to an anchor point, so props can be painted into their own canvases. */
export function projector(ax: number, ay: number, ox: number, oy: number) {
  const base = project(ax, ay, 0);
  return (x: number, y: number, z = 0): Vec => {
    const p = project(x, y, z);
    return { x: p.x - base.x + ox, y: p.y - base.y + oy };
  };
}

export type Proj = ReturnType<typeof projector>;

/**
 * Map a flat 2D drawing onto an iso surface. Inside `fn`, (u, v) local units map to
 * origin + u * uAxis + v * vAxis in world space. Use 100 local units per world unit for comfort.
 */
export function onFace(ctx: Ctx, P: Proj, origin: V3, uAxis: V3, vAxis: V3, fn: () => void) {
  const o = P(origin[0], origin[1], origin[2]);
  const u = P(origin[0] + uAxis[0] / 100, origin[1] + uAxis[1] / 100, origin[2] + uAxis[2] / 100);
  const v = P(origin[0] + vAxis[0] / 100, origin[1] + vAxis[1] / 100, origin[2] + vAxis[2] / 100);
  ctx.save();
  ctx.transform(u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y, o.x, o.y);
  fn();
  ctx.restore();
}

/** Faces of an axis-aligned box visible to the camera: the +y side (left), +x side (right), and top. */
export const FACE = {
  /** plane y = y1, u runs along +x, v runs downward. */
  left: (x0: number, y1: number, z1: number): [V3, V3, V3] => [[x0, y1, z1], [1, 0, 0], [0, 0, -1]],
  /** plane x = x1, u runs along +y, v runs downward. */
  right: (x1: number, y0: number, z1: number): [V3, V3, V3] => [[x1, y0, z1], [0, 1, 0], [0, 0, -1]],
  /** plane z = z1, u along +x, v along +y. */
  top: (x0: number, y0: number, z1: number): [V3, V3, V3] => [[x0, y0, z1], [1, 0, 0], [0, 1, 0]],
};

export interface BoxStyle {
  top: string | CanvasGradient;
  left: string | CanvasGradient;
  right: string | CanvasGradient;
  edge?: string;
  grain?: number;
}

export function poly(ctx: Ctx, pts: Vec[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

/** Draw a solid iso box from (x0,y0,z0) to (x1,y1,z1). */
export function box(ctx: Ctx, P: Proj, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, st: BoxStyle) {
  const left = [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)];
  const right = [P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)];
  const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  for (const [pts, fill] of [[left, st.left], [right, st.right], [top, st.top]] as const) {
    poly(ctx, pts);
    ctx.fillStyle = fill;
    ctx.fill();
    if (st.grain) {
      ctx.save();
      ctx.clip();
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      applyGrain(ctx, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), st.grain);
      ctx.restore();
    }
  }
  if (st.edge) {
    ctx.strokeStyle = st.edge;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    poly(ctx, [P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)]);
    ctx.stroke();
    ctx.beginPath();
    const a = P(x1, y1, z1);
    ctx.moveTo(a.x, a.y);
    const b = P(x1, y1, z0);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(a.x, a.y);
    const c = P(x0, y1, z1);
    ctx.lineTo(c.x, c.y);
    ctx.moveTo(a.x, a.y);
    const d = P(x1, y0, z1);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
}

/** Soft elliptical contact shadow on the ground. */
export function groundShadow(ctx: Ctx, x: number, y: number, rx: number, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(12,8,20,${alpha})`);
  g.addColorStop(0.6, `rgba(12,8,20,${alpha * 0.6})`);
  g.addColorStop(1, 'rgba(12,8,20,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.5);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Organic shapes
// ---------------------------------------------------------------------------

/** Tapered capsule between a and b with radii ra and rb, shaded across its width. */
export function limb(ctx: Ctx, a: Vec, b: Vec, ra: number, rb: number, color: string, outline = 'rgba(20,14,24,0.55)') {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / len;
  const ny = dx / len;
  const ang = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.arc(a.x, a.y, ra, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(b.x, b.y, rb, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  // light from the upper-left
  const side = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1;
  const r = Math.max(ra, rb);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const g = ctx.createLinearGradient(mx + nx * r * side, my + ny * r * side, mx - nx * r * side, my - ny * r * side);
  g.addColorStop(0, shade(color, 0.28));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Sphere-ish ellipse with a highlight. */
export function orb(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, outline: string | null = 'rgba(20,14,24,0.55)') {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.5));
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Radial glow, additive. */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.4, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** A flickering candle/torch flame. */
export function flame(ctx: Ctx, x: number, y: number, h: number, t: number, seed = 0) {
  const flick = Math.sin(t * 13 + seed * 7) * 0.15 + Math.sin(t * 23 + seed * 3) * 0.1;
  const w = h * 0.38;
  const tipX = x + flick * w;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - h * 0.3, 0, x, y - h * 0.3, h);
  g.addColorStop(0, 'rgba(255,240,190,0.95)');
  g.addColorStop(0.35, 'rgba(255,170,60,0.8)');
  g.addColorStop(1, 'rgba(200,60,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w, y - h * 0.5, tipX, y - h * (1 + flick * 0.3));
  ctx.quadraticCurveTo(x + w, y - h * 0.5, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Thorny vines: the signature ornament of Thistle's UI
// ---------------------------------------------------------------------------

export interface VineOpts {
  width?: number;
  color?: string;
  thorns?: number; // thorns per 100px
  seed?: number;
}

/** Stroke a thorny vine along a cubic bezier. */
export function vine(ctx: Ctx, p0: Vec, c1: Vec, c2: Vec, p1: Vec, o: VineOpts = {}) {
  const w = o.width ?? 5;
  const color = o.color ?? '#6b6a2a';
  const r = rng(o.seed ?? 1);
  const bez = (t: number): Vec => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
    };
  };
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 20; i++) {
    const p = bez(i / 20);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  // thorns first so the stem overlaps their bases
  const n = Math.max(1, Math.round((len / 100) * (o.thorns ?? 6)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.3 + r() * 0.4) / n;
    const a = bez(t);
    const b = bez(Math.min(1, t + 0.01));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const side = i % 2 ? 1 : -1;
    const nx = (-dy / l) * side;
    const ny = (dx / l) * side;
    const tw = w * (1 - t * 0.5);
    const tl = tw * (1.6 + r() * 0.8);
    ctx.beginPath();
    ctx.moveTo(a.x - (dx / l) * tw * 0.7, a.y - (dy / l) * tw * 0.7);
    ctx.quadraticCurveTo(a.x + nx * tl * 0.6, a.y + ny * tl * 0.6, a.x + nx * tl + (dx / l) * tl * 0.5, a.y + ny * tl + (dy / l) * tl * 0.5);
    ctx.lineTo(a.x + (dx / l) * tw * 0.7, a.y + (dy / l) * tw * 0.7);
    ctx.closePath();
    ctx.fillStyle = shade(color, -0.25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,8,0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // stem: dark outline, body, highlight
  const stroke = (width: number, style: string) => {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  stroke(w + 2, 'rgba(18,20,6,0.85)');
  stroke(w, color);
  ctx.save();
  ctx.translate(-w * 0.18, -w * 0.22);
  stroke(Math.max(1, w * 0.35), shade(color, 0.35));
  ctx.restore();
}

/** A curling vine flourish that spirals inward, for panel corners. */
export function curl(ctx: Ctx, x: number, y: number, r: number, dir: number, o: VineOpts = {}) {
  const pts: Vec[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const a = dir * t * Math.PI * 1.6;
    const rr = r * (1 - t * 0.7);
    pts.push({ x: x + Math.cos(a) * rr - r, y: y + Math.sin(a) * rr });
  }
  for (let i = 0; i + 3 < pts.length; i += 3) vine(ctx, pts[i], pts[i + 1], pts[i + 2], pts[i + 3], { ...o, width: (o.width ?? 5) * (1 - i * 0.12) });
}
