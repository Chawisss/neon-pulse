// ============================================================
// entities.js — Enemies, bullets, pickups (spawning, AI, drawing)
// ============================================================

// FIX #8: helper for frame-rate-independent exponential approach.
// `factor` is the per-frame-at-60fps lerp factor (e.g. 0.05).
// At dt=1 it equals factor; at dt=2 it's correctly compounded.
NP.expLerp = function(factor, dt) {
  return 1 - Math.pow(1 - factor, dt);
};

// =====================================================
// ENEMIES
// =====================================================
NP.Enemies = {
  // Spawn one enemy at a specific position
  spawnAt(x, y, type) {
    const e = {
      x, y, type,
      vx: 0, vy: 0,
      hp: 1, maxHp: 1,
      r: 14, color: '#ff2eb8',
      hitFlash: 0, angle: 0,
      fireTimer: NP.rand(60, 120),
      wobble: NP.rand(0, NP.TAU),
      // FIX #6: defaults so that an unknown type can't NaN the scoring system
      speed: 1.0,
      score: 100,
    };

    switch (type) {
      case 'chaser':
        e.r = 14; e.hp = e.maxHp = 2; e.speed = 1.6;
        e.color = '#ff2eb8'; e.score = 100; break;
      case 'fast':
        e.r = 10; e.hp = e.maxHp = 1; e.speed = 2.9;
        e.color = '#2effe8'; e.score = 150; break;
      case 'tank':
        e.r = 24; e.hp = e.maxHp = 8; e.speed = 0.75;
        e.color = '#ff7a00'; e.score = 350; break;
      case 'shooter':
        e.r = 16; e.hp = e.maxHp = 3; e.speed = 1.2;
        e.color = '#9d6bff'; e.score = 250; e.fireRate = 100; break;
      case 'splitter':
        e.r = 20; e.hp = e.maxHp = 4; e.speed = 1.0;
        e.color = '#ffaa00'; e.score = 200; e.splits = true; break;
      case 'orbiter':
        e.r = 13; e.hp = e.maxHp = 2; e.speed = 1.5;
        e.color = '#00d4ff'; e.score = 175;
        e.orbitAngle = NP.rand(0, NP.TAU); break;
      case 'sniper':
        e.r = 18; e.hp = e.maxHp = 3; e.speed = 0.8;
        e.color = '#ff003c'; e.score = 400; e.fireRate = 180; break;
      case 'swarmer':
        e.r = 7; e.hp = e.maxHp = 1; e.speed = 3.2;
        e.color = '#ffff00'; e.score = 80; break;
      case 'shielded':
        e.r = 18; e.hp = e.maxHp = 4; e.speed = 1.0;
        e.color = '#2effb8'; e.score = 300;
        e.shield = 100; e.shieldMax = 100;
        e.shieldAngle = NP.rand(0, NP.TAU); break;
      case 'minibossA':
        e.r = 40; e.hp = e.maxHp = 25; e.speed = 1.0;
        e.color = '#ff003c'; e.score = 1500;
        e.fireRate = 50; e.isMini = true; break;
      case 'boss':
        e.r = 70; e.hp = e.maxHp = 100; e.speed = 0.5;
        e.color = '#ff003c'; e.score = 5000;
        e.isBoss = true; e.fireRate = 30; e.phase = 1; break;
      default:
        console.warn('[Enemies] unknown type:', type);
    }
    NP.enemies.push(e);
    return e;
  },

  // Spawn one enemy at a random screen edge
  spawnFromEdge(type) {
    const side = NP.randInt(0, 3);
    const m = 80;
    let x, y;
    if (side === 0)      { x = NP.rand(0, NP.W); y = -m; }
    else if (side === 1) { x = NP.W + m;         y = NP.rand(0, NP.H); }
    else if (side === 2) { x = NP.rand(0, NP.W); y = NP.H + m; }
    else                 { x = -m;               y = NP.rand(0, NP.H); }
    return this.spawnAt(x, y, type);
  },

  // Update one enemy's AI
  updateOne(e, T) {
    e.angle += 0.025 * T;
    e.wobble += 0.08 * T;
    if (e.hitFlash > 0) e.hitFlash -= T;
    // Regen shield
    if (e.shieldMax && e.shield < e.shieldMax) {
      e.shield = Math.min(e.shieldMax, e.shield + 0.2 * T);
    }

    const p = NP.player;
    const da = NP.angleTo(e.x, e.y, p.x, p.y);
    const d  = NP.dist(e.x, e.y, p.x, p.y);

    switch (e.type) {
      case 'shooter': this.ai_shooter(e, da, d, T); break;
      case 'orbiter': this.ai_orbiter(e, da, d, T); break;
      case 'sniper':  this.ai_sniper(e, da, d, T);  break;
      default:
        if (e.isMini)      this.ai_miniboss(e, da, d, T);
        else if (e.isBoss) this.ai_boss(e, da, d, T);
        else               this.ai_chase(e, da, d, T);
    }

    e.x += e.vx * T;
    e.y += e.vy * T;

    // Contact damage
    if (NP.dist(e.x, e.y, p.x, p.y) < e.r + p.r) {
      NP.Player.takeDamage(e.isBoss ? 25 : (e.isMini ? 20 : 15));
      const pa = NP.angleTo(p.x, p.y, e.x, e.y);
      e.vx += Math.cos(pa) * 5;
      e.vy += Math.sin(pa) * 5;
    }
  },

  // ---- AI behaviors ---------------------------------------------
  // FIX #8: every NP.lerp call below now uses NP.expLerp(rate, T) so the AI
  // behaves identically regardless of refresh rate / lag spikes.
  ai_chase(e, da, d, T) {
    let mx = Math.cos(da) * e.speed;
    let my = Math.sin(da) * e.speed;
    if (e.type === 'swarmer' || e.type === 'fast') {
      mx += Math.cos(e.wobble * 3) * 0.6;
      my += Math.sin(e.wobble * 3) * 0.6;
    }
    const k = NP.expLerp(0.05, T);
    e.vx = NP.lerp(e.vx, mx, k);
    e.vy = NP.lerp(e.vy, my, k);
  },

  ai_shooter(e, da, d, T) {
    const target = 300;
    const moveAng = d > target ? da : (d < target - 40 ? da + Math.PI : da + Math.PI / 2);
    const k = NP.expLerp(0.1, T);
    e.vx = NP.lerp(e.vx, Math.cos(moveAng) * e.speed, k);
    e.vy = NP.lerp(e.vy, Math.sin(moveAng) * e.speed, k);
    e.fireTimer -= T;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      const sp = 5;
      NP.enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(da) * sp, vy: Math.sin(da) * sp,
        r: 5, life: 160, color: e.color, damage: 10,
        trailTimer: 0,
      });
      NP.Effects.spawnParticles(e.x, e.y, 4, e.color, { speed: 2, life: 14, size: 2 });
    }
  },

  ai_orbiter(e, da, d, T) {
    const target = 200;
    e.orbitAngle += 0.025 * T;
    const tx = NP.player.x + Math.cos(e.orbitAngle) * target;
    const ty = NP.player.y + Math.sin(e.orbitAngle) * target;
    const oa = NP.angleTo(e.x, e.y, tx, ty);
    const k = NP.expLerp(0.08, T);
    e.vx = NP.lerp(e.vx, Math.cos(oa) * e.speed, k);
    e.vy = NP.lerp(e.vy, Math.sin(oa) * e.speed, k);
    e.fireTimer -= T;
    if (e.fireTimer <= 0 && d < 350) {
      e.fireTimer = 80;
      const sp = 4;
      NP.enemyBullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(da) * sp, vy: Math.sin(da) * sp,
        r: 4, life: 120, color: e.color, damage: 8,
        trailTimer: 0,
      });
    }
  },

  ai_sniper(e, da, d, T) {
    // FIX #8: frame-rate-independent drag
    const drag = Math.pow(0.9, T);
    e.vx *= drag; e.vy *= drag;
    e.fireTimer -= T;
    // Aim warning beam (last 60 frames before firing)
    if (e.fireTimer < 60 && e.fireTimer > 0) {
      const len = 1200;
      let aim = NP.lasers.find(l => l.owner === e && !l.firing);
      if (!aim) {
        aim = { owner: e, x1: e.x, y1: e.y, x2: 0, y2: 0, life: 60, firing: false };
        NP.lasers.push(aim);
      }
      aim.life = e.fireTimer;
      aim.x1 = e.x; aim.y1 = e.y;
      const an = NP.angleTo(e.x, e.y, NP.player.x, NP.player.y);
      aim.x2 = e.x + Math.cos(an) * len;
      aim.y2 = e.y + Math.sin(an) * len;
    }
    // Fire real laser
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      const an = NP.angleTo(e.x, e.y, NP.player.x, NP.player.y);
      const len = 1500;
      NP.lasers.push({
        owner: e, x1: e.x, y1: e.y,
        x2: e.x + Math.cos(an) * len, y2: e.y + Math.sin(an) * len,
        life: 12, firing: true
      });
      // Remove pre-fire aim line
      for (let k = NP.lasers.length - 1; k >= 0; k--) {
        if (NP.lasers[k].owner === e && !NP.lasers[k].firing) NP.lasers.splice(k, 1);
      }
      NP.Effects.spawnShockwave(e.x, e.y, e.color, 80, 18);
      NP.sfx.laser();
    }
  },

  ai_miniboss(e, da, d, T) {
    const target = 250;
    const orbitAng = da + Math.PI / 2 + Math.sin(NP.state.time * 0.012) * 0.6;
    const moveAng = d > target + 80 ? da : (d < target - 80 ? da + Math.PI : orbitAng);
    const k = NP.expLerp(0.05, T);
    e.vx = NP.lerp(e.vx, Math.cos(moveAng) * e.speed, k);
    e.vy = NP.lerp(e.vy, Math.sin(moveAng) * e.speed, k);
    e.fireTimer -= T;
    if (e.fireTimer <= 0) {
      e.fireTimer = e.fireRate;
      const n = 5, off = NP.state.time * 0.04;
      for (let kk = 0; kk < n; kk++) {
        const a = (kk / n) * NP.TAU + off;
        NP.enemyBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
          r: 6, life: 180, color: e.color, damage: 12,
          trailTimer: 0,
        });
      }
    }
  },

  ai_boss(e, da, d, T) {
    // Phase based on HP
    const hpPct = e.hp / e.maxHp;
    if (hpPct < 0.33)      e.phase = 3;
    else if (hpPct < 0.66) e.phase = 2;
    else                   e.phase = 1;

    const orbitAng = da + Math.PI / 2 + Math.sin(NP.state.time * 0.01) * 0.5;
    const targetDist = 320;
    let moveAng;
    if (d > targetDist + 80)      moveAng = da;
    else if (d < targetDist - 80) moveAng = da + Math.PI;
    else                          moveAng = orbitAng;

    const speedMult = e.phase >= 2 ? 1.3 : 1;
    const k = NP.expLerp(0.05, T);
    e.vx = NP.lerp(e.vx, Math.cos(moveAng) * e.speed * speedMult, k);
    e.vy = NP.lerp(e.vy, Math.sin(moveAng) * e.speed * speedMult, k);

    e.fireTimer -= T;
    if (e.fireTimer <= 0) {
      e.fireTimer = Math.max(20, e.fireRate - e.phase * 5);
      if (e.phase === 1) {
        // 8-way radial
        const n = 8, off = NP.state.time * 0.05;
        for (let kk = 0; kk < n; kk++) {
          const a = (kk / n) * NP.TAU + off;
          NP.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4,
            r: 6, life: 200, color: e.color, damage: 12, trailTimer: 0,
          });
        }
      } else if (e.phase === 2) {
        // 3-stream spiral
        for (let s = 0; s < 3; s++) {
          const a = NP.state.time * 0.05 + s * NP.TAU / 3;
          NP.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
            r: 7, life: 200, color: e.color, damage: 12, trailTimer: 0,
          });
        }
      } else {
        // 12-way radial + aimed shot
        const n = 12, off = NP.state.time * 0.08;
        for (let kk = 0; kk < n; kk++) {
          const a = (kk / n) * NP.TAU + off;
          NP.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
            r: 7, life: 220, color: e.color, damage: 14, trailTimer: 0,
          });
        }
        NP.enemyBullets.push({
          x: e.x, y: e.y, vx: Math.cos(da) * 7, vy: Math.sin(da) * 7,
          r: 9, life: 200, color: '#fff', damage: 18, trailTimer: 0,
        });
      }
      NP.Effects.spawnShockwave(e.x, e.y, e.color, 90, 22);
    }
  },

  // ---- Update all enemies + enemy bullets + lasers --------------
  update(T) {
    // Enemy bullets
    for (let i = NP.enemyBullets.length - 1; i >= 0; i--) {
      const b = NP.enemyBullets[i];
      b.x += b.vx * T;
      b.y += b.vy * T;
      b.life -= T;
      // FIX #12: timer-based trail spawn so it doesn't go crazy at high refresh
      // rates and doesn't stop in slow-mo. Spawns roughly every ~3 frames at 60fps.
      b.trailTimer = (b.trailTimer || 0) - T;
      if (b.trailTimer <= 0) {
        NP.Effects.spawnParticles(b.x, b.y, 1, b.color, {
          speed: 0.2, life: 14, size: 1.5, drag: 0.9, lowPriority: true
        });
        b.trailTimer = 3;
      }
      if (b.life <= 0 || b.x < -30 || b.x > NP.W + 30 || b.y < -30 || b.y > NP.H + 30) {
        NP.enemyBullets.splice(i, 1);
        continue;
      }
      if (NP.dist(b.x, b.y, NP.player.x, NP.player.y) < b.r + NP.player.r) {
        NP.Player.takeDamage(b.damage || 10);
        NP.enemyBullets.splice(i, 1);
      }
    }

    // Lasers (sniper)
    for (let i = NP.lasers.length - 1; i >= 0; i--) {
      const l = NP.lasers[i];
      l.life -= T;
      if (l.life <= 0) { NP.lasers.splice(i, 1); continue; }
      if (l.firing) {
        // Line-vs-point distance
        const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
        const len2 = dx * dx + dy * dy;
        if (len2 < 0.0001) continue; // guard against degenerate beams
        const t = NP.clamp(((NP.player.x - l.x1) * dx + (NP.player.y - l.y1) * dy) / len2, 0, 1);
        const px = l.x1 + t * dx, py = l.y1 + t * dy;
        if (NP.dist(px, py, NP.player.x, NP.player.y) < NP.player.r + 4) {
          NP.Player.takeDamage(20);
          l.firing = false;
        }
      }
    }

    // Enemies themselves
    for (let i = NP.enemies.length - 1; i >= 0; i--) {
      this.updateOne(NP.enemies[i], T);
    }
  },

  // ---- Drawing --------------------------------------------------
  draw(ctx) {
    for (const e of NP.enemies) {
      this.drawOne(ctx, e);
    }
  },

  drawOne(ctx, e) {
    const flash = e.hitFlash > 0;
    const col = flash ? '#fff' : e.color;

    // Halo
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.5);
    grad.addColorStop(0, e.color + '55');
    grad.addColorStop(1, e.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(e.x - e.r * 3, e.y - e.r * 3, e.r * 6, e.r * 6);
    ctx.restore();

    // Body shape based on type
    switch (e.type) {
      case 'chaser':   NP.drawPolygon(ctx, e.x, e.y, e.r, 3, e.angle, col, flash); break;
      case 'fast':     NP.drawPolygon(ctx, e.x, e.y, e.r, 4, e.angle + Math.PI / 4, col, flash); break;
      case 'swarmer':  NP.drawPolygon(ctx, e.x, e.y, e.r, 3, e.angle + Math.sin(e.wobble), col, true); break;
      case 'tank':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 4, e.angle, col, flash, 30);
        NP.drawPolygon(ctx, e.x, e.y, e.r * 0.6, 4, -e.angle * 1.5, col, false, 20);
        break;
      case 'shooter':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 6, e.angle, col, flash);
        NP.drawPolygon(ctx, e.x, e.y, e.r * 0.4, 6, -e.angle * 2, col, false, 16);
        break;
      case 'splitter':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 3, e.angle, col, flash);
        NP.drawPolygon(ctx, e.x, e.y, e.r * 0.6, 3, -e.angle * 1.5 + Math.PI, col, false, 18);
        break;
      case 'orbiter':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 5, e.angle, col, flash);
        // small dot satellite
        const oa = e.orbitAngle * 3;
        ctx.save();
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(oa) * e.r * 1.4, e.y + Math.sin(oa) * e.r * 1.4, 3, 0, NP.TAU);
        ctx.fill();
        ctx.restore();
        break;
      case 'sniper':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 8, e.angle, col, flash, 24);
        // inner cross
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(-e.angle);
        ctx.strokeStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-e.r * 0.5, 0); ctx.lineTo(e.r * 0.5, 0);
        ctx.moveTo(0, -e.r * 0.5); ctx.lineTo(0, e.r * 0.5);
        ctx.stroke();
        ctx.restore();
        break;
      case 'shielded':
        NP.drawPolygon(ctx, e.x, e.y, e.r, 5, e.angle, col, flash);
        if (e.shield > 0) {
          e.shieldAngle += 0.05;
          const sa = e.shield / e.shieldMax;
          ctx.save();
          ctx.strokeStyle = '#2effb8';
          ctx.globalAlpha = sa * 0.7;
          ctx.shadowColor = '#2effb8';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * NP.TAU + e.shieldAngle;
            ctx.arc(e.x, e.y, e.r * 1.6, ang, ang + 0.4);
          }
          ctx.stroke();
          ctx.restore();
        }
        break;
      default:
        if (e.isMini) this.drawMiniboss(ctx, e, col, flash);
        else if (e.isBoss) this.drawBoss(ctx, e, flash);
    }
  },

  drawMiniboss(ctx, e, col, flash) {
    NP.drawPolygon(ctx, e.x, e.y, e.r, 5, e.angle, col, false, 35);
    NP.drawPolygon(ctx, e.x, e.y, e.r * 0.7, 5, -e.angle * 1.3, col, flash, 25);
    NP.drawPolygon(ctx, e.x, e.y, e.r * 0.35, 3, e.angle * 2, '#fff', false, 18);
    // HP bar
    const bw = 120, bh = 4;
    const bx = e.x - bw / 2, by = e.y - e.r - 16;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color; ctx.shadowBlur = 10;
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
    ctx.shadowBlur = 0;
  },

  drawBoss(ctx, e, flash) {
    const phaseColor = e.phase === 3 ? '#ffaa00' : (e.phase === 2 ? '#ff003c' : e.color);
    NP.drawPolygon(ctx, e.x, e.y, e.r, 6, e.angle, phaseColor, false, 60);
    NP.drawPolygon(ctx, e.x, e.y, e.r * 0.85, 6, -e.angle * 1.3, phaseColor, flash, 50);
    NP.drawPolygon(ctx, e.x, e.y, e.r * 0.55, 3, e.angle * 2, '#fff', false, 35);

    // Pulsing core
    const pulse = 0.7 + Math.sin(NP.state.time * 0.12) * 0.3;
    ctx.save();
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 50;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 10, 0, NP.TAU);
    ctx.fill();
    ctx.restore();

    // Phase indicator rings
    if (e.phase >= 2) {
      ctx.save();
      ctx.strokeStyle = '#ff003c';
      ctx.shadowColor = '#ff003c';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 2;
      for (let k = 0; k < e.phase + 1; k++) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        const r = e.r * 1.4 + k * 8;
        const off = NP.state.time * 0.02 * (k % 2 === 0 ? 1 : -1);
        for (let m = 0; m < 3; m++) {
          const a = (m / 3) * NP.TAU + off;
          ctx.arc(e.x, e.y, r, a, a + 0.6);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Boss HP bar
    const bw = 280, bh = 8;
    const bx = e.x - bw / 2, by = e.y - e.r - 30;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color; ctx.shadowBlur = 14;
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
    ctx.shadowBlur = 0;
    // Phase dividers
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx + bw * 0.33 - 1, by, 2, bh);
    ctx.fillRect(bx + bw * 0.66 - 1, by, 2, bh);
  },
};

// =====================================================
// BULLETS (player-fired)
// =====================================================
NP.Bullets = {
  update(T) {
    for (let i = NP.bullets.length - 1; i >= 0; i--) {
      const b = NP.bullets[i];

      // Missile homing
      if (b.isMissile) {
        if (b.target && NP.enemies.indexOf(b.target) !== -1) {
          const desired = NP.angleTo(b.x, b.y, b.target.x, b.target.y);
          let da = desired - b.angle;
          while (da > Math.PI)  da -= NP.TAU;
          while (da < -Math.PI) da += NP.TAU;
          b.angle += NP.clamp(da, -0.12, 0.12) * T;
          const sp = 9;
          b.vx = Math.cos(b.angle) * sp;
          b.vy = Math.sin(b.angle) * sp;
        } else {
          // Re-acquire
          let nearest = null, nd = Infinity;
          for (const e of NP.enemies) {
            const d = NP.dist(b.x, b.y, e.x, e.y);
            if (d < nd) { nd = d; nearest = e; }
          }
          b.target = nearest;
        }
      }

      b.x += b.vx * T;
      b.y += b.vy * T;
      b.life -= T;

      // Bullet trails
      b.trailTimer = (b.trailTimer || 0) - T;
      if (b.trailTimer <= 0) {
        const trailSize = b.trailSize || (b.isMissile ? 4 : (b.isLaser ? 3 : 2));
        const trailLife = b.trailLife || (b.isLaser ? 14 : 18);
        const trailEvery = b.trailEvery || (b.isLaser ? 0.75 : (b.isMissile ? 1.6 : 2));
        NP.Effects.spawnParticles(b.x, b.y, 1, b.color, {
          speed: 0.3, life: trailLife, size: trailSize, drag: 0.85, lowPriority: true
        });
        b.trailTimer = trailEvery;
      }

      // Off-screen / expired
      if (b.life <= 0 || b.x < -30 || b.x > NP.W + 30 || b.y < -30 || b.y > NP.H + 30) {
        if (b.explode) NP.Player.applyExplosion(b.x, b.y, 80, 2);
        NP.bullets.splice(i, 1);
        continue;
      }

      // Collisions with enemies
      let consumed = false;
      for (let j = NP.enemies.length - 1; j >= 0; j--) {
        const e = NP.enemies[j];
        if (NP.dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
          // FIX #3: route through damageEnemy for consistent shield handling.
          // (No behaviour change here — Bullets already handled shields — but
          // it keeps the rule in one place.)
          const shielded = e.shield && e.shield > 0;
          NP.Player.damageEnemy(e, b.damage);
          NP.Effects.spawnParticles(b.x, b.y, shielded ? 4 : 6,
            shielded ? '#2effb8' : e.color,
            { speed: shielded ? 3 : 4, life: shielded ? 14 : 20, size: shielded ? 2 : 3 });
          NP.sfx.hit();

          if (b.explode) {
            NP.Player.applyExplosion(b.x, b.y, 80, 2);
            NP.bullets.splice(i, 1);
            consumed = true;
            break;
          }
          if (b.pierce > 0) b.pierce--;
          else { NP.bullets.splice(i, 1); consumed = true; break; }
        }
      }
      if (consumed) continue;
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Player bullets
    for (const b of NP.bullets) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.isLaser ? 28 : (b.isMissile ? 22 : 20);
      ctx.fillStyle = b.color;
      if (b.isLaser) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.fillRect(-12, -2, 24, 4);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, NP.TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, (b.isLaser ? 1.5 : b.r * 0.4), 0, NP.TAU);
      ctx.fill();
      // Missile triangle
      if (b.isMissile) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.shadowColor = b.color; ctx.shadowBlur = 14;
        ctx.strokeStyle = b.color; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }
    // Enemy bullets
    for (const b of NP.enemyBullets) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, NP.TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.3, 0, NP.TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawLasers(ctx) {
    ctx.save();
    for (const l of NP.lasers) {
      const a = l.life / 60;
      if (l.firing) {
        ctx.strokeStyle = l.owner.color;
        ctx.shadowColor = l.owner.color;
        ctx.shadowBlur = 30;
        ctx.lineWidth = 6 * (l.life / 12);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        // White inner
        ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Aim warning (dashed)
        ctx.strokeStyle = l.owner.color;
        ctx.shadowColor = l.owner.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (1 - a) * 0.6;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  },
};

// =====================================================
// PICKUPS
// =====================================================
NP.Pickups = {
  maybeDrop(x, y, force = null) {
    if (!force && Math.random() > 0.12) return;
    let type;
    if (force) type = force;
    else {
      const roll = Math.random();
      if (roll < 0.4)       type = 'heal';
      else if (roll < 0.55) type = 'energy';
      else                  type = ['spread', 'laser', 'missile', 'lightning'][NP.randInt(0, 3)];
    }
    NP.pickups.push({
      x, y, r: 11, life: 720,
      type, color: NP.PICKUP_COLORS[type],
      pulse: NP.rand(0, NP.TAU)
    });
  },

  update(T) {
    for (let i = NP.pickups.length - 1; i >= 0; i--) {
      const p = NP.pickups[i];
      p.pulse += 0.1 * T;
      p.life -= T;
      if (p.life <= 0) { NP.pickups.splice(i, 1); continue; }

      // Magnetism when close
      const pd = NP.dist(p.x, p.y, NP.player.x, NP.player.y);
      if (pd < 80) {
        const pa = NP.angleTo(p.x, p.y, NP.player.x, NP.player.y);
        p.x += Math.cos(pa) * 3 * T;
        p.y += Math.sin(pa) * 3 * T;
      }
      // Collect
      if (pd < p.r + NP.player.r + 4) {
        this.collect(p);
        NP.pickups.splice(i, 1);
      }
    }
  },

  collect(p) {
    NP.sfx.pickup();
    NP.Effects.spawnParticles(p.x, p.y, 20, p.color, { speed: 5, life: 30, size: 3 });
    NP.Effects.spawnShockwave(p.x, p.y, p.color, 90, 22);

    if (p.type === 'heal') {
      NP.player.hp = Math.min(NP.player.maxHp, NP.player.hp + 30);
      NP.HUD.pickupNotif('+30 HULL', p.color);
    } else if (p.type === 'energy') {
      NP.player.energy = Math.min(NP.player.maxEnergy, NP.player.energy + 50);
      NP.HUD.pickupNotif('+50 ENERGY', p.color);
    } else {
      const wmap = { spread: 'SPREAD', laser: 'LASER', missile: 'MISSILE', lightning: 'LIGHTNING' };
      const wname = wmap[p.type];
      NP.player.weapon = wname;
      NP.player.weaponAmmo = NP.WEAPONS[wname].ammo;
      NP.HUD.pickupNotif(wname + ' ACQUIRED', p.color);
      NP.HUD.updateWeapon();
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of NP.pickups) {
      const s = 1 + Math.sin(p.pulse) * 0.25;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 28;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(s, s);

      if (p.type === 'heal') {
        // Cross
        ctx.beginPath();
        ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0);
        ctx.moveTo(0, -p.r); ctx.lineTo(0, p.r);
        ctx.stroke();
      } else if (p.type === 'energy') {
        // Diamond
        ctx.beginPath();
        ctx.moveTo(0, -p.r); ctx.lineTo(p.r, 0);
        ctx.lineTo(0, p.r); ctx.lineTo(-p.r, 0);
        ctx.closePath();
        ctx.stroke();
      } else {
        // Hexagon + letter
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * NP.TAU;
          const x = Math.cos(a) * p.r, y = Math.sin(a) * p.r;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(p.type[0].toUpperCase(), 0, 1);
      }
      ctx.restore();

      // Aura
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.color + '22';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.6 * s, 0, NP.TAU);
      ctx.fill();
    }
    ctx.restore();
  },
};

// =====================================================
// Shared helper: draw a regular polygon
// =====================================================
NP.drawPolygon = function(ctx, x, y, r, sides, angle, color, fill = false, glow = 20) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * NP.TAU - Math.PI / 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
  ctx.restore();
};
