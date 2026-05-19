// ============================================================
// waves.js — Wave composition and spawning
// ============================================================

NP.Waves = {
  // Build the spawn queue for a given wave number
  buildWave(n) {
    const q = [];
    // Every 5th wave: BOSS
    if (n % 5 === 0) {
      q.push({ type: 'boss', delay: 80 });
      for (let i = 0; i < 6; i++) q.push({ type: 'chaser',  delay: 140 + i * 25 });
      for (let i = 0; i < 3; i++) q.push({ type: 'shooter', delay: 120 + i * 30 });
      return q;
    }
    // Every 3rd wave: mini-boss
    if (n % 3 === 0) {
      q.push({ type: 'minibossA', delay: 60 });
    }
    const count = Math.min(20 + n * 5, 100);

    // Unlock enemy types progressively
    const types = ['chaser'];
    if (n >= 2) types.push('fast');
    if (n >= 2) types.push('orbiter');
    if (n >= 3) types.push('shooter');
    if (n >= 4) types.push('tank');
    if (n >= 4) types.push('swarmer');
    if (n >= 5) types.push('sniper');
    if (n >= 6) types.push('splitter');
    if (n >= 7) types.push('shielded');

    for (let i = 0; i < count; i++) {
      q.push({
        type: types[NP.randInt(0, types.length - 1)],
        delay: 30 + i * NP.rand(1, 3),
      });
    }
    return q;
  },

  start(n) {
    NP.state.wave = n;
    NP.state.spawnQueue = this.buildWave(n);
    NP.state.spawnTimer = 0;

    NP.HUD.setWaveLabel(n);
    NP.HUD.showWaveBanner(n);

    if (n % 5 === 0) {
      setTimeout(() => {
        NP.HUD.showBossWarning();
        NP.sfx.boss();
      }, 50);
    } else {
      NP.sfx.waveStart();
    }
  },

  // Process spawn queue based on elapsed time
  updateSpawning(T) {
    if (NP.state.spawnQueue.length > 0) {
      NP.state.spawnTimer += T;
      while (NP.state.spawnQueue.length > 0 && NP.state.spawnTimer >= NP.state.spawnQueue[0].delay) {
        NP.state.spawnTimer -= NP.state.spawnQueue[0].delay;
        const spec = NP.state.spawnQueue.shift();
        const e = NP.Enemies.spawnFromEdge(spec.type);
        // Entry effect
        NP.Effects.spawnShockwave(e.x, e.y, e.color, e.r * 4, 20);
        NP.Effects.spawnParticles(e.x, e.y, 8, e.color, { speed: 3, life: 20, size: 3 });
      }
    } else if (NP.enemies.length === 0 && NP.state.running) {
      // Wave clear — pause briefly, then next wave
      NP.state.waveTimer += T;
      if (NP.state.waveTimer > 100) {
        NP.state.waveTimer = 0;
        this.start(NP.state.wave + 1);
      }
    }
  },
};
