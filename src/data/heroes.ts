/** Tuning for each playable Buddy. Units: px, px/s, seconds, radians/s unless noted. */

export type HeroId = 'nuhuh' | 'uhhuh' | 'oopsie' | 'whoopsie' | 'teehee';

/** Nuh-Uh: stars that home in on the nearest target. */
export interface HomingWeapon {
  kind: 'homing';
  texture: string;
  /** Seconds between volleys. */
  interval: number;
  count: number;
  spreadDeg: number;
  speed: number;
  /** Max homing turn rate, radians/s. */
  turnRate: number;
  damage: number;
  radius: number;
  lifetime: number;
  spin: number;
}

/** Uh-Huh: a wide fan of straight shots. */
export interface SpreadWeapon {
  kind: 'spread';
  texture: string;
  interval: number;
  count: number;
  spreadDeg: number;
  speed: number;
  damage: number;
  radius: number;
  lifetime: number;
  spin: number;
}

/** Oopsie: rubber balls fired alternately up and down that bounce off the top and bottom of the screen. */
export interface BounceWeapon {
  kind: 'bounce';
  /** One texture per ball colour, cycled. */
  textures: readonly string[];
  interval: number;
  /** Launch angle above/below horizontal, alternating each shot. */
  angleDeg: number;
  speed: number;
  damage: number;
  radius: number;
  bounces: number;
  lifetime: number;
}

/** Whoopsie-Doodle: petals orbit the hero, absorb enemy bullets, then bloom outward. Plus a light forward seed shot. */
export interface OrbitWeapon {
  kind: 'orbit';
  texture: string;
  maxPetals: number;
  /** Seconds to grow each new petal. */
  growInterval: number;
  orbitRadius: number;
  orbitSpeed: number;
  /** Seconds between blooms (petals fly outward). */
  bloomInterval: number;
  bloomSpeed: number;
  damage: number;
  radius: number;
  seed: { texture: string; interval: number; speed: number; damage: number; radius: number };
}

/** Tee-Hee: a continuous, piercing rainbow beam to the right edge. */
export interface BeamWeapon {
  kind: 'beam';
  /** Beam thickness in px (hit band is this plus the target's radius). */
  width: number;
  /** Damage per second to every target in the beam. */
  dps: number;
}

export type WeaponConfig = HomingWeapon | SpreadWeapon | BounceWeapon | OrbitWeapon | BeamWeapon;

export interface HeroStats {
  id: HeroId;
  /** Display name (UI only). */
  name: string;
  /** Texture key of the attack icon shown on the select screen. */
  icon: string;
  /** Flight loop sprite sheet; its JSON (same key) holds frame size, fps and the hitbox centre. */
  texture: string;
  /** Looping flight animation key (created in BootScene). */
  flyAnim: string;
  /** Select-screen standing idle sheet (loaded on demand) and its animation key. */
  selectTexture: string;
  selectAnim: string;
  superTexture: string;
  /** Scale applied to the sheet frames. */
  displayScale: number;
  speed: number;
  focusSpeed: number;
  /** Relative-drag multiplier: 1 = hero moves exactly as far as the finger. */
  touchSensitivity: number;
  hitboxRadius: number;
  motion: {
    /** Gentle procedural bob on top of the animation, px (visual only; hitbox doesn't bob). */
    bobAmplitude: number;
    bobSpeed: number;
    /** Max nose-up/down tilt when moving vertically, radians. */
    maxTilt: number;
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
  weapon: WeaponConfig;
  voices: {
    select: readonly string[];
    damage: readonly string[];
    recover: readonly string[];
  };
}

/** How much weaker a companion's copy of a Buddy's attack is. */
export const COMPANION_POWER = { damage: 0.4, interval: 1.6, size: 0.7 } as const;

const BASE = {
  displayScale: 0.64,
  speed: 300,
  focusSpeed: 140,
  touchSensitivity: 1.15,
  hitboxRadius: 4,
  motion: { bobAmplitude: 2.5, bobSpeed: 4, maxTilt: 0.35, tiltResponse: 8, spinTime: 0.55, spinTurns: 2 },
  lives: 3,
  hitsPerLife: 2,
  invulnAfterHit: 1.5,
  invulnAfterRespawn: 2.5,
};

function assets(id: HeroId) {
  return {
    id,
    texture: `hero-${id}-fly`,
    flyAnim: `${id}-fly`,
    selectTexture: `hero-${id}-select`,
    selectAnim: `${id}-select`,
    superTexture: `hero-${id}-super`,
    voices: { select: [`voice-${id}-select`], damage: [`voice-${id}-damage`], recover: [`voice-${id}-recover`] },
  };
}

export const HEROES: Record<HeroId, HeroStats> = {
  nuhuh: {
    ...BASE,
    ...assets('nuhuh'),
    name: 'NUH-UH',
    icon: 'star',
    weapon: {
      kind: 'homing',
      texture: 'star',
      interval: 0.12,
      count: 2,
      spreadDeg: 14,
      speed: 620,
      turnRate: 7,
      damage: 1,
      radius: 9,
      lifetime: 1.6,
      spin: 12,
    },
  },
  uhhuh: {
    ...BASE,
    ...assets('uhhuh'),
    name: 'UH-HUH',
    icon: 'heart',
    weapon: {
      kind: 'spread',
      texture: 'heart',
      interval: 0.15,
      count: 5,
      spreadDeg: 44,
      speed: 560,
      damage: 0.6,
      radius: 9,
      lifetime: 1.6,
      spin: 0,
    },
  },
  oopsie: {
    ...BASE,
    ...assets('oopsie'),
    name: 'OOPSIE',
    icon: 'ball-0',
    weapon: {
      kind: 'bounce',
      textures: ['ball-0', 'ball-1', 'ball-2', 'ball-3', 'ball-4'],
      interval: 0.13,
      angleDeg: 10,
      speed: 520,
      damage: 2,
      radius: 10,
      bounces: 3,
      lifetime: 3,
    },
  },
  whoopsie: {
    ...BASE,
    ...assets('whoopsie'),
    name: 'WHOOPSIE-DOODLE',
    icon: 'flower',
    weapon: {
      kind: 'orbit',
      texture: 'flower',
      maxPetals: 8,
      growInterval: 0.22,
      orbitRadius: 52,
      orbitSpeed: 4,
      bloomInterval: 2.4,
      bloomSpeed: 420,
      damage: 2.5,
      radius: 11,
      seed: { texture: 'flower', interval: 0.14, speed: 600, damage: 1.3, radius: 7 },
    },
  },
  teehee: {
    ...BASE,
    ...assets('teehee'),
    name: 'TEE-HEE',
    icon: 'rainbow',
    weapon: { kind: 'beam', width: 22, dps: 24 },
  },
};

export const HERO_IDS: readonly HeroId[] = ['nuhuh', 'uhhuh', 'oopsie', 'whoopsie', 'teehee'];

export function isHeroId(v: unknown): v is HeroId {
  return typeof v === 'string' && (HERO_IDS as readonly string[]).includes(v);
}
