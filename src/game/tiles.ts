import { TILE_H, TILE_W, worldToScreen } from '../engine/iso';
import { hash2 } from '../engine/sprite';
import type { Ground, MapInfo } from './world';

// Ground colors: [base, dark, light]
const GROUND_COLORS: Record<Ground, [string, string, string]> = {
  void: ['#000000', '#000000', '#000000'],
  grass: ['#4f8a3c', '#3f7331', '#67a64c'],
  flowers: ['#4f8a3c', '#3f7331', '#67a64c'],
  path: ['#a88a5c', '#8c6f45', '#c2a577'],
  water: ['#2f6d9e', '#23557e', '#5a9ac9'],
  bridge: ['#8b5a2b', '#5e3b1b', '#a8733d'],
  marsh: ['#3e5a48', '#2f4838', '#5b7a5f'],
  ash: ['#3a2f2c', '#2a2220', '#54423a'],
  ashpath: ['#5c4a40', '#46372f', '#735e50'],
  stone: ['#6e6878', '#5a5464', '#857f90'],
  rug: ['#8a2f3a', '#6d2330', '#a8404c'],
  stairs: ['#5a5464', '#3d3846', '#857f90'],
  door: ['#3a2616', '#24170c', '#5a3c22'],
  exit: ['#a88a5c', '#8c6f45', '#c2a577'],
};

const HW = TILE_W / 2;
const HH = TILE_H / 2;

function inDiamond(dx: number, dy: number): boolean {
  return Math.abs(dx + 0.5) / HW + Math.abs(dy + 0.5 - HH) / HH <= 1;
}

function tilePixel(g: Ground, tx: number, ty: number, dx: number, dy: number, m: MapInfo): string {
  const [base, dark, light] = GROUND_COLORS[g];
  const n = hash2(tx * 32 + dx, ty * 16 + dy, 11);
  const edge = Math.abs(dx + 0.5) / HW + Math.abs(dy + 0.5 - HH) / HH;
  switch (g) {
    case 'grass':
    case 'flowers':
    case 'marsh': {
      if (g === 'flowers' && n > 0.985) return ['#f7d9e8', '#ffe066', '#ffffff', '#c9a0ff'][Math.floor(n * 1000) % 4];
      if (g === 'marsh' && n < 0.04) return '#27403a';
      if (n > 0.9) return light;
      if (n < 0.14) return dark;
      return base;
    }
    case 'path':
    case 'exit':
    case 'ashpath':
      if (n > 0.93) return light;
      if (n < 0.12) return dark;
      return base;
    case 'water': {
      const wave = Math.sin((tx * 32 + dx) * 0.35 + (ty * 16 + dy) * 0.9);
      if (wave > 0.93 && n > 0.4) return '#9fd0f0';
      if (n < 0.1) return dark;
      return base;
    }
    case 'bridge':
      if (dy % 4 === 0) return dark;
      if (n > 0.9) return light;
      return base;
    case 'ash':
      if (n > 0.985) return '#ff8a3d';
      if (n > 0.97) return '#c2410c';
      if (n > 0.85) return light;
      if (n < 0.15) return dark;
      return base;
    case 'stone':
    case 'stairs': {
      if (edge > 0.9) return dark; // grout between flagstones
      if (g === 'stairs' && (dy + dx / 2) % 4 < 1) return dark;
      if (n > 0.92) return light;
      if (n < 0.08) return dark;
      return base;
    }
    case 'rug': {
      // Gold trim wherever the rug meets a non-rug tile. Each diamond edge faces one neighbour.
      const nb = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < m.w && y < m.h && (m.ground[y * m.w + x] === 'rug' || m.solid[y * m.w + x] === 'podium');
      const [nx, ny] = dx >= 0 ? (dy < HH ? [tx, ty - 1] : [tx + 1, ty]) : dy < HH ? [tx - 1, ty] : [tx, ty + 1];
      if (edge > 0.8 && !nb(nx, ny)) return '#c9a24a';
      if ((dx + dy) % 6 === 0 && n > 0.5) return light;
      if (n < 0.1) return dark;
      return base;
    }
    case 'door':
      if (dx % 5 === 0) return dark;
      return base;
    default:
      return base;
  }
}

export interface GroundCache {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
}

const CLIFF = 70;

export function renderGround(m: MapInfo): GroundCache {
  const pad = 8;
  const w = (m.w + m.h) * HW + pad * 2;
  const h = (m.w + m.h) * HH + pad * 2 + CLIFF;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const ox = m.h * HW + pad;
  const oy = pad;
  const isVoid = (x: number, y: number) => x < 0 || y < 0 || x >= m.w || y >= m.h || m.ground[y * m.w + x] === 'void';

  // Paint back-to-front so near cliffs overlap correctly.
  for (let s = 0; s < m.w + m.h; s++) {
    for (let y = 0; y < m.h; y++) {
      const x = s - y;
      if (x < 0 || x >= m.w) continue;
      const g = m.ground[y * m.w + x];
      if (g === 'void') continue;
      const p = worldToScreen(x, y);
      const sx = p.x + ox;
      const sy = p.y + oy;
      for (let dy = 0; dy < TILE_H; dy++) {
        for (let dx = -HW; dx < HW; dx++) {
          if (!inDiamond(dx, dy)) continue;
          ctx.fillStyle = tilePixel(g, x, y, dx, dy, m);
          ctx.fillRect(sx + dx, sy + dy, 1, 1);
        }
      }
      // Cliff faces on edges that look out over nothing.
      const face = m.id === 'tower' ? '#4a4555' : '#4a3626';
      const faceDark = m.id === 'tower' ? '#34303d' : '#35261a';
      if (isVoid(x, y + 1)) drawFace(ctx, sx, sy, 'left', CLIFF, face, faceDark, x, y);
      if (isVoid(x + 1, y)) drawFace(ctx, sx, sy, 'right', CLIFF, faceDark, '#1f1c26', x, y);
    }
  }
  return { canvas, ox, oy };
}

function drawFace(ctx: CanvasRenderingContext2D, sx: number, sy: number, side: 'left' | 'right', depth: number, col: string, dark: string, tx: number, ty: number) {
  for (let i = 0; i < HW; i++) {
    const x = side === 'left' ? sx - HW + i : sx + i;
    const top = side === 'left' ? sy + HH + Math.floor(i / 2) : sy + TILE_H - Math.floor(i / 2) - 1;
    for (let d = 0; d < depth; d++) {
      const fade = d / depth;
      if (hash2(x, top + d, 5) < fade * 0.9) continue; // crumble away into the void
      const brick = (d + (Math.floor(i / 8) % 2) * 3 + tx + ty) % 6 === 0;
      ctx.fillStyle = brick ? dark : col;
      ctx.fillRect(x, top + d, 1, 1);
    }
  }
}

export interface BlockStyle {
  top: string;
  left: string;
  right: string;
  line?: string;
  windows?: boolean;
  books?: boolean;
  crenel?: boolean;
}

/** Draw an extruded isometric cube whose base diamond has its top vertex at (sx, sy). */
export function drawBlock(ctx: CanvasRenderingContext2D, sx: number, sy: number, height: number, st: BlockStyle, seed: number) {
  // left face
  for (let i = 0; i < HW; i++) {
    const x = sx - HW + i;
    const yTop = sy + HH + Math.floor(i / 2) - height;
    ctx.fillStyle = st.left;
    ctx.fillRect(x, yTop, 1, height);
    if (st.line) {
      ctx.fillStyle = st.line;
      for (let r = 6; r < height; r += 7) ctx.fillRect(x, yTop + r, 1, 1);
      if (i % 8 === ((Math.floor(seed) % 2) * 4)) ctx.fillRect(x, yTop, 1, height);
    }
  }
  // right face
  for (let i = 0; i < HW; i++) {
    const x = sx + i;
    const yTop = sy + TILE_H - Math.floor(i / 2) - 1 - height;
    ctx.fillStyle = st.right;
    ctx.fillRect(x, yTop, 1, height);
    if (st.line) {
      ctx.fillStyle = st.line;
      for (let r = 6; r < height; r += 7) ctx.fillRect(x, yTop + r, 1, 1);
      if (i % 8 === 4) ctx.fillRect(x, yTop, 1, height);
    }
  }
  // windows looking out on the sky
  if (st.windows && height > 30 && hash2(seed, 3, 9) > 0.45) {
    const side = hash2(seed, 1, 4) > 0.5 ? 'left' : 'right';
    for (let i = 5; i < 11; i++) {
      const x = side === 'left' ? sx - HW + i : sx + i;
      const yTop = side === 'left' ? sy + HH + Math.floor(i / 2) - height + 8 : sy + TILE_H - Math.floor(i / 2) - 1 - height + 8;
      ctx.fillStyle = '#1a1626';
      ctx.fillRect(x, yTop, 1, 16);
      if (i > 5 && i < 10) {
        ctx.fillStyle = '#6c8fd1';
        ctx.fillRect(x, yTop + 2, 1, 7);
        ctx.fillStyle = '#9fb8ea';
        ctx.fillRect(x, yTop + 9, 1, 5);
      }
    }
  }
  if (st.books) {
    const colors = ['#8a2f3a', '#2f5d8a', '#c9a24a', '#3d7a3a', '#6b3d8a'];
    for (const side of ['left', 'right'] as const) {
      for (let i = 1; i < HW - 1; i++) {
        const x = side === 'left' ? sx - HW + i : sx + i;
        const yTop = side === 'left' ? sy + HH + Math.floor(i / 2) - height : sy + TILE_H - Math.floor(i / 2) - 1 - height;
        for (let shelf = 4; shelf < height - 4; shelf += 8) {
          ctx.fillStyle = colors[Math.floor(hash2(i, shelf, seed) * colors.length)];
          ctx.fillRect(x, yTop + shelf, 1, 5);
        }
      }
    }
  }
  // top diamond
  ctx.fillStyle = st.top;
  for (let dy = 0; dy < TILE_H; dy++) {
    const half = dy < HH ? (dy + 1) * 2 : (TILE_H - dy) * 2;
    ctx.fillRect(sx - half, sy + dy - height, half * 2, 1);
  }
  if (st.crenel) {
    ctx.fillStyle = st.left;
    ctx.fillRect(sx - 3, sy - height - 4, 6, 6);
    ctx.fillStyle = st.top;
    ctx.fillRect(sx - 3, sy - height - 4, 6, 2);
  }
}

export function makeSky(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const bands = ['#0d0b1f', '#141233', '#1c1946', '#27215a', '#352a6b', '#4a3278'];
  for (let y = 0; y < h; y++) {
    ctx.fillStyle = bands[Math.min(bands.length - 1, Math.floor((y / h) * bands.length))];
    ctx.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hash2(i, 1, 77) * w);
    const y = Math.floor(hash2(i, 2, 77) * h * 0.8);
    ctx.fillStyle = hash2(i, 3, 77) > 0.8 ? '#fff6d6' : '#8a86b8';
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}
