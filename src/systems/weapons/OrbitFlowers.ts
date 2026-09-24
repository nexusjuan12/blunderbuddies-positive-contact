import type { Bullet } from '../../entities/Bullet';
import type { OrbitWeapon } from '../../data/heroes';
import { Mode } from '../HeroProjectiles';
import type { Power, Weapon, WeaponContext } from './Weapon';

/**
 * Whoopsie-Doodle: petals grow one by one and orbit the shooter, soaking up enemy bullets,
 * then bloom outward together as a shockwave. A light seed shot fires forward meanwhile.
 */
export class OrbitFlowers implements Weapon {
  rate = 1;
  private readonly petals: (Bullet | null)[];
  private angle = 0;
  private growTimer = 0;
  private bloomTimer: number;
  private seedTimer = 0;

  constructor(
    private readonly cfg: OrbitWeapon,
    private readonly ctx: WeaponContext,
    private readonly power: Power,
  ) {
    const max = power.size < 1 ? Math.ceil(cfg.maxPetals / 2) : cfg.maxPetals;
    this.petals = new Array<Bullet | null>(max).fill(null);
    this.bloomTimer = cfg.bloomInterval * power.interval;
  }

  update(dt: number, firing: boolean, x: number, y: number): void {
    if (!firing) {
      this.reset();
      return;
    }
    const c = this.cfg;
    const p = this.power;
    const petals = this.petals;
    const n = petals.length;
    this.angle += c.orbitSpeed * dt;

    this.growTimer -= dt * this.rate;
    if (this.growTimer <= 0) {
      this.growTimer = c.growInterval * p.interval;
      for (let i = 0; i < n; i++) {
        if (petals[i] !== null) continue;
        const b = this.ctx.projectiles.spawn(c.texture, x, y, 0, 0, c.radius * p.size, c.damage * p.damage, 0.8 * p.size);
        if (b) {
          b.mode = Mode.Orbit;
          b.spin = 3;
          petals[i] = b;
        }
        break;
      }
    }

    const r = c.orbitRadius * (0.6 + 0.4 * p.size);
    for (let i = 0; i < n; i++) {
      const b = petals[i];
      if (b === null) continue;
      if (!b.active || b.mode !== Mode.Orbit) {
        petals[i] = null;
        continue;
      }
      const a = this.angle + (i * Math.PI * 2) / n;
      b.setPosition(x + Math.cos(a) * r, y + Math.sin(a) * r);
      // A petal soaks up one enemy bullet and is used up.
      if (this.ctx.enemyShots.hitsCircle(b.x, b.y, b.radius)) {
        this.ctx.effects.pop(b.x, b.y, 0.6, 0xff9ad8, 0.25);
        b.kill();
        petals[i] = null;
      }
    }

    this.bloomTimer -= dt * this.rate;
    if (this.bloomTimer <= 0) {
      this.bloomTimer = c.bloomInterval * p.interval;
      this.bloom(x, y);
    }

    this.seedTimer -= dt * this.rate;
    if (this.seedTimer <= 0) {
      this.seedTimer = c.seed.interval * p.interval;
      const s = c.seed;
      const b = this.ctx.projectiles.spawn(s.texture, x + 10, y, s.speed, 0, s.radius * p.size, s.damage * p.damage, 0.5 * p.size);
      if (b) {
        b.lifetime = 1.6;
        b.spin = 6;
      }
    }
  }

  private bloom(x: number, y: number): void {
    const petals = this.petals;
    let any = false;
    for (let i = 0; i < petals.length; i++) {
      const b = petals[i];
      if (b === null || !b.active) continue;
      const a = Math.atan2(b.y - y, b.x - x);
      b.mode = Mode.Straight;
      b.vx = Math.cos(a) * this.cfg.bloomSpeed;
      b.vy = Math.sin(a) * this.cfg.bloomSpeed;
      b.lifetime = b.age + 1.4;
      b.setScale(b.baseScale * 1.25);
      petals[i] = null;
      any = true;
    }
    if (any) this.ctx.effects.pop(x, y, 2 * this.power.size, 0xffb3e6, 0.35);
  }

  reset(): void {
    const petals = this.petals;
    for (let i = 0; i < petals.length; i++) {
      const b = petals[i];
      if (b !== null && b.active && b.mode === Mode.Orbit) b.kill();
      petals[i] = null;
    }
    this.growTimer = 0;
    this.seedTimer = 0;
  }

  destroy(): void {
    this.reset();
  }
}
