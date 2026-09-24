import Phaser from 'phaser';
import type { Target } from './Target';

/** A pooled projectile. Movement is handled by the owning shot system. */
export class Bullet extends Phaser.GameObjects.Image {
  vx = 0;
  vy = 0;
  radius = 4;
  damage = 1;
  age = 0;
  lifetime = Infinity;
  spin = 0;
  gravity = 0;
  /** Homing state (hero stars). */
  target: Target | null = null;
  speed = 0;
  turnRate = 0;
  retargetTimer = 0;
  /** Burst-on-expiry state (drumstick missiles). */
  burstCount = 0;
  burstSpeed = 0;

  constructor(scene: Phaser.Scene, texture: string, depth: number) {
    super(scene, -100, -100, texture);
    scene.add.existing(this);
    this.setDepth(depth);
    this.setActive(false).setVisible(false);
  }

  launch(x: number, y: number, vx: number, vy: number, radius: number): this {
    this.setPosition(x, y);
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.age = 0;
    this.lifetime = Infinity;
    this.spin = 0;
    this.gravity = 0;
    this.target = null;
    this.burstCount = 0;
    this.rotation = 0;
    this.setActive(true).setVisible(true);
    return this;
  }

  kill(): void {
    this.target = null;
    this.setActive(false).setVisible(false);
  }
}
