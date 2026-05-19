// ============================================================
// hud.js — DOM-based UI updates (HUD bars, banners, notifs)
// ============================================================

NP.HUD = {
  els: {},

  // FIX #11: cache last written values so we don't touch the DOM unless
  // something actually changed. Trims a sizable chunk of layout/paint work
  // at 60+fps and matters more on lower-end devices.
  _last: {
    score: -1, combo: -1, comboMeter: -1, tier: '',
    comboOpacity: -1, comboScale: -1,
    health: -1, healthFill: -1,
    energy: -1, energyFill: -1,
    dashFill: -1, dashText: '',
  },

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
    const L = this._last;

    // Score
    if (s.score !== L.score) {
      this.els.score.textContent = String(s.score).padStart(6, '0');
      L.score = s.score;
    }

    // Combo number + meter + tier + visual emphasis
    if (s.combo !== L.combo) {
      this.els.comboNum.textContent = s.combo;
      L.combo = s.combo;
    }
    // Meter width — we round to 0.1% buckets to avoid spamming style changes
    const meterPct = Math.round(s.comboTimer / NP.CONFIG.COMBO_DURATION * 1000) / 10;
    if (meterPct !== L.comboMeter) {
      this.els.comboMeter.style.width = meterPct + '%';
      L.comboMeter = meterPct;
    }
    const tierName = NP.Player.getComboTier().name;
    if (tierName !== L.tier) {
      this.els.comboTier.textContent = tierName;
      L.tier = tierName;
    }
    const opacity = s.combo > 1 ? 1 : 0.4;
    if (opacity !== L.comboOpacity) {
      this.els.combo.style.opacity = opacity;
      L.comboOpacity = opacity;
    }
    // Scale — quantize to 2 decimal places
    const scale = s.combo > 1
      ? Math.round((1 + Math.min(s.combo, 30) * 0.012) * 100) / 100
      : 1;
    if (scale !== L.comboScale) {
      this.els.combo.style.transform = `scale(${scale})`;
      L.comboScale = scale;
    }

    // Health
    const hpInt = Math.ceil(p.hp);
    if (hpInt !== L.health) {
      this.els.healthText.textContent = hpInt;
      L.health = hpInt;
    }
    const hpPct = Math.round(p.hp / p.maxHp * 1000) / 10;
    if (hpPct !== L.healthFill) {
      this.els.healthFill.style.width = hpPct + '%';
      L.healthFill = hpPct;
    }

    // Energy
    const enInt = Math.ceil(p.energy);
    if (enInt !== L.energy) {
      this.els.energyText.textContent = enInt;
      L.energy = enInt;
    }
    const enPct = Math.round(p.energy / p.maxEnergy * 1000) / 10;
    if (enPct !== L.energyFill) {
      this.els.energyFill.style.width = enPct + '%';
      L.energyFill = enPct;
    }

    // Dash
    const dashReady = p.dashCooldown <= 0;
    const dashPct = dashReady ? 100 : Math.round((1 - p.dashCooldown / NP.CONFIG.DASH_COOLDOWN) * 1000) / 10;
    if (dashPct !== L.dashFill) {
      this.els.shieldFill.style.width = dashPct + '%';
      L.dashFill = dashPct;
    }
    const dashTxt = dashReady ? 'READY' : '...';
    if (dashTxt !== L.dashText) {
      this.els.dashText.textContent = dashTxt;
      L.dashText = dashTxt;
    }
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
