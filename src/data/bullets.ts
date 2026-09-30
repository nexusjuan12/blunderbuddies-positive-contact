/** Enemy bullet styles: look + movement. Units: px, px/s, seconds, radians/s. */

interface StyleBase {
  texture: string;
  /** Collision radius, px. */
  radius: number;
  /** Rotate the sprite to face its direction of travel (darts, shards). */
  pointAlongPath?: boolean;
  /** Visual spin for round things. */
  spin?: number;
}

/** Flies straight at the speed it was fired with. */
interface StraightStyle extends StyleBase {
  move: 'straight';
}

/** Snakes side to side across its heading. */
interface WavyStyle extends StyleBase {
  move: 'wavy';
  /** Peak sideways speed, px/s. */
  waveAmplitude: number;
  waveFrequency: number;
}

/** Starts slow and speeds up. Factors multiply the speed it was fired with. */
interface AccelerateStyle extends StyleBase {
  move: 'accelerate';
  startFactor: number;
  maxFactor: number;
  /** px/s gained per second. */
  acceleration: number;
}

/** Flies straight, then bursts into a small fan of another style. */
interface SplitStyle extends StyleBase {
  move: 'split';
  splitAfter: number;
  splitCount: number;
  splitSpreadDeg: number;
  splitInto: string;
}

export type BulletStyle = StraightStyle | WavyStyle | AccelerateStyle | SplitStyle;

export const BULLETS = {
  /** Default pink orb. */
  orb: { texture: 'bullet', radius: 6, move: 'straight' },
  /** Orange orb used for the turkey's gobble rings. */
  ringOrb: { texture: 'bullet-ring', radius: 6, move: 'straight' },
  /** Big, slow, easy to see, takes up space. */
  bigOrb: { texture: 'bullet-big', radius: 12, move: 'straight' },
  /** Hood mimic's wavy purple bolt. */
  bolt: { texture: 'bullet-bolt', radius: 6, move: 'wavy', waveAmplitude: 130, waveFrequency: 7, pointAlongPath: true },
  /** Horn mimic's fast cyan shard. */
  shard: { texture: 'bullet-shard', radius: 5, move: 'straight', pointAlongPath: true },
  /** Turkey feather dart: drifts, then speeds up. */
  feather: { texture: 'bullet-feather', radius: 5, move: 'accelerate', startFactor: 0.45, maxFactor: 1.7, acceleration: 150, pointAlongPath: true },
  /** Splits into three shards. */
  splitter: { texture: 'bullet-split', radius: 8, move: 'split', splitAfter: 0.85, splitCount: 3, splitSpreadDeg: 50, splitInto: 'shard', spin: 5 },
} as const satisfies Record<string, BulletStyle>;

export type BulletStyleId = keyof typeof BULLETS;
