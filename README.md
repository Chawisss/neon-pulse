# NEON PULSE — OVERDRIVE

A top-down arena shooter built in vanilla JavaScript and HTML5 Canvas. Geometric horrors, neon glow, time dilation, and combo-driven chaos.

**▶ Play it now:** https://neon-pulse-v1.vercel.app/

---

## Features

- **5 weapons** — Pulse (infinite), Spread, Laser (piercing), Homing Missile, Chain Lightning
- **Combo tier system** — at x10 combo your fire rate doubles, at x20 bullets pierce, at x30 they explode
- **Overdrive mode** — hold right-click to slow time at the cost of energy
- **Dash** — short i-frames + speed burst on a cooldown
- **10 enemy archetypes** — chasers, fast wobblers, tanks, shooters, splitters, orbiters, snipers (with warning beams), swarmers, shielded, and bosses
- **Wave progression** — new enemy types unlock every wave, mini-boss every 3rd wave, full boss every 5th wave with 3 attack phases
- **Pickups** — heal, energy, and weapon drops with magnetic attraction
- **Juice** — parallax stars, drifting nebulas, screen shake, chromatic aberration, slow-mo, CRT scanlines, vignette, particle trails, shockwaves, floating score popups
- **Synthesized SFX** — every sound generated at runtime via WebAudio (no audio files)
- **Local high score** — saved to `localStorage`

---

## Controls

| Action | Key |
|---|---|
| Move | `W` `A` `S` `D` or arrow keys |
| Aim / Fire | Mouse |
| Overdrive (time dilation) | Right Mouse Button |
| Dash | `Space` |
| Start / Restart | `Space` or `Enter` (on menu) |

---

## Running locally

The project is pure static HTML/CSS/JS — no build step, no dependencies. You just need to serve the folder over HTTP (opening `index.html` directly via `file://` will work, but some browsers restrict things like audio context on local files).

```bash
# Python 3
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

---

## Project structure

```
.
├── index.html          # Entry point, canvas + HUD markup
├── css/style.css       # All styling (HUD, screens, animations)
└── js/
    ├── config.js       # Constants, weapon stats, pickup colors
    ├── utils.js        # Math helpers (rand, lerp, dist, angleTo, clamp)
    ├── state.js        # Global game state and entity arrays
    ├── audio.js        # WebAudio synthesis + SFX definitions
    ├── input.js        # Keyboard + mouse handling
    ├── background.js   # Parallax stars, nebulas, animated grid
    ├── effects.js      # Particles, shockwaves, lightning, floating text
    ├── entities.js     # Enemies, bullets, pickups (AI + rendering)
    ├── player.js       # Player movement, weapons, damage, scoring
    ├── waves.js        # Wave composition and spawn scheduling
    ├── render.js       # Canvas setup, draw orchestration, post-FX
    ├── hud.js          # DOM-based HUD updates
    └── game.js         # Main loop, init, game flow
```

Everything lives under a single `window.NP` namespace to keep the global scope clean. Script load order in `index.html` matters because modules reference each other by name.

---

## Architecture notes

**Three canvases stacked** — `#bg-canvas` for the background (parallax + grid), `#game` for gameplay (with screen shake applied via transform), and `#fx-canvas` for post-processing (chromatic aberration, flash, custom cursor). The HUD is plain DOM on top.

**Time handling** — the main loop computes a delta-time `dt` normalized to 60 fps frames, then derives two scaled timesteps: `T` (slow-motion-affected, used by enemies, bullets, effects) and `PT` (player-only, so the player keeps full speed during Overdrive).

**Combo tiers** — `NP.Player.getComboTier()` returns perks based on the current combo count. These perks (`rapid`, `pierce`, `explode`) get baked into each bullet at fire time, so they persist for that bullet's lifetime even if the combo drops.

**Boss phases** — driven by HP percentage in `ai_boss()`: phase 1 (≥66%) is an 8-way radial, phase 2 (33–66%) is a 3-stream spiral with +30% speed, phase 3 (<33%) is a 12-way radial plus an aimed white shot.

**Sniper telegraph** — snipers spawn a dashed warning beam 60 frames before firing, then replace it with a real damaging laser for 12 frames.

---

## Customizing

A few quick knobs:

- **Starting weapon** — `NP.CONFIG.START_WEAPON` in `js/config.js`
- **Weapon stats** — `NP.WEAPONS` in `js/config.js` (fire rate, damage, ammo)
- **Player stats** — `NP.CONFIG` in `js/config.js` (HP, energy, dash speed/cooldown, overdrive drain)
- **Enemy stats** — the `switch` in `NP.Enemies.spawnAt()` in `js/entities.js`
- **Wave composition** — `NP.Waves.buildWave()` in `js/waves.js`

---

## Credits

Built with vanilla JS + Canvas. Fonts: [Orbitron](https://fonts.google.com/specimen/Orbitron) and [Major Mono Display](https://fonts.google.com/specimen/Major+Mono+Display) via Google Fonts.