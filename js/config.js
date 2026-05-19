// ============================================================
// config.js — Constants, weapon definitions, namespace setup
// ============================================================

// Global namespace for the entire game
window.NP = window.NP || {};

NP.WEAPONS = {
  PULSE:     { name: 'PULSE',     color: '#2effe8', fireRate: 8,  damage: 1, ammo: Infinity },
  SPREAD:    { name: 'SPREAD',    color: '#ffaa00', fireRate: 12, damage: 1, ammo: 60 },
  LASER:     { name: 'LASER',     color: '#ff2eb8', fireRate: 5,  damage: 1, ammo: 80 },
  MISSILE:   { name: 'MISSILE',   color: '#ff003c', fireRate: 22, damage: 3, ammo: 20 },
  LIGHTNING: { name: 'LIGHTNING', color: '#9d6bff', fireRate: 10, damage: 1, ammo: 40 },
};

NP.PICKUP_COLORS = {
  heal:      '#2effb8',
  energy:    '#ffd000',
  spread:    '#ffaa00',
  laser:     '#ff2eb8',
  missile:   '#ff003c',
  lightning: '#9d6bff',
};

NP.CONFIG = {
  PLAYER_RADIUS: 14,
  PLAYER_MAX_HP: 100,
  PLAYER_MAX_ENERGY: 100,
  DASH_DURATION: 10,
  DASH_COOLDOWN: 60,
  DASH_SPEED: 20,
  OVERDRIVE_DRAIN: 0.6,
  OVERDRIVE_REGEN: 0.15,
  OVERDRIVE_SLOWMO: 0.35,
  COMBO_DURATION: 200,
  // To change starting weapon, edit player.weapon in state.js or game.js reset()
  START_WEAPON: 'PULSE',
};
