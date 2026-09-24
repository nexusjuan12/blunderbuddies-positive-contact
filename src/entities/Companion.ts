import Phaser from 'phaser';
import { Depth, GAME_HEIGHT } from '../config';
import { COMPANION_POWER, HEROES, type HeroId } from '../data/heroes';
import { TEAM } from '../data/team';
import { createWeapon, type Weapon, type WeaponContext } from '../systems/weapons/Weapon';

/** A mini Buddy flying with the hero and firing a weaker copy of their own attack. */
export class Companion {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly weapon: Weapon;
  x = 0;
  y = 0;
  /** Knocked off: tumbling away, no longer part of the team. */
  tumbling = false;
  gone = false;
  private vx = 0;
  private vy = 0;
  private bob = Math.random() * Math.PI * 2;
  private readonly scale: number;

  constructor(
    scene: Phaser.Scene,
    readonly id: HeroId,
    ctx: WeaponContext,
    x: number,
    y: number,
  ) {
    const stats = HEROES[id];
    const meta = scene.cache.json.get(stats.texture) as { originX: number; originY: number; frames: number };
    this.scale = stats.displayScale * TEAM.scale;
    this.sprite = scene.add
      .sprite(x, y, stats.texture, 0)
      .setOrigin(meta.originX, meta.originY)
      .setScale(this.scale)
      .setDepth(Depth.Hero - 1);
    // Start on a random frame so the team's capes and bobs don't move in lockstep.
    this.sprite.play({ key: stats.flyAnim, startFrame: Math.floor(Math.random() * meta.frames) });
    this.weapon = createWeapon(stats.weapon, ctx, COMPANION_POWER);
    this.x = x;
    this.y = y;
  }

  /** Follow a target position (set by the Team) and fire. */
  update(dt: number, tx: number, ty: number, firing: boolean): void {
    if (this.tumbling) return this.tumble(dt);
    const py = this.y;
    this.x = tx;
    this.y = ty;
    this.bob += dt * 4;
    const vy = dt > 0 ? (ty - py) / dt : 0;
    this.sprite.setPosition(this.x, this.y + Math.sin(this.bob) * 2);
    this.sprite.rotation = Phaser.Math.Clamp(vy / 300, -1, 1) * 0.3;
    this.weapon.update(dt, firing, this.x, this.y);
  }

  /** Knocked off by a hit: spin away and fall off screen. */
  knockOff(): void {
    this.tumbling = true;
    this.weapon.reset();
    this.vx = -120 - Math.random() * 80;
    this.vy = -260;
  }

  private tumble(dt: number): void {
    this.vy += 900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Fake horizontal spin plus a tumble.
    this.bob += dt * 22;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.rotation += dt * 9;
    this.sprite.setScale(this.scale * Math.cos(this.bob), this.scale);
    if (this.y > GAME_HEIGHT + 120) this.destroy();
  }

  destroy(): void {
    if (this.gone) return;
    this.gone = true;
    this.weapon.destroy();
    this.sprite.destroy();
  }
}
