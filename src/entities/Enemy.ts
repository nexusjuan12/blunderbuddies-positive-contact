import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemyDef } from '../data/enemies';
import type { EnemyShots } from '../systems/EnemyShots';
import type { Target } from './Target';

export interface EnemyContext {
  heroX: number;
  heroY: number;
  shots: EnemyShots;
}

const FLASH_TIME = 0.06;
const TELEGRAPH_TINT = 0xff5a5a;

const Look = { Normal: 0, Flash: 1, Telegraph: 2 } as const;
type Look = (typeof Look)[keyof typeof Look];

/** A pooled mimic head. Behaviour is chosen by its data definition. */
export class Enemy extends Phaser.GameObjects.Image implements Target {
  def: EnemyDef | null = null;
  hp = 0;
  radius = 0;
  private age = 0;
  private baseY = 0;
  private phase = 0;
  private vx = 0;
  private vy = 0;
  /** Charger: 0 entering, 1 winding up, 2 dashing. */
  private step = 0;
  private stepTime = 0;
  private fireTimer = 0;
  private burstLeft = 0;
  private flash = 0;
  private look: Look = Look.Normal;

  constructor(
    scene: Phaser.Scene,
    private readonly onKilled: (enemy: Enemy) => void,
  ) {
    super(scene, -200, -200, 'mimic-1');
    scene.add.existing(this);
    this.setDepth(Depth.Enemies);
    this.setActive(false).setVisible(false);
  }

  spawn(def: EnemyDef, x: number, y: number): void {
    this.def = def;
    this.hp = def.hp;
    this.radius = def.radius;
    this.age = 0;
    this.baseY = y;
    this.phase = Math.random() * Math.PI * 2;
    this.step = 0;
    this.stepTime = 0;
    this.flash = 0;
    this.burstLeft = 0;
    this.vx = 0;
    this.vy = 0;
    this.setTexture(def.texture);
    this.setScale(def.displayHeight / this.height);
    this.setPosition(x, y);
    this.rotation = 0;
    this.applyLook(Look.Normal, true);
    this.setActive(true).setVisible(true);
    if (def.behavior === 'turret') this.fireTimer = def.firstShotDelay;
  }

  /** Only on-screen enemies can be hit or homed in on, so they get a moment to be seen. */
  isTargetable(): boolean {
    return this.active && this.x < GAME_WIDTH - this.radius * 0.5;
  }

  takeDamage(amount: number): void {
    if (!this.active) return;
    this.hp -= amount;
    this.flash = FLASH_TIME;
    if (this.hp <= 0) {
      this.onKilled(this);
      this.despawn();
    }
  }

  despawn(): void {
    this.def = null;
    this.setActive(false).setVisible(false);
  }

  override update(dt: number, ctx: EnemyContext): void {
    const def = this.def;
    if (!def) return;
    this.age += dt;

    switch (def.behavior) {
      case 'sine':
        this.x -= def.speed * dt;
        this.y = this.baseY + Math.sin(this.age * def.frequency + this.phase) * def.amplitude;
        this.rotation = Math.cos(this.age * def.frequency + this.phase) * 0.25;
        break;

      case 'charger':
        this.stepTime += dt;
        if (this.step === 0) {
          const stopX = GAME_WIDTH - def.stopDistance;
          this.x -= def.enterSpeed * dt * Math.max(0.15, Math.min(1, (this.x - stopX) / 120));
          this.rotation = Math.sin(this.age * 6) * 0.1;
          if (this.x <= stopX + 2) {
            this.step = 1;
            this.stepTime = 0;
          }
        } else if (this.step === 1) {
          // Windup telegraph: shake and flash red, then lock onto the hero.
          this.rotation = Math.sin(this.stepTime * 50) * 0.18;
          if (this.stepTime >= def.windup) {
            const a = Math.atan2(ctx.heroY - this.y, ctx.heroX - this.x);
            this.vx = Math.cos(a) * def.dashSpeed;
            this.vy = Math.sin(a) * def.dashSpeed;
            this.rotation = 0;
            this.step = 2;
            this.stepTime = 0;
          }
        } else {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        }
        break;

      case 'turret':
        this.x -= def.driftSpeed * dt;
        this.y = this.baseY + Math.sin(this.age * 1.5 + this.phase) * def.bobAmplitude;
        if (this.x < GAME_WIDTH - 20) {
          this.fireTimer -= dt;
          if (this.fireTimer <= 0) {
            if (this.burstLeft === 0) this.burstLeft = def.burst;
            ctx.shots.aimed(this.x - this.displayWidth * 0.2, this.y, ctx.heroX, ctx.heroY, def.bulletSpeed);
            this.burstLeft--;
            this.fireTimer = this.burstLeft > 0 ? def.burstGap : def.fireInterval;
          }
        }
        break;
    }

    // Tint: white hit flash wins over the charger's red telegraph.
    let look: Look = Look.Normal;
    if (this.flash > 0) {
      this.flash -= dt;
      look = Look.Flash;
    } else if (def.behavior === 'charger' && this.step === 1 && Math.floor(this.stepTime * 12) % 2 === 0) {
      look = Look.Telegraph;
    }
    this.applyLook(look);

    const m = def.displayHeight;
    if (this.x < -m || this.x > GAME_WIDTH + m * 3 || this.y < -m || this.y > GAME_HEIGHT + m) this.despawn();
  }

  /** Only touches tint state when the look actually changes. */
  private applyLook(look: Look, force = false): void {
    if (look === this.look && !force) return;
    this.look = look;
    if (look === Look.Flash) this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    else if (look === Look.Telegraph) this.setTint(TELEGRAPH_TINT).setTintMode(Phaser.TintModes.MULTIPLY);
    else this.clearTint();
  }
}
