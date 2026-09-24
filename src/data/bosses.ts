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
}

export interface GobblePhase {
  pattern: 'gobble';
  interval: number;
  ringCount: number;
  /** Bullets left out of the ring to make the gap. */
  gapSize: number;
  ringSpeed: number;
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
    },
    {
      pattern: 'gobble',
      endsAtHp: 0.33,
      interval: 1.9,
      ringCount: 30,
      gapSize: 5,
      ringSpeed: 120,
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
      maxBullets: 160,
    },
  ],
  voices: {
    taunt: ['voice-uhuhno-taunt'],
    defeat: ['voice-uhuhno-defeat'],
  },
};
