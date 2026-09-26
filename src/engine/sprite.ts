// Pixel sprites defined as rows of characters, each character mapped to a palette color.
// '.' is always transparent.

export type Palette = Record<string, string>;

export interface Sprite {
  canvas: HTMLCanvasElement;
  flash: HTMLCanvasElement; // solid-white silhouette for hit flashes
  w: number;
  h: number;
}

function blank(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function makeSprite(rows: string[], palette: Palette, mirror = false): Sprite {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const canvas = blank(w, h);
  const flash = blank(w, h);
  const ctx = canvas.getContext('2d')!;
  const fctx = flash.getContext('2d')!;
  fctx.fillStyle = '#ffffff';
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) continue;
      const px = mirror ? w - 1 - x : x;
      ctx.fillStyle = col;
      ctx.fillRect(px, y, 1, 1);
      fctx.fillRect(px, y, 1, 1);
    }
  }
  return { canvas, flash, w, h };
}

/** Build a sprite by drawing into a fresh canvas with a callback (for procedural art). */
export function paintSprite(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): Sprite {
  const canvas = blank(w, h);
  const ctx = canvas.getContext('2d')!;
  paint(ctx);
  const flash = blank(w, h);
  const fctx = flash.getContext('2d')!;
  fctx.drawImage(canvas, 0, 0);
  fctx.globalCompositeOperation = 'source-in';
  fctx.fillStyle = '#ffffff';
  fctx.fillRect(0, 0, w, h);
  return { canvas, flash, w, h };
}

/** Small deterministic hash, handy for per-tile variation that never flickers. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
