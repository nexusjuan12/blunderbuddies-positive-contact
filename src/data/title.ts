/**
 * Title screen timing and text, ported from Jake's title-screen animation.
 * Times are in seconds. `reveal` is when the track's opening line ends and the roll call starts.
 */
export const TITLE = {
  music: 'music-title',
  reveal: 3.4,
  /** Gap between each corner panel lighting up. */
  rollGap: 0.38,
  /** Extra pause before the centre panel. */
  centerPause: 0.3,
  logoDelay: 0.6,
  wordGap: 0.14,
  subDelay: 0.9,
  tapDelay: 1.5,
  sheenEvery: 6,
  burstCount: 110,
  tapBurstCount: 60,
  /** Seconds the chosen Buddy's standing idle is shown full-screen before the level starts. */
  confirmHold: 1.5,
  words: ['BLUNDER', 'BUDDIES'],
  subtitle: 'POSITIVE CONTACT',
  tapText: 'CHOOSE YOUR BUDDY',
  tapAgainText: 'TAP AGAIN TO PLAY',
  gateText: 'TAP TO BEGIN',
  /** Which Buddy each collage panel shows. */
  panelHeroes: { tl: 'oopsie', tr: 'whoopsie', bl: 'uhhuh', br: 'teehee', c: 'nuhuh' },
} as const;
