import { depthOf, worldToScreen } from '../engine/iso';
import { drawText, textWidth, wrap } from '../engine/pixelfont';
import { hash2, type Sprite } from '../engine/sprite';
import { ELEMENT_INFO, weaknessesOf } from './elements';
import { VIEW_H, VIEW_W, type Game } from './game';
import { RELICS } from './relics';
import { drawBlock, makeSky, type BlockStyle } from './tiles';
import { LOADOUT_SLOTS, WEAPONS } from './weapons';

type Draw = { depth: number; fn: () => void };

let sky: HTMLCanvasElement | null = null;

const WALL_STYLE: BlockStyle = { top: '#8a8496', left: '#6a6478', right: '#4f4a5c', line: '#433e4f', windows: true };
const TOWER_STYLE: BlockStyle = { top: '#9a8f86', left: '#8a7d70', right: '#5f554c', line: '#4a423b', windows: true };
const SHELF_STYLE: BlockStyle = { top: '#6b4526', left: '#5a3a20', right: '#40291a', books: true };

function sprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, flash = false, alpha = 1) {
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(flash ? s.flash : s.canvas, Math.round(x), Math.round(y));
  if (alpha < 1) ctx.globalAlpha = 1;
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(10, 8, 20, 0.35)';
  const h = Math.max(2, Math.round(w / 2.5));
  for (let i = 0; i < h; i++) {
    const t = (i + 0.5) / h - 0.5;
    const rw = Math.round(w * Math.sqrt(1 - 4 * t * t));
    ctx.fillRect(Math.round(x - rw / 2), Math.round(y - h / 2 + i), rw, 1);
  }
}

export function drawGame(g: Game, ctx: CanvasRenderingContext2D) {
  const m = g.map;
  const shakeX = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0;
  const shakeY = g.shake > 0 ? Math.round((Math.random() - 0.5) * g.shake) : 0;
  const offX = Math.round(VIEW_W / 2 - g.camX) + shakeX;
  const offY = Math.round(VIEW_H / 2 - g.camY) + shakeY;
  const S = (x: number, y: number, z = 0) => {
    const p = worldToScreen(x, y, z);
    return { x: p.x + offX, y: p.y + offY };
  };

  // --- backdrop -------------------------------------------------------------
  if (g.mapId === 'tower') {
    sky ??= makeSky(VIEW_W, VIEW_H);
    ctx.drawImage(sky, 0, 0);
  } else {
    ctx.fillStyle = '#0f1a10';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const gc = g.ground[g.mapId];
  ctx.drawImage(gc.canvas, offX - gc.ox, offY - gc.oy);

  // shimmering water
  if (g.mapId === 'valley') {
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++) {
        if (m.ground[y * m.w + x] !== 'water') continue;
        const ph = Math.sin(g.time * 2 + hash2(x, y, 3) * 6.28);
        if (ph < 0.8) continue;
        const p = S(x + hash2(x, y, 1), y + hash2(x, y, 2));
        if (p.x < 0 || p.y < 0 || p.x > VIEW_W || p.y > VIEW_H) continue;
        ctx.fillStyle = '#cfe9ff';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
      }
  }

  // rune circle around the podium
  if (g.mapId === 'tower') {
    const c = g.maps.tower.spawnPoint;
    const cx = c.x;
    const cy = c.y - 1.1;
    const pulse = 0.5 + 0.5 * Math.sin(g.time * 2);
    ctx.fillStyle = pulse > 0.5 ? '#c9a0ff' : '#8a6cc9';
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + g.time * 0.1;
      const p = S(cx + Math.cos(a) * 2.2, cy + Math.sin(a) * 2.2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      if (i % 15 === 0) {
        const q = S(cx + Math.cos(a) * 1.9, cy + Math.sin(a) * 1.9);
        ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y), 3, 1);
        ctx.fillRect(Math.round(q.x), Math.round(q.y) - 1, 1, 3);
      }
    }
  }

  const p = g.player;
  const ps = S(p.x, p.y);

  // --- shadows (always under everything) ------------------------------------
  if (g.state !== 'dead') shadow(ctx, ps.x, ps.y, 10);
  for (const e of g.enemies) {
    const es = S(e.x, e.y);
    shadow(ctx, es.x, es.y, e.def.radius * 32);
  }
  for (const pk of g.pickups) {
    const s = S(pk.x, pk.y);
    shadow(ctx, s.x, s.y, 12);
  }

  // --- depth-sorted world ---------------------------------------------------
  const draws: Draw[] = [];
  const playerRect = { x: ps.x - 7, y: ps.y - 22, w: 14, h: 22 };
  const overlapsPlayer = (x: number, y: number, w: number, h: number) =>
    g.state !== 'dead' && x < playerRect.x + playerRect.w && x + w > playerRect.x && y < playerRect.y + playerRect.h && y + h > playerRect.y;
  const pDepth = depthOf(p.x, p.y);
  const half = (m.w + m.h) / 2;

  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const solid = m.solid[y * m.w + x];
      if (!solid) continue;
      const top = S(x, y);
      if (top.x < -40 || top.x > VIEW_W + 40 || top.y < -20 || top.y > VIEW_H + 110) continue;
      const c = S(x + 0.5, y + 0.5);
      const depth = x + y + 1;
      const inFront = depth > pDepth;
      switch (solid) {
        case 'tree': {
          const t = g.art.trees[Math.floor(hash2(x, y, 42) * g.art.trees.length)];
          const sx = c.x - t.w / 2;
          const sy = c.y - t.h + 3;
          const a = inFront && overlapsPlayer(sx, sy, t.w, t.h) ? 0.45 : 1;
          draws.push({ depth, fn: () => sprite(ctx, t, sx, sy, false, a) });
          break;
        }
        case 'rock': {
          const r = g.art.rocks[Math.floor(hash2(x, y, 9) * g.art.rocks.length)];
          draws.push({ depth, fn: () => sprite(ctx, r, c.x - r.w / 2, c.y - r.h + 2) });
          break;
        }
        case 'wall':
        case 'towerwall':
        case 'bookshelf': {
          const tall = x + y < half - 1;
          const h = solid === 'towerwall' ? 84 : solid === 'bookshelf' ? 28 : tall ? 44 : 7;
          const style = solid === 'towerwall' ? TOWER_STYLE : solid === 'bookshelf' ? SHELF_STYLE : WALL_STYLE;
          const edge = solid === 'towerwall' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => m.solid[(y + dy) * m.w + x + dx] !== 'towerwall');
          const a = inFront && h > 10 && overlapsPlayer(top.x - 16, top.y - h, 32, h + 16) ? 0.4 : 1;
          draws.push({
            depth,
            fn: () => {
              if (a < 1) ctx.globalAlpha = a;
              drawBlock(ctx, top.x, top.y, h, edge ? { ...style, crenel: true } : style, x * 31 + y);
              ctx.globalAlpha = 1;
            },
          });
          break;
        }
        case 'debris':
          draws.push({ depth, fn: () => sprite(ctx, g.art.debris, c.x - 9, c.y - 8) });
          break;
        case 'podium':
          draws.push({
            depth,
            fn: () => {
              sprite(ctx, g.art.podium, c.x - 10, c.y - 27);
              // an empty cradle where the artifact once rested, still humming
              const bob = Math.round(Math.sin(g.time * 2.5) * 1.5);
              ctx.fillStyle = '#c9a0ff';
              ctx.fillRect(c.x - 1, c.y - 33 + bob, 2, 2);
              ctx.fillStyle = '#fff6d6';
              ctx.fillRect(c.x, c.y - 33 + bob, 1, 1);
            },
          });
          break;
        case 'signpost':
          draws.push({ depth, fn: () => sprite(ctx, g.art.signpost, c.x - 8, c.y - 18) });
          break;
      }
    }
  }

  for (const pk of g.pickups) {
    const s = S(pk.x, pk.y);
    const icon = g.art.icons[pk.item];
    const color = pk.kind === 'weapon' ? ELEMENT_INFO[WEAPONS[pk.item].element].color : RELICS[pk.item].color;
    draws.push({
      depth: depthOf(pk.x, pk.y),
      fn: () => {
        sprite(ctx, g.art.pedestal, s.x - 6, s.y - 10);
        const bob = Math.round(Math.sin(g.time * 3 + pk.x) * 2);
        // soft diamond glow behind the item
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(g.time * 4);
        const gy = s.y - 19 + bob;
        for (let i = -7; i <= 7; i++) {
          const hw = 8 - Math.abs(i);
          ctx.fillRect(Math.round(s.x - hw), Math.round(gy + i), hw * 2, 1);
        }
        ctx.globalAlpha = 1;
        sprite(ctx, icon, s.x - 4, s.y - 23 + bob);
        if (Math.random() < 0.08) g.spark(pk.x, pk.y, color, 1, 0.6);
      },
    });
  }

  for (const h of g.herbs) {
    const s = S(h.x, h.y);
    draws.push({ depth: depthOf(h.x, h.y), fn: () => sprite(ctx, g.art.icons.herb, s.x - 4, s.y - 8 + Math.round(Math.sin(g.time * 4) * 1)) });
  }

  for (const e of g.enemies) {
    const es = S(e.x, e.y, (e.def.float ?? 0) + (e.def.float ? Math.sin(e.animT * 3) * 2 : 0));
    const frames = g.art.enemies[e.def.sprite][e.faceLeft ? 'left' : 'right'];
    const moving = e.state !== 'stun' && e.state !== 'windup';
    const f = frames[moving ? Math.floor(e.animT * 5) % 2 : 0];
    let jitter = 0;
    if (e.state === 'windup') jitter = Math.round(Math.sin(g.time * 60));
    const flash = e.flash > 0 || (e.state === 'windup' && Math.floor(g.time * 12) % 2 === 0);
    draws.push({
      depth: depthOf(e.x, e.y),
      fn: () => {
        sprite(ctx, f, es.x - f.w / 2 + jitter, es.y - f.h, flash);
        // element pip + hp bar
        const top = es.y - f.h - 5;
        const col = ELEMENT_INFO[e.def.element];
        ctx.fillStyle = '#1a1626';
        ctx.fillRect(es.x - 2, top - 1, 5, 4);
        ctx.fillStyle = col.color;
        ctx.fillRect(es.x - 1, top, 3, 2);
        if (e.hp < e.def.hp) {
          const w = 14;
          ctx.fillStyle = '#1a1626';
          ctx.fillRect(es.x - w / 2 - 1, top + 4, w + 2, 3);
          ctx.fillStyle = '#d94a4a';
          ctx.fillRect(es.x - w / 2, top + 5, Math.max(1, Math.round((w * e.hp) / e.def.hp)), 1);
        }
        if (e.state === 'stun') {
          for (let i = 0; i < 3; i++) {
            const a = g.time * 6 + (i * Math.PI * 2) / 3;
            ctx.fillStyle = '#ffe066';
            ctx.fillRect(Math.round(es.x + Math.cos(a) * 6), Math.round(top - 3 + Math.sin(a) * 2), 1, 1);
          }
        }
      },
    });
  }

  if (g.state !== 'dead') {
    const frames = g.art.thistle.frames[p.facing];
    const step = p.moving ? 1 + (Math.floor(p.animT * 8) % 2) : 0;
    const f = frames[step];
    const bob = p.moving && step === 1 ? -1 : 0;
    const hurtBlink = p.iframes > 0 && p.dodgeT <= 0 && p.lungeT <= 0 && Math.floor(g.time * 20) % 2 === 0;
    const alpha = p.dodgeT > 0 ? 0.55 : hurtBlink ? 0.4 : 1;
    draws.push({
      depth: pDepth,
      fn: () => {
        sprite(ctx, f, ps.x - f.w / 2, ps.y - f.h + 1 + bob, p.flash > 0, alpha);
        // a hint of the weapon in hand
        const w = g.weapon;
        const icon = g.art.icons[w.id];
        if (icon && p.dodgeT <= 0) {
          const side = p.facing === 'left' ? -1 : 1;
          const behind = p.facing === 'up';
          if (!behind) sprite(ctx, icon, ps.x + side * 5 - 4, ps.y - 13 + bob, false, 0.95);
        }
      },
    });
  }

  for (const pr of g.projectiles) {
    const s = S(pr.x, pr.y, 8);
    const col = ELEMENT_INFO[pr.element];
    draws.push({
      depth: depthOf(pr.x, pr.y),
      fn: () => {
        ctx.fillStyle = col.dark;
        ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 5, 5);
        ctx.fillStyle = col.color;
        ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      },
    });
  }

  for (const sw of g.swings) {
    draws.push({
      depth: depthOf(sw.x, sw.y) + 0.05,
      fn: () => {
        const prog = sw.t / sw.dur;
        const from = sw.angle - sw.arc / 2;
        const sweep = sw.arc * Math.min(1, prog * 1.6);
        const n = 14;
        for (let i = 0; i <= n; i++) {
          const a = from + (sweep * i) / n;
          for (let r = 0.45; r <= sw.range; r += 0.22) {
            if (hash2(i, Math.round(r * 10), Math.floor(sw.t * 60)) < 0.35 + prog * 0.4) continue;
            const pt = S(sw.x + Math.cos(a) * r, sw.y + Math.sin(a) * r, 8);
            ctx.fillStyle = r > sw.range - 0.3 ? '#ffffff' : sw.color;
            ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 1, 1);
          }
        }
      },
    });
  }

  for (const pt of g.particles) {
    const s = S(pt.x, pt.y, pt.z);
    draws.push({
      depth: depthOf(pt.x, pt.y) + 0.01,
      fn: () => {
        ctx.globalAlpha = Math.min(1, pt.life / pt.max + 0.3);
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), pt.size, pt.size);
        ctx.globalAlpha = 1;
      },
    });
  }

  draws.sort((a, b) => a.depth - b.depth);
  for (const d of draws) d.fn();

  // a bobbing arrow over the tower stairs so the way down is obvious
  if (g.mapId === 'tower') {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++)
        if (m.ground[y * m.w + x] === 'stairs') {
          sx += x + 0.5;
          sy += y + 0.5;
          n++;
        }
    if (n) {
      const c = S(sx / n, sy / n, 16 + Math.round(Math.sin(g.time * 4) * 2));
      const cx = Math.round(c.x);
      const cy = Math.round(c.y);
      ctx.fillStyle = '#1a1626';
      ctx.fillRect(cx - 2, cy - 7, 5, 6);
      for (let i = 0; i < 5; i++) ctx.fillRect(cx - 5 + i, cy - 2 + i, 11 - i * 2, 1);
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(cx - 1, cy - 6, 3, 5);
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 3 + i, cy - 1 + i, 7 - i * 2, 1);
    }
  }

  // --- floating combat text -------------------------------------------------
  for (const f of g.floaters) {
    const s = S(f.x, f.y, f.z + f.t * 30);
    ctx.globalAlpha = Math.min(1, (0.9 - f.t) * 3);
    drawText(ctx, f.text, s.x, s.y, { color: f.color, align: 'center', scale: f.scale });
    ctx.globalAlpha = 1;
  }

  // --- lighting -------------------------------------------------------------
  if (g.mapId === 'tower') {
    const c = S(g.maps.tower.spawnPoint.x, g.maps.tower.spawnPoint.y - 1.1, 20);
    ctx.globalCompositeOperation = 'lighter';
    const r = 70 + Math.sin(g.time * 2) * 6;
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    grad.addColorStop(0, 'rgba(140, 90, 220, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (g.darkness > 0.01) {
    const c = S(p.x, p.y, 10);
    const inner = 14 + (1 - g.darkness) * 200;
    const grad = ctx.createRadialGradient(c.x, c.y, inner, c.x, c.y, inner + 40);
    grad.addColorStop(0, 'rgba(6, 12, 10, 0)');
    grad.addColorStop(1, `rgba(6, 12, 10, ${0.97 * g.darkness})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  // gentle vignette
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,4,12,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // --- signposts ------------------------------------------------------------
  if (g.signText) {
    const s = S(g.signText.x, g.signText.y, 34);
    panel(ctx, s.x, s.y - 16, [g.signText.title, ...wrap(g.signText.body, 34)], ['#ffe066']);
  }

  // --- enemy hover info -----------------------------------------------------
  const mw = g.mouseWorld();
  for (const e of g.enemies) {
    if (Math.hypot(e.x - mw.x, e.y - mw.y) < 0.8) {
      const s = S(e.x, e.y, 34);
      const weak = weaknessesOf(e.def.element).map((x) => ELEMENT_INFO[x].name).join('/');
      panel(ctx, s.x, s.y - 14, [e.def.name, `${ELEMENT_INFO[e.def.element].name} - weak to ${weak}`], [ELEMENT_INFO[e.def.element].color, '#b8b2c2']);
      break;
    }
  }

  drawHud(g, ctx);
}

function panel(ctx: CanvasRenderingContext2D, cx: number, bottom: number, lines: string[], colors: string[]) {
  const w = Math.max(...lines.map((l) => textWidth(l))) + 8;
  const h = lines.length * 7 + 5;
  const x = Math.round(cx - w / 2);
  const y = Math.round(bottom - h);
  ctx.fillStyle = 'rgba(16, 13, 28, 0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3d3552';
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  lines.forEach((l, i) => drawText(ctx, l, cx, y + 3 + i * 7, { align: 'center', color: colors[i] ?? '#d8d2e2', shadow: null }));
}

function drawHud(g: Game, ctx: CanvasRenderingContext2D) {
  const p = g.player;

  // health
  drawText(ctx, 'Thistle', 8, 7, { color: '#8fd46a' });
  const bw = 84;
  ctx.fillStyle = '#1a1626';
  ctx.fillRect(7, 14, bw + 2, 7);
  ctx.fillStyle = '#3d1a22';
  ctx.fillRect(8, 15, bw, 5);
  const fill = Math.max(0, Math.round((bw * p.hp) / p.maxHp));
  ctx.fillStyle = '#d94a4a';
  ctx.fillRect(8, 15, fill, 5);
  ctx.fillStyle = '#ff8a8a';
  ctx.fillRect(8, 15, fill, 1);
  drawText(ctx, `${Math.ceil(Math.max(0, p.hp))}/${p.maxHp}`, bw + 13, 15, { color: '#f4eedd' });

  // relics
  g.save.relics.forEach((id, i) => {
    const icon = g.art.icons[id];
    if (icon) ctx.drawImage(icon.canvas, 8 + i * 11, 24);
  });

  // where am I
  drawText(ctx, g.map.name, VIEW_W - 8, 7, { align: 'right', color: '#c9a24a' });
  drawText(ctx, `Run ${g.save.runs}`, VIEW_W - 8, 15, { align: 'right', color: '#8a8494' });
  drawText(ctx, 'H - help', VIEW_W - 8, 23, { align: 'right', color: '#5d566a' });

  // weapon slots
  const loadout = g.loadout;
  const size = 22;
  const gap = 3;
  const total = LOADOUT_SLOTS * size + (LOADOUT_SLOTS - 1) * gap;
  const x0 = Math.round((VIEW_W - total) / 2);
  const y0 = VIEW_H - size - 6;
  for (let i = 0; i < LOADOUT_SLOTS; i++) {
    const x = x0 + i * (size + gap);
    const w = loadout[i];
    const sel = w && i === p.slot;
    const col = w ? ELEMENT_INFO[w.element] : null;
    ctx.fillStyle = sel ? col!.color : col ? col.dark : '#2a2438';
    ctx.fillRect(x - 1, y0 - 1, size + 2, size + 2);
    ctx.fillStyle = sel ? '#2a2240' : 'rgba(20, 16, 32, 0.9)';
    ctx.fillRect(x, y0, size, size);
    if (w) {
      const icon = g.art.icons[w.id];
      ctx.globalAlpha = sel ? 1 : 0.6;
      ctx.drawImage(icon.canvas, x + 2, y0 + 2, 18, 18);
      ctx.globalAlpha = 1;
      if (sel && p.attackCd > 0) {
        const cd = Math.round((size * p.attackCd) / w.cooldown);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, y0 + size - cd, size, cd);
      }
    }
    drawText(ctx, String(i + 1), x + 1, y0 + 1, { color: sel ? '#ffffff' : '#8a8494' });
  }
  const w = g.weapon;
  const el = ELEMENT_INFO[w.element];
  drawText(ctx, `${w.name}  -  ${el.name}`, VIEW_W / 2, y0 - 9, { align: 'center', color: el.color });

  // dodge pip
  const ready = p.dodgeCd <= 0;
  ctx.fillStyle = ready ? '#8ee3ff' : '#2f4a5a';
  ctx.fillRect(x0 + total + 6, y0 + size - 5, 4, 4);
  drawText(ctx, 'dodge', x0 + total + 12, y0 + size - 5, { color: ready ? '#8ee3ff' : '#4a5a66' });

  // interaction prompt
  if (g.interactPrompt) {
    drawText(ctx, g.interactPrompt, VIEW_W / 2, y0 - 22, { align: 'center', color: '#ffe066' });
  }

  // toasts
  g.toasts.forEach((t, i) => {
    const a = Math.min(1, t.t * 4, (t.dur - t.t) * 2);
    ctx.globalAlpha = Math.max(0, a);
    const y = 34 + i * 22;
    const lines = t.sub ? wrap(t.sub, 70) : [];
    const w = Math.max(textWidth(t.title, 1), ...lines.map((l) => textWidth(l))) + 14;
    const h = 10 + lines.length * 7 + 3;
    ctx.fillStyle = 'rgba(16, 13, 28, 0.82)';
    ctx.fillRect(Math.round(VIEW_W / 2 - w / 2), y - 3, Math.round(w), h);
    ctx.fillStyle = t.color;
    ctx.fillRect(Math.round(VIEW_W / 2 - w / 2), y - 3, 2, h);
    drawText(ctx, t.title, VIEW_W / 2, y, { align: 'center', color: t.color });
    lines.forEach((l, j) => drawText(ctx, l, VIEW_W / 2, y + 9 + j * 7, { align: 'center', color: '#c8c2d4' }));
    ctx.globalAlpha = 1;
  });

  if (g.showHelp) drawHelp(ctx);

  // death
  if (g.state === 'dead') {
    ctx.fillStyle = `rgba(20, 6, 16, ${Math.min(0.7, g.deadT * 0.5)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (g.deadT > 0.6) {
      drawText(ctx, 'Thistle has fallen...', VIEW_W / 2, VIEW_H / 2 - 12, { align: 'center', color: '#d94a4a', scale: 2 });
      if (g.deadT > 1.3) drawText(ctx, '...but the artifact is not done with you.', VIEW_W / 2, VIEW_H / 2 + 6, { align: 'center', color: '#c9a0ff' });
    }
  }

  // fade
  if (g.fade) {
    const k = g.fade.t / g.fade.dur;
    ctx.fillStyle = `rgba(8, 6, 16, ${1 - Math.abs(k * 2 - 1)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (g.state === 'intro') drawIntro(g, ctx);
}

function drawHelp(ctx: CanvasRenderingContext2D) {
  const lines: [string, string][] = [
    ['WASD', 'move'],
    ['Mouse', 'aim'],
    ['Left click', 'attack (hold to keep swinging)'],
    ['Space / Shift / RMB', 'dodge'],
    ['1-4 / Wheel / Q', 'switch weapon'],
    ['E', 'pick things up'],
    ['H', 'toggle this help'],
    ['F9 twice', 'erase save'],
  ];
  const w = 222;
  const h = lines.length * 8 + 34;
  const x = 8;
  const y = VIEW_H - h - 40;
  ctx.fillStyle = 'rgba(16, 13, 28, 0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5dbb4a';
  ctx.fillRect(x, y, w, 1);
  drawText(ctx, 'How to play', x + 6, y + 5, { color: '#8fd46a' });
  lines.forEach(([k, v], i) => {
    drawText(ctx, k, x + 6, y + 15 + i * 8, { color: '#ffe066' });
    drawText(ctx, v, x + 92, y + 15 + i * 8, { color: '#d8d2e2' });
  });
  drawText(ctx, 'Hover an enemy to see its weakness.', x + 6, y + h - 10, { color: '#8a8494' });
}

function drawIntro(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(8, 6, 16, 0.86)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const t = g.time;
  drawText(ctx, 'ThistleQuest', VIEW_W / 2, 40, { align: 'center', color: '#5dbb4a', scale: 4 });
  const story = [
    "The Wizard's tower fell in a single night.",
    '',
    'Raiders stormed the high chamber. The Wizard fought, and lost -',
    'but before they dragged him away, he hurled his most precious',
    'artifact to the only other soul in the room: you, Thistle,',
    'his humble famulus. Keeper of brooms. Duster of spellbooks.',
    '',
    'Now the tower is silent, the Wizard is gone,',
    'and the artifact will not let you die. Not for good, anyway.',
  ];
  story.forEach((l, i) => drawText(ctx, l, VIEW_W / 2, 84 + i * 9, { align: 'center', color: '#d8d2e2' }));
  if (Math.floor(t * 2) % 2 === 0) drawText(ctx, 'Click or press any key', VIEW_W / 2, 200, { align: 'center', color: '#ffe066' });
  const frames = g.art.thistle.frames.down;
  const f = frames[Math.floor(t * 4) % 3];
  ctx.drawImage(f.canvas, VIEW_W / 2 - f.w, 215, f.w * 2, f.h * 2);
}
