import type { HomingWeapon } from '../../data/heroes';
import { Mode } from '../HeroProjectiles';
import type { Power, Weapon, WeaponContext } from './Weapon';

const DEG = Math.PI / 180;

/** Nuh-Uh: volleys of stars that steer toward the nearest target. */
export class HomingStars implements Weapon {
  rate = 1;
  private timer = 0;

  constructor(
    private readonly cfg: HomingWeapon,
    private readonly ctx: WeaponContext,
    private readonly power: Power,
  ) {}

  update(dt: number, firing: boolean, x: number, y: number): void {
    if (!firing) {
      this.timer = 0;
      return;
    }
    this.timer -= dt * this.rate;
    while (this.timer <= 0) {
      this.volley(x, y);
      this.timer += this.cfg.interval * this.power.interval;
    }
  }

  private volley(x: number, y: number): void {
    const c = this.cfg;
    const p = this.power;
    const spread = c.spreadDeg * DEG;
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? 0 : i / (c.count - 1) - 0.5;
      const a = t * spread;
      const b = this.ctx.projectiles.spawn(c.texture, x + 10, y, Math.cos(a) * c.speed, Math.sin(a) * c.speed, c.radius * p.size, c.damage * p.damage, p.size);
      if (!b) return;
      b.mode = Mode.Homing;
      b.speed = c.speed;
      b.turnRate = c.turnRate;
      b.retargetTimer = 0;
      b.lifetime = c.lifetime;
      b.spin = c.spin;
    }
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {}
}
