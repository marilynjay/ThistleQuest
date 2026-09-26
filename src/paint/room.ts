// The Wizard's study at the top of the tower.

import { rng } from '../engine/iso';
import type { MapInfo } from '../game/world';
import { applyGrain, box, FACE, flame, glow, makeCanvas, onFace, poly, shade, valueNoise, type Ctx, type Proj } from './kit';
import {
  alchemyShelf, armchair, bookshelf, bust, crateOfBooks, dais, daisGlow, desk, fireplace, fireplaceFire, globe,
  pottedPlant, rug, scrollTable, torchStand,
} from './props';
import { bake, sprite, type Light, type Scene, type SceneSprite } from './scene';

export const WALL_H = 3.4;
const LOW_WALL = 0.5;
const STONE = '#b3a794';

/** Windows along the back walls: [wall, position along it]. Skips the chimney. */
const WINDOWS: ['y' | 'x', number][] = [
  ['y', 2.5], ['y', 4.5], ['y', 6.5], ['y', 12.5],
  ['x', 2.5], ['x', 4.5], ['x', 6.5], ['x', 8.5], ['x', 10.5], ['x', 12.5],
];
const SCONCES: ['y' | 'x', number][] = [['y', 5.5], ['y', 11.5], ['x', 5.5], ['x', 11.5]];

export function buildTowerScene(m: MapInfo): Scene {
  const dcx = m.spawnPoint.x;
  const dcy = m.spawnPoint.y;

  const bg = bake(0, 0, [0, 0, -6, 14, 14, WALL_H], (ctx, P) => {
    paintExterior(ctx, P);
    paintFloor(ctx, P, m);
    paintStairs(ctx, P);
    rug(ctx, P, 7.2, 8.2, 11.6, 11.3, 3);
    rug(ctx, P, 1.6, 9.6, 4.8, 12.6, 4);
    dais(ctx, P, dcx, dcy);
    paintWall(ctx, P, 'x');
    paintWall(ctx, P, 'y');
    paintWallTops(ctx, P);
  }, 20);

  const sprites: SceneSprite[] = [];
  const add = (s: SceneSprite) => sprites.push(s);

  add(sprite(1.5, 1.5, [1, 1, 0, 2, 2, 1.4], (c, P) => pottedPlant(c, P, 1.5, 1.5)));
  add(sprite(3, 1.3, [2, 1, 0, 4, 1.6, 2.5], (c, P) => bookshelf(c, P, 2.05, 1, 3.95, 1.55, 2.4, 1, 'x')));
  add(sprite(7.5, 1.5, [7.2, 1.2, 0, 7.8, 1.8, 2.6], (c, P) => bust(c, P, 7.5, 1.5)));
  add(
    sprite(9.5, 1.5, [7.7, 1, 0, 11.3, 2.5, WALL_H], (c, P) => fireplace(c, P, 8, 1, 11, 1.85, WALL_H - 0.01, 2), {
      depth: 9.5 + 2,
      anim: (c, S, t) => fireplaceFire(c, S, 8, 11, 1.85, t),
    }),
  );
  add(sprite(12, 1.3, [11, 1, 0, 13, 1.6, 2.5], (c, P) => bookshelf(c, P, 11.05, 1, 12.95, 1.55, 2.4, 7, 'x')));
  add(sprite(1.3, 4, [1, 3, 0, 1.6, 5, 2.4], (c, P) => alchemyShelf(c, P, 1, 3.05, 1.5, 4.95, 2.1, 4)));
  add(sprite(1.3, 9, [1, 8, 0, 1.6, 10, 2.6], (c, P) => bookshelf(c, P, 1, 8.05, 1.55, 9.95, 2.4, 9, 'y')));
  add(sprite(1.5, 11.5, [1.1, 11.1, 0, 1.9, 11.9, 1], (c, P) => crateOfBooks(c, P, 1.5, 11.5)));
  add(sprite(9.4, 8.5, [9, 8.1, 0, 9.8, 8.9, 1.6], (c, P) => armchair(c, P, 9.4, 8.45)));
  add(
    sprite(9, 9.5, [7.9, 9, 0, 10.1, 10, 1.3], (c, P) => desk(c, P, 8, 9.15, 10, 9.85), {
      anim: (c, S, t) => {
        const p = S(8.15, 9.35, 0.85 + 0.35);
        flame(c, p.x, p.y + 2, 9, t, 1);
        glow(c, p.x, p.y, 26, '#ffb060', 0.35);
      },
    }),
  );
  for (const [tx, ty] of [[7.5, 9.5], [10.5, 10.5]] as const) {
    add(
      sprite(tx, ty, [tx - 0.3, ty - 0.3, 0, tx + 0.3, ty + 0.3, 2.1], (c, P) => torchStand(c, P, tx, ty), {
        anim: (c, S, t) => {
          const p = S(tx, ty, 1.75);
          flame(c, p.x, p.y - 4, 22, t, tx);
          glow(c, p.x, p.y - 10, 50, '#ff9a40', 0.4);
        },
      }),
    );
  }
  add(sprite(11.5, 9.5, [11.1, 9.1, 0, 11.9, 9.9, 1.4], (c, P) => globe(c, P, 11.5, 9.5)));
  add(
    sprite(6, 12.5, [5, 12.1, 0, 7, 12.9, 1.2], (c, P) => scrollTable(c, P, 5.05, 12.1, 6.95, 12.85), {
      anim: (c, S, t) => {
        const p = S(6.75, 12.3, 0.78 + 0.25);
        flame(c, p.x, p.y + 1, 8, t, 4);
        glow(c, p.x, p.y, 22, '#ffb060', 0.3);
      },
    }),
  );

  // Front walls, cut away to knee height so we can see in.
  for (let x = 1; x < 14; x++) {
    if (x === 3 || x === 4) continue;
    add(sprite(x + 0.5, 13.5, [x, 13, 0, x + 1, 14, LOW_WALL], (c, P) => lowWall(c, P, x, 13, x + 1, 14)));
  }
  for (let y = 1; y < 13; y++) add(sprite(13.5, y + 0.5, [13, y, 0, 14, y + 1, LOW_WALL], (c, P) => lowWall(c, P, 13, y, 14, y + 1)));
  // the golden arch over the doorway down
  add(sprite(4, 13.5, [3, 13, 0, 5, 14, 2.8], (c, P) => doorArch(c, P), { depth: 4 + 14, fades: true }));

  const lights: Light[] = [
    { x: 9.5, y: 2.4, z: 0.4, r: 520, color: '#ff8a3d', i: 0.95, flicker: 0.12 },
    { x: dcx, y: dcy, z: 0.5, r: 330, color: '#9a6aff', i: 0.55, flicker: 0.05 },
    { x: 8.15, y: 9.35, z: 1.2, r: 200, color: '#ffb060', i: 0.6, flicker: 0.1 },
    { x: 7.5, y: 9.5, z: 1.8, r: 300, color: '#ff9a40', i: 0.7, flicker: 0.12 },
    { x: 10.5, y: 10.5, z: 1.8, r: 300, color: '#ff9a40', i: 0.7, flicker: 0.12 },
    { x: 6.75, y: 12.3, z: 1.0, r: 170, color: '#ffb060', i: 0.5, flicker: 0.1 },
  ];
  for (const [wall, pos] of SCONCES) {
    const [x, y] = wall === 'y' ? [pos, 1.15] : [1.15, pos];
    lights.push({ x, y, z: 2.2, r: 240, color: '#ffae5a', i: 0.55, flicker: 0.1 });
  }
  // moonlight pooling under each back wall
  lights.push({ x: 6, y: 2.6, z: 0, r: 420, color: '#5a78c8', i: 0.3 });
  lights.push({ x: 2.6, y: 7, z: 0, r: 460, color: '#5a78c8', i: 0.3 });

  const sky = makeSkyBackdrop();

  return {
    bg,
    sprites,
    lights,
    ambient: '#45425f',
    backdrop: (ctx, t) => {
      ctx.drawImage(sky, 0, 0, 1280, 720);
      // slow drifting clouds
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 4; i++) {
        const x = ((t * (6 + i * 2) + i * 400) % 1700) - 200;
        const y = 120 + i * 90;
        const g = ctx.createRadialGradient(x, y, 10, x, y, 180);
        g.addColorStop(0, 'rgba(120,110,170,0.8)');
        g.addColorStop(1, 'rgba(120,110,170,0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(2.2, 0.5);
        ctx.translate(-x, -y);
        ctx.fillRect(x - 180, y - 180, 360, 360);
        ctx.restore();
      }
      ctx.restore();
    },
    under: (ctx, S, t) => {
      daisGlow(ctx, S, dcx, dcy, t);
      for (const [wall, pos] of SCONCES) {
        const p = wall === 'y' ? S(pos, 1.12, 2.25) : S(1.12, pos, 2.25);
        flame(ctx, p.x, p.y, 11, t, pos);
        glow(ctx, p.x, p.y - 4, 30, '#ffb060', 0.35);
      }
    },
    over: (ctx, S, t) => {
      // moonbeams slanting in through the windows
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [wall, pos] of WINDOWS) {
        const top = wall === 'y' ? [S(pos - 0.2, 1, 2.9), S(pos + 0.2, 1, 2.9)] : [S(1, pos - 0.2, 2.9), S(1, pos + 0.2, 2.9)];
        const bot = wall === 'y' ? [S(pos + 0.9, 3.2, 0), S(pos + 1.3, 3.2, 0)] : [S(3.2, pos + 0.9, 0), S(3.2, pos + 1.3, 0)];
        const g = ctx.createLinearGradient(top[0].x, top[0].y, bot[0].x, bot[0].y);
        g.addColorStop(0, 'rgba(140,170,255,0.10)');
        g.addColorStop(1, 'rgba(140,170,255,0)');
        ctx.fillStyle = g;
        poly(ctx, [top[0], top[1], bot[1], bot[0]]);
        ctx.fill();
      }
      // drifting dust motes
      const r = rng(1);
      for (let i = 0; i < 40; i++) {
        const bx = 1.5 + r() * 11;
        const by = 1.5 + r() * 11;
        const ph = (t * 0.05 + r()) % 1;
        const p = S(bx + Math.sin(t * 0.3 + i) * 0.3, by, 0.3 + ph * 2.5);
        ctx.fillStyle = `rgba(255,230,200,${Math.sin(ph * Math.PI) * 0.35})`;
        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------

function paintExterior(ctx: Ctx, P: Proj) {
  // The tower's outer wall plunging down into the clouds below the study floor.
  const r = rng(12);
  const face = (side: 'left' | 'right') => {
    const [o, u, v] = side === 'left' ? FACE.left(0, 14, 0) : FACE.right(14, 0, 0);
    onFace(ctx, P, o, u, v, () => {
      const W = 1400;
      const H = 600;
      const base = side === 'left' ? '#5f5868' : '#48424f';
      let y = 0;
      while (y < H) {
        const rh = 22 + r() * 8;
        let x = -r() * 40;
        while (x < W) {
          const sw = 50 + r() * 40;
          ctx.fillStyle = shade(base, (r() - 0.5) * 0.2);
          ctx.fillRect(x + 1, y + 1, sw - 2, rh - 2);
          x += sw;
        }
        y += rh;
      }
      applyGrain(ctx, 0, 0, W, H, 0.3);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(15,12,30,0)');
      g.addColorStop(1, 'rgba(15,12,30,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // a lit window far below
      ctx.fillStyle = 'rgba(255,190,110,0.5)';
      ctx.fillRect(side === 'left' ? 400 : 900, 180, 14, 30);
    });
  };
  face('left');
  face('right');
}

function paintFloor(ctx: Ctx, P: Proj, m: MapInfo) {
  const noise = valueNoise(64, 3, 3);
  const r = rng(5);
  const [o, u, v] = FACE.top(0, 0, 0);
  onFace(ctx, P, o, u, v, () => {
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(100, 100, 1300, 1300);
    for (let ty = 1; ty < 14; ty++) {
      for (let tx = 1; tx < 14; tx++) {
        if (m.ground[ty * m.w + tx] === 'void') continue;
        // each tile holds a big flagstone and a pair of smaller ones, alternating
        const stones: [number, number, number, number][] =
          (tx + ty) % 2 === 0 ? [[0, 0, 100, 60], [0, 60, 50, 40], [50, 60, 50, 40]] : [[0, 0, 60, 100], [60, 0, 40, 50], [60, 50, 40, 50]];
        for (const [sx, sy, sw, sh] of stones) {
          const n = noise[((ty * 7 + sy / 10) % 64) * 64 + ((tx * 5 + sx / 10) % 64)];
          const base = shade('#6c645c', (n - 0.5) * 0.5 + (r() - 0.5) * 0.12);
          const x = tx * 100 + sx + 2;
          const y = ty * 100 + sy + 2;
          const g = ctx.createLinearGradient(x, y, x + sw, y + sh);
          g.addColorStop(0, shade(base, 0.12));
          g.addColorStop(1, shade(base, -0.12));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(x, y, sw - 4, sh - 4, 6);
          ctx.fill();
          // chipped highlight edge
          ctx.strokeStyle = 'rgba(255,240,220,0.08)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 3, y + sh - 6);
          ctx.lineTo(x + 3, y + 3);
          ctx.lineTo(x + sw - 6, y + 3);
          ctx.stroke();
          // cracks
          if (r() < 0.12) {
            ctx.strokeStyle = 'rgba(20,15,10,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let cx = x + r() * sw;
            let cy = y + r() * sh;
            ctx.moveTo(cx, cy);
            for (let k = 0; k < 4; k++) {
              cx += (r() - 0.5) * 30;
              cy += (r() - 0.5) * 30;
              ctx.lineTo(cx, cy);
            }
            ctx.stroke();
          }
        }
      }
    }
    applyGrain(ctx, 100, 100, 1300, 1300, 0.28);
    // soft shadow along the base of the back walls
    let g = ctx.createLinearGradient(0, 100, 0, 180);
    g.addColorStop(0, 'rgba(10,6,15,0.6)');
    g.addColorStop(1, 'rgba(10,6,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(100, 100, 1300, 80);
    g = ctx.createLinearGradient(100, 0, 180, 0);
    g.addColorStop(0, 'rgba(10,6,15,0.6)');
    g.addColorStop(1, 'rgba(10,6,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(100, 100, 80, 1300);
  });
}

function paintStairs(ctx: Ctx, P: Proj) {
  // steps descending out through the doorway
  for (let i = 0; i < 5; i++) {
    const z = -0.12 * (i + 1);
    const y0 = 13 + i * 0.2;
    box(ctx, P, 3, y0, z - 0.12, 5, y0 + 0.2, z, { top: shade('#6c645c', -i * 0.12), left: shade('#4a443e', -i * 0.1), right: '#2a2420' });
  }
  const g = ctx.createLinearGradient(P(4, 13).x, P(4, 13).y, P(4, 14.2).x, P(4, 14.2).y);
  g.addColorStop(0, 'rgba(10,6,15,0)');
  g.addColorStop(1, 'rgba(10,6,15,0.85)');
  ctx.fillStyle = g;
  poly(ctx, [P(3, 13, 0), P(5, 13, 0), P(5, 14, -0.7), P(3, 14, -0.7)]);
  ctx.fill();
}

function paintWall(ctx: Ctx, P: Proj, wall: 'x' | 'y') {
  // wall 'y' is the plane y=1 (runs along x); wall 'x' is the plane x=1 (runs along y)
  const [o, u, v] = wall === 'y' ? FACE.left(1, 1, WALL_H) : FACE.right(1, 1, WALL_H);
  const len = 1300;
  const H = WALL_H * 100;
  const r = rng(wall === 'y' ? 31 : 32);
  const base = wall === 'y' ? STONE : shade(STONE, -0.18);
  onFace(ctx, P, o, u, v, () => {
    // ashlar blocks
    ctx.fillStyle = shade(base, -0.45);
    ctx.fillRect(0, 0, len, H);
    let y = 18;
    let row = 0;
    while (y < H - 12) {
      const rh = 26;
      let x = row % 2 ? -30 : 0;
      while (x < len) {
        const bw = 55 + r() * 30;
        const c = shade(base, (r() - 0.5) * 0.14);
        const g = ctx.createLinearGradient(x, y, x, y + rh);
        g.addColorStop(0, shade(c, 0.08));
        g.addColorStop(1, shade(c, -0.1));
        ctx.fillStyle = g;
        ctx.fillRect(x + 1.5, y + 1.5, bw - 3, rh - 3);
        x += bw;
      }
      y += rh;
      row++;
    }
    applyGrain(ctx, 0, 0, len, H, 0.3);
    // pilasters every two tiles
    for (let px = 0; px <= len; px += 200) {
      const g = ctx.createLinearGradient(px - 14, 0, px + 14, 0);
      g.addColorStop(0, shade(base, 0.18));
      g.addColorStop(0.5, shade(base, 0.05));
      g.addColorStop(1, shade(base, -0.3));
      ctx.fillStyle = g;
      ctx.fillRect(px - 12, 18, 24, H - 30);
    }
    // gothic windows high on the wall
    for (const [w, pos] of WINDOWS) if (w === wall) gothicWindow(ctx, (pos - 1) * 100, 34, r);
    // candle sconces on the pilasters
    for (const [w, pos] of SCONCES) {
      if (w !== wall) continue;
      const sx = (pos - 1) * 100;
      ctx.fillStyle = '#2a2020';
      ctx.fillRect(sx - 2, 112, 4, 22);
      ctx.beginPath();
      ctx.ellipse(sx, 114, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(sx - 3, 100, 6, 14);
    }
    // dark wooden crown molding and baseboard, like the reference study
    const cg = ctx.createLinearGradient(0, 0, 0, 20);
    cg.addColorStop(0, '#5a3522');
    cg.addColorStop(0.5, '#3b2418');
    cg.addColorStop(1, '#22140c');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, len, 20);
    ctx.fillStyle = 'rgba(255,220,180,0.15)';
    ctx.fillRect(0, 4, len, 1.5);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, H - 12, len, 12);
    ctx.fillStyle = 'rgba(255,220,180,0.1)';
    ctx.fillRect(0, H - 12, len, 1.5);
    // ambient occlusion: darker toward the floor and into the corner
    let g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(10,6,15,0)');
    g.addColorStop(1, 'rgba(10,6,15,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, len, H);
    g = ctx.createLinearGradient(0, 0, 90, 0);
    g.addColorStop(0, 'rgba(10,6,15,0.45)');
    g.addColorStop(1, 'rgba(10,6,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 90, H);
  });
}

function gothicWindow(ctx: Ctx, cx: number, top: number, r: () => number) {
  const w = 64;
  const h = 128;
  const x = cx - w / 2;
  const arch = (px: number, py: number, pw: number, ph: number) => {
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    ctx.lineTo(px, py + pw * 0.6);
    ctx.quadraticCurveTo(px, py, px + pw / 2, py - pw * 0.25);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + pw * 0.6);
    ctx.lineTo(px + pw, py + ph);
    ctx.closePath();
  };
  // stone surround
  arch(x - 8, top + 8, w + 16, h + 8);
  ctx.fillStyle = shade(STONE, 0.15);
  ctx.fill();
  arch(x - 3, top + 12, w + 6, h + 2);
  ctx.fillStyle = '#2a2430';
  ctx.fill();
  // two lancets of night-sky glass with leading
  for (let i = 0; i < 2; i++) {
    const lx = x + i * (w / 2 + 2);
    const lw = w / 2 - 2;
    arch(lx, top + 20, lw, h - 8);
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, '#2b3a78');
    g.addColorStop(0.6, '#1c2552');
    g.addColorStop(1, '#141a3a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(10,10,20,0.8)';
    ctx.lineWidth = 1.2;
    for (let d = -h; d < h * 2; d += 10) {
      ctx.beginPath();
      ctx.moveTo(lx + d, top);
      ctx.lineTo(lx + d - h, top + h);
      ctx.moveTo(lx + d - h, top);
      ctx.lineTo(lx + d, top + h);
      ctx.stroke();
    }
    // a few stars through the glass and a stained-glass jewel
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = 'rgba(255,250,220,0.8)';
      ctx.fillRect(lx + r() * lw, top + 30 + r() * (h - 50), 1.5, 1.5);
    }
    ctx.fillStyle = i ? 'rgba(160,40,60,0.7)' : 'rgba(60,140,90,0.7)';
    ctx.beginPath();
    ctx.arc(lx + lw / 2, top + 36, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // mullion and trefoil
  ctx.fillStyle = shade(STONE, 0.1);
  ctx.fillRect(cx - 2, top + 10, 4, h + 2);
  ctx.beginPath();
  ctx.arc(cx, top + 6, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#2b3a78';
  ctx.fill();
  ctx.strokeStyle = shade(STONE, 0.1);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // sill
  ctx.fillStyle = shade(STONE, 0.25);
  ctx.fillRect(x - 12, top + h + 14, w + 24, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - 12, top + h + 20, w + 24, 4);
}

function paintWallTops(ctx: Ctx, P: Proj) {
  const beam = (x0: number, y0: number, x1: number, y1: number) =>
    box(ctx, P, x0, y0, WALL_H - 0.01, x1, y1, WALL_H + 0.06, { top: '#4a2c1c', left: '#3b2418', right: '#2a180e', edge: 'rgba(10,5,2,0.8)' });
  beam(0, 0, 14, 1);
  beam(0, 1, 1, 14);
  // cut ends of the tall walls, showing their thickness
  const endR = FACE.right(14, 0, WALL_H);
  onFace(ctx, P, endR[0], endR[1], endR[2], () => {
    ctx.fillStyle = shade(STONE, -0.4);
    ctx.fillRect(0, 0, 100, WALL_H * 100);
    applyGrain(ctx, 0, 0, 100, WALL_H * 100, 0.35);
  });
  const endL = FACE.left(0, 14, WALL_H);
  onFace(ctx, P, endL[0], endL[1], endL[2], () => {
    ctx.fillStyle = shade(STONE, -0.25);
    ctx.fillRect(0, 0, 100, WALL_H * 100);
    applyGrain(ctx, 0, 0, 100, WALL_H * 100, 0.35);
  });
}

function lowWall(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number) {
  box(ctx, P, x0, y0, -0.02, x1, y1, LOW_WALL, { top: '#8f8578', left: shade(STONE, -0.1), right: shade(STONE, -0.35), edge: 'rgba(20,12,8,0.6)', grain: 0.35 });
  // mortar line on the cut top
  const a = P(x0, y0 + 0.5, LOW_WALL);
  const b = P(x1, y0 + 0.5, LOW_WALL);
  ctx.strokeStyle = 'rgba(40,30,25,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function doorArch(ctx: Ctx, P: Proj) {
  const gold = '#c9a24a';
  // two columns and a rounded arch, standing on the cut-away wall line
  for (const x of [3.0, 4.85]) box(ctx, P, x, 13.35, 0, x + 0.15, 13.6, 2.1, { top: shade(gold, 0.3), left: gold, right: shade(gold, -0.4), edge: 'rgba(40,25,5,0.8)' });
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    pts.push(P(3.95 + Math.cos(a) * 0.93, 13.6, 2.1 + Math.sin(a) * 0.75));
  }
  const stroke = (w: number, c: string) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  };
  stroke(11, 'rgba(40,25,5,0.9)');
  stroke(8, gold);
  stroke(2.5, shade(gold, 0.45));
  // keystone
  const k = P(3.95, 13.6, 2.85);
  ctx.fillStyle = shade(gold, 0.1);
  ctx.beginPath();
  ctx.moveTo(k.x - 7, k.y - 4);
  ctx.lineTo(k.x + 7, k.y - 4);
  ctx.lineTo(k.x + 4, k.y + 10);
  ctx.lineTo(k.x - 4, k.y + 10);
  ctx.closePath();
  ctx.fill();
}

function makeSkyBackdrop(): HTMLCanvasElement {
  const c = makeCanvas(1280, 720);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#0b0a1e');
  g.addColorStop(0.5, '#1c1942');
  g.addColorStop(1, '#3a2c62');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  const r = rng(77);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,250,230,${0.2 + r() * 0.7})`;
    const s = r() < 0.9 ? 1 : 2;
    ctx.fillRect(r() * 1280, r() * 600, s, s);
  }
  // the moon
  const mg = ctx.createRadialGradient(1100, 110, 0, 1100, 110, 160);
  mg.addColorStop(0, 'rgba(220,220,255,0.35)');
  mg.addColorStop(1, 'rgba(220,220,255,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(900, 0, 380, 300);
  ctx.fillStyle = '#eeeaf8';
  ctx.beginPath();
  ctx.arc(1100, 110, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,176,200,0.5)';
  for (const [dx, dy, rr] of [[-10, -6, 7], [8, 10, 5], [12, -12, 4]]) {
    ctx.beginPath();
    ctx.arc(1100 + dx, 110 + dy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // distant mountain silhouettes and a sea of cloud
  for (const [yb, col, amp, seed] of [[560, '#241f44', 70, 1], [620, '#1a1634', 50, 2]] as const) {
    const rr = rng(seed);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 720);
    let y = yb;
    for (let x = 0; x <= 1280; x += 40) {
      y = yb - amp * 0.5 + rr() * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(1280, 720);
    ctx.fill();
  }
  const cg = ctx.createLinearGradient(0, 600, 0, 720);
  cg.addColorStop(0, 'rgba(90,80,140,0)');
  cg.addColorStop(1, 'rgba(90,80,140,0.8)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 600, 1280, 120);
  return c;
}
