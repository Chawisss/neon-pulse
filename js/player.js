// ============================================================
// player.js — Player movement, weapons, damage, scoring
// ============================================================

NP.Player = {

  // ---- Per-frame update -----------------------------------------
  update(T, PT) {
    const p = NP.player;
    const m = NP.Input.movementVector();

    // Dash overrides normal movement
    if (p.dashTimer > 0) {
      p.dashTimer -= PT;
      p.x += p.dashDir.x * NP.CONFIG.DASH_SPEED * PT;
      p.y += p.dashDir.y * NP.CONFIG.DASH_SPEED * PT;
      if (Math.random() < 0.7) {
        NP.Effects.spawnParticles(p.x, p.y, 2, '#2effe8', {
          speed: 1, life: 22, size: 3, drag: 0.9
        });
      }
    } else {
      const accel = 0.7, friction = 0.86;
      p.vx += m.x * accel * PT;
      p.vy += m.y * accel * PT;
      p.vx *= Math.pow(friction, PT);
      p.vy *= Math.pow(friction, PT);
      p.x += p.vx * PT;
      p.y += p.vy * PT;
    }

    // Dash trigger
    if (p.dashCooldown > 0) p.dashCooldown -= PT;
    if (NP.Input.keys['Space'] && p.dashCooldown <= 0 && (m.x !== 0 || m.y !== 0)) {
      p.dashTimer = NP.CONFIG.DASH_DURATION;
      p.dashCooldown = NP.CONFIG.DASH_COOLDOWN;
      p.dashDir = { x: m.x, y: m.y };
      p.invuln = Math.max(p.invuln, 18);
      NP.Effects.spawnShockwave(p.x, p.y, '#2effe8', 100, 22);
      NP.sfx.dash();
    }

    // Clamp to screen
    p.x = NP.clamp(p.x, p.r, NP.W - p.r);
    p.y = NP.clamp(p.y, p.r, NP.H - p.r);

    p.angle = NP.angleTo(p.x, p.y, NP.Input.mouse.x, NP.Input.mouse.y);
    if (p.invuln > 0) p.invuln -= PT;

    // Trail
    p.trailTimer -= PT;
    if (p.trailTimer <= 0 && (Math.abs(p.vx) + Math.abs(p.vy) > 1.5 || p.dashTimer > 0)) {
      const tc = p.dashTimer > 0 ? '#2effe8' : (NP.state.overdrive ? '#ffd000' : '#ff2eb8');
      NP.Effects.spawnParticles(p.x, p.y, 1, tc, {
        speed: 0.4, life: 28, size: 3, drag: 0.95
      });
      p.trailTimer = 2;
    }

    // Firing
    p.fireCooldown -= PT;
    if (NP.Input.mouse.down && p.fireCooldown <= 0) {
      this.fireWeapon();
      const w = NP.WEAPONS[p.weapon];
      const tier = this.getComboTier();
      p.fireCooldown = tier.perks.rapid ? Math.max(3, w.fireRate * 0.55) : w.fireRate;
    }
  },

  // ---- Combo tier system ----------------------------------------
  getComboTier() {
    const c = NP.state.combo;
    if (c >= 30) return { name: 'EXPLOSIVE', perks: { rapid: true, pierce: true, explode: true } };
    if (c >= 20) return { name: 'PIERCING',  perks: { rapid: true, pierce: true } };
    if (c >= 10) return { name: 'RAPID',     perks: { rapid: true } };
    return { name: '', perks: {} };
  },

  // ---- Weapon firing --------------------------------------------
  fireWeapon() {
    const p = NP.player;
    const w = NP.WEAPONS[p.weapon];
    const tier = this.getComboTier();
    const a = NP.angleTo(p.x, p.y, NP.Input.mouse.x, NP.Input.mouse.y);
    const mx = p.x + Math.cos(a) * p.r * 1.4;
    const my = p.y + Math.sin(a) * p.r * 1.4;

    if (p.weapon === 'PULSE') {
      this.fireBullet(mx, my, a, 14, w.color, w.damage, tier);
      NP.sfx.shoot();
    } else if (p.weapon === 'SPREAD') {
      for (let i = -2; i <= 2; i++) {
        this.fireBullet(mx, my, a + i * 0.13, 12, w.color, w.damage, tier);
      }
      NP.sfx.spread();
    } else if (p.weapon === 'LASER') {
      // Forced pierce
      this.fireBullet(mx, my, a, 26, w.color, w.damage,
        { ...tier, perks: { ...tier.perks, pierce: true } }, true);
      NP.sfx.laser();
    } else if (p.weapon === 'MISSILE') {
      this.fireBullet(mx, my, a, 8, w.color, w.damage, tier, false, true);
      NP.sfx.missile();
    } else if (p.weapon === 'LIGHTNING') {
      // Chain to nearest enemy
      let nearest = null, nd = 400;
      for (const e of NP.enemies) {
        const d = NP.dist(p.x, p.y, e.x, e.y);
        if (d < nd) { nd = d; nearest = e; }
      }
      if (nearest) {
        this.chainLightning(p.x, p.y, nearest, 4, w.damage);
        NP.sfx.lightning();
      }
    }

    // Ammo
    if (p.weaponAmmo !== Infinity) {
      p.weaponAmmo -= 1;
      if (p.weaponAmmo <= 0) {
        p.weapon = 'PULSE';
        p.weaponAmmo = Infinity;
        NP.HUD.updateWeapon();
      }
    }
  },

  fireBullet(x, y, angle, speed, color, damage, tier, isLaser = false, isMissile = false) {
    const b = {
      x, y, angle,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: isLaser ? 3 : (isMissile ? 5 : 4),
      life: 100, color, damage,
      pierce: tier.perks.pierce ? 3 : 0,
      explode: tier.perks.explode || isMissile,
      isLaser, isMissile,
      target: null,
      trailTimer: 0,
    };

    // Missile homing target
    if (isMissile) {
      let nearest = null, nd = Infinity;
      for (const e of NP.enemies) {
        const d = NP.dist(b.x, b.y, e.x, e.y);
        if (d < nd) { nd = d; nearest = e; }
      }
      b.target = nearest;
    }
    NP.bullets.push(b);
    NP.Effects.spawnParticles(x, y, 4, color, {
      speed: 3, life: 10, size: 2, angle, spread: 0.5
    });
  },

  chainLightning(sx, sy, firstTarget, chains, damage) {
    let lastX = sx, lastY = sy;
    let lastTarget = firstTarget;
    const hit = new Set();
    for (let c = 0; c < chains && lastTarget; c++) {
      NP.Effects.spawnLightning(lastX, lastY, lastTarget.x, lastTarget.y, NP.WEAPONS.LIGHTNING.color);
      lastTarget.hp -= damage;
      lastTarget.hitFlash = 8;
      hit.add(lastTarget);
      NP.Effects.spawnParticles(lastTarget.x, lastTarget.y, 8, '#fff', {
        speed: 3, life: 14, size: 2
      });
      if (lastTarget.hp <= 0) this.killEnemy(lastTarget);
      lastX = lastTarget.x; lastY = lastTarget.y;
      // Find next nearest
      let next = null, nd = 250;
      for (const e of NP.enemies) {
        if (hit.has(e)) continue;
        const d = NP.dist(lastX, lastY, e.x, e.y);
        if (d < nd) { nd = d; next = e; }
      }
      lastTarget = next;
    }
  },

  applyExplosion(x, y, radius, damage) {
    NP.Effects.spawnShockwave(x, y, '#ff8800', radius * 2, 30);
    NP.Effects.spawnParticles(x, y, 30, '#ff8800', { speed: 8, life: 35, size: 5 });
    NP.Effects.spawnParticles(x, y, 15, '#fff', { speed: 6, life: 25, size: 4 });
    NP.state.shake += 8;
    for (const e of NP.enemies) {
      if (NP.dist(x, y, e.x, e.y) < radius) {
        e.hp -= damage;
        e.hitFlash = 8;
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
  },

  // ---- Damage / scoring -----------------------------------------
  takeDamage(amount) {
    const p = NP.player;
    if (p.invuln > 0 || p.dashTimer > 0) return;
    p.hp -= amount;
    p.invuln = 70;
    NP.state.shake += 22;
    NP.state.flash = 0.45;
    NP.state.flashColor = '#ff003c';
    NP.state.slowmo = 0.25;
    NP.state.slowmoTimer = 35;
    NP.state.combo = 1;
    NP.state.comboTimer = 0;
    NP.state.comboKills = 0;
    NP.sfx.damage();
    NP.Effects.spawnParticles(p.x, p.y, 35, '#ff003c', {
      speed: 7, life: 45, size: 4
    });
    NP.Effects.spawnShockwave(p.x, p.y, '#ff003c', 160, 35);
    if (p.hp <= 0) {
      p.hp = 0;
      NP.Game.gameOver();
    }
  },

  killEnemy(e) {
    const pts = e.score * NP.state.combo;
    NP.state.score += pts;
    NP.state.kills += 1;
    NP.state.combo = Math.min(NP.state.combo + 1, 99);
    NP.state.maxCombo = Math.max(NP.state.maxCombo, NP.state.combo);
    NP.state.comboKills += 1;
    NP.state.comboTimer = NP.CONFIG.COMBO_DURATION;
    NP.state.shake += e.isBoss ? 50 : (e.isMini ? 20 : (e.r > 18 ? 10 : 5));

    NP.Effects.spawnFloater(e.x, e.y, `+${pts}`, '#ffe04d', e.isBoss || e.isMini);
    NP.Effects.spawnShockwave(e.x, e.y, e.color,
      e.r * (e.isBoss ? 12 : e.isMini ? 8 : 5),
      e.isBoss ? 70 : 35);
    NP.Effects.spawnParticles(e.x, e.y, e.isBoss ? 150 : (e.isMini ? 60 : 24), e.color, {
      speed: e.isBoss ? 12 : (e.isMini ? 8 : 6),
      life:  e.isBoss ? 90 : (e.isMini ? 60 : 40),
      size:  e.isBoss ? 6 : 4,
    });

    if (e.isBoss || e.isMini) {
      NP.Effects.spawnParticles(e.x, e.y, 40, '#fff', {
        speed: e.isBoss ? 10 : 6, life: 60, size: 3
      });
    }

    if (e.isBoss) {
      NP.sfx.bigExplode();
      NP.state.flash = 0.85; NP.state.flashColor = e.color;
      NP.state.slowmo = 0.15; NP.state.slowmoTimer = 80;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          NP.Effects.spawnShockwave(e.x, e.y, '#fff', 450, 45);
          NP.Effects.spawnShockwave(e.x, e.y, e.color, 350, 55);
          NP.state.shake += 10;
        }, i * 120);
      }
      NP.Pickups.maybeDrop(e.x, e.y, 'heal');
      NP.Pickups.maybeDrop(e.x + 30, e.y,
        ['spread', 'laser', 'missile', 'lightning'][NP.randInt(0, 3)]);
      NP.Pickups.maybeDrop(e.x - 30, e.y, 'energy');
    } else if (e.isMini) {
      NP.sfx.bigExplode();
      NP.state.flash = 0.5; NP.state.flashColor = e.color;
      NP.state.slowmo = 0.3; NP.state.slowmoTimer = 40;
      NP.Effects.spawnShockwave(e.x, e.y, '#fff', 280, 40);
      NP.Pickups.maybeDrop(e.x, e.y,
        ['spread', 'laser', 'missile', 'lightning'][NP.randInt(0, 3)]);
    } else {
      NP.sfx.explode();
    }

    // Splitter spawns 3 fast enemies
    if (e.splits) {
      for (let i = 0; i < 3; i++) {
        const child = NP.Enemies.spawnAt(e.x + NP.rand(-20, 20), e.y + NP.rand(-20, 20), 'fast');
        const a = NP.rand(0, NP.TAU);
        child.vx = Math.cos(a) * 4;
        child.vy = Math.sin(a) * 4;
      }
    }

    NP.Pickups.maybeDrop(e.x, e.y);
    const idx = NP.enemies.indexOf(e);
    if (idx >= 0) NP.enemies.splice(idx, 1);
  },

  // ---- Drawing --------------------------------------------------
  draw(ctx) {
    const p = NP.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Aim line
    ctx.strokeStyle = 'rgba(46, 255, 232, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(1200, 0);
    ctx.stroke();

    const blink = p.invuln > 0 && Math.floor(NP.state.time / 3) % 2 === 0;
    if (!blink) {
      const mainColor = NP.state.overdrive ? '#ffd000' : '#2effe8';
      ctx.shadowColor = mainColor; ctx.shadowBlur = 30;
      ctx.strokeStyle = mainColor; ctx.lineWidth = 2;

      // Ship body — angular triangle
      ctx.beginPath();
      ctx.moveTo(p.r * 1.3, 0);
      ctx.lineTo(-p.r * 0.7, -p.r * 0.9);
      ctx.lineTo(-p.r * 0.3, 0);
      ctx.lineTo(-p.r * 0.7, p.r * 0.9);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = mainColor + '28';
      ctx.fill();

      // Cockpit dot
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.r * 0.4, 0, 3, 0, NP.TAU);
      ctx.fill();

      // Side fins
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ff2eb8';
      ctx.shadowColor = '#ff2eb8';
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.3, -p.r * 0.5);
      ctx.lineTo(-p.r * 0.9, -p.r * 0.5);
      ctx.moveTo(-p.r * 0.3, p.r * 0.5);
      ctx.lineTo(-p.r * 0.9, p.r * 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // Dash cooldown ring
    if (p.dashCooldown > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(46, 255, 232, 0.35)';
      ctx.lineWidth = 2;
      const a = 1 - (p.dashCooldown / NP.CONFIG.DASH_COOLDOWN);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 8, -Math.PI / 2, -Math.PI / 2 + a * NP.TAU);
      ctx.stroke();
      ctx.restore();
    }

    // Overdrive ring
    if (NP.state.overdrive) {
      ctx.save();
      ctx.strokeStyle = '#ffd000';
      ctx.shadowColor = '#ffd000';
      ctx.shadowBlur = 24;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 18 + Math.sin(NP.state.time * 0.3) * 3, 0, NP.TAU);
      ctx.stroke();
      ctx.restore();
    }
  },
};
