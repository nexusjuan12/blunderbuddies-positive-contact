import type { BulletStyleId } from './bullets';

/** Mecha-turkey (Mr. Uh-Uh-No, Happy Hills). Units: px, px/s, seconds. */

export interface Hurtbox {
  /** Offset from the rig centre in processed-art pixels (before displayScale). */
  x: number;
  y: number;
  radius: number;
}

export interface DrumstickPhase {
  pattern: 'drumsticks';
  interval: number;
  perVolley: number;
  launchSpeedX: readonly [number, number];
  launchSpeedY: readonly [number, number];
  gravity: number;
  fuse: number;
  burstCount: number;
  burstSpeed: number;
  /** What each drumstick bursts into. */
  burstStyle: BulletStyleId;
}

export interface GobblePhase {
  pattern: 'gobble';
  interval: number;
  ringCount: number;
  /** Bullets left out of the ring to make the gap. */
  gapSize: number;
  ringSpeed: number;
  /** Successive rings cycle through these styles. */
  ringStyles: readonly BulletStyleId[];
  /** Random offset of the gap from the hero's direction, radians. */
  gapJitter: number;
  /** Launch one drumstick every N rings (0 = never). */
  drumstickEvery: number;
}

export interface TantrumPhase {
  pattern: 'tantrum';
  /** Seconds between stomps to a new random position. */
  stompInterval: number;
  moveLerp: number;
  sprayInterval: number;
  sprayArcDeg: number;
  spraySpeed: readonly [number, number];
  /** Each sprayed bullet picks one of these at random. */
  sprayStyles: readonly BulletStyleId[];
  /** Hard cap on live enemy bullets during the tantrum, to keep it readable. */
  maxBullets: number;
}

export type BossPhase = (DrumstickPhase | GobblePhase | TantrumPhase) & {
  /** Phase ends when HP fraction drops to this. */
  endsAtHp: number;
};

export interface BossDef {
  hp: number;
  displayScale: number;
  score: number;
  scorePerHit: number;
  homeX: number;
  homeY: number;
  enterTime: number;
  phaseTransitionTime: number;
  hurtboxes: readonly Hurtbox[];
  /** Where bullets come from, rig-local processed px. */
  beak: { x: number; y: number };
  back: { x: number; y: number };
  phases: readonly BossPhase[];
  voices: {
    /** Played as the boss arrives and at each phase change. */
    taunt: readonly string[];
    defeat: readonly string[];
  };
}

export const MECHA_TURKEY: BossDef = {
  hp: 650,
  displayScale: 0.5,
  score: 10000,
  scorePerHit: 10,
  homeX: 745,
  homeY: 275,
  enterTime: 3,
  phaseTransitionTime: 1.4,
  hurtboxes: [
    { x: 40, y: 10, radius: 150 },
    { x: -250, y: -150, radius: 70 },
  ],
  beak: { x: -330, y: -110 },
  back: { x: 60, y: -170 },
  phases: [
    {
      pattern: 'drumsticks',
      endsAtHp: 0.66,
      interval: 1.5,
      perVolley: 2,
      launchSpeedX: [-320, -140],
      launchSpeedY: [-360, -200],
      gravity: 420,
      fuse: 1.05,
      burstCount: 10,
      burstSpeed: 135,
      burstStyle: 'feather',
    },
    {
      pattern: 'gobble',
      endsAtHp: 0.33,
      interval: 1.9,
      ringCount: 30,
      gapSize: 5,
      ringSpeed: 120,
      ringStyles: ['ringOrb', 'bigOrb'],
      gapJitter: 0.5,
      drumstickEvery: 2,
    },
    {
      pattern: 'tantrum',
      endsAtHp: 0,
      stompInterval: 0.75,
      moveLerp: 5,
      sprayInterval: 0.065,
      sprayArcDeg: 150,
      spraySpeed: [110, 200],
      sprayStyles: ['orb', 'orb', 'feather', 'bigOrb', 'splitter'],
      maxBullets: 160,
    },
  ],
  voices: {
    taunt: ['voice-uhuhno-taunt'],
    defeat: ['voice-uhuhno-defeat'],
  },
};

/** Robo Easter bunny: a mid-level tank that paces the ground and lobs spinning eggs, Hammer Bros style. */
export interface MidBossDef {
  hp: number;
  /** On-screen height of a frame, px. */
  displayHeight: number;
  score: number;
  /** Feet line, px from the top of the screen. */
  groundY: number;
  enterSpeed: number;
  /** It paces between these x positions. */
  rangeX: readonly [number, number];
  advanceSpeed: number;
  recedeSpeed: number;
  /** Seconds between throws. */
  throwInterval: readonly [number, number];
  eggsPerThrow: readonly [number, number];
  egg: {
    /** Launch speeds: left and up, in random ranges, so the arcs overlap chaotically. */
    speedX: readonly [number, number];
    speedY: readonly [number, number];
    gravity: number;
    /** Spin, radians/s (random sign). */
    spin: readonly [number, number];
  };
  /** Vibes meter gained per point of damage dealt to it. */
  meterPerDamage: number;
}

export const ROBO_BUNNY: MidBossDef = {
  hp: 260,
  displayHeight: 215,
  score: 3000,
  groundY: 512,
  enterSpeed: 150,
  rangeX: [560, 850],
  advanceSpeed: 70,
  recedeSpeed: 55,
  throwInterval: [0.9, 1.7],
  eggsPerThrow: [1, 3],
  egg: {
    speedX: [-430, -110],
    speedY: [-560, -330],
    gravity: 640,
    spin: [5, 12],
  },
  meterPerDamage: 0.2,
};
