// UI painting: fonts, green-wood panels with thorny vines (after the original inventory mockup),
// bars, slots and text.

import { rng } from '../engine/iso';
import { applyGrain, curl, makeCanvas, rgba, shade, vine, type Ctx } from './kit';

export const FONT_TITLE = 'Cinzel, "Trajan Pro", Georgia, serif';
export const FONT_BODY = 'Alegreya, Georgia, serif';

export interface TextOpts {
  size?: number;
  font?: string;
  weight?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  shadow?: boolean;
  stroke?: string;
  alpha?: number;
}

export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? '400'} ${o.size ?? 16}px ${o.font ?? FONT_BODY}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, (o.size ?? 16) * 0.22);
    ctx.strokeStyle = o.stroke;
    ctx.strokeText(s, x, y);
  }
  if (o.shadow !== false) {
    ctx.fillStyle = 'rgba(8,6,12,0.75)';
    ctx.fillText(s, x + 1, y + 1.5);
  }
  ctx.fillStyle = o.color ?? '#f1ead8';
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function measure(ctx: Ctx, s: string, size = 16, font = FONT_BODY, weight = '400') {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

export function wrapText(ctx: Ctx, s: string, maxW: number, size = 16, font = FONT_BODY): string[] {
  const out: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (measure(ctx, test, size, font) > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Green wood panels
// ---------------------------------------------------------------------------

const panelCache = new Map<string, HTMLCanvasElement>();

function woodTexture(w: number, h: number, seed: number, base: string) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, shade(base, 0.12));
  g.addColorStop(1, shade(base, -0.18));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  // vertical planks with flowing grain
  const planks = Math.max(1, Math.round(w / 110));
  const pw = w / planks;
  for (let p = 0; p < planks; p++) {
    const x0 = p * pw;
    ctx.fillStyle = rgba(shade(base, (r() - 0.5) * 0.2), 0.5);
    ctx.fillRect(x0, 0, pw, h);
    for (let i = 0; i < 26; i++) {
      const gx = x0 + r() * pw;
      const amp = 2 + r() * 5;
      const freq = 0.01 + r() * 0.02;
      const ph = r() * 6;
      ctx.strokeStyle = rgba(r() < 0.5 ? shade(base, -0.35) : shade(base, 0.25), 0.12 + r() * 0.15);
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      for (let y = 0; y <= h; y += 6) {
        const x = gx + Math.sin(y * freq + ph) * amp;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a knot or two
    if (r() < 0.7) {
      const kx = x0 + pw * (0.3 + r() * 0.4);
      const ky = r() * h;
      for (let k = 0; k < 5; k++) {
        ctx.strokeStyle = rgba(shade(base, -0.3), 0.25);
        ctx.beginPath();
        ctx.ellipse(kx, ky, 3 + k * 3, 6 + k * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x0 + pw - 1.5, 0, 1.5, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x0, 0, 1, h);
  }
  applyGrain(ctx, 0, 0, w, h, 0.18);
  return c;
}

export interface PanelOpts {
  base?: string;
  frame?: number;
  vines?: boolean;
  seed?: number;
  alpha?: number;
  vineScale?: number;
}

/** A framed green-wood panel. Cached per size so it's cheap to draw every frame. */
export function panel(ctx: Ctx, x: number, y: number, w: number, h: number, o: PanelOpts = {}) {
  const key = `${Math.round(w)}x${Math.round(h)}:${o.base ?? ''}:${o.frame ?? 10}:${o.vines ?? false}:${o.seed ?? 0}:${o.vineScale ?? 0}`;
  let c = panelCache.get(key);
  if (!c) {
    c = paintPanel(Math.round(w), Math.round(h), o);
    panelCache.set(key, c);
  }
  const pad = PANEL_PAD;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.drawImage(c, x - pad, y - pad, c.width / 2, c.height / 2);
  ctx.restore();
}

const PANEL_PAD = 70;

function paintPanel(w: number, h: number, o: PanelOpts): HTMLCanvasElement {
  const pad = PANEL_PAD;
  const S = 2;
  const c = makeCanvas((w + pad * 2) * S, (h + pad * 2) * S);
  const ctx = c.getContext('2d')!;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const base = o.base ?? '#56663a';
  const f = o.frame ?? 10;
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(3, 6, w, h, 6);
  ctx.fill();
  // outer frame: darker, bevelled
  const fg = ctx.createLinearGradient(0, 0, 0, h);
  fg.addColorStop(0, shade(base, -0.25));
  fg.addColorStop(1, shade(base, -0.5));
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.drawImage(woodTexture(w, h, (o.seed ?? 0) + 1, shade(base, -0.2)), 0, 0);
  ctx.strokeStyle = 'rgba(10,12,4,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  // inner field
  const tex = woodTexture(w - f * 2, h - f * 2, (o.seed ?? 0) + 2, base);
  ctx.drawImage(tex, f, f);
  // bevels
  ctx.strokeStyle = 'rgba(255,250,210,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(f, h - f);
  ctx.lineTo(f, f);
  ctx.lineTo(w - f, f);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.moveTo(w - f, f);
  ctx.lineTo(w - f, h - f);
  ctx.lineTo(f, h - f);
  ctx.stroke();
  // thin inlay line inside the frame
  ctx.strokeStyle = 'rgba(40,30,20,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(f + 4, f + 4, w - f * 2 - 8, h - f * 2 - 8);
  // inner vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(f, f, w - f * 2, h - f * 2);
  if (o.vines) thornCorners(ctx, 0, 0, w, h, o.vineScale ?? Math.min(1.4, Math.max(0.6, Math.min(w, h) / 260)), o.seed ?? 0);
  return c;
}

/** Thorny vines grasping each corner of a rectangle, like the original inventory art. */
export function thornCorners(ctx: Ctx, x: number, y: number, w: number, h: number, s = 1, seed = 0) {
  const col = '#6b6a2a';
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  corners.forEach(([cx, cy, dx, dy], i) => {
    const o = { width: 5 * s, color: col, seed: seed * 10 + i, thorns: 7 };
    // main vine hugging the corner
    vine(ctx, { x: cx + dx * 70 * s, y: cy - dy * 8 * s }, { x: cx + dx * 20 * s, y: cy - dy * 18 * s }, { x: cx - dx * 14 * s, y: cy + dy * 6 * s }, { x: cx - dx * 4 * s, y: cy + dy * 60 * s }, o);
    // a second, thinner tendril arcing outward
    vine(ctx, { x: cx + dx * 110 * s, y: cy + dy * 2 * s }, { x: cx + dx * 80 * s, y: cy - dy * 34 * s }, { x: cx + dx * 40 * s, y: cy - dy * 30 * s }, { x: cx + dx * 22 * s, y: cy - dy * 8 * s }, { ...o, width: 3.5 * s, seed: o.seed + 5 });
    curl(ctx, cx + dx * 128 * s, cy - dy * 8 * s, 12 * s, dx * dy, { ...o, width: 3 * s });
    vine(ctx, { x: cx - dx * 6 * s, y: cy + dy * 90 * s }, { x: cx - dx * 28 * s, y: cy + dy * 70 * s }, { x: cx - dx * 30 * s, y: cy + dy * 40 * s }, { x: cx - dx * 8 * s, y: cy + dy * 26 * s }, { ...o, width: 3.2 * s, seed: o.seed + 9 });
  });
}

/** An inset square slot, like the cells of the inventory grid. */
export function slot(ctx: Ctx, x: number, y: number, size: number, o: { glow?: string; dim?: boolean } = {}) {
  ctx.save();
  if (o.glow) {
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = 'rgba(20,24,10,0.55)';
  ctx.fillRect(x, y, size, size);
  ctx.restore();
  // recessed edge
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,245,200,0.14)';
  ctx.beginPath();
  ctx.moveTo(x + size, y);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  // bronze rim, like the reference grid
  ctx.strokeStyle = o.glow ?? (o.dim ? 'rgba(90,70,50,0.6)' : '#5a4636');
  ctx.lineWidth = o.glow ? 2.5 : 1.5;
  ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
}

/** Parchment ribbon used for toasts and prompts. */
export function parchment(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, 4);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#efe2bf');
  g.addColorStop(1, '#d6c396');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - 8, y + h / 2);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + 8, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  applyGrain(ctx, x, y, w, h, 0.35, 'multiply');
  const e = ctx.createLinearGradient(x, 0, x + w, 0);
  e.addColorStop(0, 'rgba(120,80,30,0.35)');
  e.addColorStop(0.1, 'rgba(120,80,30,0)');
  e.addColorStop(0.9, 'rgba(120,80,30,0)');
  e.addColorStop(1, 'rgba(120,80,30,0.35)');
  ctx.fillStyle = e;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,60,30,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** A health bar in a dark bronze frame with a vine curled around it. */
export function healthBar(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, t: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  const fw = Math.max(0, (w - 6) * frac);
  if (fw > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ff7a6a');
    g.addColorStop(0.45, '#c8302a');
    g.addColorStop(1, '#6a1010');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, fw, h - 6, (h - 6) / 2);
    ctx.fill();
    // moving sheen
    ctx.save();
    ctx.clip();
    const sx = x + ((t * 60) % (w + 80)) - 40;
    const sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x + 6, y + 4, fw - 6, 2);
    ctx.restore();
  }
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,170,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, h / 2 - 1);
  ctx.stroke();
  // vine wrapping the ends
  vine(ctx, { x: x - 18, y: y + h + 6 }, { x: x - 8, y: y - 12 }, { x: x + 20, y: y - 10 }, { x: x + 44, y: y - 2 }, { width: 3.5, seed: 3, thorns: 8 });
  vine(ctx, { x: x + w - 50, y: y + h + 3 }, { x: x + w - 10, y: y + h + 12 }, { x: x + w + 14, y: y + h - 4 }, { x: x + w + 8, y: y - 10 }, { width: 3.2, seed: 4, thorns: 8 });
}
