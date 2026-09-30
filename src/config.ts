/** Logical resolution. Everything is laid out in these units; Phaser scales to fit. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/**
 * URL of a processed asset, stamped with the build id. Asset file names are not hashed, so without
 * this a CDN or browser can keep serving an old file under the same name after a new deploy.
 */
export function asset(file: string): string {
  return `processed/${file}?v=${__BUILD_ID__}`;
}

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

/** Debug switches from the URL, e.g. `?fps&boss&hitboxes&hero=oopsie&team=4`. */
const params = new URLSearchParams(window.location.search);
export const Debug = {
  showFps: params.has('fps'),
  skipToBoss: params.has('boss') || params.has('ascent'),
  /** Jump to the turkey's defeat: escape pod and the ascent. */
  skipToAscent: params.has('ascent'),
  /** Jump to the robo bunny's arrival (mid-level). */
  skipToBunny: params.has('bunny'),
  showHitboxes: params.has('hitboxes'),
  invincible: params.has('god'),
  /** Expose the Phaser game as `window.game` for automated testing. */
  expose: params.has('debug'),
  /** Start the level directly with this Buddy (after the tap-to-begin gate). */
  hero: params.get('hero'),
  /** Start with this many random companions. */
  team: Number(params.get('team') ?? 0) || 0,
} as const;
