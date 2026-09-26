import { Input } from './engine/input';
import { Game, VIEW_H, VIEW_W } from './game/game';
import { Renderer } from './game/render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// The game is laid out on a 1280x720 stage, scaled to fit the window at full device resolution.
let fit = 1;
let pixelScale = 1;
/** Dynamic resolution: drops when frames run long, recovers when there's headroom. */
let quality = 1;
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  pixelScale = fit * dpr * quality;
  canvas.width = Math.round(VIEW_W * pixelScale);
  canvas.height = Math.round(VIEW_H * pixelScale);
  canvas.style.width = `${Math.round(VIEW_W * fit)}px`;
  canvas.style.height = `${Math.round(VIEW_H * fit)}px`;
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas, (x, y) => ({ x: x / fit, y: y / fit }));
const game = new Game(input);
const renderer = new Renderer(game);

// Handy for poking at the game from the browser console.
(window as unknown as { game: Game; renderer: Renderer }).game = game;
(window as unknown as { renderer: Renderer }).renderer = renderer;

function drawCursor() {
  const x = input.mouseX;
  const y = input.mouseY;
  ctx.save();
  ctx.strokeStyle = 'rgba(10,8,16,0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f1ead8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#a8e08a';
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

async function start() {
  // Wait briefly for the web fonts, but never block the game on them.
  await Promise.race([
    Promise.all(['700 20px Cinzel', '400 16px Alegreya', '700 16px Alegreya'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => undefined);
  // Paint the tower now; the valley is painted a moment later, while the intro card is up.
  renderer.scene('tower');
  setTimeout(() => renderer.scene('valley'), 400);

  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;
  let slow = 0;
  let fast = 0;
  const frame = (now: number) => {
    const dt = (now - last) / 1000;
    acc += Math.min(0.1, dt);
    last = now;
    if (dt > 0.024) {
      slow++;
      fast = 0;
    } else if (dt < 0.018) {
      fast++;
      slow = Math.max(0, slow - 1);
    }
    if (slow > 30 && quality > 0.5) {
      quality = Math.max(0.5, quality - 0.15);
      slow = 0;
      resize();
    } else if (fast > 240 && quality < 1) {
      quality = Math.min(1, quality + 0.1);
      fast = 0;
      resize();
    }
    while (acc >= STEP) {
      game.update(STEP);
      input.endFrame();
      acc -= STEP;
    }
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    renderer.draw(ctx, pixelScale);
    drawCursor();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Paint a simple loading card while the scenes are painted.
ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
ctx.fillStyle = '#0b0a14';
ctx.fillRect(0, 0, VIEW_W, VIEW_H);
ctx.fillStyle = '#a8e08a';
ctx.font = '28px Georgia, serif';
ctx.textAlign = 'center';
ctx.fillText('Painting the tower…', VIEW_W / 2, VIEW_H / 2);
setTimeout(start, 30);
