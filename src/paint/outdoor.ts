// Thistledown Vale, painted.

import { HH, HW, project, rng } from '../engine/iso';
import type { Ground, MapInfo } from '../game/world';
import { applyGrain, glow, groundShadow, makeCanvas, orb, poly, shade, valueNoise, type Ctx, type Proj } from './kit';
import { bake, sprite, type Scene, type SceneSprite } from './scene';

const GROUND_SCALE = 1;

type RGB = [number, number, number];
const C = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const PAL: Partial<Record<Ground, [RGB, RGB]>> = {
  grass: [C('#4a8a3a'), C('#76b04e')],
  flowers: [C('#4a8a3a'), C('#76b04e')],
  path: [C('#9a7a50'), C('#c2a275')],
  exit: [C('#9a7a50'), C('#c2a275')],
  door: [C('#9a7a50'), C('#c2a275')],
  stone: [C('#4a8a3a'), C('#76b04e')],
  water: [C('#23557e'), C('#3f86b8')],
  bridge: [C('#23557e'), C('#3f86b8')],
  marsh: [C('#34503f'), C('#5a7a5c')],
  ash: [C('#2e2624'), C('#54423a')],
  ashpath: [C('#4a3c34'), C('#6e5a4c')],
  void: [C('#1b2a16'), C('#2a3d20')],
};

export function buildValleyScene(m: MapInfo): Scene {
  const ground = paintGround(m);
  const sprites: SceneSprite[] = [];
  const trees = [0, 1, 2, 3, 4].map((i) => bakeTree(i));
  const rocks = [0, 1, 2].map((i) => bakeRock(i));

  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const s = m.solid[y * m.w + x];
      const r = rng(x * 131 + y * 17);
      if (s === 'tree') {
        const t = trees[Math.floor(r() * trees.length)];
        const ox = (r() - 0.5) * 0.3;
        const oy = (r() - 0.5) * 0.3;
        sprites.push({ ...t, x: x + 0.5 + ox, y: y + 0.5 + oy, depth: x + y + 1 + ox + oy, fades: true });
      } else if (s === 'rock') {
        const k = rocks[Math.floor(r() * rocks.length)];
        sprites.push({ ...k, x: x + 0.5, y: y + 0.5, depth: x + y + 1 });
      } else if (s === 'signpost') {
        sprites.push(sprite(x + 0.5, y + 0.5, [x, y, 0, x + 1, y + 1, 1.6], (c, P) => signpost(c, P, x + 0.5, y + 0.5)));
      }
    }
  }
  // the tower itself: a round stone keep with a slate cone roof
  const tcx = 20.5;
  const tcy = 11.5;
  sprites.push(sprite(tcx, tcy, [tcx - 3.6, tcy - 3.6, 0, tcx + 3.6, tcy + 3.6, 14], (c, P) => towerKeep(c, P, tcx, tcy), { fades: true, margin: 40 }));

  // a treeline beyond the map edges so the world doesn't end in a void
  const edgeTrees: SceneSprite[] = [];
  for (let i = -3; i < m.w + 3; i++) {
    for (const [x, y] of [[i, -1.5], [i, -3], [-1.5, i], [-3, i], [i, m.h + 0.5], [m.w + 0.5, i]] as const) {
      const r = rng(Math.round(x * 97 + y * 13 + 5000));
      const t = trees[Math.floor(r() * trees.length)];
      edgeTrees.push({ ...t, x: x + (r() - 0.5) * 0.6, y: y + (r() - 0.5) * 0.6, depth: x + y + 1 });
    }
  }
  sprites.push(...edgeTrees);

  const waterTiles: [number, number][] = [];
  const marshTiles: [number, number][] = [];
  const ashTiles: [number, number][] = [];
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const g = m.ground[y * m.w + x];
      if (g === 'water') waterTiles.push([x, y]);
      if (g === 'marsh') marshTiles.push([x, y]);
      if (g === 'ash' || g === 'ashpath') ashTiles.push([x, y]);
    }

  return {
    bg: ground,
    sprites,
    lights: [],
    ambient: null,
    backdrop: (ctx) => {
      ctx.fillStyle = '#16240f';
      ctx.fillRect(0, 0, 1280, 720);
    },
    under: (ctx, S, t) => {
      // glints on the water
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y] of waterTiles) {
        const r = rng(x * 7 + y * 131);
        for (let k = 0; k < 2; k++) {
          const ph = Math.sin(t * 1.6 + r() * 6.28);
          if (ph < 0.6) continue;
          const p = S(x + r(), y + r(), 0);
          ctx.strokeStyle = `rgba(210,235,255,${(ph - 0.6) * 1.2})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 6, p.y);
          ctx.lineTo(p.x + 6, p.y);
          ctx.stroke();
        }
      }
      // embers drifting up from the scorched ground
      for (const [x, y] of ashTiles) {
        const r = rng(x * 31 + y * 7);
        if (r() > 0.5) continue;
        const ph = (t * 0.35 + r()) % 1;
        const p = S(x + r(), y + r(), ph * 1.4);
        ctx.fillStyle = `rgba(255,${140 + r() * 80},60,${(1 - ph) * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(t * 2 + x) * 4, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    over: (ctx, S, t) => {
      // rolling fog over the Mistfen
      for (const [x, y] of marshTiles) {
        const r = rng(x * 13 + y * 71);
        if (r() > 0.45) continue;
        const p = S(x + 0.5 + Math.sin(t * 0.2 + x) * 0.4, y + 0.5, 0.3);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
        g.addColorStop(0, 'rgba(200,220,210,0.22)');
        g.addColorStop(1, 'rgba(200,220,210,0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - 90, p.y - 90, 180, 180);
      }
      // heat haze glow over the Ashen Road
      for (const [x, y] of ashTiles) {
        if ((x + y) % 3) continue;
        const p = S(x + 0.5, y + 0.5, 0);
        glow(ctx, p.x, p.y, 60, '#ff5a1a', 0.06 + Math.sin(t * 2 + x) * 0.02);
      }
      // warm late-afternoon grade
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const g = ctx.createLinearGradient(0, 0, 1280, 720);
      g.addColorStop(0, 'rgba(255,220,150,0.35)');
      g.addColorStop(1, 'rgba(80,90,160,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(-2000, -2000, 6000, 6000);
      ctx.restore();
    },
  };
}

// ---------------------------------------------------------------------------
// Ground: painted per-pixel with warped terrain boundaries so nothing looks tiled
// ---------------------------------------------------------------------------

function paintGround(m: MapInfo) {
  const pad = 400;
  const minX = -m.h * HW - pad;
  const maxX = m.w * HW + pad;
  const minY = -pad;
  const maxY = (m.w + m.h) * HH + pad;
  const W = Math.ceil((maxX - minX) * GROUND_SCALE);
  const H = Math.ceil((maxY - minY) * GROUND_SCALE);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const N = 256;
  const big = valueNoise(N, 11, 4);
  const fine = valueNoise(N, 12, 5);
  const warpA = valueNoise(N, 13, 3);
  const warpB = valueNoise(N, 14, 3);
  const sample = (n: Float32Array, x: number, y: number) => n[((Math.floor(y) % N) + N) % N * N + (((Math.floor(x) % N) + N) % N)];
  // Terrain classes, blended with bilinear "membership" fields so edges come out as smooth curves
  // instead of tile staircases, then roughened with fine noise.
  const CLASSES: Ground[] = ['grass', 'path', 'water', 'bridge', 'marsh', 'ash', 'ashpath', 'void'];
  const classOf = (g: Ground): number => {
    switch (g) {
      case 'path': case 'exit': case 'door': return 1;
      case 'water': return 2;
      case 'bridge': return 3;
      case 'marsh': return 4;
      case 'ash': return 5;
      case 'ashpath': return 6;
      case 'void': return 7;
      default: return 0;
    }
  };
  const grid = new Int8Array((m.w + 2) * (m.h + 2)).fill(7);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) grid[(y + 1) * (m.w + 2) + x + 1] = classOf(m.ground[y * m.w + x]);
  const cls = (x: number, y: number) => (x < -1 || y < -1 || x > m.w || y > m.h ? 7 : grid[(y + 1) * (m.w + 2) + x + 1]);
  const vals = new Float32Array(CLASSES.length);
  const d = img.data;
  const pal = CLASSES.map((c) => PAL[c] ?? PAL.grass!);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const sx = px / GROUND_SCALE + minX;
      const sy = py / GROUND_SCALE + minY;
      const wx0 = (sx / HW + sy / HH) / 2;
      const wy0 = (sy / HH - sx / HW) / 2;
      const nA = sample(warpA, wx0 * 30, wy0 * 30) - 0.5;
      const nB = sample(warpB, wx0 * 30, wy0 * 30) - 0.5;
      const wx = wx0 + nA * 0.35 - 0.5;
      const wy = wy0 + nB * 0.35 - 0.5;
      const i0 = Math.floor(wx);
      const j0 = Math.floor(wy);
      const fu = wx - i0;
      const fv = wy - j0;
      vals.fill(0);
      vals[cls(i0, j0)] += (1 - fu) * (1 - fv);
      vals[cls(i0 + 1, j0)] += fu * (1 - fv);
      vals[cls(i0, j0 + 1)] += (1 - fu) * fv;
      vals[cls(i0 + 1, j0 + 1)] += fu * fv;
      // pick the dominant class; ties resolve toward grass so edges stay soft
      let best = 0;
      let bv = vals[0] + 0.02;
      for (let c = 1; c < vals.length; c++) if (vals[c] > bv) { bv = vals[c]; best = c; }
      const b = sample(big, wx0 * 5, wy0 * 5);
      const f = sample(fine, px * 0.9, py * 0.9);
      let t = b * 0.6 + f * 0.5 - 0.1;
      let [r0, g0, b0] = pal[best][0];
      let [r1, g1, b1] = pal[best][1];
      const edge = 1 - Math.min(1, Math.max(0, (bv - 0.45) * 4)); // 1 at a class boundary, 0 deep inside
      if (best === 2 || best === 3) {
        const water = vals[2] + vals[3];
        if (best === 3) {
          // plank deck with gaps and a dark rim
          const plank = ((wx0 - wy0) * 5) % 1;
          const gap = plank < 0.12 || plank > 0.96;
          [r0, g0, b0] = gap ? [58, 36, 18] : [122, 82, 48];
          [r1, g1, b1] = gap ? [70, 44, 22] : [160, 112, 66];
          if (edge > 0.7) { [r0, g0, b0] = [46, 30, 16]; [r1, g1, b1] = [60, 38, 20]; }
        } else if (water < 0.56) {
          // foam line and sandy shallows at the shore
          [r0, g0, b0] = [150, 190, 200];
          [r1, g1, b1] = [220, 240, 240];
          t = f;
        } else if (water < 0.7) t += 0.45;
        else t += Math.sin(wx0 * 9 + wy0 * 3 + f * 4) * 0.08;
      } else if (best === 4 && f > 0.62) {
        [r0, g0, b0] = C('#1f3530');
        [r1, g1, b1] = C('#2f4a44');
      } else if (best === 5 && f > 0.72) {
        [r0, g0, b0] = [150, 50, 20];
        [r1, g1, b1] = [255, 140, 60];
        t = (f - 0.72) * 3;
      } else if (best === 1) {
        if (f > 0.7) t += 0.25; // pebbles
        if (edge > 0.6 && vals[0] > 0.2) t -= 0.25; // trodden, darker verge
      } else if (best === 0 && vals[1] > 0.3) t -= 0.12; // grass worn thin beside paths
      t = Math.max(0, Math.min(1, t));
      const i = (py * W + px) * 4;
      d[i] = r0 + (r1 - r0) * t;
      d[i + 1] = g0 + (g1 - g0) * t;
      d[i + 2] = b0 + (b1 - b0) * t;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.scale(GROUND_SCALE, GROUND_SCALE);
  const ox = -minX;
  const oy = -minY;
  const P: Proj = (x, y, z = 0) => {
    const p = project(x, y, z);
    return { x: p.x + ox, y: p.y + oy };
  };
  paintGroundDetails(ctx, P, m);
  applyGrain(ctx, 0, 0, W / GROUND_SCALE, H / GROUND_SCALE, 0.15);
  return { canvas, ox, oy, scale: GROUND_SCALE };
}

function paintGroundDetails(ctx: Ctx, P: Proj, m: MapInfo) {
  const r = rng(404);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const g = m.ground[y * m.w + x];
      const solid = m.solid[y * m.w + x];
      if ((g === 'grass' || g === 'flowers') && !solid) {
        // grass tufts
        const n = 3 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const p = P(x + r(), y + r());
          const col = shade('#5a9a42', (r() - 0.3) * 0.5);
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.3;
          for (let b = -2; b <= 2; b++) {
            ctx.beginPath();
            ctx.moveTo(p.x + b * 1.5, p.y);
            ctx.quadraticCurveTo(p.x + b * 2, p.y - 5, p.x + b * 3 + (r() - 0.5) * 3, p.y - 7 - r() * 4);
            ctx.stroke();
          }
        }
        if (g === 'flowers' || r() < 0.25) {
          const cols = ['#f7d9e8', '#ffe066', '#ffffff', '#c9a0ff', '#ff9a9a'];
          const col = cols[Math.floor(r() * cols.length)];
          for (let k = 0; k < (g === 'flowers' ? 6 : 2); k++) {
            const p = P(x + r(), y + r());
            ctx.fillStyle = col;
            for (let a = 0; a < 5; a++) {
              ctx.beginPath();
              ctx.arc(p.x + Math.cos(a * 1.26) * 1.8, p.y - 6 + Math.sin(a * 1.26) * 1.2, 1.3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#e8a030';
            ctx.fillRect(p.x - 0.7, p.y - 6.7, 1.4, 1.4);
          }
        }
      }
      if (g === 'path' || g === 'exit') {
        for (let k = 0; k < 3; k++) {
          const p = P(x + r(), y + r());
          orb(ctx, p.x, p.y, 2 + r() * 2.5, 1.2 + r() * 1.5, shade('#a89a88', (r() - 0.5) * 0.4), 'rgba(40,30,20,0.4)');
        }
      }
      if (g === 'marsh' && r() < 0.5) {
        // reeds
        const p = P(x + r(), y + r());
        ctx.strokeStyle = '#6a7a3a';
        ctx.lineWidth = 1.5;
        for (let b = 0; b < 5; b++) {
          ctx.beginPath();
          ctx.moveTo(p.x + b * 2, p.y);
          ctx.quadraticCurveTo(p.x + b * 2 + 2, p.y - 12, p.x + b * 3, p.y - 18 - r() * 8);
          ctx.stroke();
        }
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(p.x + 5, p.y - 22, 3, 7);
      }
      if (g === 'water' && r() < 0.08) {
        const p = P(x + r(), y + r());
        ctx.fillStyle = '#4a8a3a';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 7, 3.5, 0, 0.3, Math.PI * 2);
        ctx.lineTo(p.x, p.y);
        ctx.fill();
        if (r() < 0.4) {
          ctx.fillStyle = '#f7d9e8';
          ctx.beginPath();
          ctx.arc(p.x + 2, p.y - 1, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Trees, rocks, signposts and the tower keep
// ---------------------------------------------------------------------------

function bakeTree(variant: number) {
  const r = rng(variant * 1000 + 3);
  const pine = variant === 4;
  return bake(0, 0, [-1.2, -1.2, 0, 1.2, 1.2, pine ? 4.2 : 3.6], (ctx, P) => {
    const base = P(0, 0, 0);
    groundShadow(ctx, base.x + 10, base.y + 4, 50, 0.4);
    if (pine) {
      ctx.fillStyle = '#3a2616';
      ctx.fillRect(base.x - 4, base.y - 40, 8, 40);
      for (let i = 0; i < 5; i++) {
        const y = base.y - 30 - i * 30;
        const w = 50 - i * 8;
        const g = ctx.createLinearGradient(base.x - w, 0, base.x + w, 0);
        g.addColorStop(0, '#3f7a44');
        g.addColorStop(1, '#16361f');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(base.x - w, y);
        ctx.quadraticCurveTo(base.x - w * 0.3, y - 20, base.x, y - 50);
        ctx.quadraticCurveTo(base.x + w * 0.3, y - 20, base.x + w, y);
        ctx.quadraticCurveTo(base.x, y + 8, base.x - w, y);
        ctx.fill();
        ctx.strokeStyle = 'rgba(10,25,12,0.5)';
        ctx.stroke();
      }
      return;
    }
    // trunk with flared roots
    const th = 55 + r() * 20;
    const tg = ctx.createLinearGradient(base.x - 8, 0, base.x + 8, 0);
    tg.addColorStop(0, '#6a4a30');
    tg.addColorStop(1, '#2a1a10');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(base.x - 14, base.y);
    ctx.quadraticCurveTo(base.x - 6, base.y - 8, base.x - 6, base.y - th);
    ctx.lineTo(base.x + 6, base.y - th);
    ctx.quadraticCurveTo(base.x + 6, base.y - 8, base.x + 15, base.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,10,5,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(base.x - 4 + i * 2.5, base.y - 4);
      ctx.lineTo(base.x - 3 + i * 2, base.y - th + 10);
      ctx.stroke();
    }
    // canopy: layered clusters, dark underside to sunlit top
    const cy = base.y - th - 30;
    const clusters: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 40;
      clusters.push([base.x + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.8, 18 + r() * 14]);
    }
    clusters.sort((a, b) => a[1] - b[1]);
    const layer = (dx: number, dy: number, shrink: number, col: string) => {
      ctx.fillStyle = col;
      for (const [x, y, rr] of clusters) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, Math.max(2, rr - shrink), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const hue = variant % 2 ? ['#123018', '#1f4a26', '#2f6a34', '#4a9040', '#7ac05a'] : ['#18301a', '#26502a', '#3a7a36', '#5aa048', '#96d06a'];
    layer(0, 4, -2, hue[0]);
    layer(0, 2, 0, hue[1]);
    layer(-2, -2, 4, hue[2]);
    layer(-5, -6, 9, hue[3]);
    layer(-8, -10, 14, hue[4]);
    // leaf flecks
    for (let i = 0; i < 60; i++) {
      const [x, y, rr] = clusters[Math.floor(r() * clusters.length)];
      const a = r() * Math.PI * 2;
      ctx.fillStyle = r() < 0.5 ? hue[4] : hue[1];
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8, 2.5, 1.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    if (variant === 3) {
      // a fruit tree
      for (let i = 0; i < 7; i++) {
        const [x, y, rr] = clusters[Math.floor(r() * clusters.length)];
        orb(ctx, x + (r() - 0.5) * rr, y + (r() - 0.5) * rr, 3, 3, '#d94a3a', null);
      }
    }
  }, 20);
}

function bakeRock(variant: number) {
  const r = rng(variant * 77 + 1);
  return bake(0, 0, [-0.6, -0.6, 0, 0.6, 0.6, 0.8], (ctx, P) => {
    const b = P(0, 0, 0);
    groundShadow(ctx, b.x + 4, b.y, 30, 0.4);
    const pts = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = 22 + r() * 8;
      pts.push({ x: b.x + Math.cos(a) * rr, y: b.y - 14 + Math.sin(a) * rr * (Math.sin(a) < 0 ? 0.9 : 0.45) });
    }
    poly(ctx, pts);
    const g = ctx.createLinearGradient(b.x - 20, b.y - 34, b.x + 20, b.y);
    g.addColorStop(0, '#b8b6bc');
    g.addColorStop(0.5, '#86848c');
    g.addColorStop(1, '#46444c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,18,24,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // facet lines and moss
    ctx.strokeStyle = 'rgba(30,28,34,0.35)';
    ctx.beginPath();
    ctx.moveTo(pts[5].x, pts[5].y);
    ctx.lineTo(b.x + 2, b.y - 12);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,140,60,0.75)';
    ctx.beginPath();
    ctx.ellipse(b.x - 6, b.y - 30, 10, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    applyGrain(ctx, b.x - 40, b.y - 50, 80, 60, 0.35);
    ctx.restore();
  }, 20);
}

function signpost(ctx: Ctx, P: Proj, x: number, y: number) {
  const b = P(x, y, 0);
  groundShadow(ctx, b.x, b.y, 16, 0.35);
  const g = ctx.createLinearGradient(b.x - 3, 0, b.x + 3, 0);
  g.addColorStop(0, '#8a5a30');
  g.addColorStop(1, '#3a2414');
  ctx.fillStyle = g;
  ctx.fillRect(b.x - 3, b.y - 62, 6, 62);
  // two arrow planks
  for (const [dy, dir] of [[-56, 1], [-40, -1]] as const) {
    ctx.fillStyle = '#9a6a3a';
    ctx.beginPath();
    const x0 = b.x - 20 * dir;
    ctx.moveTo(x0, b.y + dy);
    ctx.lineTo(b.x + 22 * dir, b.y + dy);
    ctx.lineTo(b.x + 30 * dir, b.y + dy + 6);
    ctx.lineTo(b.x + 22 * dir, b.y + dy + 12);
    ctx.lineTo(x0, b.y + dy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a2414';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,35,15,0.6)';
    ctx.beginPath();
    ctx.moveTo(b.x - 12 * dir, b.y + dy + 6);
    ctx.lineTo(b.x + 16 * dir, b.y + dy + 6);
    ctx.stroke();
  }
}

function towerKeep(ctx: Ctx, P: Proj, cx: number, cy: number) {
  const R = 3.35;
  const Hh = 8.5;
  const base = P(cx, cy, 0);
  const top = P(cx, cy, Hh);
  const rx = R * HW * Math.SQRT2;
  const ry = R * HH * Math.SQRT2;
  groundShadow(ctx, base.x + 40, base.y + 20, rx * 1.3, 0.45);
  // body
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(top.x - rx, top.y);
  ctx.ellipse(top.x, top.y, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  const g = ctx.createLinearGradient(base.x - rx, 0, base.x + rx, 0);
  g.addColorStop(0, '#c9bca6');
  g.addColorStop(0.35, '#a8997f');
  g.addColorStop(0.8, '#6a5e4e');
  g.addColorStop(1, '#4a4038');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // stone courses: ellipse arcs with staggered joints
  const r = rng(9);
  for (let z = 0.35; z < Hh; z += 0.35) {
    const c = P(cx, cy, z);
    ctx.strokeStyle = 'rgba(40,32,24,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
    for (let a = (Math.round(z / 0.35) % 2) * 0.12; a < Math.PI; a += 0.24 + r() * 0.05) {
      const x = c.x + Math.cos(a) * rx;
      const y = c.y + Math.sin(a) * ry;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 0.35 * 40);
      ctx.stroke();
    }
  }
  applyGrain(ctx, base.x - rx, top.y - ry, rx * 2, base.y - top.y + ry * 2, 0.3);
  // ivy creeping up the sunny side
  for (let i = 0; i < 90; i++) {
    const a = Math.PI * (0.55 + r() * 0.4);
    const z = Math.pow(r(), 1.6) * Hh * 0.6;
    const c = P(cx, cy, z);
    ctx.fillStyle = shade('#3f7a3a', (r() - 0.5) * 0.5);
    ctx.beginPath();
    ctx.ellipse(c.x + Math.cos(a) * rx * 0.98, c.y + Math.sin(a) * ry, 4, 3, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // arched windows glowing warm
  for (const [a, z] of [[0.95, 3.2], [1.9, 4.6], [0.6, 6.3], [1.4, 7.4], [2.3, 7.4], [1.2, 2.0]] as const) {
    const c = P(cx, cy, z);
    const x = c.x + Math.cos(a) * rx * 0.97;
    const y = c.y + Math.sin(a) * ry;
    const w = 9 * Math.sin(a);
    ctx.fillStyle = '#2a2018';
    ctx.beginPath();
    ctx.moveTo(x - w - 2, y + 14);
    ctx.lineTo(x - w - 2, y - 6);
    ctx.quadraticCurveTo(x, y - 20, x + w + 2, y - 6);
    ctx.lineTo(x + w + 2, y + 14);
    ctx.fill();
    ctx.fillStyle = '#ffc070';
    ctx.beginPath();
    ctx.moveTo(x - w, y + 12);
    ctx.lineTo(x - w, y - 5);
    ctx.quadraticCurveTo(x, y - 17, x + w, y - 5);
    ctx.lineTo(x + w, y + 12);
    ctx.fill();
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(x - 0.7, y - 12, 1.4, 24);
  }
  // door facing the camera
  const d = P(cx + R * 0.72, cy + R * 0.72, 0);
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath();
  ctx.moveTo(d.x - 20, d.y + 2);
  ctx.lineTo(d.x - 20, d.y - 44);
  ctx.quadraticCurveTo(d.x, d.y - 70, d.x + 20, d.y - 44);
  ctx.lineTo(d.x + 20, d.y + 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bca6';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  for (let i = -12; i <= 12; i += 8) {
    ctx.beginPath();
    ctx.moveTo(d.x + i, d.y);
    ctx.lineTo(d.x + i, d.y - 50);
    ctx.stroke();
  }
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.arc(d.x + 10, d.y - 22, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // crenellated parapet
  const parapetR = rx * 1.08;
  const pry = ry * 1.08;
  ctx.fillStyle = '#8a7e6c';
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, parapetR, pry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8ab94';
  ctx.beginPath();
  ctx.ellipse(top.x, top.y - 4, parapetR, pry, 0, 0, Math.PI * 2);
  ctx.fill();
  const merlons: [number, number][] = [];
  for (let i = 0; i < 16; i++) merlons.push([i / 16 * Math.PI * 2, Math.sin(i / 16 * Math.PI * 2)]);
  merlons.sort((a, b) => a[1] - b[1]);
  // back merlons, roof, front merlons
  const drawMerlon = (a: number) => {
    const x = top.x + Math.cos(a) * parapetR;
    const y = top.y - 4 + Math.sin(a) * pry;
    const lg = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
    lg.addColorStop(0, Math.cos(a) < 0 ? '#d0c4ae' : '#8a7e6c');
    lg.addColorStop(1, Math.cos(a) < 0 ? '#a8997f' : '#5a5046');
    ctx.fillStyle = lg;
    ctx.fillRect(x - 8, y - 18, 16, 18);
    ctx.fillStyle = '#d8ccb6';
    ctx.fillRect(x - 8, y - 20, 16, 3);
  };
  for (const [a, s] of merlons) if (s < 0) drawMerlon(a);
  // slate cone roof
  const apex = P(cx, cy, Hh + 5.2);
  ctx.beginPath();
  ctx.moveTo(top.x - rx * 0.9, top.y - 10);
  ctx.quadraticCurveTo(top.x - rx * 0.4, top.y - 60, apex.x, apex.y);
  ctx.quadraticCurveTo(top.x + rx * 0.4, top.y - 60, top.x + rx * 0.9, top.y - 10);
  ctx.ellipse(top.x, top.y - 10, rx * 0.9, ry * 0.9, 0, 0, Math.PI);
  ctx.closePath();
  const rg = ctx.createLinearGradient(top.x - rx, 0, top.x + rx, 0);
  rg.addColorStop(0, '#6a5a9a');
  rg.addColorStop(0.4, '#4a3c78');
  rg.addColorStop(1, '#221a3c');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(20,14,40,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const yy = apex.y + (top.y - apex.y) * t;
    ctx.beginPath();
    ctx.ellipse(top.x, yy, rx * 0.9 * t, ry * 0.9 * t, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  // a pennant
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.lineTo(apex.x, apex.y - 36);
  ctx.stroke();
  ctx.fillStyle = '#5dbb4a';
  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y - 36);
  ctx.quadraticCurveTo(apex.x + 20, apex.y - 34, apex.x + 32, apex.y - 28);
  ctx.quadraticCurveTo(apex.x + 18, apex.y - 26, apex.x, apex.y - 22);
  ctx.fill();
  for (const [a, s] of merlons) if (s >= 0) drawMerlon(a);
}
