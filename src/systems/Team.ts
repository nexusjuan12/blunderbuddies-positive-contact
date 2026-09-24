import type Phaser from 'phaser';
import type { HeroId } from '../data/heroes';
import { TEAM } from '../data/team';
import { Companion } from '../entities/Companion';
import type { WeaponContext } from './weapons/Weapon';

/** Frames of hero path history kept (enough for the last companion plus slack). */
const HIST = 64;

/**
 * The hero's companions. While moving they snake along the hero's recent path (Gradius options);
 * after holding still they glide into a V wedge, and peel back into the trail on the next move.
 */
export class Team {
  readonly members: Companion[] = [];
  private readonly tumbling: Companion[] = [];
  private readonly histX = new Float32Array(HIST);
  private readonly histY = new Float32Array(HIST);
  private head = 0;
  private lastX = 0;
  private lastY = 0;
  private still = 0;
  private blend = 0;
  /** Fire-rate multiplier from pickups collected with a full team. */
  rate = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: WeaponContext,
  ) {}

  get size(): number {
    return this.members.length;
  }

  get full(): boolean {
    return this.members.length >= TEAM.maxCompanions;
  }

  /** Fill the path history with one position (start, respawn). */
  resetPath(x: number, y: number): void {
    this.histX.fill(x);
    this.histY.fill(y);
    this.lastX = x;
    this.lastY = y;
  }

  add(id: HeroId, x: number, y: number): Companion {
    const c = new Companion(this.scene, id, this.ctx, x, y);
    c.weapon.rate = this.rate;
    this.members.push(c);
    return c;
  }

  /** The last companion in line takes the hit and tumbles away. Returns false if there was none. */
  knockOff(): boolean {
    const c = this.members.pop();
    if (!c) return false;
    c.knockOff();
    this.tumbling.push(c);
    return true;
  }

  /** Full team: each extra pickup raises everyone's fire rate (capped). Returns the new rate. */
  boost(): number {
    this.rate = Math.min(TEAM.maxRate, this.rate + TEAM.rateBoost);
    for (let i = 0; i < this.members.length; i++) this.members[i].weapon.rate = this.rate;
    return this.rate;
  }

  update(dt: number, heroX: number, heroY: number, firing: boolean): void {
    // Record the hero's path, one sample per frame.
    this.head = (this.head + 1) % HIST;
    this.histX[this.head] = heroX;
    this.histY[this.head] = heroY;

    const dx = heroX - this.lastX;
    const dy = heroY - this.lastY;
    this.lastX = heroX;
    this.lastY = heroY;
    this.still = dx * dx + dy * dy < 0.25 ? this.still + dt : 0;
    const target = this.still >= TEAM.formUpDelay ? 1 : 0;
    const step = dt * TEAM.formUpSpeed;
    this.blend = target > this.blend ? Math.min(1, this.blend + step) : Math.max(0, this.blend - step);
    const e = this.blend * this.blend * (3 - 2 * this.blend);

    for (let i = 0; i < this.members.length; i++) {
      const idx = (this.head - (i + 1) * TEAM.trailFrames + HIST * 4) % HIST;
      const w = TEAM.wedge[i];
      const x = this.histX[idx] * (1 - e) + (heroX + w[0]) * e;
      const y = this.histY[idx] * (1 - e) + (heroY + w[1]) * e;
      this.members[i].update(dt, x, y, firing);
    }

    for (let i = this.tumbling.length - 1; i >= 0; i--) {
      const c = this.tumbling[i];
      c.update(dt, 0, 0, false);
      if (c.gone) this.tumbling.splice(i, 1);
    }
  }

  destroy(): void {
    for (const c of this.members) c.destroy();
    for (const c of this.tumbling) c.destroy();
    this.members.length = 0;
    this.tumbling.length = 0;
  }
}
