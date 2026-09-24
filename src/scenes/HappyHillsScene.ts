import Phaser from 'phaser';
import { Debug, Depth, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { MECHA_TURKEY } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import { HEROES, isHeroId, type HeroId, type HeroStats } from '../data/heroes';
import { HAPPY_HILLS, type WaveDef } from '../data/waves';
import { Enemy, type EnemyContext } from '../entities/Enemy';
import { Hero, type HeroState } from '../entities/Hero';
import { MechaTurkey, type Rig } from '../entities/MechaTurkey';
import type { Target } from '../entities/Target';
import { Effects } from '../systems/Effects';
import { EnemyShots } from '../systems/EnemyShots';
import { HeroProjectiles } from '../systems/HeroProjectiles';
import { Hud } from '../systems/Hud';
import { InputController } from '../systems/InputController';
import { Pool } from '../systems/Pool';
import type { ResultData } from './ResultScene';
import { VoiceBank } from '../systems/VoiceBank';
import { createWeapon, type Weapon } from '../systems/weapons/Weapon';

interface Spawn {
  at: number;
  def: (typeof ENEMIES)[keyof typeof ENEMIES];
  y: number;
}

type LevelPhase = 'waves' | 'warning' | 'boss' | 'clear' | 'over';

/** Parallax scroll speeds in px/s. */
const SCROLL = { sky: 8, far: 36, near: 110 };
const ENEMY_SPAWN_MARGIN = 60;
/** Bouncing sun: centred, lags behind while airborne and kicks ahead on each bounce (px, s). */
const SUN = {
  x: GAME_WIDTH / 2,
  y: 100,
  bounceSpeed: 2.2,
  bounceHeight: 34,
  lagBehind: 45,
  kickAhead: 22,
  /** Fraction of each bounce spent springing forward after contact. */
  kickTime: 0.22,
  wander: 18,
};
const RESULT_DELAY = 2500;

/** Level 2 of the design, used as the Milestone 1 vertical slice. */
export class HappyHillsScene extends Phaser.Scene {
  private controls!: InputController;
  private hero!: Hero;
  private stats!: HeroStats;
  private projectiles!: HeroProjectiles;
  private weapon!: Weapon;
  private enemyShots!: EnemyShots;
  private enemies!: Pool<Enemy>;
  private boss!: MechaTurkey;
  private effects!: Effects;
  private hud!: Hud;
  private voices!: VoiceBank;
  private villainVoices!: VoiceBank;

  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private sun!: Phaser.GameObjects.Image;
  private dome!: Phaser.GameObjects.Image;
  private debugGfx: Phaser.GameObjects.Graphics | null = null;

  private readonly enemyCtx: EnemyContext = { heroX: 0, heroY: 0, shots: null as unknown as EnemyShots };
  private spawns: Spawn[] = [];
  private spawnIndex = 0;
  private levelTime = 0;
  private phase: LevelPhase = 'waves';
  private phaseTime = 0;
  private score = 0;
  private scoreDirty = false;
  private lastHeroState: HeroState = 'entering';

  constructor() {
    super('HappyHills');
  }

  init(data: { hero?: HeroId }): void {
    this.stats = HEROES[isHeroId(data?.hero) ? data.hero : 'nuhuh'];
  }

  create(): void {
    const stats = this.stats;
    this.levelTime = 0;
    this.phase = 'waves';
    this.phaseTime = 0;
    this.score = 0;
    this.spawnIndex = 0;
    this.spawns = buildSpawns(HAPPY_HILLS.waves);

    this.createBackground();

    this.effects = new Effects(this);
    this.enemyShots = new EnemyShots(this, this.effects);
    this.enemyCtx.shots = this.enemyShots;
    this.enemies = new Pool(40, () => new Enemy(this, this.onEnemyKilled));

    const rig = this.cache.json.get('turkey-rig') as Rig;
    this.boss = new MechaTurkey(this, MECHA_TURKEY, rig, this.enemyShots, this.effects, {
      onDamaged: (f) => {
        this.hud.setBossHp(f);
        this.addScore(MECHA_TURKEY.scorePerHit);
      },
      onPhaseChange: (i) => {
        this.villainVoices.play(i === -1 ? MECHA_TURKEY.voices.defeat : MECHA_TURKEY.voices.taunt);
        this.enemyShots.clear();
        this.cameras.main.shake(300, 0.01);
        this.cameras.main.flash(150, 255, 255, 255);
      },
      onStomp: () => this.cameras.main.shake(120, 0.005),
      onDefeated: () => this.onBossDefeated(),
    });

    const targets: Target[] = [...this.enemies.items, ...this.boss.hurtboxes];
    this.projectiles = new HeroProjectiles(this, targets, (x, y) => this.effects.sparks(x, y, 2, 0xffe680, 90));
    this.weapon = createWeapon(stats.weapon, { scene: this, projectiles: this.projectiles, enemyShots: this.enemyShots, effects: this.effects });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.weapon.destroy());

    this.hero = new Hero(this, stats);
    this.lastHeroState = this.hero.state;
    this.controls = new InputController(this);
    this.voices = new VoiceBank(this);
    this.villainVoices = new VoiceBank(this, 1);

    this.hud = new Hud(this, stats.texture, stats.lives, stats.hitsPerLife);
    this.hud.setLives(this.hero.lives, this.hero.hitsLeft);
    this.hud.setScore(0);

    if (Debug.showHitboxes) this.debugGfx = this.add.graphics().setDepth(Depth.Hud - 1);

    this.sound.stopAll();
    if (this.cache.audio.exists('music-happy-hills')) {
      this.sound.play('music-happy-hills', { loop: true, volume: 0.55 });
    }

    if (Debug.skipToBoss) {
      this.spawnIndex = this.spawns.length;
      this.levelTime = this.spawns.length ? this.spawns[this.spawns.length - 1].at : 0;
      this.dome.setVisible(false);
    }
  }

  private createBackground(): void {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.sky = this.add.tileSprite(0, 0, W, H, 'hh-sky').setOrigin(0).setDepth(Depth.Background);
    this.sun = this.add.image(SUN.x, SUN.y, 'sun').setScale(0.5).setDepth(Depth.Background);
    this.far = this.add.tileSprite(0, 0, W, H, 'hh-far').setOrigin(0).setDepth(Depth.Background);
    // The Buddies' home dome, seen once at the start of the level on the far hills.
    this.dome = this.add.image(720, 432, 'hh-dome').setOrigin(0.5, 1).setScale(0.5).setDepth(Depth.Background);
    this.near = this.add.tileSprite(0, 0, W, H, 'hh-near').setOrigin(0).setDepth(Depth.Background);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.levelTime += dt;
    this.phaseTime += dt;

    this.updateBackground(dt);
    this.controls.update();
    this.voices.update(dt);
    this.villainVoices.update(dt);

    this.updateLevelFlow();

    const hero = this.hero;
    hero.update(dt, this.controls);
    if (this.lastHeroState === 'dead' && hero.state === 'entering') {
      this.voices.play(this.stats.voices.recover);
      this.hud.setLives(hero.lives, hero.hitsLeft);
    }
    this.lastHeroState = hero.state;

    this.weapon.update(dt, hero.firing && this.phase !== 'clear', hero.x, hero.y);
    this.projectiles.update(dt);

    const ctx = this.enemyCtx;
    ctx.heroX = hero.x;
    ctx.heroY = hero.y;
    const enemies = this.enemies.items;
    for (let i = 0; i < enemies.length; i++) if (enemies[i].active) enemies[i].update(dt, ctx);

    this.boss.update(dt, hero.x, hero.y);
    this.enemyShots.update(dt);
    this.checkHeroHits();
    this.effects.update(dt);

    if (this.scoreDirty) {
      this.scoreDirty = false;
      this.hud.setScore(this.score);
    }
    this.hud.update(dt);
    if (this.debugGfx) this.drawDebug();
  }

  private updateBackground(dt: number): void {
    this.sky.tilePositionX += SCROLL.sky * dt;
    this.far.tilePositionX += SCROLL.far * dt;
    this.near.tilePositionX += SCROLL.near * dt;
    if (this.dome.visible) {
      this.dome.x -= SCROLL.far * dt;
      if (this.dome.x < -this.dome.displayWidth) this.dome.setVisible(false);
    }
    // The sun bounces along with us: it drifts behind while in the air, then each bounce
    // kicks it slightly ahead, with a squish on contact.
    const t = this.levelTime;
    const phase = (t * SUN.bounceSpeed) % Math.PI;
    const bounce = Math.sin(phase);
    const p = phase / Math.PI;
    const lag =
      p < SUN.kickTime
        ? -SUN.lagBehind + (SUN.lagBehind + SUN.kickAhead) * Math.sin((p / SUN.kickTime) * Math.PI * 0.5)
        : SUN.kickAhead - (SUN.lagBehind + SUN.kickAhead) * Math.pow((p - SUN.kickTime) / (1 - SUN.kickTime), 1.6);
    this.sun.x = SUN.x + lag + Math.sin(t * 0.35) * SUN.wander;
    this.sun.y = SUN.y + 18 - bounce * SUN.bounceHeight;
    const squash = bounce < 0.15 ? 1 - (0.15 - bounce) * 0.8 : 1;
    this.sun.setScale(0.5 / squash, 0.5 * squash);
    this.sun.rotation = Math.sin(t * 1.1) * 0.08;
  }

  private updateLevelFlow(): void {
    switch (this.phase) {
      case 'waves': {
        const spawns = this.spawns;
        while (this.spawnIndex < spawns.length && spawns[this.spawnIndex].at <= this.levelTime) {
          const s = spawns[this.spawnIndex++];
          const e = this.enemies.obtain();
          if (e) e.spawn(s.def, GAME_WIDTH + ENEMY_SPAWN_MARGIN, s.y);
        }
        const lastAt = spawns.length ? spawns[spawns.length - 1].at : 0;
        if (this.spawnIndex >= spawns.length && this.levelTime >= lastAt + HAPPY_HILLS.bossDelay) {
          this.setPhase('warning');
          this.hud.showBanner('WARNING!\nMECHA-TURKEY APPROACHING', HAPPY_HILLS.warningTime, '#ff5a5a');
        }
        break;
      }
      case 'warning':
        if (this.phaseTime >= HAPPY_HILLS.warningTime) {
          this.setPhase('boss');
          this.boss.enter();
          this.villainVoices.play(MECHA_TURKEY.voices.taunt);
          this.hud.showBossBar(true);
          this.hud.setBossHp(1);
        }
        break;
      default:
        break;
    }
  }

  private setPhase(p: LevelPhase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private checkHeroHits(): void {
    const hero = this.hero;
    if (!hero.vulnerable) return;
    const r = hero.stats.hitboxRadius;
    let hit = this.enemyShots.hitsCircle(hero.x, hero.y, r);

    if (!hit) {
      const enemies = this.enemies.items;
      for (let i = 0; i < enemies.length && !hit; i++) {
        const e = enemies[i];
        if (!e.active) continue;
        const dx = e.x - hero.x;
        const dy = e.y - hero.y;
        const rr = e.radius + r;
        hit = dx * dx + dy * dy < rr * rr;
      }
    }

    if (!hit && this.boss.solid) {
      const boxes = this.boss.hurtboxes;
      for (let i = 0; i < boxes.length && !hit; i++) {
        const dx = boxes[i].x - hero.x;
        const dy = boxes[i].y - hero.y;
        const rr = boxes[i].radius + r;
        hit = dx * dx + dy * dy < rr * rr;
      }
    }

    if (hit) this.onHeroHit();
  }

  private onHeroHit(): void {
    const hero = this.hero;
    const result = hero.hit();
    if (result === 'ignored') return;

    this.voices.play(this.stats.voices.damage);
    if (result === 'shield') {
      this.effects.pop(hero.x, hero.y, 1.6, 0x7fe0ff);
      this.cameras.main.shake(150, 0.006);
    } else {
      this.effects.explode(hero.x, hero.y, 1.4);
      this.enemyShots.clear();
      this.cameras.main.shake(300, 0.012);
      if (result === 'gameover') {
        this.setPhase('over');
        this.hud.showBossBar(false);
        this.time.delayedCall(RESULT_DELAY, () => this.finish(false));
      }
    }
    this.hud.setLives(hero.lives, hero.hitsLeft);
  }

  private readonly onEnemyKilled = (e: Enemy): void => {
    this.effects.explode(e.x, e.y, e.radius / 30);
    if (e.def) this.addScore(e.def.score);
  };

  private onBossDefeated(): void {
    if (this.phase === 'over') return;
    this.setPhase('clear');
    this.addScore(MECHA_TURKEY.score);
    this.hud.showBossBar(false);
    this.enemyShots.clear();
    this.hud.showBanner('STAGE CLEAR!', 0);
    this.time.delayedCall(RESULT_DELAY, () => this.finish(true));
  }

  private finish(won: boolean): void {
    this.sound.stopAll();
    const data: ResultData = { won, score: this.score, hero: this.stats.id };
    this.scene.start('Result', data);
  }

  private addScore(n: number): void {
    this.score += n;
    this.scoreDirty = true;
  }

  private drawDebug(): void {
    const g = this.debugGfx!;
    g.clear();
    g.lineStyle(1, 0x00ff00, 1);
    const enemies = this.enemies.items;
    for (let i = 0; i < enemies.length; i++) if (enemies[i].active) g.strokeCircle(enemies[i].x, enemies[i].y, enemies[i].radius);
    if (this.boss.solid) {
      for (const h of this.boss.hurtboxes) g.strokeCircle(h.x, h.y, h.radius);
    }
    g.lineStyle(1, 0xff0000, 1);
    g.strokeCircle(this.hero.x, this.hero.y, this.hero.stats.hitboxRadius);
  }
}

/** Expands wave groups into a flat, time-sorted spawn list (done once per level start). */
function buildSpawns(waves: readonly WaveDef[]): Spawn[] {
  const out: Spawn[] = [];
  for (const w of waves) {
    const def = ENEMIES[w.enemy];
    const margin = def.displayHeight / 2 + 10;
    for (let i = 0; i < w.count; i++) {
      const y = w.y === 'random' ? Phaser.Math.FloatBetween(margin, GAME_HEIGHT - margin) : w.y + (w.yStep ?? 0) * i;
      out.push({ at: w.at + w.spacing * i, def, y: Phaser.Math.Clamp(y, margin, GAME_HEIGHT - margin) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
