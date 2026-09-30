import Phaser from 'phaser';
import { Depth, GAME_WIDTH } from '../config';
import type { MidBossDef } from '../data/bosses';
import type { Effects } from '../systems/Effects';
import type { EnemyShots } from '../systems/EnemyShots';
import type { Target } from './Target';

/** Sheet metadata written by tools/process_assets.py (`bunny.json`), fractions are 0..1 of a frame. */
export interface BunnyMeta {
  walk: { frameWidth: number; frameHeight: number; frames: number; fps: number };
  throw: { frameWidth: number; frameHeight: number; frames: number; fps: number };
  feetY: number;
  hitbox: { x: number; y: number; w: number; h: number };
  releaseFrame: number;
  eggSpawn: { x: number; y: number };
}

export interface BunnyEvents {
  onDamaged(hpFraction: number, damage: number): void;
  onDefeated(x: number, y: number): void;
}

export type BunnyState = 'idle' | 'entering' | 'active' | 'dying' | 'dead';

const FLASH_TIME = 0.04;
const FLASH_COOLDOWN = 0.25;
const DYING_TIME = 1.4;

class BunnyHurtbox implements Target {
  x = 0;
  y = 0;

  constructor(
    private readonly bunny: RoboBunny,
    readonly radius: number,
    /** Offset from the sprite position (the hitbox centre), px. */
    readonly offsetY: number,
  ) {}

  isTargetable(): boolean {
    return this.bunny.vulnerable;
  }

  takeDamage(amount: number): void {
    this.bunny.takeDamage(amount);
  }
}

/**
 * Robo Easter bunny: a mid-level tank. It walks in along the ground, then advances and recedes
 * while regular waves keep coming, lobbing spinning eggs until it is destroyed.
 */
export class RoboBunny {
  state: BunnyState = 'idle';
  hp: number;
  x = GAME_WIDTH + 140;
  y = 0;
  readonly hurtboxes: BunnyHurtbox[];

  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scale: number;
  private readonly frameW: number;
  private readonly frameH: number;
  private dir = -1;
  private throwTimer = 1;
  /** Seconds into the current throw animation, or -1 when walking. */
  private throwTime = -1;
  private released = false;
  private readonly releaseAt: number;
  private readonly throwLength: number;
  private stateTime = 0;
  private boomTimer = 0;
  private flash = 0;
  private flashCooldown = 0;
  private flashing = false;

  constructor(
    scene: Phaser.Scene,
    readonly def: MidBossDef,
    private readonly meta: BunnyMeta,
    private readonly eggRadius: number,
    private readonly shots: EnemyShots,
    private readonly effects: Effects,
    private readonly events: BunnyEvents,
  ) {
    this.hp = def.hp;
    this.frameW = meta.walk.frameWidth;
    this.frameH = meta.walk.frameHeight;
    this.scale = def.displayHeight / this.frameH;

    // Position is the hitbox centre; the feet stand on the ground line.
    const hb = meta.hitbox;
    const oy = hb.y + hb.h / 2;
    this.y = def.groundY - (meta.feetY - oy) * def.displayHeight;
    this.sprite = scene.add
      .sprite(this.x, this.y, 'bunny-walk', 0)
      .setOrigin(hb.x + hb.w / 2, oy)
      .setScale(this.scale)
      .setDepth(Depth.Boss)
      .setVisible(false);

    // Two stacked circles cover the tall body box.
    const w = hb.w * this.frameW * this.scale;
    const h = hb.h * def.displayHeight;
    const r = Math.max(w * 0.55, h * 0.27);
    this.hurtboxes = [new BunnyHurtbox(this, r, -h * 0.24), new BunnyHurtbox(this, r, h * 0.24)];
    this.releaseAt = meta.releaseFrame / meta.throw.fps;
    this.throwLength = meta.throw.frames / meta.throw.fps;
    this.sync();
  }

  get vulnerable(): boolean {
    return (this.state === 'entering' || this.state === 'active') && this.x < GAME_WIDTH - 20;
  }

  /** True while touching it hurts the hero. */
  get solid(): boolean {
    return this.state === 'entering' || this.state === 'active';
  }

  /** True once it has been dealt with (or never appeared), so the level can move on. */
  get finished(): boolean {
    return this.state === 'dead';
  }

  enter(): void {
    this.state = 'entering';
    this.sprite.setVisible(true).play('bunny-walk');
  }

  takeDamage(amount: number): void {
    if (!this.vulnerable) return;
    this.hp -= amount;
    if (this.flashCooldown <= 0) {
      this.flash = FLASH_TIME;
      this.flashCooldown = FLASH_COOLDOWN;
    }
    this.events.onDamaged(Math.max(0, this.hp / this.def.hp), amount);
    if (this.hp <= 0) {
      this.state = 'dying';
      this.stateTime = 0;
      this.sprite.anims.pause();
    }
  }

  update(dt: number): void {
    if (this.state === 'idle' || this.state === 'dead') return;
    const def = this.def;
    this.stateTime += dt;

    if (this.state === 'entering') {
      this.x -= def.enterSpeed * dt;
      if (this.x <= def.rangeX[1]) {
        this.state = 'active';
        this.dir = -1;
      }
    } else if (this.state === 'active') {
      if (this.throwTime < 0) {
        // Pace: advance toward the hero's side, then back off.
        this.x += this.dir * (this.dir < 0 ? def.advanceSpeed : def.recedeSpeed) * dt;
        if (this.x <= def.rangeX[0]) this.dir = 1;
        else if (this.x >= def.rangeX[1]) this.dir = -1;
        this.throwTimer -= dt;
        if (this.throwTimer <= 0) this.beginThrow();
      } else {
        this.updateThrow(dt);
      }
    } else if (this.state === 'dying') {
      this.boomTimer -= dt;
      if (this.boomTimer <= 0) {
        this.boomTimer = 0.12;
        const h = this.hurtboxes[Math.floor(Math.random() * this.hurtboxes.length)];
        this.effects.explode(h.x + (Math.random() - 0.5) * h.radius * 1.6, h.y + (Math.random() - 0.5) * h.radius * 1.6, 0.9 + Math.random() * 0.6);
      }
      this.x += Math.sin(this.stateTime * 70) * 1.5;
      if (this.stateTime >= DYING_TIME) {
        this.state = 'dead';
        this.sprite.setVisible(false);
        this.effects.explode(this.x, this.y, 2.4);
        this.events.onDefeated(this.x, this.y);
      }
    }

    this.sync();
    this.flashCooldown -= dt;
    this.flash -= dt;
    const shouldFlash = this.flash > 0;
    if (shouldFlash !== this.flashing) {
      this.flashing = shouldFlash;
      if (shouldFlash) this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      else this.sprite.clearTint();
    }
  }

  private beginThrow(): void {
    this.throwTime = 0;
    this.released = false;
    this.sprite.play('bunny-throw');
  }

  private updateThrow(dt: number): void {
    this.throwTime += dt;
    if (!this.released && this.throwTime >= this.releaseAt) {
      this.released = true;
      this.throwEggs();
    }
    if (this.throwTime >= this.throwLength) {
      this.throwTime = -1;
      const t = this.def.throwInterval;
      this.throwTimer = Phaser.Math.FloatBetween(t[0], t[1]);
      this.sprite.play('bunny-walk');
    }
  }

  /** Hammer Bros style: a handful of eggs flung up and over on overlapping arcs, each spinning. */
  private throwEggs(): void {
    const def = this.def;
    const e = def.egg;
    const o = this.sprite;
    // Spawn point from the throw sheet, relative to the sprite's origin.
    const sx = this.x + (this.meta.eggSpawn.x - o.originX) * this.frameW * this.scale;
    const sy = this.y + (this.meta.eggSpawn.y - o.originY) * this.frameH * this.scale;
    const count = Phaser.Math.Between(def.eggsPerThrow[0], def.eggsPerThrow[1]);
    for (let i = 0; i < count; i++) {
      const spin = Phaser.Math.FloatBetween(e.spin[0], e.spin[1]) * (Math.random() < 0.5 ? -1 : 1);
      this.shots.egg(
        sx,
        sy,
        Phaser.Math.FloatBetween(e.speedX[0], e.speedX[1]),
        Phaser.Math.FloatBetween(e.speedY[0], e.speedY[1]),
        e.gravity,
        spin,
        this.eggRadius,
      );
    }
  }

  private sync(): void {
    this.sprite.setPosition(this.x, this.y);
    for (let i = 0; i < this.hurtboxes.length; i++) {
      const h = this.hurtboxes[i];
      h.x = this.x;
      h.y = this.y + h.offsetY;
    }
  }
}
