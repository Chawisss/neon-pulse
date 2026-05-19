// ============================================================
// input.js — Keyboard and mouse input
// ============================================================

NP.Input = {
  keys: {},
  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false, rightDown: false },

  init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', e => {
      NP.Audio.init();
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());
  },

  // Helpers
  movementVector() {
    let mx = 0, my = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    my -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  my += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  mx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }
    return { x: mx, y: my };
  },
};
