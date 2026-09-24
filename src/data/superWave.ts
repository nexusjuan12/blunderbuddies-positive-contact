/** Positive Vibes Wave: every Buddy's super. Units: px, seconds. */
export const SUPER_WAVE = {
  startStock: 1,
  maxStock: 3,
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
