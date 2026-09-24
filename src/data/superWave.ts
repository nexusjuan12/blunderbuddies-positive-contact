/** Positive Vibes Wave: every Buddy's super. Units: px, seconds. */
export const SUPER_WAVE = {
  startStock: 1,
  maxStock: 3,
  /** Vibes meter: when it fills, +1 Wave (up to maxStock). */
  meterMax: 100,
  /** Meter gained per point of an enemy's score value (flyer 100 -> 6, turret 300 -> 18). */
  meterPerScore: 0.06,
  /** Meter gained per point of damage dealt to the boss. */
  meterPerBossDamage: 0.25,
  /** Slow passive fill per second, so a struggling player still earns one eventually. */
  meterTrickle: 1.2,
  /** Damage dealt to every enemy on screen. */
  enemyDamage: 60,
  /** Damage dealt to the boss (if it can be hurt at that moment). */
  bossDamage: 70,
  /** How long the hero holds the super pose. */
  poseTime: 0.9,
  /** Invincibility after firing it. */
  invuln: 2.2,
  /** Score for each enemy bullet turned into a heart. */
  heartScore: 10,
  /** On-screen button (touch), bottom-right. */
  button: { x: 900, y: 478, radius: 42 },
} as const;
