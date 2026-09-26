// A tiny 3x5 bitmap font so all text stays crisp at pixel scale.
// Each glyph is 5 rows of 3 bits, written as a 15-char string (row-major).

const G: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010',
  "'": '010010000000000', '-': '000000111000000', '+': '000010111010000', ':': '000010000010000',
  '/': '001001010100100', '%': '101001010100101', '(': '010100100100010', ')': '010001001001010',
  '>': '100010001010100', '<': '001010100010001', '[': '110100100100110', ']': '011001001001011',
  '*': '000101010101000', '=': '000111000111000', '"': '101101000000000', '#': '101111101111101',
  ' ': '000000000000000',
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;

export function textWidth(text: string, scale = 1): number {
  return text.length === 0 ? 0 : (text.length * (GLYPH_W + 1) - 1) * scale;
}

export interface TextOpts {
  color?: string;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  shadow?: string | null;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOpts = {}) {
  const scale = opts.scale ?? 1;
  const align = opts.align ?? 'left';
  const upper = text.toUpperCase().replace(/[—–]/g, '-');
  let ox = Math.round(x);
  const w = textWidth(upper, scale);
  if (align === 'center') ox = Math.round(x - w / 2);
  else if (align === 'right') ox = Math.round(x - w);
  const oy = Math.round(y);
  const shadow = opts.shadow === undefined ? '#0b0a14' : opts.shadow;
  if (shadow) paint(ctx, upper, ox + scale, oy + scale, scale, shadow);
  paint(ctx, upper, ox, oy, scale, opts.color ?? '#f4eedd');
}

function paint(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    const g = G[ch] ?? G['?'];
    for (let i = 0; i < 15; i++) {
      if (g[i] === '1') ctx.fillRect(cx + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
    }
    cx += (GLYPH_W + 1) * scale;
  }
}

/** Greedy word wrap by character budget. */
export function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if ((line + ' ' + word).trim().length > maxChars) {
        out.push(line.trim());
        line = word;
      } else line += ' ' + word;
    }
    out.push(line.trim());
  }
  return out;
}
