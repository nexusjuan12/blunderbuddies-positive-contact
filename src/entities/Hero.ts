import Phaser from 'phaser';
import { Debug, Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { HeroStats } from '../data/heroes';
import type { InputController } from '../systems/InputController';

export type HeroState = 'entering' | 'alive' | 'dead' | 'gone';
export type HitResult = 'ignored' | 'shield' | 'life' | 'gameover';

const EDGE = 16;
const ENTER_TIME = 0.9;
const DEAD_TIME = 1.1;
const SPAWN_X = 170;
/** Below this speed (px/s) the hitbox dot fades in, as for focus movement. */
const SLOW_SPEED = 120;

/** Sheet metadata written by tools/process_assets.py (`<texture>.json`). */
export interface FlySheetMeta {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  /** Hitbox centre (his chest) as a 0..1 origin within a frame. */
  originX: number;
  originY: number;
}

/**
 * The player's Buddy, flying Superman-style: a looping flight animation plus procedural
 * bob, tilt that follows vertical movement, and a fake horizontal spin on hits/power-ups.
 * The hitbox is a small fixed circle at (x, y) that never rotates with the sprite; the sprite's
 * origin is the sheet's hitbox centre, so tilting pivots around the chest.
 */
export class Hero {
  x = SPAWN_X;
  y = GAME_HEIGHT / 2;
  state: HeroState = 'entering';
  lives: number;
  hitsLeft: number;
  invuln = 0;

  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly dot: Phaser.GameObjects.Image;
  private stateTime = 0;
  private bobTime = 0;
  private tilt = 0;
  /** Seconds left in the current fake horizontal spin. */
  private spinLeft = 0;
  private dotAlpha = 0;

  constructor(
    scene: Phaser.Scene,
    readonly stats: HeroStats,
  ) {
    this.lives = stats.lives;
    this.hitsLeft = stats.hitsPerLife;
    const meta = scene.cache.json.get(stats.texture) as FlySheetMeta;
    this.sprite = scene.add
      .sprite(this.x, this.y, stats.texture, 0)
      .setOrigin(meta.originX, meta.originY)
      .setScale(stats.displayScale)
      .setDepth(Depth.Hero)
      .play(stats.flyAnim);
    this.dot = scene.add.image(this.x, this.y, 'hitbox').setDepth(Depth.Hitbox).setAlpha(0);
    this.beginEnter();
  }

  /** True when the hero is shooting (autofire is always on while in control). */
  get firing(): boolean {
    return this.state === 'alive';
  }

  get vulnerable(): boolean {
    return this.state === 'alive' && this.invuln <= 0 && !Debug.invincible;
  }

  update(dt: number, input: InputController): void {
    this.stateTime += dt;
    const s = this.stats;
    let moved = 0;
    let vy = 0;

    switch (this.state) {
      case 'entering': {
        const t = Math.min(1, this.stateTime / ENTER_TIME);
        const ease = 1 - (1 - t) * (1 - t);
        this.x = -60 + (SPAWN_X + 60) * ease;
        this.y = GAME_HEIGHT / 2;
        if (t >= 1) this.state = 'alive';
        break;
      }
      case 'alive': {
        const px = this.x;
        const py = this.y;
        const speed = input.focus ? s.focusSpeed : s.speed;
        this.x += input.dirX * speed * dt + input.dragX * s.touchSensitivity;
        this.y += input.dirY * speed * dt + input.dragY * s.touchSensitivity;
        this.x = Phaser.Math.Clamp(this.x, EDGE, GAME_WIDTH - EDGE);
        this.y = Phaser.Math.Clamp(this.y, EDGE, GAME_HEIGHT - EDGE);
        const dx = this.x - px;
        const dy = this.y - py;
        moved = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;
        vy = dt > 0 ? dy / dt : 0;
        break;
      }
      case 'dead':
        if (this.stateTime >= DEAD_TIME) {
          if (this.lives > 0) this.beginEnter();
          else this.state = 'gone';
        }
        break;
      case 'gone':
        break;
    }

    if (this.invuln > 0) this.invuln -= dt;

    // Procedural motion on top of the flight loop: bob, tilt with vertical movement, fake spin.
    const m = s.motion;
    this.bobTime += dt;
    const tiltTarget = Phaser.Math.Clamp(vy / s.speed, -1, 1) * m.maxTilt;
    this.tilt += (tiltTarget - this.tilt) * Math.min(1, dt * m.tiltResponse);

    let scaleX = s.displayScale;
    if (this.spinLeft > 0) {
      this.spinLeft = Math.max(0, this.spinLeft - dt);
      const p = 1 - this.spinLeft / m.spinTime;
      const eased = 1 - (1 - p) * (1 - p);
      // Squashing scaleX through cos() reads as a turn around the vertical axis.
      scaleX *= Math.cos(eased * m.spinTurns * Math.PI * 2);
    }

    const sp = this.sprite;
    sp.setPosition(this.x, this.y + Math.sin(this.bobTime * m.bobSpeed) * m.bobAmplitude);
    sp.rotation = this.tilt;
    sp.setScale(scaleX, s.displayScale);
    sp.setVisible(this.state === 'entering' || this.state === 'alive');
    sp.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0 ? 0.35 : 1);

    // Hitbox dot: shown while focusing or moving slowly.
    const showDot = this.state === 'alive' && (input.focus || moved < SLOW_SPEED || Debug.showHitboxes);
    this.dotAlpha += ((showDot ? 1 : 0) - this.dotAlpha) * Math.min(1, dt * 10);
    this.dot.setPosition(this.x, this.y).setAlpha(this.dotAlpha);
  }

  /** Apply one hit. The first hit of a life breaks the shield; the last costs the life. */
  hit(): HitResult {
    if (!this.vulnerable) return 'ignored';
    this.spin();
    this.hitsLeft--;
    if (this.hitsLeft > 0) {
      this.invuln = this.stats.invulnAfterHit;
      return 'shield';
    }
    this.lives--;
    this.state = 'dead';
    this.stateTime = 0;
    return this.lives > 0 ? 'life' : 'gameover';
  }

  /** Fast fake horizontal spin (damage, power-up pickups). */
  spin(): void {
    this.spinLeft = this.stats.motion.spinTime;
  }

  private beginEnter(): void {
    this.state = 'entering';
    this.stateTime = 0;
    this.hitsLeft = this.stats.hitsPerLife;
    this.invuln = this.stats.invulnAfterRespawn;
    this.x = -60;
    this.y = GAME_HEIGHT / 2;
  }
}
