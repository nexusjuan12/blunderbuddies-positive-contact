import Phaser from 'phaser';
import { Depth, GAME_WIDTH } from '../config';
import type { BossDef, BossPhase, Hurtbox } from '../data/bosses';
import type { BulletStyleId } from '../data/bullets';
import type { Effects } from '../systems/Effects';
import type { EnemyShots } from '../systems/EnemyShots';
import type { Target } from './Target';

/** Rig layout written by tools/process_assets.py (public/processed/turkey-rig.json). */
export interface RigPart {
  key: string;
  originX: number;
  originY: number;
  x: number;
  y: number;
}
export interface Rig {
  drawOrder: string[];
  parts: Record<string, RigPart>;
}

export interface BossEvents {
  onDamaged(hpFraction: number): void;
  /** -1 when the boss is defeated and starts dying. */
  onPhaseChange(phaseIndex: number): void;
  onStomp(): void;
  onDefeated(): void;
}

export type BossState = 'idle' | 'entering' | 'fighting' | 'transition' | 'dying' | 'dead';

const FLASH_TIME = 0.04;
const FLASH_COOLDOWN = 0.3;
const DYING_TIME = 2.2;
/** The detached head hovers and sputters this long before blasting off. */
const POD_HOVER_TIME = 0.8;
const TANTRUM_BOX = { x0: 560, x1: 820, y0: 170, y1: 380 };

class BossHurtbox implements Target {
  x = 0;
  y = 0;
  readonly radius: number;

  constructor(
    private readonly boss: MechaTurkey,
    readonly def: Hurtbox,
    scale: number,
  ) {
    this.radius = def.radius * scale;
  }

  get owner(): object {
    return this.boss;
  }

  isTargetable(): boolean {
    return this.boss.vulnerable;
  }

  takeDamage(amount: number): void {
    this.boss.takeDamage(amount);
  }
}

/** Mr. Uh-Uh-No riding the giant mecha-turkey. Parts are rotated around their rig pivots to walk. */
export class MechaTurkey {
  state: BossState = 'idle';
  hp: number;
  x: number;
  y: number;
  phaseIndex = 0;
  readonly hurtboxes: BossHurtbox[];

  private readonly container: Phaser.GameObjects.Container;
  private readonly parts: Phaser.GameObjects.Image[] = [];
  private readonly legFront: Phaser.GameObjects.Image;
  private readonly legBack: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly scale: number;

  private stateTime = 0;
  private walk = 0;
  private attackTimer = 0;
  private volleys = 0;
  private gobble = 0;
  private flash = 0;
  private flashCooldown = 0;
  private flashing = false;
  private moveX = 0;
  private moveY = 0;
  private stompTimer = 0;
  private boomTimer = 0;
  private podLaunched = false;
  private podTime = 0;
  private podVy = 0;
  /** Mr. Uh-Uh-No, shown clinging to the head once it detaches (stand-in art). */
  private readonly rider: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    readonly def: BossDef,
    rig: Rig,
    private readonly shots: EnemyShots,
    private readonly effects: Effects,
    private readonly events: BossEvents,
  ) {
    this.hp = def.hp;
    this.scale = def.displayScale;
    this.x = GAME_WIDTH + 300;
    this.y = def.homeY;

    this.container = scene.add.container(this.x, this.y).setDepth(Depth.Boss).setScale(this.scale).setVisible(false);
    const byName: Record<string, Phaser.GameObjects.Image> = {};
    for (const name of rig.drawOrder) {
      const p = rig.parts[name];
      const img = scene.add.image(p.x, p.y, p.key).setOrigin(p.originX, p.originY);
      this.container.add(img);
      this.parts.push(img);
      byName[name] = img;
    }
    this.legFront = byName.leg_front;
    this.legBack = byName.leg_back;
    this.head = byName.head;
    this.body = byName.body;

    // Sits on top of the head; hidden until the escape.
    this.rider = scene.add.image(this.head.x - 95, this.head.y - 300, 'uhuhno-rider').setScale(1.15).setVisible(false);
    // Behind the head, so he peeks over the top of it.
    this.container.addAt(this.rider, this.container.getIndex(this.head));

    this.hurtboxes = def.hurtboxes.map((h) => new BossHurtbox(this, h, this.scale));
    this.syncHurtboxes();
  }

  get vulnerable(): boolean {
    return this.state === 'fighting';
  }

  /** True while touching the boss should hurt the hero. */
  get solid(): boolean {
    return this.state === 'entering' || this.state === 'fighting' || this.state === 'transition';
  }

  get hpFraction(): number {
    return Math.max(0, this.hp / this.def.hp);
  }

  private get phase(): BossPhase {
    return this.def.phases[this.phaseIndex];
  }

  enter(): void {
    this.state = 'entering';
    this.stateTime = 0;
    this.container.setVisible(true);
  }

  takeDamage(amount: number): void {
    if (!this.vulnerable) return;
    this.hp -= amount;
    if (this.flashCooldown <= 0) {
      this.flash = FLASH_TIME;
      this.flashCooldown = FLASH_COOLDOWN;
    }
    this.events.onDamaged(this.hpFraction);

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      this.stateTime = 0;
      this.events.onPhaseChange(-1);
    } else if (this.hpFraction <= this.phase.endsAtHp && this.phaseIndex < this.def.phases.length - 1) {
      this.state = 'transition';
      this.stateTime = 0;
      this.events.onPhaseChange(this.phaseIndex + 1);
    }
  }

  update(dt: number, heroX: number, heroY: number): void {
    if (this.state === 'idle' || this.state === 'dead') return;
    this.stateTime += dt;
    const def = this.def;
    let walkRate = 3.5;

    switch (this.state) {
      case 'entering': {
        const t = Math.min(1, this.stateTime / def.enterTime);
        const ease = 1 - (1 - t) * (1 - t) * (1 - t);
        this.x = GAME_WIDTH + 300 + (def.homeX - GAME_WIDTH - 300) * ease;
        this.y = def.homeY;
        walkRate = 6;
        if (t >= 1) this.startPhase(0);
        break;
      }
      case 'fighting':
        walkRate = this.fight(dt, heroX, heroY);
        break;
      case 'transition':
        walkRate = 1.5;
        if (this.stateTime >= def.phaseTransitionTime) this.startPhase(this.phaseIndex + 1);
        break;
      case 'dying':
        this.die(dt);
        walkRate = 12;
        break;
    }

    this.animate(dt, walkRate);
    this.syncHurtboxes();
  }

  private startPhase(index: number): void {
    this.phaseIndex = index;
    this.state = 'fighting';
    this.stateTime = 0;
    this.attackTimer = 0.8;
    this.volleys = 0;
    this.stompTimer = 0;
    this.moveX = this.x;
    this.moveY = this.y;
  }

  /** Runs the current phase's attack pattern. Returns the walk-cycle speed. */
  private fight(dt: number, heroX: number, heroY: number): number {
    const def = this.def;
    const p = this.phase;
    const t = this.stateTime;
    this.attackTimer -= dt;

    if (p.pattern === 'tantrum') {
      // Stomp to random spots and spray bullets everywhere.
      this.stompTimer -= dt;
      if (this.stompTimer <= 0) {
        this.moveX = Phaser.Math.FloatBetween(TANTRUM_BOX.x0, TANTRUM_BOX.x1);
        this.moveY = Phaser.Math.FloatBetween(TANTRUM_BOX.y0, TANTRUM_BOX.y1);
        this.stompTimer = p.stompInterval * Phaser.Math.FloatBetween(0.6, 1.3);
        this.events.onStomp();
      }
      const k = Math.min(1, p.moveLerp * dt);
      this.x += (this.moveX - this.x) * k;
      this.y += (this.moveY - this.y) * k;
      if (this.attackTimer <= 0) {
        this.attackTimer = p.sprayInterval;
        if (this.shots.bullets.countActive() < p.maxBullets) {
          const half = (p.sprayArcDeg * Math.PI) / 360;
          const a = Math.PI + Phaser.Math.FloatBetween(-half, half);
          const style = p.sprayStyles[Math.floor(Math.random() * p.sprayStyles.length)];
          this.shots.fire(this.worldX(def.back.x), this.worldY(def.back.y), a, Phaser.Math.FloatBetween(p.spraySpeed[0], p.spraySpeed[1]), style);
        }
      }
      return 11;
    }

    // Phases 1 and 2 pace around the home spot.
    this.x = def.homeX + Math.sin(t * 0.5) * 30;
    this.y = def.homeY + Math.sin(t * 0.8) * 55;

    if (this.attackTimer <= 0) {
      this.volleys++;
      if (p.pattern === 'drumsticks') {
        this.attackTimer = p.interval;
        for (let i = 0; i < p.perVolley; i++) this.launchDrumstick(p.launchSpeedX, p.launchSpeedY, p.gravity, p.fuse, p.burstCount, p.burstSpeed, p.burstStyle);
      } else {
        this.attackTimer = p.interval;
        this.gobble = 1;
        const bx = this.worldX(def.beak.x);
        const by = this.worldY(def.beak.y);
        const gap = Math.atan2(heroY - by, heroX - bx) + Phaser.Math.FloatBetween(-p.gapJitter, p.gapJitter);
        const ringStyle = p.ringStyles[this.volleys % p.ringStyles.length];
        // Big orbs are slower, so alternate rings drift apart instead of stacking.
        this.shots.ring(bx, by, p.ringCount, gap, p.gapSize, ringStyle === 'bigOrb' ? p.ringSpeed * 0.75 : p.ringSpeed, ringStyle);
        if (p.drumstickEvery > 0 && this.volleys % p.drumstickEvery === 0) {
          const d = this.def.phases[0];
          if (d.pattern === 'drumsticks') this.launchDrumstick(d.launchSpeedX, d.launchSpeedY, d.gravity, d.fuse, d.burstCount, d.burstSpeed, d.burstStyle);
        }
      }
    }
    return 3.5;
  }

  private launchDrumstick(
    vx: readonly [number, number],
    vy: readonly [number, number],
    gravity: number,
    fuse: number,
    burstCount: number,
    burstSpeed: number,
    burstStyle: BulletStyleId,
  ): void {
    this.shots.drumstick(
      this.worldX(this.def.back.x),
      this.worldY(this.def.back.y),
      Phaser.Math.FloatBetween(vx[0], vx[1]),
      Phaser.Math.FloatBetween(vy[0], vy[1]),
      gravity,
      fuse * Phaser.Math.FloatBetween(0.85, 1.15),
      burstCount,
      burstSpeed,
      burstStyle,
    );
  }

  private die(dt: number): void {
    this.boomTimer -= dt;
    if (this.stateTime < DYING_TIME) {
      if (this.boomTimer <= 0) {
        this.boomTimer = 0.11;
        const h = this.hurtboxes[Math.floor(Math.random() * this.hurtboxes.length)];
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * h.radius;
        this.effects.explode(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 0.8 + Math.random() * 0.8);
      }
      this.x += Math.sin(this.stateTime * 60) * 1.5;
    } else {
      this.escape(dt);
    }
  }

  /**
   * The body blows apart; the head detaches with Mr. Uh-Uh-No clinging to it and rockets
   * off the top of the screen like an escape pod.
   */
  private escape(dt: number): void {
    if (!this.podLaunched) {
      this.podLaunched = true;
      this.podTime = 0;
      this.podVy = 0;
      for (let i = 0; i < this.hurtboxes.length; i++) {
        const h = this.hurtboxes[i];
        this.effects.explode(h.x, h.y, 3);
        this.effects.explode(h.x + 40, h.y + 50, 2.2);
      }
      this.body.setVisible(false);
      this.legFront.setVisible(false);
      this.legBack.setVisible(false);
      this.rider.setVisible(true);
    }
    this.podTime += dt;
    if (this.podTime < POD_HOVER_TIME) {
      // Sputter in place.
      this.x += Math.sin(this.podTime * 50) * 1.2;
      this.y -= 25 * dt;
    } else {
      this.podVy -= 1100 * dt;
      this.y += this.podVy * dt;
      this.x -= 50 * dt;
    }
    this.container.rotation = Math.sin(this.podTime * 9) * 0.08;
    // Rocket flame from the severed neck.
    this.boomTimer -= dt;
    if (this.boomTimer <= 0) {
      this.boomTimer = 0.025;
      const fx = this.worldX(this.head.x + 10);
      const fy = this.worldY(this.head.y + 30);
      this.effects.sparks(fx, fy, 2, 0xffa030, 120);
      this.effects.pop(fx, fy + 10, 0.5, 0xffe14d, 0.18);
    }
    if (this.y < -260) {
      this.state = 'dead';
      this.container.setVisible(false);
      this.events.onDefeated();
    }
  }

  private animate(dt: number, walkRate: number): void {
    this.walk += dt * walkRate;
    const w = this.walk;
    this.legFront.rotation = Math.sin(w) * 0.32;
    this.legBack.rotation = Math.sin(w + Math.PI) * 0.32;
    this.gobble = Math.max(0, this.gobble - dt * 2.5);
    this.head.rotation = Math.sin(w * 2) * 0.05 - Math.sin(this.gobble * Math.PI) * 0.35;
    this.body.rotation = Math.sin(w * 2) * 0.02;
    this.container.setPosition(this.x, this.y - Math.abs(Math.sin(w)) * 8);

    this.flashCooldown -= dt;
    this.flash -= dt;
    const shouldFlash = this.flash > 0;
    if (shouldFlash !== this.flashing) {
      this.flashing = shouldFlash;
      for (let i = 0; i < this.parts.length; i++) {
        if (shouldFlash) this.parts[i].setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        else this.parts[i].clearTint();
      }
    }
  }

  private worldX(localX: number): number {
    return this.container.x + localX * this.scale;
  }

  private worldY(localY: number): number {
    return this.container.y + localY * this.scale;
  }

  private syncHurtboxes(): void {
    for (let i = 0; i < this.hurtboxes.length; i++) {
      const h = this.hurtboxes[i];
      h.x = this.worldX(h.def.x);
      h.y = this.worldY(h.def.y);
    }
  }
}
