import type Phaser from 'phaser';
import type { WeaponConfig } from '../../data/heroes';
import type { Effects } from '../Effects';
import type { EnemyShots } from '../EnemyShots';
import type { HeroProjectiles } from '../HeroProjectiles';
import { BouncingBalls } from './BouncingBalls';
import { HomingStars } from './HomingStars';
import { OrbitFlowers } from './OrbitFlowers';
import { RainbowBeam } from './RainbowBeam';
import { SpreadShot } from './SpreadShot';

/** A Buddy's attack. Called every frame with the shooter's position. */
export interface Weapon {
  /** Fire-rate multiplier (team power-up boosts raise it). */
  rate: number;
  update(dt: number, firing: boolean, x: number, y: number): void;
  /** Drop anything in flight or orbiting that belongs to this weapon. */
  reset(): void;
  destroy(): void;
}

export interface WeaponContext {
  scene: Phaser.Scene;
  projectiles: HeroProjectiles;
  enemyShots: EnemyShots;
  effects: Effects;
}

/** Scales a weapon: full strength for the hero, weaker for companions. */
export interface Power {
  damage: number;
  interval: number;
  size: number;
}

export const FULL_POWER: Power = { damage: 1, interval: 1, size: 1 };

export function createWeapon(cfg: WeaponConfig, ctx: WeaponContext, power: Power = FULL_POWER): Weapon {
  switch (cfg.kind) {
    case 'homing':
      return new HomingStars(cfg, ctx, power);
    case 'spread':
      return new SpreadShot(cfg, ctx, power);
    case 'bounce':
      return new BouncingBalls(cfg, ctx, power);
    case 'orbit':
      return new OrbitFlowers(cfg, ctx, power);
    case 'beam':
      return new RainbowBeam(cfg, ctx, power);
  }
}
