/** Logical resolution. Everything is laid out in these units; Phaser scales to fit. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Render depth layers, lowest first. */
export const Depth = {
  Background: 0,
  Enemies: 10,
  Boss: 15,
  HeroBullets: 20,
  Hero: 25,
  EnemyBullets: 30,
  Fx: 35,
  Hitbox: 40,
  Hud: 100,
} as const;

/** Debug switches from the URL, e.g. `?fps&boss&hitboxes`. */
const params = new URLSearchParams(window.location.search);
export const Debug = {
  showFps: params.has('fps'),
  skipToBoss: params.has('boss'),
  showHitboxes: params.has('hitboxes'),
  invincible: params.has('god'),
} as const;
