import Phaser from 'phaser';
import { Depth, GAME_WIDTH } from '../../config';
import type { BeamWeapon } from '../../data/heroes';
import type { Power, Weapon, WeaponContext } from './Weapon';

/** Damage is applied in fixed ticks so it doesn't depend on frame rate. */
const TICK = 1 / 30;
const SPARK_EVERY = 0.07;

/** Tee-Hee: a continuous rainbow beam that pierces everything to the right edge. */
export class RainbowBeam implements Weapon {
  rate = 1;
  private readonly beam: Phaser.GameObjects.TileSprite;
  private readonly muzzle: Phaser.GameObjects.Image;
  private tickTimer = 0;
  private sparkTimer = 0;
  private time = 0;

  constructor(
    private readonly cfg: BeamWeapon,
    private readonly ctx: WeaponContext,
    private readonly power: Power,
  ) {
    const scene = ctx.scene;
    this.beam = scene.add.tileSprite(0, 0, GAME_WIDTH, 32, 'beam').setOrigin(0, 0.5).setDepth(Depth.HeroBullets).setVisible(false);
    this.muzzle = scene.add.image(0, 0, 'spark').setDepth(Depth.HeroBullets).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  }

  update(dt: number, firing: boolean, x: number, y: number): void {
    this.beam.setVisible(firing);
    this.muzzle.setVisible(firing);
    if (!firing) return;

    this.time += dt;
    const width = this.cfg.width * this.power.size;
    const pulse = 1 + 0.18 * Math.sin(this.time * 30);
    this.beam.setPosition(x + 14, y);
    this.beam.setScale(1, (width * pulse) / 32);
    this.beam.tilePositionX -= 900 * dt;
    this.muzzle.setPosition(x + 14, y).setScale((width / 8) * pulse);

    this.tickTimer += dt;
    this.sparkTimer -= dt;
    while (this.tickTimer >= TICK) {
      this.tickTimer -= TICK;
      this.hitTargets(x + 14, y, width / 2, this.cfg.dps * this.power.damage * this.rate * TICK);
    }
  }

  private hitTargets(x: number, y: number, half: number, damage: number): void {
    const targets = this.ctx.projectiles.targets;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isTargetable() || t.x + t.radius < x) continue;
      if (Math.abs(t.y - y) > half + t.radius) continue;
      t.takeDamage(damage);
      if (this.sparkTimer <= 0) {
        this.ctx.effects.sparks(Math.max(x, t.x - t.radius * 0.7), y, 2, 0xffffff, 120);
      }
    }
    if (this.sparkTimer <= 0) this.sparkTimer = SPARK_EVERY;
  }

  reset(): void {
    this.beam.setVisible(false);
    this.muzzle.setVisible(false);
    this.tickTimer = 0;
  }

  destroy(): void {
    this.beam.destroy();
    this.muzzle.destroy();
  }
}
