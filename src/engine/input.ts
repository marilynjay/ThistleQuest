export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  mousePressed = false;
  wheel = 0;
  anyPressed = false;

  constructor(private canvas: HTMLCanvasElement, private toCanvas: (cx: number, cy: number) => { x: number; y: number }) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'tab'].includes(k)) e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      this.anyPressed = true;
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (e) => this.setMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this.setMouse(e);
      if (e.button === 0) {
        this.mouseDown = true;
        this.mousePressed = true;
      }
      if (e.button === 2) this.pressed.add('mouse2');
      this.anyPressed = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheel += Math.sign(e.deltaY);
      },
      { passive: false },
    );
  }

  private setMouse(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const p = this.toCanvas(e.clientX - r.left, e.clientY - r.top);
    this.mouseX = p.x;
    this.mouseY = p.y;
  }

  isDown(k: string): boolean {
    return this.down.has(k);
  }

  wasPressed(k: string): boolean {
    return this.pressed.has(k);
  }

  /** Call once at the end of every update tick. */
  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
    this.wheel = 0;
    this.anyPressed = false;
  }
}
