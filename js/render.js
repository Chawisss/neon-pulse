// ============================================================
// render.js — Canvas setup, main draw orchestration, post-FX
// ============================================================

NP.Render = {
  bgCanvas: null, bgCtx: null,
  canvas: null, ctx: null,
  fxCanvas: null, fxCtx: null,

  init() {
    this.bgCanvas = document.getElementById('bg-canvas');
    this.bgCtx    = this.bgCanvas.getContext('2d');
    this.canvas   = document.getElementById('game');
    this.ctx      = this.canvas.getContext('2d');
    this.fxCanvas = document.getElementById('fx-canvas');
    this.fxCtx    = this.fxCanvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    NP.W = window.innerWidth;
    NP.H = window.innerHeight;
    [this.bgCanvas, this.canvas, this.fxCanvas].forEach(c => {
      c.width = NP.W;
      c.height = NP.H;
    });
  },

  // Main per-frame draw
  draw() {
    // ---- Background canvas ----
    NP.Background.draw(this.bgCtx);

    // ---- Game canvas (with shake) ----
    const sx = (Math.random() - 0.5) * NP.state.shake;
    const sy = (Math.random() - 0.5) * NP.state.shake;
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, NP.W, NP.H);
    ctx.translate(sx, sy);

    NP.Effects.drawShockwaves(ctx);
    NP.Pickups.draw(ctx);
    NP.Effects.drawParticles(ctx);
    NP.Effects.drawLightnings(ctx);
    NP.Bullets.drawLasers(ctx);
    NP.Bullets.draw(ctx);
    NP.Enemies.draw(ctx);
    NP.Player.draw(ctx);
    NP.Effects.drawFloaters(ctx);

    ctx.restore();

    // ---- FX canvas: chromatic aberration + flash + cursor ----
    const fx = this.fxCtx;
    fx.clearRect(0, 0, NP.W, NP.H);

    if (NP.state.chromAb > 0.5) {
      fx.save();
      fx.globalCompositeOperation = 'screen';
      fx.globalAlpha = Math.min(0.5, NP.state.chromAb * 0.04);
      const off = NP.state.chromAb * 1.2;
      fx.fillStyle = '#ff003c'; fx.fillRect(-off, 0, NP.W, NP.H);
      fx.fillStyle = '#00ffff'; fx.fillRect( off, 0, NP.W, NP.H);
      fx.restore();
    }

    if (NP.state.flash > 0.01) {
      fx.save();
      fx.fillStyle = NP.state.flashColor;
      fx.globalAlpha = NP.state.flash;
      fx.fillRect(0, 0, NP.W, NP.H);
      fx.restore();
    }

    if (NP.state.overdrive) {
      fx.save();
      fx.fillStyle = '#ffd000';
      fx.globalAlpha = 0.04 + Math.sin(NP.state.time * 0.2) * 0.02;
      fx.fillRect(0, 0, NP.W, NP.H);
      fx.restore();
    }

    this.drawCursor(fx);
  },

  drawCursor(fx) {
    const mx = NP.Input.mouse.x, my = NP.Input.mouse.y;
    fx.save();
    fx.strokeStyle = NP.state.overdrive ? '#ffd000' : '#2effe8';
    fx.shadowColor = fx.strokeStyle;
    fx.shadowBlur = 14;
    fx.lineWidth = 1.5;
    const s = 14, r = 4;
    fx.beginPath();
    fx.moveTo(mx - s, my); fx.lineTo(mx - r, my);
    fx.moveTo(mx + r, my); fx.lineTo(mx + s, my);
    fx.moveTo(mx, my - s); fx.lineTo(mx, my - r);
    fx.moveTo(mx, my + r); fx.lineTo(mx, my + s);
    fx.stroke();
    fx.beginPath();
    fx.arc(mx, my, s + 2, 0, NP.TAU);
    fx.stroke();
    fx.restore();
  },
};
