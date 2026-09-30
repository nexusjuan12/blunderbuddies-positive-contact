import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { BULLETS, type BulletStyle, type BulletStyleId } from '../data/bullets';
import { Bullet } from '../entities/Bullet';
import type { Effects } from './Effects';
import { Pool } from './Pool';

const CULL_MARGIN = 60;
const BULLET_RADIUS = 6;
const DEG = Math.PI / 180;
const DRUMSTICK_RADIUS = 9;
const EGG_DESIGNS = 12;

/** Every hostile projectile: plain bullets plus arcing drumstick missiles that burst. */
export class EnemyShots {
  readonly bullets: Pool<Bullet>;
  readonly drumsticks: Pool<Bullet>;

  constructor(
    scene: Phaser.Scene,
    private readonly effects: Effects,
  ) {
    this.bullets = new Pool(420, () => new Bullet(scene, 'bullet', Depth.EnemyBullets));
    this.drumsticks = new Pool(24, () => new Bullet(scene, 'drumstick', Depth.EnemyBullets));
  }

  fire(x: number, y: number, angle: number, speed: number, style: BulletStyleId = 'orb'): Bullet | null {
    const b = this.bullets.obtain();
    if (!b) return null;
    const st: BulletStyle = BULLETS[style];
    if (b.texture.key !== st.texture) b.setTexture(st.texture);
    // Accelerating bullets start slow; `speed` on the bullet is what they build up to.
    const start = st.move === 'accelerate' ? speed * st.startFactor : speed;
    b.launch(x, y, Math.cos(angle) * start, Math.sin(angle) * start, st.radius);
    b.style = st;
    b.speed = st.move === 'accelerate' ? speed * st.maxFactor : speed;
    b.spin = st.spin ?? 0;
    if (st.pointAlongPath) b.rotation = angle;
    return b;
  }

  aimed(x: number, y: number, tx: number, ty: number, speed: number, style: BulletStyleId = 'orb'): void {
    this.fire(x, y, Math.atan2(ty - y, tx - x), speed, style);
  }

  /** A fan of `count` bullets centred on `angle`. */
  fan(x: number, y: number, angle: number, count: number, spreadDeg: number, speed: number, style: BulletStyleId = 'orb'): void {
    const spread = spreadDeg * DEG;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      this.fire(x, y, angle + t * spread, speed, style);
    }
  }

  radial(x: number, y: number, count: number, speed: number, offset = 0, style: BulletStyleId = 'orb'): void {
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) this.fire(x, y, offset + i * step, speed, style);
  }

  /** Expanding ring with `gapSize` bullets missing around `gapAngle`. */
  ring(x: number, y: number, count: number, gapAngle: number, gapSize: number, speed: number, style: BulletStyleId = 'ringOrb'): void {
    const step = (Math.PI * 2) / count;
    const half = gapSize / 2;
    for (let i = 0; i < count; i++) {
      const a = gapAngle + (i + 0.5) * step - Math.PI;
      // Index distance from the gap centre (which sits at i = count/2).
      if (Math.abs(i + 0.5 - count / 2) < half) continue;
      this.fire(x, y, a, speed, style);
    }
  }

  drumstick(
    x: number,
    y: number,
    vx: number,
    vy: number,
    gravity: number,
    fuse: number,
    burstCount: number,
    burstSpeed: number,
    burstStyle: BulletStyleId = 'orb',
  ): void {
    const d = this.drumsticks.obtain();
    if (!d) return;
    if (d.texture.key !== 'drumstick') d.setTexture('drumstick');
    d.launch(x, y, vx, vy, DRUMSTICK_RADIUS);
    d.gravity = gravity;
    d.lifetime = fuse;
    d.burstCount = burstCount;
    d.burstSpeed = burstSpeed;
    d.burstStyle = burstStyle;
  }

  /** A ballistic shot that lands on (tx, ty) after `time` seconds under `gravity`. Doesn't burst. */
  lob(x: number, y: number, tx: number, ty: number, time: number, gravity: number, texture = 'web'): void {
    const d = this.drumsticks.obtain();
    if (!d) return;
    if (d.texture.key !== texture) d.setTexture(texture);
    d.launch(x, y, (tx - x) / time, (ty - y - 0.5 * gravity * time * time) / time, BULLET_RADIUS + 2);
    d.gravity = gravity;
    d.lifetime = Infinity;
  }

  /** A spinning Easter egg on a plain ballistic arc (random design). */
  egg(x: number, y: number, vx: number, vy: number, gravity: number, spin: number, radius: number): void {
    const d = this.drumsticks.obtain();
    if (!d) return;
    d.setTexture('eggs', Math.floor(Math.random() * EGG_DESIGNS));
    d.launch(x, y, vx, vy, radius);
    d.gravity = gravity;
    d.lifetime = Infinity;
    d.spin = spin;
  }

  update(dt: number): void {
    const items = this.bullets.items;
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;
      const st = b.style;
      b.age += dt;
      let mx = b.vx;
      let my = b.vy;
      if (st !== null && st.move !== 'straight') {
        if (st.move === 'wavy') {
          // Add a sideways swing at right angles to the heading.
          const inv = 1 / (b.speed || 1);
          const side = Math.cos(b.age * st.waveFrequency) * st.waveAmplitude;
          mx += -b.vy * inv * side;
          my += b.vx * inv * side;
        } else if (st.move === 'accelerate') {
          const cur = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
          const next = Math.min(b.speed, cur + st.acceleration * dt);
          b.vx *= next / cur;
          b.vy *= next / cur;
          mx = b.vx;
          my = b.vy;
        } else if (b.age >= st.splitAfter) {
          this.effects.pop(b.x, b.y, 0.7, 0xffe14d, 0.2);
          this.fan(b.x, b.y, Math.atan2(b.vy, b.vx), st.splitCount, st.splitSpreadDeg, b.speed * 1.15, st.splitInto as BulletStyleId);
          b.kill();
          continue;
        }
      }
      b.x += mx * dt;
      b.y += my * dt;
      if (b.spin !== 0) b.rotation += b.spin * dt;
      else if (st !== null && st.pointAlongPath) b.rotation = Math.atan2(my, mx);
      if (b.x < -CULL_MARGIN || b.x > GAME_WIDTH + CULL_MARGIN || b.y < -CULL_MARGIN || b.y > GAME_HEIGHT + CULL_MARGIN) {
        b.kill();
      }
    }

    const sticks = this.drumsticks.items;
    for (let i = 0; i < sticks.length; i++) {
      const d = sticks[i];
      if (!d.active) continue;
      d.age += dt;
      d.vy += d.gravity * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      // Eggs tumble; everything else points along its path.
      if (d.spin !== 0) d.rotation += d.spin * dt;
      else d.rotation = Math.atan2(d.vy, d.vx);
      if (d.age >= d.lifetime) {
        this.effects.pop(d.x, d.y, 1.2, 0xffb347);
        this.radial(d.x, d.y, d.burstCount, d.burstSpeed, Math.random() * Math.PI, d.burstStyle as BulletStyleId);
        d.kill();
      } else if (d.y > GAME_HEIGHT + CULL_MARGIN || d.x < -CULL_MARGIN) {
        d.kill();
      }
    }
  }

  /** True (and removes the bullet) if any hostile projectile overlaps the circle. */
  hitsCircle(x: number, y: number, r: number): boolean {
    return this.hitsIn(this.bullets.items, x, y, r) || this.hitsIn(this.drumsticks.items, x, y, r);
  }

  private hitsIn(items: Bullet[], x: number, y: number, r: number): boolean {
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;
      const dx = b.x - x;
      const dy = b.y - y;
      const rr = b.radius + r;
      if (dx * dx + dy * dy < rr * rr) {
        b.kill();
        return true;
      }
    }
    return false;
  }

  /** Turns every hostile projectile into a floating heart. Returns how many were converted. */
  toHearts(): number {
    let n = 0;
    const lists = [this.bullets.items, this.drumsticks.items];
    for (const items of lists) {
      for (let i = 0; i < items.length; i++) {
        const b = items[i];
        if (!b.active) continue;
        this.effects.floatHeart(b.x, b.y);
        b.kill();
        n++;
      }
    }
    return n;
  }

  /** Cancels every hostile projectile with a little sparkle. */
  clear(): void {
    this.clearIn(this.bullets.items);
    this.clearIn(this.drumsticks.items);
  }

  private clearIn(items: Bullet[]): void {
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;
      this.effects.pop(b.x, b.y, 0.5, 0xffffff, 0.25);
      b.kill();
    }
  }

  activeCount(): number {
    return this.bullets.countActive() + this.drumsticks.countActive();
  }
}
