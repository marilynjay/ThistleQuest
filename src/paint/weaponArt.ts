// Painted weapons. Each is drawn along a segment from butt to tip, so the same art works
// in Thistle's hand, on a pedestal, or as a HUD icon.

import type { Vec } from '../engine/iso';
import { glow, shade, type Ctx } from './kit';

export interface WeaponShape {
  length: number; // world units
  grip: number; // fraction from the butt where the hand holds it
}

export const WEAPON_SHAPES: Record<string, WeaponShape> = {
  broom: { length: 1.55, grip: 0.3 },
  emberbrand: { length: 0.95, grip: 0.1 },
  rimeshard: { length: 0.6, grip: 0.25 },
  thunderpike: { length: 2.0, grip: 0.42 },
};

export function drawWeapon(ctx: Ctx, id: string, butt: Vec, tip: Vec, scale: number, t: number) {
  const dx = tip.x - butt.x;
  const dy = tip.y - butt.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const at = (f: number, side = 0): Vec => ({ x: butt.x + dx * f + nx * side, y: butt.y + dy * f + ny * side });
  const line = (a: Vec, b: Vec, w: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = w;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  const s = scale;

  switch (id) {
    case 'broom': {
      line(at(0), at(0.78), 3.6 * s, '#2a1a10');
      line(at(0), at(0.78), 2.4 * s, '#8b5a2b');
      line(at(0.02, -0.5 * s), at(0.76, -0.5 * s), 0.8 * s, '#b07a44');
      // bristle fan
      const w0 = 3 * s;
      const w1 = 9 * s;
      ctx.beginPath();
      const a0 = at(0.74, -w0);
      const a1 = at(0.74, w0);
      const b1 = at(1.02, w1);
      const b0 = at(1.02, -w1);
      ctx.moveTo(a0.x, a0.y);
      ctx.lineTo(a1.x, a1.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.quadraticCurveTo(at(1.06).x, at(1.06).y, b0.x, b0.y);
      ctx.closePath();
      ctx.fillStyle = '#d9b45a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,10,0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,80,20,0.6)';
      for (let i = -3; i <= 3; i++) line(at(0.76, i * s), at(1.01, i * 2.6 * s), 0.6 * s, 'rgba(140,95,30,0.7)');
      line(at(0.74, -w0 - 0.5), at(0.74, w0 + 0.5), 2 * s, '#6a2a1a'); // binding cord
      line(at(0.8, -w0 - 1), at(0.8, w0 + 1), 1.4 * s, '#6a2a1a');
      break;
    }
    case 'emberbrand': {
      line(at(0), at(0.03), 4.5 * s, '#c9a24a'); // pommel
      line(at(0.02), at(0.18), 3 * s, '#3a2014'); // grip
      line(at(0.19, -6 * s), at(0.19, 6 * s), 3 * s, '#c9a24a'); // crossguard
      // blade
      ctx.beginPath();
      const b0 = at(0.2, -3 * s);
      const b1 = at(0.2, 3 * s);
      const tp = at(1);
      ctx.moveTo(b0.x, b0.y);
      ctx.lineTo(at(0.85, -2.6 * s).x, at(0.85, -2.6 * s).y);
      ctx.lineTo(tp.x, tp.y);
      ctx.lineTo(at(0.85, 2.6 * s).x, at(0.85, 2.6 * s).y);
      ctx.lineTo(b1.x, b1.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(b0.x, b0.y, b1.x, b1.y);
      g.addColorStop(0, '#fff0c8');
      g.addColorStop(0.5, '#d9d2c8');
      g.addColorStop(1, '#6a6060');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,10,0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // smoldering edge
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      line(at(0.25, 2.2 * s), at(0.95, 0.5 * s), 1.6 * s, `rgba(255,120,40,${0.55 + Math.sin(t * 8) * 0.2})`);
      ctx.restore();
      glow(ctx, at(0.7).x, at(0.7).y, 14 * s, '#ff7a2a', 0.25);
      break;
    }
    case 'rimeshard': {
      line(at(0), at(0.7), 3 * s, '#2a1a10');
      line(at(0), at(0.7), 2 * s, '#e8e0d0');
      line(at(0.15), at(0.22), 3.2 * s, '#8ee3ff');
      // crystal
      ctx.beginPath();
      const c0 = at(0.66, -3.5 * s);
      const c1 = at(0.66, 3.5 * s);
      const ct = at(1.05);
      ctx.moveTo(c0.x, c0.y);
      ctx.lineTo(at(0.82, -4 * s).x, at(0.82, -4 * s).y);
      ctx.lineTo(ct.x, ct.y);
      ctx.lineTo(at(0.82, 4 * s).x, at(0.82, 4 * s).y);
      ctx.lineTo(c1.x, c1.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(c0.x, c0.y, c1.x, c1.y);
      g.addColorStop(0, '#f0fcff');
      g.addColorStop(0.5, '#8ee3ff');
      g.addColorStop(1, '#2a7aa8');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,30,50,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      glow(ctx, at(0.85).x, at(0.85).y, 16 * s, '#8ee3ff', 0.35 + Math.sin(t * 3) * 0.1);
      break;
    }
    case 'thunderpike': {
      line(at(0), at(0.8), 3.4 * s, '#1a1410');
      line(at(0), at(0.8), 2.2 * s, '#4a3a2a');
      for (const f of [0.1, 0.4, 0.78]) line(at(f), at(f + 0.03), 3.6 * s, '#c9a24a');
      // leaf-shaped head
      ctx.beginPath();
      const h0 = at(0.8);
      const ht = at(1);
      ctx.moveTo(h0.x, h0.y);
      ctx.quadraticCurveTo(at(0.86, -5 * s).x, at(0.86, -5 * s).y, ht.x, ht.y);
      ctx.quadraticCurveTo(at(0.86, 5 * s).x, at(0.86, 5 * s).y, h0.x, h0.y);
      const g = ctx.createLinearGradient(at(0.86, -5 * s).x, at(0.86, -5 * s).y, at(0.86, 5 * s).x, at(0.86, 5 * s).y);
      g.addColorStop(0, '#f4f0e0');
      g.addColorStop(1, '#6a6a70');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,20,0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // crackling lightning
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,230,120,0.8)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      let p = at(0.82);
      ctx.moveTo(p.x, p.y);
      for (let i = 1; i <= 5; i++) {
        p = at(0.82 + i * 0.035, Math.sin(t * 40 + i * 2) * 4 * s);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
      glow(ctx, at(0.9).x, at(0.9).y, 14 * s, '#ffe066', 0.3);
      break;
    }
  }
}

/** A weapon laid diagonally in a square, for icons. */
export function weaponIcon(ctx: Ctx, id: string, cx: number, cy: number, size: number, t = 0) {
  const h = size * 0.42;
  drawWeapon(ctx, id, { x: cx - h, y: cy + h }, { x: cx + h, y: cy - h }, size / 44, t);
}

/** Relic and item icons painted into a square. */
export function itemIcon(ctx: Ctx, id: string, cx: number, cy: number, size: number) {
  const s = size / 40;
  if (id === 'whetstone') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.4);
    const g = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
    g.addColorStop(0, '#cfd8e0');
    g.addColorStop(1, '#5f7488');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-14 * s, -7 * s, 28 * s, 14 * s, 6 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,40,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -4 * s);
    ctx.lineTo(8 * s, -4 * s);
    ctx.stroke();
    ctx.restore();
  } else if (id === 'acorn') {
    const g = ctx.createRadialGradient(cx - 4 * s, cy, 1, cx, cy + 3 * s, 12 * s);
    g.addColorStop(0, '#e0a060');
    g.addColorStop(1, '#8a5530');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4 * s, 9 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a4424';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5 * s, 11 * s, 6 * s, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + 11 * s, cy - 3 * s);
    ctx.lineTo(cx - 11 * s, cy - 3 * s);
    ctx.fill();
    ctx.strokeStyle = '#4a2e18';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10 * s);
    ctx.lineTo(cx + 2 * s, cy - 15 * s);
    ctx.stroke();
    // a heartbeat glow
    glow(ctx, cx, cy + 4 * s, 12 * s, '#ff8a6a', 0.25);
  } else if (id === 'herb') {
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = shade('#5aa84d', i * 0.08);
      ctx.save();
      ctx.translate(cx, cy + 8 * s);
      ctx.rotate(i * 0.45);
      ctx.beginPath();
      ctx.ellipse(0, -9 * s, 3.5 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
