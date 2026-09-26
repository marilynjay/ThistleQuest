import { Input } from './engine/input';
import { Game, VIEW_H, VIEW_W } from './game/game';
import { drawGame } from './game/render';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

let scale = 1;
function resize() {
  // Integer scaling keeps every pixel the same size, which is what sells the pixel-art look.
  scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas, (x, y) => ({ x: x / scale, y: y / scale }));
const game = new Game(input);
// Handy for poking at the game from the browser console.
(window as unknown as { game: Game }).game = game;

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function drawCursor() {
  const x = Math.round(input.mouseX);
  const y = Math.round(input.mouseY);
  ctx.fillStyle = '#1a1626';
  ctx.fillRect(x - 4, y - 1, 9, 3);
  ctx.fillRect(x - 1, y - 4, 3, 9);
  ctx.fillStyle = '#f4eedd';
  ctx.fillRect(x - 3, y, 2, 1);
  ctx.fillRect(x + 2, y, 2, 1);
  ctx.fillRect(x, y - 3, 1, 2);
  ctx.fillRect(x, y + 2, 1, 2);
}

function frame(now: number) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    input.endFrame();
    acc -= STEP;
  }
  drawGame(game, ctx);
  drawCursor();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
