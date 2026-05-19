// ============================================================
// hud.js — DOM-based UI updates (HUD bars, banners, notifs)
// ============================================================

NP.HUD = {
  els: {},

  init() {
    this.els = {
      score:        document.getElementById('score'),
      waveInfo:     document.getElementById('wave-info'),
      weaponName:   document.getElementById('weapon-name'),
      comboNum:     document.getElementById('combo-num'),
      comboMeter:   document.getElementById('combo-meter'),
      comboTier:    document.getElementById('combo-tier'),
      combo:        document.getElementById('combo'),
      healthFill:   document.getElementById('health-fill'),
      healthText:   document.getElementById('health-text'),
      energyFill:   document.getElementById('energy-fill'),
      energyText:   document.getElementById('energy-text'),
      shieldFill:   document.getElementById('shield-fill'),
      dashText:     document.getElementById('dash-text'),
      waveBanner:   document.getElementById('wave-banner'),
      bossWarning:  document.getElementById('boss-warning'),
      pickupNotif:  document.getElementById('pickup-notif'),
    };
  },

  // Per-frame HUD update
  update() {
    const s = NP.state, p = NP.player;
    this.els.score.textContent = String(s.score).padStart(6, '0');

    this.els.comboNum.textContent = s.combo;
    this.els.comboMeter.style.width = (s.comboTimer / NP.CONFIG.COMBO_DURATION * 100) + '%';
    this.els.comboTier.textContent = NP.Player.getComboTier().name;
    this.els.combo.style.opacity = s.combo > 1 ? 1 : 0.4;
    this.els.combo.style.transform = s.combo > 1
      ? `scale(${1 + Math.min(s.combo, 30) * 0.012})`
      : 'scale(1)';

    this.els.healthFill.style.width = (p.hp / p.maxHp * 100) + '%';
    this.els.healthText.textContent = Math.ceil(p.hp);
    this.els.energyFill.style.width = (p.energy / p.maxEnergy * 100) + '%';
    this.els.energyText.textContent = Math.ceil(p.energy);

    const dashReady = p.dashCooldown <= 0;
    this.els.shieldFill.style.width =
      (dashReady ? 100 : (1 - p.dashCooldown / NP.CONFIG.DASH_COOLDOWN) * 100) + '%';
    this.els.dashText.textContent = dashReady ? 'READY' : '...';
  },

  // Update weapon display when player picks up a new weapon
  updateWeapon() {
    const w = NP.WEAPONS[NP.player.weapon];
    this.els.weaponName.textContent = w.name;
    this.els.weaponName.style.color = w.color;
    this.els.weaponName.style.textShadow = `0 0 8px ${w.color}, 0 0 16px ${w.color}`;
  },

  setWaveLabel(n) {
    this.els.waveInfo.textContent = `WAVE ${String(n).padStart(2, '0')}`;
  },

  showWaveBanner(n) {
    const banner = this.els.waveBanner;
    banner.classList.remove('show');
    if (n % 5 === 0) {
      banner.textContent = 'BOSS';
      banner.style.color = '#ff003c';
      banner.style.textShadow = '0 0 32px #ff003c, 0 0 64px #ff003c';
    } else {
      banner.textContent = `W ${String(n).padStart(2, '0')}`;
      banner.style.color = '#fff';
      banner.style.textShadow = '0 0 32px #2effe8, 0 0 64px #2eb8ff';
    }
    void banner.offsetWidth; // restart animation
    banner.classList.add('show');
  },

  showBossWarning() {
    this.els.bossWarning.classList.remove('show');
    void this.els.bossWarning.offsetWidth;
    this.els.bossWarning.classList.add('show');
  },

  pickupNotif(text, color) {
    const el = this.els.pickupNotif;
    el.textContent = text;
    el.style.color = color;
    el.style.textShadow = `0 0 12px ${color}, 0 0 24px ${color}`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  },
};
