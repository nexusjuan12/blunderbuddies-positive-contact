import Phaser from 'phaser';
import { Depth } from '../config';
import { TEAM } from '../data/team';

/** Dropped by carrier enemies: collect it to add a random Buddy to the team. */
export class TeamPickup extends Phaser.GameObjects.Image {
  private age = 0;
  private baseY = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'team-pickup');
    scene.add.existing(this);
    this.setDepth(Depth.Enemies + 1).setActive(false).setVisible(false);
  }

  spawn(x: number, y: number): void {
    this.age = 0;
    this.baseY = Phaser.Math.Clamp(y, 40, 500);
    this.setPosition(x, this.baseY).setActive(true).setVisible(true);
  }

  override update(dt: number): void {
    const p = TEAM.pickup;
    this.age += dt;
    this.x -= p.drift * dt;
    this.y = this.baseY + Math.sin(this.age * p.bobSpeed) * p.bobAmplitude;
    this.rotation = Math.sin(this.age * 2) * 0.2;
    this.setScale(1 + 0.12 * Math.sin(this.age * 8));
    if (this.x < -40) this.kill();
  }

  kill(): void {
    this.setActive(false).setVisible(false);
  }
}
