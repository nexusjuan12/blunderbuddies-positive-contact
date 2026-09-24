/**
 * Mr. Uh-Uh-No's mimics: big evil-faced heads copied from the heroes.
 * Units: px, px/s, seconds.
 */
interface EnemyBase {
  texture: string;
  /** On-screen height of the head in px. */
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
  /** Delay after entering the screen before the first burst. */
  firstShotDelay: number;
}

export type EnemyDef = SineEnemyDef | ChargerEnemyDef | TurretEnemyDef;

export const ENEMIES = {
  flyer: {
    behavior: 'sine',
    texture: 'mimic-2',
    displayHeight: 84,
    hp: 6,
    radius: 22,
    score: 100,
    speed: 170,
    amplitude: 60,
    frequency: 2.4,
  },
  charger: {
    behavior: 'charger',
    texture: 'mimic-1',
    displayHeight: 96,
    hp: 12,
    radius: 24,
    score: 150,
    enterSpeed: 260,
    stopDistance: 190,
    windup: 0.7,
    dashSpeed: 520,
  },
  turret: {
    behavior: 'turret',
    texture: 'mimic-3',
    displayHeight: 100,
    hp: 30,
    radius: 36,
    score: 300,
    driftSpeed: 55,
    bobAmplitude: 14,
    fireInterval: 1.6,
    burst: 3,
    burstGap: 0.12,
    bulletSpeed: 210,
    firstShotDelay: 0.6,
  },
} as const satisfies Record<string, EnemyDef>;

export type EnemyId = keyof typeof ENEMIES;
