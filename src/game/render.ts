import { depthOf, project, type Vec } from '../engine/iso';
import { drawBeetle, drawImp, drawWisp, creatureBadge, type CreaturePose } from '../paint/creatures';
import { drawInventory } from '../paint/inventory';
import { glow, groundShadow, makeCanvas, rgba, type Ctx, type Proj } from '../paint/kit';
import { buildTowerScene } from '../paint/room';
import { buildValleyScene } from '../paint/outdoor';
import { bake, type Scene, type SceneSprite } from '../paint/scene';
import { drawThistle, type ThistlePose } from '../paint/thistle';
import { healthBar, measure, panel, parchment, slot, text, wrapText, FONT_TITLE } from '../paint/ui';
import { itemIcon, weaponIcon } from '../paint/weaponArt';
import { ELEMENT_INFO, weaknessesOf } from './elements';
import type { Enemy } from './entities';
import { VIEW_H, VIEW_W, ZOOM, type Game } from './game';
import { RELICS } from './relics';
import { LOADOUT_SLOTS, WEAPONS } from './weapons';
import type { MapId } from './world';

type Draw = { depth: number; fn: () => void };

const LIGHT_DIV = 4;

export class Renderer {
  private scenes: Partial<Record<MapId, Scene>> = {};
  private light = makeCanvas(VIEW_W / LIGHT_DIV, VIEW_H / LIGHT_DIV);
  private vignette = makeVignette();
  private fx = makeCanvas(400, 400); // offscreen for flashing / translucent characters
  private pedestal = bake(0, 0, [-0.4, -0.4, 0, 0.4, 0.4, 0.8], (ctx, P) => paintPedestal(ctx, P), 10);

  constructor(private g: Game) {}

  scene(id: MapId): Scene {
    return (this.scenes[id] ??= id === 'tower' ? buildTowerScene(this.g.maps.tower) : buildValleyScene(this.g.maps.valley));
  }

  draw(ctx: Ctx, pixelScale: number) {
    const g = this.g;
    const t = g.time;
    const sc = this.scene(g.mapId);
    const shake = g.shake > 0 ? g.shake : 0;
    const camX = g.camX + (Math.random() - 0.5) * shake;
    const camY = g.camY + (Math.random() - 0.5) * shake;
    // world-screen (projected px) -> view px
    const toView = (p: Vec) => ({ x: (p.x - camX) * ZOOM + VIEW_W / 2, y: (p.y - camY) * ZOOM + VIEW_H / 2 });
    const S: Proj = (x, y, z = 0) => project(x, y, z);
    const world = (fn: () => void) => {
      ctx.save();
      ctx.translate(VIEW_W / 2, VIEW_H / 2);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-camX, -camY);
      fn();
      ctx.restore();
    };
    const view = {
      x0: camX - VIEW_W / 2 / ZOOM - 150,
      x1: camX + VIEW_W / 2 / ZOOM + 150,
      y0: camY - VIEW_H / 2 / ZOOM - 150,
      y1: camY + VIEW_H / 2 / ZOOM + 400,
    };

    sc.backdrop(ctx, t);

    const p = g.player;
    const pS = S(p.x, p.y, p.z);
    const pDepth = depthOf(p.x, p.y);

    world(() => {
      // blit only the visible part of the (large) background
      const bg = sc.bg;
      const sx0 = Math.max(0, (view.x0 + 150 + bg.ox) * bg.scale);
      const sy0 = Math.max(0, (view.y0 + 150 + bg.oy) * bg.scale);
      const sx1 = Math.min(bg.canvas.width, (view.x1 - 150 + bg.ox) * bg.scale);
      const sy1 = Math.min(bg.canvas.height, (view.y1 - 400 + bg.oy) * bg.scale);
      if (sx1 > sx0 && sy1 > sy0) {
        ctx.drawImage(bg.canvas, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0 / bg.scale - bg.ox, sy0 / bg.scale - bg.oy, (sx1 - sx0) / bg.scale, (sy1 - sy0) / bg.scale);
      }
      sc.under?.(ctx, S, t);

      // contact shadows
      if (g.state !== 'dead') groundShadow(ctx, pS.x, pS.y, 26, 0.45);
      for (const e of g.enemies) {
        const s = S(e.x, e.y);
        groundShadow(ctx, s.x, s.y, e.def.radius * 90, e.def.float ? 0.25 : 0.4);
      }

      const draws: Draw[] = [];
      const playerRect = { x: pS.x - 30, y: pS.y - 120, w: 60, h: 120 };
      for (const sp of sc.sprites) {
        const a = S(sp.x, sp.y);
        const x = a.x - sp.ox;
        const y = a.y - sp.oy;
        const w = sp.canvas.width / sp.scale;
        const h = sp.canvas.height / sp.scale;
        if (x > view.x1 || x + w < view.x0 || y > view.y1 || y + h < view.y0) continue;
        let alpha = 1;
        if (sp.fades && sp.depth > pDepth && g.state !== 'dead') {
          const ov = x < playerRect.x + playerRect.w && x + w > playerRect.x && y < playerRect.y + playerRect.h && y + h > playerRect.y;
          if (ov && overlapsOpaque(sp, playerRect.x + playerRect.w / 2 - x, playerRect.y + playerRect.h / 2 - y)) alpha = 0.35;
        }
        draws.push({
          depth: sp.depth,
          fn: () => {
            if (alpha < 1) ctx.globalAlpha = alpha;
            ctx.drawImage(sp.canvas, x, y, w, h);
            ctx.globalAlpha = 1;
            sp.anim?.(ctx, S, t);
          },
        });
      }

      for (const pk of g.pickups) {
        const s = S(pk.x, pk.y);
        const color = pk.kind === 'weapon' ? ELEMENT_INFO[WEAPONS[pk.item].element].color : RELICS[pk.item].color;
        draws.push({
          depth: depthOf(pk.x, pk.y),
          fn: () => {
            const pd = this.pedestal;
            ctx.drawImage(pd.canvas, s.x - pd.ox, s.y - pd.oy, pd.canvas.width / pd.scale, pd.canvas.height / pd.scale);
            const bob = Math.sin(t * 2.5 + pk.x) * 4;
            const cy = s.y - 70 + bob;
            glow(ctx, s.x, cy, 40, color, 0.45 + Math.sin(t * 3) * 0.1);
            // slow spin: squash horizontally
            ctx.save();
            ctx.translate(s.x, cy);
            ctx.scale(0.55 + 0.45 * Math.abs(Math.cos(t * 1.2)), 1);
            if (pk.kind === 'weapon') weaponIcon(ctx, pk.item, 0, 0, 46, t);
            else itemIcon(ctx, pk.item, 0, 0, 40);
            ctx.restore();
            if (Math.random() < 0.1) g.spark(pk.x, pk.y, color, 1, 0.6);
          },
        });
      }

      for (const h of g.herbs) {
        const s = S(h.x, h.y);
        draws.push({ depth: depthOf(h.x, h.y), fn: () => itemIcon(ctx, 'herb', s.x, s.y - 12 + Math.sin(t * 4) * 2, 28) });
      }

      for (const e of g.enemies) {
        draws.push({ depth: depthOf(e.x, e.y), fn: () => this.drawEnemy(ctx, S, e, pixelScale) });
      }

      if (g.state !== 'dead') {
        draws.push({ depth: pDepth, fn: () => this.drawPlayer(ctx, S, pixelScale) });
      }

      for (const pr of g.projectiles) {
        const s = S(pr.x, pr.y, 1.1);
        const col = ELEMENT_INFO[pr.element];
        draws.push({
          depth: depthOf(pr.x, pr.y),
          fn: () => {
            const tail = S(pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05, 1.1);
            glow(ctx, s.x, s.y, 26, col.color, 0.7);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = rgba(col.color, 0.7);
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          },
        });
      }

      for (const sw of g.swings) {
        draws.push({ depth: depthOf(sw.x, sw.y) + 0.05, fn: () => drawSwing(ctx, S, sw.x, sw.y, sw.angle, sw.arc, sw.range, sw.t / sw.dur, sw.color, p.z) });
      }

      for (const pt of g.particles) {
        const s = S(pt.x, pt.y);
        draws.push({
          depth: depthOf(pt.x, pt.y) + 0.01,
          fn: () => {
            const a = Math.min(1, pt.life / pt.max + 0.2);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = rgba(toHex(pt.color), a);
            ctx.beginPath();
            ctx.arc(s.x, s.y - pt.z * 1.6, pt.size * 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          },
        });
      }

      draws.sort((a, b) => a.depth - b.depth);
      for (const d of draws) d.fn();
    });

    // --- lighting ------------------------------------------------------------
    if (sc.ambient) {
      const lctx = this.light.getContext('2d')!;
      lctx.globalCompositeOperation = 'source-over';
      lctx.fillStyle = sc.ambient;
      lctx.fillRect(0, 0, this.light.width, this.light.height);
      lctx.globalCompositeOperation = 'lighter';
      const lights = [...sc.lights];
      // Thistle carries a faint glow from the artifact
      lights.push({ x: p.x, y: p.y, z: p.z + 1, r: 190, color: '#7a9a6a', i: 0.35 });
      for (const pr of g.projectiles) lights.push({ x: pr.x, y: pr.y, z: 1, r: 120, color: ELEMENT_INFO[pr.element].color, i: 0.5 });
      for (const L of lights) {
        const v = toView(S(L.x, L.y, L.z));
        const flick = L.flicker ? 1 + Math.sin(t * 11 + L.x * 3) * L.flicker + Math.sin(t * 23 + L.y) * L.flicker * 0.5 : 1;
        const r = (L.r * ZOOM * flick) / LIGHT_DIV;
        const x = v.x / LIGHT_DIV;
        const y = v.y / LIGHT_DIV;
        if (x + r < 0 || y + r < 0 || x - r > this.light.width || y - r > this.light.height) continue;
        const grd = lctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, rgba(L.color, Math.min(1, L.i * flick)));
        grd.addColorStop(0.5, rgba(L.color, L.i * 0.35 * flick));
        grd.addColorStop(1, rgba(L.color, 0));
        lctx.fillStyle = grd;
        lctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.light, 0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
    world(() => sc.over?.(ctx, S, t));

    // Mistfen: sight shrinks to a small circle
    if (g.darkness > 0.01) {
      const c = toView(S(p.x, p.y, p.z + 1));
      const inner = 60 + (1 - g.darkness) * 700;
      const grd = ctx.createRadialGradient(c.x, c.y, inner, c.x, c.y, inner + 140);
      grd.addColorStop(0, 'rgba(6,12,10,0)');
      grd.addColorStop(1, `rgba(6,12,10,${0.97 * g.darkness})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // vignette
    ctx.drawImage(this.vignette, 0, 0, VIEW_W, VIEW_H);

    // --- floating text ----------------------------------------------------------
    for (const f of g.floaters) {
      const v = toView(S(f.x, f.y, 1.6 + f.t * 1.2));
      const a = Math.min(1, (0.9 - f.t) * 3);
      text(ctx, f.text, v.x, v.y - f.z * 0.3, { size: f.scale > 1 ? 30 : 20, font: FONT_TITLE, weight: '700', color: f.color, align: 'center', stroke: 'rgba(20,10,10,0.85)', alpha: a });
    }

    if (g.signText) {
      const v = toView(S(g.signText.x, g.signText.y, 2.2));
      const lines = wrapText(ctx, g.signText.body, 240, 16);
      const w = Math.max(measure(ctx, g.signText.title, 20, FONT_TITLE, '700'), ...lines.map((l) => measure(ctx, l, 16))) + 50;
      const h = 34 + lines.length * 20;
      parchment(ctx, v.x - w / 2, v.y - h, w, h);
      text(ctx, g.signText.title, v.x, v.y - h + 25, { size: 20, font: FONT_TITLE, weight: '700', color: '#4a2a14', align: 'center', shadow: false });
      lines.forEach((l, i) => text(ctx, l, v.x, v.y - h + 48 + i * 20, { size: 16, color: '#3a2a1a', align: 'center', shadow: false }));
    }

    // hover an enemy to learn its weakness
    if (!g.inventoryOpen) {
      const mw = g.mouseWorld();
      for (const e of g.enemies) {
        if (Math.hypot(e.x - mw.x, e.y - mw.y) < 0.9) {
          const v = toView(S(e.x, e.y, 2));
          const el = ELEMENT_INFO[e.def.element];
          const weak = weaknessesOf(e.def.element).map((x) => ELEMENT_INFO[x]);
          const w = 230;
          ctx.fillStyle = 'rgba(16,13,24,0.88)';
          ctx.beginPath();
          ctx.roundRect(v.x - w / 2, v.y - 62, w, 52, 6);
          ctx.fill();
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          text(ctx, e.def.name, v.x, v.y - 40, { size: 18, font: FONT_TITLE, weight: '700', color: el.color, align: 'center' });
          text(ctx, `${el.name}  ·  weak to ${weak.map((x) => x.name).join(', ')}`, v.x, v.y - 19, { size: 15, color: '#d8d0e0', align: 'center' });
          break;
        }
      }
    }

    this.drawHud(ctx);
    if (g.inventoryOpen) drawInventory(ctx, g, t);
    this.drawOverlays(ctx);
  }

  // -------------------------------------------------------------------------
  // Characters
  // -------------------------------------------------------------------------

  private thistlePose(): ThistlePose {
    const g = this.g;
    const p = g.player;
    const w = g.weapon;
    const atkDur = Math.min(0.3, w.cooldown * 0.9);
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      facing: p.faceAngle,
      walk: p.walkPhase,
      speed: p.dodgeT > 0 ? 0 : p.speed,
      t: g.time,
      weapon: w.id,
      attack: p.attackT < atkDur ? Math.max(0.001, p.attackT / atkDur) : 0,
      attackKind: w.kind,
      dodge: p.dodgeT > 0 ? 1 - p.dodgeT / 0.17 : 0,
      velX: p.velX,
      velY: p.velY,
    };
  }

  private drawPlayer(ctx: Ctx, S: Proj, pixelScale: number) {
    const g = this.g;
    const p = g.player;
    const pose = this.thistlePose();
    const hurt = p.iframes > 0 && p.dodgeT <= 0 && p.lungeT <= 0 && Math.floor(g.time * 16) % 2 === 0;
    if (p.dodgeT > 0 || p.lungeT > 0) {
      // afterimages
      for (let k = 3; k >= 1; k--) {
        const ghost = { ...pose, x: p.x - p.velX * 0.018 * k, y: p.y - p.velY * 0.018 * k };
        this.withFx(ctx, S, ghost.x, ghost.y, pixelScale, 0.18, null, (c, s2) => drawThistle(c, s2, ghost));
      }
    }
    if (p.flash > 0 || hurt) this.withFx(ctx, S, p.x, p.y, pixelScale, hurt ? 0.55 : 1, p.flash > 0 ? '#ffffff' : null, (c, s2) => drawThistle(c, s2, pose));
    else drawThistle(ctx, S, pose);
  }

  private drawEnemy(ctx: Ctx, S: Proj, e: Enemy, pixelScale: number) {
    const g = this.g;
    const pose: CreaturePose = {
      x: e.x,
      y: e.y,
      facing: e.faceAngle,
      t: e.animT,
      moving: e.moving,
      windup: e.state === 'windup' ? 1 - Math.max(0, e.t) / e.windupDur : 0,
      stunned: e.state === 'stun',
    };
    const paint = (c: Ctx, s2: Proj) => {
      if (e.def.sprite === 'wisp') drawWisp(c, s2, pose);
      else if (e.def.sprite === 'beetle') drawBeetle(c, s2, pose);
      else drawImp(c, s2, pose);
    };
    if (e.flash > 0) this.withFx(ctx, S, e.x, e.y, pixelScale, 1, '#ffffff', paint);
    else paint(ctx, S);
    const top = S(e.x, e.y, e.def.sprite === 'imp' ? 1.55 : e.def.sprite === 'wisp' ? 1.3 : 1.15);
    creatureBadge(ctx, top.x, top.y, ELEMENT_INFO[e.def.element].color, e.hp / e.def.hp, e.state === 'stun', g.time);
  }

  /** Paint via an offscreen canvas so the result can be tinted or faded as one piece. */
  private withFx(ctx: Ctx, S: Proj, x: number, y: number, pixelScale: number, alpha: number, tint: string | null, paint: (c: Ctx, s2: Proj) => void) {
    const W = 200;
    const H = 200;
    const K = Math.min(3, pixelScale * ZOOM);
    const fx = this.fx;
    if (fx.width < W * K || fx.height < H * K) {
      fx.width = Math.ceil(W * K);
      fx.height = Math.ceil(H * K);
    }
    const c = fx.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, fx.width, fx.height);
    c.setTransform(K, 0, 0, K, 0, 0);
    const a = S(x, y, 0);
    const s2: Proj = (wx, wy, wz = 0) => {
      const q = S(wx, wy, wz);
      return { x: q.x - a.x + W / 2, y: q.y - a.y + H * 0.8 };
    };
    paint(c, s2);
    if (tint) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = rgba(tint, 0.85);
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(fx, 0, 0, W * K, H * K, a.x - W / 2, a.y - H * 0.8, W, H);
    ctx.restore();
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------

  private drawHud(ctx: Ctx) {
    const g = this.g;
    const p = g.player;
    const t = g.time;
    if (g.state === 'intro') return;

    // health
    text(ctx, 'Thistle', 40, 38, { size: 22, font: FONT_TITLE, weight: '700', color: '#a8e08a' });
    healthBar(ctx, 40, 48, 280, 20, Math.max(0, p.hp) / p.maxHp, t);
    text(ctx, `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`, 180, 63, { size: 14, weight: '700', align: 'center', color: '#fff4e8' });
    g.save.relics.forEach((id, i) => {
      const x = 52 + i * 40;
      ctx.fillStyle = 'rgba(20,16,12,0.7)';
      ctx.beginPath();
      ctx.arc(x, 96, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = RELICS[id].color;
      ctx.lineWidth = 2;
      ctx.stroke();
      itemIcon(ctx, id, x, 96, 26);
    });

    // location
    text(ctx, g.map.name, VIEW_W - 36, 40, { size: 24, font: FONT_TITLE, weight: '700', color: '#e2c27a', align: 'right' });
    text(ctx, `Run ${g.save.runs}   ·   Tab: Armory   ·   H: Help`, VIEW_W - 36, 64, { size: 15, color: '#b8b0c4', align: 'right' });

    // weapon slots on a green-wood bar
    const size = 62;
    const gap = 10;
    const total = LOADOUT_SLOTS * size + (LOADOUT_SLOTS - 1) * gap;
    const x0 = Math.round((VIEW_W - total) / 2);
    const y0 = VIEW_H - size - 26;
    panel(ctx, x0 - 18, y0 - 14, total + 36, size + 28, { frame: 7, seed: 4, vines: true, vineScale: 0.45 });
    const loadout = g.loadout;
    for (let i = 0; i < LOADOUT_SLOTS; i++) {
      const x = x0 + i * (size + gap);
      const w = loadout[i];
      const sel = !!w && i === p.slot;
      slot(ctx, x, y0, size, { glow: sel ? ELEMENT_INFO[w.element].color : undefined, dim: !w });
      if (w) {
        ctx.save();
        ctx.globalAlpha = sel ? 1 : 0.7;
        weaponIcon(ctx, w.id, x + size / 2, y0 + size / 2, size * 0.85, t);
        ctx.restore();
        if (sel && p.attackCd > 0) {
          const cd = ((size - 6) * p.attackCd) / w.cooldown;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(x + 3, y0 + size - 3 - cd, size - 6, cd);
        }
        ctx.fillStyle = ELEMENT_INFO[w.element].color;
        ctx.beginPath();
        ctx.arc(x + size - 10, y0 + size - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, String(i + 1), x + 8, y0 + 18, { size: 14, weight: '700', color: sel ? '#ffffff' : '#a8a090' });
    }
    const w = g.weapon;
    const el = ELEMENT_INFO[w.element];
    text(ctx, `${w.name}  ·  ${el.name}`, VIEW_W / 2, y0 - 24, { size: 20, font: FONT_TITLE, weight: '700', color: el.color, align: 'center' });

    // dodge ring
    const dx = x0 + total + 58;
    const dy = y0 + size / 2;
    const ready = Math.max(0, 1 - Math.max(0, p.dodgeCd) / 0.55);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(10,10,20,0.7)';
    ctx.beginPath();
    ctx.arc(dx, dy, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = ready >= 1 ? '#8ee3ff' : '#3a6a80';
    ctx.beginPath();
    ctx.arc(dx, dy, 20, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
    ctx.stroke();
    text(ctx, 'Dodge', dx, dy + 5, { size: 13, weight: '700', color: ready >= 1 ? '#c8f2ff' : '#6a8a9a', align: 'center' });

    if (g.interactPrompt) {
      const pw = measure(ctx, g.interactPrompt, 18, FONT_TITLE, '700') + 50;
      parchment(ctx, VIEW_W / 2 - pw / 2, y0 - 84, pw, 34);
      text(ctx, g.interactPrompt, VIEW_W / 2, y0 - 61, { size: 18, font: FONT_TITLE, weight: '700', color: '#4a2a14', align: 'center', shadow: false });
    }

    // toasts
    let ty = 92;
    for (const ts of g.toasts) {
      const a = Math.max(0, Math.min(1, ts.t * 4, (ts.dur - ts.t) * 2));
      const lines = ts.sub ? wrapText(ctx, ts.sub, 520, 16) : [];
      const w2 = Math.max(measure(ctx, ts.title, 20, FONT_TITLE, '700'), ...lines.map((l) => measure(ctx, l, 16))) + 70;
      const h = 36 + lines.length * 20;
      parchment(ctx, VIEW_W / 2 - w2 / 2, ty, w2, h, a);
      text(ctx, ts.title, VIEW_W / 2, ty + 26, { size: 20, font: FONT_TITLE, weight: '700', color: darken(ts.color), align: 'center', shadow: false, alpha: a });
      lines.forEach((l, j) => text(ctx, l, VIEW_W / 2, ty + 48 + j * 20, { size: 16, color: '#3a2a1a', align: 'center', shadow: false, alpha: a }));
      ty += h + 10;
    }

    if (g.showHelp && !g.inventoryOpen) this.drawHelp(ctx);
  }

  private drawHelp(ctx: Ctx) {
    const rows: [string, string][] = [
      ['WASD', 'Move'],
      ['Mouse', 'Aim'],
      ['Left click', 'Attack (hold to keep swinging)'],
      ['Space / Shift / Right click', 'Dodge'],
      ['1-4 / Wheel / Q', 'Switch weapon'],
      ['E', 'Pick things up'],
      ['Tab', 'Armory: your weapons and relics'],
      ['H', 'Toggle this help'],
      ['F9 twice', 'Erase save'],
    ];
    const w = 470;
    const h = rows.length * 26 + 90;
    const x = 36;
    const y = VIEW_H - h - 130;
    panel(ctx, x, y, w, h, { vines: true, seed: 9 });
    text(ctx, 'How to Play', x + w / 2, y + 44, { size: 24, font: FONT_TITLE, weight: '700', color: '#f0e6c0', align: 'center' });
    rows.forEach(([k, v], i) => {
      text(ctx, k, x + 34, y + 80 + i * 26, { size: 16, weight: '700', color: '#ffe8a0' });
      text(ctx, v, x + 230, y + 80 + i * 26, { size: 16, color: '#eee6d6' });
    });
  }

  private drawOverlays(ctx: Ctx) {
    const g = this.g;
    if (g.state === 'dead') {
      ctx.fillStyle = `rgba(30,6,16,${Math.min(0.72, g.deadT * 0.5)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      if (g.deadT > 0.6) {
        text(ctx, 'Thistle has fallen…', VIEW_W / 2, VIEW_H / 2 - 20, { size: 48, font: FONT_TITLE, weight: '700', color: '#e05a5a', align: 'center', alpha: Math.min(1, (g.deadT - 0.6) * 2) });
        if (g.deadT > 1.3) text(ctx, '…but the artifact is not done with you.', VIEW_W / 2, VIEW_H / 2 + 26, { size: 22, color: '#d0b0ff', align: 'center', alpha: Math.min(1, (g.deadT - 1.3) * 2) });
      }
    }
    if (g.fade) {
      const k = g.fade.t / g.fade.dur;
      ctx.fillStyle = `rgba(8,6,16,${1 - Math.abs(k * 2 - 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (g.state === 'intro') this.drawIntro(ctx);
  }

  private drawIntro(ctx: Ctx) {
    const g = this.g;
    const t = g.time;
    ctx.fillStyle = 'rgba(8,6,16,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 820;
    const h = 480;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2 - 10;
    panel(ctx, x, y, w, h, { vines: true, seed: 12 });
    text(ctx, 'ThistleQuest', VIEW_W / 2, y + 100, { size: 64, font: FONT_TITLE, weight: '700', color: '#a8e08a', align: 'center', stroke: 'rgba(10,20,5,0.8)' });
    const story = [
      "The Wizard's tower fell in a single night.",
      'Raiders stormed the high study. The Wizard fought, and lost — but before they dragged him away, he hurled his most precious artifact to the only other soul in the room: you, Thistle, his humble famulus. Keeper of brooms. Duster of spellbooks.',
      'Now the tower is silent, the Wizard is gone, and the artifact will not let you die. Not for good, anyway.',
    ];
    let yy = y + 156;
    for (const para of story) {
      for (const l of wrapText(ctx, para, w - 160, 19)) {
        text(ctx, l, VIEW_W / 2, yy, { size: 19, color: '#f2ead6', align: 'center' });
        yy += 26;
      }
      yy += 12;
    }
    const a = 0.55 + 0.45 * Math.sin(t * 3);
    text(ctx, 'Click or press any key', VIEW_W / 2, y + h - 40, { size: 20, font: FONT_TITLE, weight: '700', color: '#ffe8a0', align: 'center', alpha: a });
  }
}

// ---------------------------------------------------------------------------

type AlphaCanvas = HTMLCanvasElement & { __alpha?: Uint8ClampedArray };

/** Rough opacity test so trees only fade when their canopy (not their empty corners) covers Thistle. */
function overlapsOpaque(sp: SceneSprite, lx: number, ly: number): boolean {
  const cv = sp.canvas as AlphaCanvas;
  if (!cv.__alpha) {
    const c = cv.getContext('2d')!;
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const a = new Uint8ClampedArray(cv.width * cv.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    cv.__alpha = a;
  }
  const cx = Math.round(lx * sp.scale);
  const cy = Math.round(ly * sp.scale);
  for (const [dx, dy] of [[0, 0], [0, -40], [0, 30], [-20, 0], [20, 0]]) {
    const x = Math.max(0, Math.min(cv.width - 1, cx + dx * sp.scale));
    const y = Math.max(0, Math.min(cv.height - 1, cy + dy * sp.scale));
    if (cv.__alpha[y * cv.width + x] > 128) return true;
  }
  return false;
}

function drawSwing(ctx: Ctx, S: Proj, x: number, y: number, angle: number, arc: number, range: number, prog: number, color: string, z: number) {
  const from = angle + arc / 2;
  const sweep = -arc * Math.min(1, prog * 1.8);
  const n = 20;
  const outer: Vec[] = [];
  const inner: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (sweep * i) / n;
    const thick = Math.sin((i / n) * Math.PI) * 0.35 + 0.05;
    outer.push(S(x + Math.cos(a) * range, y + Math.sin(a) * range, z + 0.9));
    inner.push(S(x + Math.cos(a) * (range - thick), y + Math.sin(a) * (range - thick), z + 0.85));
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - prog * 0.8;
  ctx.beginPath();
  ctx.moveTo(outer[0].x, outer[0].y);
  for (const q of outer) ctx.lineTo(q.x, q.y);
  for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
  ctx.closePath();
  const g = ctx.createLinearGradient(outer[0].x, outer[0].y, outer[n].x, outer[n].y);
  g.addColorStop(0, rgba(toHex(color), 0));
  g.addColorStop(0.6, rgba(toHex(color), 0.55));
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function paintPedestal(ctx: Ctx, P: Proj) {
  const b = P(0, 0, 0);
  groundShadow(ctx, b.x, b.y, 28, 0.4);
  const stone = ctx.createLinearGradient(b.x - 18, 0, b.x + 18, 0);
  stone.addColorStop(0, '#c9c2b8');
  stone.addColorStop(1, '#6a6460');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y - 2, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(b.x - 12, b.y - 34, 24, 32);
  ctx.beginPath();
  ctx.ellipse(b.x, b.y - 34, 17, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#d8d2c8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,24,20,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,60,90,0.6)';
  ctx.beginPath();
  ctx.moveTo(b.x - 4, b.y - 26);
  ctx.lineTo(b.x, b.y - 14);
  ctx.lineTo(b.x + 4, b.y - 26);
  ctx.stroke();
}

function toHex(c: string): string {
  return c.startsWith('#') ? c : '#ffffff';
}

/** Toast titles sit on parchment, so pull bright element colors down for contrast. */
function darken(c: string): string {
  const n = parseInt(c.slice(1), 16);
  const f = 0.55;
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

function makeVignette() {
  const c = makeCanvas(VIEW_W / 2, VIEW_H / 2);
  const ctx = c.getContext('2d')!;
  const vg = ctx.createRadialGradient(VIEW_W / 4, VIEW_H / 4, VIEW_H * 0.25, VIEW_W / 4, VIEW_H / 4, VIEW_W * 0.36);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(5,4,12,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
