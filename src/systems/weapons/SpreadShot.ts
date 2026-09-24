import type { SpreadWeapon } from '../../data/heroes';
import type { Power, Weapon, WeaponContext } from './Weapon';

const DEG = Math.PI / 180;

/** Uh-Huh: a wide fan of hearts. Clears crowds, weaker per hit. */
export class SpreadShot implements Weapon {
  rate = 1;
  private timer = 0;

  constructor(
    private readonly cfg: SpreadWeapon,
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
    // Companions fire a narrower, smaller fan.
    const count = p.size < 1 ? Math.max(3, c.count - 2) : c.count;
    const spread = c.spreadDeg * DEG * (p.size < 1 ? 0.7 : 1);
    for (let i = 0; i < count; i++) {
      const a = (i / (count - 1) - 0.5) * spread;
      const b = this.ctx.projectiles.spawn(c.texture, x + 10, y, Math.cos(a) * c.speed, Math.sin(a) * c.speed, c.radius * p.size, c.damage * p.damage, p.size);
      if (!b) return;
      b.lifetime = c.lifetime;
      b.spin = c.spin;
      b.rotation = a;
    }
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {}
}
