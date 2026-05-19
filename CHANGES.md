# Neon Pulse Change Notes

Concise notes for future agents. Keep this file short and implementation-focused.

## Project Shape

- Static vanilla JS canvas game. No build step or package manager.
- All modules attach to `window.NP`; script order in `index.html` matters.
- Core loop: `js/game.js`; state/entity arrays: `js/state.js`; rendering: `js/render.js`; gameplay entities: `js/entities.js`; player/weapons/scoring: `js/player.js`; waves: `js/waves.js`; DOM HUD: `js/hud.js`.

## Important Fixes Already Applied

- `js/player.js`
  - Lightning no longer spends ammo when no valid target exists.
  - Explosion and chain lightning damage now route through shared shield-aware `damageEnemy()`.
  - Explosion damage iterates enemies in reverse so kills/splices do not skip nearby enemies.
  - Boss death shockwave `setTimeout`s are tracked and cleared on reset.

- `js/input.js`
  - Releases mouse/buttons on blur or document leave to prevent stuck firing/overdrive.

- `js/entities.js`
  - Unknown enemy types have safe default `speed` and `score`.
  - AI lerp/drag and enemy bullet trails were made more frame-rate independent.
  - Player and enemy bullet trails are low-priority particles.

- `js/background.js`, `js/effects.js`
  - Star twinkle, floater movement, shockwaves, and grid modulo were made frame-rate safer.
  - Star rendering avoids per-star RGBA string allocation.

- `js/hud.js`
  - HUD writes are cached to reduce per-frame DOM work.
  - Combo/health/energy/dash percentages are clamped to `0..100`.

- `js/game.js`
  - Reset now clears more state: wave/spawn timers, queues, overdrive, flash/chromatic state, and transient player timers.
  - Game-over timeout is tracked and cancelled on restart, preventing stale game-over screens.
  - `localStorage` high-score reads/writes are wrapped in safe helpers.
  - Start menu `BEST` score is populated from `localStorage`.

- `js/waves.js`
  - Boss warning timeout is tracked, cleared on new wave/reset, and guarded by current wave.

## UI Changes

- `index.html`, `css/style.css`, `js/game.js`
  - Start screen was rebuilt into a title-screen layout with status strip, best score, briefing panel, stats, controls panel, and responsive mobile styling.
  - Menu/game-over screens use `cursor: default` so the real cursor is visible while gameplay still uses the custom neon cursor.

- `css/style.css`
  - HUD z-index was raised above the CRT overlay so score/wave/bars are not darkened by vignette/scanlines.
  - Score/wave panel contrast was increased with brighter text, glow, and a subtle translucent backing.

## Performance Changes

- `js/config.js`
  - Added particle budget knobs:
    - `MAX_PARTICLES`
    - `LOW_PRIORITY_PARTICLE_LIMIT`
    - `PARTICLE_TRIM_BATCH`

- `js/effects.js`
  - `spawnParticles()` now enforces particle budgets.
  - Low-priority particle effects are dropped first when the scene is busy.

- `js/player.js`, `js/entities.js`
  - Spread weapon still fires 5 bullets, but uses fewer muzzle particles and lighter, less frequent trails.
  - Bullet trail lifetime/size/frequency can be customized per bullet.

## Current Caveats

- Collision is still mostly brute-force (`bullets x enemies`). If late waves still lag, spatial partitioning or object pooling is the next high-value optimization.
- `CHANGES.md` intentionally omits long reasoning and historical detail. Use `git diff` for exact code changes.
