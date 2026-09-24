/** Team power-up: random Buddies join as trailing companions. Units: px, seconds, frames. */
export const TEAM = {
  /** Companions besides the hero (the full team is five Buddies). */
  maxCompanions: 4,
  /** Companion size relative to the hero. */
  scale: 0.6,
  /** Each companion follows this many frames further back along the hero's path. */
  trailFrames: 10,
  /** Seconds of holding still before the team forms a V. */
  formUpDelay: 0.5,
  /** How fast they ease between trail and V (1/s). */
  formUpSpeed: 4,
  /** V-wedge offsets from the hero, in join order. */
  wedge: [
    [-58, -42],
    [-58, 42],
    [-112, -84],
    [-112, 84],
  ] as readonly (readonly [number, number])[],
  /** Invincibility after a companion takes a hit for the hero. */
  knockOffInvuln: 1.2,
  /** Fire-rate boost per pickup once the team is full, and its cap. */
  rateBoost: 0.15,
  maxRate: 1.6,
  /** "Team formed" payoff. */
  formedInvuln: 3,
  pickup: {
    drift: 90,
    bobAmplitude: 12,
    bobSpeed: 3,
    /** Collection radius around the hero's hitbox. */
    radius: 30,
    score: 500,
  },
} as const;
