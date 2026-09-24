import type { EnemyId } from './enemies';

/**
 * One group of enemies in a level's timeline.
 * `count` enemies spawn `spacing` seconds apart, starting at `at` seconds into the level.
 * `y` is the first enemy's height; each next one adds `yStep`. Use `y: 'random'` for scattered spawns.
 */
export interface WaveDef {
  at: number;
  enemy: EnemyId;
  count: number;
  spacing: number;
  y: number | 'random';
  yStep?: number;
  /** The last enemy of this group glows and drops a team (random Buddy) pickup. */
  carrier?: boolean;
}

export interface LevelDef {
  waves: readonly WaveDef[];
  /** Seconds of quiet after the last spawn before the boss warning. */
  bossDelay: number;
  /** Length of the boss warning banner. */
  warningTime: number;
}

export const HAPPY_HILLS: LevelDef = {
  bossDelay: 3,
  warningTime: 3,
  waves: [
    // Opening: gentle flyer lines while the dome scrolls past.
    { at: 4, enemy: 'flyer', count: 5, spacing: 0.35, y: 150 },
    { at: 7, enemy: 'flyer', count: 5, spacing: 0.35, y: 390 },
    { at: 10, enemy: 'flyer', count: 6, spacing: 0.3, y: 270, carrier: true },
    // First turrets.
    // Elons (Spiderlon's minions) walk in along the ground; `y` is ignored for them.
    { at: 8, enemy: 'elon', count: 2, spacing: 1.4, y: 0 },
    { at: 13, enemy: 'turret', count: 1, spacing: 0, y: 140 },
    { at: 14, enemy: 'turret', count: 1, spacing: 0, y: 400 },
    { at: 17, enemy: 'flyer', count: 5, spacing: 0.3, y: 120 },
    { at: 17.5, enemy: 'flyer', count: 5, spacing: 0.3, y: 420 },
    // Chargers arrive.
    { at: 21, enemy: 'charger', count: 3, spacing: 0.9, y: 'random' },
    { at: 23, enemy: 'elon', count: 3, spacing: 1.1, y: 0 },
    { at: 25, enemy: 'flyer', count: 8, spacing: 0.25, y: 90, yStep: 45 },
    { at: 28, enemy: 'turret', count: 2, spacing: 1.2, y: 270, carrier: true },
    { at: 30, enemy: 'charger', count: 2, spacing: 0.5, y: 150, yStep: 240 },
    // Mid-level mixed pressure.
    { at: 34, enemy: 'flyer', count: 6, spacing: 0.3, y: 200 },
    { at: 34, enemy: 'flyer', count: 6, spacing: 0.3, y: 340 },
    { at: 37, enemy: 'turret', count: 3, spacing: 0.4, y: 110, yStep: 160 },
    { at: 41, enemy: 'charger', count: 4, spacing: 0.7, y: 'random', carrier: true },
    { at: 43, enemy: 'elon', count: 3, spacing: 0.9, y: 0 },
    { at: 45, enemy: 'flyer', count: 8, spacing: 0.25, y: 100, yStep: 30 },
    { at: 48, enemy: 'turret', count: 2, spacing: 0, y: 130, yStep: 280 },
    { at: 50, enemy: 'flyer', count: 5, spacing: 0.3, y: 270 },
    { at: 53, enemy: 'charger', count: 3, spacing: 0.35, y: 150, yStep: 120, carrier: true },
    // Build-up to the boss.
    { at: 57, enemy: 'flyer', count: 10, spacing: 0.2, y: 'random' },
    { at: 59, enemy: 'elon', count: 4, spacing: 0.8, y: 0 },
    { at: 60, enemy: 'turret', count: 3, spacing: 0.8, y: 'random' },
    { at: 63, enemy: 'charger', count: 5, spacing: 0.5, y: 'random' },
    { at: 67, enemy: 'flyer', count: 6, spacing: 0.25, y: 130, carrier: true },
    { at: 67, enemy: 'flyer', count: 6, spacing: 0.25, y: 410 },
    { at: 70, enemy: 'turret', count: 2, spacing: 0, y: 200, yStep: 140 },
    { at: 73, enemy: 'charger', count: 6, spacing: 0.4, y: 'random' },
    { at: 77, enemy: 'flyer', count: 12, spacing: 0.18, y: 100, yStep: 30, carrier: true },
    { at: 79, enemy: 'elon', count: 5, spacing: 0.7, y: 0 },
    { at: 81, enemy: 'turret', count: 4, spacing: 0.6, y: 'random' },
    { at: 84, enemy: 'flyer', count: 8, spacing: 0.25, y: 'random' },
  ],
};
