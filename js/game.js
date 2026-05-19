// ============================================================
// game.js — Main loop, init, game flow (start / reset / over)
// ============================================================

NP.Game = {
  lastTime: 0,
  bossDeathTimeouts: [],  // FIX #4: track boss-death setTimeouts so we can cancel on reset

  init() {
    NP.Render.init();
    NP.HUD.init();
    NP.Input.init();
    NP.Background.init();

    // Initialize player position now that screen size is known
    NP.player.x = NP.W / 2;
    NP.player.y = NP.H / 2;
    NP.HUD.updateWeapon();

    // UI buttons
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('restart-btn').addEventListener('click', () => this.start());
    window.addEventListener('keydown', e => {
      if (!NP.state.running && (e.code === 'Space' || e.code === 'Enter')) this.start();
    });

    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  // ---- Main game loop -------------------------------------------
  loop(now) {
    const elapsed = now - this.lastTime;
    this.lastTime = now;
    const dt = Math.min(elapsed / 16.6667, 3);

    if (NP.state.running) this.update(dt);
    NP.Render.draw();
    NP.HUD.update();

    requestAnimationFrame(t => this.loop(t));
  },

  // ---- Per-frame update -----------------------------------------
  update(dt) {
    const s = NP.state;
    s.time += dt;

    // Overdrive (right click)
    const wasOverdrive = s.overdrive;
    if (NP.Input.mouse.rightDown && NP.player.energy > 0) {
      s.overdrive = true;
      s.slowmo = NP.CONFIG.OVERDRIVE_SLOWMO;
      NP.player.energy = Math.max(0, NP.player.energy - NP.CONFIG.OVERDRIVE_DRAIN * dt);
      // FIX #7 / #14: removed dead-code `s.chromAb += 0.5;` (gets overwritten below).
      // Play overdrive SFX once on entry instead of every frame.
      if (!wasOverdrive) NP.sfx.overdrive();
    } else {
      s.overdrive = false;
      if (s.slowmoTimer <= 0) s.slowmo = NP.lerp(s.slowmo, 1, 0.06);
      NP.player.energy = Math.min(NP.player.maxEnergy, NP.player.energy + NP.CONFIG.OVERDRIVE_REGEN * dt);
    }
    if (s.slowmoTimer > 0) s.slowmoTimer -= dt;

    // T = slow-motion-affected time, PT = player-only time (player keeps speed during overdrive)
    const T  = dt * s.slowmo;
    const PT = s.overdrive ? dt : T;

    // Systems
    NP.Player.update(T, PT);
    NP.Waves.updateSpawning(T);
    NP.Bullets.update(T);
    NP.Enemies.update(T);
    NP.Pickups.update(T);
    NP.Effects.update(T);
    NP.Background.update(T);

    // Combo decay
    if (s.comboTimer > 0) {
      s.comboTimer -= T;
      if (s.comboTimer <= 0) {
        s.combo = 1;
        s.comboKills = 0;
      }
    }

    // Decay screen FX
    s.shake *= Math.pow(0.85, T);
    s.flash *= Math.pow(0.88, T);
    s.chromAb = s.shake * 0.5 + s.flash * 8 + (s.overdrive ? 4 : 0);
  },

  // ---- Game flow ------------------------------------------------
  reset() {
    // FIX #4: cancel any pending boss-death timeouts from previous run
    for (const id of this.bossDeathTimeouts) clearTimeout(id);
    this.bossDeathTimeouts.length = 0;

    // Clear all entity arrays
    NP.bullets.length = 0;
    NP.enemyBullets.length = 0;
    NP.enemies.length = 0;
    NP.particles.length = 0;
    NP.shockwaves.length = 0;
    NP.floaters.length = 0;
    NP.pickups.length = 0;
    NP.lightnings.length = 0;
    NP.lasers.length = 0;

    // Reset state
    Object.assign(NP.state, {
      score: 0, combo: 1, comboTimer: 0, comboKills: 0,
      wave: 0, shake: 0, flash: 0, slowmo: 1, slowmoTimer: 0,
      kills: 0, maxCombo: 1, startTime: performance.now(),
    });

    // Reset player — change CONFIG.START_WEAPON to start with a different weapon
    const p = NP.player;
    p.x = NP.W / 2; p.y = NP.H / 2;
    p.vx = 0; p.vy = 0;
    p.hp = p.maxHp;
    p.energy = p.maxEnergy;
    p.invuln = 0;
    p.dashCooldown = 0;
    p.dashTimer = 0;
    p.weapon = NP.CONFIG.START_WEAPON;
    p.weaponAmmo = NP.WEAPONS[p.weapon].ammo;
    NP.HUD.updateWeapon();
  },

  start() {
    NP.Audio.init();
    this.reset();
    NP.state.running = true;
    NP.Waves.start(1);
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
  },

  gameOver() {
    NP.state.running = false;
    const high = parseInt(localStorage.getItem('neonPulseHigh') || '0');
    if (NP.state.score > high) localStorage.setItem('neonPulseHigh', NP.state.score);

    // Death explosion
    NP.Effects.spawnParticles(NP.player.x, NP.player.y, 100, '#ff003c', {
      speed: 11, life: 70, size: 5
    });
    NP.Effects.spawnParticles(NP.player.x, NP.player.y, 70, '#fff', {
      speed: 7, life: 90, size: 4
    });
    NP.Effects.spawnShockwave(NP.player.x, NP.player.y, '#ff003c', 550, 70);
    NP.Effects.spawnShockwave(NP.player.x, NP.player.y, '#fff', 350, 60);
    NP.state.shake = 45;
    NP.state.flash = 0.7;
    NP.state.flashColor = '#ff003c';
    NP.sfx.bigExplode();

    const elapsed = ((performance.now() - NP.state.startTime) / 1000) | 0;
    const m = Math.floor(elapsed / 60), sec = elapsed % 60;

    setTimeout(() => {
      document.getElementById('final-score').textContent =
        String(NP.state.score).padStart(6, '0');
      document.getElementById('game-over-stats').innerHTML = `
        WAVES SURVIVED <b>${NP.state.wave}</b> &nbsp;&nbsp; KILLS <b>${NP.state.kills}</b><br>
        MAX COMBO <b>${NP.state.maxCombo}×</b> &nbsp;&nbsp; TIME <b>${m}:${String(sec).padStart(2,'0')}</b><br>
        BEST <b>${String(Math.max(NP.state.score, high)).padStart(6,'0')}</b>
      `;
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 1600);
  },
};

// ---- Entry point ----
window.addEventListener('DOMContentLoaded', () => NP.Game.init());
