import Phaser from 'phaser';
import { Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { HeroShotStats } from '../data/heroes';
import { Bullet } from '../entities/Bullet';
import type { Target } from '../entities/Target';
import { Pool } from './Pool';

const CULL_MARGIN = 40;
const DEG = Math.PI / 180;

/** The hero's autofire: spawns volleys, steers homing shots and resolves hits. */
export class HeroShots {
  readonly pool: Pool<Bullet>;
  private fireTimer = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly stats: HeroShotStats,
    private readonly targets: readonly Target[],
    private readonly onHit: (x: number, y: number) => void,
  ) {
    this.pool = new Pool(96, () => new Bullet(scene, stats.texture, Depth.HeroBullets));
  }

  update(dt: number, firing: boolean, x: number, y: number): void {
    if (firing) {
      this.fireTimer -= dt;
      while (this.fireTimer <= 0) {
        this.volley(x, y);
        this.fireTimer += this.stats.interval;
      }
    } else {
      this.fireTimer = 0;
    }

    const s = this.stats;
    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      if (!b.active) continue;

      b.age += dt;
      if (b.age >= b.lifetime) {
        b.kill();
        continue;
      }

      if (s.turnRate > 0) this.steer(b, dt);

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rotation += b.spin * dt;

      if (b.x > GAME_WIDTH + CULL_MARGIN || b.x < -CULL_MARGIN || b.y < -CULL_MARGIN || b.y > GAME_HEIGHT + CULL_MARGIN) {
        b.kill();
        continue;
      }

      this.resolveHit(b);
    }
  }

  private volley(x: number, y: number): void {
    const s = this.stats;
    const spread = s.spreadDeg * DEG;
    for (let i = 0; i < s.count; i++) {
      const b = this.pool.obtain();
      if (!b) return;
      const t = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
      const a = t * spread;
      b.launch(x + 10, y, Math.cos(a) * s.speed, Math.sin(a) * s.speed, s.radius);
      b.lifetime = s.lifetime;
      b.spin = s.spin;
      b.speed = s.speed;
      b.turnRate = s.turnRate;
      b.damage = s.damage;
      b.retargetTimer = 0;
    }
  }

  private steer(b: Bullet, dt: number): void {
    b.retargetTimer -= dt;
    if (b.target === null || !b.target.isTargetable() || b.retargetTimer <= 0) {
      b.target = this.nearest(b.x, b.y);
      b.retargetTimer = this.stats.retargetInterval;
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

  private nearest(x: number, y: number): Target | null {
    let best: Target | null = null;
    let bestD = Infinity;
    const targets = this.targets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isTargetable() || t.x > GAME_WIDTH + t.radius) continue;
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
