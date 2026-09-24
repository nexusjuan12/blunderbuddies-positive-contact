import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Bullet } from '../entities/Bullet';
import type { Target } from '../entities/Target';
import { Pool } from './Pool';

const CULL_MARGIN = 40;

/** How a hero projectile moves. */
export const Mode = {
  Straight: 0,
  Homing: 1,
  /** Bounces off the top and bottom of the screen. */
  Bounce: 2,
  /** Positioned by its weapon each frame (orbiting petals); never culled. */
  Orbit: 3,
} as const;

/**
 * Every hero-side projectile (the hero's and companions'), in one pool.
 * Weapons spawn into it; this moves them and resolves hits on targets.
 */
export class HeroProjectiles {
  readonly pool: Pool<Bullet>;

  constructor(
    scene: Phaser.Scene,
    readonly targets: readonly Target[],
    private readonly onHit: (x: number, y: number) => void,
    size = 300,
  ) {
    this.pool = new Pool(size, () => new Bullet(scene, 'star', Depth.HeroBullets));
  }

  spawn(texture: string, x: number, y: number, vx: number, vy: number, radius: number, damage: number, scale = 1): Bullet | null {
    const b = this.pool.obtain();
    if (!b) return null;
    if (b.texture.key !== texture) b.setTexture(texture);
    b.launch(x, y, vx, vy, radius);
    b.damage = damage;
    b.baseScale = scale;
    b.setScale(scale);
    return b;
  }

  update(dt: number): void {
    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;

      b.age += dt;
      if (b.age >= b.lifetime) {
        b.kill();
        continue;
      }

      if (b.mode !== Mode.Orbit) {
        if (b.mode === Mode.Homing) this.steer(b, dt);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.mode === Mode.Bounce) this.bounce(b, dt);
        if (b.x > GAME_WIDTH + CULL_MARGIN || b.x < -CULL_MARGIN || b.y < -CULL_MARGIN || b.y > GAME_HEIGHT + CULL_MARGIN) {
          b.kill();
          continue;
        }
      }
      b.rotation += b.spin * dt;
      this.resolveHit(b);
    }
  }

  private bounce(b: Bullet, dt: number): void {
    const r = b.radius;
    let hit = false;
    if (b.y < r && b.vy < 0) {
      b.y = r;
      b.vy = -b.vy;
      hit = true;
    } else if (b.y > GAME_HEIGHT - r && b.vy > 0) {
      b.y = GAME_HEIGHT - r;
      b.vy = -b.vy;
      hit = true;
    }
    if (hit) {
      b.bounces--;
      b.squash = 1;
      if (b.bounces < 0) {
        b.kill();
        return;
      }
    }
    if (b.squash > 0) {
      b.squash = Math.max(0, b.squash - dt * 8);
      // Squash flat against the wall it hit, then spring back.
      b.setScale(b.baseScale * (1 + 0.3 * b.squash), b.baseScale * (1 - 0.4 * b.squash));
    }
  }

  private steer(b: Bullet, dt: number): void {
    b.retargetTimer -= dt;
    if (b.target === null || !b.target.isTargetable() || b.retargetTimer <= 0) {
      b.target = this.nearest(b.x, b.y);
      b.retargetTimer = 0.2;
    }
    const t = b.target;
    if (t === null) return;
    const current = Math.atan2(b.vy, b.vx);
    const desired = Math.atan2(t.y - b.y, t.x - b.x);
    let diff = desired - current;
    if (diff > Math.PI) diff -= Math.PI * 2;
    else if (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = b.turnRate * dt;
    const a = current + Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
    b.vx = Math.cos(a) * b.speed;
    b.vy = Math.sin(a) * b.speed;
  }

  nearest(x: number, y: number): Target | null {
    let best: Target | null = null;
    let bestD = Infinity;
    const targets = this.targets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isTargetable()) continue;
      const dx = t.x - x;
      const dy = t.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  private resolveHit(b: Bullet): void {
    const targets = this.targets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isTargetable()) continue;
      const dx = t.x - b.x;
      const dy = t.y - b.y;
      const r = t.radius + b.radius;
      if (dx * dx + dy * dy < r * r) {
        t.takeDamage(b.damage);
        this.onHit(b.x, b.y);
        b.kill();
        return;
      }
    }
  }

  clear(): void {
    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) if (items[i].active) items[i].kill();
  }
}
