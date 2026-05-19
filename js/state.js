// ============================================================
// state.js — Global game state and entity arrays
// ============================================================

NP.state = {
  running: false,
  time: 0,
  shake: 0,
  flash: 0,
  flashColor: '#fff',
  slowmo: 1,
  slowmoTimer: 0,
  overdrive: false,
  score: 0,
  combo: 1,
  comboTimer: 0,
  comboKills: 0,
  wave: 0,
  waveTimer: 0,
  spawnQueue: [],
  spawnTimer: 0,
  chromAb: 0,
  // stats
  kills: 0,
  maxCombo: 1,
  startTime: 0,
};

NP.player = {
  x: 0, y: 0, vx: 0, vy: 0,
  r: NP.CONFIG.PLAYER_RADIUS,
  hp: NP.CONFIG.PLAYER_MAX_HP,
  maxHp: NP.CONFIG.PLAYER_MAX_HP,
  energy: NP.CONFIG.PLAYER_MAX_ENERGY,
  maxEnergy: NP.CONFIG.PLAYER_MAX_ENERGY,
  fireCooldown: 0,
  invuln: 0,
  dashCooldown: 0,
  dashTimer: 0,
  dashDir: { x: 0, y: 0 },
  angle: 0,
  trailTimer: 0,
  weapon: NP.CONFIG.START_WEAPON,
  weaponAmmo: Infinity,
};

// Entity pools — all updated/drawn each frame
NP.bullets      = []; // player bullets
NP.enemyBullets = [];
NP.enemies      = [];
NP.particles    = [];
NP.shockwaves   = [];
NP.floaters     = [];
NP.pickups      = [];
NP.lightnings   = [];
NP.lasers       = []; // sniper laser warnings & active beams

// Screen dimensions (updated by render.js resize)
NP.W = window.innerWidth;
NP.H = window.innerHeight;
