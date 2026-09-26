// Painted creatures, animated procedurally every frame.

import type { Vec } from '../engine/iso';
import { glow, limb, orb, rgba, type Ctx, type Proj } from './kit';

export interface CreaturePose {
  x: number;
  y: number;
  facing: number;
  t: number;
  moving: boolean;
  windup: number; // 0..1 while telegraphing an attack
  stunned: boolean;
}

const CAM = { x: Math.SQRT1_2, y: Math.SQRT1_2 };

function frame(p: CreaturePose) {
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  return {
    fx,
    fy,
    rx: fy,
    ry: -fx,
    facingCam: fx * CAM.x + fy * CAM.y,
  };
}

// ---------------------------------------------------------------------------
// Frost Wisp: a drifting spirit of cold light.
// ---------------------------------------------------------------------------

export function drawWisp(ctx: Ctx, S: Proj, p: CreaturePose) {
  const { fx, fy } = frame(p);
  const hover = 0.55 + Math.sin(p.t * 3) * 0.08;
  const c = S(p.x, p.y, hover);
  const r = 13;
  glow(ctx, c.x, c.y, 46, '#8ee3ff', 0.4 + p.windup * 0.3);
  // trailing tail, curling away from the facing direction
  const back = S(p.x - fx * 0.5, p.y - fy * 0.5, hover - 0.2);
  const tail: Vec = { x: back.x + Math.sin(p.t * 5) * 6, y: back.y + 8 };
  ctx.beginPath();
  ctx.moveTo(c.x - r * 0.9, c.y);
  ctx.quadraticCurveTo(c.x - r * 0.4, tail.y, tail.x, tail.y + 6);
  ctx.quadraticCurveTo(c.x + r * 0.2, tail.y - 4, c.x + r * 0.9, c.y);
  ctx.closePath();
  const tg = ctx.createLinearGradient(c.x, c.y, tail.x, tail.y);
  tg.addColorStop(0, 'rgba(210,245,255,0.9)');
  tg.addColorStop(1, 'rgba(110,200,240,0)');
  ctx.fillStyle = tg;
  ctx.fill();
  // body
  const g = ctx.createRadialGradient(c.x - 4, c.y - 5, 2, c.x, c.y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#c8f2ff');
  g.addColorStop(1, 'rgba(90,180,230,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  // flickering crown of icy flame
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.35;
    const h = 10 + Math.sin(p.t * 9 + i * 1.7) * 4;
    ctx.fillStyle = 'rgba(160,230,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(c.x + Math.cos(a) * r * 0.7, c.y + Math.sin(a) * r * 0.7 - h * 0.4, 3, h * 0.6, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // face
  const lookX = (fx - fy) * 3;
  const lookY = (fx + fy) * 1.5;
  ctx.fillStyle = '#1a2a44';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(c.x + lookX + s * 4.5, c.y + lookY - 1, 2.2, p.stunned ? 0.8 : 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.windup > 0) {
    ctx.strokeStyle = '#1a2a44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c.x + lookX, c.y + lookY + 5, 3, 0, Math.PI);
    ctx.stroke();
  }
  // snow sparkles
  for (let i = 0; i < 5; i++) {
    const ph = (p.t * 0.8 + i / 5) % 1;
    const a = i * 2.3 + p.t;
    ctx.fillStyle = `rgba(230,250,255,${1 - ph})`;
    ctx.fillRect(c.x + Math.cos(a) * (r + 6), c.y + Math.sin(a) * 6 + ph * 18, 2, 2);
  }
}

// ---------------------------------------------------------------------------
// Boulder Beetle: a slow, heavy beetle whose shell is a mossy rock.
// ---------------------------------------------------------------------------

export function drawBeetle(ctx: Ctx, S: Proj, p: CreaturePose) {
  const { fx, fy, rx, ry, facingCam } = frame(p);
  const W = (lat: number, fwd: number, up: number) => S(p.x + rx * lat + fx * fwd, p.y + ry * lat + fy * fwd, up);
  const shake = p.windup > 0 ? Math.sin(p.t * 70) * 0.02 : 0;
  // legs, three per side, skittering
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const ph = p.t * (p.moving ? 14 : 2) + i * 2.1 + (side > 0 ? Math.PI : 0);
      const fwd = -0.2 + i * 0.22 + (p.moving ? Math.sin(ph) * 0.07 : 0);
      const hip = W(side * 0.22, fwd, 0.22);
      const knee = W(side * 0.44, fwd + 0.04, 0.26 + Math.max(0, Math.cos(ph)) * 0.08);
      const foot = W(side * 0.5, fwd + 0.08, 0);
      ctx.strokeStyle = '#1c1612';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hip.x, hip.y);
      ctx.lineTo(knee.x, knee.y);
      ctx.lineTo(foot.x, foot.y);
      ctx.stroke();
      ctx.strokeStyle = '#4a3a2e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // head in front (drawn first when facing away)
  const drawHead = () => {
    const h = W(0, 0.42 + shake, 0.24);
    orb(ctx, h.x, h.y, 11, 8, '#3a2e26');
    for (const s of [-1, 1]) {
      const e = W(s * 0.1, 0.5, 0.28);
      const eyeGlow = p.windup > 0 ? '#ffec80' : '#ffcf4a';
      ctx.fillStyle = eyeGlow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (p.windup > 0) glow(ctx, e.x, e.y, 10, '#ffcf4a', 0.6);
      // mandibles
      const m0 = W(s * 0.08, 0.52, 0.2);
      const m1 = W(s * 0.02, 0.66, 0.18);
      ctx.strokeStyle = '#1c1612';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.quadraticCurveTo(W(s * 0.14, 0.62, 0.2).x, W(s * 0.14, 0.62, 0.2).y, m1.x, m1.y);
      ctx.stroke();
    }
  };
  if (facingCam < 0) drawHead();
  // the boulder shell
  const c = W(0, -0.02 + shake, 0.38);
  const rx0 = 28;
  const ry0 = 22;
  ctx.beginPath();
  ctx.moveTo(c.x - rx0, c.y + 6);
  ctx.bezierCurveTo(c.x - rx0, c.y - ry0 * 1.1, c.x + rx0, c.y - ry0 * 1.1, c.x + rx0, c.y + 6);
  ctx.bezierCurveTo(c.x + rx0 * 0.8, c.y + ry0 * 0.7, c.x - rx0 * 0.8, c.y + ry0 * 0.7, c.x - rx0, c.y + 6);
  const g = ctx.createRadialGradient(c.x - 10, c.y - 14, 3, c.x, c.y, rx0 * 1.2);
  g.addColorStop(0, '#b8a78a');
  g.addColorStop(0.5, '#86765f');
  g.addColorStop(1, '#3f362c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#1c1612';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // cracks and facets
  ctx.strokeStyle = 'rgba(30,24,18,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(c.x - 4, c.y - 18);
  ctx.lineTo(c.x + 2, c.y - 6);
  ctx.lineTo(c.x - 6, c.y + 4);
  ctx.moveTo(c.x + 2, c.y - 6);
  ctx.lineTo(c.x + 16, c.y - 2);
  ctx.moveTo(c.x - 18, c.y - 4);
  ctx.lineTo(c.x - 8, c.y - 8);
  ctx.stroke();
  // moss
  ctx.fillStyle = 'rgba(90,140,60,0.8)';
  for (const [dx, dy, r] of [[-12, -12, 6], [-4, -16, 5], [8, -14, 4], [-16, -6, 3]]) {
    ctx.beginPath();
    ctx.ellipse(c.x + dx, c.y + dy, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,200,100,0.6)';
  ctx.fillRect(c.x - 13, c.y - 15, 3, 2);
  if (facingCam >= 0) drawHead();
  if (p.windup > 0) {
    for (let i = 0; i < 4; i++) {
      const d = W((i - 1.5) * 0.2, -0.4, 0.05);
      ctx.fillStyle = `rgba(160,140,110,${0.4 * p.windup})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y - ((p.t * 30 + i * 7) % 12), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// Cinder Imp: a gleeful little fire-thrower.
// ---------------------------------------------------------------------------

export function drawImp(ctx: Ctx, S: Proj, p: CreaturePose) {
  const { fx, fy, rx, ry, facingCam } = frame(p);
  const hop = p.moving ? Math.abs(Math.sin(p.t * 9)) * 0.08 : Math.sin(p.t * 3) * 0.02;
  const W = (lat: number, fwd: number, up: number) => S(p.x + rx * lat + fx * fwd, p.y + ry * lat + fy * fwd, up + hop);
  const RED = '#d9482b';
  // wings behind
  const wingFlap = Math.sin(p.t * 16) * 0.5;
  const drawWings = () => {
    for (const s of [-1, 1]) {
      const root = W(s * 0.08, -0.1, 0.72);
      const tip = W(s * (0.42 + wingFlap * 0.1), -0.3, 0.95 + wingFlap * 0.15);
      const low = W(s * 0.32, -0.25, 0.6);
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + low.x) / 2 + s * 4, (tip.y + low.y) / 2, low.x, low.y);
      ctx.closePath();
      ctx.fillStyle = '#6a1a14';
      ctx.fill();
      ctx.strokeStyle = '#2a0f0c';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  if (facingCam > 0) drawWings();
  // tail
  const t0 = W(0, -0.12, 0.45);
  const t1 = W(Math.sin(p.t * 4) * 0.2, -0.45, 0.35);
  const t2 = W(Math.sin(p.t * 4 + 1) * 0.25, -0.5, 0.6);
  ctx.strokeStyle = '#8c2418';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.quadraticCurveTo(t1.x, t1.y, t2.x, t2.y);
  ctx.stroke();
  ctx.fillStyle = '#8c2418';
  ctx.beginPath();
  ctx.moveTo(t2.x, t2.y - 4);
  ctx.lineTo(t2.x + 4, t2.y + 2);
  ctx.lineTo(t2.x - 4, t2.y + 2);
  ctx.fill();
  // legs
  for (const s of [-1, 1]) {
    const step = p.moving ? Math.sin(p.t * 9 + (s > 0 ? Math.PI : 0)) * 0.08 : 0;
    limb(ctx, W(s * 0.08, 0, 0.4), W(s * 0.09, step, 0.03), 3.5, 2.5, '#8c2418');
  }
  // body
  const body = W(0, 0, 0.55);
  orb(ctx, body.x, body.y, 12, 14, RED);
  // arms; the throwing arm raises during windup
  for (const s of [-1, 1]) {
    const throwing = s > 0 && p.windup > 0;
    const hand = throwing ? W(0.15, -0.05, 1.05) : W(s * 0.2, 0.05, 0.45);
    limb(ctx, W(s * 0.12, 0, 0.65), hand, 3, 2.5, RED);
    if (throwing) {
      const fb = hand;
      glow(ctx, fb.x, fb.y, 20 + p.windup * 16, '#ff8a3d', 0.7);
      orb(ctx, fb.x, fb.y, 4 + p.windup * 4, 4 + p.windup * 4, '#ffd08a', null);
    }
  }
  // head
  const head = W(0, 0.03, 0.9);
  orb(ctx, head.x, head.y, 11, 10, RED);
  for (const s of [-1, 1]) {
    const hb = W(s * 0.08, 0.02, 0.98);
    const ht = W(s * 0.17, -0.02, 1.2);
    ctx.fillStyle = '#f2e1b0';
    ctx.beginPath();
    ctx.moveTo(hb.x - 3, hb.y);
    ctx.quadraticCurveTo(hb.x + s * 2, ht.y + 6, ht.x, ht.y);
    ctx.lineTo(hb.x + 3, hb.y);
    ctx.closePath();
    ctx.fill();
  }
  if (facingCam > -0.3) {
    for (const s of [-1, 1]) {
      const e = W(s * 0.06, 0.16, 0.92);
      ctx.fillStyle = '#ffe45c';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 2.8, p.stunned ? 0.8 : 2.2, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, e.x, e.y, 7, '#ffe45c', 0.5);
    }
    // grin
    const m = W(0, 0.18, 0.84);
    ctx.strokeStyle = '#2a0f0c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 2, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (facingCam <= 0) drawWings();
  glow(ctx, body.x, body.y, 30, '#ff6a2a', 0.15);
}

/** Small colored pip + health bar floating above a creature. */
export function creatureBadge(ctx: Ctx, x: number, y: number, color: string, hpFrac: number, stunned: boolean, t: number) {
  if (hpFrac < 1) {
    const w = 34;
    ctx.fillStyle = 'rgba(15,10,20,0.75)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 1.5, y + 7, w + 3, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#d94a4a';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y + 8.5, Math.max(2, w * hpFrac), 3, 1.5);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(15,10,20,0.8)';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.fillStyle = color;
  ctx.fillRect(-3.2, -3.2, 6.4, 6.4);
  ctx.fillStyle = rgba('#ffffff', 0.5);
  ctx.fillRect(-3.2, -3.2, 6.4, 1.6);
  ctx.restore();
  if (stunned) {
    for (let i = 0; i < 3; i++) {
      const a = t * 6 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 12, y - 8 + Math.sin(a) * 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
