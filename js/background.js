// ============================================================
// background.js — Parallax stars, nebulas, animated grid
// ============================================================

// FIX #10: positive modulo helper. JS `-5 % 60` returns -5; we want 55.
function pmod(v, m) { return ((v % m) + m) % m; }

NP.Background = {
  starLayers: [],
  nebulas: [],

  init() {
    this.starLayers = [
      { stars: [], speed: 0.3, size: 0.6, color: '180,160,255' },
      { stars: [], speed: 0.6, size: 1.0, color: '200,180,255' },
      { stars: [], speed: 1.0, size: 1.6, color: '255,220,255' },
    ];
    const counts = [200, 100, 50];
    this.starLayers.forEach((layer, idx) => {
      for (let i = 0; i < counts[idx]; i++) {
        layer.stars.push({
          x: NP.rand(0, NP.W), y: NP.rand(0, NP.H),
          r: NP.rand(0.3, layer.size), tw: NP.rand(0, NP.TAU),
        });
      }
    });

    this.nebulas = [];
    const nebulaColors = ['#ff2eb8', '#9d6bff', '#2eb8ff', '#ff8800'];
    for (let i = 0; i < 6; i++) {
      this.nebulas.push({
        x: NP.rand(0, NP.W), y: NP.rand(0, NP.H),
        r: NP.rand(150, 350),
        color: nebulaColors[NP.randInt(0, nebulaColors.length - 1)],
        drift: NP.rand(0, NP.TAU),
        speed: NP.rand(0.05, 0.15),
      });
    }
  },

  update(T) {
    for (const n of this.nebulas) {
      n.drift += 0.003 * T;
      n.x += Math.cos(n.drift) * n.speed * T;
      n.y += Math.sin(n.drift) * n.speed * T;
    }
    // FIX #9: advance star twinkle here (frame-rate-independent) instead of
    // in draw(). Draw should be pure rendering, and `+= 0.03` ignored T entirely.
    for (const layer of this.starLayers) {
      for (const s of layer.stars) {
        s.tw += 0.03 * T;
      }
    }
  },

  draw(ctx) {
    const W = NP.W, H = NP.H;
    ctx.fillStyle = 'rgba(2,1,10,1)';
    ctx.fillRect(0, 0, W, H);

    // Nebulas
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const n of this.nebulas) {
      const px = n.x - (NP.player.x - W / 2) * 0.05;
      const py = n.y - (NP.player.y - H / 2) * 0.05;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, n.r);
      grad.addColorStop(0, n.color + '40');
      grad.addColorStop(0.5, n.color + '15');
      grad.addColorStop(1, n.color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(px - n.r, py - n.r, n.r * 2, n.r * 2);
    }
    ctx.restore();

    // FIX #13: stars use one fillStyle per layer (base color) + globalAlpha
    // for twinkle, instead of building a fresh rgba() string for every star.
    // That kills ~21,000 string allocations per second.
    for (const layer of this.starLayers) {
      ctx.fillStyle = `rgb(${layer.color})`;
      for (const s of layer.stars) {
        const tw = 0.7 + Math.sin(s.tw) * 0.3;
        const px = pmod(s.x - (NP.player.x - W / 2) * layer.speed * 0.08, W);
        const py = pmod(s.y - (NP.player.y - H / 2) * layer.speed * 0.08, H);
        ctx.globalAlpha = tw * 0.7;
        ctx.fillRect(px, py, s.r * tw, s.r * tw);
      }
    }
    ctx.globalAlpha = 1;

    // Animated grid
    const gridSize = 60;
    const pulse = 0.05 + Math.sin(NP.state.time * 0.02) * 0.03;
    ctx.strokeStyle = `rgba(157, 107, 255, ${pulse})`;
    ctx.lineWidth = 1;
    // FIX #10: use positive modulo so grid origin doesn't jump around when the
    // expression goes negative.
    const ox = pmod(NP.state.time * 0.15 - NP.player.x * 0.05, gridSize);
    const oy = pmod(NP.state.time * 0.1  - NP.player.y * 0.05, gridSize);
    ctx.beginPath();
    for (let x = ox - gridSize; x < W; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = oy - gridSize; y < H; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // Radial glow around player
    const grad = ctx.createRadialGradient(NP.player.x, NP.player.y, 0, NP.player.x, NP.player.y, 300);
    const glowColor = NP.state.overdrive ? 'rgba(255,208,0,0.08)' : 'rgba(157, 107, 255, 0.06)';
    grad.addColorStop(0, glowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  },
};
