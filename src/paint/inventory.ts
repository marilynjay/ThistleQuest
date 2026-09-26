// The Armory: Thistle's weapons and relics, laid out on the green-wood grid from the original mockup.

import { project } from '../engine/iso';
import { ELEMENT_INFO, weaknessesOf, type Element } from '../game/elements';
import type { Game } from '../game/game';
import { RELICS } from '../game/relics';
import { LOADOUT_SLOTS, WEAPONS } from '../game/weapons';
import { glow, rgba, type Ctx } from './kit';
import { drawThistle } from './thistle';
import { panel, slot, text, thornCorners, wrapText, FONT_TITLE } from './ui';
import { itemIcon, weaponIcon } from './weaponArt';

const COLS = 5;
const CELL = 70;
const GAP = 10;

function layout() {
  const gridW = COLS * CELL + (COLS - 1) * GAP;
  const W = 1120;
  const H = 600;
  const x = (1280 - W) / 2;
  const y = 20;
  const gridPanel = { x: x + 300, y: y + 110, w: gridW + 70, h: gridW + 70 };
  const gx = gridPanel.x + 35;
  const gy = gridPanel.y + 35;
  return { x, y, W, H, gridPanel, gx, gy, gridW };
}

function items(g: Game): { id: string; kind: 'weapon' | 'relic' }[] {
  return [
    ...g.save.weapons.map((id) => ({ id, kind: 'weapon' as const })),
    ...g.save.relics.map((id) => ({ id, kind: 'relic' as const })),
  ];
}

/** Which item (if any) is under the mouse. */
export function inventoryHit(g: Game, mx: number, my: number) {
  const L = layout();
  const list = items(g);
  for (let i = 0; i < COLS * COLS; i++) {
    const cx = L.gx + (i % COLS) * (CELL + GAP);
    const cy = L.gy + Math.floor(i / COLS) * (CELL + GAP);
    if (mx >= cx && mx < cx + CELL && my >= cy && my < cy + CELL) return list[i] ?? null;
  }
  return null;
}

export function drawInventory(ctx: Ctx, g: Game, t: number) {
  const L = layout();
  ctx.fillStyle = 'rgba(6,5,12,0.7)';
  ctx.fillRect(0, 0, 1280, 720);

  // title banner
  text(ctx, 'The Armory', 640, L.y + 36, { size: 38, font: FONT_TITLE, weight: '700', color: '#e8d8a0', align: 'center', stroke: 'rgba(10,8,4,0.8)' });
  text(ctx, 'Click a weapon to carry it in your four quick slots.  Tab or Esc to close.', 640, L.y + 64, { size: 16, color: '#c8c0b0', align: 'center' });

  // --- portrait -----------------------------------------------------------------
  const px = L.x;
  const py = L.gridPanel.y;
  panel(ctx, px, py, 270, L.gridPanel.h, { seed: 21, base: '#4a5a34' });
  ctx.save();
  ctx.beginPath();
  ctx.rect(px + 12, py + 12, 246, L.gridPanel.h - 24);
  ctx.clip();
  const cx = px + 135;
  const cy = py + 270;
  glow(ctx, cx, cy - 90, 140, '#9a6aff', 0.25);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 70, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(cx, cy);
  ctx.scale(2.3, 2.3);
  drawThistle(ctx, (x, y, z = 0) => project(x, y, z), {
    x: 0, y: 0, z: 0, facing: Math.PI / 4 + Math.sin(t * 0.5) * 1.1, walk: 0, speed: 0, t, weapon: g.weapon.id,
    attack: 0, attackKind: 'melee', dodge: 0, velX: 0, velY: 0,
  });
  ctx.restore();
  const stats = g.stats;
  const lines: [string, string][] = [
    ['Max health', String(stats.maxHp)],
    ['Damage', `+${Math.round((stats.damageMult - 1) * 100)}%`],
    ['Runs', String(g.save.runs)],
    ['Falls', String(g.save.deaths)],
  ];
  text(ctx, 'Thistle', cx, py + 314, { size: 24, font: FONT_TITLE, weight: '700', color: '#a8e08a', align: 'center' });
  text(ctx, "the Wizard's famulus", cx, py + 336, { size: 15, color: '#d8d0b8', align: 'center' });
  lines.forEach(([k, v], i) => {
    text(ctx, k, px + 40, py + 372 + i * 22, { size: 16, color: '#d8d0b8' });
    text(ctx, v, px + 230, py + 372 + i * 22, { size: 16, weight: '700', color: '#fff0c8', align: 'right' });
  });

  // --- grid ---------------------------------------------------------------------
  const gp = L.gridPanel;
  panel(ctx, gp.x, gp.y, gp.w, gp.h, { seed: 3 });
  thornCorners(ctx, gp.x, gp.y, gp.w, gp.h, 1, 1);
  const list = items(g);
  const hover = inventoryHit(g, g.input.mouseX, g.input.mouseY);
  for (let i = 0; i < COLS * COLS; i++) {
    const x = L.gx + (i % COLS) * (CELL + GAP);
    const y = L.gy + Math.floor(i / COLS) * (CELL + GAP);
    const it = list[i];
    const inLoadout = it?.kind === 'weapon' ? g.save.loadout.indexOf(it.id) : -1;
    const col = it ? (it.kind === 'weapon' ? ELEMENT_INFO[WEAPONS[it.id].element].color : RELICS[it.id].color) : undefined;
    const isHover = hover && it && hover.id === it.id;
    slot(ctx, x, y, CELL, { glow: inLoadout >= 0 || isHover ? col : undefined, dim: !it });
    if (!it) continue;
    if (it.kind === 'weapon') weaponIcon(ctx, it.id, x + CELL / 2, y + CELL / 2, CELL * 0.85, t);
    else itemIcon(ctx, it.id, x + CELL / 2, y + CELL / 2, CELL * 0.6);
    if (inLoadout >= 0) {
      ctx.fillStyle = 'rgba(20,16,10,0.85)';
      ctx.beginPath();
      ctx.arc(x + 14, y + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = col!;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, String(inLoadout + 1), x + 14, y + 19, { size: 14, weight: '700', color: '#ffffff', align: 'center', shadow: false });
    }
  }

  // --- details + type wheel ------------------------------------------------------------
  const dx = gp.x + gp.w + 30;
  const dw = L.x + L.W - dx;
  panel(ctx, dx, gp.y, dw, gp.h, { seed: 8, base: '#4a5a34' });
  const shown = hover ?? (list[0] as { id: string; kind: 'weapon' | 'relic' });
  let yy = gp.y + 50;
  if (shown.kind === 'weapon') {
    const w = WEAPONS[shown.id];
    const el = ELEMENT_INFO[w.element];
    text(ctx, w.name, dx + dw / 2, yy, { size: 24, font: FONT_TITLE, weight: '700', color: el.color, align: 'center' });
    yy += 26;
    text(ctx, `${el.name} ${w.kind === 'melee' ? 'blade' : w.kind === 'bolt' ? 'caster' : 'polearm'}`, dx + dw / 2, yy, { size: 16, color: '#d8d0b8', align: 'center' });
    yy += 30;
    for (const l of wrapText(ctx, w.blurb, dw - 60, 16)) {
      text(ctx, l, dx + dw / 2, yy, { size: 16, color: '#f0e8d4', align: 'center' });
      yy += 21;
    }
    yy += 8;
    const dmg = Math.round(w.damage * g.stats.damageMult);
    text(ctx, `Damage ${dmg}   ·   ${(1 / w.cooldown).toFixed(1)} hits/s`, dx + dw / 2, yy, { size: 15, weight: '700', color: '#ffe8a0', align: 'center' });
    yy += 22;
    const strong = (Object.keys(ELEMENT_INFO) as Element[]).filter((d) => weaknessesOf(d).includes(w.element)).map((d) => ELEMENT_INFO[d].name);
    if (strong.length) text(ctx, `Strong against ${strong.join(', ')}`, dx + dw / 2, yy, { size: 15, color: '#a8e08a', align: 'center' });
    else text(ctx, 'Hits every creature evenly', dx + dw / 2, yy, { size: 15, color: '#c8c0b0', align: 'center' });
    yy += 22;
    const inL = g.save.loadout.includes(w.id);
    text(ctx, inL ? 'Carried. Click to put it back.' : g.save.loadout.length < LOADOUT_SLOTS ? 'Click to carry it.' : 'Click to swap into your current slot.', dx + dw / 2, yy, { size: 14, color: '#b8b0a0', align: 'center' });
  } else {
    const r = RELICS[shown.id];
    text(ctx, r.name, dx + dw / 2, yy, { size: 24, font: FONT_TITLE, weight: '700', color: r.color, align: 'center' });
    yy += 26;
    text(ctx, 'Relic · permanent', dx + dw / 2, yy, { size: 16, color: '#d8d0b8', align: 'center' });
    yy += 30;
    for (const l of wrapText(ctx, r.blurb, dw - 60, 16)) {
      text(ctx, l, dx + dw / 2, yy, { size: 16, color: '#f0e8d4', align: 'center' });
      yy += 21;
    }
  }
  typeWheel(ctx, dx + dw / 2, gp.y + gp.h - 130, t);
}

function typeWheel(ctx: Ctx, cx: number, cy: number, t: number) {
  text(ctx, 'What beats what', cx, cy - 92, { size: 17, font: FONT_TITLE, weight: '700', color: '#e8d8a0', align: 'center' });
  const ring: Element[] = ['flame', 'frost', 'stone', 'storm'];
  const R = 56;
  const pos = (i: number) => ({ x: cx + Math.cos(-Math.PI / 2 + (i * Math.PI) / 2) * R, y: cy - 10 + Math.sin(-Math.PI / 2 + (i * Math.PI) / 2) * R });
  // arrows
  for (let i = 0; i < 4; i++) {
    const a = pos(i);
    const b = pos((i + 1) % 4);
    const mx = (a.x + b.x) / 2 + (cx - (a.x + b.x) / 2) * -0.35;
    const my = (a.y + b.y) / 2 + (cy - 10 - (a.y + b.y) / 2) * -0.35;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 - i);
    ctx.strokeStyle = rgba(ELEMENT_INFO[ring[i]].color, 0.5 + pulse * 0.4);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
    // arrowhead near b
    const ang = Math.atan2(b.y - my, b.x - mx);
    const hx = b.x - Math.cos(ang) * 17;
    const hy = b.y - Math.sin(ang) * 17;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * 7, hy + Math.sin(ang) * 7);
    ctx.lineTo(hx + Math.cos(ang + 2.5) * 7, hy + Math.sin(ang + 2.5) * 7);
    ctx.lineTo(hx + Math.cos(ang - 2.5) * 7, hy + Math.sin(ang - 2.5) * 7);
    ctx.fill();
  }
  ring.forEach((e, i) => {
    const p = pos(i);
    const el = ELEMENT_INFO[e];
    ctx.fillStyle = 'rgba(15,12,20,0.9)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = el.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, el.name, p.x, p.y + 4, { size: 11, weight: '700', color: el.color, align: 'center' });
  });
  text(ctx, 'Radiant  ⇄  Void', cx, cy + 72, { size: 15, weight: '700', color: '#e8dcff', align: 'center' });
}
