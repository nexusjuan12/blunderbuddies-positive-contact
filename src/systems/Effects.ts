import Phaser from 'phaser';
import { Depth } from '../config';
import { Pool } from './Pool';

class Particle extends Phaser.GameObjects.Image {
  vx = 0;
  vy = 0;
  age = 0;
  life = 1;
  startScale = 1;
  endScale = 1;
  drag = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, 'spark');
    scene.add.existing(this);
    this.setDepth(Depth.Fx);
    this.setActive(false).setVisible(false);
  }
}

/** Pooled short-lived visual effects: sparks, pops and explosion bursts. */
export class Effects {
  private readonly pool: Pool<Particle>;

  constructor(scene: Phaser.Scene, size = 220) {
    this.pool = new Pool(size, () => new Particle(scene));
  }

  private emit(
    texture: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    startScale: number,
    endScale: number,
    tint: number,
    drag: number,
  ): void {
    const p = this.pool.obtain();
    if (!p) return;
    p.setTexture(texture);
    p.setPosition(x, y);
    p.vx = vx;
    p.vy = vy;
    p.age = 0;
    p.life = life;
    p.startScale = startScale;
    p.endScale = endScale;
    p.drag = drag;
    p.setScale(startScale).setAlpha(1).setTint(tint);
    p.setActive(true).setVisible(true);
  }

  /** Small radial spray of sparks. */
  sparks(x: number, y: number, count: number, tint: number, speed = 160): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.emit('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, 0.35 + Math.random() * 0.2, 0.9, 0.1, tint, 3);
    }
  }

  /** Expanding ring. */
  pop(x: number, y: number, size: number, tint: number, life = 0.35): void {
    this.emit('ring', x, y, 0, 0, life, size * 0.2, size, tint, 0);
  }

  /** Big explosion: ring plus sparks. */
  explode(x: number, y: number, size: number): void {
    this.pop(x, y, size, 0xffffff, 0.4);
    this.pop(x, y, size * 0.6, 0xffd23f, 0.3);
    this.sparks(x, y, 10, 0xffc04d, 220 * size);
  }

  update(dt: number): void {
    const items = this.pool.items;
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.setActive(false).setVisible(false);
        continue;
      }
      const t = p.age / p.life;
      const damp = 1 - Math.min(1, p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.setScale(p.startScale + (p.endScale - p.startScale) * t);
      p.setAlpha(1 - t * t);
    }
  }
}
