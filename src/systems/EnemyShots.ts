import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Bullet } from '../entities/Bullet';
import type { Effects } from './Effects';
import { Pool } from './Pool';

const CULL_MARGIN = 60;
const BULLET_RADIUS = 6;
const DRUMSTICK_RADIUS = 9;

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

  fire(x: number, y: number, angle: number, speed: number, texture = 'bullet'): Bullet | null {
    const b = this.bullets.obtain();
    if (!b) return null;
    if (b.texture.key !== texture) b.setTexture(texture);
    return b.launch(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, BULLET_RADIUS);
  }

  aimed(x: number, y: number, tx: number, ty: number, speed: number): void {
    this.fire(x, y, Math.atan2(ty - y, tx - x), speed);
  }

  radial(x: number, y: number, count: number, speed: number, offset = 0): void {
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) this.fire(x, y, offset + i * step, speed);
  }

  /** Expanding ring with `gapSize` bullets missing around `gapAngle`. */
  ring(x: number, y: number, count: number, gapAngle: number, gapSize: number, speed: number): void {
    const step = (Math.PI * 2) / count;
    const half = gapSize / 2;
    for (let i = 0; i < count; i++) {
      const a = gapAngle + (i + 0.5) * step - Math.PI;
      // Index distance from the gap centre (which sits at i = count/2).
      if (Math.abs(i + 0.5 - count / 2) < half) continue;
      this.fire(x, y, a, speed, 'bullet-ring');
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
  ): void {
    const d = this.drumsticks.obtain();
    if (!d) return;
    if (d.texture.key !== 'drumstick') d.setTexture('drumstick');
    d.launch(x, y, vx, vy, DRUMSTICK_RADIUS);
    d.gravity = gravity;
    d.lifetime = fuse;
    d.burstCount = burstCount;
    d.burstSpeed = burstSpeed;
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

  update(dt: number): void {
    const items = this.bullets.items;
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
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
      d.rotation = Math.atan2(d.vy, d.vx);
      if (d.age >= d.lifetime) {
        this.effects.pop(d.x, d.y, 1.2, 0xffb347);
        this.radial(d.x, d.y, d.burstCount, d.burstSpeed, Math.random() * Math.PI);
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
