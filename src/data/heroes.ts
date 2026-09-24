/** Tuning for each playable Buddy. Units: px, px/s, seconds, radians/s unless noted. */
export interface HeroShotStats {
  texture: string;
  /** Seconds between volleys. */
  interval: number;
  /** Stars per volley, fanned across `spreadDeg`. */
  count: number;
  spreadDeg: number;
  speed: number;
  /** Max homing turn rate in radians/s. 0 = straight shot. */
  turnRate: number;
  /** Seconds between target re-acquisitions for homing shots. */
  retargetInterval: number;
  damage: number;
  radius: number;
  lifetime: number;
  /** Visual spin of the projectile, radians/s. */
  spin: number;
}

export interface HeroStats {
  name: string;
  /** Flight loop sprite sheet; its JSON (same name) holds frame size, fps and the hitbox centre. */
  texture: string;
  /** Looping flight animation key (created in BootScene). */
  flyAnim: string;
  /** Scale applied to the sheet frames (art is 2x resolution). */
  displayScale: number;
  speed: number;
  focusSpeed: number;
  /** Relative-drag multiplier: 1 = hero moves exactly as far as the finger. */
  touchSensitivity: number;
  hitboxRadius: number;
  motion: {
    /** Gentle procedural bob on top of the animation, px (visual only; hitbox doesn't bob). */
    bobAmplitude: number;
    /** Bob speed, radians/s. */
    bobSpeed: number;
    /** Max nose-up/down tilt when moving vertically, radians. */
    maxTilt: number;
    /** How quickly the tilt follows movement (higher = snappier). */
    tiltResponse: number;
    /** Fake horizontal spin on damage / power-ups: duration (s) and number of turns. */
    spinTime: number;
    spinTurns: number;
  };
  lives: number;
  /** Hits a life can take: the first breaks the shield, the last costs the life. */
  hitsPerLife: number;
  invulnAfterHit: number;
  invulnAfterRespawn: number;
  shot: HeroShotStats;
  voices: {
    hurt: readonly string[];
    respawn: readonly string[];
  };
}

export const NUH_UH: HeroStats = {
  name: 'Nuh-Uh',
  texture: 'hero-nuhuh-fly',
  flyAnim: 'nuhuh-fly',
  displayScale: 0.32,
  speed: 300,
  focusSpeed: 140,
  touchSensitivity: 1.15,
  hitboxRadius: 4,
  motion: { bobAmplitude: 2.5, bobSpeed: 4, maxTilt: 0.35, tiltResponse: 8, spinTime: 0.55, spinTurns: 2 },
  lives: 3,
  hitsPerLife: 2,
  invulnAfterHit: 1.5,
  invulnAfterRespawn: 2.5,
  shot: {
    texture: 'star',
    interval: 0.12,
    count: 2,
    spreadDeg: 14,
    speed: 620,
    turnRate: 7,
    retargetInterval: 0.2,
    damage: 1,
    radius: 9,
    lifetime: 1.6,
    spin: 12,
  },
  voices: {
    hurt: ['voice-nuhuh-hurt'],
    respawn: ['voice-nuhuh-defiant'],
  },
};
