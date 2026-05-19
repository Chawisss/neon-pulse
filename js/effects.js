// ============================================================
// effects.js — Particles, shockwaves, lightning, floating text
// Spawn helpers + per-frame updates + drawing
// ============================================================

NP.Effects = {
  // ---- Spawners -------------------------------------------------
  spawnParticles(x, y, count, color, opts = {}) {
    const speed = opts.speed || 4;
    const life = opts.life || 40;
    const size = opts.size || 3;
    const baseAngle = opts.angle;
    const spread = opts.spread || 0.5;
    for (let i = 0; i < count; i++) {
      const a = baseAngle !== undefined
        ? baseAngle + NP.rand(-spread, spread)
        : NP.rand(0, NP.TAU);
      const s = NP.rand(speed * 0.3, speed);
      NP.particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life, maxLife: life,
        r: NP.rand(size * 0.5, size),
        color,
        drag: opts.drag !== undefined ? opts.drag : 0.92,
        glow: opts.glow !== false,
        gravity: opts.gravity || 0,
      });
    }
  },

  spawnFloater(x, y, text, color, big = false) {
    NP.floaters.push({
      x, y, text, color,
      life: 70, maxLife: 70,
      vy: -1.5,
      big,
    });
  },

  spawnShockwave(x, y, color, maxR = 200, life = 30, thickness = 4) {
    NP.shockwaves.push({
      x, y, r: 5, maxR, life, maxLife: life, color, thickness
    });
  },

  spawnLightning(x1, y1, x2, y2, color = '#9d6bff') {
    const segments = 8;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mx = NP.lerp(x1, x2, t) + (i === 0 || i === segments ? 0 : NP.rand(-20, 20));
      const my = NP.lerp(y1, y2, t) + (i === 0 || i === segments ? 0 : NP.rand(-20, 20));
      points.push({ x: mx, y: my });
    }
    NP.lightnings.push({ points, color, life: 12, maxLife: 12 });
  },

  // ---- Updates --------------------------------------------------
  update(T) {
    // Particles
    for (let i = NP.particles.length - 1; i >= 0; i--) {
      const p = NP.particles[i];
      p.x += p.vx * T;
      p.y += p.vy * T;
      p.vy += (p.gravity || 0) * T;
      p.vx *= Math.pow(p.drag, T);
      p.vy *= Math.pow(p.drag, T);
      p.life -= T;
      if (p.life <= 0) NP.particles.splice(i, 1);
    }

    // Shockwaves
    for (let i = NP.shockwaves.length - 1; i >= 0; i--) {
      const s = NP.shockwaves[i];
      s.r += (s.maxR - s.r) * 0.13 * T;
      s.life -= T;
      if (s.life <= 0) NP.shockwaves.splice(i, 1);
    }

    // Lightning bolts
    for (let i = NP.lightnings.length - 1; i >= 0; i--) {
      NP.lightnings[i].life -= T;
      if (NP.lightnings[i].life <= 0) NP.lightnings.splice(i, 1);
    }

    // Floaters
    for (let i = NP.floaters.length - 1; i >= 0; i--) {
      const f = NP.floaters[i];
      f.y += f.vy * T;
      f.vy *= 0.97;
      f.life -= T;
      if (f.life <= 0) NP.floaters.splice(i, 1);
    }
  },

  // ---- Drawing --------------------------------------------------
  drawShockwaves(ctx) {
    ctx.save();
    for (const s of NP.shockwaves) {
      const a = s.life / s.maxLife;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = (s.thickness || 4) * a + 1;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, NP.TAU);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawParticles(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of NP.particles) {
      const a = p.life / p.maxLife;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * a, 0, NP.TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawLightnings(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of NP.lightnings) {
      const a = l.life / l.maxLife;
      ctx.strokeStyle = l.color;
      ctx.globalAlpha = a;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3 * a;
      ctx.beginPath();
      for (let i = 0; i < l.points.length; i++) {
        if (i === 0) ctx.moveTo(l.points[i].x, l.points[i].y);
        else ctx.lineTo(l.points[i].x, l.points[i].y);
      }
      ctx.stroke();
      // White core
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 * a;
      ctx.shadowBlur = 6;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawFloaters(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    for (const f of NP.floaters) {
      const a = f.life / f.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.font = `bold ${f.big ? 32 : 14}px Orbitron`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  },
};
