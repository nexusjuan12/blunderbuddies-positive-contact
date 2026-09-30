import type { BulletStyleId } from './bullets';

/**
 * Mr. Uh-Uh-No's mimics: big evil-faced heads copied from the heroes.
 * Units: px, px/s, seconds.
 */
interface EnemyBase {
  /** Sprite sheet key; its JSON (same key) holds frame size, fps and hitbox. */
  texture: string;
  /** Looping animation key (created in BootScene). */
  anim: string;
  /**
   * Rough on-screen height in px. Mimic heads are sized from `radius` instead (their sheet records
   * the face radius), so for them this is only used as the off-screen despawn margin.
   */
  displayHeight: number;
  hp: number;
  /** Collision circle radius in px (hurts the hero on contact, takes hits from shots). */
  radius: number;
  score: number;
}

export interface SineEnemyDef extends EnemyBase {
  behavior: 'sine';
  speed: number;
  amplitude: number;
  /** Radians per second of the sine wave. */
  frequency: number;
}

export interface ChargerEnemyDef extends EnemyBase {
  behavior: 'charger';
  /** Speed while flying in from the right. */
  enterSpeed: number;
  /** How far from the right edge it stops before charging. */
  stopDistance: number;
  /** Telegraph time before the dash. */
  windup: number;
  dashSpeed: number;
  /** A fan of shots fired at the hero as the dash begins. */
  launchShot: { style: BulletStyleId; count: number; spreadDeg: number; speed: number };
}

export interface TurretEnemyDef extends EnemyBase {
  behavior: 'turret';
  driftSpeed: number;
  bobAmplitude: number;
  fireInterval: number;
  /** Shots per burst, aimed at the hero when the burst starts. */
  burst: number;
  burstGap: number;
  bulletSpeed: number;
  bulletStyle: BulletStyleId;
  /** Delay after entering the screen before the first burst. */
  firstShotDelay: number;
}

/** Spiderlon's minions: walk along the ground, stop, and lob a shot that lands on the hero. */
export interface GroundEnemyDef extends EnemyBase {
  behavior: 'ground';
  /** Feet line, px from the top of the screen. */
  groundY: number;
  /** The ground itself scrolls left at this speed (Happy Hills near layer). */
  groundScroll: number;
  /** Extra walking speed on top of the scroll. */
  walkSpeed: number;
  /** Seconds of walking between stops. */
  walkTime: number;
  /** Seconds stopped; the lob happens halfway through. */
  pauseTime: number;
  /** Seconds the lobbed shot takes to reach where the hero was. */
  lobTime: number;
  lobGravity: number;
}

export type EnemyDef = SineEnemyDef | ChargerEnemyDef | TurretEnemyDef | GroundEnemyDef;

export const ENEMIES = {
  flyer: {
    behavior: 'sine',
    texture: 'mimic-2',
    anim: 'mimic-2',
    displayHeight: 84,
    hp: 6,
    radius: 25,
    score: 100,
    speed: 170,
    amplitude: 60,
    frequency: 2.4,
  },
  charger: {
    behavior: 'charger',
    texture: 'mimic-1',
    anim: 'mimic-1',
    displayHeight: 96,
    hp: 12,
    radius: 27,
    score: 150,
    enterSpeed: 260,
    stopDistance: 190,
    windup: 0.7,
    dashSpeed: 520,
    launchShot: { style: 'shard', count: 3, spreadDeg: 40, speed: 250 },
  },
  turret: {
    behavior: 'turret',
    texture: 'mimic-3',
    anim: 'mimic-3',
    displayHeight: 100,
    hp: 30,
    radius: 38,
    score: 300,
    driftSpeed: 55,
    bobAmplitude: 14,
    fireInterval: 1.6,
    burst: 3,
    burstGap: 0.12,
    bulletSpeed: 190,
    bulletStyle: 'bolt',
    firstShotDelay: 0.6,
  },
  elon: {
    behavior: 'ground',
    texture: 'elon-walk',
    anim: 'elon-walk',
    displayHeight: 96,
    hp: 8,
    radius: 22,
    score: 200,
    groundY: 508,
    groundScroll: 110,
    walkSpeed: 35,
    walkTime: 1.6,
    pauseTime: 0.8,
    lobTime: 1.2,
    lobGravity: 420,
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
