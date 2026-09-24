import type { BounceWeapon } from '../../data/heroes';
import { Mode } from '../HeroProjectiles';
import type { Power, Weapon, WeaponContext } from './Weapon';

const DEG = Math.PI / 180;

/** Oopsie: rubber balls fired alternately up and down that bounce off the top and bottom of the screen. */
export class BouncingBalls implements Weapon {
  rate = 1;
  private timer = 0;
  private shot = 0;

  constructor(
    private readonly cfg: BounceWeapon,
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
      this.fire(x, y);
      this.timer += this.cfg.interval * this.power.interval;
    }
  }

  private fire(x: number, y: number): void {
    const c = this.cfg;
    const p = this.power;
    const dir = this.shot % 2 === 0 ? -1 : 1;
    const a = dir * c.angleDeg * DEG;
    const tex = c.textures[this.shot % c.textures.length];
    this.shot++;
    const b = this.ctx.projectiles.spawn(tex, x + 10, y, Math.cos(a) * c.speed, Math.sin(a) * c.speed, c.radius * p.size, c.damage * p.damage, p.size);
    if (!b) return;
    b.mode = Mode.Bounce;
    b.bounces = c.bounces;
    b.lifetime = c.lifetime;
    b.spin = dir * 8;
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {}
}
