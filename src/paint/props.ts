// Painted furniture and fixtures. Every painter draws in world units through a projector P,
// so the same code can paint into a cached sprite or straight onto the screen.

import { rng } from '../engine/iso';
import { applyGrain, box, FACE, flame, glow, onFace, orb, poly, shade, type Ctx, type Proj } from './kit';

const WOOD_DARK = '#3b2418';
const WOOD = '#5a3522';
const MAHOGANY = '#6b2a1c';
const BRASS = '#b8903e';
const EDGE = 'rgba(18,10,8,0.7)';

const BOOK_COLORS = ['#7a2323', '#2c4a6b', '#5b4a2a', '#2f5a3a', '#6b3a6b', '#8a6a2a', '#3a3a4a', '#8a3d22', '#4a2a1a', '#244040'];

// ---------------------------------------------------------------------------
// Bookshelf against a wall. `along` = 'x' means it stands against the y=y0 wall and faces +y.
// ---------------------------------------------------------------------------

export function bookshelf(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number, h: number, seed: number, along: 'x' | 'y') {
  box(ctx, P, x0, y0, 0, x1, y1, h, { top: shade(MAHOGANY, 0.1), left: MAHOGANY, right: shade(MAHOGANY, -0.3), edge: EDGE, grain: 0.25 });
  const r = rng(seed);
  const [origin, u, v] = along === 'x' ? FACE.left(x0, y1, h) : FACE.right(x1, y0, h);
  const width = along === 'x' ? (x1 - x0) * 100 : (y1 - y0) * 100;
  const height = h * 100;
  onFace(ctx, P, origin, u, v, () => {
    // recessed interior
    ctx.fillStyle = '#1e0e09';
    ctx.fillRect(8, 10, width - 16, height - 22);
    const shelves = Math.max(3, Math.round(h * 2.1));
    const sh = (height - 22) / shelves;
    for (let s = 0; s < shelves; s++) {
      const top = 10 + s * sh;
      // books
      let bx = 10;
      while (bx < width - 12) {
        const bw = 4 + r() * 6;
        if (bx + bw > width - 10) break;
        if (r() < 0.07) {
          bx += bw + 4; // gap
          continue;
        }
        const bh = sh * (0.55 + r() * 0.35);
        const col = BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)];
        const lean = r() < 0.08 ? 0.18 : 0;
        ctx.save();
        ctx.translate(bx, top + sh - 3);
        ctx.rotate(lean);
        const g = ctx.createLinearGradient(0, 0, bw, 0);
        g.addColorStop(0, shade(col, 0.25));
        g.addColorStop(0.5, col);
        g.addColorStop(1, shade(col, -0.4));
        ctx.fillStyle = g;
        ctx.fillRect(0, -bh, bw, bh);
        // gilt bands on the spine
        ctx.fillStyle = 'rgba(214,176,90,0.7)';
        ctx.fillRect(0.5, -bh + 3, bw - 1, 1);
        ctx.fillRect(0.5, -6, bw - 1, 1);
        ctx.restore();
        bx += bw + 0.6;
      }
      // occasional trinket: a candle stub, skull or jar
      if (r() < 0.35) {
        const tx = 14 + r() * (width - 30);
        ctx.fillStyle = r() < 0.5 ? '#d9cdb4' : '#4f7a6a';
        ctx.beginPath();
        ctx.ellipse(tx, top + sh - 7, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // shelf plank
      const pg = ctx.createLinearGradient(0, top + sh - 3, 0, top + sh + 3);
      pg.addColorStop(0, shade(MAHOGANY, 0.3));
      pg.addColorStop(1, shade(MAHOGANY, -0.35));
      ctx.fillStyle = pg;
      ctx.fillRect(6, top + sh - 3, width - 12, 5);
    }
    // carved crown and plinth
    ctx.fillStyle = shade(MAHOGANY, -0.2);
    ctx.fillRect(0, 0, width, 10);
    ctx.fillStyle = shade(MAHOGANY, 0.25);
    ctx.fillRect(0, 2, width, 2);
    ctx.fillStyle = shade(MAHOGANY, -0.35);
    ctx.fillRect(0, height - 12, width, 12);
    // side stiles
    ctx.fillStyle = shade(MAHOGANY, 0.08);
    ctx.fillRect(0, 0, 8, height);
    ctx.fillRect(width - 8, 0, 8, height);
    applyGrain(ctx, 0, 0, width, height, 0.2);
  });
}

// ---------------------------------------------------------------------------
// Alchemy cabinet with shelves of glowing jars, facing +x against the x=x0 wall.
// ---------------------------------------------------------------------------

export function alchemyShelf(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number, h: number, seed: number) {
  const wood = '#6a5040';
  box(ctx, P, x0, y0, 0, x1, y1, h, { top: shade(wood, 0.1), left: shade(wood, -0.1), right: shade(wood, -0.3), edge: EDGE, grain: 0.3 });
  const r = rng(seed);
  const width = (y1 - y0) * 100;
  const height = h * 100;
  const [o, u, v] = FACE.right(x1, y0, h);
  onFace(ctx, P, o, u, v, () => {
    ctx.fillStyle = '#231812';
    ctx.fillRect(8, 10, width - 16, height * 0.55);
    const shelves = 3;
    const sh = (height * 0.55) / shelves;
    const glass = ['#6fbf7a', '#7ab0d9', '#c96b6b', '#d9b35a', '#9a7ad9', '#6ad9c9', '#d98ac0'];
    for (let s = 0; s < shelves; s++) {
      const base = 10 + (s + 1) * sh - 3;
      let jx = 14;
      while (jx < width - 20) {
        const jw = 8 + r() * 10;
        const jh = sh * (0.45 + r() * 0.4);
        const col = glass[Math.floor(r() * glass.length)];
        const round = r() < 0.4;
        ctx.save();
        ctx.globalAlpha = 0.85;
        const g = ctx.createLinearGradient(jx, 0, jx + jw, 0);
        g.addColorStop(0, shade(col, 0.4));
        g.addColorStop(0.4, col);
        g.addColorStop(1, shade(col, -0.5));
        ctx.fillStyle = g;
        if (round) {
          ctx.beginPath();
          ctx.ellipse(jx + jw / 2, base - jw / 2, jw / 2, jw / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(jx + jw / 2 - 2, base - jw - 6, 4, 7);
        } else {
          ctx.beginPath();
          ctx.roundRect(jx, base - jh, jw, jh, 2);
          ctx.fill();
          ctx.fillStyle = '#7a5a3a';
          ctx.fillRect(jx + 1, base - jh - 3, jw - 2, 3); // cork
        }
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(jx + 2, base - (round ? jw * 0.8 : jh - 3), 1.5, round ? jw * 0.4 : jh * 0.6);
        ctx.restore();
        jx += jw + 3 + r() * 4;
      }
      ctx.fillStyle = shade(wood, 0.2);
      ctx.fillRect(6, base, width - 12, 4);
    }
    // cabinet doors below
    const dy = 14 + height * 0.55;
    const dh = height - dy - 10;
    for (let d = 0; d < 2; d++) {
      const dx = 10 + d * ((width - 20) / 2);
      const dw = (width - 20) / 2 - 3;
      ctx.fillStyle = shade(wood, -0.15);
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = shade(wood, 0.25);
      ctx.lineWidth = 2;
      ctx.strokeRect(dx + 5, dy + 5, dw - 10, dh - 10);
      ctx.fillStyle = BRASS;
      ctx.beginPath();
      ctx.arc(d === 0 ? dx + dw - 8 : dx + 8, dy + dh / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    applyGrain(ctx, 0, 0, width, height, 0.2);
  });
  // a big green flask on top, like in the reference study
  const top = P((x0 + x1) / 2, y0 + (y1 - y0) * 0.3, h);
  orb(ctx, top.x, top.y - 9, 9, 9, '#4f9a5a');
  ctx.fillStyle = '#4f9a5a';
  ctx.fillRect(top.x - 2.5, top.y - 24, 5, 8);
  const t2 = P((x0 + x1) / 2, y0 + (y1 - y0) * 0.7, h);
  ctx.fillStyle = '#d9cdb4';
  ctx.beginPath();
  ctx.ellipse(t2.x, t2.y - 5, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Fireplace: a fieldstone chimney breast with a mantel, facing +y against the y=y0 wall.
// ---------------------------------------------------------------------------

export function fireplace(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number, h: number, seed: number) {
  const stone = '#6f6a66';
  box(ctx, P, x0, y0, 0, x1, y1, h, { top: shade(stone, 0.1), left: stone, right: shade(stone, -0.35), edge: EDGE });
  const r = rng(seed);
  const width = (x1 - x0) * 100;
  const height = h * 100;
  const paintStones = (w: number, hgt: number, base: string) => {
    ctx.fillStyle = '#2e2a28';
    ctx.fillRect(0, 0, w, hgt);
    let y = 0;
    while (y < hgt) {
      const rh = 14 + r() * 12;
      let x = -r() * 20;
      while (x < w) {
        const sw = 18 + r() * 26;
        const c = shade(base, (r() - 0.5) * 0.35);
        const g = ctx.createLinearGradient(x, y, x + sw * 0.4, y + rh);
        g.addColorStop(0, shade(c, 0.25));
        g.addColorStop(1, shade(c, -0.25));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x + 1.2, y + 1.2, sw - 2.4, rh - 2.4, 5);
        ctx.fill();
        x += sw;
      }
      y += rh;
    }
    applyGrain(ctx, 0, 0, w, hgt, 0.3);
  };
  const [lo, lu, lv] = FACE.left(x0, y1, h);
  onFace(ctx, P, lo, lu, lv, () => {
    paintStones(width, height, stone);
    // firebox opening
    const fw = width * 0.5;
    const fx = (width - fw) / 2;
    const fy = height - 105;
    ctx.fillStyle = '#0d0706';
    ctx.beginPath();
    ctx.moveTo(fx, height);
    ctx.lineTo(fx, fy + 25);
    ctx.quadraticCurveTo(width / 2, fy - 18, fx + fw, fy + 25);
    ctx.lineTo(fx + fw, height);
    ctx.closePath();
    ctx.fill();
    // soot gradient
    const sg = ctx.createLinearGradient(0, fy - 30, 0, fy + 40);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = sg;
    ctx.fillRect(fx - 10, fy - 30, fw + 20, 70);
    // keystone arch
    ctx.strokeStyle = '#8c8680';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(fx - 3, height);
    ctx.lineTo(fx - 3, fy + 25);
    ctx.quadraticCurveTo(width / 2, fy - 24, fx + fw + 3, fy + 25);
    ctx.lineTo(fx + fw + 3, height);
    ctx.stroke();
    // mantel beam
    ctx.fillStyle = '#d9d2c4';
    ctx.fillRect(-4, fy - 40, width + 8, 14);
    ctx.fillStyle = '#a9a294';
    ctx.fillRect(-4, fy - 28, width + 8, 4);
  });
  // side face with the same stones
  const [ro, ru, rv] = FACE.right(x1, y0, h);
  onFace(ctx, P, ro, ru, rv, () => {
    paintStones((y1 - y0) * 100, height, shade(stone, -0.3));
  });
  // mantel shelf (protrudes)
  const mz = 1.02;
  box(ctx, P, x0 - 0.08, y1 - 0.05, mz, x1 + 0.08, y1 + 0.18, mz + 0.1, { top: '#e4ddcf', left: '#c9c1b2', right: '#9a9284', edge: EDGE });
  // hearth slab
  box(ctx, P, x0 + 0.2, y1, 0, x1 - 0.2, y1 + 0.45, 0.06, { top: '#5a5552', left: '#44403d', right: '#3a3634', edge: EDGE });
  // things on the mantel
  const m = (fx: number) => P(x0 + (x1 - x0) * fx, y1 + 0.06, mz + 0.1);
  const vase = m(0.2);
  orb(ctx, vase.x, vase.y - 10, 7, 10, '#8a6a3a');
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(vase.x - 3, vase.y - 26, 6, 8);
  const skull = m(0.5);
  orb(ctx, skull.x, skull.y - 8, 8, 7, '#e4dcc8');
  ctx.fillStyle = '#2a2020';
  ctx.beginPath();
  ctx.ellipse(skull.x - 3, skull.y - 8, 1.8, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(skull.x + 3, skull.y - 8, 1.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // antlers above the mantel
  const ant = P((x0 + x1) / 2, y1, 1.9);
  ctx.strokeStyle = '#d9cdb0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(ant.x, ant.y);
    ctx.quadraticCurveTo(ant.x + s * 22, ant.y - 4, ant.x + s * 30, ant.y - 30);
    ctx.moveTo(ant.x + s * 16, ant.y - 6);
    ctx.lineTo(ant.x + s * 12, ant.y - 22);
    ctx.moveTo(ant.x + s * 26, ant.y - 16);
    ctx.lineTo(ant.x + s * 36, ant.y - 22);
    ctx.stroke();
  }
  orb(ctx, ant.x, ant.y + 2, 7, 5, '#5a3a22');
}

/** Animated fire and logs inside the firebox. */
export function fireplaceFire(ctx: Ctx, S: Proj, x0: number, x1: number, y1: number, t: number) {
  const cx = (x0 + x1) / 2;
  const base = S(cx, y1 - 0.15, 0.08);
  // logs
  for (const [dx, rot] of [[-14, 0.15], [12, -0.2]] as const) {
    ctx.save();
    ctx.translate(base.x + dx, base.y - 4);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -5, 0, 5);
    g.addColorStop(0, '#6a4228');
    g.addColorStop(1, '#2a1810');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-20, -5, 40, 10, 4);
    ctx.fill();
    ctx.restore();
  }
  // embers bed
  glow(ctx, base.x, base.y - 2, 30, '#ff6a20', 0.7);
  for (let i = 0; i < 5; i++) flame(ctx, base.x - 20 + i * 10, base.y - 4, 26 + Math.sin(t * 3 + i) * 6, t, i);
  glow(ctx, base.x, base.y - 20, 90, '#ff8a3d', 0.35 + Math.sin(t * 9) * 0.05);
  // sparks
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.6 + i / 6) % 1;
    const sx = base.x + Math.sin(i * 12.3 + t) * 16;
    const sy = base.y - 10 - ph * 70;
    ctx.fillStyle = `rgba(255,${180 - ph * 100},60,${1 - ph})`;
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }
}

// ---------------------------------------------------------------------------
// The wizard's desk, cluttered with his last work.
// ---------------------------------------------------------------------------

export function desk(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number) {
  const topZ = 0.78;
  // legs
  const legs: [number, number][] = [[x0 + 0.08, y0 + 0.08], [x1 - 0.12, y0 + 0.08], [x0 + 0.08, y1 - 0.12], [x1 - 0.12, y1 - 0.12]];
  for (const [lx, ly] of legs) box(ctx, P, lx, ly, 0, lx + 0.07, ly + 0.07, topZ, { top: WOOD, left: WOOD, right: WOOD_DARK });
  // drawer pedestal
  box(ctx, P, x1 - 0.55, y0 + 0.05, 0.1, x1 - 0.05, y1 - 0.05, topZ - 0.02, { top: WOOD, left: shade(WOOD, -0.05), right: WOOD_DARK, edge: EDGE, grain: 0.25 });
  const [o, u, v] = FACE.left(x1 - 0.55, y1 - 0.05, topZ - 0.02);
  onFace(ctx, P, o, u, v, () => {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = shade(WOOD, 0.3);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(5, 6 + i * 22, 40, 18);
      ctx.fillStyle = BRASS;
      ctx.fillRect(22, 13 + i * 22, 6, 3);
    }
  });
  // top slab
  box(ctx, P, x0 - 0.05, y0 - 0.05, topZ, x1 + 0.05, y1 + 0.05, topZ + 0.07, { top: '#4a2a1a', left: '#3a2014', right: '#2a160e', edge: EDGE, grain: 0.3 });
  const z = topZ + 0.07;
  // green leather blotter
  poly(ctx, [P(x0 + 0.3, y0 + 0.15, z), P(x0 + 1.1, y0 + 0.15, z), P(x0 + 1.1, y1 - 0.12, z), P(x0 + 0.3, y1 - 0.12, z)]);
  ctx.fillStyle = '#2f4a2a';
  ctx.fill();
  // open tome
  const bk = [P(x0 + 0.45, y0 + 0.25, z + 0.01), P(x0 + 1.0, y0 + 0.22, z + 0.01), P(x0 + 1.02, y1 - 0.2, z + 0.01), P(x0 + 0.47, y1 - 0.17, z + 0.01)];
  poly(ctx, bk);
  ctx.fillStyle = '#efe4c8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,40,0.6)';
  ctx.stroke();
  const spineA = P(x0 + 0.73, y0 + 0.23, z + 0.02);
  const spineB = P(x0 + 0.745, y1 - 0.18, z + 0.02);
  ctx.beginPath();
  ctx.moveTo(spineA.x, spineA.y);
  ctx.lineTo(spineB.x, spineB.y);
  ctx.stroke();
  // scribbles on the pages
  ctx.strokeStyle = 'rgba(60,40,30,0.45)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    for (const side of [0, 1]) {
      const a = P(x0 + 0.5 + side * 0.28, y0 + 0.3 + i * 0.07, z + 0.02);
      const b = P(x0 + 0.7 + side * 0.28, y0 + 0.3 + i * 0.07, z + 0.02);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  // scattered papers and a scroll
  const r = rng(5);
  for (let i = 0; i < 3; i++) {
    const px = x0 + 1.2 + r() * 0.4;
    const py = y0 + 0.15 + r() * 0.4;
    poly(ctx, [P(px, py, z + 0.005), P(px + 0.25, py + 0.03, z + 0.005), P(px + 0.22, py + 0.3, z + 0.005), P(px - 0.03, py + 0.27, z + 0.005)]);
    ctx.fillStyle = shade('#e8dcc0', -r() * 0.15);
    ctx.fill();
  }
  // inkwell + quill
  const ink = P(x0 + 0.2, y1 - 0.3, z);
  orb(ctx, ink.x, ink.y - 4, 5, 5, '#1a1a2a');
  ctx.strokeStyle = '#f2ecdf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ink.x, ink.y - 6);
  ctx.quadraticCurveTo(ink.x + 8, ink.y - 20, ink.x + 4, ink.y - 30);
  ctx.stroke();
  // crystal ball on a brass stand
  const cb = P(x1 - 0.3, y0 + 0.3, z);
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.ellipse(cb.x, cb.y - 2, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  orb(ctx, cb.x, cb.y - 11, 8, 8, '#8fb8e8', null);
  ctx.globalAlpha = 1;
  // candle holder (flame is animated separately)
  const cd = P(x0 + 0.15, y0 + 0.2, z);
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.ellipse(cd.x, cd.y, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#efe6d0';
  ctx.fillRect(cd.x - 2.5, cd.y - 16, 5, 16);
}

// ---------------------------------------------------------------------------
// High-backed leather armchair, facing +y (toward the desk).
// ---------------------------------------------------------------------------

export function armchair(ctx: Ctx, P: Proj, cx: number, cy: number) {
  const leather = '#7a1a1c';
  const s = 0.34;
  // legs
  for (const [dx, dy] of [[-s, -s], [s - 0.06, -s], [-s, s - 0.06], [s - 0.06, s - 0.06]])
    box(ctx, P, cx + dx, cy + dy, 0, cx + dx + 0.06, cy + dy + 0.06, 0.2, { top: WOOD_DARK, left: WOOD_DARK, right: '#1a0e08' });
  // back (on the far side)
  box(ctx, P, cx - s, cy - s, 0.2, cx + s, cy - s + 0.16, 1.5, { top: shade(leather, 0.1), left: leather, right: shade(leather, -0.35), edge: EDGE });
  const [o, u, v] = FACE.left(cx - s, cy - s + 0.16, 1.5);
  onFace(ctx, P, o, u, v, () => {
    // tufted buttons
    ctx.fillStyle = 'rgba(30,6,8,0.6)';
    for (let yy = 16; yy < 110; yy += 18)
      for (let xx = 10 + ((yy / 18) % 2) * 8; xx < s * 200 - 6; xx += 16) {
        ctx.beginPath();
        ctx.arc(xx, yy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    applyGrain(ctx, 0, 0, s * 200, 130, 0.25);
  });
  // seat
  box(ctx, P, cx - s, cy - s + 0.1, 0.2, cx + s, cy + s, 0.5, { top: shade(leather, 0.15), left: leather, right: shade(leather, -0.35), edge: EDGE });
  // arms
  for (const ax of [cx - s, cx + s - 0.12])
    box(ctx, P, ax, cy - s + 0.1, 0.5, ax + 0.12, cy + s, 0.75, { top: shade(leather, 0.2), left: shade(leather, -0.05), right: shade(leather, -0.4), edge: EDGE });
}

// ---------------------------------------------------------------------------
// Standing iron torch with a flame bowl.
// ---------------------------------------------------------------------------

export function torchStand(ctx: Ctx, P: Proj, x: number, y: number) {
  const b = P(x, y, 0);
  const top = P(x, y, 1.75);
  // tripod feet
  ctx.strokeStyle = '#1e1a1a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const a of [0.4, 2.5, 4.6]) {
    const f = P(x + Math.cos(a) * 0.22, y + Math.sin(a) * 0.22, 0);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 14);
    ctx.quadraticCurveTo(f.x, f.y - 12, f.x, f.y);
    ctx.stroke();
  }
  // pole
  const g = ctx.createLinearGradient(b.x - 3, 0, b.x + 3, 0);
  g.addColorStop(0, '#5a5050');
  g.addColorStop(1, '#141010');
  ctx.fillStyle = g;
  ctx.fillRect(b.x - 2.5, top.y, 5, b.y - top.y - 10);
  // knots
  for (const k of [0.35, 0.6, 0.85]) {
    const kp = P(x, y, 1.75 * k);
    orb(ctx, kp.x, kp.y, 4.5, 3, '#3a3232', null);
  }
  // bowl
  ctx.fillStyle = '#2a2222';
  ctx.beginPath();
  ctx.moveTo(top.x - 12, top.y - 6);
  ctx.quadraticCurveTo(top.x, top.y + 10, top.x + 12, top.y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(top.x, top.y - 6, 12, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// A terrestrial globe on a wooden stand.
// ---------------------------------------------------------------------------

export function globe(ctx: Ctx, P: Proj, x: number, y: number) {
  const b = P(x, y, 0);
  const c = P(x, y, 0.9);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 4;
  for (const a of [0.8, 2.9, 5]) {
    const f = P(x + Math.cos(a) * 0.25, y + Math.sin(a) * 0.25, 0);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + 20);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
  }
  orb(ctx, b.x, b.y - 26, 12, 4, WOOD, null);
  // the globe
  const R = 20;
  const sea = ctx.createRadialGradient(c.x - 7, c.y - 8, 2, c.x, c.y, R);
  sea.addColorStop(0, '#e8dcb0');
  sea.addColorStop(0.6, '#c9b681');
  sea.addColorStop(1, '#6a5a36');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(90,110,60,0.55)';
  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(c.x - R + r() * R * 2, c.y - R + r() * R * 2, 4 + r() * 8, 3 + r() * 6, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(90,70,40,0.4)';
  ctx.lineWidth = 0.7;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, R * Math.cos(i * 0.5), R, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // brass meridian
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, R + 4, R + 4, 0.35, -Math.PI * 0.9, Math.PI * 0.2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Marble bust on a pedestal.
// ---------------------------------------------------------------------------

export function bust(ctx: Ctx, P: Proj, x: number, y: number) {
  box(ctx, P, x - 0.22, y - 0.22, 0, x + 0.22, y + 0.22, 1.05, { top: '#8a2a22', left: '#6a1e18', right: '#4a1410', edge: EDGE, grain: 0.3 });
  box(ctx, P, x - 0.27, y - 0.27, 1.05, x + 0.27, y + 0.27, 1.12, { top: '#9a3a30', left: '#7a2a22', right: '#5a1c16', edge: EDGE });
  const c = P(x, y, 1.12);
  const marble = '#9aa0a6';
  ctx.beginPath();
  ctx.moveTo(c.x - 20, c.y);
  ctx.quadraticCurveTo(c.x - 20, c.y - 22, c.x, c.y - 24);
  ctx.quadraticCurveTo(c.x + 20, c.y - 22, c.x + 20, c.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(c.x - 20, 0, c.x + 20, 0);
  g.addColorStop(0, shade(marble, 0.35));
  g.addColorStop(1, shade(marble, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = shade(marble, 0.05);
  ctx.fillRect(c.x - 5, c.y - 30, 10, 8);
  orb(ctx, c.x, c.y - 40, 11, 13, marble);
  // helmet crest: a stern old knight
  ctx.fillStyle = shade(marble, -0.15);
  ctx.beginPath();
  ctx.moveTo(c.x - 11, c.y - 42);
  ctx.quadraticCurveTo(c.x, c.y - 62, c.x + 11, c.y - 42);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Potted plant, a crate with books, and the scroll table by the door.
// ---------------------------------------------------------------------------

export function pottedPlant(ctx: Ctx, P: Proj, x: number, y: number) {
  const b = P(x, y, 0);
  ctx.fillStyle = '#e8e2d6';
  ctx.beginPath();
  ctx.moveTo(b.x - 12, b.y - 24);
  ctx.lineTo(b.x + 12, b.y - 24);
  ctx.lineTo(b.x + 8, b.y);
  ctx.lineTo(b.x - 8, b.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9c2b4';
  ctx.fillRect(b.x + 2, b.y - 24, 8, 24);
  const r = rng(11);
  for (let i = 0; i < 24; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
    const len = 20 + r() * 30;
    const ex = b.x + Math.cos(a) * len;
    const ey = b.y - 26 + Math.sin(a) * len;
    ctx.strokeStyle = shade('#3f7a3a', (r() - 0.5) * 0.6);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 24);
    ctx.quadraticCurveTo(b.x + Math.cos(a) * len * 0.3, ey - 10, ex, ey);
    ctx.stroke();
  }
}

export function crateOfBooks(ctx: Ctx, P: Proj, x: number, y: number) {
  box(ctx, P, x - 0.32, y - 0.32, 0, x + 0.32, y + 0.32, 0.5, { top: '#6a4a2a', left: '#5a3a20', right: '#3a2414', edge: EDGE, grain: 0.35 });
  const [o, u, v] = FACE.left(x - 0.32, y + 0.32, 0.5);
  onFace(ctx, P, o, u, v, () => {
    ctx.strokeStyle = 'rgba(20,10,5,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 16);
      ctx.lineTo(64, i * 16);
      ctx.stroke();
    }
  });
  const r = rng(21);
  let z = 0.5;
  for (let i = 0; i < 4; i++) {
    const t = 0.07;
    const off = (r() - 0.5) * 0.1;
    const col = BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)];
    box(ctx, P, x - 0.22 + off, y - 0.16, z, x + 0.18 + off, y + 0.14, z + t, { top: shade(col, 0.1), left: '#e8dcc0', right: shade(col, -0.3), edge: EDGE });
    z += t;
  }
}

export function scrollTable(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number) {
  const topZ = 0.72;
  for (const [lx, ly] of [[x0 + 0.1, y0 + 0.1], [x1 - 0.16, y0 + 0.1], [x0 + 0.1, y1 - 0.16], [x1 - 0.16, y1 - 0.16]])
    box(ctx, P, lx, ly, 0, lx + 0.06, ly + 0.06, topZ, { top: WOOD, left: WOOD, right: WOOD_DARK });
  box(ctx, P, x0 + 0.12, y0 + 0.12, 0.12, x1 - 0.12, y1 - 0.12, 0.16, { top: WOOD, left: WOOD, right: WOOD_DARK });
  box(ctx, P, x0, y0, topZ, x1, y1, topZ + 0.06, { top: '#6a4a30', left: '#4a3020', right: '#3a2418', edge: EDGE, grain: 0.3 });
  const z = topZ + 0.06;
  const r = rng(8);
  for (let i = 0; i < 4; i++) {
    const sx = x0 + 0.25 + r() * (x1 - x0 - 0.6);
    const sy = y0 + 0.15 + r() * 0.3;
    const a = P(sx, sy, z + 0.04);
    const b = P(sx + 0.35, sy + 0.08, z + 0.04);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = '#efe4c8';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  const cd = P(x1 - 0.2, y0 + 0.2, z);
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.ellipse(cd.x, cd.y, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#efe6d0';
  ctx.fillRect(cd.x - 2, cd.y - 12, 4, 12);
}

// ---------------------------------------------------------------------------
// The stepped dais at the heart of the room: where Thistle reawakens.
// ---------------------------------------------------------------------------

export const DAIS_TIERS: [number, number][] = [
  [1.55, 0.12],
  [1.1, 0.24],
  [0.7, 0.36],
];

export function dais(ctx: Ctx, P: Proj, cx: number, cy: number) {
  const stone = '#9a8a72';
  let z0 = 0;
  for (const [half, z1] of DAIS_TIERS) {
    box(ctx, P, cx - half, cy - half, z0, cx + half, cy + half, z1, { top: shade(stone, 0.12), left: stone, right: shade(stone, -0.3), edge: 'rgba(30,20,10,0.6)', grain: 0.3 });
    // worn step edge highlight
    const a = P(cx - half, cy + half, z1);
    const b = P(cx + half, cy + half, z1);
    const c = P(cx + half, cy - half, z1);
    ctx.strokeStyle = 'rgba(255,240,210,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    z0 = z1;
  }
  // inlaid rune circle on the top
  const top = DAIS_TIERS[DAIS_TIERS.length - 1];
  const [o, u, v] = FACE.top(cx - top[0], cy - top[0], top[1]);
  onFace(ctx, P, o, u, v, () => {
    const c = top[0] * 100;
    ctx.strokeStyle = 'rgba(60,40,80,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(c + Math.cos(a) * c * 0.74, c + Math.sin(a) * c * 0.74);
      ctx.rotate(a);
      ctx.strokeRect(-4, -4, 8, 8);
      ctx.restore();
    }
  });
}

/** The dais' living glow: pulsing runes, drifting motes. */
export function daisGlow(ctx: Ctx, S: Proj, cx: number, cy: number, t: number) {
  const top = DAIS_TIERS[DAIS_TIERS.length - 1];
  const R = top[0] * 0.85;
  const pulse = 0.55 + 0.45 * Math.sin(t * 1.8);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(190,140,255,${0.35 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const p = S(cx + Math.cos(a) * R, cy + Math.sin(a) * R, top[1] + 0.005);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.15;
    const p = S(cx + Math.cos(a) * R * 0.87, cy + Math.sin(a) * R * 0.87, top[1] + 0.01);
    ctx.fillStyle = `rgba(220,190,255,${0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + i))})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const c = S(cx, cy, top[1]);
  glow(ctx, c.x, c.y, 70, '#9a6aff', 0.25 + pulse * 0.15);
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.25 + i / 10) % 1;
    const a = i * 2.4;
    const p = S(cx + Math.cos(a) * 0.5, cy + Math.sin(a) * 0.5, top[1] + ph * 2.2);
    ctx.fillStyle = `rgba(220,200,255,${(1 - ph) * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Ornate rug on the floor. Painted onto the floor plane.
// ---------------------------------------------------------------------------

export function rug(ctx: Ctx, P: Proj, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const [o, u, v] = FACE.top(x0, y0, 0.005);
  const w = (x1 - x0) * 100;
  const h = (y1 - y0) * 100;
  const r = rng(seed);
  onFace(ctx, P, o, u, v, () => {
    // shadow + body
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(3, 3, w, h);
    ctx.fillStyle = '#c69a4a';
    ctx.fillRect(0, 0, w, h);
    // patterned border
    ctx.fillStyle = '#9a6a2a';
    for (let i = 0; i < w; i += 12) {
      ctx.fillRect(i, 4, 6, 6);
      ctx.fillRect(i + 6, h - 10, 6, 6);
    }
    for (let i = 0; i < h; i += 12) {
      ctx.fillRect(4, i, 6, 6);
      ctx.fillRect(w - 10, i + 6, 6, 6);
    }
    ctx.fillStyle = '#6a1a18';
    ctx.fillRect(14, 14, w - 28, h - 28);
    const g = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, Math.max(w, h) * 0.6);
    g.addColorStop(0, '#a01e22');
    g.addColorStop(1, '#6e1216');
    ctx.fillStyle = g;
    ctx.fillRect(20, 20, w - 40, h - 40);
    // central medallion
    ctx.strokeStyle = 'rgba(214,170,90,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, Math.min(w, h) * 0.22, Math.min(w, h) * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(a) * Math.min(w, h) * 0.3, h / 2 + Math.sin(a) * Math.min(w, h) * 0.3);
    }
    ctx.stroke();
    // wear
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,220,180,${r() * 0.05})`;
      ctx.fillRect(r() * w, r() * h, 6 + r() * 20, 2);
    }
    // fringe
    ctx.strokeStyle = '#e0c68a';
    ctx.lineWidth = 1;
    for (let i = 2; i < w; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + (r() - 0.5) * 2, h + 6);
      ctx.moveTo(i, 0);
      ctx.lineTo(i + (r() - 0.5) * 2, -6);
      ctx.stroke();
    }
    applyGrain(ctx, -6, -6, w + 12, h + 12, 0.25);
  });
}
