import type { HomingWeapon } from '../../data/heroes';
import { Mode } from '../HeroProjectiles';
import type { Power, Weapon, WeaponContext } from './Weapon';

const DEG = Math.PI / 180;

/** Nuh-Uh: volleys of colourful stars that curve toward targets ahead, sized in a wave, with after-trails. */
export class HomingStars implements Weapon {
  rate = 1;
  private timer = 0;
  private shot = 0;
  private wave = 0;

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
    this.wave += c.waveStep;
    const lockCos = Math.cos((c.lockConeDeg * DEG) / 2);
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? 0 : i / (c.count - 1) - 0.5;
      const a = t * spread;
      // Neighbouring stars sit at opposite points of the size wave.
      const w = 0.5 + 0.5 * Math.sin(this.wave + i * Math.PI);
      const size = (c.sizeWave[0] + (c.sizeWave[1] - c.sizeWave[0]) * w) * p.size;
      const colour = this.shot++ % c.textures.length;
      const b = this.ctx.projectiles.spawn(c.textures[colour], x + 10, y, Math.cos(a) * c.speed, Math.sin(a) * c.speed, c.radius * size, c.damage * p.damage, size);
      if (!b) return;
      b.mode = Mode.Homing;
      b.speed = c.speed;
      b.turnRate = c.turnRate;
      b.retargetTimer = 0;
      b.lockCos = lockCos;
      b.lockRangeSq = c.lockRange * c.lockRange;
      b.lifetime = c.lifetime;
      b.spin = c.spin;
      b.trailTint = c.trailTints[colour];
    }
  }

  reset(): void {
    this.timer = 0;
  }

  destroy(): void {}
}
